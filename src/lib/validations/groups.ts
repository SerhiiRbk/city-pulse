import { z } from 'zod/v4';
import { COUNTRIES, LANGUAGES } from '@/lib/constants';
import { slugSchema, urlSchema, uuidSchema } from './common';

const countryCodes = COUNTRIES.map((c) => c.code) as [string, ...string[]];
const languageCodes = LANGUAGES.map((l) => l.code) as [string, ...string[]];

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

const baseGroupFields = {
  name: z.string().trim().min(3, 'Name is too short').max(80, 'Name is too long'),
  slug: slugSchema.nullable().optional(),
  description: z.string().trim().max(4000, 'Description is too long').default(''),
  description_json: richTextDocLikeSchema.optional(),
  cover_url: urlSchema.nullable().optional(),
  languages: z.array(z.enum(languageCodes)).max(5, 'Up to 5 languages').default([]),
  country: z.enum(countryCodes).nullable().optional(),
  city: z.string().trim().min(1).max(120).nullable().optional(),
  city_id: uuidSchema.nullable().optional(),
  interest_ids: z.array(uuidSchema).max(10, 'Up to 10 interests').default([]),
};

export const createGroupSchema = z.object(baseGroupFields);

export const updateGroupSchema = z
  .object(baseGroupFields)
  .partial();

export const groupCommentSchema = z.object({
  content: z.string().trim().min(1, 'Comment is required').max(2000),
  parentId: uuidSchema.optional(),
  replyToId: uuidSchema.optional(),
  quotedText: z.string().trim().max(500).optional(),
  quotedAuthorName: z.string().trim().max(120).optional(),
});

export type CreateGroupInput = z.infer<typeof createGroupSchema>;
export type UpdateGroupInput = z.infer<typeof updateGroupSchema>;
export type GroupCommentInput = z.infer<typeof groupCommentSchema>;
