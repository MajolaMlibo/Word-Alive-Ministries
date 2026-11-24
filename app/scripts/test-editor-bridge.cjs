// Exercise the generated WebView document with a simulated native message sink.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const richTextSource = fs.readFileSync(path.join(__dirname, '../src/components/richText.ts'), 'utf8');
const richText = {};
vm.runInNewContext(ts.transpile(richTextSource, { module: ts.ModuleKind.CommonJS }), { exports: richText });
const memberText = html => richText.displayText(richText.RICH_TEXT_PREFIX + html);
assert.equal(memberText('<blockquote>Read Leviticus</blockquote><p>Context</p><p><b>Chapter 1-2:</b> Hebrews</p>'),
  '> Read Leviticus\nContext\n**Chapter 1-2:** Hebrews');
assert.equal(memberText('<b>First<br>Second</b><b></b>'), '**First**\n**Second**');
assert.equal(memberText('<p>A<br>B <b>bold</b></p>'), 'A\nB **bold**');
assert.equal(memberText('<p>Literal * text</p>'), 'Literal * text');
const source = fs.readFileSync(path.join(__dirname, '../src/components/RichTextField.tsx'), 'utf8');
const builder = source.slice(source.indexOf('function buildEditorDocument('));
const js = ts.transpile(builder, { target: ts.ScriptTarget.ES2022 });
const saved = '<p>First line</p><p>Last line</p>';
const html = vm.runInNewContext(js + '\nbuildEditorDocument({initialHtml: saved})', { saved });
const handlers = {};
const messages = [];
const editor = {
  addEventListener: (name, fn) => { handlers[name] = fn; },
  cloneNode() { return { innerHTML: this.innerHTML, querySelectorAll: () => [] }; },
};
const toolbar = { addEventListener() {}, querySelectorAll: () => [] };
const document = {
  getElementById: id => id === 'toolbar' ? toolbar : editor,
  body: { scrollHeight: 300 }, addEventListener() {},
  queryCommandState: () => false, queryCommandValue: () => '',
};
const window = {
  ReactNativeWebView: { postMessage: raw => messages.push(JSON.parse(raw)) },
  getSelection: () => null,
};
const bridge = window.ReactNativeWebView;
delete window.ReactNativeWebView;
vm.runInNewContext(html.match(/<script>([\s\S]*?)<\/script>/)[1], { window, document, setTimeout() {} });
assert.equal(editor.innerHTML, saved);
assert.equal(messages.length, 0);
window.ReactNativeWebView = bridge;
window.wamReportLayout();
assert.equal(messages.at(-1).type, 'layout');
editor.innerHTML = '<p>Draft message here .....1</p>';
handlers.input();
assert.equal(messages.at(-1).html, editor.innerHTML);
console.log('Saved text loaded, readiness reported, and typed draft delivered.');
