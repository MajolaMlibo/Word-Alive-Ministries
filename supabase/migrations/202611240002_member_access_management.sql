-- Requires 202611240001_private_prayer_care.sql. The UUID was verified by the project owner.
begin;
create function public.can_manage_members() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.user_roles where user_id=auth.uid()
    and user_id='838f92e1-815a-417d-b393-80356c84a72d' and role='admin')
$$;

create or replace function public.prayer_care_capabilities()
returns table (may_read boolean, may_delegate boolean)
language sql stable security definer set search_path = '' as $$
  select coalesce(bool_or(r.role='pastor' or (r.role='admin' and a.may_read)),false),
         public.can_manage_members()
  from public.user_roles r left join public.prayer_care_access a using(user_id)
  where r.user_id=auth.uid()
$$;

-- All new and old mobile clients must use the audited Members operation.
revoke execute on function public.prayer_care_admins(),public.set_prayer_care_access(uuid,boolean)
  from public,anon,authenticated;
-- The staff prayer query checks prayer-care access internally; return names only for matching requests.
alter function public.prayer_inbox(public.prayer_request_status,text,timestamptz,uuid) security definer;
create policy member_profile_directory_boundary on public.profiles as restrictive for select to authenticated
using(id=auth.uid() or (select public.can_manage_members()));
create policy member_roles_directory_boundary on public.user_roles as restrictive for select to authenticated
using(user_id=auth.uid() or (select public.can_manage_members()));

create table public.member_access_history (
  id bigint generated always as identity primary key,
  changed_at timestamptz not null default clock_timestamp(),
  actor_id uuid not null, member_id uuid not null,
  previous_role public.app_role not null, new_role public.app_role not null,
  previous_prayer_access boolean not null, new_prayer_access boolean not null
);
alter table public.member_access_history enable row level security;
revoke all on public.member_access_history from public,anon,authenticated;

create function public.member_directory(search_term text default '', filter_role public.app_role default null,
  after_id uuid default null)
returns table(member_id uuid,display_name text,email text,member_role public.app_role,prayer_access boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.can_manage_members() then raise exception 'Access denied' using errcode='42501'; end if;
  return query select u.id,n.label,u.email::text,r.role,
    (r.role='pastor' or (r.role='admin' and coalesce(a.may_read,false)))
    from auth.users u join public.profiles p on p.id=u.id join public.user_roles r on r.user_id=u.id
    left join public.prayer_care_access a on a.user_id=u.id
    cross join lateral (select coalesce(nullif(trim(concat_ws(' ',p.name,p.surname)),''),'Member') as label) n
    where (after_id is null or u.id>after_id) and (filter_role is null or r.role=filter_role)
    and (strpos(lower(n.label),lower(trim(coalesce(search_term,''))))>0
      or strpos(lower(u.email),lower(trim(coalesce(search_term,''))))>0)
    order by u.id limit 26;
end $$;

create function public.save_member_access(target uuid, expected_role public.app_role, expected_prayer boolean,
  wanted_role public.app_role, wanted_prayer boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare old_role public.app_role; old_access boolean; new_access boolean;
begin
  if not public.can_manage_members() then raise exception 'Access denied' using errcode='42501'; end if;
  if wanted_role is null or wanted_prayer is null or wanted_role='editor' then
    raise exception 'Select Member, Admin, or Pastor';
  end if;
  if target=auth.uid() and wanted_role<>'admin' then raise exception 'The access manager must remain an admin'; end if;
  select role into strict old_role from public.user_roles where user_id=target for update;
  select old_role='pastor' or (old_role='admin' and exists(select 1 from public.prayer_care_access
    where user_id=target and may_read)) into old_access;
  new_access := wanted_role='pastor' or (wanted_role='admin' and wanted_prayer);
  if old_role is distinct from expected_role or old_access is distinct from expected_prayer then
    raise exception 'Access changed. Reload the member before saving.';
  end if;
  if old_role=wanted_role and old_access=new_access then return; end if;
  if old_role<>wanted_role then
    update public.user_roles set role=wanted_role where user_id=target;
  end if;
  if wanted_role='admin' then
    insert into public.prayer_care_access(user_id,may_read) values(target,new_access)
      on conflict(user_id) do update set may_read=excluded.may_read;
  end if;
  insert into public.member_access_history(actor_id,member_id,previous_role,new_role,previous_prayer_access,new_prayer_access)
    values(auth.uid(),target,old_role,wanted_role,old_access,new_access);
end $$;
revoke all on function public.can_manage_members(),public.member_directory(text,public.app_role,uuid),
  public.save_member_access(uuid,public.app_role,boolean,public.app_role,boolean) from public,anon;
grant execute on function public.can_manage_members(),public.member_directory(text,public.app_role,uuid),
  public.save_member_access(uuid,public.app_role,boolean,public.app_role,boolean) to authenticated;
commit;
