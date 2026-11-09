# Architecture

## Purpose

This document describes the production architecture currently in the
repository. It is a working reference for making small, safe MVP changes.

## Application

The mobile client is an Expo SDK 58 React Native TypeScript app in `app/`.
`App.tsx` restores the Supabase session, handles auth redirects, and selects
between `SignIn` and the authenticated bottom-tab application.

Authenticated members use these tabs:

- Home: greeting, current streak, today's scheduled reading, next study, the
  daily KJV first-verse preview, and active church announcements.
- Calendar: monthly view of published Bible studies.
- Bible: daily-reading completion and the KJV reader.
- Study: upcoming and previous published Bible studies.
- Profile: streak, total completed readings, accessibility settings, private
  profile picture, and sign-out.

## Backend

Supabase provides Authentication, PostgreSQL, Row Level Security, Storage, and
the database function for daily-reading completion. The schema and policies are
versioned in `supabase/migrations/`.

Core tables are:

- `profiles` and `user_roles`
- `reading_plans`, `daily_readings`, and `reading_completions`
- `bible_studies`
- `announcements`
- `prayer_requests` and `prayer_request_prayers`
- `live_streams` and `push_tokens`

Members can read published ministry content and only their own private data.
Content-management roles are `pastor`, `admin`, and `editor`. The client cannot
assign roles.

## Daily-reading flow

1. The app calculates the current date in `Africa/Johannesburg`.
2. It reads the published `daily_readings` row for that date.
3. The Bible tab calls `complete_daily_reading` in Supabase.
4. The database records one completion per member and reading, recalculates the
   streak server-side, and updates the member profile.
5. The app reads the resulting streak; it never increments a streak locally.

## Bible-text flow

`app/src/services/bibleService.ts` requests KJV passages from
`bible-api.com`, then caches them in AsyncStorage. The daily preview requests
only the first verse of the first chapter in the scheduled range. For example,
`Psalms 107-111` produces a request for `Psalms 107:1`.

This is an external best-effort service, not a guaranteed production API. The
cache makes previously opened passages available when the network fails, but it
does not make unread passages available offline.

## Profile-photo flow

The `avatars` bucket is private. A member uploads within a folder named after
their authenticated user ID. The profile stores only `avatar_path`; the app
creates a time-limited signed URL for display. Public avatar URLs are not used.

## Announcements flow

Home requests up to three currently published announcements, newest first. A
record is available to members only after `published_at` and before `expires_at`.
Each record is displayed as a separate card. An announcement may include an
optional `action_label` and HTTPS-only `action_url`; selecting its action button
opens that destination outside the app. The app never constructs these links
from user input.

`announcement_reads` records one read timestamp per member and announcement.
Home displays unread cards first, then read cards ordered by when that member
read them. A member can mark an unread card as read with an accessible button
or a left swipe; the status is stored in Supabase and is not shared with other
members.

## Security boundaries

- Only `EXPO_PUBLIC_SUPABASE_URL` and
  `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` belong in the mobile environment.
- Supabase secret and service-role keys never belong in the app.
- Row Level Security remains enabled for every production table and storage
  bucket.
- Member content must not be added through the mobile app without an
  authorised content-management workflow.

## Known architecture limits

- The app has no built-in content-management screen yet.
- Announcements and prayer requests exist in the database but not yet in the
  member-facing navigation.
- Push notifications and automatic auth deep links require a development or
  production build; Expo Go cannot fully verify them.
