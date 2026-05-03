import { z } from 'zod/v4';
import { uuidSchema } from './common';

export const groupPostTypeSchema = z.enum(['update', 'announcement', 'event_recap']);

/**
 * Rich text content is validated structurally by `validateRichTextDoc`
 * in `@/lib/rich-text/validate.ts` — Zod here only forwards the value
 * unchanged. We deliberately don't try to model the entire ProseMirror
 * schema in Zod: the dedicated validator returns a normalised tree and
 * is the single source of truth (rejecting unknown nodes/marks, capping
 * sizes, sanitising link hrefs, etc.).
 */
const richTextDocLikeSchema = z.unknown();

export const createGroupPostSchema = z
  .object({
    groupId: uuidSchema,
    type: groupPostTypeSchema,
    title: z.string().trim().min(1, 'Title is required').max(200, 'Title is too long'),
    contentJson: richTextDocLikeSchema,
    eventId: uuidSchema.nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'event_recap' && !data.eventId) {
      ctx.addIssue({
        code: 'custom',
        message: 'Event is required for a recap',
        path: ['eventId'],
      });
    }
    if (!data.contentJson) {
      ctx.addIssue({
        code: 'custom',
        message: 'Content is required',
        path: ['contentJson'],
      });
    }
  });

export const updateGroupPostSchema = z.object({
  title: z.string().trim().min(1).max(200),
  contentJson: richTextDocLikeSchema,
}).superRefine((data, ctx) => {
  if (!data.contentJson) {
    ctx.addIssue({
      code: 'custom',
      message: 'Content is required',
      path: ['contentJson'],
    });
  }
});

export const groupPostCommentSchema = z.object({
  content: z.string().trim().min(1, 'Comment is required').max(2000),
  parentId: uuidSchema.optional(),
  replyToId: uuidSchema.optional(),
  quotedText: z.string().trim().max(500).optional(),
  quotedAuthorName: z.string().trim().max(120).optional(),
});

export type CreateGroupPostInput = z.infer<typeof createGroupPostSchema>;
export type UpdateGroupPostInput = z.infer<typeof updateGroupPostSchema>;
export type GroupPostCommentInput = z.infer<typeof groupPostCommentSchema>;
