begin;

create or replace function public.is_study_schedule_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role in ('pastor', 'admin')
  );
$$;

-- Members can access published studies scheduled for today or earlier.
-- Only Pastor and Administrator roles can also access future studies.
drop policy if exists bible_studies_read on public.bible_studies;
drop policy if exists bible_studies_manage on public.bible_studies;

create policy bible_studies_read on public.bible_studies
  for select to authenticated
  using (
    public.is_study_schedule_manager()
    or (
      status = 'published'
      and study_date <= timezone('Africa/Johannesburg', now())::date
    )
  );

-- The original broad FOR ALL policy included SELECT, which would have exposed
-- future studies to the unused editor role. Keep content-management writes but
-- make the separate read policy above the only SELECT policy.
create policy bible_studies_insert_manage on public.bible_studies
  for insert to authenticated
  with check (public.is_content_manager());

create policy bible_studies_update_manage on public.bible_studies
  for update to authenticated
  using (public.is_content_manager())
  with check (public.is_content_manager());

create policy bible_studies_delete_manage on public.bible_studies
  for delete to authenticated
  using (public.is_content_manager());

-- Apply the same rule to media records and their private storage objects.
-- Without these replacements, a member could retrieve future-study images
-- directly even though the mobile screen hid the Upcoming section.
drop policy if exists study_media_read on public.study_media;
drop policy if exists study_media_manage on public.study_media;

create policy study_media_read on public.study_media
  for select to authenticated
  using (
    exists (
      select 1
      from public.bible_studies
      where bible_studies.id = study_media.study_id
        and (
          public.is_study_schedule_manager()
          or (
            bible_studies.status = 'published'
            and bible_studies.study_date <= timezone('Africa/Johannesburg', now())::date
          )
        )
    )
  );

create policy study_media_insert_manage on public.study_media
  for insert to authenticated
  with check (public.is_content_manager());

create policy study_media_update_manage on public.study_media
  for update to authenticated
  using (public.is_content_manager())
  with check (public.is_content_manager());

create policy study_media_delete_manage on public.study_media
  for delete to authenticated
  using (public.is_content_manager());

drop policy if exists study_media_storage_read on storage.objects;
drop policy if exists study_media_storage_manage on storage.objects;

create policy study_media_storage_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'study-media'
    and exists (
      select 1
      from public.study_media
      join public.bible_studies on bible_studies.id = study_media.study_id
      where study_media.storage_path = storage.objects.name
        and (
          public.is_study_schedule_manager()
          or (
            bible_studies.status = 'published'
            and bible_studies.study_date <= timezone('Africa/Johannesburg', now())::date
          )
        )
    )
  );

create policy study_media_storage_insert_manage on storage.objects
  for insert to authenticated
  with check (bucket_id = 'study-media' and public.is_content_manager());

create policy study_media_storage_update_manage on storage.objects
  for update to authenticated
  using (bucket_id = 'study-media' and public.is_content_manager())
  with check (bucket_id = 'study-media' and public.is_content_manager());

create policy study_media_storage_delete_manage on storage.objects
  for delete to authenticated
  using (bucket_id = 'study-media' and public.is_content_manager());

commit;
