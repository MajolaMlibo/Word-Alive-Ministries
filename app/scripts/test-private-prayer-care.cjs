// Run against a disposable in-memory database with PGlite on NODE_PATH.
const { PGlite } = require('@electric-sql/pglite');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { randomUUID } = require('node:crypto');
const migration = file => readFileSync(resolve(__dirname, '../../supabase/migrations', file), 'utf8');

(async () => {
  const db = new PGlite();
  const [member, other, pastor, admin] = Array.from({ length: 4 }, randomUUID);
  const manager = '838f92e1-815a-417d-b393-80356c84a72d';
  const target = randomUUID();
  const rows = async (sql, args = []) => (await db.query(sql, args)).rows;
  const signIn = async id => {
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
    for (const [id,name,role] of [[member,'Older Member','member'],[other,'Other Member','member'],
      [pastor,'Test Pastor','pastor'],[admin,'Care Admin','admin'],[manager,'Access Manager','admin']]) {
      await rows('insert into auth.users values($1,$2,null)', [id, name+'@example.invalid']);
      await rows('update public.user_roles set role=$2 where user_id=$1',[id,role]);
    }
    await rows("insert into prayer_requests(id,user_id,description,status,is_public) values($1,$2,'legacy','approved',true)",[target,member]);
    await rows("insert into prayer_requests(user_id,description) select $1,'Example '||n from generate_series(1,105) n",[other]);
    await db.exec(migration('202611240001_private_prayer_care.sql'));
    await rows('insert into prayer_care_access(user_id,may_delegate) values($1,true)',[manager]);
    const thread = () => rows('select * from prayer_replies where request_id=$1 order by created_at,id',[target]);
    const read = () => rows('select * from prayer_requests where id=$1',[target]);
    const send = (message, previous=null) => rows('select send_prayer_reply($1,$2,$3)',[target,message,previous]);
    const grant = enabled => rows('select set_prayer_care_access($1,$2)',[admin,enabled]);
    await signIn(other);
    assert.equal((await read()).length,0);
    await signIn(member);
    assert.equal((await read())[0].status,'pending');
    assert.equal((await read())[0].is_public,false);
    await assert.rejects(rows('update prayer_requests set is_public=true where id=$1',[target]), /check constraint/);
    await rows("insert into prayer_requests(user_id,description) values($1,'Private test')",[member]);
    await rows("update prayer_requests set description='Edited privately' where id=$1",[target]);
    assert.equal((await read())[0].description,'Edited privately');
    await signIn(other);
    assert.equal((await rows("update prayer_requests set description='Other' where id=$1 returning id",[target])).length,0);
    await signIn(admin);
    assert.equal((await read()).length,0);
    await assert.rejects(grant(true), /Access denied/);
    await signIn(manager);
    assert.equal((await read()).length,0);
    await grant(true);
    await signIn(admin);
    assert.equal((await read()).length,1);
    const found=await rows("select * from prayer_inbox('pending','older')");
    assert(found.some(r=>r.id===target));
    let batch=await rows("select * from prayer_inbox('pending','')");
    const ids=[];
    while(batch.length) {
      const page=batch.slice(0,25); ids.push(...page.map(r=>r.id));
      const last=page.at(-1);
      batch=await rows("select * from prayer_inbox('pending','',$1,$2)",[last.created_at,last.id]);
    }
    assert.equal(new Set(ids).size,107); assert.equal(ids.length,107);
    await assert.rejects(send('   '), /check constraint/);
    assert.equal((await read())[0].status,'pending');
    await send('First reply'); await send('First reply');
    const first=(await thread())[0];
    assert.equal((await thread()).length,1);
    assert.equal(first.author_name,'Care Admin');
    await signIn(pastor);
    await assert.rejects(send('Follow-up'), /conversation changed/);
    await send('Follow-up',first.id);
    await rows('select close_prayer_request($1)',[target]);
    await assert.rejects(send('Late reply'), /closed/);
    await signIn(member);
    assert.equal((await read())[0].status,'closed');
    assert.equal((await rows("update prayer_requests set description='Closed edit' where id=$1 returning id",[target])).length,0);
    assert.deepEqual((await thread()).map(r=>r.body),['First reply','Follow-up']);
    await signIn(other); assert.equal((await thread()).length,0);
    await signIn(manager); await grant(false);
    await signIn(admin); assert.equal((await thread()).length,0); assert.equal((await read()).length,0);
    console.log('PASS: legacy privacy, roles, access delegation/revocation, replies and retry, closure, search and pagination across 107 requests.');

    await db.exec('reset role');
    await rows("insert into auth.users(id,email) select gen_random_uuid(),'Extra'||n||'@example.invalid' from generate_series(1,30) n");
    await db.exec(migration('202611240002_member_access_management.sql'));
    await db.exec(migration('202611240003_prayer_inbox_all.sql'));
    await signIn(pastor);
    const mixed = await rows("select * from prayer_inbox(null,'older')");
    assert.deepEqual(mixed.map(r=>r.status).sort(),['closed','pending']);
    await signIn(member);
    assert.equal((await rows("select * from prayer_inbox(null,'')")).length,0);
    const directory = (search='',filter=null,cursor=null) => rows('select * from member_directory($1,$2,$3)',[search,filter,cursor]);
    const change = (id,oldRole,oldCare,newRole,newCare) => rows('select save_member_access($1,$2,$3,$4,$5)',[id,oldRole,oldCare,newRole,newCare]);
    for (const id of [member,pastor,admin]) {
      await signIn(id);
      await assert.rejects(directory(), /Access denied/);
      await assert.rejects(change(other,'member',false,'admin',true), /Access denied/);
      await assert.rejects(grant(true), /permission denied/);
      assert.equal((await rows('select id from profiles')).length,1);
      assert.equal((await rows('select user_id from user_roles')).length,1);
    }
    await signIn(pastor);
    assert((await rows("select * from prayer_inbox('closed','older')")).some(r=>r.id===target));
    await signIn(manager);
    assert.equal((await read()).length,0);
    assert.equal((await directory('Older Member@example.invalid'))[0].member_id,member);
    assert((await directory('','admin')).every(r=>r.member_role==='admin'));
    const firstPage=await directory();
    const secondPage=await directory('',null,firstPage[24].member_id);
    assert.equal(firstPage.length,26);
    assert.equal(new Set([...firstPage.slice(0,25),...secondPage].map(r=>r.member_id)).size,35);
    await assert.rejects(change(manager,'admin',false,'member',false), /must remain an admin/);
    await change(other,'member',false,'admin',false);
    await change(other,'admin',false,'admin',true);
    await assert.rejects(change(other,'admin',false,'member',false), /Reload the member/);
    await signIn(other); assert.equal((await read()).length,1);
    await assert.rejects(directory(),/Access denied/);
    await signIn(manager);
    await change(other,'admin',true,'member',false);
    await signIn(other); assert.equal((await read()).length,0);
    await signIn(manager);
    await change(other,'member',false,'pastor',true);
    await signIn(other); assert.equal((await read()).length,1);
    await assert.rejects(directory(),/Access denied/);
    await db.exec('reset role');
    await db.exec(migration('202611240004_pastor_member_directory.sql'));
    for (const id of [pastor,manager]) {
      await signIn(id);
      assert.equal(Number((await rows('select registered_member_count() as n'))[0].n),35);
      const result=await rows("select * from member_directory_names('Older')");
      assert.equal(result.length,1);
      assert.deepEqual(Object.keys(result[0]).sort(),['display_name','member_id','member_role']);
    }
    for (const id of [member,admin]) {
      await signIn(id);
      await assert.rejects(rows('select registered_member_count()'),/Access denied/);
      await assert.rejects(rows('select * from member_directory_names()'),/Access denied/);
    }
    await db.exec('reset role');
    const history=await rows('select * from member_access_history order by id');
    assert.equal(history.length,4);
    assert(history.every(entry=>entry.actor_id===manager && entry.member_id===other));
    console.log('PASS: owner-only directory and access changes, historic endpoints disabled, retained prayer inbox, pagination, role changes, self protection, stale edits and audit history.');

    await db.exec(migration('202611240005_admin_directory_permission.sql'));
    let priorDirectory=false, priorCare=false;
    for (const [directoryOn,careOn] of [[false,false],[true,false],[true,true],[false,true],[false,false]]) {
      await signIn(manager);
      await rows("select save_member_access($1,'admin',$2,'admin',$3,$4,$5)",
        [admin,priorCare,careOn,priorDirectory,directoryOn]);
      const saved=(await directory('Care Admin'))[0];
      assert.equal(saved.directory_access,directoryOn);
      assert.equal(saved.prayer_access,careOn);
      await signIn(admin);
      if(directoryOn) {
        assert.equal((await rows("select * from member_directory_names('older')")).length,1);
        assert.equal(Number((await rows('select registered_member_count() as n'))[0].n),35);
      } else {
        await assert.rejects(rows('select * from member_directory_names()'),/Access denied/);
        await assert.rejects(rows('select registered_member_count()'),/Access denied/);
      }
      assert.equal((await read()).length,careOn ? 1 : 0);
      await assert.rejects(directory(),/Access denied/);
      await assert.rejects(rows("select save_member_access($1,'admin',false,'admin',false,false,true)",[admin]),/Access denied/);
      priorCare=careOn; priorDirectory=directoryOn;
    }
    await signIn(manager);
    await rows("select save_member_access($1,'admin',false,'admin',false,false,true)",[admin]);
    await change(admin,'admin',false,'admin',true);
    assert.equal((await directory('Care Admin'))[0].directory_access,true);
    await assert.rejects(rows("select save_member_access($1,'admin',true,'admin',true,false,false)",[admin]), /Reload the member/);
    await change(admin,'admin',true,'member',false);
    await change(admin,'member',false,'admin',false);
    assert.equal((await directory('Care Admin'))[0].directory_access,false);
    await db.exec('reset role');
    const logged=(await rows('select * from member_access_history order by id desc limit 1'))[0];
    assert.equal(logged.new_directory_access,false);
    console.log('PASS: four independent admin permission combinations, revocation, owner-only writes, stale saves, audit and older client compatibility.');
    await db.exec(migration('202611250001_reading_safeguards.sql'));
    const plan = randomUUID(), reading = randomUUID(), unused = randomUUID();
    await rows("insert into reading_plans(id,name,plan_year) values($1,'Test',2026)", [plan]);
    await rows("insert into daily_readings(id,plan_id,day_number,scheduled_date,scripture_ref,status) values($1,$3,1,'2026-01-01','John 1','published'),($2,$3,2,'2026-01-02','John 2','draft')",[reading,unused,plan]);
    await rows("insert into reading_completions(reading_id,user_id) values($1,$2)",[reading,member]);
    await signIn(manager);
    await assert.rejects(rows('delete from daily_readings where id=$1',[reading]), /archive/i);
    await rows("update daily_readings set status='archived' where id=$1",[reading]);
    await rows("update daily_readings set status='draft' where id=$1",[reading]);
    await assert.rejects(rows('delete from daily_readings where id=$1',[reading]), /foreign key/);
    await assert.rejects(rows('delete from reading_plans where id=$1',[plan]), /foreign key/);
    assert.equal((await rows('delete from daily_readings where id=$1 returning id',[unused])).length,1);
    const count = () => rows('select member_reading_count($1) as n',[member]);
    for (const id of [manager,pastor,admin,member,other]) {
      await signIn(id);
      assert.equal((await rows('select id from reading_completions')).length,id===member ? 1 : 0);
      if (id===manager || id===pastor || id===other) assert.equal(Number((await count())[0].n),1);
      else await assert.rejects(count(),/Access denied/);
    }
    await signIn(manager);
    await rows("select save_member_access($1,'admin',false,'admin',false,false,true)",[admin]);
    await signIn(admin);
    assert.equal(Number((await count())[0].n),1);
    assert.equal((await rows('select id from reading_completions')).length,0);
    console.log('PASS: completion history survives archive, draft and parent deletion; directory summaries follow permissions.');
  } finally { await db.close(); }
})().catch(error=>{ console.error(error); process.exitCode=1; });

