-- Apply once. All legacy public requests become private in the same transaction.
begin;

create table public.prayer_care_access (
  user_id uuid primary key references public.user_roles(user_id) on delete cascade,
  may_read boolean not null default false,
  may_delegate boolean not null default false
);
alter table public.prayer_care_access enable row level security;
revoke all on public.prayer_care_access from public, anon, authenticated;

create function public.prayer_care_capabilities()
returns table (may_read boolean, may_delegate boolean)
language sql stable security definer set search_path = '' as $$
  select coalesce(bool_or(r.role = 'pastor' or (r.role = 'admin' and a.may_read)), false),
         coalesce(bool_or(r.role = 'pastor' or (r.role = 'admin' and a.may_delegate)), false)
  from public.user_roles r left join public.prayer_care_access a using (user_id)
  where r.user_id = auth.uid()
$$;

create function public.clear_prayer_access_on_role_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.role is distinct from new.role then
    delete from public.prayer_care_access where user_id = new.user_id;
  end if;
  return new;
end $$;
create trigger clear_prayer_access after update of role on public.user_roles
for each row execute function public.clear_prayer_access_on_role_change();

create function public.prayer_care_admins()
returns table (admin_id uuid, display_name text, selected boolean)
language sql stable security definer set search_path = '' as $$
  select r.user_id, coalesce(nullif(trim(concat_ws(' ',p.name,p.surname)),''),'Administrator'),
         coalesce(a.may_read,false)
  from public.user_roles r join public.profiles p on p.id=r.user_id
  left join public.prayer_care_access a using (user_id)
  where r.role='admin' and (select may_delegate from public.prayer_care_capabilities())
  order by 2,1
$$;

create function public.set_prayer_care_access(target uuid, enabled boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (select may_delegate from public.prayer_care_capabilities()) then
    raise exception 'Access denied' using errcode='42501';
  end if;
  perform 1 from public.user_roles where user_id=target and role='admin' for update;
  if not found then raise exception 'Select a current administrator'; end if;
  insert into public.prayer_care_access(user_id,may_read) values(target,enabled)
    on conflict(user_id) do update set may_read=excluded.may_read;
end $$;

-- Replace any pre-existing permissive policies, including manual prototype-era changes.
do $$
declare pol record;
begin
  for pol in select policyname,tablename from pg_policies where schemaname='public'
    and tablename in ('prayer_requests','prayer_request_prayers')
  loop
    execute format('drop policy %I on public.%I',pol.policyname,pol.tablename);
  end loop;
end $$;
revoke all on public.prayer_request_prayers from public, anon, authenticated;
update public.prayer_requests set is_public=false, status=case
  when status in ('approved','reviewed') then 'pending'::public.prayer_request_status else status end
where is_public or status in ('approved','reviewed');
alter table public.prayer_requests add constraint prayers_always_private check (not is_public and status <> 'approved');
revoke all on public.prayer_requests from public, anon, authenticated;
revoke all (id,user_id,description,status,is_public,moderated_at,moderated_by,created_at,updated_at)
  on public.prayer_requests from public, anon, authenticated;
grant select, delete, insert(user_id,description,is_public), update(description,is_public)
  on public.prayer_requests to authenticated;
create policy prayer_read on public.prayer_requests for select to authenticated
using (user_id=auth.uid() or (select may_read from public.prayer_care_capabilities()));
create policy prayer_create on public.prayer_requests for insert to authenticated
with check(user_id=auth.uid() and status='pending' and not is_public);
create policy prayer_edit on public.prayer_requests for update to authenticated
using(user_id=auth.uid() and status='pending') with check(user_id=auth.uid() and status='pending');
create policy prayer_delete on public.prayer_requests for delete to authenticated
using((user_id=auth.uid() and status='pending') or (select may_read from public.prayer_care_capabilities()));

create table public.prayer_replies (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.prayer_requests(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null,
  body text not null check(length(trim(body)) between 1 and 4000),
  created_at timestamptz not null default clock_timestamp()
);
create index prayer_reply_thread on public.prayer_replies(request_id,created_at,id);
create index prayer_inbox_status_date on public.prayer_requests(status,created_at desc,id desc);
alter table public.prayer_replies enable row level security;
revoke all on public.prayer_replies from public, anon, authenticated;
grant select on public.prayer_replies to authenticated;
create policy prayer_reply_read on public.prayer_replies for select to authenticated
using(exists(select 1 from public.prayer_requests r where r.id=request_id));

-- Serialize replies and closure. A retry of the same immediately preceding reply is harmless.
create function public.send_prayer_reply(target uuid, message text, previous_reply uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare last_reply public.prayer_replies; current_status public.prayer_request_status;
begin
  if not (select may_read from public.prayer_care_capabilities()) then
    raise exception 'Access denied' using errcode='42501';
  end if;
  select status into current_status from public.prayer_requests where id=target for update;
  if not found or current_status='closed' then raise exception 'Request unavailable or closed'; end if;
  select * into last_reply from public.prayer_replies where request_id=target order by created_at desc,id desc limit 1;
  if last_reply.id is distinct from previous_reply then
    if last_reply.author_id=auth.uid() and last_reply.body=trim(message) then return; end if;
    raise exception 'The conversation changed. Refresh before sending.';
  end if;
  insert into public.prayer_replies(request_id,author_id,author_name,body)
    select target,p.id,coalesce(nullif(trim(concat_ws(' ',p.name,p.surname)),''),'Prayer care team'),trim(message)
    from public.profiles p where p.id=auth.uid();
  update public.prayer_requests set status='reviewed',moderated_by=auth.uid(),moderated_at=now() where id=target;
end $$;
create function public.close_prayer_request(target uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not (select may_read from public.prayer_care_capabilities()) then
    raise exception 'Access denied' using errcode='42501';
  end if;
  update public.prayer_requests set status='closed',moderated_by=auth.uid(),moderated_at=now()
    where id=target and status='reviewed';
  if not found then raise exception 'Only a replied request can be closed'; end if;
end $$;

create function public.prayer_inbox(bucket public.prayer_request_status, search_name text,
  before_time timestamptz default null, before_id uuid default null)
returns table(id uuid,user_id uuid,member_name text,description text,created_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select r.id,r.user_id,n.display_name,r.description,r.created_at
  from public.prayer_requests r join public.profiles p on p.id=r.user_id
  cross join lateral (select coalesce(nullif(trim(concat_ws(' ',p.name,p.surname)),''),'Member') as display_name) n
  where (select may_read from public.prayer_care_capabilities()) and r.status=bucket
    and strpos(lower(n.display_name),lower(trim(coalesce(search_name,''))))>0
    and (before_time is null or (r.created_at,r.id)<(before_time,before_id))
  order by r.created_at desc,r.id desc limit 26
$$;

revoke all on function public.clear_prayer_access_on_role_change() from public, anon, authenticated;
revoke all on function public.prayer_care_capabilities(), public.prayer_care_admins(),
  public.set_prayer_care_access(uuid,boolean), public.send_prayer_reply(uuid,text,uuid),
  public.close_prayer_request(uuid), public.prayer_inbox(public.prayer_request_status,text,timestamptz,uuid)
  from public, anon;
grant execute on function public.prayer_care_capabilities(), public.prayer_care_admins(),
  public.set_prayer_care_access(uuid,boolean), public.send_prayer_reply(uuid,text,uuid),
  public.close_prayer_request(uuid), public.prayer_inbox(public.prayer_request_status,text,timestamptz,uuid)
  to authenticated;
commit;
