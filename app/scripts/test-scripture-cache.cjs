const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/services/bibleService.ts'), 'utf8');
const referenceSource = fs.readFileSync(path.join(__dirname, '../src/services/scriptureReference.ts'), 'utf8');
const cache = new Map();
const reader = {};
const references = {};
let requests = 0;
let offline = false;
const passage = { reference: 'John 1', text: 'Fixture', verses: [{ verse: 1, text: 'Fixture' }] };
vm.runInNewContext(ts.transpile(referenceSource, { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }), {
  exports: references,
});
vm.runInNewContext(ts.transpile(source, { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }), {
  exports: reader,
  require: module => module === './scriptureReference'
    ? references
    : ({ __esModule: true, default: { getItem: key => cache.get(key), setItem: async (key, value) => cache.set(key, value) } }),
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
  const beforeInvalidPreview = requests;
  const invalidPreview = await reader.getDailyVersePreview('Exodus 5-77');
  assert.equal(invalidPreview.preview, null);
  assert.match(invalidPreview.error.message, /could not be interpreted/i);
  assert.equal(requests, beforeInvalidPreview);
  console.log('PASS: saved chapter opens offline without a network request, a missing chapter gives a retry message, and an invalid daily reference makes no request.');
})().catch(error => { console.error(error); process.exitCode = 1; });
