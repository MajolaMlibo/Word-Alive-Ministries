begin;
drop function public.prayer_inbox(public.prayer_request_status,text,timestamptz,uuid);
create function public.prayer_inbox(bucket public.prayer_request_status, search_name text,
  before_time timestamptz default null, before_id uuid default null)
returns table(id uuid,user_id uuid,member_name text,description text,created_at timestamptz,status public.prayer_request_status)
language sql stable security definer set search_path = '' as $$
  select r.id,r.user_id,n.display_name,r.description,r.created_at,r.status
  from public.prayer_requests r join public.profiles p on p.id=r.user_id
  cross join lateral (select coalesce(nullif(trim(concat_ws(' ',p.name,p.surname)),''),'Member') as display_name) n
  where (select may_read from public.prayer_care_capabilities()) and (bucket is null or r.status=bucket)
    and strpos(lower(n.display_name),lower(trim(coalesce(search_name,''))))>0
    and (before_time is null or (r.created_at,r.id)<(before_time,before_id))
  order by r.created_at desc,r.id desc limit 26
$$;
revoke all on function public.prayer_inbox(public.prayer_request_status,text,timestamptz,uuid) from public,anon;
grant execute on function public.prayer_inbox(public.prayer_request_status,text,timestamptz,uuid) to authenticated;
commit;
