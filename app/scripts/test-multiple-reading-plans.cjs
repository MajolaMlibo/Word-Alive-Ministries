// Run the reading-plan migration against a disposable database. This proves
// that optional-plan membership, RLS and the single ministry-wide streak hold
// even when two plans have a reading on the same South African date.
const { PGlite } = require('@electric-sql/pglite');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { randomUUID } = require('node:crypto');

const migration = (file) => readFileSync(resolve(__dirname, '../../supabase/migrations', file), 'utf8');

(async () => {
  const db = new PGlite();
  const [member, otherMember, administrator] = Array.from({ length: 3 }, randomUUID);
  const requiredPlan = randomUUID();
  const optionalPlan = randomUUID();
  const draftPlan = randomUUID();
  const requiredReading = randomUUID();
  const optionalReading = randomUUID();
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
    await db.exec(migration('202611250002_reading_publication_and_streak.sql'));
    await db.exec(migration('202611270004_multiple_reading_plans.sql'));

    for (const [id, email, role] of [
      [member, 'member@example.invalid', 'member'],
      [otherMember, 'other@example.invalid', 'member'],
      [administrator, 'admin@example.invalid', 'admin'],
    ]) {
      await rows('insert into auth.users(id,email) values($1,$2)', [id, email]);
      await rows('update public.user_roles set role=$2 where user_id=$1', [id, role]);
    }

    const today = `(timezone('Africa/Johannesburg', now()))::date`;
    await db.exec(`
      insert into public.reading_plans(id,name,plan_year,status,enrollment_mode)
      values
        ('${requiredPlan}','Required plan',2026,'published','required'),
        ('${optionalPlan}','Optional plan',2026,'published','optional'),
        ('${draftPlan}','Future draft',2027,'draft','optional');
      insert into public.daily_readings(id,plan_id,day_number,scheduled_date,scripture_ref,status)
      values
        ('${requiredReading}','${requiredPlan}',1,${today},'John 3:16','published'),
        ('${optionalReading}','${optionalPlan}',1,${today},'Psalm 23','published');
    `);

    await signIn(member);
    const plans = await rows('select id, enrollment_mode from public.reading_plans order by id');
    assert.deepEqual(plans.map((plan) => plan.id).sort(), [optionalPlan, requiredPlan].sort());
    assert.deepEqual(
      (await rows('select id from public.daily_readings order by id')).map((reading) => reading.id),
      [requiredReading],
    );
    await assert.rejects(
      rows("insert into public.reading_plan_memberships(plan_id,user_id,status) values($1,$2,'active')", [optionalPlan, member]),
      /permission denied/,
    );
    await assert.rejects(
      rows('select * from public.complete_daily_reading($1)', [optionalReading]),
      /not available/,
    );
    await assert.rejects(
      rows('select public.join_reading_plan($1)', [requiredPlan]),
      /does not need joining/,
    );
    await assert.rejects(
      rows('select public.join_reading_plan($1)', [draftPlan]),
      /Only published reading plans/,
    );
    await assert.rejects(
      rows('select public.leave_reading_plan($1)', [requiredPlan]),
      /cannot be left/,
    );

    await rows('select public.join_reading_plan($1)', [optionalPlan]);
    assert.equal((await rows('select status from public.reading_plan_memberships where plan_id=$1', [optionalPlan]))[0].status, 'active');
    assert.deepEqual(
      (await rows('select id from public.daily_readings order by id')).map((reading) => reading.id).sort(),
      [requiredReading, optionalReading].sort(),
    );
    const optionalCompletion = (await rows('select * from public.complete_daily_reading($1)', [optionalReading]))[0];
    const requiredCompletion = (await rows('select * from public.complete_daily_reading($1)', [requiredReading]))[0];
    assert.equal(Number(optionalCompletion.current_streak), 1);
    assert.equal(Number(requiredCompletion.current_streak), 1);
    assert.equal(Number((await rows('select public.refresh_daily_reading_streak() as streak'))[0].streak), 1);

    await rows('select public.leave_reading_plan($1)', [optionalPlan]);
    assert.equal((await rows('select id from public.daily_readings where id=$1', [optionalReading])).length, 0);
    await assert.rejects(
      rows('select * from public.complete_daily_reading($1)', [optionalReading]),
      /not available/,
    );

    await signIn(otherMember);
    assert.equal((await rows('select id from public.daily_readings where id=$1', [optionalReading])).length, 0);
    assert.equal((await rows('select * from public.reading_plan_memberships')).length, 0);

    await signIn(administrator);
    assert.equal((await rows('select id from public.daily_readings where id=$1', [optionalReading])).length, 1);
    assert.equal((await rows('select * from public.reading_plan_memberships where plan_id=$1', [optionalPlan])).length, 1);
    await assert.rejects(
      rows("update public.reading_plans set enrollment_mode='optional' where id=$1", [requiredPlan]),
      /Archive a published reading plan/,
    );
    await rows("update public.reading_plans set enrollment_mode='required' where id=$1", [draftPlan]);
    assert.equal((await rows('select enrollment_mode from public.reading_plans where id=$1', [draftPlan]))[0].enrollment_mode, 'required');
    await assert.rejects(
      rows(`insert into public.daily_readings(plan_id,day_number,scheduled_date,scripture_ref,status)
        values($1,2,${today},'John 3:17','published')`, [requiredPlan]),
      /daily_readings_plan_id_scheduled_date_key/,
    );

    console.log('PASS: required and optional plan visibility, secure membership, concurrent-plan dates, and one ministry-wide streak.');
  } finally {
    await db.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
