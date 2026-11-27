const { PGlite } = require('@electric-sql/pglite');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { randomUUID } = require('node:crypto');

const root = resolve(__dirname, '../..');
const migration = (file) => readFileSync(resolve(root, 'supabase/migrations', file), 'utf8');

(async () => {
  const db = new PGlite();
  const [member, other, pastor, study] = Array.from({ length: 4 }, randomUUID);
  const rows = async (sql, args = []) => (await db.query(sql, args)).rows;
  const signIn = async (id) => {
    await db.exec('reset role');
    await rows("select set_config('test.uid',$1,false)", [id]);
    await db.exec('set role authenticated');
  };

  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth; grant usage on schema auth to authenticated;
      create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('test.uid',true),'')::uuid $$;
      create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);`);
    const baseline = migration('202611070001_initial_schema.sql');
    await db.exec(baseline.split('insert into storage.buckets')[0]
      .replace('create extension if not exists pgcrypto;', '') + 'commit;');
    for (const [id, firstName, role] of [[member, 'Named Member', 'member'], [other, 'Other Member', 'member'], [pastor, 'Pastor', 'pastor']]) {
      await rows('insert into auth.users values($1,$2,$3)', [id, `${firstName.replace(/ /g, '').toLowerCase()}@example.invalid`, JSON.stringify({ first_name: firstName })]);
      await rows('update public.user_roles set role=$2 where user_id=$1', [id, role]);
    }
    await db.exec(migration('202611270003_study_comments.sql'));
    await db.exec('reset role');
    await rows("insert into public.bible_studies(id,study_name,study_date,status) values($1,'Comments study',current_date,'published')", [study]);

    const post = (message) => rows('select * from public.submit_study_comment($1,$2)', [study, message]);
    const page = () => rows('select * from public.study_comment_page($1)', [study]);

    await signIn(member);
    await assert.rejects(rows("insert into public.study_comments(study_id,author_id,author_name,body) values($1,$2,'Bypass','No')", [study, member]), /permission denied/i);
    const first = (await post('Thank you for this study.'))[0];
    assert.equal(first.author_name, 'Named Member');
    assert.equal(first.is_hidden, false);
    assert.equal((await page())[0].body, 'Thank you for this study.');
    await assert.rejects(post('Visit https://example.org'), /Links are not allowed/);
    await assert.rejects(post('This is s.h.i.t.'), /revise the language/i);
    await assert.rejects(post(`Line one\nline two`), /control characters/i);
    for (const message of ['One more thought', 'Two more thoughts', 'Three more thoughts', 'Four more thoughts']) await post(message);
    await assert.rejects(post('This sixth comment is rate limited'), /Please wait/);

    await signIn(other);
    assert((await page()).some((comment) => comment.id === first.id));
    await assert.rejects(rows('select public.set_study_comment_visibility($1,false)', [first.id]), /Access denied/);

    await signIn(pastor);
    await rows('select public.set_study_comment_visibility($1,false)', [first.id]);
    assert.equal((await rows("select * from public.study_comment_moderation_page('thank')")).length, 1);

    await signIn(other);
    assert.equal((await page()).some((comment) => comment.id === first.id), false);
    await signIn(member);
    const ownHidden = (await page()).find((comment) => comment.id === first.id);
    assert.equal(ownHidden.is_hidden, true);

    await db.exec('reset role');
    await rows("insert into public.study_comments(study_id,author_id,author_name,body) select $1,$2,'Fixture '||n,'Comment '||n from generate_series(1,21) n", [study, pastor]);
    await signIn(other);
    const firstPage = await page();
    assert.equal(firstPage.length, 21);
    const visibleIds = new Set(firstPage.map((comment) => comment.id));
    assert.equal(visibleIds.size, 21);
    console.log('PASS: named immediate comments, server validation, profanity/link blocking, rate limits, post moderation, RLS, and cursor-page shape.');
  } finally {
    await db.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
