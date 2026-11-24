begin;

-- RESTRICT also covers deletes cascading from a plan and concurrent completion.
alter table public.reading_completions drop constraint reading_completions_reading_id_fkey,
  add constraint reading_completions_reading_id_fkey foreign key (reading_id)
  references public.daily_readings(id) on delete restrict;

create function public.require_unused_draft_for_deletion() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.status <> 'draft' then
    raise exception 'Only unused draft readings may be deleted. Archive this reading instead.';
  end if;
  return old;
end $$;
create trigger protect_published_reading before delete on public.daily_readings
for each row execute function public.require_unused_draft_for_deletion();

drop policy reading_completions_read_for_managers on public.reading_completions;
create policy completion_detail_own_only on public.reading_completions
as restrictive for select to authenticated using (user_id = (select auth.uid()));

create function public.member_reading_count(target_member uuid) returns bigint
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.can_view_member_directory() then
    raise exception 'Access denied' using errcode='42501';
  end if;
  return (select count(*) from public.reading_completions where user_id=target_member);
end $$;
revoke all on function public.member_reading_count(uuid) from public, anon;
grant execute on function public.member_reading_count(uuid) to authenticated;
commit;
