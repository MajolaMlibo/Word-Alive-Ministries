# Tester Release Guide

## Purpose

This guide covers the next delivery stage: installing Word Alive Ministries as
a standalone app for the pastor and a small tester group. It does not authorise
a public App Store or Google Play release.

## Build profiles

`app/eas.json` defines two EAS Build profiles:

| Profile | Purpose | Distribution |
| --- | --- | --- |
| `preview` | Pastor and small-group testing | Internal only |
| `production` | Future public-store submission | Store workflow only; do not use until release gates are complete |

The `preview` profile deliberately has no developer tools. It is the correct
profile for stakeholder testing because testers install an app rather than use
Expo Go.

## Resolved delivery baseline

1. The existing EAS project belongs to Expo account `mlibo`. Its `owner` value
   in `app/app.json` must continue to match that account unless the project is
   deliberately transferred to an Expo organisation.
2. The approved Android package name and iOS bundle identifier are both
   `com.wordaliveministries.app`. Do not change them after builds have been
   shared or submitted to a store.
3. Android is the first tester platform. The current standalone Android preview
   build finished on 19 November 2026 from merged `main` commit
   `a40203dd4ca808be446cf74a8abcba252ca11542`.
4. This replacement tester APK is visible version `1.0.1` with Android
   `versionCode` `2`, and uses the existing internal `preview` EAS profile.
   Do not change the package identifier.
5. On 20 November 2026, the APK installed on the `Mlibo_AP1` Android virtual
   device and reached its native sign-in screen. It has not completed the
   signed-in or physical-device tests required for external sharing.

## Distribution constraints

- Android internal distribution produces an installable APK and does not need
  Google Play Console access.
- iOS internal distribution uses Apple ad hoc provisioning. Every iPhone must
  be registered before the build and requires Apple Developer Program access.
- TestFlight and public App Store distribution also require Apple Developer
  Program access.
- Google Play publication requires a Google Play Console developer account.
- A direct Android internal-distribution APK link expires. Do not treat an
  expired link as a failed app build; create a fresh preview build instead.
- Android testers must allow installation from the browser or app used to
  download the APK. This is normal Android sideloading, not a Play Store
  installation.

## Required verification before sharing the next Android APK

Before sharing a tester link, install the new preview build on the project
owner's physical Android phone and verify: sign up/sign in, Home, Bible
reading completion, announcements, prayer requests, profile-photo selection,
sign out, and sign back in. Also test the tab bar in Android gesture and
three-button navigation modes. Record the device type, operating-system
version, build URL, source commit, and outcome in the test plan.

Ask every external tester to use a test account and fictitious, non-sensitive
prayer-request text. The current production project is used by the app; do not
ask testers to enter confidential pastoral information or someone else's photo.

## Tester limitations to state clearly

- This is an internal MVP test, not a public Google Play or Apple App Store
  release.
- iPhone distribution requires Apple Developer Program access and either
  registered devices for ad hoc distribution or TestFlight. It is not ready
  for the current tester group.
- Email confirmation opens in the browser. Automatic return through the app's
  custom link has not yet been verified in an installed build.
- Push notifications have not been tested in a standalone build and must not
  be promised to testers.
- Bible passages are fetched from `bible-api.com` when not already cached;
  first-time reading needs an internet connection and the external provider is
  rate-limited.

## Explicitly deferred from public distribution

- Public-store submission or publication.
- Push-notification delivery verification.
- Automatic email-confirmation return to the app.

Both deferred capabilities require a standalone build and their own physical
device tests before any public release.
