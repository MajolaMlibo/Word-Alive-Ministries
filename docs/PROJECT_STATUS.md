# Project Status

## Current milestone

Email and password authentication on the Expo SDK 58 foundation

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

## Current work

The prototype Supabase project contains development-only data. The production
database will be created from the versioned migration in `supabase/migrations`.
On 2026-11-08, the project owner applied
`202611070001_initial_schema.sql` in the new production project's Supabase SQL
Editor and reported `Success. No rows returned`.
- `npm run verify:supabase` was run successfully from `app` with the local,
  Git-ignored production `.env`; Supabase Auth settings responded with HTTP 200.
- The email-and-password authentication implementation is verified on
  `feature/authentication-lifecycle` and is ready for its pull request. Google
  and Apple sign-in are deferred until their providers and platform-specific
  redirect flows are configured.

## Known blockers

- Current study and accessibility queries do not match the prototype schema.
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

## Next feature after this authentication work

Repair the daily-reading completion flow so it uses the production database
function and schema, then verify it on a physical Android device.
