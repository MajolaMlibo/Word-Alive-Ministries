-- Support stable cursor pagination for content that grows over time. These
-- indexes are forward-only and do not change existing data or access rules.
begin;

create index if not exists bible_verse_saves_user_updated_cursor_idx
  on public.bible_verse_saves (user_id, updated_at desc, id desc);

create index if not exists bible_studies_published_date_cursor_idx
  on public.bible_studies (study_date desc, id desc)
  where status = 'published';

commit;
