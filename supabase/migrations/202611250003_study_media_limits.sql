begin;
alter table public.study_media add column upload_pending boolean not null default false;
create policy hide_unfinished_study_images on public.study_media as restrictive
for select to authenticated using (not upload_pending or public.is_content_manager());
alter table public.study_media drop constraint study_media_study_id_fkey,
  add constraint study_media_study_id_fkey foreign key(study_id) references public.bible_studies(id) on delete restrict;
create function public.check_study_media_capacity() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_op='UPDATE' and new.study_id=old.study_id then return new; end if;
  perform 1 from public.bible_studies where id=new.study_id for update;
  if (select count(*) from public.study_media where study_id=new.study_id) >= 6 then
    raise exception 'A study can contain up to six images.';
  end if;
  return new;
end $$;
create trigger study_image_capacity before insert or update of study_id on public.study_media
for each row execute function public.check_study_media_capacity();
create function public.admin_study_page(term text, page_offset integer)
returns setof public.bible_studies language sql stable security invoker set search_path='' as $$
  select s.* from public.bible_studies s
  where public.is_content_manager() and strpos(lower(s.study_name),lower(coalesce(term,'')))>0
  order by (s.study_date < (now() at time zone 'Africa/Johannesburg')::date),
    case when s.study_date >= (now() at time zone 'Africa/Johannesburg')::date then s.study_date end asc,
    s.study_date desc,s.id
  limit 26 offset greatest(page_offset,0)
$$;
revoke all on function public.admin_study_page(text,integer) from public,anon;
grant execute on function public.admin_study_page(text,integer) to authenticated;
commit;
