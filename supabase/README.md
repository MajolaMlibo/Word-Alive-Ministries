# Supabase database source of truth

`migrations/202611070001_initial_schema.sql` defines the first production-ready
database contract for Word Alive Ministries.

It is designed for a new Supabase project. Do not run the old prototype seed
script, especially `backend/Query_2.txt`, against a project containing church
or member data because it starts with `TRUNCATE`.

Before applying the migration, create a separate Supabase project for the real
application. Apply the migration to that project first, create the first pastor
account through Supabase Auth, and then assign that account the `pastor` role
through the SQL editor. Role changes are deliberately not available from the
mobile client yet: allowing a content manager to edit this table would allow
privilege escalation. No service-role key belongs in the mobile app or in an
Expo public environment variable.

After the pastor has signed up, assign the role with their Auth user UUID:

```sql
update public.user_roles
set role = 'pastor'
where user_id = 'the-auth-user-uuid';
```
