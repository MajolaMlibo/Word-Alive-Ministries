begin;
alter table public.prayer_care_access add column may_view_directory boolean not null default false;
alter table public.member_access_history add column previous_directory_access boolean,
  add column new_directory_access boolean;

create or replace function public.can_view_member_directory() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.can_manage_members() or exists(
    select 1 from public.user_roles r left join public.prayer_care_access a using(user_id)
    where r.user_id=auth.uid() and (r.role='pastor' or (r.role='admin' and a.may_view_directory)))
$$;
drop function public.member_directory(text,public.app_role,uuid);
create function public.member_directory(search_term text default '', filter_role public.app_role default null,
  after_id uuid default null)
returns table(member_id uuid,display_name text,email text,member_role public.app_role,prayer_access boolean,directory_access boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.can_manage_members() then raise exception 'Access denied' using errcode='42501'; end if;
  return query select u.id,n.label,u.email::text,r.role,
    (r.role='pastor' or (r.role='admin' and coalesce(a.may_read,false))),
    (r.role='pastor' or (r.role='admin' and (u.id=auth.uid() or coalesce(a.may_view_directory,false))))
    from auth.users u join public.profiles p on p.id=u.id join public.user_roles r on r.user_id=u.id
    left join public.prayer_care_access a on a.user_id=u.id
    cross join lateral (select coalesce(nullif(trim(concat_ws(' ',p.name,p.surname)),''),'Member') as label) n
    where (after_id is null or u.id>after_id) and (filter_role is null or r.role=filter_role)
    and (strpos(lower(n.label),lower(trim(coalesce(search_term,''))))>0
      or strpos(lower(u.email),lower(trim(coalesce(search_term,''))))>0)
    order by u.id limit 26;
end $$;

create function public.save_member_access(target uuid, expected_role public.app_role, expected_prayer boolean,
  wanted_role public.app_role, wanted_prayer boolean, expected_directory boolean, wanted_directory boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare old_role public.app_role; old_access boolean; new_access boolean; old_directory boolean; new_directory boolean;
begin
  if not public.can_manage_members() then raise exception 'Access denied' using errcode='42501'; end if;
  if wanted_directory is null or expected_directory is null or wanted_role is null or wanted_prayer is null or wanted_role='editor' then
    raise exception 'Select Member, Admin, or Pastor';
  end if;
  if target=auth.uid() and wanted_role<>'admin' then raise exception 'The access manager must remain an admin'; end if;
  select role into strict old_role from public.user_roles where user_id=target for update;
  select old_role='pastor' or (old_role='admin' and exists(select 1 from public.prayer_care_access
    where user_id=target and may_read)) into old_access;
  new_access := wanted_role='pastor' or (wanted_role='admin' and wanted_prayer);
  old_directory := old_role='pastor' or (old_role='admin' and (target=auth.uid() or exists(
    select 1 from public.prayer_care_access where user_id=target and may_view_directory)));
  new_directory := wanted_role='pastor' or (wanted_role='admin' and (target=auth.uid() or wanted_directory));
  if old_directory is distinct from expected_directory or old_role is distinct from expected_role or old_access is distinct from expected_prayer then
    raise exception 'Access changed. Reload the member before saving.';
  end if;
  if old_role=wanted_role and old_access=new_access and old_directory=new_directory then return; end if;
  if old_role<>wanted_role then
    update public.user_roles set role=wanted_role where user_id=target;
  end if;
  if wanted_role='admin' then
    insert into public.prayer_care_access(user_id,may_read,may_view_directory) values(target,new_access,new_directory)
      on conflict(user_id) do update set may_read=excluded.may_read,may_view_directory=excluded.may_view_directory;
  end if;
  insert into public.member_access_history(actor_id,member_id,previous_role,new_role,previous_prayer_access,new_prayer_access,previous_directory_access,new_directory_access)
    values(auth.uid(),target,old_role,wanted_role,old_access,new_access,old_directory,new_directory);
end $$;

-- Older clients cannot change the directory flag on an existing admin.
create or replace function public.save_member_access(target uuid, expected_role public.app_role, expected_prayer boolean,
  wanted_role public.app_role, wanted_prayer boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare saved_role public.app_role; directory boolean;
begin
  if not public.can_manage_members() then raise exception 'Access denied' using errcode='42501'; end if;
  select role into strict saved_role from public.user_roles where user_id=target for update;
  directory := saved_role='pastor' or (saved_role='admin' and (target=auth.uid() or exists(
    select 1 from public.prayer_care_access where user_id=target and may_view_directory)));
  perform public.save_member_access(target,expected_role,expected_prayer,wanted_role,wanted_prayer,
    directory,saved_role='admin' and directory);
end $$;
revoke all on function public.member_directory(text,public.app_role,uuid),public.save_member_access(uuid,public.app_role,boolean,public.app_role,boolean,boolean,boolean) from public,anon;
grant execute on function public.member_directory(text,public.app_role,uuid),public.save_member_access(uuid,public.app_role,boolean,public.app_role,boolean,boolean,boolean) to authenticated;
commit;
