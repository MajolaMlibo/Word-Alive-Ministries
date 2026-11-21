# Release Checklist

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
- [ ] Verify: members see Today's Study and Past only; Pastor and Administrator
  accounts can also see Upcoming; a member cannot retrieve a future study or
  its private media.
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
