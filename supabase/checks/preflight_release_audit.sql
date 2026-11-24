-- Run in word-alive-prod before approving the release-audit migrations.
-- Read-only. Expected: one row with three zeros.
select
  (select count(*) from (
    select scheduled_date from public.daily_readings
    where status='published' group by scheduled_date having count(*)>1
  ) d) as duplicate_published_dates,
  (select count(*) from (
    select study_id from public.study_media group by study_id having count(*)>6
  ) m) as studies_over_six_images,
  (select count(*) from public.daily_readings r join public.reading_plans p on p.id=r.plan_id
   where r.status='published' and p.status<>'published') as published_readings_in_hidden_plans;
