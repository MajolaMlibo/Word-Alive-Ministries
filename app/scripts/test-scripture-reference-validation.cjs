const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');
const { PGlite } = require('@electric-sql/pglite');

const root = resolve(__dirname, '../..');
const referenceSource = readFileSync(resolve(__dirname, '../src/services/scriptureReference.ts'), 'utf8');
const references = {};
runInNewContext(
  ts.transpileModule(referenceSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  { exports: references }
);

const valid = value => {
  const result = references.validateScriptureReference(value);
  assert.equal(result.isValid, true, value);
  return result;
};
const invalid = value => {
  const result = references.validateScriptureReference(value);
  assert.equal(result.isValid, false, value);
  return result;
};
const migration = file => readFileSync(resolve(root, 'supabase/migrations', file), 'utf8');

(async () => {
  assert.equal(references.BIBLE_BOOKS.length, 66);
  assert.equal(valid('John 3').normalizedReference, 'John 3');
  assert.equal(valid('PSALMS 119:1-176').normalizedReference, 'Psalms 119:1-176');
  assert.equal(valid('Titus 1-3; Philemon 1').normalizedReference, 'Titus 1-3; Philemon 1');
  assert.equal(valid('2 John 1; 3 John 1').reference.passages.length, 2);
  assert.equal(valid('John 3–4').normalizedReference, 'John 3-4');
  assert.equal(invalid('Psalm 51-55').suggestedReference, 'Psalms 51-55');
  assert.equal(invalid('Song of Songs 1-4').suggestedReference, 'Song of Solomon 1-4');
  for (const reference of [
    'Exodus 5-77', 'Psalms 91-88', 'Haggai 1-3', '1 THESALONIANS 1-5',
    '2 JOHN/ 3 JOHN 1/1', 'John 0', 'John 3:0', 'John 1-2:3', 'John 1;; 2',
  ]) invalid(reference);
  assert.equal(references.getFirstVerseReference('2 John 1; 3 John 1'), '2 John 1:1');
  console.log('PASS: canonical books, chapter/verse ranges, multi-passage readings, aliases and malformed references are distinguished.');

  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated;
      create schema auth;
      create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
      create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb);`);
    const baseline = migration('202611070001_initial_schema.sql');
    await db.exec(baseline.split('insert into storage.buckets')[0]
      .replace('create extension if not exists pgcrypto;', '') + 'commit;');
    await db.exec(`insert into reading_plans(id,name,plan_year) values
      ('00000000-0000-0000-0000-000000000001','Reference tests',2027);
      insert into daily_readings(plan_id,day_number,scheduled_date,scripture_ref) values
      ('00000000-0000-0000-0000-000000000001',1,'2999-01-01','Exodus 5-77');`);
    const audit = readFileSync(resolve(root, 'supabase/checks/reading_reference_audit.sql'), 'utf8');
    const auditRows = (await db.query(audit)).rows;
    assert.equal(auditRows.length, 1);
    assert.match(auditRows[0].issue, /outside this book/i);
    await db.exec(migration('202611270001_validate_daily_reading_references.sql'));
    assert.equal(Number((await db.query("select count(*)::int as count from daily_readings where scripture_ref='Exodus 5-77'")).rows[0].count), 1);
    for (const [book, chapters] of references.BIBLE_BOOKS) {
      assert.equal((await db.query('select public.is_valid_daily_reading_scripture_reference($1) as valid', [`${book} 1`])).rows[0].valid, true, book);
      assert.equal((await db.query('select public.is_valid_daily_reading_scripture_reference($1) as valid', [`${book} ${chapters + 1}`])).rows[0].valid, false, `${book} overflow`);
    }
    await assert.rejects(
      db.exec("insert into daily_readings(plan_id,day_number,scheduled_date,scripture_ref) values ('00000000-0000-0000-0000-000000000001',2,'2027-01-02','Haggai 1-3')"),
      /Invalid Scripture reference/
    );
    await db.exec(`insert into daily_readings(plan_id,day_number,scheduled_date,scripture_ref) values
      ('00000000-0000-0000-0000-000000000001',3,'2027-01-03','Psalms 119:1-176'),
      ('00000000-0000-0000-0000-000000000001',4,'2027-01-04','2 John 1; 3 John 1');
      update daily_readings set status='archived' where scripture_ref='Exodus 5-77';`);
    console.log('PASS: all 66 shared book bounds match the forward database guard, which rejects new invalid references while legacy rows remain reviewable and archivable.');
  } finally {
    await db.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
