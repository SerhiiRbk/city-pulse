import type { RichTextDoc, RichTextNode } from './types';

/**
 * Extracts a plain-text projection of a TipTap doc. Mirrors the Postgres
 * `tiptap_doc_to_text` function so client and server agree on what gets
 * stored in `group_posts.content` (the SEO snippet) and on what the
 * character counter in `<RichTextEditor>` measures.
 *
 * Rules:
 *   * `text` nodes contribute their `text` property as-is.
 *   * `hardBreak` becomes a single space (so "line one\nline two" reads
 *     well in OG descriptions).
 *   * Block-level siblings (`paragraph`, `heading`, `blockquote`,
 *     `listItem`) are joined by a single newline.
 *   * Inline-level siblings inside a single block are joined by a space.
 *   * Empty runs are dropped — never produce double-newlines.
 */

const BLOCK_TYPES = new Set([
  'doc',
  'blockquote',
  'bulletList',
  'orderedList',
  'listItem',
]);

function nodeToText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const record = node as Record<string, unknown>;

  if (record.type === 'text' && typeof record.text === 'string') {
    return record.text;
  }

  if (record.type === 'hardBreak') return ' ';

  if (!Array.isArray(record.content)) return '';

  const isBlockContainer = typeof record.type === 'string' && BLOCK_TYPES.has(record.type);
  const separator = isBlockContainer ? '\n' : ' ';

  let result = '';
  for (const child of record.content) {
    const childText = nodeToText(child);
    if (!childText) continue;
    if (result === '') {
      result = childText;
    } else {
      result += separator + childText;
    }
  }
  return result;
}

export function extractPlainText(doc: RichTextDoc | null | undefined): string {
  if (!doc) return '';
  return nodeToText(doc as RichTextNode).trim();
}

/**
 * Length of the plain-text projection. Used by the editor's character
 * counter so the limit feels predictable to users (it tracks what they
 * see, not the JSON byte size).
 */
export function richTextLength(doc: RichTextDoc | null | undefined): number {
  return extractPlainText(doc).length;
}
