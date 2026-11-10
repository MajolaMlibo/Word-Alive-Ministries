begin;

create table if not exists public.home_encouragement (
  id boolean primary key default true check (id = true),
  message text not null check (length(trim(message)) between 1 and 1000),
  scripture_ref text not null check (length(trim(scripture_ref)) between 1 and 160),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists home_encouragement_set_updated_at on public.home_encouragement;
create trigger home_encouragement_set_updated_at
  before update on public.home_encouragement
  for each row execute procedure public.set_updated_at();

alter table public.home_encouragement enable row level security;

drop policy if exists home_encouragement_read on public.home_encouragement;
create policy home_encouragement_read on public.home_encouragement
  for select to authenticated
  using (true);

drop policy if exists home_encouragement_update on public.home_encouragement;
create policy home_encouragement_update on public.home_encouragement
  for update to authenticated
  using (public.is_content_manager())
  with check (public.is_content_manager());

revoke all on table public.home_encouragement from anon, authenticated;
grant select on table public.home_encouragement to authenticated;
grant update (message, scripture_ref) on table public.home_encouragement to authenticated;

insert into public.home_encouragement (id, message, scripture_ref)
values (
  true,
  '“Your word is a lamp to my feet and a light to my path.”',
  'Psalm 119:105'
)
on conflict (id) do nothing;

commit;
