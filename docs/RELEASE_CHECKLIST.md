# Release Checklist

## Internal MVP handover

- [x] Production Supabase project created.
- [x] Initial schema and approved 2026 reading-plan migrations applied.
- [x] Email-and-password authentication verified on an iPhone.
- [x] Daily-reading completion and profile streak verified on an iPhone.
- [x] Study, Calendar, and Profile production-schema repairs verified on an
  iPhone.
- [ ] Publish confirmed Bible-study events and verify populated views.
- [ ] Publish confirmed announcements after the member feed is implemented.
- [x] Implement and verify the member Prayer Requests flow: create, edit,
  delete, private submission, and reload persistence.
- [ ] Verify pastor/admin-only access and content-management actions on a
  physical device.
- [ ] Create an authorised staff content-management process.

## Development-build readiness

- [ ] Create an Expo development build for iOS and Android.
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

- [ ] Register final Android package name and iOS bundle identifier.
- [ ] Finalise icons, splash screen, screenshots, privacy policy, support
  email, and store descriptions.
- [ ] Obtain required Google Play Console and Apple Developer access.
- [ ] Build internal Android and iOS test releases.
- [ ] Obtain pastor acceptance after a documented stakeholder test session.
