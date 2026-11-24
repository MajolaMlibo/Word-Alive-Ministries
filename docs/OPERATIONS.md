# Operations and maintenance

## Responsibilities

- Developer: review crashes and support reports, maintain dependencies and
  backups, test recovery, manage deployments and account access, and verify
  automated jobs. Record device, version, role, expected result, and actual
  result when testing reveals a recurring maintenance task.
- Administrator: publish and archive church content, handle prayers only with explicit prayer-care access, report problems, and confirm which content should remain available.
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

### Deploy private prayer care

Apply supabase/migrations/202611240001_private_prayer_care.sql once in word-alive-prod before testing the updated app. Existing published prayers become private immediately. Previously approved or reviewed requests move to Needs reply. Closed requests stay closed. Older installed clients can still submit private prayers, but their old public-sharing and moderation controls cannot perform those actions.

### Deploy member access management

After the private prayer migration, run supabase/migrations/202611240002_member_access_management.sql once in word-alive-prod. The first migration was confirmed in production on 24 November. The second migration restricts the previous access-management endpoints immediately. Use the updated app for access changes.

Sign into the dedicated administrator account. In More → Admin, scroll the section tabs past Links and tap Members. Search by name or email, tap a member, verify the email, choose a role, then review the before-and-after permissions and confirm Save changes. Pastors automatically get prayer care. An admin requires a separate prayer-care grant. Changes are recorded in public.member_access_history with actor, target, time, and old and new permissions. Pull to refresh or reopen Admin after a change.

Only the verified dedicated account UUID can manage roles and access. Its own role is protected. Existing prayer-care selections remain in effect. If the account is lost, recover the same account through Supabase Auth. Replacing it with a new UUID requires a reviewed database change.

Member replies appear inside My requests when the member opens or refreshes the screen. This feature sends no email or push notifications. Prayer requests and replies have no automatic expiry.
