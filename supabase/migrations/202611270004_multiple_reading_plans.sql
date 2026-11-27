-- Support concurrent ministry reading plans without exposing an optional plan's
-- daily readings before a member joins it. Required plans remain visible to
-- everyone; optional plans remain discoverable but their readings are private
-- to active members. A completion from either plan still counts once per South
-- African calendar day toward the ministry-wide streak.
begin;

create type public.reading_plan_enrollment_mode as enum ('required', 'optional');
create type public.reading_plan_membership_status as enum ('active', 'left');

alter table public.reading_plans
  add column enrollment_mode public.reading_plan_enrollment_mode not null default 'required';

-- Existing annual plans intentionally become required, so no member loses
-- access when this migration is applied.
create table public.reading_plan_memberships (
  plan_id uuid not null references public.reading_plans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status public.reading_plan_membership_status not null default 'active',
  joined_at timestamptz not null default timezone('utc', now()),
  left_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (plan_id, user_id),
  check (
    (status = 'active' and left_at is null)
    or (status = 'left' and left_at is not null)
  )
);

create trigger reading_plan_memberships_set_updated_at
  before update on public.reading_plan_memberships
  for each row execute procedure public.set_updated_at();

create index reading_plan_memberships_member_active_idx
  on public.reading_plan_memberships (user_id, status, plan_id);

-- The old index is deliberately removed only after the data model has been
-- changed to permit different plans on the same date.
drop index if exists public.one_published_reading_per_date;

-- A published plan's choice must not be silently changed beneath members.
-- Administrators can set it while the plan is a draft, or deliberately archive
-- it before making a later structural change.
create function public.prevent_published_plan_enrollment_mode_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'published'
    and new.enrollment_mode is distinct from old.enrollment_mode then
    raise exception 'Archive a published reading plan before changing its enrolment mode.';
  end if;
  return new;
end;
$$;

create trigger protect_published_plan_enrollment_mode
  before update of enrollment_mode on public.reading_plans
  for each row execute function public.prevent_published_plan_enrollment_mode_change();

alter table public.reading_plan_memberships enable row level security;

create policy reading_plan_memberships_read_own_or_manager
  on public.reading_plan_memberships for select to authenticated
  using (user_id = (select auth.uid()) or public.is_content_manager());

-- Direct writes are intentionally not granted. The two narrowly scoped RPCs
-- below prevent a member from joining, leaving, or changing another member's
-- plan membership.
revoke all on table public.reading_plan_memberships from anon, authenticated;
grant select on public.reading_plan_memberships to authenticated;

create or replace function public.join_reading_plan(target_plan_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mode public.reading_plan_enrollment_mode;
  v_status public.content_status;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to join a reading plan.' using errcode = '28000';
  end if;

  select enrollment_mode, status
  into v_mode, v_status
  from public.reading_plans
  where id = target_plan_id
  for share;

  if not found then
    raise exception 'This reading plan does not exist.' using errcode = 'P0002';
  end if;
  if v_status <> 'published' then
    raise exception 'Only published reading plans can be joined.' using errcode = 'P0002';
  end if;
  if v_mode <> 'optional' then
    raise exception 'This plan is included for every member and does not need joining.' using errcode = '23514';
  end if;

  insert into public.reading_plan_memberships (plan_id, user_id, status, joined_at, left_at)
  values (target_plan_id, auth.uid(), 'active', timezone('utc', now()), null)
  on conflict (plan_id, user_id) do update
  set status = 'active',
      joined_at = timezone('utc', now()),
      left_at = null;
end;
$$;

create or replace function public.leave_reading_plan(target_plan_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_mode public.reading_plan_enrollment_mode;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to leave a reading plan.' using errcode = '28000';
  end if;

  select enrollment_mode
  into v_mode
  from public.reading_plans
  where id = target_plan_id
  for share;

  if not found then
    raise exception 'This reading plan does not exist.' using errcode = 'P0002';
  end if;
  if v_mode <> 'optional' then
    raise exception 'Required ministry plans cannot be left.' using errcode = '23514';
  end if;

  update public.reading_plan_memberships
  set status = 'left', left_at = timezone('utc', now())
  where plan_id = target_plan_id
    and user_id = auth.uid()
    and status = 'active';
end;
$$;

revoke all on function public.join_reading_plan(uuid) from public, anon;
revoke all on function public.leave_reading_plan(uuid) from public, anon;
grant execute on function public.join_reading_plan(uuid) to authenticated;
grant execute on function public.leave_reading_plan(uuid) to authenticated;

-- Published optional plan metadata stays discoverable through reading_plans,
-- but a member can only select its daily readings while actively enrolled.
drop policy if exists daily_readings_read on public.daily_readings;
drop policy if exists daily_reading_parent_visibility on public.daily_readings;
create policy daily_readings_read_for_visible_plan
  on public.daily_readings for select to authenticated
  using (
    public.is_content_manager()
    or (
      status = 'published'
      and exists (
        select 1
        from public.reading_plans as plan
        where plan.id = daily_readings.plan_id
          and plan.status = 'published'
          and (
            plan.enrollment_mode = 'required'
            or exists (
              select 1
              from public.reading_plan_memberships as membership
              where membership.plan_id = plan.id
                and membership.user_id = (select auth.uid())
                and membership.status = 'active'
            )
          )
      )
    )
  );

create or replace function public.complete_daily_reading(p_reading_id uuid)
returns table(completed_at timestamptz, current_streak integer)
language plpgsql
security definer
set search_path = ''
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
    from public.daily_readings as daily_reading
    join public.reading_plans as plan on plan.id = daily_reading.plan_id
    where daily_reading.id = p_reading_id
      and daily_reading.status = 'published'
      and daily_reading.scheduled_date = v_today
      and plan.status = 'published'
      and (
        plan.enrollment_mode = 'required'
        or exists (
          select 1
          from public.reading_plan_memberships as membership
          where membership.plan_id = plan.id
            and membership.user_id = auth.uid()
            and membership.status = 'active'
        )
      )
  ) then
    raise exception 'This reading is not available.' using errcode = 'P0002';
  end if;

  insert into public.reading_completions (user_id, reading_id)
  values (auth.uid(), p_reading_id)
  on conflict (user_id, reading_id) do nothing;

  select completion.completed_at
  into v_completed_at
  from public.reading_completions as completion
  where completion.user_id = auth.uid()
    and completion.reading_id = p_reading_id;

  -- The recursive set is deliberately date-based rather than reading-based:
  -- completing two plans on one day still produces one ministry-wide streak day.
  with recursive completion_days(day) as (
    select v_today
    where exists (
      select 1
      from public.reading_completions as completion
      where completion.user_id = auth.uid()
        and (timezone('Africa/Johannesburg', completion.completed_at))::date = v_today
    )
    union all
    select completion_days.day - 1
    from completion_days
    where exists (
      select 1
      from public.reading_completions as completion
      where completion.user_id = auth.uid()
        and (timezone('Africa/Johannesburg', completion.completed_at))::date = completion_days.day - 1
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

revoke all on function public.complete_daily_reading(uuid) from public, anon;
grant execute on function public.complete_daily_reading(uuid) to authenticated;

commit;
