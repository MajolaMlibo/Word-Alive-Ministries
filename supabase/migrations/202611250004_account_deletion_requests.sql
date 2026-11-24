begin;
-- Requests are private. Submitting one never deletes or disables an account.
create table public.account_deletion_requests (
  user_id uuid primary key references auth.users(id) on delete cascade,
  requested_at timestamptz not null default now()
);
alter table public.account_deletion_requests enable row level security;
revoke all on public.account_deletion_requests from public,anon,authenticated;
grant select, delete on public.account_deletion_requests to authenticated;
create policy deletion_request_own on public.account_deletion_requests
for select to authenticated using(user_id=(select auth.uid()));
create policy withdraw_deletion_request on public.account_deletion_requests
for delete to authenticated using(user_id=(select auth.uid()));

create function public.request_account_deletion() returns void
language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null then raise exception 'Sign in required' using errcode='42501'; end if;
  insert into public.account_deletion_requests(user_id) values(auth.uid())
  on conflict(user_id) do nothing;
end $$;
create function public.pending_account_deletions(after_user uuid default null)
returns table(member_id uuid,email text,requested_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
  if not public.can_manage_members() then raise exception 'Access denied' using errcode='42501'; end if;
  return query select u.id,u.email::text,r.requested_at
    from public.account_deletion_requests r join auth.users u on u.id=r.user_id
    where after_user is null or u.id>after_user order by u.id limit 26;
end $$;
revoke all on function public.request_account_deletion(),public.pending_account_deletions(uuid) from public,anon;
grant execute on function public.request_account_deletion(),public.pending_account_deletions(uuid) to authenticated;
commit;
