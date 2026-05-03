/**
 * Inline-styled HTML for the weekly events digest.
 *
 * We hand-render the markup because:
 *   * the digest is a single layout type, so the cost of bringing
 *     in `react-email` (peer-deps, build pipeline) doesn't pay off
 *     vs the few lines of HTML below;
 *   * inlined `style="..."` attributes are the only reliable way
 *     to render consistently across Gmail, Outlook 365, and iOS
 *     Mail without a CSS-inliner step.
 *
 * Localisation is the caller's responsibility: pass an already-
 * translated `strings` bundle so this module doesn't need to know
 * about next-intl on the server.
 */

interface DigestEvent {
  id: string;
  title: string;
  starts_at: string;
  city: string | null;
  going_count: number;
  is_free: boolean;
}

interface DigestStrings {
  subjectLine: string;
  preheader: string;
  intro: string;
  ctaUnsubscribe: string;
  free: string;
  goingCount: string;
}

/**
 * Render the HTML body. Keep the line length short and avoid CSS
 * properties that Outlook ignores (e.g. `flexbox`). The 600px max-
 * width is the de-facto standard for newsletter readability.
 */
export function renderDigestHtml(opts: {
  events: DigestEvent[];
  strings: DigestStrings;
  appBaseUrl: string;
  unsubscribeUrl: string;
  locale: string;
}): string {
  const { events, strings, appBaseUrl, unsubscribeUrl, locale } = opts;

  const eventRows = events
    .map((event) => {
      const url = `${appBaseUrl}/${locale}/events/${event.id}`;
      const date = new Date(event.starts_at).toLocaleDateString(locale, {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
      const time = new Date(event.starts_at).toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
      });
      const meta = [date, time, event.city].filter(Boolean).join(' · ');
      return `
        <tr>
          <td style="padding: 14px 0; border-bottom: 1px solid #ececec;">
            <a href="${url}" style="display:block;text-decoration:none;color:#0f172a;">
              <strong style="font-size:16px;line-height:22px;">${escapeHtml(event.title)}</strong>
              <div style="font-size:13px;color:#64748b;margin-top:4px;">${escapeHtml(meta)}</div>
              <div style="font-size:12px;color:#64748b;margin-top:6px;">
                ${event.is_free ? `<span style="color:#16a34a;font-weight:600;">${escapeHtml(strings.free)}</span> · ` : ''}
                ${escapeHtml(strings.goingCount.replace('{count}', String(event.going_count)))}
              </div>
            </a>
          </td>
        </tr>`;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="${locale}">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>${escapeHtml(strings.subjectLine)}</title>
      </head>
      <body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
        <span style="display:none;visibility:hidden;opacity:0;color:#f8fafc;font-size:1px;line-height:1px;">${escapeHtml(strings.preheader)}</span>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;">
          <tr>
            <td align="center" style="padding: 24px 12px;">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 2px rgba(15,23,42,0.04);">
                <tr>
                  <td style="padding:24px 28px;border-bottom:1px solid #ececec;">
                    <div style="font-size:13px;color:#64748b;letter-spacing:0.04em;text-transform:uppercase;">Localisio</div>
                    <h1 style="margin:6px 0 0;font-size:22px;line-height:28px;color:#0f172a;">${escapeHtml(strings.subjectLine)}</h1>
                    <p style="margin:8px 0 0;font-size:14px;color:#64748b;">${escapeHtml(strings.intro)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:0 28px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      ${eventRows}
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 28px 28px;text-align:center;">
                    <a href="${appBaseUrl}/${locale}/events" style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:9999px;">
                      Open Localisio
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="padding:18px 28px 28px;font-size:12px;color:#94a3b8;text-align:center;border-top:1px solid #ececec;">
                    <a href="${unsubscribeUrl}" style="color:#64748b;text-decoration:underline;">${escapeHtml(strings.ctaUnsubscribe)}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>`;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
