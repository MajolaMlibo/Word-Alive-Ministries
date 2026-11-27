# Test Plan

Record recurring maintenance findings and role handoffs in [Operations and maintenance](OPERATIONS.md).

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

For the reading-integrity guard, also run:

```powershell
npm run test:release
npm run audit:reading-references
```

`audit:reading-references` reports source-plan faults without changing data.
It is not a substitute for the read-only production report or staff review.
The three `expo export` commands create artifacts; obtain owner approval before
running them as part of a release audit.

### Build 7 integration checks

Run the complete local suite only after installing dependencies from the locked
package file:

```powershell
npm ci
npm run test:release
```

The suite includes reading-reference validation and reader links, optional-plan
membership and the ministry-wide streak, named study comments, notice reads,
study/saved-verse cursor paging, editor behaviour, private-care/RLS fixtures,
and Bible cache behaviour. These are local fixtures, not production or native
push verification. Do not run a build without separate owner approval.

`verify:supabase` checks that the public Supabase URL and publishable key can
reach Auth settings. It does not test member permissions or write database
data.

On 2026-11-19, `fix/expo-sdk58-patch-alignment` produced 20 of 20 passing
`npx expo-doctor` checks and a passing TypeScript check. Android build 5 was
then created from merged `main` with the aligned dependencies.

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

Notice editor readiness: run `node scripts/test-editor-bridge.cjs` from the app
directory. In Expo Go reopen a saved notice, then create and reopen a Draft
containing a final-line marker. If the visual editor fails to initialise, the
basic editor should show the saved message and accept input. Verify persistence
on device before publishing. The bridge test uses a simulated message sink.

Notice editor regression: open an existing multiline notice, verify its last line, edit a draft, save and reopen it. The embedded editor script must parse before typing or formatting can report changes. Device verification pending.

| Test | Expected result | Current evidence |
|---|---|---|
| Standalone app launch and saved session | The signed APK installs, Android opens the app's own package, and a saved authenticated session opens Home rather than Expo Go, a crash, or Sign In | Verified on the `Mlibo_AP1` Android virtual device, 2026-11-21, using EAS Android build 5 from commit `60771a946b7731e3c84e1143f4ff4fa3acbf70ea`. It is version `1.0.2` / Android `versionCode` `5`. It returned to the signed-in Home screen after force-close/relaunch. Physical Android verification remains pending. |
| Android sign-in legibility | In Light and Dark appearance, every Sign In and Sign Up field placeholder is readable. A mixed-case email is visibly converted to lowercase; names and passwords retain their typed casing. | Code reviewed and light/dark Expo Go check completed on `Mlibo_AP1`, 2026-11-10; signed APK and physical Android checks pending |
| Account registration and keyboard flow | Sign Up requires clear First name and Surname fields; Enter advances through the form; final Enter creates the account. Sign In password Enter submits. Bible Search Enter submits a complete reference. | Expo Go verification on the `Mlibo_AP1` Android virtual device, 2026-11-19: a dedicated Administrator account saved separate name and surname values; password Enter signed in; `John 3:16` Search opened the reference. In standalone preview build 4 on 2026-11-20, the Administrator sign-in persisted for 15 seconds and after a force-close/relaunch. The original build 2 and 3 session defect is resolved on that virtual device. Full sign-up and keyboard-flow checks in the signed APK, physical Android, and iOS remain pending. |
| Existing-account and password-reset guidance | Sign-up confirmation must not disclose whether an email account exists. It offers Sign In; Forgot password sends neutral recovery instructions, and the recovery link opens the in-app new-password screen. | **IMPLEMENTED — REAL-DEVICE VERIFICATION REQUIRED.** `fix/auth-signup-feedback` uses Supabase's `PASSWORD_RECOVERY` event and `updateUser` flow. Test with a real confirmed account and its email link; do not use the observed wording as proof that an account exists. |
| More-menu sign out | Profile contains no sign-out button. The main More menu displays one ministry-green outlined Sign out action beneath official ministry links; it confirms before clearing only the local session. | **IMPLEMENTED — REAL-DEVICE VERIFICATION REQUIRED.** Verify member and admin accounts, then restart the app and confirm Sign In appears. |
| Study-image lightbox | Tapping a study-note image leaves the study card open and opens the selected image in a full-screen viewer with a visible close control. | **IMPLEMENTED — REAL-DEVICE VERIFICATION REQUIRED.** Verify with a published study containing at least one real image. |
| Home announcement deck | Home presents one notice card with up to two visible cards behind it. The initial hint has no arrow; left swipe marks an unread card read and moves it to the bottom, right swipe sends the current card to the back, and the hint is hidden after the first swipe. Read more appears only for a collapsed long message and expands the content. | **IMPLEMENTED — PHYSICAL ANDROID VERIFICATION REQUIRED.** Test at least three notices, including a long formatted notice, plus a notice with an external link. |
| Daily streak after a missed day | If the signed-in member has no completion on the current South African calendar date, Home and Profile each display `0`, regardless of an older saved completion. Completing today's reading then displays a streak of `1` or more. | Verified in Expo Go on the `Mlibo_AP1` Android virtual device, 2026-11-19: a controlled stale value of `7` for the dedicated Administrator account refreshed to `0` in both Home and Profile. The production migration succeeded. Signed-APK and physical Android/iOS checks remain pending. |
| Daily-reading progress for Pastor/Admin | A Pastor or Administrator sees only their own completion state for today's reading, even when other members have completed the same reading. | `fix/admin-daily-reading-progress` adds the authenticated user's `user_id` filter before its single-row lookup. TypeScript check passed on 2026-11-21. Physical Android verification is pending. |
| Android system-navigation clearance | In both gesture and three-button modes, Home, Calendar, Bible, Study, and More labels remain visible and tappable above the Android navigation area. | Current source verified only in Expo Go on `Mlibo_AP1`, 2026-11-18; a replacement signed APK and physical Android checks are pending |
| Android launcher icon safe area | The installed app icon shows the complete Word Alive Ministries logo inside the launcher mask without cropped edges on both the normal and themed-icon settings. | **IMPLEMENTED — NEW ANDROID APK REQUIRED.** Test on at least one Samsung launcher; Android controls whether the long launcher label is visually truncated. |
| Bible reader navigation | The Read tab opens with a compact current-passage control. Choosing Change opens book and chapter selection; selecting a chapter opens it and closes the selector. The selector and reader text scroll together, while the existing verse actions, saved verses, and reader-size control remain usable. | **IMPLEMENTED — PHYSICAL ANDROID VERIFICATION REQUIRED.** Test opening a chapter through the selector, direct `Book chapter:verse` search, chapter arrows, long-text scrolling, text-size selection, and verse actions. |
| Bible verse actions | Selecting one or more KJV verses opens working actions. Highlights, bookmarks, and a single-verse private note persist after reload. Copy and native Share expose the selected verse text. Members cannot read another member's saves. | On `Mlibo_AP1` in Expo Go, 2026-11-20: the action panel displayed; Joel 1:1 bookmark saved, appeared in Saved verses, and persisted after force-close/relaunch. The temporary test bookmark was removed. Highlight, note, copy, Share, RLS isolation, and signed-APK checks remain pending. |
| Admin visual editor and edit-state safety | Opening an existing Notice or Study loads its saved content; formatting controls work after selecting text; long notes remain scrollable while the keyboard is open; and choosing another Notice or Study with unsaved changes requires an explicit discard decision. Published content renders supported formatting without Markdown markers. | **IMPLEMENTED — PHYSICAL ANDROID VERIFICATION REQUIRED.** The original visual controls failed during manual `Mlibo_AP1` use on 2026-11-20 and again on 2026-11-21. `fix/admin-editor-state` added per-record editor remounting, ready-state protection, scrolling, keyboard safety, and unsaved-change prompts. `fix/admin-editor-toolbar` then moved the formatting controls inside the WebView to preserve Android text selection and prevent duplicate touch commands. TypeScript validation passed on 2026-11-21. Verify every format action, existing-content hydration, discard prompt, and keyboard visibility on a physical Android device before accepting the feature. |
| Study-note images | An authorised administrator can add up to six JPG, PNG, or WebP images to a saved study. Members can view images on the published Study card; images remain unavailable for drafts and unauthorised users. | Production migration `202611200003_add_study_media.sql` succeeded on 2026-11-20. On `Mlibo_AP1` in Expo Go, the Admin form displayed the image workflow and correctly required a saved study before uploads. Real image upload, published member view, access control, and signed-APK checks remain pending. |

| Study schedule visibility | Signed-in members see published studies dated today or earlier in South Africa. Only Pastor and Administrator accounts see Upcoming. | Expo Go, 2026-11-22: Admin saw the future test study and opened its image. A member saw neither the Upcoming tab nor the future study, saw the same study under Today and Past after date changes, opened and closed its full-screen image, and could no longer see the study after archiving. Production policy presence was checked on 2026-11-21. Separate Pastor-account, direct database/Storage access, and standalone Android checks remain pending. |

- Sign up, sign in, sign out, and session restoration.
- Daily-reading completion, streak refresh, and completed reload state.
- Study, Calendar, and Profile empty states.
- Photo-library selection, upload, and reload persistence.
- KJV preview rendering, cache fallback, and line truncation.
- Ministry colour palette and the removed High Contrast Profile control.
- System Light and Dark appearance, including Sign In and Sign Up placeholders.
- Bible reader text-size controls on small and large devices.

## Required development-build checks

Home notice regression: use three read notices and one short multiline message
that wraps to four lines. Verify expansion reveals the last line, the counter
advances and wraps, both swipe directions work on read cards, and tapping the
counter advances the deck. Repeat with larger phone text. Device check pending.

- Email confirmation automatically returns through
  `wordalive-ministries://auth/callback`.
- App-specific iOS photo permission wording is displayed.
- Push-notification registration, receipt, and tap handling.

## Test evidence

For every manual test, record the device platform, date, app branch or commit,
steps taken, observed result, and screenshot or error log if the result fails.
Update `PROJECT_STATUS.md` after a meaningful verification result.

## Current Android tester baseline

The current Pastor tester build is build 5 from merged `main` commit
`60771a946b7731e3c84e1143f4ff4fa3acbf70ea`. It is version `1.0.2`, Android
`versionCode` `5`, uses package `com.wordaliveministries.app`, and is
documented with its installer link and expiry in `TESTER_RELEASE_GUIDE.md`.
On 2026-11-21 it installed, launched, and restored a saved signed-in session
to Home on the `Mlibo_AP1` virtual device. Pastor's physical-device results
are the next acceptance evidence; Admin visual formatting remains a specific
physical-device check.

On 23 November 2026 the physical Samsung Galaxy A26 reproduced rapid-input corruption in the admin notice editor. After the change to preserve the WebView selection during typing, USB-DRAFT-56-R2 saved both lines exactly. Editing added a third line. After a full app restart, the signed-in admin reopened the draft from Notices and all three lines matched exactly. Both test notices remained drafts. This check used the local USB debug app. The project owner then confirmed that notice formatting survived saving and reopening on the same Samsung. Coverage of individual toolbar commands, study editing, iOS and the release APK remains pending.

### Grouped admin readings

Run `node app/scripts/test-admin-reading-months.cjs` from the repository root. Simulated queries cover November and December 2026, every month of 2027, and an empty month. Checks also cover all 365 day numbers, a leap year and out-of-plan dates. On 23 November 2026 an isolated Edge test of ReadingsManager with in-memory services verified November expansion/collapse, switching to a future plan, entering a date, and saving a January 4 draft while browsing February. January opened and the saved row scrolled into the viewport. Real account integration and physical-device interaction remain pending. Use a test database for writes.

### Private prayer care

The disposable PostgreSQL test in app/scripts/test-private-prayer-care.cjs uses the actual baseline prayer tables, the migration, simulated Supabase identities and the authenticated database role. Supply @electric-sql/pglite on NODE_PATH and run node app/scripts/test-private-prayer-care.cjs. It checks legacy conversion, owner-only pending edits, private submission, delegation separate from reading, revocation, reply retry, closure, history, name search and pagination across 107 requests.

Android acceptance pending: submit a fictional prayer as a member, reply as pastor, reopen My requests as the submitting member, and confirm the reply text, responder and date. Confirm ordinary admins have no Prayer section, selected admins can search, and the dedicated admin without prayer-care access sees Members and has no Prayer inbox. Test a failed send and retry with the keyboard visible. Use fictional text only.

Prayer card check: expand and collapse a long staff request. Its text appears once in both states. In My requests, pending shows two grey ticks, replied shows two blue ticks, and closed shows one grey tick. Tap the ticks or use the screen reader to hear the status. Staff filters retain text labels.

### Member management

The disposable database test applies the Members migration after the prayer-care scenarios. It covers the owner, pastor, ordinary admin and member, the old grant endpoint, direct profile list visibility, search by email, role filtering, two directory pages across 35 accounts, self-demotion, conflicting edits, grants and revocations, audit rows and continued pastoral prayer access.

Device check pending: verify Members appears after Links only for the dedicated account, inspect a test member, cancel a proposed change, then save a test change. Refresh the target account to verify the effect. Restore the test member's original access afterwards.

Admin search: in Prayer and Members, search with the magnifier or keyboard, select a filter, and clear each control independently. Clearing text keeps the filter; clearing filters restores Needs reply or All and keeps the applied search. From member details the header arrow returns to the filtered list; tapping it again opens More.

Prayer opens on Needs reply. All includes every status, preserves per-request reply and close controls, and is the target of Clear filters. Confirm both the magnifier and keyboard Search dismiss the keyboard and run the query.

Remembered sign-in: sign in, sign out, then reopen. Confirm only the last successful email is prefilled. Change account, try a failed sign-in, verify the prefilled email remains editable, and check Create Account opens with a blank email. Test password-manager suggestions on an enrolled phone; saving and unlocking credentials are controlled by the phone.

Member directory: compare the total across search, role filters and Load more. As pastor, check names and roles are visible with no email or editing controls. As an ordinary admin or member, verify the directory and count are unavailable.

Verify the directory-only admin sees names, roles and count without access to private prayers. Local database tests passed for all four permission combinations, revocation, older clients, role changes and audit records.

Admin Readings device check: at the top of New daily reading, tap the year-plan control and select the 2027 Align and Prosper plan. Open December and check 31 December, Day 365, MALACHI 1-4. Compare with the pastor on the same app revision. Check the gap below an expanded month for both populated and empty months. In a test plan verify selecting a date calculates the day and that a date outside the plan year cannot be saved. In Reading checks, verify Current & upcoming lists every deliberately invalid test reference, Review and fix opens its plan/month, a recognised book/chapter range saves, and a bad range cannot be saved. Confirm a legacy bad reference can be archived rather than trapping the editor. With a test reading of `2 John 1; 3 John 1`, verify both passage buttons appear in Read and each opens its matching chapter.
Run `node app/scripts/test-admin-reading-months.cjs` from the repository root. Five simulated query cases cover November 2026, December rollover, January 2027, records beyond the previous 500-row cutoff, and an empty month. On 23 November 2026 an isolated Edge test of ReadingsManager with in-memory services verified November expansion/collapse, switching to a future plan, entering a date, and saving a January 4 draft while browsing February. January opened and the saved row scrolled into the viewport. Real account integration and physical-device interaction remain pending. Use a test database for writes.

### Bible verse selection controls

On Android, scroll to the last verse of a long chapter and select it. Verify Verse actions (1) appears above the app tabs, select another verse to check the count, open and dismiss the actions, then clear the selection. Check the final verse is reachable and the chapter stays at the same reading position. TypeScript and simulated control checks passed. On 24 November 2026 the owner also reported that selecting two verses at chapter end showed the correct count, opening and closing the tools preserved the reading position, and clearing the selection hid the toolbar.

Android keyboard checks, 24 November 2026: the owner confirmed the Confirm password field stayed visible while typing and the Create account button could be scrolled into view with the keyboard open. This check covered layout only. On Sign In, the owner confirmed that one tap on the on-screen Sign In button with the keyboard open took an existing account to Home. Check 4 (large system text) remains pending. Checks 5 and 6 (email link opens Reset Password, password fields and save remain reachable, and sign-in succeeds with the changed password) await a physical Android test on a version containing PR #61. The private Bible note result is recorded below.

On 24 November 2026 the owner reported that the open reader followed both Android theme changes without reopening. Gold, Green, Blue and Pink labels, highlighted words and verse numbers passed the readability check in both themes.

Owner confirmed the verse tools stay at the bottom on the selection branch. On 24 November 2026, while testing the combined Bible changes, the owner confirmed that the private note text stayed visible with the keyboard open and that highlights were easier to see in dark mode. The owner also tapped Save private note with the keyboard open, reopened the same verse, and confirmed both lines matched the text entered.
