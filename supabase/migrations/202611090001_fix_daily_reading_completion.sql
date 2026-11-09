-- Fix the production completion function used by the mobile application.
-- Column names are qualified to avoid clashes with the function's return fields.
-- Only the reading scheduled for the current South African date can be completed.

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
    where daily_reading.id = p_reading_id
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
