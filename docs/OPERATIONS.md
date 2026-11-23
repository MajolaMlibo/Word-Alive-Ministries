# Operations and maintenance

## Responsibilities

- Developer: review crashes and support reports, maintain dependencies and
  backups, test recovery, manage deployments and account access, and verify
  automated jobs. Record device, version, role, expected result, and actual
  result when testing reveals a recurring maintenance task.
- Administrator: publish and archive church content, review prayer requests
  privately, report problems, and confirm which content should remain available.
- Pastor or church owner: approve retention rules and decide what belongs in
  the long-term ministry archive before the developer enables deletion.

## Retention proposals for review

| Data | Recommended starting point |
| --- | --- |
| Notices | Hide on expiry. Consider archiving expired notices after 90 days. Consider deletion after six months only for confirmed disposable notices, with the clock defined before automation. |
| Studies and images | Keep published past studies available as a ministry library. Review temporary or superseded material separately and track Storage size. |
| Prayer requests | Agree a separate policy for closed requests with the church. Restrict access and collect only what is needed. |
| Accounts and reading progress | Handle separately from content cleanup. Preserve user-owned progress unless an approved account or data-deletion process applies. |

Review actual row counts, Storage use, and app performance before deciding
whether cleanup is needed. Before enabling deletion, define the date that
starts the retention period, preview eligible records, and test backup recovery.
Delete files through the Storage API and verify the associated records and files
are reconciled. These are proposals. No automatic archive or deletion is enabled
by this document.

## Refresh and release cadence

- Evaluate refreshing Home and Study when their screens regain focus or the app
  returns to the foreground, with pull-to-refresh as a manual fallback. Test
  stale data, offline recovery, and repeated navigation before release.
- Review feedback, crashes, slow screens, and Storage use monthly. Prioritise
  broken journeys and recurring friction. Use aggregate counts and keep private
  prayer text and personal data out of feedback and analytics logs.
- Treat app releases as a separate decision from content refresh. Test changes
  before distributing an update and ship urgent fixes outside the monthly review
  when needed.

### Native password recovery

In the production Supabase project's Authentication URL Configuration, verify Redirect URLs includes wordalive-ministries://auth/callback and the Reset Password email template links to {{ .ConfirmationURL }}. Request a fresh email from the installed app. Open it on the same phone and verify that Reset Password opens, that the new password works, and that an expired link gives feedback. A blank browser before the app opens requires checking the redirect destination and installed app on the device. Never share the token-bearing URL.
