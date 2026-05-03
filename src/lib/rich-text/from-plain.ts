import type { RichTextDoc, RichTextInline, RichTextParagraph } from './types';

/**
 * Builds a minimal valid TipTap doc from a plain-text string. Used to
 * upgrade legacy posts on first edit: the editor needs *some* JSON to
 * load, even when `content_json IS NULL`. We split on blank lines into
 * paragraphs and on single newlines into hard breaks, which is the
 * closest one-to-one mapping back from `whitespace-pre-wrap` plain text.
 */
export function plainTextToRichTextDoc(input: string | null | undefined): RichTextDoc {
  const text = (input ?? '').replace(/\r\n?/g, '\n');
  const paragraphs = text.split(/\n{2,}/);

  const blocks: RichTextParagraph[] = paragraphs.map((paragraph) => {
    const trimmed = paragraph.replace(/[\u00A0\s]+$/g, '').replace(/^[\u00A0\s]+/g, (match) => match.replace(/\n/g, ''));
    const lines = trimmed.split('\n');
    const inline: RichTextInline[] = [];
    lines.forEach((line, index) => {
      if (line) inline.push({ type: 'text', text: line });
      if (index < lines.length - 1) inline.push({ type: 'hardBreak' });
    });
    return inline.length === 0
      ? { type: 'paragraph' }
      : { type: 'paragraph', content: inline };
  });

  if (blocks.length === 0) {
    blocks.push({ type: 'paragraph' });
  }

  return { type: 'doc', content: blocks };
}
