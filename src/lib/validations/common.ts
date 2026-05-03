import { z } from 'zod/v4';

export const uuidSchema = z.string().uuid('Invalid id');

export const optionalNullableString = z
  .string()
  .trim()
  .min(1)
  .max(2000)
  .optional()
  .nullable();

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, 'Slug must be at least 3 characters')
  .max(60, 'Slug must be at most 60 characters')
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must contain only lowercase letters, digits and dashes');

export const isoDateSchema = z
  .string()
  .min(10, 'Invalid date')
  .max(40, 'Invalid date')
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date');

export const urlSchema = z.string().url('Invalid URL').max(2048);

export function prettyZodError(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return 'Invalid input';
  const path = issue.path.filter(Boolean).join('.');
  return path ? `${path}: ${issue.message}` : issue.message;
}
