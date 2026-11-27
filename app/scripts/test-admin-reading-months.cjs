const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { runInNewContext } = require('node:vm');

// Exercise the service query against two full years without writing test data to Supabase.
const rows = [];
for (const year of [2026, 2027]) {
  for (let day = 1; day <= 365; day++) {
    rows.push({ plan_id: String(year), scheduled_date: new Date(Date.UTC(year, 0, day)).toISOString().slice(0, 10), status: 'draft' });
  }
}
rows.push({ plan_id: 'another-plan', scheduled_date: '2027-01-04', status: 'draft' });
rows.push({ plan_id: 'archived-plan', scheduled_date: '2027-02-01', status: 'archived' });
let lastUpdatePayload = null;
const supabase = {
  from(table) {
    assert.equal(table, 'daily_readings');
    let matched = rows.slice().reverse();
    return {
      select() { return this; },
      update(payload) { lastUpdatePayload = payload; return this; },
      eq(key, value) { matched = matched.filter(row => row[key] === value); return this; },
      gte(key, value) { matched = matched.filter(row => row[key] >= value); return this; },
      lt(key, value) { matched = matched.filter(row => row[key] < value); return this; },
      neq(key, value) { matched = matched.filter(row => row[key] !== value); return this; },
      order(key, { ascending }) {
        assert.ok(ascending);
        return { data: matched.sort((a, b) => a[key].localeCompare(b[key])), error: null };
      },
      single() { return Promise.resolve({ data: lastUpdatePayload, error: null }); },
    };
  },
};
const source = readFileSync(path.join(__dirname, '../src/services/adminService.ts'), 'utf8');
const referenceSource = readFileSync(path.join(__dirname, '../src/services/scriptureReference.ts'), 'utf8');
const exportsUnderTest = {};
const references = {};
runInNewContext(ts.transpileModule(referenceSource, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
  { exports: references });
runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
  { exports: exportsUnderTest, require: (module) => module === './supabase' ? { supabase } : references });

(async () => {
  for (const [year, month, days] of [[2026, 10, 30], [2026, 11, 31], ...Array.from({ length: 12 }, (_, month) => [2027, month, new Date(Date.UTC(2027, month + 1, 0)).getUTCDate()])]) {
    const { readings } = await exportsUnderTest.getAdminDailyReadings(String(year), year, month);
    assert.equal(readings.length, days);
    assert.ok(readings.every(row => row.plan_id === String(year)));
    const prefix = String(year) + '-' + String(month + 1).padStart(2, '0') + '-';
    assert.equal(readings[0].scheduled_date, prefix + '01');
    assert.equal(readings.at(-1).scheduled_date, prefix + days);
  }
  assert.equal((await exportsUnderTest.getAdminDailyReadings('another-plan', 2027, 1)).readings.length, 0);
  const currentAndUpcoming = await exportsUnderTest.getAdminCurrentAndUpcomingDailyReadings('2027-01-01');
  assert.equal(currentAndUpcoming.readings.length, 366);
  assert.ok(currentAndUpcoming.readings.every(row => row.status !== 'archived' && row.scheduled_date >= '2027-01-01'));
  const allActive = await exportsUnderTest.getAdminAllDailyReadings();
  assert.equal(allActive.readings.length, 731);
  assert.ok(allActive.readings.every(row => row.status !== 'archived'));
  const archiveLegacy = await exportsUnderTest.saveDailyReading({
    planId: '2027', dayNumber: 1, scheduledDate: '2027-01-01', scriptureRef: 'Exodus 5-77',
    reflection: null, audioUrl: null, status: 'archived', publishedAt: null,
  }, 'admin-id', 'legacy-reading-id');
  assert.equal(archiveLegacy.error, null);
  assert.ok(!Object.hasOwn(lastUpdatePayload, 'scripture_ref'));
  const invalidNew = await exportsUnderTest.saveDailyReading({
    planId: '2027', dayNumber: 2, scheduledDate: '2027-01-02', scriptureRef: 'Haggai 1-3',
    reflection: null, audioUrl: null, status: 'archived', publishedAt: null,
  }, 'admin-id');
  assert.match(invalidNew.error.message, /Haggai.*chapter 2/i);
  const day = exportsUnderTest.readingDayNumber;
  for (const [index, row] of rows.filter(r => r.plan_id === '2027').entries()) {
    assert.equal(day(row.scheduled_date, 2027), index + 1);
  }
  assert.equal(day('2028-02-29', 2028), 60);
  assert.equal(day('2028-12-31', 2028), 366);
  for (const invalid of ['', '2027-02-29', '2027-13-01', '2026-12-31']) {
    assert.equal(day(invalid, 2027), null);
  }
  console.log('Passed all 12 months of 2027, plan isolation, active-reading review, legacy archiving, daily numbering, leap year and invalid dates.');
})().catch(error => { console.error(error); process.exitCode = 1; });
