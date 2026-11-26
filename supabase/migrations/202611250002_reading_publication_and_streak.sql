begin;
-- Abort the migration on a pre-existing collision; never choose a winner implicitly.
create unique index one_published_reading_per_date on public.daily_readings(scheduled_date)
where status='published';

create function public.check_reading_plan_publication() returns trigger
language plpgsql set search_path='' as $$
begin
  if new.status='published' and not exists (
    select 1 from public.reading_plans where id=new.plan_id and status='published' for share
  ) then raise exception 'Publish the reading plan before publishing its daily readings.'; end if;
  return new;
end $$;
create trigger validate_reading_publication before insert or update of status,plan_id
on public.daily_readings for each row execute function public.check_reading_plan_publication();

create policy daily_reading_parent_visibility on public.daily_readings as restrictive
for select to authenticated using (public.is_content_manager() or exists (
  select 1 from public.reading_plans p where p.id=plan_id and p.status='published'
));

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
    from public.daily_readings as daily_reading
    join public.reading_plans plan on plan.id = daily_reading.plan_id
    where plan.status = 'published' and daily_reading.id = p_reading_id
      and daily_reading.status = 'published'
      and daily_reading.scheduled_date = v_today
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
  select count(*)::integer
  into v_streak
  from completion_days;

  update public.profiles
  set current_streak = v_streak,
      last_completed_at = v_completed_at
  where id = auth.uid();

  return query select v_completed_at, v_streak;
end;
$$;

grant execute on function public.complete_daily_reading(uuid) to authenticated;

-- Refresh the signed-in member's stored streak when the app loads.
-- A streak only includes consecutive South African calendar days ending today.

create or replace function public.refresh_daily_reading_streak()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_streak integer := 0;
  v_today date := (timezone('Africa/Johannesburg', now()))::date;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to refresh a reading streak.' using errcode = '28000';
  end if;

  with recursive completion_days(day) as (
    select max((timezone('Africa/Johannesburg', completed_at))::date)
    from public.reading_completions
    where user_id = auth.uid()
      and completed_at >= ((v_today - 1)::timestamp at time zone 'Africa/Johannesburg')
      and completed_at < ((v_today + 1)::timestamp at time zone 'Africa/Johannesburg')
    having count(*) > 0
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
  select count(*)::integer
  into v_streak
  from completion_days;

  update public.profiles
  set current_streak = v_streak
  where id = auth.uid()
    and current_streak is distinct from v_streak;

  return v_streak;
end;
$$;

revoke all on function public.refresh_daily_reading_streak() from public;
grant execute on function public.refresh_daily_reading_streak() to authenticated;

commit;
