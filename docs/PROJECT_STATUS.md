# Project Status

## Current milestone

Pastor's first Android tester release: record physical-device feedback and
prioritise release-blocking defects without creating another build unless a
fix is verified and explicitly approved for release.

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

- `fix/more-sign-out-placement` is in progress. It relocates the local
  sign-out confirmation to the bottom of More, after the official ministry
  links, and replaces the harsh red Profile button with a ministry-green
  outline action. TypeScript and physical-device verification remain pending.
- `fix/auth-signup-feedback` was merged through pull request #44. It makes confirmation and
  password-reset feedback deliberately neutral about whether an email address
  is registered, offers clear Sign In and Forgot password actions, and opens a
  protected in-app password-update screen after Supabase's recovery event.
  TypeScript and real-device recovery-link verification remain pending.

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
- `fix/android-auth-and-system-theme` was merged to `main` through pull request
  #26. It makes every Sign In and Sign Up placeholder explicitly use a readable theme colour on Android,
  normalises email addresses to lowercase while preserving name and password
  casing, and replaces the first-time `Welcome back` heading with `Welcome to
  Word Alive`. It also adds a dark palette driven by the device's system
  appearance setting. TypeScript and Expo configuration validation passed, and
  the light-to-dark transition was checked in Expo Go on the `Mlibo_AP1`
  Android virtual device on 2026-11-10. A new signed preview APK and physical
  Android retest are still required before this is treated as release-ready.
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
- `feature/release-readiness` was merged to `main` and establishes an internal
  tester-build baseline.
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
- Android preview builds need the two `EXPO_PUBLIC_SUPABASE_*` values in Expo's
  remote `preview` environment because the deliberately ignored local `.env`
  file is not available to a cloud build. On 2026-11-10 those two values were
  added as project-scoped sensitive preview variables; no Supabase secret key
  was added. The `preview` EAS profile explicitly selects that environment.
- Two Android preview submissions from `main` commit `611a3713` were cancelled
  before distribution: the second was an identical duplicate caused by a
  delayed build-status response, and the first lacked the remote preview
  environment configuration. Expo created and is managing the Android signing
  key. A correctly configured replacement APK finished on 2026-11-10 from
  commit `5bce367837edede6e20e6603976c25dab461807c`.
- The signed Android internal preview APK was installed on the `Mlibo_AP1`
  Android virtual device on 2026-11-10. It launched the standalone
  `com.wordaliveministries.app` MainActivity and showed the application's
  native sign-in screen, not Expo Go. This is a smoke test only; signed-in
  member journeys and physical Android-device verification remain pending.

## Verified on 2026-11-18

- `fix/ignore-local-artifacts` was merged through pull request #27. Local APK
  copies in `/builds/` and the private working note file are ignored by Git;
  no existing local artifact was deleted or changed.
- `fix/android-bottom-navigation-inset` was merged through pull request #28.
  The app no longer fixes the bottom-tab height, so React Navigation provides
  Android's safe bottom inset. The nested More screens retain the `More` tab
  label.
- The current `main` branch was run in Expo Go on the `Mlibo_AP1` Android
  virtual device. The five app-tab labels were clear above Android gesture
  navigation, and the More label remained correct while opening nested screens.
  This is emulator-only evidence; physical Android and three-button-navigation
  testing remain pending.
- `npx tsc --noEmit` passes. `npm run verify:supabase` reached Supabase Auth
  settings with HTTP 200 using the local ignored production configuration.
- `npx expo-doctor` now reports 19 of 20 checks. The only failed check is seven
  minor Expo SDK 58 package patch-version mismatches. They require a separate
  dependency-alignment branch before the next externally shared Android build.
- The existing standalone preview APK is an historical smoke-test build from
  commit `5bce367837edede6e20e6603976c25dab461807c`; it does not contain pull
  requests #27 or #28. Its EAS artifact is
  `https://expo.dev/artifacts/eas/xYxJz3Hl_MDFHMltCKtulW2LbFkUbnqJUNuoBYuLho0.apk`
  and is scheduled to expire on 2026-11-24. Do not share it as the current
  tester build.

## Verified on 2026-11-19

- The project owner applied `202611180001_save_profile_surname_on_signup.sql`
  successfully in the production Supabase SQL Editor. New registrations now
  save separately supplied first name and surname values through the
  production profile trigger.
- The dedicated Administrator account was created through the app and assigned
  the `admin` role; Pastor Q's account was assigned the `pastor` role. The
  three former testing accounts were removed by the project owner through
  Supabase administration. No account credentials or identifiers are recorded
  in this repository.
- Expo Go on the `Mlibo_AP1` Android virtual device verified that the dedicated
  Administrator account can sign in with the Password keyboard Enter key and
  can open the role-gated Admin option from More. The same device verified
  that the Bible Search keyboard Search key opens `John 3:16`. This is
  emulator-only evidence; signed-build, physical Android, and iOS checks are
  still required.
- `fix/reading-streak-refresh` was verified in Expo Go on the `Mlibo_AP1`
  Android virtual device. After a controlled stale value of `7` was set for
  the dedicated Administrator account, both Home and Profile recalculated the
  value to `0` because there was no reading completed on the current South
  African date. The production migration succeeded; signed-build and physical
  Android/iOS checks remain pending.
- `fix/expo-sdk58-patch-alignment` aligns the seven Expo SDK 58 package patch
  versions reported on 2026-11-18. `npx expo-doctor` now reports 20 of 20
  checks passing and TypeScript validation passes.
- `feature/android-preview-build` prepares the replacement internal Android
  APK with visible version `1.0.1` and Android `versionCode` `2`. The approved
  package name and EAS `preview` profile are unchanged.

## Verified on 2026-11-20

- The replacement EAS `preview` Android build finished from merged `main`
  commit `a40203dd4ca808be446cf74a8abcba252ca11542`. It is visible version
  `1.0.1`, Android `versionCode` `2`, and package
  `com.wordaliveministries.app`.
- The completed APK was installed on the `Mlibo_AP1` Android virtual device.
  Android launched the standalone app package and showed the Word Alive
  Ministries native sign-in screen, rather than Expo Go or a crash. The first
  launch occurred while the emulator's package manager was recovering from an
  unrelated system stall; after the emulator recovered, the same installed APK
  launched normally. This is emulator-only launch evidence.
- The APK contains the required public Supabase URL and publishable key. No
  private Supabase credential was inspected or stored in the repository.
- Android preview builds 2 and 3 both exposed the same release-blocking
  session defect: a successful standalone sign-in briefly showed Home, then
  returned to Sign in. Build 3 was created from merged commit
  `281ba3334f0448de19e77664fa07f0b0ac0e8355`, installed on `Mlibo_AP1`, and
  verified as still affected.
- `fix/auth-event-session-state` now follows Supabase's event-state model: an
  existing session is applied only when an auth event supplies one, and local
  session state is cleared only on an actual `SIGNED_OUT` event. A delayed
  empty `INITIAL_SESSION` event can therefore no longer overwrite a successful
  sign-in.
- Android preview build 4 finished from merged `main` commit
  `e58edeb4cac8a0d591b5a9ec19782ff1089b7a9c`. It is version `1.0.1`, Android
  `versionCode` `4`, and package `com.wordaliveministries.app`. On 2026-11-20
  it installed on the `Mlibo_AP1` Android virtual device. A dedicated
  Administrator account remained signed in for at least 15 seconds; after a
  force-close and normal relaunch, the app showed Home and Church
  Announcements rather than Sign In. This resolves the previously reproduced
  standalone-session defect on that virtual device. Physical Android and iOS
  verification remain outstanding.
- On 2026-11-20, the `fix/bible-verse-actions` working branch was smoke-tested
  in Expo Go on the `Mlibo_AP1` Android virtual device. The Bible action panel
  displayed its highlight, bookmark, private-note, copy, and share controls.
  A temporary bookmark for Joel 1:1 appeared in Saved verses, survived a
  force-close/relaunch, and was then removed. The Admin Study form displayed
  its writing toolbar and correctly required the study to be saved before
  images could be added. The `study_media` production migration succeeded.
  Image upload, note saving, copy, sharing, and signed-APK verification remain
  pending.
- On 2026-11-20, the approved `fix/admin-rich-text-editor` branch replaced the
  marker-based Admin multiline editor with a local visual editor. It displays
  bold, italic, heading, bulleted-list, numbered-list, quote, and
  clear-formatting controls. Existing plain text and the earlier Markdown-like
  values remain readable. The editor loaded and accepted an unsaved test phrase
  in Expo Go on `Mlibo_AP1`. The original controls did not apply formatting on
  Android, so the same branch now uses native React Native controls that issue
  commands directly to the loaded editor and preserve the selected WebView text
  range. Automated Android-emulator input on 2026-11-20 visibly applied bold
  and heading formatting to selected, unsaved test text. However, on
  2026-11-21 the project owner reported that manually using the controls in
  the same virtual device still left the selected text unchanged. On the same
  date, the project owner approved merging this change into the next Android
  tester candidate because a physical Android device may behave differently.
  It is not production-verified: the pastor must test it before it can be
  considered complete. Italic, lists, quote, clear formatting, saving, member
  rendering, reload persistence, and signed-APK checks remain pending.

## Verified on 2026-11-21

- `feature/android-build-5` was merged to `main` as commit
  `60771a946b7731e3c84e1143f4ff4fa3acbf70ea`. It changes the visible app
  version to `1.0.2`, Android `versionCode` to `5`, and uses the approved
  internal `android` EAS profile.
- EAS Android build `1fab9c47-4f1c-41a0-a406-9e4cb02d33fa` finished from that
  commit. Its package is `com.wordaliveministries.app`; the internal APK link
  expires on 2026-12-05. A second identical build request was cancelled after
  the original build-status response was delayed. The cancelled request has no
  distribution artifact.
- The completed APK was installed on the `Mlibo_AP1` Android virtual device.
  Android reported version `1.0.2` / code `5` and focused
  `com.wordaliveministries.app.MainActivity`, not Expo Go. The app reached
  signed-in Home, then returned to signed-in Home after a force-close and
  normal relaunch. This is verified virtual-device smoke evidence, not a
  substitute for physical Android testing.
- The project owner approved build 5 as Pastor's first Android tester release.
  iOS testing is deliberately deferred to the final-release milestone because
  the project does not currently have Apple Developer Program membership.

## Known blockers

- `fix/admin-daily-reading-progress` corrects a role-specific daily-reading
  lookup defect identified during physical Android testing on 2026-11-21. The
  app previously queried by `reading_id` only; a Pastor or Administrator can
  read multiple members' completion rows, so its single-row lookup failed once
  another member completed the same reading. The fix scopes the lookup to the
  signed-in user's `user_id`. TypeScript validation passes; physical Android
  verification remains required.

- **Admin formatted writing requires physical Android verification.** Automated
  emulator input can apply selected formatting, but manual virtual-device use
  still fails according to the project owner. The change is approved for the
  next Android tester candidate, but it must not be described as verified or
  production-ready until the pastor confirms it on a physical device.

- `fix/admin-editor-state` follows the reported Android editor failures. It
  remounts a visual editor for each selected record, waits for the editor to
  load before enabling its writing controls, supports scrolling long notes,
  and warns before an Administrator discards unsaved Notice or Study changes.
  TypeScript validation passes. It still requires physical Android testing;
  no new Android build has been created for this source-only fix.

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
- `npm audit` reported three remaining moderate Expo toolchain findings after
  the SDK-compatible WebView installation on 2026-11-20. The critical
  nested `shell-quote` finding was repaired on 2026-11-09 without changing
  Expo. The only audit-proposed resolution for the remaining findings is an
  incompatible forced Expo downgrade, so it must be reassessed with a supported
  Expo update before public-store release.
- The production setup template has been intentionally removed. The root README
  contains the exact manual `.env` fields that a developer must create.

## Next work

1. Receive Pastor's build-5 physical Android feedback. Capture the device
   model, Android version, repeatable steps, and a screenshot or screen
   recording for every issue.
2. Prioritise any release-blocking defect found by Pastor. Admin formatted
   writing is already a known physical-device check because manual emulator
   use did not reliably apply formatting.
3. Verify the remaining Admin Reading Plan and Daily Reading edit/save actions
   without changing the pastor-approved 2026 plan content, and publish real
   church studies/events when their approved information is supplied.
4. Create another Android build only after an approved, verified fix requires
   it. Defer Apple Developer enrolment, TestFlight, and iOS testing to the
   final-release milestone.
