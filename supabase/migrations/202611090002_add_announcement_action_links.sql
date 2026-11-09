begin;

alter table public.announcements
  add column if not exists action_label text,
  add column if not exists action_url text;

alter table public.announcements
  drop constraint if exists announcements_action_link_check;

alter table public.announcements
  add constraint announcements_action_link_check
  check (
    (action_label is null and action_url is null)
    or (
      length(trim(coalesce(action_label, ''))) between 1 and 80
      and action_url ~ '^https://[^[:space:]]+$'
    )
  );

comment on column public.announcements.action_label is
  'Optional accessible label for the announcement action button.';
comment on column public.announcements.action_url is
  'Optional HTTPS link opened when a member selects the announcement action button.';

commit;
