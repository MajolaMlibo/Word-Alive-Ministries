// Verify the supporting indexes and the keyset ordering used by the app.
const { PGlite } = require('@electric-sql/pglite');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const migration = (file) => readFileSync(resolve(__dirname, '../../supabase/migrations', file), 'utf8');

async function collectPages(fetchPage) {
  const collected = [];
  let cursor = null;

  do {
    const rows = await fetchPage(cursor);
    const page = rows.slice(0, 25);
    collected.push(...page);
    cursor = rows.length > 25 ? page.at(-1) : null;
  } while (cursor);

  return collected;
}

(async () => {
  const db = new PGlite();
  const rows = async (sql, args = []) => (await db.query(sql, args)).rows;

  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth; grant usage on schema auth to authenticated;
      create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
      create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);`);
    await db.exec(
      migration('202611070001_initial_schema.sql')
        .split('insert into storage.buckets')[0]
        .replace('create extension if not exists pgcrypto;', '') + 'commit;'
    );
    await db.exec(migration('202611200002_add_bible_verse_saves.sql'));
    await db.exec(migration('202611270005_content_pagination.sql'));

    const userId = randomUUID();
    await rows('insert into auth.users(id,email) values($1,$2)', [userId, 'reader@example.invalid']);
    await rows(`insert into bible_verse_saves
      (user_id,book,chapter,verse,is_bookmarked,created_at,updated_at)
      select $1,'John',3,n,true,timestamptz '2026-01-01 00:00:00+00',timestamptz '2026-01-01 00:00:00+00'
      from generate_series(1,60) n`, [userId]);

    const saves = await collectPages(async (cursor) => rows(
      `select id,updated_at from bible_verse_saves
       where user_id=$1
         and ($2::timestamptz is null or (updated_at,id) < ($2::timestamptz,$3::uuid))
       order by updated_at desc,id desc limit 26`,
      [userId, cursor?.updated_at ?? null, cursor?.id ?? null]
    ));
    assert.equal(saves.length, 60);
    assert.equal(new Set(saves.map((save) => save.id)).size, 60);

    const studyIds = Array.from({ length: 61 }, randomUUID);
    for (const id of studyIds) {
      await rows(`insert into bible_studies(id,study_name,study_date,status)
        values($1,$2,date '2026-01-01','published')`, [id, `Study ${id}`]);
    }

    const studies = await collectPages(async (cursor) => rows(
      `select id,study_date from bible_studies
       where status='published' and study_date < date '2027-01-01'
         and ($1::date is null or (study_date,id) < ($1::date,$2::uuid))
       order by study_date desc,id desc limit 26`,
      [cursor?.study_date ?? null, cursor?.id ?? null]
    ));
    assert.equal(studies.length, 61);
    assert.equal(new Set(studies.map((study) => study.id)).size, 61);

    const indexes = await rows(`select indexname from pg_indexes
      where schemaname='public' and indexname in (
        'bible_verse_saves_user_updated_cursor_idx',
        'bible_studies_published_date_cursor_idx'
      )`);
    assert.deepEqual(indexes.map((row) => row.indexname).sort(), [
      'bible_studies_published_date_cursor_idx',
      'bible_verse_saves_user_updated_cursor_idx',
    ]);

    console.log('PASS: cursor pagination covers all tied timestamp/date rows without duplicates and has supporting indexes.');
  } finally {
    await db.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
