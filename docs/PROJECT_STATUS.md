# Project Status

## Current milestone

Bible-study and Calendar production-schema repair

## Verified on 2026-11-08

- The application is an Expo SDK 58 React Native TypeScript project. It was
  upgraded from SDK 57 because current iOS Expo Go supports SDK 58 only.
- `npx expo-doctor` completed with 20 of 20 checks passing after the upgrade.
- `tsc --noEmit` passes after the upgrade.
- `npx expo config --type public` reports `sdkVersion: 58.0.0`.
- The Git `main` branch matched `origin/main` before this feature branch was created.
- Physical iPhone / Expo Go verification completed for email-and-password
  authentication: create account, receive the confirmation-email prompt, sign
  in to Home after confirmation, sign out, and sign back in using the existing
  account.

## Verified on 2026-11-09

- The production database contains the 365 published readings from the
  church-approved 2026 Bible study plan through
  `202611080001_import_2026_reading_plan.sql`.
- `202611090001_fix_daily_reading_completion.sql` was applied in the
  production Supabase SQL Editor. It fixes the completion function and
  restricts completion to the reading scheduled for the current South African
  date.
- Physical iPhone / Expo Go verification completed for the daily-reading
  workflow: today's reading loads by South African date, the Read tab opens at
  the first chapter while the reading is incomplete, completion updates the
  streak, the completed state survives an app reload, and the Read tab returns
  to the member's normal saved position after completion.
- Physical iPhone / Expo Go verification completed for the Bible-study schema
  repair: Study, Calendar, and Home show the correct empty state when there
  are no published Bible-study records, and no screen attempts to display the
  obsolete prototype `chapter` field.

## Current work

The prototype Supabase project contains development-only data. The production
database will be created from the versioned migration in `supabase/migrations`.
On 2026-11-08, the project owner applied
`202611070001_initial_schema.sql` in the new production project's Supabase SQL
Editor and reported `Success. No rows returned`.
- `npm run verify:supabase` was run successfully from `app` with the local,
  Git-ignored production `.env`; Supabase Auth settings responded with HTTP 200.
- Email-and-password authentication was merged to `main` through
  `feature/authentication-lifecycle`. Google and Apple sign-in are deferred
  until their providers and platform-specific redirect flows are configured.
- The verified daily-reading implementation was merged to `main` through
  `feature/daily-reading-completion`.
- The active branch is `fix/study-calendar-production-schema`. It corrects
  Bible-study, Calendar, and Home dashboard fields from the old prototype
  schema to the production schema. The changes pass TypeScript validation and
  were verified on a physical iPhone; Android verification remains pending.

## Known blockers

- There are currently no confirmed, published Bible-study events in the
  production database. Church meeting dates, times, locations, and links must
  be supplied by the pastor or an authorised church representative; the app
  must not display invented event data.
- There are no automated application tests or CI workflows.
- The unused root-level Node package and tracked dependency tree were removed
  in the dedicated `fix/remove-root-supabase-install` branch. The Expo
  application has its own dependencies under `app/` and root `node_modules`
  is now ignored.
- Expo Go cannot open the `wordalive-ministries://auth/callback` URL after
  email confirmation because Expo Go does not register the app's custom URL
  scheme. The confirmation can be completed in the browser and the member can
  then sign in manually. Verify automatic return to the app in an Expo
  development build before release.
- Remote push notifications through `expo-notifications` are not supported in
  Expo Go and have not been device-tested. Verify notifications in an Expo
  development build before release.

## Next feature after the schema repair

Enter and publish confirmed church Bible-study data, then verify its display
on a physical iPhone and Android device. After that, repair the next highest
value MVP flow identified from the production-schema audit.
