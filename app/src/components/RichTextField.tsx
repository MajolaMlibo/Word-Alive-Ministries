import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import WebViewComponent, { WebViewMessageEvent } from 'react-native-webview';
import { editorHtmlForValue, valueFromEditorHtml } from './richText';

type WebViewHandle = { injectJavaScript: (script: string) => void };
const NativeWebView = WebViewComponent as unknown as React.ForwardRefExoticComponent<
  React.PropsWithoutRef<any> & React.RefAttributes<WebViewHandle>
>;

type Props = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  styles: any;
};

type EditorCommand = 'bold' | 'italic' | 'heading' | 'bullets' | 'numbers' | 'quote' | 'clear';

const TOOLS: { command: EditorCommand; label: string; accessibilityLabel: string }[] = [
  { command: 'bold', label: 'B', accessibilityLabel: 'Bold selected text' },
  { command: 'italic', label: 'I', accessibilityLabel: 'Italicise selected text' },
  { command: 'heading', label: 'H', accessibilityLabel: 'Make selected text a heading' },
  { command: 'bullets', label: '•≡', accessibilityLabel: 'Make a bulleted list' },
  { command: 'numbers', label: '1≡', accessibilityLabel: 'Make a numbered list' },
  { command: 'quote', label: '❝', accessibilityLabel: 'Make a quote' },
  { command: 'clear', label: 'Tx', accessibilityLabel: 'Clear selected formatting' },
];

/**
 * The writing tools are native buttons. Before Android transfers focus from the
 * WebView to one of these buttons, the editor stores the current text range.
 * A command restores that range inside the WebView before changing it.
 */
export default function RichTextField({ label, value, onChangeText, placeholder, styles }: Props) {
  const editor = useRef<WebViewHandle>(null);
  const emittedValue = useRef(value);
  const [height, setHeight] = useState(210);
  const [activeCommands, setActiveCommands] = useState<string[]>([]);
  const [editorInstance, setEditorInstance] = useState(0);
  const initialHtml = useMemo(() => editorHtmlForValue(value), []);

  // On a Fast Refresh, React can preserve the old WebView document even when
  // this component's JavaScript changed. Remount it once so the document and
  // its native-toolbar command function always come from the current source.
  useEffect(() => {
    setEditorInstance((current) => current + 1);
  }, []);

  useEffect(() => {
    if (value === emittedValue.current) return;
    emittedValue.current = value;
    const html = JSON.stringify(editorHtmlForValue(value)).replace(/</g, '\\u003c');
    editor.current?.injectJavaScript(`window.wamSetContent(${html}); true;`);
  }, [value]);

  const document = useMemo(() => buildEditorDocument({
    initialHtml,
    placeholder,
    primaryColor: styles.primaryColor,
    textColor: styles.textColor,
    mutedColor: styles.textMutedColor,
    surfaceColor: styles.surfaceColor,
    borderColor: styles.borderSoftColor,
  }), [
    initialHtml,
    placeholder,
    styles.borderSoftColor,
    styles.primaryColor,
    styles.surfaceColor,
    styles.textColor,
    styles.textMutedColor,
    editorInstance,
  ]);

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type !== 'change' || typeof message.html !== 'string') return;
      const next = valueFromEditorHtml(message.html);
      emittedValue.current = next;
      onChangeText(next);
      if (Array.isArray(message.active)) setActiveCommands(message.active.filter((item: unknown) => typeof item === 'string'));
      if (typeof message.height === 'number') setHeight(Math.max(210, Math.min(420, message.height)));
    } catch {
      // Ignore malformed messages from the local editor document.
    }
  };

  const runCommand = (command: EditorCommand) => {
    editor.current?.injectJavaScript(buildCommandScript(command));
  };

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.richTextHint}>
        Type, then select the words you want to change before using a writing tool. Members see this formatting after publishing.
      </Text>
      <View style={styles.richEditorFrame}>
        <View style={{ alignItems: 'center', borderBottomColor: styles.borderSoftColor, borderBottomWidth: 1, flexDirection: 'row', padding: 6 }}>
          {TOOLS.map((tool) => {
            const selected = activeCommands.includes(tool.command);
            return (
              <TouchableOpacity
                accessibilityLabel={tool.accessibilityLabel}
                accessibilityRole="button"
                key={tool.command}
                onPressIn={() => runCommand(tool.command)}
                style={{
                  alignItems: 'center',
                  backgroundColor: selected ? styles.borderSoftColor : 'transparent',
                  borderRadius: 7,
                  height: 34,
                  justifyContent: 'center',
                  marginRight: 3,
                  minWidth: 34,
                  paddingHorizontal: 6,
                }}
              >
                <Text style={{ color: styles.primaryColor, fontSize: tool.command === 'heading' ? 15 : 17, fontStyle: tool.command === 'italic' ? 'italic' : 'normal', fontWeight: tool.command === 'bold' || tool.command === 'heading' ? '800' : '700' }}>{tool.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <NativeWebView
          accessibilityLabel={`${label} visual editor`}
          domStorageEnabled
          javaScriptEnabled
          key={`wam-native-toolbar-${editorInstance}`}
          onMessage={onMessage}
          originWhitelist={['*']}
          ref={editor}
          scrollEnabled={false}
          source={{ html: document }}
          style={[styles.richEditor, { height }]}
        />
      </View>
    </View>
  );
}

function buildEditorDocument({
  initialHtml,
  placeholder,
  primaryColor,
  textColor,
  mutedColor,
  surfaceColor,
  borderColor,
}: {
  initialHtml: string;
  placeholder?: string;
  primaryColor: string;
  textColor: string;
  mutedColor: string;
  surfaceColor: string;
  borderColor: string;
}) {
  const content = JSON.stringify(initialHtml).replace(/</g, '\\u003c');
  const hint = JSON.stringify(placeholder || 'Write here...').replace(/</g, '\\u003c');
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" /><style>
    * { box-sizing: border-box; } html, body { margin: 0; padding: 0; background: ${surfaceColor}; color: ${textColor}; font-family: -apple-system, Roboto, Arial, sans-serif; }
    #editor { color: ${textColor}; font-size: 17px; line-height: 1.5; min-height: 178px; outline: none; padding: 12px; }
    #editor:empty:before { color: ${mutedColor}; content: attr(data-placeholder); pointer-events: none; }
    #editor p { margin: 0 0 10px; } #editor h2 { color: ${primaryColor}; font-size: 21px; line-height: 1.3; margin: 8px 0; }
    #editor ul, #editor ol { margin: 6px 0; padding-left: 26px; } #editor blockquote { border-left: 3px solid ${primaryColor}; color: ${mutedColor}; margin: 8px 0; padding-left: 10px; }
  </style></head><body><div id="editor" contenteditable="true" data-placeholder=${hint}></div><script>
    const editor = document.getElementById('editor'); editor.innerHTML = ${content};
    const safeTags = new Set(['P','DIV','BR','STRONG','B','EM','I','H2','H3','UL','OL','LI','BLOCKQUOTE','A']);
    let savedRange = null;
    function clean() { const clone = editor.cloneNode(true); clone.querySelectorAll('*').forEach((node) => { if (!safeTags.has(node.tagName)) { node.replaceWith(...node.childNodes); return; } const href = node.tagName === 'A' ? node.getAttribute('href') : ''; [...node.attributes].forEach((attribute) => node.removeAttribute(attribute.name)); if (node.tagName === 'A' && href && /^https:\/\//i.test(href)) node.setAttribute('href', href); else if (node.tagName === 'A') node.replaceWith(...node.childNodes); }); return clone.innerHTML; }
    function captureRange() { const selection = window.getSelection(); if (selection && selection.rangeCount && editor.contains(selection.anchorNode)) { savedRange = selection.getRangeAt(0).cloneRange(); window.__wamSavedRange = savedRange; } }
    function restoreRange() { editor.focus(); const selection = window.getSelection(); const range = window.__wamSavedRange || savedRange; if (selection && range) { selection.removeAllRanges(); selection.addRange(range); } }
    function activeCommands() { return [document.queryCommandState('bold') && 'bold', document.queryCommandState('italic') && 'italic', document.queryCommandState('insertUnorderedList') && 'bullets', document.queryCommandState('insertOrderedList') && 'numbers', document.queryCommandValue('formatBlock').toLowerCase() === 'h2' && 'heading', document.queryCommandValue('formatBlock').toLowerCase() === 'blockquote' && 'quote'].filter(Boolean); }
    function send() { captureRange(); const html = clean(); const height = Math.max(210, Math.min(420, document.body.scrollHeight + 8)); window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'change', html, height, active: activeCommands() })); }
    function applyBlockFormat(tag) { document.execCommand('formatBlock', false, tag); if (document.queryCommandValue('formatBlock').toLowerCase() !== tag) document.execCommand('formatBlock', false, '<' + tag + '>'); }
    window.wamRunCommand = (name) => { restoreRange(); if (name === 'heading') applyBlockFormat('h2'); else if (name === 'quote') applyBlockFormat('blockquote'); else if (name === 'bullets') document.execCommand('insertUnorderedList', false, null); else if (name === 'numbers') document.execCommand('insertOrderedList', false, null); else if (name === 'clear') { document.execCommand('removeFormat', false, null); applyBlockFormat('p'); } else document.execCommand(name, false, null); send(); };
    editor.addEventListener('input', send); editor.addEventListener('keyup', send); editor.addEventListener('mouseup', captureRange); editor.addEventListener('touchend', captureRange); editor.addEventListener('focus', captureRange); document.addEventListener('selectionchange', captureRange); editor.addEventListener('blur', send); window.wamSetContent = (html) => { editor.innerHTML = html || ''; savedRange = null; send(); }; setTimeout(send, 0);
  </script></body></html>`;
}

function buildCommandScript(command: EditorCommand) {
  const name = JSON.stringify(command);
  return `(() => {
    const editor = document.getElementById('editor');
    if (!editor) return true;
    const selection = window.getSelection();
    const savedRange = window.__wamSavedRange;
    editor.focus();
    if (selection && savedRange) { selection.removeAllRanges(); selection.addRange(savedRange); }
    const command = ${name};
    const applyBlockFormat = (tag) => {
      document.execCommand('formatBlock', false, tag);
      if (document.queryCommandValue('formatBlock').toLowerCase() !== tag) document.execCommand('formatBlock', false, '<' + tag + '>');
    };
    if (command === 'heading') applyBlockFormat('h2');
    else if (command === 'quote') applyBlockFormat('blockquote');
    else if (command === 'bullets') document.execCommand('insertUnorderedList', false, null);
    else if (command === 'numbers') document.execCommand('insertOrderedList', false, null);
    else if (command === 'clear') { document.execCommand('removeFormat', false, null); applyBlockFormat('p'); }
    else document.execCommand(command, false, null);
    const active = [document.queryCommandState('bold') && 'bold', document.queryCommandState('italic') && 'italic', document.queryCommandState('insertUnorderedList') && 'bullets', document.queryCommandState('insertOrderedList') && 'numbers', document.queryCommandValue('formatBlock').toLowerCase() === 'h2' && 'heading', document.queryCommandValue('formatBlock').toLowerCase() === 'blockquote' && 'quote'].filter(Boolean);
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'change', html: editor.innerHTML, height: Math.max(210, Math.min(420, document.body.scrollHeight + 8)), active }));
  })(); true;`;
}
