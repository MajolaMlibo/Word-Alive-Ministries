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
| Standalone app launch | The signed APK installs, Android opens the app's own package, and the member sees the app sign-in screen rather than Expo Go or a crash | Verified on the `Mlibo_AP1` Android virtual device, 2026-11-20, using EAS preview build 4 from commit `e58edeb4cac8a0d591b5a9ec19782ff1089b7a9c`. It is version `1.0.1` / Android `versionCode` `4`. Physical Android verification remains pending. |
| Android sign-in legibility | In Light and Dark appearance, every Sign In and Sign Up field placeholder is readable. A mixed-case email is visibly converted to lowercase; names and passwords retain their typed casing. | Code reviewed and light/dark Expo Go check completed on `Mlibo_AP1`, 2026-11-10; signed APK and physical Android checks pending |
| Account registration and keyboard flow | Sign Up requires clear First name and Surname fields; Enter advances through the form; final Enter creates the account. Sign In password Enter submits. Bible Search Enter submits a complete reference. | Expo Go verification on the `Mlibo_AP1` Android virtual device, 2026-11-19: a dedicated Administrator account saved separate name and surname values; password Enter signed in; `John 3:16` Search opened the reference. In standalone preview build 4 on 2026-11-20, the Administrator sign-in persisted for 15 seconds and after a force-close/relaunch. The original build 2 and 3 session defect is resolved on that virtual device. Full sign-up and keyboard-flow checks in the signed APK, physical Android, and iOS remain pending. |
| Daily streak after a missed day | If the signed-in member has no completion on the current South African calendar date, Home and Profile each display `0`, regardless of an older saved completion. Completing today's reading then displays a streak of `1` or more. | Verified in Expo Go on the `Mlibo_AP1` Android virtual device, 2026-11-19: a controlled stale value of `7` for the dedicated Administrator account refreshed to `0` in both Home and Profile. The production migration succeeded. Signed-APK and physical Android/iOS checks remain pending. |
| Android system-navigation clearance | In both gesture and three-button modes, Home, Calendar, Bible, Study, and More labels remain visible and tappable above the Android navigation area. | Current source verified only in Expo Go on `Mlibo_AP1`, 2026-11-18; a replacement signed APK and physical Android checks are pending |
| Bible verse actions | Selecting one or more KJV verses opens working actions. Highlights, bookmarks, and a single-verse private note persist after reload. Copy and native Share expose the selected verse text. Members cannot read another member's saves. | On `Mlibo_AP1` in Expo Go, 2026-11-20: the action panel displayed; Joel 1:1 bookmark saved, appeared in Saved verses, and persisted after force-close/relaunch. The temporary test bookmark was removed. Highlight, note, copy, Share, RLS isolation, and signed-APK checks remain pending. |
| Admin formatted writing | The Notice message, Study notes, Reading Plan description, and Daily Reading reflection fields offer visual bold, italic, heading, bullet, numbered-list, quote, and clear-formatting controls. Published content renders supported formatting without Markdown markers. | On `Mlibo_AP1` in Expo Go, 2026-11-20: the original visual controls failed to apply formatting. The branch now uses native controls that issue a command directly to the loaded editor and preserve the selected editor range. Selected test text was visibly bolded and then changed into a visibly larger heading. On 2026-11-21, the project owner independently confirmed Heading formatting. The test content was not saved. Italic, lists, quote, clear formatting, save/reload persistence, member rendering, and signed-APK checks remain pending. |
| Study-note images | An authorised administrator can add up to six JPG, PNG, or WebP images to a saved study. Members can view images on the published Study card; images remain unavailable for drafts and unauthorised users. | Production migration `202611200003_add_study_media.sql` succeeded on 2026-11-20. On `Mlibo_AP1` in Expo Go, the Admin form displayed the image workflow and correctly required a saved study before uploads. Real image upload, published member view, access control, and signed-APK checks remain pending. |

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

The current candidate preview baseline was created from merged `main` commit
`e58edeb4cac8a0d591b5a9ec19782ff1089b7a9c`. It is version `1.0.1`, Android
`versionCode` `4`, and uses the approved package
`com.wordaliveministries.app`. On 2026-11-20, its APK installed on the
`Mlibo_AP1` Android virtual device. A dedicated Administrator account stayed
signed in for at least 15 seconds and, after a force-close and normal relaunch,
opened Home rather than Sign In. This resolves the build 2/3 session defect on
the virtual device. Complete the physical Android tests against the rows above
before external tester distribution.
