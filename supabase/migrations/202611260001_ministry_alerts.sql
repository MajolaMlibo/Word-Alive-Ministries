-- Remote pushes are opt-in per installation. Existing push_tokens do not opt anyone in.
create extension if not exists pg_net;
alter table public.push_tokens add column ministry_alerts boolean not null default false;
alter table public.announcements add column send_push boolean not null default false;

create function public.queue_ministry_alert() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  kind text;
  heading text;
  detail text;
  batch jsonb;
begin
  if tg_table_name = 'live_streams' then
    if not new.is_live then return new; end if;
    if tg_op = 'UPDATE' then
      if old.is_live then return new; end if;
    end if;
    kind := 'live';
    heading := new.platform || ' is live';
    detail := 'Open Word Alive Ministries to watch.';
  else
    if not new.send_push then return new; end if;
    new.send_push := false;
    if new.status <> 'published'
      or new.published_at > now() or new.expires_at <= now() then return new; end if;
    if tg_op = 'UPDATE' then
      if old.status = 'published' then return new; end if;
    end if;
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
create trigger notify_live after insert or update on public.live_streams
for each row execute function public.queue_ministry_alert();
create trigger notify_notice before insert or update on public.announcements
for each row execute function public.queue_ministry_alert();
