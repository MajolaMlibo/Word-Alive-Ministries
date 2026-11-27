const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const { runInNewContext } = require('node:vm');
const ts = require('typescript');

const root = resolve(__dirname, '..');
const source = readFileSync(resolve(root, 'src/services/scriptureReference.ts'), 'utf8');
const references = {};
runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  { exports: references },
);

const valid = (reference) => {
  const result = references.validateScriptureReference(reference);
  assert.equal(result.isValid, true, reference);
  return result;
};

const tokensFor = (value) => references.tokenizeScriptureReferences(value)
  .filter((token) => token.reference)
  .map((token) => [token.text, token.reference]);

assert.equal(references.BIBLE_BOOKS.length, 66);
assert.equal(valid('John 3:16-18').normalizedReference, 'John 3:16-18');
assert.equal(valid('2 John 1; 3 John 1').passages.length, 2);
assert.equal(references.getFirstPassageFromScriptureReference('John 3:16').verse, 16);
assert.equal(JSON.stringify(tokensFor('Read John 3:16, then 2 John 1; 3 John 1.')), JSON.stringify([
  ['John 3:16', 'John 3:16'],
  ['2 John 1', '2 John 1'],
  ['3 John 1', '3 John 1'],
]));
assert.equal(JSON.stringify(tokensFor('Compare Genesis 1-3 with Psalms 119:1-90.')), JSON.stringify([
  ['Genesis 1-3', 'Genesis 1-3'],
  ['Psalms 119:1-90', 'Psalms 119:1-90'],
]));
assert.equal(JSON.stringify(tokensFor('Read John 3:16–18.')), JSON.stringify([
  ['John 3:16–18', 'John 3:16-18'],
]));
assert.equal(JSON.stringify(tokensFor('Do not link Haggai 1-3, Psalm 51, or plain words.')), '[]');
assert.equal(JSON.stringify(tokensFor('Do not partially link John 3:wrong, John 3:16-words, or John 3:16a.')), '[]');

const formattedText = readFileSync(resolve(root, 'src/components/FormattedText.tsx'), 'utf8');
assert.match(formattedText, /tokenizeScriptureReferences/);
assert.match(formattedText, /scriptureReference/);

console.log('PASS: only complete canonical Scripture references become in-app reader links.');
