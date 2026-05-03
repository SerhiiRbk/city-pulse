-- ============================================================
-- City-Pulse: rich text content for group posts (TipTap JSON)
-- ============================================================
-- Group post bodies (announcements, updates, recaps) move from
-- single-line plain text to a structured TipTap / ProseMirror
-- document stored as JSON. We keep the legacy `content` text
-- column populated with the auto-extracted plain-text version of
-- the document so that:
--   * existing previews / list cards / OpenGraph descriptions
--     keep working unchanged,
--   * the SEO snippet on the detail page still renders correctly,
--   * any old client that hasn't been redeployed continues to read
--     from `content` without crashing.
--
-- Storage choice (JSON over HTML):
--   * structural validation against a small whitelist of node /
--     mark types is much safer than running an HTML sanitizer at
--     read time;
--   * the read path renders JSON -> React directly, with zero
--     `dangerouslySetInnerHTML`, which removes a whole class of
--     XSS surface;
--   * round-trips into the editor are lossless (no whitespace /
--     attribute normalisation).
--
-- Backfill strategy:
--   * We do NOT touch existing rows. `content_json` is left NULL
--     for old posts. The renderer falls back to plain `content`
--     (linkified) when `content_json IS NULL`, so old posts keep
--     looking exactly like they do today. Posts get JSON
--     organically the next time someone opens them in the editor.
-- ============================================================

-- 1. Storage column for the TipTap document.
alter table public.group_posts
  add column if not exists content_json jsonb;

-- 2. Plain-text extractor. Recursively walks a TipTap doc and
--    concatenates every `text` node, inserting a single newline
--    between block-level siblings (paragraphs, list items, etc.)
--    and a single space inside inline runs. The resulting text is
--    what we mirror into `content` and what `og:description` / list
--    previews / character counters consume.
create or replace function public.tiptap_doc_to_text(doc jsonb)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  result text := '';
  node jsonb;
  child_text text;
  node_type text;
begin
  if doc is null then
    return '';
  end if;

  -- Plain text nodes contribute their `text` property directly.
  if doc ? 'text' then
    return coalesce(doc->>'text', '');
  end if;

  node_type := doc->>'type';

  -- `hardBreak` becomes a single space so words don't fuse together.
  if node_type = 'hardBreak' then
    return ' ';
  end if;

  -- Recurse into children.
  if jsonb_typeof(doc->'content') = 'array' then
    for node in select * from jsonb_array_elements(doc->'content') loop
      child_text := public.tiptap_doc_to_text(node);
      if child_text <> '' then
        if result <> '' then
          -- Separator: newline between block nodes, space between inline.
          if node_type in ('doc', 'blockquote', 'bulletList', 'orderedList', 'listItem') then
            result := result || E'\n';
          else
            result := result || ' ';
          end if;
        end if;
        result := result || child_text;
      end if;
    end loop;
  end if;

  return result;
end;
$$;

-- 3. Trigger: whenever a row's `content_json` changes, re-derive
--    the plain-text mirror in `content` (capped at the existing
--    4000-char limit, matching the column's CHECK constraint).
create or replace function public.group_posts_sync_content_plain()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  derived text;
begin
  if new.content_json is null then
    return new;
  end if;

  derived := trim(public.tiptap_doc_to_text(new.content_json));

  if derived = '' then
    -- Empty docs are rejected at the application layer; defend in
    -- depth here too so the CHECK constraint can't get violated.
    raise exception 'group_posts.content_json must contain at least one text node';
  end if;

  if length(derived) > 4000 then
    derived := substring(derived from 1 for 4000);
  end if;

  new.content := derived;
  return new;
end;
$$;

drop trigger if exists trg_group_posts_sync_content_plain on public.group_posts;
create trigger trg_group_posts_sync_content_plain
  before insert or update of content_json on public.group_posts
  for each row
  execute function public.group_posts_sync_content_plain();

-- 4. Index for jsonb lookups (e.g. future full-text search over
--    structured content). `gin (jsonb_path_ops)` is the most
--    compact index variant for `@>` containment queries; we don't
--    need full path indexing today.
create index if not exists idx_group_posts_content_json
  on public.group_posts using gin (content_json jsonb_path_ops)
  where content_json is not null;

-- 5. Defensive comment: keep `content` as the canonical plain-text
--    column for previews, even after richer fields land. The
--    trigger guarantees it stays in sync with `content_json`.
comment on column public.group_posts.content is
  'Plain-text mirror of `content_json` (auto-derived by trigger). Used for list previews, OG descriptions, search.';
comment on column public.group_posts.content_json is
  'TipTap / ProseMirror document for the post body. NULL for legacy posts that have not been re-edited yet.';
