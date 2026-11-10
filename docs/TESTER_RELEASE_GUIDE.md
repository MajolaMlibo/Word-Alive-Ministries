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

## Required decisions before the first cloud build

1. The existing EAS project belongs to Expo account `mlibo`. Its `owner` value
   in `app/app.json` must continue to match that account unless the project is
   deliberately transferred to an Expo organisation.
2. The approved Android package name and iOS bundle identifier are both
   `com.wordaliveministries.app`. Do not change them after builds have been
   shared or submitted to a store.
3. Confirm whether the first tester group has Android devices, iPhones, or
   both. Build Android first if an Android test device is available.

## Distribution constraints

- Android internal distribution produces an installable APK and does not need
  Google Play Console access.
- iOS internal distribution uses Apple ad hoc provisioning. Every iPhone must
  be registered before the build and requires Apple Developer Program access.
- TestFlight and public App Store distribution also require Apple Developer
  Program access.
- Google Play publication requires a Google Play Console developer account.

## First-build verification

Before sharing a tester link, install the preview build on the project owner's
phone and verify: sign in, Home, Bible reading completion, announcements,
prayer requests, profile-photo selection, sign out, and sign back in. Record
the device type, operating-system version, build URL, and outcome in the test
plan.

## Explicitly deferred from tester distribution

- Public-store submission or publication.
- Push-notification delivery verification.
- Automatic email-confirmation return to the app.

Both deferred capabilities require a standalone build and their own physical
device tests before any public release.
