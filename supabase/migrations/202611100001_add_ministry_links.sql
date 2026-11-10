begin;

create table public.ministry_links (
  id uuid primary key default gen_random_uuid(),
  label text not null unique check (length(trim(label)) between 1 and 80),
  url text not null check (url ~ '^https://'),
  sort_order integer not null default 0 check (sort_order between 0 and 9999),
  is_visible boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index ministry_links_visible_order_idx
  on public.ministry_links (sort_order, label)
  where is_visible = true;

create trigger ministry_links_set_updated_at
  before update on public.ministry_links
  for each row execute procedure public.set_updated_at();

alter table public.ministry_links enable row level security;

create policy ministry_links_read on public.ministry_links
  for select to authenticated
  using (is_visible or public.is_content_manager());

create policy ministry_links_manage on public.ministry_links
  for all to authenticated
  using (public.is_content_manager())
  with check (public.is_content_manager());

revoke all on table public.ministry_links from anon, authenticated;
grant select, insert, update, delete on table public.ministry_links to authenticated;

insert into public.ministry_links (label, url, sort_order, is_visible)
values
  ('TikTok', 'https://www.tiktok.com/@pastormathenjwa?_r=1&_t=ZS-9BG96vlB1u8', 10, true),
  ('Spotify', 'https://open.spotify.com/show/3pborwByNfP3Szr6trJVR7?si=a29449a7975a4b09', 20, true),
  ('WhatsApp Channel', 'https://whatsapp.com/channel/0029ValgVWVCXC3McM7OsF29', 30, true),
  ('YouTube', 'https://m.youtube.com/@PastorQMathenjwa', 40, true)
on conflict (label) do nothing;

commit;
