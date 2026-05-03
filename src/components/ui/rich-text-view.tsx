import * as React from 'react';
import { cn } from '@/lib/utils';
import { LinkifiedText } from '@/components/ui/linkified-text';
import type {
  RichTextBlock,
  RichTextDoc,
  RichTextInline,
  RichTextListItem,
  RichTextMark,
  RichTextOrderedList,
  RichTextTextNode,
} from '@/lib/rich-text/types';

/**
 * Renders a validated TipTap doc as a React tree.
 *
 * Properties:
 *   * No `dangerouslySetInnerHTML`. Every node is mapped to a typed
 *     React element, so unknown node types in stored content can never
 *     introduce script execution.
 *   * Bare URLs in text nodes (without an explicit `link` mark) are
 *     auto-linkified via `<LinkifiedText>` so the read-side behaviour
 *     stays consistent with comments.
 *   * Falls back to plain text when `doc` is null (legacy posts that
 *     were created before the rich-text migration). The fallback path
 *     also runs auto-linkification.
 *   * Designed to be a Server Component: zero hooks, zero state.
 */

interface RichTextViewProps {
  doc: RichTextDoc | null | undefined;
  /**
   * Plain-text fallback used when `doc` is null. Required for legacy
   * group posts whose `content_json` hasn't been generated yet.
   */
  fallbackText?: string | null;
  className?: string;
}

function isSafeHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function applyMarks(text: React.ReactNode, marks: RichTextMark[] | undefined, key: string): React.ReactNode {
  if (!marks || marks.length === 0) return <React.Fragment key={key}>{text}</React.Fragment>;

  let node: React.ReactNode = text;
  // Apply non-link marks first (so the link wrapper is the outermost
  // element and clicks register cleanly).
  for (const mark of marks) {
    if (mark.type === 'bold') node = <strong>{node}</strong>;
    else if (mark.type === 'italic') node = <em>{node}</em>;
    else if (mark.type === 'strike') node = <s>{node}</s>;
  }

  const link = marks.find((mark) => mark.type === 'link');
  if (link && link.type === 'link' && isSafeHttpUrl(link.attrs.href)) {
    node = (
      <a
        href={link.attrs.href}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="break-words underline underline-offset-2 decoration-primary/40 transition-colors hover:text-primary hover:decoration-primary"
      >
        {node}
      </a>
    );
  }

  return <React.Fragment key={key}>{node}</React.Fragment>;
}

function renderText(node: RichTextTextNode, key: string): React.ReactNode {
  const hasLinkMark = node.marks?.some((mark) => mark.type === 'link');
  const content: React.ReactNode = hasLinkMark
    ? node.text
    : <LinkifiedText text={node.text} />;
  return applyMarks(content, node.marks, key);
}

function renderInline(node: RichTextInline, key: string): React.ReactNode {
  if (node.type === 'text') return renderText(node, key);
  if (node.type === 'hardBreak') return <br key={key} />;
  return null;
}

function renderInlineContent(content: RichTextInline[] | undefined, parentKey: string): React.ReactNode[] {
  return (content ?? []).map((node, index) => renderInline(node, `${parentKey}.i${index}`));
}

function renderListItem(item: RichTextListItem, key: string): React.ReactNode {
  return (
    <li key={key}>{renderBlocks(item.content, key)}</li>
  );
}

function renderOrderedList(node: RichTextOrderedList, key: string): React.ReactNode {
  const start = node.attrs?.start;
  return (
    <ol key={key} start={start} className="list-decimal space-y-1 pl-6 marker:text-muted-foreground">
      {(node.content ?? []).map((item, index) => renderListItem(item, `${key}.li${index}`))}
    </ol>
  );
}

function renderBlock(block: RichTextBlock, key: string): React.ReactNode {
  if (block.type === 'paragraph') {
    return (
      <p key={key} className="leading-7">{renderInlineContent(block.content, key)}</p>
    );
  }

  if (block.type === 'heading') {
    if (block.attrs.level === 2) {
      return (
        <h2 key={key} className="mt-6 text-xl font-semibold tracking-tight text-foreground first:mt-0">
          {renderInlineContent(block.content, key)}
        </h2>
      );
    }
    return (
      <h3 key={key} className="mt-5 text-base font-semibold tracking-tight text-foreground first:mt-0">
        {renderInlineContent(block.content, key)}
      </h3>
    );
  }

  if (block.type === 'blockquote') {
    return (
      <blockquote
        key={key}
        className="border-l-2 border-primary/30 pl-4 italic text-muted-foreground"
      >
        {renderBlocks(block.content, key)}
      </blockquote>
    );
  }

  if (block.type === 'bulletList') {
    return (
      <ul key={key} className="list-disc space-y-1 pl-6 marker:text-muted-foreground">
        {(block.content ?? []).map((item, index) => renderListItem(item, `${key}.li${index}`))}
      </ul>
    );
  }

  if (block.type === 'orderedList') {
    return renderOrderedList(block, key);
  }

  return null;
}

function renderBlocks(blocks: RichTextBlock[] | undefined, parentKey: string): React.ReactNode[] {
  return (blocks ?? []).map((block, index) => renderBlock(block, `${parentKey}.b${index}`));
}

export function RichTextView({ doc, fallbackText, className }: RichTextViewProps) {
  if (doc && Array.isArray(doc.content) && doc.content.length > 0) {
    return (
      <div className={cn('rich-text space-y-3 text-sm leading-7 text-muted-foreground', className)}>
        {renderBlocks(doc.content, 'root')}
      </div>
    );
  }

  if (fallbackText && fallbackText.trim()) {
    return (
      <div className={cn('rich-text space-y-3 text-sm leading-7 text-muted-foreground', className)}>
        <p className="whitespace-pre-wrap">
          <LinkifiedText text={fallbackText} />
        </p>
      </div>
    );
  }

  return null;
}
