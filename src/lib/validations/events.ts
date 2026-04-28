import { z } from 'zod/v4';
import { COUNTRIES, LANGUAGES, MAX_EVENT_PHOTOS } from '@/lib/constants';
import { isoDateSchema, urlSchema, uuidSchema } from './common';

const countryCodes = COUNTRIES.map((c) => c.code) as [string, ...string[]];
const languageCodes = LANGUAGES.map((l) => l.code) as [string, ...string[]];

const currencySchema = z
  .string()
  .trim()
  .length(3, 'Currency must be a 3-letter ISO code')
  .toUpperCase();

/**
 * The rich body is structurally validated server-side by
 * `parseAndValidateRichTextDoc` (see `@/lib/rich-text/validate.ts`),
 * which is the single source of truth for the allowed shape. Zod
 * here just forwards the value as `unknown` — modeling the entire
 * ProseMirror schema in Zod would duplicate the whitelist and drift
 * from it. The plain `description` field is kept for legacy callers
 * and is also auto-derived by a BEFORE-trigger from
 * `description_json` whenever it's set (migration 046).
 */
const richTextDocLikeSchema = z.unknown();

const baseEventFields = {
  title: z.string().trim().min(3, 'Title is too short').max(120, 'Title is too long'),
  description: z.string().trim().max(4000, 'Description is too long').default(''),
  description_json: richTextDocLikeSchema.optional(),
  languages: z
    .array(z.enum(languageCodes))
    .max(5, 'Up to 5 languages')
    .default([]),
  category_id: uuidSchema,
  starts_at: isoDateSchema,
  duration_minutes: z
    .number()
    .int()
    .min(15, 'Event must last at least 15 minutes')
    .max(60 * 24 * 7, 'Event must be shorter than a week'),
  is_online: z.boolean().default(false),
  is_free: z.boolean().default(true),
  price: z.number().min(0).max(1_000_000).nullable().optional(),
  currency: currencySchema.nullable().optional(),
  max_attendees: z.number().int().min(1).max(100_000).nullable().optional(),
  country: z.enum(countryCodes).nullable().optional(),
  city: z.string().trim().min(1).max(120).nullable().optional(),
  city_id: uuidSchema.nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
  is_private: z.boolean().default(false),
  photos: z.array(urlSchema).max(MAX_EVENT_PHOTOS, `Up to ${MAX_EVENT_PHOTOS} photos`).default([]),
  group_id: uuidSchema.nullable().optional(),
};

export const createEventSchema = z
  .object(baseEventFields)
  .superRefine((data, ctx) => {
    if (!data.is_online && !data.city && !data.city_id) {
      ctx.addIssue({
        code: 'custom',
        message: 'Offline events must include a city',
        path: ['city'],
      });
    }
    if (data.is_free === false && (data.price == null || data.price <= 0)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Paid events must have a price above zero',
        path: ['price'],
      });
    }
  });

export const updateEventSchema = z
  .object({
    ...baseEventFields,
    status: z.enum(['draft', 'published', 'cancelled', 'completed']).optional(),
  })
  .partial();

export const eventCommentSchema = z.object({
  content: z.string().trim().min(1, 'Comment is required').max(500),
  parentId: uuidSchema.optional(),
  replyToId: uuidSchema.optional(),
  quotedText: z.string().trim().max(500).optional(),
  quotedAuthorName: z.string().trim().max(120).optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type EventCommentInput = z.infer<typeof eventCommentSchema>;
