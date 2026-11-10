# Project Status

## Current milestone

Internal tester-release readiness

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
- Physical iPhone / Expo Go verification completed for the Profile repair:
  the completed-reading total loaded separately from the streak, a profile
  photo uploaded to the private `avatars` bucket, and the photo remained
  visible after the app reloaded.
- Physical iPhone / Expo Go verification completed for the Home daily-reading
  message repair: the Home card correctly directs a member to the Bible tab
  when the scheduled reading has no optional reflection text.
- Physical iPhone / Expo Go verification completed for the KJV daily
  first-verse preview: Home shows the first verse from the first chapter of
  the day's scheduled range and labels the translation as KJV.
- Physical iPhone / Expo Go verification completed for the announcement-card
  controls and discoverability guidance: the active TikTok card shows its
  external action, a visible read action, and the update-count/swipe hint.
- Physical iPhone / Expo Go verification completed for Prayer Requests: a
  member created a private request, reloaded it, edited it, and deleted the
  test request. More navigation and its evenly spaced five-item bottom bar
  were also verified.
- The unnecessary introductory card was removed from More and the simplified
  screen was verified on a physical iPhone.
- Before the feature was removed from the current MVP, the Admin Home-content
  flow was verified end-to-end on a physical iPhone: an administrator saved a
  temporary encouragement, Home displayed it after refresh, and the approved
  Psalm 119:105 message was restored.
- Automated JavaScript bundle exports completed for iOS and Android after the
  Admin implementation. These checks do not replace platform-device testing.
- The role-gated Admin area was verified on a physical iPhone for access
  control, Home encouragement updates, announcement draft management,
  Bible-study draft management, livestream management, and private prayer
  request moderation. The Reading Plan and Daily Reading edit-and-save paths
  remain explicitly pending physical-device verification.

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
- `fix/study-calendar-production-schema` was merged to `main`. It corrected
  Bible-study, Calendar, and Home dashboard fields from the old prototype
  schema to the production schema. The changes pass TypeScript validation and
  were verified on a physical iPhone; Android verification remains pending.
- `fix/profile-reading-statistics` was merged to `main`. It replaced the
  incorrect Profile completed-reading figure with a count from
  `reading_completions` and aligns avatar handling with the production
  `avatar_path` field and private `avatars` bucket. The changes pass
  TypeScript validation and were verified on a physical iPhone; Android
  verification remains pending.
- `fix/home-daily-reflection` was merged to `main`. It removed the old
  prototype `content` field lookup from the Home daily-reading card and uses
  the production `reflection` field with a clear Bible-tab fallback. The
  changes pass TypeScript validation and were verified on a physical iPhone.
- `feature/daily-kjv-preview` was merged to `main`. It adds a three-line,
  cached KJV first-verse preview to Home and corrects the Bible-screen
  translation label from NIV to KJV. The preview was verified on a physical
  iPhone; Android verification remains pending.
- `docs/project-baseline` was merged to `main`. It creates operational project
  documentation, removes stale duplicate documentation, and records the
  project owner's decision to remove the `.env.example` template.
- `feature/announcements-feed` was merged to `main`. The Home screen has a
  member-facing active-announcements feed with optional action links and
  per-member read state. Its active-card controls and guidance are verified on
  a physical iPhone. A natural two-card ordering check remains pending until
  Spotify is published at 06:00 SAST on 2026-11-10.
- `feature/prayer-requests` was merged to `main`. It introduces a More area to keep
  bottom navigation usable, plus a member-facing Prayer Requests screen backed
  by the existing production schema. The feature is verified on a physical
  iPhone and is ready for review.
- `fix/profile-session-home-avatar` was merged to `main`. It makes sign-out an
  explicit local-device action with confirmation and displays the member's
  private profile photo in Home through a time-limited signed URL. Physical
  verification remains pending.
- `feature/admin-content-management` was merged to `main`. It adds
  role-gated pastor/admin tools for dynamic ministry content while keeping role
  assignment outside the mobile app and under Supabase administration.
- `feature/ministry-links` was merged to `main`. It adds a permanent Connect with
  us area in More and an Admin Links manager, backed by a new RLS-protected
  `ministry_links` table seeded with the church's approved TikTok, Spotify,
  WhatsApp Channel, and YouTube destinations. The production migration, all
  four external destinations, and the administrator hide-and-restore flow were
  verified on a physical iPhone in Expo Go on 2026-11-10.
- `fix/more-tab-reset` was merged to `main`. It resets the local More destination
  to its menu when the More tab is selected again or regains focus. Manual
  verification completed on 2026-11-10.
- `refactor/home-encouragement-removal` was merged to `main`. It removed the
  non-essential Stay Encouraged card and its Admin editor from the current MVP.
  The existing `home_encouragement` table, migration, and content are retained
  unchanged for a possible later release. The removal was verified on a
  physical iPhone in Expo Go on 2026-11-10.
- `refactor/ministry-color-system` was merged to `main`. It introduced the approved
  ministry green and gold palette and removed the broken member-facing High
  Contrast control. The existing `profiles.high_contrast` column is retained
  unchanged but is no longer read or written by the mobile app. The Home
  navigation colours and Profile control removal were verified on a physical
  iPhone in Expo Go on 2026-11-10.
- `refactor/bible-reader-text-size` was merged to `main` through pull request
  #24. It removes the global Profile text-size controls and adds the approved
  reader-only `Aa` text-size
  setting. It also adds the approved Calendar reading-plan and expandable
  study-notes model, and corrects related app and setup documentation. The
  existing `profiles.text_scale` column is retained unchanged but is no longer
  read or written by the mobile app. On 2026-11-10, a physical iPhone in Expo
  Go verified the removed Profile controls, Extra large Bible text after an app
  restart, Calendar reading-plan markers, and selected-day chapters. Published
  study-note verification remains pending until the church supplies a real
  study or event.
- `feature/release-readiness` is configuring an internal tester-build baseline.
  Its `preview` EAS profile is for shareable tester builds; it is not a store
  release and does not publish the application.
- The existing EAS project link was verified as belonging to Expo account
  `mlibo`; `app/app.json` now uses that exact owner so EAS commands can resolve
  the linked project.
- The approved mobile application identifier is
  `com.wordaliveministries.app` for both Android and iOS. Android now uses the
  supplied adaptive foreground, background, and monochrome icon layers; the
  supplied splash image uses its intended black background. Visual verification
  remains pending until an installed preview build is available.
- An Android internal preview APK was submitted to Expo on 2026-11-10 from
  `main` commit `611a3713`. Expo created and is managing the Android signing
  key. The APK is not yet available for installation or device verification.

## Known blockers

- There are currently no confirmed, published Bible-study events in the
  production database. Church meeting dates, times, locations, and links must
  be supplied by the pastor or an authorised church representative; the app
  must not display invented event data.
- The Profile avatar flow has not yet been verified in a production build.
  The upload service was verified in Expo Go; the app-specific iOS
  photo-permission wording takes effect when a new development or production
  build is made.
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
- Bible text is fetched on demand from `bible-api.com` using its KJV
  translation. Its service is free but rate-limited and has no availability
  guarantee; the app caches requests and must not attempt bulk Bible downloads.
  Reassess the provider and translation licensing before a global public
  release.
- `npm audit` has five remaining moderate Expo toolchain findings. The critical
  nested `shell-quote` finding was repaired on 2026-11-09 without changing
  Expo. The only audit-proposed resolution for the remaining findings is an
  incompatible forced Expo downgrade, so it must be reassessed with a supported
  Expo update before public-store release.
- The production setup template has been intentionally removed. The root README
  contains the exact manual `.env` fields that a developer must create.

## Next work

1. Wait for the submitted Android internal preview APK, then install it on the
   Android emulator and a physical Android device before sharing its direct
   installation link with the pastor's small tester group.
2. Complete the two remaining Admin device checks: Reading Plan edit/save and
   Daily Reading edit/save without changing the pastor-approved plan content.
3. Obtain approved Bible-study events and verify populated Study, Calendar,
   and Home views.
