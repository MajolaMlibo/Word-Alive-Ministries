const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { runInNewContext } = require('node:vm');

// Exercise the service query against two full years without writing test data to Supabase.
const rows = [];
for (const year of [2026, 2027]) {
  for (let day = 1; day <= 365; day++) {
    rows.push({ plan_id: String(year), scheduled_date: new Date(Date.UTC(year, 0, day)).toISOString().slice(0, 10) });
  }
}
rows.push({ plan_id: 'another-plan', scheduled_date: '2027-01-04' });
const supabase = {
  from(table) {
    assert.equal(table, 'daily_readings');
    let matched = rows.slice().reverse();
    return {
      select() { return this; },
      eq(key, value) { matched = matched.filter(row => row[key] === value); return this; },
      gte(key, value) { matched = matched.filter(row => row[key] >= value); return this; },
      lt(key, value) { matched = matched.filter(row => row[key] < value); return this; },
      order(key, { ascending }) {
        assert.ok(ascending);
        return { data: matched.sort((a, b) => a[key].localeCompare(b[key])), error: null };
      },
    };
  },
};
const source = readFileSync(path.join(__dirname, '../src/services/adminService.ts'), 'utf8');
const exportsUnderTest = {};
runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
  { exports: exportsUnderTest, require: () => ({ supabase }) });

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
  const day = exportsUnderTest.readingDayNumber;
  for (const [index, row] of rows.filter(r => r.plan_id === '2027').entries()) {
    assert.equal(day(row.scheduled_date, 2027), index + 1);
  }
  assert.equal(day('2028-02-29', 2028), 60);
  assert.equal(day('2028-12-31', 2028), 366);
  for (const invalid of ['', '2027-02-29', '2027-13-01', '2026-12-31']) {
    assert.equal(day(invalid, 2027), null);
  }
  console.log('Passed all 12 months of 2027, plan isolation, daily numbering, leap year and invalid dates.');
})().catch(error => { console.error(error); process.exitCode = 1; });
