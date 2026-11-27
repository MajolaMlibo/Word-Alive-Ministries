-- Named, text-only discussion for published studies. Comments are visible as
-- soon as they are submitted; pastors and administrators can hide them later.
-- All member writes go through RPCs so client-side checks cannot be bypassed.
begin;

create type public.study_comment_status as enum ('visible', 'hidden');

create table public.study_comments (
  id uuid primary key default gen_random_uuid(),
  study_id uuid not null references public.bible_studies(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text not null check (length(btrim(author_name)) between 1 and 120),
  body text not null check (length(btrim(body)) between 1 and 1200),
  status public.study_comment_status not null default 'visible',
  moderated_by uuid references public.profiles(id) on delete set null,
  moderated_at timestamptz,
  created_at timestamptz not null default clock_timestamp()
);

create index study_comments_visible_thread_cursor_idx
  on public.study_comments (study_id, created_at desc, id desc)
  where status = 'visible';
create index study_comments_author_created_idx
  on public.study_comments (author_id, created_at desc, id desc);
create index study_comments_moderation_cursor_idx
  on public.study_comments (status, created_at desc, id desc);

alter table public.study_comments enable row level security;
revoke all on public.study_comments from public, anon, authenticated;
grant select on public.study_comments to authenticated;

create function public.is_study_comment_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = auth.uid()
      and role in ('pastor', 'admin')
  )
$$;

create policy study_comments_read on public.study_comments
  for select to authenticated
  using (
    public.is_study_comment_moderator()
    or (
      author_id = auth.uid()
      and exists (
        select 1 from public.bible_studies study
        where study.id = study_id and study.status = 'published'
      )
    )
    or (
      status = 'visible'
      and exists (
        select 1 from public.bible_studies study
        where study.id = study_id and study.status = 'published'
      )
    )
  );

create function public.submit_study_comment(target_study uuid, message text)
returns table(
  id uuid,
  study_id uuid,
  author_name text,
  body text,
  created_at timestamptz,
  is_hidden boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  cleaned text;
  compact text;
  saved public.study_comments;
begin
  if auth.uid() is null then
    raise exception 'You must be signed in to comment.' using errcode = '28000';
  end if;

  if coalesce(message, '') ~ '[[:cntrl:]]' then
    raise exception 'Comments cannot contain control characters.' using errcode = '22021';
  end if;

  cleaned := btrim(regexp_replace(coalesce(message, ''), '[[:space:]]+', ' ', 'g'));
  if char_length(cleaned) < 1 or char_length(cleaned) > 1200 then
    raise exception 'Comments must contain between 1 and 1200 characters.' using errcode = '22023';
  end if;
  if cleaned ~* '(https?://|www\.)' then
    raise exception 'Links are not allowed in study comments.' using errcode = '22023';
  end if;

  -- This intentionally catches only clear English profanity, including simple
  -- punctuation-separated variants. It supplements, but cannot replace, staff
  -- moderation of context or pastoral suitability.
  compact := regexp_replace(lower(cleaned), '[^a-z]+', '', 'g');
  if compact ~ '(fuck|shit|bitch|bastard|asshole|dick|cunt|pussy|whore|slut|nigg(er|a))' then
    raise exception 'Please revise the language in this comment.' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.bible_studies study
    where study.id = target_study
      and study.status = 'published'
      and study.study_date <= (timezone('Africa/Johannesburg', now()))::date
  ) then
    raise exception 'Comments are available only for published current or past studies.' using errcode = 'P0002';
  end if;

  -- A retry after a lost response returns the recent matching comment rather
  -- than creating a duplicate. It runs before the rate limit intentionally.
  select existing_comment.* into saved
  from public.study_comments existing_comment
  where existing_comment.study_id = target_study
    and existing_comment.author_id = auth.uid()
    and existing_comment.body = cleaned
    and existing_comment.created_at > clock_timestamp() - interval '2 minutes'
  order by existing_comment.created_at desc, existing_comment.id desc
  limit 1;
  if found then
    return query select saved.id, saved.study_id, saved.author_name, saved.body,
      saved.created_at, saved.status = 'hidden';
    return;
  end if;

  if (
    select count(*)
    from public.study_comments recent_comment
    where recent_comment.author_id = auth.uid()
      and recent_comment.created_at > clock_timestamp() - interval '10 minutes'
  ) >= 5 then
    raise exception 'Please wait before posting another comment.' using errcode = '42901';
  end if;

  insert into public.study_comments (study_id, author_id, author_name, body)
  select target_study, profile.id,
    coalesce(nullif(btrim(concat_ws(' ', profile.name, profile.surname)), ''), 'Member'),
    cleaned
  from public.profiles profile
  where profile.id = auth.uid()
  returning * into saved;

  if not found then
    raise exception 'Your profile is unavailable. Please sign in again.' using errcode = 'P0002';
  end if;

  return query select saved.id, saved.study_id, saved.author_name, saved.body,
    saved.created_at, false;
end;
$$;

create function public.study_comment_page(
  target_study uuid,
  before_time timestamptz default null,
  before_id uuid default null
)
returns table(
  id uuid,
  study_id uuid,
  author_name text,
  body text,
  created_at timestamptz,
  is_own boolean,
  is_hidden boolean
)
language sql
stable
security invoker
set search_path = ''
as $$
  select comment.id, comment.study_id, comment.author_name, comment.body,
    comment.created_at, comment.author_id = auth.uid(), comment.status = 'hidden'
  from public.study_comments comment
  where comment.study_id = target_study
    and (
      before_time is null
      or (before_id is not null and (comment.created_at, comment.id) < (before_time, before_id))
    )
  order by comment.created_at desc, comment.id desc
  limit 21
$$;

create function public.study_comment_moderation_page(
  search_term text,
  before_time timestamptz default null,
  before_id uuid default null
)
returns table(
  id uuid,
  study_id uuid,
  study_name text,
  study_date date,
  author_name text,
  body text,
  status public.study_comment_status,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select comment.id, comment.study_id, study.study_name, study.study_date,
    comment.author_name, comment.body, comment.status, comment.created_at
  from public.study_comments comment
  join public.bible_studies study on study.id = comment.study_id
  where public.is_study_comment_moderator()
    and strpos(
      lower(concat_ws(' ', study.study_name, comment.author_name, comment.body)),
      lower(btrim(coalesce(search_term, '')))
    ) > 0
    and (
      before_time is null
      or (before_id is not null and (comment.created_at, comment.id) < (before_time, before_id))
    )
  order by comment.created_at desc, comment.id desc
  limit 21
$$;

create function public.set_study_comment_visibility(target_comment uuid, should_be_visible boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_study_comment_moderator() then
    raise exception 'Access denied' using errcode = '42501';
  end if;

  update public.study_comments
  set status = case when should_be_visible then 'visible'::public.study_comment_status else 'hidden'::public.study_comment_status end,
      moderated_by = auth.uid(),
      moderated_at = clock_timestamp()
  where id = target_comment;

  if not found then
    raise exception 'Comment not found.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.is_study_comment_moderator() from public, anon;
revoke all on function public.submit_study_comment(uuid, text),
  public.study_comment_page(uuid, timestamptz, uuid),
  public.study_comment_moderation_page(text, timestamptz, uuid),
  public.set_study_comment_visibility(uuid, boolean) from public, anon;
grant execute on function public.is_study_comment_moderator(),
  public.submit_study_comment(uuid, text),
  public.study_comment_page(uuid, timestamptz, uuid),
  public.study_comment_moderation_page(text, timestamptz, uuid),
  public.set_study_comment_visibility(uuid, boolean) to authenticated;

commit;
