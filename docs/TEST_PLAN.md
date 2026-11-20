# Test Plan

## Test approach

Each feature must pass TypeScript validation, a relevant backend check where
applicable, and a real-device test before it is described as verified. iPhone
verification does not prove Android compatibility.

## Automated checks

Run these commands from `C:\Dev\Word Alive Ministries\app`:

```powershell
npx tsc --noEmit
npm run verify:supabase
npx expo config --type public
npx expo export --platform web
npx expo export --platform ios
npx expo export --platform android
```

`verify:supabase` checks that the public Supabase URL and publishable key can
reach Auth settings. It does not test member permissions or write database
data.

On 2026-11-19, `fix/expo-sdk58-patch-alignment` produced 20 of 20 passing
`npx expo-doctor` checks and a passing TypeScript check. The next Android
preview APK must be created only after this branch is merged.

The web export is a bundling check only. It does not prove iOS or Android
native behaviour.

## Verified iPhone checks

| Area | Verified behaviour | Status |
|---|---|---|
| Authentication | Sign up, email confirmation in browser, sign in, sign out, and existing-account sign in | Verified in Expo Go |
| Daily reading | Today's South African-date reading loads, completion updates the streak, completed state survives reload | Verified in Expo Go |
| Guided reading | Incomplete daily reading opens the Read tab at the scheduled first chapter; completion restores the saved personal position | Verified in Expo Go |
| Study and Calendar | Correct empty states when no published studies exist; no old `chapter` field is displayed | Verified in Expo Go |
| Profile | Streak and completed total display separately; private photo upload survives reload | Verified in Expo Go |
| Profile/Home handoff | Confirm sign-out, confirm local session clears, sign back in, then confirm the private profile photo appears in Home after navigating from Profile | Pending device verification |
| Daily KJV preview | Home displays the first verse of the first scheduled chapter with a KJV label | Verified in Expo Go on a physical iPhone, 2026-11-09 |
| Prayer Requests | Submit, edit, delete, private choice, reload persistence, and More navigation | Verified in Expo Go |
| Admin content | Admin-only More item; prayer moderation; create, edit, delete, and publish dynamic ministry content | Core role-gated flow verified on a physical iPhone; Reading Plan and Daily Reading edit/save remain pending |
| Home MVP cleanup | Home does not show Stay Encouraged; Admin does not show a Home editor; preserved database data is not changed | Verified on iPhone in Expo Go, 2026-11-10 |
| Ministry colour system | Home navigation uses the standard ministry green and gold; High Contrast is not present in Profile | Verified on iPhone in Expo Go, 2026-11-10 |
| Bible reader text size | Profile has no A/A/A text controls; Bible `Aa` control changes verse text and is retained after reopening the app | Verified on iPhone in Expo Go, 2026-11-10 |
| Calendar reading plan and notes | Published reading-plan days have gold markers; selecting a day shows scheduled chapters; published studies/events have green markers and expandable notes | Reading-plan markers and chapters verified on iPhone in Expo Go, 2026-11-10; study/event notes pending real published content |
| Ministry links | More shows TikTok, Spotify, WhatsApp Channel, and YouTube in the configured order; each opens its exact destination | Verified on iPhone in Expo Go, 2026-11-10 |
| Ministry-link administration | An admin creates, edits, hides, reorders, and deletes a link; hidden links do not appear to a member | Hide and restore verified on iPhone in Expo Go, 2026-11-10; create, reorder, and delete remain pending |
| More navigation reset | Open Profile or Prayer Requests from More, then tap More again and confirm its menu is restored | Verified manually, 2026-11-10 |
| System light and dark appearance | Switch the phone appearance between Light and Dark. Screens use the matching ministry palette without unreadable text or invisible controls. | Android virtual-device Expo Go check passed, 2026-11-10; signed-build and physical-device checks pending |
| Android bottom navigation inset | App-tab labels remain above Android system navigation. The More label remains `More` while nested More screens are open. | Verified in Expo Go on the `Mlibo_AP1` Android virtual device, 2026-11-18; physical gesture- and three-button-navigation checks pending |

## Required Android checks

| Test | Expected result | Current evidence |
|---|---|---|
| Standalone app launch | The signed APK installs, Android opens the app's own package, and the member sees the app sign-in screen rather than Expo Go or a crash | Verified on the `Mlibo_AP1` Android virtual device, 2026-11-20, using EAS preview build 2 from commit `a40203dd4ca808be446cf74a8abcba252ca11542`. It is version `1.0.1` / Android `versionCode` `2`. |
| Android sign-in legibility | In Light and Dark appearance, every Sign In and Sign Up field placeholder is readable. A mixed-case email is visibly converted to lowercase; names and passwords retain their typed casing. | Code reviewed and light/dark Expo Go check completed on `Mlibo_AP1`, 2026-11-10; signed APK and physical Android checks pending |
| Account registration and keyboard flow | Sign Up requires clear First name and Surname fields; Enter advances through the form; final Enter creates the account. Sign In password Enter submits. Bible Search Enter submits a complete reference. | Verified in Expo Go on the `Mlibo_AP1` Android virtual device, 2026-11-19: a dedicated Administrator account saved separate name and surname values; password Enter signed in; `John 3:16` Search opened the reference. Android preview builds 2 and 3 briefly opened Home after sign-in, then returned to Sign in. `fix/auth-event-session-state` must be verified in preview build 4. Physical Android/iOS checks remain pending. |
| Daily streak after a missed day | If the signed-in member has no completion on the current South African calendar date, Home and Profile each display `0`, regardless of an older saved completion. Completing today's reading then displays a streak of `1` or more. | Verified in Expo Go on the `Mlibo_AP1` Android virtual device, 2026-11-19: a controlled stale value of `7` for the dedicated Administrator account refreshed to `0` in both Home and Profile. The production migration succeeded. Signed-APK and physical Android/iOS checks remain pending. |
| Android system-navigation clearance | In both gesture and three-button modes, Home, Calendar, Bible, Study, and More labels remain visible and tappable above the Android navigation area. | Current source verified only in Expo Go on `Mlibo_AP1`, 2026-11-18; a replacement signed APK and physical Android checks are pending |

- Sign up, sign in, sign out, and session restoration.
- Daily-reading completion, streak refresh, and completed reload state.
- Study, Calendar, and Profile empty states.
- Photo-library selection, upload, and reload persistence.
- KJV preview rendering, cache fallback, and line truncation.
- Ministry colour palette and the removed High Contrast Profile control.
- System Light and Dark appearance, including Sign In and Sign Up placeholders.
- Bible reader text-size controls on small and large devices.

## Required development-build checks

- Email confirmation automatically returns through
  `wordalive-ministries://auth/callback`.
- App-specific iOS photo permission wording is displayed.
- Push-notification registration, receipt, and tap handling.

## Test evidence

For every manual test, record the device platform, date, app branch or commit,
steps taken, observed result, and screenshot or error log if the result fails.
Update `PROJECT_STATUS.md` after a meaningful verification result.

## Current Android tester baseline

The current failed preview baseline was created from merged `main` commit
`281ba3334f0448de19e77664fa07f0b0ac0e8355`. It is version `1.0.1`, Android
`versionCode` `3`, and uses the approved package
`com.wordaliveministries.app`. On 2026-11-20, its APK installed and reached the
native sign-in screen on the `Mlibo_AP1` Android virtual device, but its
signed-in session returned to Sign in. It must not be shared externally.
Preview build 4 will retest the event-state correction, then complete the
physical Android tests against the rows above before external tester
distribution.
