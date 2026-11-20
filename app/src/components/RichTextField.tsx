import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import WebViewComponent, { WebViewMessageEvent } from 'react-native-webview';
import { editorHtmlForValue, valueFromEditorHtml } from './richText';

type WebViewHandle = { injectJavaScript: (script: string) => void };
// react-native-webview 14's platform prop intersection is incompatible with
// React Native 0.88's JSX inference. Keep the WebView boundary narrowly typed.
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

export default function RichTextField({ label, value, onChangeText, placeholder, styles }: Props) {
  const editor = useRef<WebViewHandle>(null);
  const emittedValue = useRef(value);
  const [height, setHeight] = useState(210);
  const initialHtml = useMemo(() => editorHtmlForValue(value), []);

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
  ]);

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type !== 'change' || typeof message.html !== 'string') return;
      const next = valueFromEditorHtml(message.html);
      emittedValue.current = next;
      onChangeText(next);
      if (typeof message.height === 'number') setHeight(Math.max(210, Math.min(420, message.height)));
    } catch {
      // Ignore malformed messages from the local editor document.
    }
  };

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.richTextHint}>Select text, then use the visible writing controls. Members see this formatting after publishing.</Text>
      <View style={styles.richEditorFrame}>
        <NativeWebView
          accessibilityLabel={`${label} visual editor`}
          domStorageEnabled
          javaScriptEnabled
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
    #toolbar { align-items: center; border-bottom: 1px solid ${borderColor}; display: flex; flex-wrap: wrap; gap: 2px; padding: 6px; }
    button { background: transparent; border: 0; border-radius: 7px; color: ${primaryColor}; font-size: 17px; font-weight: 700; min-height: 34px; min-width: 34px; padding: 4px 7px; }
    button:active { background: ${borderColor}; } #editor { color: ${textColor}; font-size: 17px; line-height: 1.5; min-height: 142px; outline: none; padding: 12px; }
    #editor:empty:before { color: ${mutedColor}; content: attr(data-placeholder); pointer-events: none; }
    #editor p { margin: 0 0 10px; } #editor h2 { color: ${primaryColor}; font-size: 21px; line-height: 1.3; margin: 8px 0; }
    #editor ul, #editor ol { margin: 6px 0; padding-left: 26px; } #editor blockquote { border-left: 3px solid ${primaryColor}; color: ${mutedColor}; margin: 8px 0; padding-left: 10px; }
  </style></head><body><div id="toolbar" aria-label="Writing tools">
    <button data-command="bold" aria-label="Bold"><strong>B</strong></button><button data-command="italic" aria-label="Italic"><em>I</em></button>
    <button data-command="heading" aria-label="Heading">H</button><button data-command="insertUnorderedList" aria-label="Bulleted list">•≡</button>
    <button data-command="insertOrderedList" aria-label="Numbered list">1≡</button><button data-command="quote" aria-label="Quote">❝</button>
    <button data-command="clear" aria-label="Clear formatting">⌫</button>
  </div><div id="editor" contenteditable="true" data-placeholder=${hint}></div><script>
    const editor = document.getElementById('editor'); editor.innerHTML = ${content};
    const safeTags = new Set(['P','DIV','BR','STRONG','B','EM','I','H2','H3','UL','OL','LI','BLOCKQUOTE','A']);
    function clean() { const clone = editor.cloneNode(true); clone.querySelectorAll('*').forEach((node) => { if (!safeTags.has(node.tagName)) { node.replaceWith(...node.childNodes); return; } const href = node.tagName === 'A' ? node.getAttribute('href') : ''; [...node.attributes].forEach((attribute) => node.removeAttribute(attribute.name)); if (node.tagName === 'A' && href && /^https:\/\//i.test(href)) node.setAttribute('href', href); else if (node.tagName === 'A') node.replaceWith(...node.childNodes); }); return clone.innerHTML; }
    function send() { const html = clean(); const height = Math.max(210, Math.min(420, document.body.scrollHeight + 8)); window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'change', html, height })); }
    function command(name) { editor.focus(); if (name === 'heading') document.execCommand('formatBlock', false, 'h2'); else if (name === 'quote') document.execCommand('formatBlock', false, 'blockquote'); else if (name === 'clear') { document.execCommand('removeFormat', false, null); document.execCommand('formatBlock', false, 'p'); } else document.execCommand(name, false, null); send(); }
    document.querySelectorAll('button').forEach((button) => { button.addEventListener('mousedown', (event) => event.preventDefault()); button.addEventListener('click', () => command(button.dataset.command)); });
    editor.addEventListener('input', send); editor.addEventListener('blur', send); window.wamSetContent = (html) => { editor.innerHTML = html || ''; };
    setTimeout(send, 0);
  </script></body></html>`;
}
