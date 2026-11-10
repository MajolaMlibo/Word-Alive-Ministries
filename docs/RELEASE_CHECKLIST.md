# Release Checklist

## MVP functionality

- [x] Production Supabase project created.
- [x] Initial schema and approved 2026 reading-plan migrations applied.
- [x] Email-and-password authentication verified on an iPhone.
- [x] Daily-reading completion and profile streak verified on an iPhone.
- [x] Study, Calendar, and Profile production-schema repairs verified on an
  iPhone.
- [ ] Verify the Calendar reading-plan markers, selected-day chapters, and
  expandable published study notes on a physical device.
- [ ] Publish confirmed Bible-study events and verify populated views.
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

- [x] Add the `preview` EAS profile for internal tester distribution.
- [x] Confirm the existing EAS project belongs to Expo account `mlibo` and
  align the configured project owner.
- [x] Configure the approved Android package name and iOS bundle identifier:
  `com.wordaliveministries.app`.
- [ ] Create and install the Android preview APK through EAS internal
  distribution.
- [ ] Register authorised iPhone tester devices and create an iOS ad hoc
  preview build, or use TestFlight after Apple Developer access is available.
- [ ] Verify automatic email-confirmation deep linking.
- [ ] Verify push-notification permission, token registration, delivery, and
  tap handling.
- [ ] Verify app-specific photo permission wording.

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
- [ ] Reassess the five remaining moderate Expo build-toolchain advisories with
  a supported Expo update before public-store release; do not use `npm audit
  fix --force` to downgrade the SDK.

## Store readiness

- [ ] Finalise icons, splash screen, screenshots, privacy policy, support
  email, and store descriptions.
- [ ] Visually verify the supplied Android adaptive icon and black-background
  splash screen in an installed Android preview build.
- [ ] Obtain required Google Play Console and Apple Developer access.
- [ ] Create signed Android App Bundle and iOS store builds.
- [ ] Obtain pastor acceptance after a documented stakeholder test session.
