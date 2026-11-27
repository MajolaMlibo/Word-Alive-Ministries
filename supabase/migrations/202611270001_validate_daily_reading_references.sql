-- Prevent new or changed daily-reading references from naming a non-existent
-- Bible book/chapter. Existing rows are deliberately left reviewable: the
-- trigger fires only on a new row or when scripture_ref itself changes.
--
-- Grammar: Book C, Book C-C, Book C:V, Book C:V-V, separated by semicolons.
-- Exact verse-count validation belongs to the KJV reader/provider; this guard
-- validates the locally reliable book and chapter boundaries.
begin;

create or replace function public.is_valid_daily_reading_scripture_reference(p_reference text)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  v_reference text := regexp_replace(btrim(coalesce(p_reference, '')), '[–—]', '-', 'g');
  v_segment text;
  v_match text[];
  v_book text;
  v_max_chapter integer;
  v_start_chapter integer;
  v_start_verse integer;
  v_end integer;
begin
  if v_reference = '' then return false; end if;

  foreach v_segment in array string_to_array(v_reference, ';') loop
    v_segment := btrim(regexp_replace(v_segment, '\s+', ' ', 'g'));
    if v_segment = '' then return false; end if;

    v_match := regexp_match(
      v_segment,
      '^(.+?)[[:space:]]+([0-9]+)(:([0-9]+))?([[:space:]]*-[[:space:]]*([0-9]+))?$'
    );
    if v_match is null then return false; end if;

    v_book := lower(btrim(v_match[1]));
    v_max_chapter := case v_book
      when 'genesis' then 50 when 'exodus' then 40 when 'leviticus' then 27
      when 'numbers' then 36 when 'deuteronomy' then 34 when 'joshua' then 24
      when 'judges' then 21 when 'ruth' then 4 when '1 samuel' then 31
      when '2 samuel' then 24 when '1 kings' then 22 when '2 kings' then 25
      when '1 chronicles' then 29 when '2 chronicles' then 36 when 'ezra' then 10
      when 'nehemiah' then 13 when 'esther' then 10 when 'job' then 42
      when 'psalms' then 150 when 'proverbs' then 31 when 'ecclesiastes' then 12
      when 'song of solomon' then 8 when 'isaiah' then 66 when 'jeremiah' then 52
      when 'lamentations' then 5 when 'ezekiel' then 48 when 'daniel' then 12
      when 'hosea' then 14 when 'joel' then 3 when 'amos' then 9 when 'obadiah' then 1
      when 'jonah' then 4 when 'micah' then 7 when 'nahum' then 3 when 'habakkuk' then 3
      when 'zephaniah' then 3 when 'haggai' then 2 when 'zechariah' then 14
      when 'malachi' then 4 when 'matthew' then 28 when 'mark' then 16 when 'luke' then 24
      when 'john' then 21 when 'acts' then 28 when 'romans' then 16
      when '1 corinthians' then 16 when '2 corinthians' then 13 when 'galatians' then 6
      when 'ephesians' then 6 when 'philippians' then 4 when 'colossians' then 4
      when '1 thessalonians' then 5 when '2 thessalonians' then 3
      when '1 timothy' then 6 when '2 timothy' then 4 when 'titus' then 3
      when 'philemon' then 1 when 'hebrews' then 13 when 'james' then 5
      when '1 peter' then 5 when '2 peter' then 3 when '1 john' then 5
      when '2 john' then 1 when '3 john' then 1 when 'jude' then 1
      when 'revelation' then 22 else null
    end;
    if v_max_chapter is null then return false; end if;

    begin
      v_start_chapter := v_match[2]::integer;
      v_start_verse := nullif(v_match[4], '')::integer;
      v_end := nullif(v_match[6], '')::integer;
    exception when numeric_value_out_of_range then
      return false;
    end;

    if v_start_chapter < 1 or v_start_chapter > v_max_chapter then return false; end if;
    if v_start_verse is not null and v_start_verse < 1 then return false; end if;

    if v_start_verse is null then
      if v_end is not null and (v_end < v_start_chapter or v_end > v_max_chapter) then return false; end if;
    elsif v_end is not null and v_end < v_start_verse then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

create or replace function public.enforce_daily_reading_scripture_reference()
returns trigger
language plpgsql
set search_path = public, pg_catalog
as $$
begin
  if not public.is_valid_daily_reading_scripture_reference(new.scripture_ref) then
    raise exception 'Invalid Scripture reference. Use a recognised Bible book and valid chapter range.'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger validate_daily_reading_scripture_reference
before insert or update of scripture_ref on public.daily_readings
for each row execute function public.enforce_daily_reading_scripture_reference();

commit;
