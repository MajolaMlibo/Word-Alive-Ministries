// Reports structurally invalid source-plan references without changing data.
// Add --strict when the source plans have been repaired and should gate CI.
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

const root = resolve(__dirname, '../..');
const referenceSource = readFileSync(resolve(__dirname, '../src/services/scriptureReference.ts'), 'utf8');
const references = {};
runInNewContext(
  ts.transpileModule(referenceSource, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  { exports: references }
);

const migrationFiles = [
  '202611080001_import_2026_reading_plan.sql',
  '202611230001_import_2027_draft_readings.sql',
];
const entryPattern = /\(\s*(?:\d+\s*,\s*)?date\s+'(\d{4}-\d{2}-\d{2})'\s*,\s*'((?:''|[^'])*)'\s*\)/g;
const issues = [];

for (const file of migrationFiles) {
  const source = readFileSync(resolve(root, 'supabase/migrations', file), 'utf8');
  for (const match of source.matchAll(entryPattern)) {
    const [, date, escapedReference] = match;
    const reference = escapedReference.replace(/''/g, "'");
    const validation = references.validateScriptureReference(reference);
    if (validation.isValid) continue;
    const line = source.slice(0, match.index).split(/\r?\n/).length;
    issues.push({ file, line, date, reference, ...validation });
  }
}

if (!issues.length) {
  console.log('No structurally invalid source-plan references found.');
} else {
  console.log(`${issues.length} source-plan reference issue${issues.length === 1 ? '' : 's'} found:`);
  for (const issue of issues) {
    console.log(`${issue.file}:${issue.line} | ${issue.date} | ${issue.reference} | ${issue.error}${issue.suggestedReference ? ` | Suggested: ${issue.suggestedReference}` : ''}`);
  }
}

if (process.argv.includes('--strict') && issues.length) process.exitCode = 1;
