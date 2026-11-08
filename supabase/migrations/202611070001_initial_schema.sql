-- Word Alive Ministries production database baseline.
-- Apply only to a new Supabase project after reviewing it in the SQL editor.
-- This migration deliberately does not import prototype data.

begin;

create extension if not exists pgcrypto;

create type public.app_role as enum ('pastor', 'admin', 'editor', 'member');
create type public.content_status as enum ('draft', 'published', 'archived');
create type public.prayer_request_status as enum ('pending', 'reviewed', 'approved', 'closed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  surname text,
  location text,
  bio text,
  avatar_path text,
  current_streak integer not null default 0 check (current_streak >= 0),
  last_completed_at timestamptz,
  text_scale text not null default 'standard'
    check (text_scale in ('standard', 'large', 'extraLarge')),
  high_contrast boolean not null default false,
  notifications_enabled boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.user_roles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  role public.app_role not null default 'member',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.reading_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  plan_year integer not null check (plan_year between 2000 and 2100),
  description text,
  status public.content_status not null default 'draft',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (name, plan_year)
);

create table public.daily_readings (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.reading_plans(id) on delete cascade,
  day_number smallint not null check (day_number between 1 and 366),
  scheduled_date date not null,
  scripture_ref text not null check (length(trim(scripture_ref)) > 0),
  reflection text,
  audio_url text,
  status public.content_status not null default 'draft',
  published_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (plan_id, day_number),
  unique (plan_id, scheduled_date)
);

create table public.bible_studies (
  id uuid primary key default gen_random_uuid(),
  study_name text not null check (length(trim(study_name)) > 0),
  scripture_ref text,
  study_date date not null,
  start_time time,
  end_time time,
  description text,
  location_or_url text,
  status public.content_status not null default 'draft',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (end_time is null or start_time is null or end_time > start_time)
);

create table public.reading_completions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  reading_id uuid not null references public.daily_readings(id) on delete cascade,
  completed_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, reading_id)
);

create table public.prayer_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  description text not null check (length(trim(description)) between 1 and 4000),
  status public.prayer_request_status not null default 'pending',
  is_public boolean not null default false,
  moderated_at timestamptz,
  moderated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.prayer_request_prayers (
  prayer_request_id uuid not null references public.prayer_requests(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  prayed_at timestamptz not null default timezone('utc', now()),
  primary key (prayer_request_id, user_id)
);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(trim(title)) between 1 and 160),
  message text not null check (length(trim(message)) between 1 and 5000),
  status public.content_status not null default 'draft',
  published_at timestamptz,
  expires_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (expires_at is null or published_at is null or expires_at > published_at)
);

create table public.live_streams (
  id uuid primary key default gen_random_uuid(),
  platform text not null,
  stream_url text not null,
  is_live boolean not null default false,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  token text not null unique,
  platform text,
  last_seen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index daily_readings_published_date_idx
  on public.daily_readings (scheduled_date)
  where status = 'published';
create index bible_studies_published_date_idx
  on public.bible_studies (study_date, start_time)
  where status = 'published';
create index announcements_published_idx
  on public.announcements (published_at desc)
  where status = 'published';
create index reading_completions_user_completed_idx
  on public.reading_completions (user_id, completed_at desc);
create index prayer_requests_owner_idx
  on public.prayer_requests (user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute procedure public.set_updated_at();
create trigger user_roles_set_updated_at before update on public.user_roles
  for each row execute procedure public.set_updated_at();
create trigger reading_plans_set_updated_at before update on public.reading_plans
  for each row execute procedure public.set_updated_at();
create trigger daily_readings_set_updated_at before update on public.daily_readings
  for each row execute procedure public.set_updated_at();
create trigger bible_studies_set_updated_at before update on public.bible_studies
  for each row execute procedure public.set_updated_at();
create trigger prayer_requests_set_updated_at before update on public.prayer_requests
  for each row execute procedure public.set_updated_at();
create trigger announcements_set_updated_at before update on public.announcements
  for each row execute procedure public.set_updated_at();
create trigger live_streams_set_updated_at before update on public.live_streams
  for each row execute procedure public.set_updated_at();
create trigger push_tokens_set_updated_at before update on public.push_tokens
  for each row execute procedure public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    )
  );

  insert into public.user_roles (user_id, role)
  values (new.id, 'member');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_content_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role in ('pastor', 'admin', 'editor')
  );
$$;

create or replace function public.complete_daily_reading(p_reading_id uuid)
returns table(completed_at timestamptz, current_streak integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_completed_at timestamptz;
  v_streak integer := 0;
  v_today date := (timezone('Africa/Johannesburg', now()))::date;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to complete a reading.' using errcode = '28000';
  end if;

  if not exists (
    select 1
    from public.daily_readings
    where id = p_reading_id and status = 'published'
  ) then
    raise exception 'This reading is not available.' using errcode = 'P0002';
  end if;

  insert into public.reading_completions (user_id, reading_id)
  values (auth.uid(), p_reading_id)
  on conflict (user_id, reading_id) do nothing;

  select completed_at
  into v_completed_at
  from public.reading_completions
  where user_id = auth.uid() and reading_id = p_reading_id;

  with recursive completion_days(day) as (
    select v_today
    where exists (
      select 1
      from public.reading_completions
      where user_id = auth.uid()
        and (timezone('Africa/Johannesburg', completed_at))::date = v_today
    )
    union all
    select completion_days.day - 1
    from completion_days
    where exists (
      select 1
      from public.reading_completions
      where user_id = auth.uid()
        and (timezone('Africa/Johannesburg', completed_at))::date = completion_days.day - 1
    )
  )
  select count(*)::integer into v_streak from completion_days;

  update public.profiles
  set current_streak = v_streak,
      last_completed_at = v_completed_at
  where id = auth.uid();

  return query select v_completed_at, v_streak;
end;
$$;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.reading_plans enable row level security;
alter table public.daily_readings enable row level security;
alter table public.bible_studies enable row level security;
alter table public.reading_completions enable row level security;
alter table public.prayer_requests enable row level security;
alter table public.prayer_request_prayers enable row level security;
alter table public.announcements enable row level security;
alter table public.live_streams enable row level security;
alter table public.push_tokens enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_content_manager());
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy user_roles_select on public.user_roles
  for select to authenticated
  using (user_id = auth.uid() or public.is_content_manager());

create policy reading_plans_read on public.reading_plans
  for select to authenticated
  using (status = 'published' or public.is_content_manager());
create policy reading_plans_manage on public.reading_plans
  for all to authenticated
  using (public.is_content_manager())
  with check (public.is_content_manager());

create policy daily_readings_read on public.daily_readings
  for select to authenticated
  using (status = 'published' or public.is_content_manager());
create policy daily_readings_manage on public.daily_readings
  for all to authenticated
  using (public.is_content_manager())
  with check (public.is_content_manager());

create policy bible_studies_read on public.bible_studies
  for select to authenticated
  using (status = 'published' or public.is_content_manager());
create policy bible_studies_manage on public.bible_studies
  for all to authenticated
  using (public.is_content_manager())
  with check (public.is_content_manager());

create policy reading_completions_read_own on public.reading_completions
  for select to authenticated
  using (user_id = auth.uid());
create policy reading_completions_read_for_managers on public.reading_completions
  for select to authenticated
  using (public.is_content_manager());

create policy prayer_requests_read on public.prayer_requests
  for select to authenticated
  using (
    user_id = auth.uid()
    or (is_public = true and status = 'approved')
    or public.is_content_manager()
  );
create policy prayer_requests_insert_own on public.prayer_requests
  for insert to authenticated
  with check (user_id = auth.uid());
create policy prayer_requests_update_own on public.prayer_requests
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
create policy prayer_requests_delete_own on public.prayer_requests
  for delete to authenticated
  using (user_id = auth.uid());
create policy prayer_requests_manage on public.prayer_requests
  for all to authenticated
  using (public.is_content_manager())
  with check (public.is_content_manager());

create policy prayer_acknowledgements_read on public.prayer_request_prayers
  for select to authenticated
  using (user_id = auth.uid() or public.is_content_manager());
create policy prayer_acknowledgements_insert_own on public.prayer_request_prayers
  for insert to authenticated
  with check (user_id = auth.uid());
create policy prayer_acknowledgements_delete_own on public.prayer_request_prayers
  for delete to authenticated
  using (user_id = auth.uid());

create policy announcements_read on public.announcements
  for select to authenticated
  using (
    (
      status = 'published'
      and published_at <= timezone('utc', now())
      and (expires_at is null or expires_at > timezone('utc', now()))
    )
    or public.is_content_manager()
  );
create policy announcements_manage on public.announcements
  for all to authenticated
  using (public.is_content_manager())
  with check (public.is_content_manager());

create policy live_streams_read on public.live_streams
  for select to authenticated
  using (is_live = true or public.is_content_manager());
create policy live_streams_manage on public.live_streams
  for all to authenticated
  using (public.is_content_manager())
  with check (public.is_content_manager());

create policy push_tokens_manage_own on public.push_tokens
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke all on table public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant update (name, surname, location, bio, avatar_path, text_scale, high_contrast, notifications_enabled)
  on public.profiles to authenticated;

revoke all on table public.user_roles, public.reading_plans, public.daily_readings,
  public.bible_studies, public.reading_completions, public.prayer_requests,
  public.prayer_request_prayers, public.announcements, public.live_streams,
  public.push_tokens from anon;

grant select on public.user_roles, public.reading_plans, public.daily_readings,
  public.bible_studies, public.reading_completions, public.prayer_requests,
  public.prayer_request_prayers, public.announcements, public.live_streams,
  public.push_tokens to authenticated;
grant insert, update, delete on public.reading_plans,
  public.daily_readings, public.bible_studies, public.announcements,
  public.live_streams, public.push_tokens to authenticated;
grant insert, update (description, is_public), delete on public.prayer_requests to authenticated;
grant insert, delete on public.prayer_request_prayers to authenticated;

revoke all on function public.complete_daily_reading(uuid) from public;
grant execute on function public.complete_daily_reading(uuid) to authenticated;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', false)
on conflict (id) do nothing;

create policy avatars_manage_own on storage.objects
  for all to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

commit;
