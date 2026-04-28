/**
 * Strict subset of the ProseMirror / TipTap document model that we accept
 * in group post bodies. Anything outside of this whitelist is rejected
 * server-side (see `validate.ts`) so we never persist unknown nodes or
 * marks.
 *
 * The renderer in `<RichTextView>` and the composer in `<RichTextEditor>`
 * are kept in sync with these types: extending the doc model in one place
 * (e.g. adding a `code_block` node) requires touching the validator, the
 * editor extensions, the React renderer, and the optional plain-text
 * extractor — by design.
 */

export type RichTextMark =
  | { type: 'bold' }
  | { type: 'italic' }
  | { type: 'strike' }
  | { type: 'link'; attrs: { href: string } };

export interface RichTextTextNode {
  type: 'text';
  text: string;
  marks?: RichTextMark[];
}

export interface RichTextHardBreakNode {
  type: 'hardBreak';
}

export type RichTextInline = RichTextTextNode | RichTextHardBreakNode;

export interface RichTextParagraph {
  type: 'paragraph';
  content?: RichTextInline[];
}

export interface RichTextHeading {
  type: 'heading';
  attrs: { level: 2 | 3 };
  content?: RichTextInline[];
}

export interface RichTextBlockquote {
  type: 'blockquote';
  content?: RichTextBlock[];
}

export interface RichTextListItem {
  type: 'listItem';
  content?: RichTextBlock[];
}

export interface RichTextBulletList {
  type: 'bulletList';
  content?: RichTextListItem[];
}

export interface RichTextOrderedList {
  type: 'orderedList';
  attrs?: { start?: number };
  content?: RichTextListItem[];
}

export type RichTextBlock =
  | RichTextParagraph
  | RichTextHeading
  | RichTextBlockquote
  | RichTextBulletList
  | RichTextOrderedList;

export interface RichTextDoc {
  type: 'doc';
  content?: RichTextBlock[];
}

/** Anything that may appear as a child of a list item or blockquote. */
export type RichTextNode = RichTextDoc | RichTextBlock | RichTextListItem | RichTextInline;
