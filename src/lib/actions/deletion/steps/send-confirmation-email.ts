import type { SupabaseClient } from '@supabase/supabase-js';
import type { SoftDeleteContext, SoftDeleteStep } from '../soft-delete-orchestrator';
import { calculateGracePeriodEnd } from '@/lib/deletion/grace-period';
import { determineEmailLocale } from '@/lib/deletion/locale';
import { getResend } from '@/lib/email/resend';

// ---------------------------------------------------------------------------
// Locale-specific email content
// ---------------------------------------------------------------------------

interface EmailContent {
  subject: string;
  heading: string;
  body: (name: string, endDate: string) => string;
  reactivation: string;
  closing: string;
}

const EMAIL_CONTENT: Record<string, EmailContent> = {
  en: {
    subject: 'Account deletion confirmation',
    heading: 'Your account deletion has been initiated',
    body: (name, endDate) =>
      `Hi ${name}, your City Pulse account has been scheduled for permanent deletion. Your data will be preserved until ${endDate}. After that date, all personal data will be permanently removed and your content will be anonymized.`,
    reactivation:
      'To reactivate your account, simply log in with your credentials before the grace period ends. Your account will be fully restored.',
    closing: 'If you did not request this deletion, please log in immediately to cancel it.',
  },
  ru: {
    subject: 'Подтверждение удаления аккаунта',
    heading: 'Удаление вашего аккаунта инициировано',
    body: (name, endDate) =>
      `Здравствуйте, ${name}. Ваш аккаунт City Pulse запланирован к окончательному удалению. Ваши данные будут сохранены до ${endDate}. После этой даты все персональные данные будут безвозвратно удалены, а ваш контент будет анонимизирован.`,
    reactivation:
      'Чтобы восстановить аккаунт, просто войдите в систему до окончания grace-периода. Ваш аккаунт будет полностью восстановлен.',
    closing: 'Если вы не запрашивали удаление, немедленно войдите в систему для отмены.',
  },
  uk: {
    subject: 'Підтвердження видалення акаунту',
    heading: 'Видалення вашого акаунту розпочато',
    body: (name, endDate) =>
      `Вітаємо, ${name}. Ваш акаунт City Pulse заплановано до остаточного видалення. Ваші дані будуть збережені до ${endDate}. Після цієї дати всі персональні дані будуть безповоротно видалені, а ваш контент буде анонімізовано.`,
    reactivation:
      'Щоб відновити акаунт, просто увійдіть у систему до закінчення grace-періоду. Ваш акаунт буде повністю відновлено.',
    closing: 'Якщо ви не запитували видалення, негайно увійдіть у систему для скасування.',
  },
  cs: {
    subject: 'Potvrzení smazání účtu',
    heading: 'Smazání vašeho účtu bylo zahájeno',
    body: (name, endDate) =>
      `Dobrý den, ${name}. Váš účet City Pulse byl naplánován k trvalému smazání. Vaše data budou zachována do ${endDate}. Po tomto datu budou všechna osobní data trvale odstraněna a váš obsah bude anonymizován.`,
    reactivation:
      'Pro obnovení účtu se jednoduše přihlaste před koncem ochranné lhůty. Váš účet bude plně obnoven.',
    closing: 'Pokud jste o smazání nežádali, okamžitě se přihlaste pro jeho zrušení.',
  },
  de: {
    subject: 'Bestätigung der Kontolöschung',
    heading: 'Die Löschung Ihres Kontos wurde eingeleitet',
    body: (name, endDate) =>
      `Hallo ${name}, Ihr City Pulse-Konto wurde zur dauerhaften Löschung vorgemerkt. Ihre Daten werden bis ${endDate} aufbewahrt. Nach diesem Datum werden alle persönlichen Daten unwiderruflich gelöscht und Ihre Inhalte anonymisiert.`,
    reactivation:
      'Um Ihr Konto zu reaktivieren, melden Sie sich einfach vor Ablauf der Schonfrist an. Ihr Konto wird vollständig wiederhergestellt.',
    closing:
      'Wenn Sie diese Löschung nicht angefordert haben, melden Sie sich bitte sofort an, um sie abzubrechen.',
  },
  es: {
    subject: 'Confirmación de eliminación de cuenta',
    heading: 'La eliminación de tu cuenta ha sido iniciada',
    body: (name, endDate) =>
      `Hola ${name}, tu cuenta de City Pulse ha sido programada para eliminación permanente. Tus datos se conservarán hasta ${endDate}. Después de esa fecha, todos los datos personales serán eliminados permanentemente y tu contenido será anonimizado.`,
    reactivation:
      'Para reactivar tu cuenta, simplemente inicia sesión antes de que termine el período de gracia. Tu cuenta será completamente restaurada.',
    closing: 'Si no solicitaste esta eliminación, inicia sesión inmediatamente para cancelarla.',
  },
};

// ---------------------------------------------------------------------------
// Step implementation
// ---------------------------------------------------------------------------

/**
 * Step: Send confirmation email
 *
 * - Sends confirmation email via Resend in user's preferred locale
 * - Includes grace period end date and reactivation instructions
 * - This step is NON-CRITICAL: failure is logged but does not trigger rollback
 */
export const sendConfirmationEmail: SoftDeleteStep = {
  name: 'sendConfirmationEmail',

  async execute(ctx: SoftDeleteContext, _supabase: SupabaseClient): Promise<void> {
    const resend = getResend();
    if (!resend) {
      console.warn(
        '[sendConfirmationEmail] Resend client not available (RESEND_API_KEY not set). Skipping email.',
      );
      return;
    }

    // 1. Calculate grace period end date
    const gracePeriodEnd = calculateGracePeriodEnd(ctx.requestedAt);

    // 2. Determine email locale from user's preferred locale
    const locale = determineEmailLocale([ctx.userLocale]);
    const content = EMAIL_CONTENT[locale] ?? EMAIL_CONTENT.en;

    // 3. Format the end date in a locale-appropriate way
    const formattedDate = gracePeriodEnd.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });

    // 4. Build email HTML
    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h1 style="font-size: 20px; color: #1a1a1a;">${content.heading}</h1>
        <p style="font-size: 16px; line-height: 1.5; color: #333;">${content.body(ctx.displayName, formattedDate)}</p>
        <div style="background: #f5f5f5; border-radius: 8px; padding: 16px; margin: 24px 0;">
          <p style="font-size: 14px; line-height: 1.5; color: #555; margin: 0;">${content.reactivation}</p>
        </div>
        <p style="font-size: 14px; line-height: 1.5; color: #666;">${content.closing}</p>
      </div>
    `.trim();

    // 5. Send via Resend
    const fromAddress =
      process.env.EMAIL_FROM_TRANSACTIONAL || 'City Pulse <noreply@localisio.com>';

    const { error } = await resend.emails.send({
      from: fromAddress,
      to: ctx.userEmail,
      subject: content.subject,
      html,
    });

    if (error) {
      throw new Error(`Failed to send deletion confirmation email: ${error.message}`);
    }
  },

  // No rollback needed — email sending is non-critical and idempotent
};
