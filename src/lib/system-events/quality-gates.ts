/**
 * Quality gates for system event composition. Pure utility — used both on
 * the client (live preview while typing) and on the server (final guard
 * before flipping `editorial_status` to `scheduled` / `published`).
 *
 * Gates intentionally fall into THREE bands:
 *   - `error`   : block publish entirely until fixed.
 *   - `warning` : show a yellow chip but allow override.
 *   - `info`    : nice-to-have hint that disappears as soon as it's fulfilled.
 *
 * The composer surfaces gates inline so editors don't have to hunt for
 * mistakes; the dashboard summarises them so a second pair of eyes can
 * spot trouble at a glance.
 */

export type QualityGateLevel = 'error' | 'warning' | 'info';

export interface QualityGateInput {
  title: string | null | undefined;
  description: string | null | undefined;
  editorial_pitch: string | null | undefined;
  starts_at: string | null | undefined;
  cover_url: string | null | undefined;
  city: string | null | undefined;
  category_id: string | null | undefined;
  partner_name?: string | null;
  /** Existing event IDs in the same city + same starts_at +/- 12h. */
  duplicate_candidates?: Array<{ id: string; title: string; starts_at: string }>;
}

export interface QualityGate {
  id: string;
  level: QualityGateLevel;
  /** i18n key under `admin.systemEvents.gates.<id>`. */
  messageKey: string;
  values?: Record<string, string | number>;
}

const MIN_DESCRIPTION = 120;
const MIN_PITCH = 60;
const MAX_PITCH = 220;
const MIN_DAYS_AHEAD = 1;

/**
 * Run the full set of gates. The order is meaningful: the composer can
 * walk through them top-to-bottom and address them in priority order.
 */
export function runQualityGates(input: QualityGateInput): QualityGate[] {
  const gates: QualityGate[] = [];

  if (!input.title || input.title.trim().length < 6) {
    gates.push({ id: 'title_short', level: 'error', messageKey: 'titleShort' });
  }

  if (!input.city || input.city.trim().length === 0) {
    gates.push({ id: 'no_city', level: 'error', messageKey: 'noCity' });
  }

  if (!input.category_id) {
    gates.push({ id: 'no_category', level: 'error', messageKey: 'noCategory' });
  }

  const description = (input.description ?? '').trim();
  if (description.length < MIN_DESCRIPTION) {
    gates.push({
      id: 'description_short',
      level: 'warning',
      messageKey: 'descriptionShort',
      values: { min: MIN_DESCRIPTION, current: description.length },
    });
  }

  const pitch = (input.editorial_pitch ?? '').trim();
  if (pitch.length === 0) {
    gates.push({ id: 'pitch_missing', level: 'error', messageKey: 'pitchMissing' });
  } else if (pitch.length < MIN_PITCH) {
    gates.push({
      id: 'pitch_short',
      level: 'warning',
      messageKey: 'pitchShort',
      values: { min: MIN_PITCH, current: pitch.length },
    });
  } else if (pitch.length > MAX_PITCH) {
    gates.push({
      id: 'pitch_long',
      level: 'warning',
      messageKey: 'pitchLong',
      values: { max: MAX_PITCH, current: pitch.length },
    });
  }

  if (!input.cover_url || input.cover_url.trim().length === 0) {
    gates.push({ id: 'cover_missing', level: 'warning', messageKey: 'coverMissing' });
  }

  if (input.starts_at) {
    const ms = new Date(input.starts_at).getTime();
    if (Number.isNaN(ms)) {
      gates.push({ id: 'date_invalid', level: 'error', messageKey: 'dateInvalid' });
    } else {
      const daysAhead = (ms - Date.now()) / (1000 * 60 * 60 * 24);
      if (daysAhead < 0) {
        gates.push({ id: 'date_past', level: 'error', messageKey: 'datePast' });
      } else if (daysAhead < MIN_DAYS_AHEAD) {
        gates.push({
          id: 'date_close',
          level: 'warning',
          messageKey: 'dateClose',
          values: { min: MIN_DAYS_AHEAD },
        });
      }
    }
  } else {
    gates.push({ id: 'date_missing', level: 'error', messageKey: 'dateMissing' });
  }

  if ((input.duplicate_candidates?.length ?? 0) > 0) {
    gates.push({
      id: 'possible_duplicate',
      level: 'warning',
      messageKey: 'possibleDuplicate',
      values: { count: input.duplicate_candidates!.length },
    });
  }

  if (!input.partner_name || input.partner_name.trim().length === 0) {
    gates.push({ id: 'no_partner', level: 'info', messageKey: 'noPartner' });
  }

  return gates;
}

/**
 * Convenience: did any gate land at `error` level? Server publishing path
 * uses this as a hard stop.
 */
export function hasBlockingGate(gates: QualityGate[]): boolean {
  return gates.some((g) => g.level === 'error');
}
