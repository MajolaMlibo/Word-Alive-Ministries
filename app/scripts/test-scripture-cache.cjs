const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/services/bibleService.ts'), 'utf8');
const cache = new Map();
const reader = {};
let requests = 0;
let offline = false;
const passage = { reference: 'John 1', text: 'Fixture', verses: [{ verse: 1, text: 'Fixture' }] };
vm.runInNewContext(ts.transpile(source, { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }), {
  exports: reader, require: () => ({ __esModule: true, default: { getItem: key => cache.get(key), setItem: async (key, value) => cache.set(key, value) } }),
  AbortController, setTimeout, clearTimeout, fetch: async () => {
    requests++;
    if (offline) throw new Error('offline');
    return { ok: true, json: async () => passage };
  },
});
(async () => {
  assert.equal((await reader.fetchScripture('John 1')).text, 'Fixture');
  offline = true;
  assert.equal((await reader.fetchScripture('John 1')).text, 'Fixture');
  assert.equal(requests, 1);
  assert.match((await reader.fetchScripture('John 2')).text, /not been downloaded/);
  console.log('PASS: saved chapter opens offline without a network request and a missing chapter gives a retry message.');
})().catch(error => { console.error(error); process.exitCode = 1; });
