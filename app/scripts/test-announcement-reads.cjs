const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

let queried = false;
let selectedIds = null;
const supabase = {
  from(table) {
    queried = true;
    assert.equal(table, 'announcement_reads');
    return {
      select() { return this; },
      eq(key, value) { assert.equal(key, 'user_id'); assert.equal(value, 'member-id'); return this; },
      in(key, values) {
        assert.equal(key, 'announcement_id');
        selectedIds = values;
        return Promise.resolve({
          data: [{ announcement_id: values[0], user_id: 'member-id', read_at: '2026-11-27T00:00:00Z' }],
          error: null,
        });
      },
    };
  },
};

const source = readFileSync(path.join(__dirname, '../src/services/announcementService.ts'), 'utf8');
const service = {};
runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports: service, require: () => ({ supabase }) });

(async () => {
  const empty = await service.getAnnouncementReads('member-id', []);
  assert.equal(empty.reads.length, 0);
  assert.equal(queried, false);
  const reads = await service.getAnnouncementReads('member-id', ['active-1', 'active-2']);
  assert.deepEqual(selectedIds, ['active-1', 'active-2']);
  assert.equal(reads.reads.length, 1);
  console.log('PASS: notice-read lookup skips an empty feed and only requests active notice IDs.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
