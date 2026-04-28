import type {
  RichTextBlock,
  RichTextDoc,
  RichTextHeading,
  RichTextInline,
  RichTextListItem,
  RichTextMark,
  RichTextOrderedList,
  RichTextTextNode,
} from './types';

/**
 * Server-side whitelist validator + sanitiser for TipTap JSON documents
 * stored in `group_posts.content_json`.
 *
 * Why a whitelist rather than a sanitiser: for our use case (write +
 * read both run our own code), validating that every node and mark
 * matches a known-safe shape is strictly safer and simpler than running
 * an HTML sanitiser. If we ever want to add a new node type (callouts,
 * mentions, embeds, …), we add it here, in `<RichTextView>`, and in the
 * editor extensions — and only then.
 *
 * Behaviour: this function rebuilds a fresh tree containing only known
 * types/attributes. Unknown nodes/marks are dropped silently; structural
 * problems (e.g. `doc.content` not being an array, no allowed text
 * content) raise a `RichTextValidationError`.
 */

export class RichTextValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RichTextValidationError';
  }
}

const MAX_TEXT_NODE_LENGTH = 8_000;
const MAX_BLOCKS = 400;
const MAX_INLINE_PER_BLOCK = 800;
const MAX_LIST_ITEMS = 200;
const MAX_NESTED_BLOCKS = 60;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function sanitizeHttpUrl(href: unknown): string | null {
  if (typeof href !== 'string') return null;
  const trimmed = href.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function validateMarks(input: unknown): RichTextMark[] | undefined {
  if (!Array.isArray(input)) return undefined;
  const marks: RichTextMark[] = [];
  for (const raw of input) {
    if (!isPlainObject(raw)) continue;
    const type = raw.type;
    if (type === 'bold' || type === 'italic' || type === 'strike') {
      marks.push({ type });
      continue;
    }
    if (type === 'link') {
      const attrs = isPlainObject(raw.attrs) ? raw.attrs : {};
      const href = sanitizeHttpUrl(attrs.href);
      if (!href) continue;
      marks.push({ type: 'link', attrs: { href } });
    }
  }
  if (marks.length === 0) return undefined;
  return marks;
}

function validateInline(input: unknown): RichTextInline | null {
  if (!isPlainObject(input)) return null;
  const type = input.type;
  if (type === 'text') {
    const text = typeof input.text === 'string' ? input.text : '';
    if (!text) return null;
    const trimmedText = text.length > MAX_TEXT_NODE_LENGTH
      ? text.slice(0, MAX_TEXT_NODE_LENGTH)
      : text;
    const marks = validateMarks(input.marks);
    const node: RichTextTextNode = { type: 'text', text: trimmedText };
    if (marks) node.marks = marks;
    return node;
  }
  if (type === 'hardBreak') {
    return { type: 'hardBreak' };
  }
  return null;
}

function validateInlineContent(input: unknown): RichTextInline[] {
  const out: RichTextInline[] = [];
  for (const raw of asArray(input)) {
    if (out.length >= MAX_INLINE_PER_BLOCK) break;
    const node = validateInline(raw);
    if (node) out.push(node);
  }
  return out;
}

function clampHeadingLevel(raw: unknown): 2 | 3 {
  return raw === 3 ? 3 : 2;
}

function validateHeading(input: Record<string, unknown>): RichTextHeading | null {
  const inline = validateInlineContent(input.content);
  if (inline.length === 0) return null;
  const level = clampHeadingLevel(isPlainObject(input.attrs) ? input.attrs.level : undefined);
  return {
    type: 'heading',
    attrs: { level },
    content: inline,
  };
}

function validateOrderedList(
  input: Record<string, unknown>,
  depth: number,
): RichTextOrderedList | null {
  const items = validateListItems(input.content, depth);
  if (items.length === 0) return null;
  const startRaw = isPlainObject(input.attrs) ? input.attrs.start : undefined;
  const start = typeof startRaw === 'number' && Number.isFinite(startRaw) && startRaw > 0
    ? Math.floor(startRaw)
    : undefined;
  const node: RichTextOrderedList = { type: 'orderedList', content: items };
  if (start !== undefined && start !== 1) node.attrs = { start };
  return node;
}

function validateListItems(input: unknown, depth: number): RichTextListItem[] {
  const out: RichTextListItem[] = [];
  for (const raw of asArray(input)) {
    if (out.length >= MAX_LIST_ITEMS) break;
    if (!isPlainObject(raw) || raw.type !== 'listItem') continue;
    const blocks = validateBlockContent(raw.content, depth + 1);
    if (blocks.length === 0) continue;
    out.push({ type: 'listItem', content: blocks });
  }
  return out;
}

function validateBlock(input: unknown, depth: number): RichTextBlock | null {
  if (!isPlainObject(input)) return null;
  if (depth > MAX_NESTED_BLOCKS) return null;
  const type = input.type;

  if (type === 'paragraph') {
    const inline = validateInlineContent(input.content);
    return { type: 'paragraph', content: inline };
  }

  if (type === 'heading') {
    return validateHeading(input);
  }

  if (type === 'blockquote') {
    const blocks = validateBlockContent(input.content, depth + 1);
    if (blocks.length === 0) return null;
    return { type: 'blockquote', content: blocks };
  }

  if (type === 'bulletList') {
    const items = validateListItems(input.content, depth);
    if (items.length === 0) return null;
    return { type: 'bulletList', content: items };
  }

  if (type === 'orderedList') {
    return validateOrderedList(input, depth);
  }

  return null;
}

function validateBlockContent(input: unknown, depth: number): RichTextBlock[] {
  const out: RichTextBlock[] = [];
  for (const raw of asArray(input)) {
    if (out.length >= MAX_BLOCKS) break;
    const block = validateBlock(raw, depth);
    if (block) out.push(block);
  }
  return out;
}

/**
 * Returns `true` if the document contains at least one non-empty text run.
 * We refuse to persist a doc whose visible text would collapse to "".
 */
export function richTextHasContent(doc: RichTextDoc): boolean {
  const stack: unknown[] = [doc];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!isPlainObject(current)) continue;
    if (current.type === 'text' && typeof current.text === 'string' && current.text.trim() !== '') {
      return true;
    }
    if (Array.isArray(current.content)) {
      for (const child of current.content) stack.push(child);
    }
  }
  return false;
}

/**
 * Validates an arbitrary value as a TipTap doc. Throws
 * `RichTextValidationError` on structural failure. Always returns a
 * fresh, normalised doc that's safe to render and serialize.
 */
export function validateRichTextDoc(input: unknown): RichTextDoc {
  if (!isPlainObject(input) || input.type !== 'doc') {
    throw new RichTextValidationError('Document root must be { type: "doc" }');
  }
  const blocks = validateBlockContent(input.content, 0);
  if (blocks.length === 0) {
    throw new RichTextValidationError('Document must contain at least one paragraph');
  }
  const doc: RichTextDoc = { type: 'doc', content: blocks };
  if (!richTextHasContent(doc)) {
    throw new RichTextValidationError('Document must contain at least one non-empty text node');
  }
  return doc;
}

/**
 * Convenience for server actions: parses a JSON string when callers
 * forward the raw payload, then validates it.
 */
export function parseAndValidateRichTextDoc(input: unknown): RichTextDoc {
  if (typeof input === 'string') {
    try {
      return validateRichTextDoc(JSON.parse(input));
    } catch (err) {
      if (err instanceof RichTextValidationError) throw err;
      throw new RichTextValidationError('Invalid JSON document');
    }
  }
  return validateRichTextDoc(input);
}
