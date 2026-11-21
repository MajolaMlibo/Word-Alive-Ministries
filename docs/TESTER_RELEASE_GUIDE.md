# Tester Release Guide

## Purpose

This guide covers the next delivery stage: installing Word Alive Ministries as
a standalone app for the pastor and a small tester group. It does not authorise
a public App Store or Google Play release.

## Build profiles

`app/eas.json` defines two EAS Build profiles:

| Profile | Purpose | Distribution |
| --- | --- | --- |
| `android` | Pastor and small-group testing | Internal only |
| `production` | Future public-store submission | Store workflow only; do not use until release gates are complete |

The `android` profile deliberately has no developer tools. It is the correct
profile for stakeholder testing because testers install an app rather than use
Expo Go.

## Current Android tester build

- **Version:** `1.0.2` / Android `versionCode` `5`
- **Source:** merged `main` commit `60771a946b7731e3c84e1143f4ff4fa3acbf70ea`
- **Package:** `com.wordaliveministries.app`
- **Build profile:** `android` (internal distribution)
- **Install link:** <https://expo.dev/artifacts/eas/aQfEIaqh-OI-okcqNUXdVTaChClLN_Lr3m6PHcvTuWw.apk>
- **Link expiry:** 5 December 2026

On 21 November 2026, build 5 installed on the `Mlibo_AP1` Android virtual
device, opened the standalone Word Alive Ministries package rather than Expo
Go, and restored the signed-in Home screen after a force-close/relaunch. This
is sufficient smoke-test evidence for Pastor's first Android tester release.
It is not evidence that all member flows work on every physical Android phone.

The older builds 2 and 3 must not be shared because they reproduced a
standalone sign-in session defect. Build 4 predates the Bible verse-action and
visual Admin-editor work. The duplicate build request created while build 5
status was delayed was cancelled; it has no installer artifact.

## Distribution constraints

- Android internal distribution produces an installable APK and does not need
  Google Play Console access.
- iOS internal distribution uses Apple ad hoc provisioning. Every iPhone must
  be registered before the build and requires Apple Developer Program access.
- TestFlight and public App Store distribution also require Apple Developer
  Program access.
- Google Play publication requires a Google Play Console developer account.
- A direct Android internal-distribution APK link expires. Do not treat an
  expired link as a failed app build; create a fresh Android build instead.
- Android testers must allow installation from the browser or app used to
  download the APK. This is normal Android sideloading, not a Play Store
  installation.

## Pastor tester scope

Pastor is the first Android tester for build 5. Ask him to report the phone
model, Android version, and a screenshot or screen recording for any problem.
The priority checks are sign in, Home, Bible reading completion, announcements,
Prayer Requests, Profile photo selection, sign out/sign back in, and the five
bottom tabs. If his device offers gesture and three-button navigation, test
both. Record the result in `docs/TEST_PLAN.md` before claiming a feature is
physically verified.

**Known required check:** In Admin, select text in a Notice or Study note and
try bold, heading, and another formatting control. The visual formatting
controls need physical-Android confirmation: automated emulator input worked,
but manual virtual-device use did not reliably change selected text.

Ask every external tester to use a test account and fictitious, non-sensitive
prayer-request text. The current production project is used by the app; do not
ask testers to enter confidential pastoral information or someone else's photo.

## Tester limitations to state clearly

- This is an internal MVP test, not a public Google Play or Apple App Store
  release.
- iPhone distribution is deferred to the final-release milestone because the
  project does not currently have Apple Developer Program membership. It will
  use TestFlight after enrolment and a separate iOS build.
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
