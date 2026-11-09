update public.announcements
set
  action_label = 'Open TikTok live',
  action_url = 'https://www.tiktok.com/@pastormathenjwa?_r=1&_t=ZS-9BG96vlB1u8'
where title = 'TikTok Live update'
  and message = 'Stay tuned tomorrow morning from 05:00 to 06:00 as we meet again for our daily morning sermons.'
  and expires_at = timestamptz '2026-11-10 06:00:00+02';

update public.announcements
set
  action_label = 'Open Spotify',
  action_url = 'https://open.spotify.com/show/3pborwByNfP3Szr6trJVR7?si=a29449a7975a4b09'
where title = 'Spotify Live update'
  and message = 'If you missed the morning sermon, catch it on Spotify.'
  and expires_at = timestamptz '2026-11-10 17:00:00+02';
