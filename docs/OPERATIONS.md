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

Apply 202611240003_prayer_inbox_all.sql and 202611240004_pastor_member_directory.sql after the Members migration. Pastors now have a separate read-only Members view with name, role and total registered accounts. Email lookup, permission changes and the full management directory remain restricted to the designated account.

After migration 202611240005_admin_directory_permission.sql, the dedicated administrator can select an admin in Members and grant directory viewing separately from prayer care. Existing prayer access is preserved. Refresh Admin after changes.

### Native password recovery

In the production Supabase project's Authentication URL Configuration, verify Redirect URLs includes wordalive-ministries://auth/callback and the Reset Password email template links to {{ .ConfirmationURL }}. Request a fresh email from the installed app. Open it on the same phone and verify that Reset Password opens, that the new password works, and that an expired link gives feedback. A blank browser before the app opens requires checking the redirect destination and installed app on the device. Never share the token-bearing URL.


## Recovery rehearsal and release identity

Use an isolated target and synthetic test accounts for rehearsal. The project owner
must approve any operation that copies real prayer data, changes credentials,
affects production or incurs charges. Keep backups encrypted outside Git; give
restore access only to the authorised operator. Record date, operator, target
project, backup timestamp, downtime and results without names or prayer text.

1. Identify the source in Supabase → project selector → **word-alive-prod**.
   Write down the source and target project references. They must differ.
   Record the database migration versions, private bucket settings and object
   counts. Protect the original backups from changes during the drill.
2. Use the supported Supabase database backup/restore workflow appropriate to
   the plan. A logical migration needs the roles, schema and table data,
   including Auth identities, plus custom Auth triggers and policies. Verify
   that identities retain their original UUIDs. Inspect a restore log for
   skipped objects or grants before pointing any test client at the target.
   Never run a restore over the production project as a rehearsal.
3. Back up **actual files** from the private avatars and study-media buckets
   using the Storage API. Keep a manifest of bucket, object path, byte size,
   content type and SHA-256 per file. A database backup contains storage
   metadata, not the image bytes. Restore objects into the target's private
   buckets via Storage; reconcile existing metadata with the supported storage
   migration procedure. Verify the manifest paths and digests, open a restored
   published study image as a member, and verify future/private media stays
   restricted. Keep a copy of any reconciliation report for review.
4. Recheck sign-in settings, callback destinations and mail sender on the
   target separately. Use a test mailbox and test destination. Restore a
   synthetic prayer and reply, check the requester and authorised carer see
   it, and check another member cannot. Verify completed reading totals.
5. For the dedicated administrator, compare the Auth user ID to the UUID in
   can_manage_members and verify the role is admin. Sign in with the test
   identity on the isolated target; open More → Administration → Members and
   test a reversible permission change on a synthetic admin. Recreating an
   email address gives a new UUID. If recovery of the original identity is
   impossible, get explicit owner approval for a reviewed UUID-transfer
   migration, preserve the audit trail, revoke the old account and retest.
   Never grant directory write access to all admins to recover one account.
6. The local regression suite restarts a database from its fixture dump and
   checks prayer rows, the access-manager role and image metadata. A hosted
   restore with actual Storage file checksums and sign-in is a separate check.

[Supabase database backups](https://supabase.com/docs/guides/platform/backups) ·
[Supabase CLI restore guide](https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore)

### Email acceptance

In Supabase → word-alive-prod → Authentication → Emails, inspect the SMTP
configuration without sharing credentials. With a consenting tester outside
the Supabase organisation, verify delivery of signup confirmation and recovery
separately. For recovery open the freshest email on the phone with the app
installed, set a password and sign in. Record pass/fail and time only. Do not
send a reset for an unsuspecting member. If delivery fails, inspect Auth and
sender delivery logs. A working developer mailbox alone does not establish
delivery to normal members.

[Supabase email delivery](https://supabase.com/docs/guides/auth/auth-smtp)

### Private media cleanup

Archive published studies. Before deleting a draft, open its editor and remove
each image. A database constraint blocks deleting the study while file records
exist. An interrupted upload retains a record labelled Incomplete upload;
remove it after the upload has stopped, then select the image again. The file
is removed through Storage before its record. Compare the Storage manifest to
study_media periodically to identify unlinked files from older app versions;
confirm provenance and backup before approving any permanent removal.


### Account deletion requests

After deploying the account-request migration, members open More → Profile and
settings → Request account deletion → Submit deletion request. The available
withdrawal action cancels a pending request. No account is erased by submitting
the form. The dedicated access manager opens More → Administration → Members →
Review account deletion requests. Check the queue on a schedule approved by the
church and name a backup operator for absences.

For the public web app, the same site's root with `?account=delete` opens the
deletion page without installation. Signed-out visitors see the purpose and
instructions before sign-in. Set EXPO_PUBLIC_PRIVACY_CONTACT_EMAIL only to a
church-approved monitored inbox. Verify on a signed-out browser and an actual
phone; provide the deployed HTTPS URL in Play Console only after approval.

For fulfilment, use the original authenticated request, verify the Auth UUID
and check the queue again for withdrawal immediately before deletion. For
requests received by email, verify account ownership before processing. Tell
the requester how the church handles its backups and any lawful retention.
Remove privately owned Storage objects via the Storage API first. Handle
ministry-owned study files separately so deleting one staff account does not
erase shared study notes. Remove the verified Auth identity through Supabase
Authentication → Users, after explicit operator approval. Verify disappearance
of the profile, associated personal records, storage paths and request row.
Record completion without copying prayer content into an audit log. If the
requester is the dedicated access manager, arrange the approved ownership
transfer first. Confirm policy, turnaround, public contact and backup retention
with Pastor before publishing store disclosures.
