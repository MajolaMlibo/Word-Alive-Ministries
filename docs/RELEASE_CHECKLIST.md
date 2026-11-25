# Release Checklist

## Android acceptance reported 25 November 2026

- [x] Project owner confirmed the 2027 calendar is up to date. In Admin →
  Readings, December expanded and showed the draft entry HOSEA 10–14 on
  1 December (day 335).
- [x] Two-account prayer check across Android Studio and BlueStacks: the
  requester submitted a prayer, the administrator replied and closed it,
  and the requester could see the private reply under My requests.
- [x] The dedicated administrator saw 3 completed readings under Members in
  BlueStacks, matching the member's Profile total in the Android Studio emulator.
- The project owner previously reported all four production migration
  verification flags true. Build number and upgrade-session retention were
  not established by these screenshots.

## Public account deletion acceptance

- The owner approved all four migrations and reported successful verification.
- [x] On 25 November 2026 the member submitted a deletion request in the
  Android Studio emulator. The dedicated administrator saw it in BlueStacks.
  After withdrawal the queue showed “No pending deletion requests” and the
  member remained signed in with the same completed-reading count.
- Remaining manual checks with synthetic accounts include duplicate taps and
  confirming staff without access cannot view the queue.
- Before public store submission, approve the contact inbox, retention periods
  and response owner, deploy the web app, and verify its HTTPS deletion link
  (site root with ?account=delete). A website has not been published as part of
  this audit.

## November release audit follow-up

- Expo project verified as @mlibo/word-alive-ministries, project ID
  966c4966-bf09-4419-8652-2c5642b7503f. Latest successful Android build was
  version 1.0.2, code 5. The retained APK and default EAS Android certificate
  reported the same SHA-256 fingerprint. The upcoming internal profile uses
  the existing package, project and signing identity with local version code 6.
- Verified the preview environment points to word-alive-prod and its configured
  publishable key receives HTTP 200 from Auth settings. These checks do not
  establish external email delivery. Confirm the production profile separately
  if preparing a store bundle.
- Run npm ci and npm run test:release from app. This checks code, editor DOM,
  reading dates, prayer and member permissions, archiving, publication,
  streak boundaries, 101 study records, image capacity, a synthetic database
  restore, and cached versus uncached Bible passages. The PR workflow runs for
  public repositories; private repositories opt in with ENABLE_RELEASE_CHECKS.
- Deployment order, after explicit production approval: apply
  202611250001_reading_safeguards.sql, 202611250002_reading_publication_and_streak.sql
  and 202611250003_study_media_limits.sql before distributing a new client.
  Preview the pending duplicate-date and image-capacity checks below first.
  If either returns rows, review the content with the administrator before
  applying migrations. No automatic edits to the church plan or files.
- Pending phone checks: install the authorised signed APK over build 5, confirm
  session retention and Pastor's December 2027 readings, open/correct rich
  notes, retry a failed image upload, and open one cached and one uncached
  chapter in airplane mode. Ordinary-member signup and recovery are independent
  of the recorded project-owner recovery pass.
- Store gates: church-approved support contact and retention policy; published
  privacy and account-deletion URLs; verified Play Console testing eligibility;
  stakeholder acceptance. Obtain owner consent before external publication.
  Actual private-file restore rehearsal is still pending. See OPERATIONS.md.

In Supabase → word-alive-prod → SQL Editor → New query, run
[supabase/checks/preflight_release_audit.sql](../supabase/checks/preflight_release_audit.sql).
Expect a single row with three zeros. Request deployment approval separately.
Expo Doctor passed 20/20 on this checkout. npm audit reported three moderate
entries in the Expo fingerprint dependency chain, zero high and zero critical.
The registry listed 58.0.26 as the latest patch within the configured Expo 58
range; retain the supported version and recheck before distribution.

## Integrated reader and Study checks — 24 November 2026

The combined branch includes the fixes from #59 through #71. TypeScript, all
three regression scripts and Android, iOS and web exports passed together.
A regression fixture covers a quotation followed by a normal paragraph and a
bold chapter heading. Existing rich-text notes use the repaired display path
without editing their saved contents. The large Study introductory card was removed.

- [x] Project owner confirmed the bottom verse tools and private notes work as
  expected after the keyboard fix.
- [x] Project owner confirmed the reported rich-text formatting fault in the
  member view is fixed.
- [x] Project owner reported that Forgot password works.
- [x] Project owner compared the old Android emulator installation with the
  updated app. The old list stopped in May (15 May 2027, day 135). The updated
  app showed all months, with December expanded to show draft readings for
  1–3 December (days 335–337).
- [ ] After Pastor installs the updated app, confirm he can open the draft
  readings for September through December 2027.

## Pre-build diagnostic — 24 November 2026

Tested the working copy at `8d93a74d` (#71). Remote `main` was `ebd6a9ea`.
This is a branch-level result. The combined release and a physical-device
upgrade still require verification.

- Passed TypeScript, Expo Doctor (20/20), and local Android, iOS and web exports.
- Passed all three regression scripts covering reading dates and plan isolation,
  notice editor loading and typing, and private prayer and member access. The
  database tests used local fixtures, including 107 prayer requests.
- The configured Supabase Auth settings endpoint returned HTTP 200. This check
  does not exercise a member session, email delivery or password recovery.
- npm reported three moderate dependency entries tracing to one `minimatch`
  advisory through `@expo/fingerprint` and `expo`. Review a compatible patch.
- PRs #59–#71 were open. The tested branch includes the #63–#71 chain and lacks
  #59–#62. Separate merge simulations found documentation conflicts in
  `TEST_PLAN.md` (Bible and keyboard changes) and `OPERATIONS.md` (recovery).
- The local Expo owner differs from committed `mlibo`. Confirm the project
  owner before packaging. Android still uses version code 5, already issued.
- Next verification on one integrated revision: install over build 5 on Android,
  confirm session retention, complete a password reset from a fresh email, test
  keyboard and Bible controls in both themes, and check the Pastor account can
  see September through December 2027. No device was connected for this audit.

## MVP functionality

- [x] Production Supabase project created.
- [x] Initial schema and approved 2026 reading-plan migrations applied.
- [x] Email-and-password authentication verified on an iPhone.
- [x] Daily-reading completion and profile streak verified on an iPhone.
- [x] Study, Calendar, and Profile production-schema repairs verified on an
  iPhone.
- [x] Verify Calendar reading-plan markers and selected-day chapters on a
  physical iPhone.
- [ ] Verify expandable published study notes on a physical device after the
  church supplies a real study or event.
- [ ] Publish confirmed Bible-study events and verify populated views.
- [x] Apply `202611210001_restrict_future_study_visibility.sql` in production
  Supabase. It succeeded in `word-alive-prod` on 2026-11-21 and the resulting
  study and Storage policies were verified.
- [x] Verify Study schedule and image viewing in Expo Go with Administrator
  and member accounts, including removal from the member view after archiving.
- [ ] Repeat Study schedule checks in standalone Android with member,
  Administrator, and Pastor accounts. Verify direct future-study and
  private-media access is denied to members.
- [x] Publish approved announcements and verify the member announcement feed.
- [x] Implement and verify the member Prayer Requests flow: create, edit,
  delete, private submission, and reload persistence.
- [x] Verify role-gated Admin access on a physical iPhone. The legacy Home
  encouragement flow was verified before it was removed from the current MVP.
- [ ] Verify the Admin Reading Plan and Daily Reading edit-and-save actions on
  a physical device without changing the approved 2026 plan content.
- [ ] Create an authorised staff content-management process.
- [x] Apply and verify the `ministry_links` migration, including the four
  approved official channel links.
- [ ] Verify each visible ministry link opens its intended external channel on
  an installed Android preview build.

## Internal tester-build readiness

- [x] Configure the `android` EAS profile for internal Android tester distribution.
- [x] Confirm the existing EAS project belongs to Expo account `mlibo` and
  align the configured project owner.
- [x] Configure the approved Android package name and iOS bundle identifier:
  `com.wordaliveministries.app`.
- [x] Create Android build 5 through EAS internal distribution from merged
  `main` commit `60771a94`, install it on `Mlibo_AP1`, and verify standalone
  launch plus saved-session relaunch to Home on 2026-11-21.
- [x] Merge `fix/android-auth-and-system-theme` and verify its Light/Dark
  appearance behaviour in Expo Go on the Android virtual device.
- [x] Merge `fix/ignore-local-artifacts` and
  `fix/android-bottom-navigation-inset`. The latter was verified in Expo Go on
  `Mlibo_AP1` on 2026-11-18; its standalone-APK tab-bar check is still pending.
- [x] Build 5 includes the subsequent Bible verse-action and visual
  Admin-editor work. It is the authorised Pastor tester build; its direct
  install link expires on 2026-12-05.
- [x] Resolve the seven Expo SDK 58 patch-version mismatches reported by
  `npx expo-doctor` on 2026-11-18 through the separately tested
  `fix/expo-sdk58-patch-alignment` branch; the follow-up report is 20 of 20
  passing checks.
- [ ] Final-release milestone: enrol in the Apple Developer Program, then use
  TestFlight and a dedicated iOS build for iPhone testing. The project owner
  deliberately deferred this cost until Android church testing is complete.
- [ ] Verify automatic email-confirmation deep linking.
- [ ] On a real device, verify neutral existing-account guidance, password-reset
  email delivery, in-app recovery-link handling, new-password validation, and
  sign-in using the new password.
- [ ] On a real device, confirm Sign out is only in the main More menu below
  ministry links, requires confirmation, and returns to Sign In after local
  session clearing.
- [ ] On Android, open a published Study with a real image; confirm tapping the
  image leaves the Study card expanded, opens the image full screen, and the
  close control returns to the same expanded study.
- [ ] On physical Android, verify the Home notice deck with at least three
  notices: visible cards behind the current card, right swipe for the next
  notice, left swipe to mark an unread notice as read and move it to the
  bottom, a one-time guidance hint without an arrow, and working Read more
  only for a genuinely collapsed long message.
- [ ] On physical Android, confirm Bible passage selection is closed by
  default, selecting a book and chapter opens that chapter and closes the
  selector, direct `Book chapter:verse` search still works, and long Bible
  text scrolls naturally with the passage control rather than beneath fixed
  navigation.
- [ ] Verify push-notification permission, token registration, delivery, and
  tap handling.
- [ ] Verify app-specific photo permission wording.
- [ ] Verify the current Android bottom-navigation inset in a standalone APK
  on a physical Android phone with both navigation modes.
- [ ] Verify the daily-reading completion state for a Pastor or Administrator
  account after another member has completed the same reading.
- [ ] On physical Android, verify an existing Notice and Study load their full
  saved editor text. Select text and test Bold, Italic, Heading, both list
  types, Quote, and Clear formatting; save and reopen to confirm formatting
  remains visible. Also confirm long notes scroll above the keyboard and
  changing records with unsaved edits prompts to discard or keep editing.

## Android and iOS verification

- [ ] Test the complete member journey on an Android device.
- [ ] Test the complete member journey on an iPhone outside Expo Go.
- [ ] Test small and large screens with standard, large, and extra-large text.
- [ ] Test offline reading from an existing cached passage and reconnection.
- [ ] Test error and retry states for Supabase and Bible-text requests.

## Security and privacy

- [ ] Confirm Row Level Security policies with a member account and a pastor
  account.
- [ ] Confirm no secrets, service-role keys, personal data, or signing files
  are tracked by Git.
- [ ] Confirm the profile-photo bucket remains private.
- [ ] Confirm the Bible-text provider and translation terms are suitable for
  the planned public distribution countries.
- [ ] Define retention and moderation rules for prayer requests before launch.
- [x] Repair the critical nested `shell-quote` advisory without changing the
  Expo SDK.
- [ ] Reassess the three remaining moderate Expo build-toolchain advisories with
  a supported Expo update before public-store release; do not use `npm audit
  fix --force` to downgrade the SDK.

## Store readiness

- [ ] Finalise icons, splash screen, screenshots, privacy policy, support
  email, and store descriptions.
- [ ] Visually verify the Android adaptive icon's safe-area version and the
  black-background splash screen in an installed Android APK. Confirm the
  complete logo is visible on the launcher; long launcher-label truncation is
  controlled by the device launcher rather than the application.
- [ ] Obtain required Google Play Console and Apple Developer access.
- [ ] Create signed Android App Bundle and iOS store builds.
- [ ] Obtain pastor acceptance after a documented stakeholder test session.
