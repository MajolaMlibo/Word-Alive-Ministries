-- Keep push delivery aligned with the notice visibility rules. This is
-- forward-only: it does not alter existing announcements or tokens.
begin;

create or replace function public.enforce_published_announcement_timestamp()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  if new.status = 'published' and new.published_at is null then
    raise exception 'Published announcements require a publication timestamp.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger validate_published_announcement_timestamp
before insert or update of status, published_at on public.announcements
for each row execute function public.enforce_published_announcement_timestamp();

create or replace function public.queue_ministry_alert()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  kind text;
  heading text;
  detail text;
  batch jsonb;
begin
  if tg_table_name = 'live_streams' then
    if not new.is_live then return new; end if;
    if tg_op = 'UPDATE' and old.is_live then return new; end if;
    kind := 'live';
    heading := new.platform || ' is live';
    detail := 'Open Word Alive Ministries to watch.';
  else
    if not new.send_push then return new; end if;
    new.send_push := false;
    if new.status <> 'published'
      or new.published_at is null
      or new.published_at > now()
      or (new.expires_at is not null and new.expires_at <= now()) then return new; end if;
    if tg_op = 'UPDATE' and old.status = 'published' then return new; end if;
    kind := 'notice';
    heading := 'Church announcement';
    detail := new.title;
  end if;
  for batch in
    select jsonb_agg(jsonb_build_object('to', token, 'title', heading, 'body', detail,
      'channelId','ministry','sound','default','ttl',3600,
      'data',jsonb_build_object('kind',kind,'contentId',new.id)))
    from (select token, row_number() over (order by id) as n
          from public.push_tokens where ministry_alerts) as devices
    group by (n - 1) / 100
  loop
    perform net.http_post(url := 'https://exp.host/--/api/v2/push/send', body := batch);
  end loop;
  return new;
end $$;
revoke all on function public.queue_ministry_alert() from public, anon, authenticated;

commit;
