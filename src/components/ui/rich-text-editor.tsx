'use client';

import * as React from 'react';
import { EditorContent, useEditor, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { extractPlainText } from '@/lib/rich-text/extract-plain';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { RichTextDoc } from '@/lib/rich-text/types';

/**
 * TipTap-based rich text composer.
 *
 * Output contract: emits a `RichTextDoc` (TipTap / ProseMirror JSON),
 * never HTML. Parents persist the JSON as-is; the server-side validator
 * (`validateRichTextDoc`) is the security boundary.
 *
 * Toolbar surface is intentionally small — we don't want a Word-like
 * UI in a community feed. Available controls:
 *   * Bold / Italic / Strikethrough
 *   * H2 / H3 (no H1: post title is the H1)
 *   * Bullet list / Ordered list
 *   * Blockquote
 *   * Link insertion (http/https only, dialog-driven)
 */

type SafeRichTextDoc = RichTextDoc;

interface RichTextEditorProps {
  value: SafeRichTextDoc | null;
  onChange: (value: SafeRichTextDoc) => void;
  placeholder?: string;
  /**
   * Hard limit on the visible plain-text length. Mirrors the legacy
   * `maxLength={4000}` on the old textarea so users get the same
   * affordance they had before.
   */
  maxLength?: number;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

const DEFAULT_DOC: RichTextDoc = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

function isSafeHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

interface ToolbarButtonProps extends React.ComponentProps<typeof Button> {
  active?: boolean;
  label: string;
}

function ToolbarButton({ active, label, className, ...props }: ToolbarButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-pressed={active ?? false}
      aria-label={label}
      title={label}
      className={cn(
        'rounded-md text-muted-foreground hover:text-foreground',
        active && 'bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary',
        className,
      )}
      {...props}
    />
  );
}

function LinkDialog({
  open,
  initial,
  onCancel,
  onSubmit,
  onRemove,
  labels,
}: {
  open: boolean;
  initial: string;
  onCancel: () => void;
  onSubmit: (href: string) => void;
  onRemove: () => void;
  labels: {
    title: string;
    placeholder: string;
    save: string;
    remove: string;
    cancel: string;
    invalid: string;
  };
}) {
  const [href, setHref] = React.useState(initial);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setHref(initial);
      setError(null);
    }
  }, [open, initial]);

  function handleSubmit() {
    const trimmed = href.trim();
    if (!trimmed) {
      onRemove();
      return;
    }
    if (!isSafeHttpUrl(trimmed)) {
      setError(labels.invalid);
      return;
    }
    onSubmit(trimmed);
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) onCancel(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="rich-text-link-href">URL</Label>
          <Input
            id="rich-text-link-href"
            value={href}
            onChange={(event) => {
              setHref(event.target.value);
              if (error) setError(null);
            }}
            placeholder={labels.placeholder}
            autoFocus
            inputMode="url"
            spellCheck={false}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          {initial && (
            <Button type="button" variant="ghost" onClick={onRemove}>
              <Link2Off className="mr-1.5 h-4 w-4" />
              {labels.remove}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onCancel}>
            {labels.cancel}
          </Button>
          <Button type="button" onClick={handleSubmit}>
            {labels.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Toolbar({
  editor,
  onOpenLink,
  labels,
}: {
  editor: Editor;
  onOpenLink: () => void;
  labels: RichTextEditorLabels;
}) {
  function chain() {
    return editor.chain().focus();
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-t-2xl border border-b-0 border-border/60 bg-muted/40 px-2 py-1.5">
      <ToolbarButton
        active={editor.isActive('bold')}
        label={labels.bold}
        onClick={() => chain().toggleBold().run()}
      >
        <Bold />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('italic')}
        label={labels.italic}
        onClick={() => chain().toggleItalic().run()}
      >
        <Italic />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('strike')}
        label={labels.strike}
        onClick={() => chain().toggleStrike().run()}
      >
        <Strikethrough />
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-border/70" aria-hidden />

      <ToolbarButton
        active={editor.isActive('heading', { level: 2 })}
        label={labels.heading2}
        onClick={() => chain().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('heading', { level: 3 })}
        label={labels.heading3}
        onClick={() => chain().toggleHeading({ level: 3 }).run()}
      >
        <Heading3 />
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-border/70" aria-hidden />

      <ToolbarButton
        active={editor.isActive('bulletList')}
        label={labels.bulletList}
        onClick={() => chain().toggleBulletList().run()}
      >
        <List />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('orderedList')}
        label={labels.orderedList}
        onClick={() => chain().toggleOrderedList().run()}
      >
        <ListOrdered />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('blockquote')}
        label={labels.blockquote}
        onClick={() => chain().toggleBlockquote().run()}
      >
        <Quote />
      </ToolbarButton>

      <span className="mx-1 h-5 w-px bg-border/70" aria-hidden />

      <ToolbarButton
        active={editor.isActive('link')}
        label={labels.link}
        onClick={onOpenLink}
      >
        <Link2 />
      </ToolbarButton>
    </div>
  );
}

export interface RichTextEditorLabels {
  bold: string;
  italic: string;
  strike: string;
  heading2: string;
  heading3: string;
  bulletList: string;
  orderedList: string;
  blockquote: string;
  link: string;
  linkDialogTitle: string;
  linkPlaceholder: string;
  linkSave: string;
  linkRemove: string;
  linkCancel: string;
  linkInvalid: string;
  charactersUsed: string; // expects "{used} / {max}"
  charactersOverflow: string;
}

export const DEFAULT_LABELS: RichTextEditorLabels = {
  bold: 'Bold',
  italic: 'Italic',
  strike: 'Strikethrough',
  heading2: 'Heading',
  heading3: 'Subheading',
  bulletList: 'Bulleted list',
  orderedList: 'Numbered list',
  blockquote: 'Quote',
  link: 'Link',
  linkDialogTitle: 'Add link',
  linkPlaceholder: 'https://example.com',
  linkSave: 'Save',
  linkRemove: 'Remove link',
  linkCancel: 'Cancel',
  linkInvalid: 'Use an http or https URL',
  charactersUsed: '{used} / {max}',
  charactersOverflow: 'Maximum length reached',
};

interface RichTextEditorPropsWithLabels extends RichTextEditorProps {
  labels?: Partial<RichTextEditorLabels>;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  maxLength,
  className,
  disabled,
  ariaLabel,
  labels: providedLabels,
}: RichTextEditorPropsWithLabels) {
  const labels = React.useMemo(
    () => ({ ...DEFAULT_LABELS, ...providedLabels }),
    [providedLabels],
  );

  const [linkDialogOpen, setLinkDialogOpen] = React.useState(false);
  const [linkInitial, setLinkInitial] = React.useState('');

  // Hold the latest doc in a ref so the change handler can compare without
  // forcing the editor to re-create on every parent render.
  const valueRef = React.useRef<SafeRichTextDoc | null>(value);

  const editor = useEditor({
    immediatelyRender: false,
    editable: !disabled,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        codeBlock: false,
        code: false,
        horizontalRule: false,
      }),
      Placeholder.configure({
        placeholder: placeholder ?? '',
        emptyEditorClass: 'is-editor-empty',
      }),
      Link.configure({
        openOnClick: false,
        autolink: false,
        linkOnPaste: true,
        protocols: ['http', 'https'],
        HTMLAttributes: {
          rel: 'noopener noreferrer nofollow',
          target: '_blank',
        },
        validate: (href) => isSafeHttpUrl(href),
      }),
    ],
    content: value ?? DEFAULT_DOC,
    editorProps: {
      attributes: {
        'aria-label': ariaLabel ?? '',
        class:
          'rich-text-editor-content prose prose-sm dark:prose-invert max-w-none min-h-[160px] focus:outline-none px-4 py-3 leading-7',
      },
    },
    onUpdate: ({ editor: instance }) => {
      const json = instance.getJSON() as SafeRichTextDoc;
      valueRef.current = json;
      onChange(json);
    },
  });

  // Re-sync from outside when the parent resets `value` (e.g. after
  // submitting the form). We compare on identity to avoid clobbering
  // the user's in-flight edits during normal updates.
  React.useEffect(() => {
    if (!editor) return;
    if (value === valueRef.current) return;
    valueRef.current = value;
    editor.commands.setContent(value ?? DEFAULT_DOC, { emitUpdate: false });
  }, [editor, value]);

  React.useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  const plainLength = React.useMemo(() => extractPlainText(value).length, [value]);
  const overflow = typeof maxLength === 'number' && plainLength > maxLength;

  function openLinkDialog() {
    if (!editor) return;
    const previous = editor.getAttributes('link')?.href as string | undefined;
    setLinkInitial(previous ?? '');
    setLinkDialogOpen(true);
  }

  function applyLink(href: string) {
    if (!editor) return;
    editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    setLinkDialogOpen(false);
  }

  function removeLink() {
    if (!editor) return;
    editor.chain().focus().extendMarkRange('link').unsetLink().run();
    setLinkDialogOpen(false);
  }

  return (
    <div className={cn('flex flex-col', className)} aria-busy={!editor}>
      {editor && (
        <Toolbar editor={editor} onOpenLink={openLinkDialog} labels={labels} />
      )}
      <div
        className={cn(
          'rounded-b-2xl border border-border/60 bg-background transition-colors',
          'focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30',
          disabled && 'pointer-events-none opacity-60',
          overflow && 'border-destructive/60 focus-within:border-destructive focus-within:ring-destructive/20',
          !editor && 'min-h-[160px]',
        )}
      >
        <EditorContent editor={editor} />
      </div>

      {typeof maxLength === 'number' && (
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className={cn('text-muted-foreground', overflow && 'text-destructive font-medium')}>
            {overflow
              ? labels.charactersOverflow
              : labels.charactersUsed
                  .replace('{used}', plainLength.toLocaleString())
                  .replace('{max}', maxLength.toLocaleString())}
          </span>
        </div>
      )}

      <LinkDialog
        open={linkDialogOpen}
        initial={linkInitial}
        onCancel={() => setLinkDialogOpen(false)}
        onSubmit={applyLink}
        onRemove={removeLink}
        labels={{
          title: labels.linkDialogTitle,
          placeholder: labels.linkPlaceholder,
          save: labels.linkSave,
          remove: labels.linkRemove,
          cancel: labels.linkCancel,
          invalid: labels.linkInvalid,
        }}
      />
    </div>
  );
}

export type { SafeRichTextDoc };
