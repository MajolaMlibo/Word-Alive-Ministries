begin;

create table public.study_media (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.bible_studies(id) on delete cascade,
  storage_path text not null unique check (length(trim(storage_path)) > 0),
  sort_order integer not null default 0 check (sort_order >= 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now())
);

create index study_media_study_sort_idx
  on public.study_media (study_id, sort_order, created_at);

alter table public.study_media enable row level security;

create policy study_media_read on public.study_media
  for select to authenticated
  using (
    exists (
      select 1
      from public.bible_studies
      where bible_studies.id = study_media.study_id
        and (bible_studies.status = 'published' or public.is_content_manager())
    )
  );

create policy study_media_manage on public.study_media
  for all to authenticated
  using (public.is_content_manager())
  with check (public.is_content_manager());

revoke all on table public.study_media from anon;
grant select, insert, update, delete on table public.study_media to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'study-media',
  'study-media',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy study_media_storage_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'study-media'
    and exists (
      select 1
      from public.study_media
      join public.bible_studies on bible_studies.id = study_media.study_id
      where study_media.storage_path = storage.objects.name
        and (bible_studies.status = 'published' or public.is_content_manager())
    )
  );

create policy study_media_storage_manage on storage.objects
  for all to authenticated
  using (bucket_id = 'study-media' and public.is_content_manager())
  with check (bucket_id = 'study-media' and public.is_content_manager());

commit;
