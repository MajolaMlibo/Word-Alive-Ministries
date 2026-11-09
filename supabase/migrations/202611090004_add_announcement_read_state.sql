begin;

create table if not exists public.announcement_reads (
  announcement_id uuid not null references public.announcements(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default timezone('utc', now()),
  primary key (announcement_id, user_id)
);

create index if not exists announcement_reads_user_read_at_idx
  on public.announcement_reads (user_id, read_at asc);

alter table public.announcement_reads enable row level security;

drop policy if exists announcement_reads_select_own on public.announcement_reads;
create policy announcement_reads_select_own on public.announcement_reads
  for select to authenticated
  using (user_id = auth.uid());

drop policy if exists announcement_reads_insert_own on public.announcement_reads;
create policy announcement_reads_insert_own on public.announcement_reads
  for insert to authenticated
  with check (user_id = auth.uid());

revoke all on table public.announcement_reads from anon, authenticated;
grant select, insert on table public.announcement_reads to authenticated;

commit;
