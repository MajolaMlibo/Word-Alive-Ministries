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

The pastor automatically has prayer-care and access-management rights. In More → Admin → Prayer → Manage prayer-care access the pastor selects existing admins. An ordinary admin starts without access. Role changes clear delegated prayer permissions. Have the app refresh after access changes.

To provision the developer's designated management account, first verify the exact account UUID and identity in Authentication → Users and confirm it is the designated admin. As database owner, run the following after substituting its verified UUID. One returned row confirms the assignment. Zero rows means the account does not have the admin role. This grants delegation and preserves the account's existing reading permission.

```sql
insert into public.prayer_care_access (user_id, may_delegate)
select user_id, true from public.user_roles
where user_id = '<verified-admin-uuid>'::uuid and role = 'admin'
on conflict (user_id) do update set may_delegate = true
returning user_id, may_read, may_delegate;
```

Member replies appear inside My requests when the member opens or refreshes the screen. This feature sends no email or push notifications. Prayer requests and replies have no automatic expiry.
