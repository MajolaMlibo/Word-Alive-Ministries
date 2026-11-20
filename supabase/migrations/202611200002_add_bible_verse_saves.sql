begin;

create table public.bible_verse_saves (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  translation text not null default 'KJV' check (translation = 'KJV'),
  book text not null check (length(trim(book)) > 0),
  chapter integer not null check (chapter between 1 and 176),
  verse integer not null check (verse between 1 and 176),
  highlight_color text check (
    highlight_color is null
    or highlight_color in ('gold', 'green', 'blue', 'pink')
  ),
  is_bookmarked boolean not null default false,
  note text check (note is null or length(trim(note)) between 1 and 4000),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (user_id, translation, book, chapter, verse),
  check (highlight_color is not null or is_bookmarked = true or note is not null)
);

create index bible_verse_saves_user_reference_idx
  on public.bible_verse_saves (user_id, book, chapter, verse);

create trigger bible_verse_saves_set_updated_at before update on public.bible_verse_saves
  for each row execute procedure public.set_updated_at();

alter table public.bible_verse_saves enable row level security;

create policy bible_verse_saves_select_own on public.bible_verse_saves
  for select to authenticated
  using (user_id = auth.uid());

create policy bible_verse_saves_insert_own on public.bible_verse_saves
  for insert to authenticated
  with check (user_id = auth.uid());

create policy bible_verse_saves_update_own on public.bible_verse_saves
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy bible_verse_saves_delete_own on public.bible_verse_saves
  for delete to authenticated
  using (user_id = auth.uid());

revoke all on table public.bible_verse_saves from anon;
grant select, insert, update, delete on table public.bible_verse_saves to authenticated;

commit;
