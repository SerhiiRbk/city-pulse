import { z } from 'zod/v4';
import { uuidSchema } from './common';

export const groupPostTypeSchema = z.enum(['update', 'announcement', 'event_recap']);

export const createGroupPostSchema = z
  .object({
    groupId: uuidSchema,
    type: groupPostTypeSchema,
    title: z.string().trim().min(1, 'Title is required').max(200, 'Title is too long'),
    content: z.string().trim().min(1, 'Content is required').max(4000, 'Content is too long'),
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
  });

export const updateGroupPostSchema = z.object({
  title: z.string().trim().min(1).max(200),
  content: z.string().trim().min(1).max(4000),
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
