-- Read-only current-and-upcoming daily-reading integrity report.
-- Run in word-alive-prod before Build 7. It returns only affected reading rows;
-- no member data and no changes. To audit historical active rows too, remove
-- the scheduled_date predicate below.
with bible_books(book, max_chapter) as (
  values
    ('genesis',50),('exodus',40),('leviticus',27),('numbers',36),('deuteronomy',34),
    ('joshua',24),('judges',21),('ruth',4),('1 samuel',31),('2 samuel',24),
    ('1 kings',22),('2 kings',25),('1 chronicles',29),('2 chronicles',36),('ezra',10),
    ('nehemiah',13),('esther',10),('job',42),('psalms',150),('proverbs',31),
    ('ecclesiastes',12),('song of solomon',8),('isaiah',66),('jeremiah',52),('lamentations',5),
    ('ezekiel',48),('daniel',12),('hosea',14),('joel',3),('amos',9),('obadiah',1),
    ('jonah',4),('micah',7),('nahum',3),('habakkuk',3),('zephaniah',3),('haggai',2),
    ('zechariah',14),('malachi',4),('matthew',28),('mark',16),('luke',24),('john',21),
    ('acts',28),('romans',16),('1 corinthians',16),('2 corinthians',13),('galatians',6),
    ('ephesians',6),('philippians',4),('colossians',4),('1 thessalonians',5),
    ('2 thessalonians',3),('1 timothy',6),('2 timothy',4),('titus',3),('philemon',1),
    ('hebrews',13),('james',5),('1 peter',5),('2 peter',3),('1 john',5),('2 john',1),
    ('3 john',1),('jude',1),('revelation',22)
), segments as (
  select r.id, p.name as plan_name, r.scheduled_date, r.status, r.scripture_ref,
         btrim(part) as passage
  from public.daily_readings r
  join public.reading_plans p on p.id = r.plan_id
  cross join lateral regexp_split_to_table(regexp_replace(r.scripture_ref, '[–—]', '-', 'g'), ';') as part
  where r.status <> 'archived'
    and r.scheduled_date >= (timezone('Africa/Johannesburg', now()))::date
), parsed as (
  select segments.*,
         regexp_match(
           passage,
           '^(.+?)[[:space:]]+([0-9]+)(:([0-9]+))?([[:space:]]*-[[:space:]]*([0-9]+))?$'
         ) as parts
  from segments
), checked as (
  select parsed.*, bible_books.max_chapter
  from parsed
  left join bible_books on bible_books.book = lower(btrim(parsed.parts[1]))
)
select
  id,
  plan_name,
  scheduled_date,
  status,
  scripture_ref,
  passage as failing_passage,
  case
    when parts is null then 'Unsupported format: use Book C, Book C-C, Book C:V, Book C:V-V, separated by semicolons.'
    when max_chapter is null and lower(btrim(parts[1])) = 'psalm' then 'Use the canonical book name Psalms.'
    when max_chapter is null and lower(btrim(parts[1])) = 'song of songs' then 'Use the canonical book name Song of Solomon.'
    when max_chapter is null then 'Unrecognised Bible book.'
    when parts[2]::integer < 1 or parts[2]::integer > max_chapter then 'Starting chapter is outside this book.'
    when parts[4] is not null and parts[4]::integer < 1 then 'Starting verse must be positive.'
    when parts[4] is null and parts[6] is not null and parts[6]::integer < parts[2]::integer then 'Ending chapter is before the starting chapter.'
    when parts[4] is null and parts[6] is not null and parts[6]::integer > max_chapter then 'Ending chapter is outside this book.'
    when parts[4] is not null and parts[6] is not null and parts[6]::integer < parts[4]::integer then 'Ending verse is before the starting verse.'
  end as issue
from checked
where parts is null
   or max_chapter is null
   or parts[2]::integer < 1
   or parts[2]::integer > max_chapter
   or (parts[4] is not null and parts[4]::integer < 1)
   or (parts[4] is null and parts[6] is not null and (parts[6]::integer < parts[2]::integer or parts[6]::integer > max_chapter))
   or (parts[4] is not null and parts[6] is not null and parts[6]::integer < parts[4]::integer)
order by scheduled_date, plan_name, id;
