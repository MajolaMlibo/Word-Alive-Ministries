# Project Status

## Current milestone

Supabase production foundation

## Verified on 2026-11-08

- The application is an Expo SDK 57 React Native TypeScript project.
- `tsc --noEmit` passes for the current Supabase foundation branch.
- The Git `main` branch matched `origin/main` before this feature branch was created.
- No user-facing feature has been verified on a physical device during this audit.

## Current work

The prototype Supabase project contains development-only data. The production
database will be created from the versioned migration in `supabase/migrations`.
On 2026-11-08, the project owner applied
`202611070001_initial_schema.sql` in the new production project's Supabase SQL
Editor and reported `Success. No rows returned`.
- `npm run verify:supabase` was run successfully from `app` with the local,
  Git-ignored production `.env`; Supabase Auth settings responded with HTTP 200.

## Known blockers

- Authentication is bypassed in the current prototype.
- Current study and accessibility queries do not match the prototype schema.
- There are no automated application tests or CI workflows.
- A root-level Node package and approximately 710 tracked `node_modules` files
  are not used by the Expo app. Remove them in a dedicated cleanup branch; do
  not mix that repository-hygiene change into an MVP feature.
- The Android debug build did not complete during the audit; no Android or iOS
  device verification has been completed.

## Next feature after this foundation

Repair the authentication lifecycle and create the member profile automatically
after sign-in, then verify the flow on a physical Android device.
