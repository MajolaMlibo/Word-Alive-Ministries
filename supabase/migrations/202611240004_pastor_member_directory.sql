begin;
create function public.can_view_member_directory() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.can_manage_members() or exists(select 1 from public.user_roles
    where user_id=auth.uid() and role='pastor')
$$;
create function public.registered_member_count() returns bigint
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.can_view_member_directory() then raise exception 'Access denied' using errcode='42501'; end if;
  return (select count(*) from auth.users u join public.profiles p on p.id=u.id
    join public.user_roles r on r.user_id=u.id);
end $$;
create function public.member_directory_names(search_term text default '', filter_role public.app_role default null, after_id uuid default null)
returns table(member_id uuid,display_name text,member_role public.app_role)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.can_view_member_directory() then raise exception 'Access denied' using errcode='42501'; end if;
  return query select r.user_id,n.label,r.role from public.user_roles r join public.profiles p on p.id=r.user_id
    cross join lateral (select coalesce(nullif(trim(concat_ws(' ',p.name,p.surname)),''),'Member') as label) n
    where (after_id is null or r.user_id>after_id) and (filter_role is null or r.role=filter_role)
      and strpos(lower(n.label),lower(trim(coalesce(search_term,''))))>0
    order by r.user_id limit 26;
end $$;
revoke all on function public.can_view_member_directory(),public.registered_member_count(),
  public.member_directory_names(text,public.app_role,uuid) from public,anon;
grant execute on function public.can_view_member_directory(),public.registered_member_count(),
  public.member_directory_names(text,public.app_role,uuid) to authenticated;
commit;
