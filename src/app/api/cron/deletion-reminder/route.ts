import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getResend } from '@/lib/email/resend';
import { determineEmailLocale } from '@/lib/deletion/locale';
import { calculateGracePeriodEnd } from '@/lib/deletion/grace-period';

/**
 * Deletion Reminder Emails — Vercel Cron route.
 * Schedule: daily at 09:00 UTC (see `vercel.json`).
 *
 * Sends reminder emails to users whose grace period expires in 3 days
 * (day 27 of the 30-day grace period).
 *
 * Requirements: 2.8, 2.9
 */

const REMINDER_CONTENT: Record<string, { subject: string; body: (name: string, date: string) => string }> = {
  en: {
    subject: 'Your account will be permanently deleted in 3 days',
    body: (name, date) =>
      `Hi ${name}, this is a reminder that your City Pulse account is scheduled for permanent deletion on ${date}. After this date, all your personal data will be irreversibly removed. To keep your account, simply log in before the deadline.`,
  },
  ru: {
    subject: 'Ваш аккаунт будет удалён через 3 дня',
    body: (name, date) =>
      `Здравствуйте, ${name}. Напоминаем, что ваш аккаунт City Pulse будет окончательно удалён ${date}. После этой даты все персональные данные будут безвозвратно удалены. Чтобы сохранить аккаунт, просто войдите в систему до указанного срока.`,
  },
  uk: {
    subject: 'Ваш акаунт буде видалено через 3 дні',
    body: (name, date) =>
      `Вітаємо, ${name}. Нагадуємо, що ваш акаунт City Pulse буде остаточно видалено ${date}. Після цієї дати всі персональні дані будуть безповоротно видалені. Щоб зберегти акаунт, просто увійдіть у систему до вказаного терміну.`,
  },
  cs: {
    subject: 'Váš účet bude trvale smazán za 3 dny',
    body: (name, date) =>
      `Dobrý den, ${name}. Připomínáme, že váš účet City Pulse bude trvale smazán ${date}. Po tomto datu budou všechna osobní data nevratně odstraněna. Pro zachování účtu se jednoduše přihlaste před uvedeným termínem.`,
  },
  de: {
    subject: 'Ihr Konto wird in 3 Tagen endgültig gelöscht',
    body: (name, date) =>
      `Hallo ${name}, wir möchten Sie daran erinnern, dass Ihr City Pulse-Konto am ${date} endgültig gelöscht wird. Nach diesem Datum werden alle persönlichen Daten unwiderruflich entfernt. Um Ihr Konto zu behalten, melden Sie sich einfach vor der Frist an.`,
  },
};

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resend = getResend();
  if (!resend) {
    return NextResponse.json({ success: true, sent: 0, reason: 'RESEND_API_KEY not configured' });
  }

  const supabase = createAdminClient();

  // Find deletion requests at day 27+ that haven't received a reminder
  const { data: requests, error: queryError } = await supabase
    .from('deletion_requests')
    .select('id, user_id, requested_at')
    .eq('status', 'pending')
    .is('reminder_sent_at', null)
    .eq('reminder_failed', false)
    .lte('requested_at', new Date(Date.now() - 27 * 24 * 60 * 60 * 1000).toISOString());

  if (queryError) {
    console.error('Failed to query deletion requests for reminders:', queryError);
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  if (!requests || requests.length === 0) {
    return NextResponse.json({ success: true, sent: 0, message: 'No reminders to send' });
  }

  let sent = 0;
  let failed = 0;

  for (const req of requests) {
    // Fetch user profile for email and locale
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, display_name, languages')
      .eq('id', req.user_id)
      .single();

    if (!profile || !profile.email) {
      await supabase.from('deletion_requests').update({ reminder_failed: true }).eq('id', req.id);
      failed++;
      continue;
    }

    const locale = determineEmailLocale(profile.languages);
    const content = REMINDER_CONTENT[locale] ?? REMINDER_CONTENT.en;
    const gracePeriodEnd = calculateGracePeriodEnd(new Date(req.requested_at));
    const formattedDate = gracePeriodEnd.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <p style="font-size: 16px; line-height: 1.5; color: #333;">${content.body(profile.display_name || '', formattedDate)}</p>
      </div>
    `.trim();

    const fromAddress = process.env.EMAIL_FROM_TRANSACTIONAL || 'City Pulse <noreply@localisio.com>';

    const { error: sendError } = await resend.emails.send({
      from: fromAddress,
      to: profile.email,
      subject: content.subject,
      html,
    });

    if (sendError) {
      console.error(`Reminder email failed for user ${req.user_id}:`, sendError);
      await supabase.from('deletion_requests').update({ reminder_failed: true }).eq('id', req.id);
      failed++;
    } else {
      await supabase.from('deletion_requests').update({ reminder_sent_at: new Date().toISOString() }).eq('id', req.id);
      sent++;
    }
  }

  return NextResponse.json({ success: true, sent, failed });
}
