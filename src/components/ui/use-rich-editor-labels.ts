'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import type { RichTextEditorLabels } from '@/components/ui/rich-text-editor';

/**
 * Returns the `RichTextEditorLabels` map populated from the shared
 * `common.rich.*` next-intl namespace. Used by every consumer of
 * `<RichTextEditor>` so all rich-text composers share the same
 * vocabulary across locales.
 *
 * The `charactersUsed` template ("{used} / {max}") is loaded via
 * `t.raw()` because `<RichTextEditor>` performs the substitution
 * itself with locale-formatted numbers — passing it through
 * `t('charactersUsed')` would crash next-intl with a missing-context
 * error, since the placeholders aren't bound at the call site.
 */
export function useRichEditorLabels(): Partial<RichTextEditorLabels> {
  const t = useTranslations('common.rich');
  return useMemo<Partial<RichTextEditorLabels>>(
    () => ({
      bold: t('bold'),
      italic: t('italic'),
      strike: t('strike'),
      heading2: t('heading2'),
      heading3: t('heading3'),
      bulletList: t('bulletList'),
      orderedList: t('orderedList'),
      blockquote: t('blockquote'),
      link: t('link'),
      linkDialogTitle: t('linkDialogTitle'),
      linkPlaceholder: t('linkPlaceholder'),
      linkSave: t('linkSave'),
      linkRemove: t('linkRemove'),
      linkCancel: t('linkCancel'),
      linkInvalid: t('linkInvalid'),
      charactersUsed: t.raw('charactersUsed') as string,
      charactersOverflow: t('charactersOverflow'),
    }),
    [t],
  );
}
