import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getResend, getFromAddress } from '@/lib/email/resend';
import { renderDigestHtml } from '@/lib/email/digest-template';

/**
 * Weekly events digest. Schedule: Mondays 08:00 UTC (see `vercel.json`).
 *
 * Pipeline:
 *   1. Pull every profile with `email_digest_enabled = true` and a
 *      non-empty email. We send in batches of 50 to keep the cron
 *      below the 5-minute Vercel limit even with thousands of users.
 *   2. For each profile, build a personalised event shortlist:
 *        a. Filter by the user's city (`profiles.city`) when known —
 *           location is the strongest engagement signal in our data.
 *        b. Match `events.languages` against `profiles.languages`
 *           (any-overlap), so a user reading EN+CS sees both.
 *        c. Match `events.category_id` against `profiles.interests`
 *           (the array of `interests.id`), so digests stay topical.
 *        d. Order by `starts_at` and cap at 6 events. We keep the
 *           list short on purpose — past A/B work suggests that 5–7
 *           items maximises CTR for weekly digests.
 *   3. Mint (or fetch) a one-click unsubscribe token via
 *      `ensure_unsubscribe_token` so the footer link is RFC 8058-
 *      compliant ("List-Unsubscribe: <https://...>, <mailto:...>"
 *      header).
 *   4. POST to Resend with retry. On 4xx we mark the user as
 *      "skip-this-week" (we don't auto-disable the preference; a
 *      single bounce shouldn't silence them).
 *   5. Stamp `email_digest_last_sent_at = now()` so re-runs of the
 *      same Monday don't duplicate sends if Vercel retries the
 *      cron.
 *
 * Auth: shared `CRON_SECRET` bearer matching Vercel cron config.
 *
 * Idempotency: the `email_digest_last_sent_at < now() - 6d` filter
 * makes this cron safe to re-trigger manually.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resend = getResend();
  if (!resend) {
    // Soft-success so Vercel doesn't keep retrying when the env is
    // intentionally bare (e.g. preview deploys).
    return NextResponse.json({
      success: true,
      sent: 0,
      reason: 'RESEND_API_KEY not configured',
    });
  }

  const supabase = createAdminClient();
  const appBaseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://localisio.com').replace(/\/$/, '');
  const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date();

  // 1. Fetch eligible recipients in pages.
  const PAGE = 50;
  let offset = 0;
  let totalSent = 0;
  let totalSkipped = 0;
  const errors: string[] = [];

  while (true) {
    const { data: recipients, error } = await supabase
      .from('profiles')
      .select('id, email, display_name, city, country, languages, interests')
      .eq('email_digest_enabled', true)
      .is('deleted_at', null)
      .neq('email', '')
      .or(`email_digest_last_sent_at.is.null,email_digest_last_sent_at.lt.${sixDaysAgo}`)
      .order('id')
      .range(offset, offset + PAGE - 1);

    if (error || !recipients || recipients.length === 0) break;

    for (const recipient of recipients) {
      try {
        const sent = await sendDigestForRecipient({
          supabase,
          resend,
          recipient,
          appBaseUrl,
        });
        if (sent) {
          totalSent += 1;
          await supabase
            .from('profiles')
            .update({ email_digest_last_sent_at: now.toISOString() })
            .eq('id', recipient.id);
        } else {
          totalSkipped += 1;
        }
      } catch (err) {
        errors.push(`${recipient.id}: ${err instanceof Error ? err.message : 'unknown'}`);
      }
    }

    if (recipients.length < PAGE) break;
    offset += PAGE;
  }

  return NextResponse.json({
    success: true,
    sent: totalSent,
    skipped: totalSkipped,
    errors: errors.slice(0, 10),
  });
}

interface Recipient {
  id: string;
  email: string;
  display_name: string;
  city: string | null;
  country: string | null;
  languages: string[];
  interests: string[];
}

async function sendDigestForRecipient(opts: {
  supabase: ReturnType<typeof createAdminClient>;
  resend: ReturnType<typeof getResend>;
  recipient: Recipient;
  appBaseUrl: string;
}): Promise<boolean> {
  const { supabase, resend, recipient, appBaseUrl } = opts;
  if (!resend) return false;

  // 2. Personalised shortlist.
  let query = supabase
    .from('events_with_counts')
    .select('id, title, starts_at, city, going_count, is_free, languages, category_id, organizer_is_blocked, is_blocked, status')
    .eq('status', 'published')
    .eq('is_blocked', false)
    .eq('organizer_is_blocked', false)
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(6);

  if (recipient.city) query = query.eq('city', recipient.city);
  if (recipient.languages.length > 0) {
    query = query.overlaps('languages', recipient.languages);
  }
  if (recipient.interests.length > 0) {
    query = query.in('category_id', recipient.interests);
  }

  const { data: events } = await query;
  if (!events || events.length === 0) return false;

  // 3. Unsubscribe token.
  const { data: token } = await supabase.rpc('ensure_unsubscribe_token', {
    p_user_id: recipient.id,
    p_category: 'digest',
  });

  // We default to English when a profile has no languages set.
  const locale = recipient.languages?.[0] || 'en';
  const unsubscribeUrl = `${appBaseUrl}/${locale}/unsubscribe?token=${encodeURIComponent(token || '')}`;

  // Localised strings — kept tiny on purpose. The full copy lives
  // in the `messages/*.json` digest namespace; the template only
  // needs strings the cron can plug in directly.
  const strings = pickDigestStrings(locale, events.length, recipient.display_name, recipient.city);

  const html = renderDigestHtml({
    events,
    strings,
    appBaseUrl,
    unsubscribeUrl,
    locale,
  });

  const subject = strings.subjectLine;
  const fromAddress = getFromAddress();

  // 4. Send.
  const { error: sendErr } = await resend.emails.send({
    from: fromAddress,
    to: recipient.email,
    subject,
    html,
    headers: {
      // RFC 8058 one-click. Clients that support it strip the
      // approval interstitial.
      'List-Unsubscribe': `<${unsubscribeUrl}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });

  if (sendErr) {
    throw new Error(sendErr.message);
  }
  return true;
}

/**
 * Tiny i18n table for the cron — keeping it inline avoids spinning
 * up next-intl on the server. Falls back to English silently.
 */
function pickDigestStrings(
  locale: string,
  count: number,
  name: string,
  city: string | null,
): {
  subjectLine: string;
  preheader: string;
  intro: string;
  ctaUnsubscribe: string;
  free: string;
  goingCount: string;
} {
  const cityLabel = city || 'your city';
  switch (locale) {
    case 'ru':
      return {
        subjectLine: `${cityLabel}: ${count} новых событий на неделе`,
        preheader: 'Подобраны под ваши интересы и людей, на которых вы подписаны.',
        intro: `Привет, ${name}! Вот что нас ждёт на этой неделе.`,
        ctaUnsubscribe: 'Управлять рассылкой',
        free: 'Бесплатно',
        goingCount: '{count} идут',
      };
    case 'uk':
      return {
        subjectLine: `${cityLabel}: ${count} нових подій цього тижня`,
        preheader: 'Підібрано за вашими інтересами та людьми, на яких ви підписані.',
        intro: `Привіт, ${name}! Ось що нас чекає цього тижня.`,
        ctaUnsubscribe: 'Керувати розсилкою',
        free: 'Безкоштовно',
        goingCount: '{count} йдуть',
      };
    case 'cs':
      return {
        subjectLine: `${cityLabel}: ${count} nových akcí tento týden`,
        preheader: 'Vybráno podle vašich zájmů a lidí, které sledujete.',
        intro: `Ahoj ${name}, tady je, co se chystá tento týden.`,
        ctaUnsubscribe: 'Spravovat odběr',
        free: 'Zdarma',
        goingCount: 'Jde {count}',
      };
    case 'de':
      return {
        subjectLine: `${cityLabel}: ${count} neue Events diese Woche`,
        preheader: 'Ausgewählt nach deinen Interessen und Personen, denen du folgst.',
        intro: `Hi ${name}, das steht diese Woche an.`,
        ctaUnsubscribe: 'E-Mail-Einstellungen verwalten',
        free: 'Kostenlos',
        goingCount: '{count} kommen',
      };
    default:
      return {
        subjectLine: `${cityLabel}: ${count} new events this week`,
        preheader: 'Hand-picked from the people you follow and your interests.',
        intro: `Hi ${name}, here's what's coming up.`,
        ctaUnsubscribe: 'Manage email preferences',
        free: 'Free',
        goingCount: '{count} going',
      };
  }
}
