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
  set current_streak = v_streak
  where id = auth.uid()
    and current_streak is distinct from v_streak;

  return v_streak;
end;
$$;

revoke all on function public.refresh_daily_reading_streak() from public;
grant execute on function public.refresh_daily_reading_streak() to authenticated;
