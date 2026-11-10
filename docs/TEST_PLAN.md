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
| Daily KJV preview | Home displays the first verse of the first scheduled chapter with a KJV label | Verified in Expo Go; pending merge at this documentation baseline |
| Prayer Requests | Submit, edit, delete, private choice, reload persistence, and More navigation | Verified in Expo Go |
| Admin content | Admin-only More item; prayer moderation; create, edit, delete, and publish dynamic ministry content | Pending physical-device verification |
| Home MVP cleanup | Home does not show Stay Encouraged; Admin does not show a Home editor; preserved database data is not changed | Verified on iPhone in Expo Go, 2026-11-10 |
| Ministry colour system | Home navigation uses the standard ministry green and gold; High Contrast is not present in Profile | Verified on iPhone in Expo Go, 2026-11-10 |
| Bible reader text size | Profile has no A/A/A text controls; Bible `Aa` control changes verse text and is retained after reopening the app | Pending physical-device verification |
| Calendar reading plan and notes | Published reading-plan days have gold markers; published studies/events have green markers; selecting a day shows the scheduled chapters and expandable study notes | Pending physical-device verification |
| Ministry links | More shows TikTok, Spotify, WhatsApp Channel, and YouTube in the configured order; each opens its exact destination | Verified on iPhone in Expo Go, 2026-11-10 |
| Ministry-link administration | An admin creates, edits, hides, reorders, and deletes a link; hidden links do not appear to a member | Hide and restore verified on iPhone in Expo Go, 2026-11-10; create, reorder, and delete remain pending |
| More navigation reset | Open Profile or Prayer Requests from More, then tap More again and confirm its menu is restored | Verified manually, 2026-11-10 |

## Required Android checks

- Sign up, sign in, sign out, and session restoration.
- Daily-reading completion, streak refresh, and completed reload state.
- Study, Calendar, and Profile empty states.
- Photo-library selection, upload, and reload persistence.
- KJV preview rendering, cache fallback, and line truncation.
- Ministry colour palette and the removed High Contrast Profile control.
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
