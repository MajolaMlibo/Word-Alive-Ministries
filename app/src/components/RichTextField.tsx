import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import WebViewComponent, { WebViewMessageEvent } from 'react-native-webview';
import { displayText, editorHtmlForValue, valueFromEditorHtml } from './richText';

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

const MAX_EDITOR_HEIGHT = 460;

/**
 * The writing toolbar deliberately lives inside the WebView. On Android, a
 * native button outside the WebView can dismiss a selected range before its
 * command reaches the editor. Toolbar taps inside this document preserve the
 * selection and apply the command in the same DOM context.
 */
export default function RichTextField({
  label,
  value,
  onChangeText,
  placeholder,
  styles,
}: Props) {
  const editor = useRef<WebViewHandle>(null);
  const [height, setHeight] = useState(246);
  const [editorReady, setEditorReady] = useState(false);
  const [basicEditor, setBasicEditor] = useState(false);
  useEffect(() => {
    if (editorReady) return;
    const timer = setTimeout(() => setBasicEditor(true), 3500);
    return () => clearTimeout(timer);
  }, [editorReady]);
  // The parent keys each editing session. During typing, the WebView owns its selection and text.
  const document = useMemo(() => buildEditorDocument({
    initialHtml: editorHtmlForValue(value),
    placeholder,
    primaryColor: styles.primaryColor,
    textColor: styles.textColor,
    mutedColor: styles.textMutedColor,
    surfaceColor: styles.surfaceColor,
    borderColor: styles.borderSoftColor,
  }), [
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
      if (message.type !== 'change' && message.type !== 'layout') return;
      setEditorReady(true);

      if (message.type === 'change' && typeof message.html === 'string') {
        const next = valueFromEditorHtml(message.html);
        onChangeText(next);
      }

      if (typeof message.height === 'number') {
        setHeight(Math.max(246, Math.min(MAX_EDITOR_HEIGHT, message.height)));
      }
    } catch {
      // Ignore malformed messages from the local editor document.
    }
  };

  if (basicEditor) return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.richTextHint}>Basic editor · formatting tools unavailable</Text>
      <TextInput accessibilityLabel={label} multiline value={displayText(value)}
        onChangeText={onChangeText} style={[styles.field, styles.textArea]}
        textAlignVertical="top" placeholder={placeholder} />
    </View>
  );

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.richTextHint}>
        Select words, then use the writing tools. The formatting appears for members after publishing.
      </Text>
      <View style={styles.richEditorFrame} pointerEvents={editorReady ? 'auto' : 'none'}>
        <NativeWebView
          accessibilityLabel={`${label} visual editor`}
          onShouldStartLoadWithRequest={(request: { url: string }) => request.url === 'about:blank'}
          setSupportMultipleWindows={false}
          javaScriptEnabled
          nestedScrollEnabled
          onError={() => setBasicEditor(true)}
          onMessage={onMessage}
          onLoadEnd={() => editor.current?.injectJavaScript('window.wamReportLayout?.(); true;')}
          originWhitelist={['*']}
          ref={editor}
          scrollEnabled={height >= MAX_EDITOR_HEIGHT}
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

  return String.raw`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" /><style>
    * { box-sizing: border-box; } html, body { margin: 0; min-height: 100%; padding: 0; background: ${surfaceColor}; color: ${textColor}; font-family: -apple-system, Roboto, Arial, sans-serif; }
    #toolbar { -webkit-overflow-scrolling: touch; background: ${surfaceColor}; border-bottom: 1px solid ${borderColor}; display: flex; gap: 3px; overflow-x: auto; padding: 6px; position: sticky; top: 0; white-space: nowrap; z-index: 2; }
    #toolbar button { align-items: center; appearance: none; background: transparent; border: 0; border-radius: 7px; color: ${primaryColor}; display: inline-flex; font-size: 17px; font-weight: 700; height: 34px; justify-content: center; min-width: 34px; padding: 0 6px; }
    #toolbar button.active { background: ${borderColor}; } #toolbar button[data-command="italic"] { font-style: italic; } #toolbar button[data-command="bold"], #toolbar button[data-command="heading"] { font-weight: 800; } #toolbar button[data-command="heading"] { font-size: 15px; }
    #editor { color: ${textColor}; font-size: 17px; line-height: 1.5; min-height: 178px; outline: none; padding: 12px; } #editor:empty:before { color: ${mutedColor}; content: attr(data-placeholder); pointer-events: none; }
    #editor p { margin: 0 0 10px; } #editor h2 { color: ${primaryColor}; font-size: 21px; line-height: 1.3; margin: 8px 0; } #editor ul, #editor ol { margin: 6px 0; padding-left: 26px; } #editor blockquote { border-left: 3px solid ${primaryColor}; color: ${mutedColor}; margin: 8px 0; padding-left: 10px; }
  </style></head><body><div id="toolbar" aria-label="Writing tools" role="toolbar"><button aria-label="Bold selected text" data-command="bold" type="button">B</button><button aria-label="Italicise selected text" data-command="italic" type="button">I</button><button aria-label="Make selected text a heading" data-command="heading" type="button">H</button><button aria-label="Make a bulleted list" data-command="bullets" type="button">•≡</button><button aria-label="Make a numbered list" data-command="numbers" type="button">1≡</button><button aria-label="Make a quote" data-command="quote" type="button">❝</button><button aria-label="Clear selected formatting" data-command="clear" type="button">Tx</button></div><div id="editor" contenteditable="true" data-placeholder=${hint}></div><script>
    (() => {
    const editor = document.getElementById('editor'); const toolbar = document.getElementById('toolbar');
    const safeTags = new Set(['P','DIV','BR','STRONG','B','EM','I','H2','H3','UL','OL','LI','BLOCKQUOTE','A']); let savedRange = null; let lastTouchCommandAt = 0;
    function safeCopy(source, destination) {
      for (const item of source.childNodes) {
        if (item.nodeType === 3) { destination.appendChild(document.createTextNode(item.data)); continue; }
        if (item.nodeType !== 1 || item.namespaceURI !== 'http://www.w3.org/1999/xhtml') continue;
        if (['SCRIPT','STYLE','TEMPLATE','IFRAME','OBJECT'].includes(item.tagName)) continue;
        const href = item.tagName === 'A' ? item.getAttribute('href') || '' : '';
        if (!safeTags.has(item.tagName) || (item.tagName === 'A' && !/^https:\/\//i.test(href))) {
          safeCopy(item, destination);
          continue;
        }
        const cleanNode = document.createElement(item.tagName.toLowerCase());
        if (href) cleanNode.setAttribute('href', href);
        safeCopy(item, cleanNode);
        destination.appendChild(cleanNode);
      }
    }
    const saved = document.createElement('template');
    saved.innerHTML = ${content};
    safeCopy(saved.content, editor);
    editor.addEventListener('click', event => { if (event.target.closest?.('a')) event.preventDefault(); });
    function clean() {
      const output = document.createElement('div');
      safeCopy(editor, output);
      return output.innerHTML;
    }
    function captureRange() { const selection = window.getSelection(); if (selection && selection.rangeCount && editor.contains(selection.anchorNode)) { savedRange = selection.getRangeAt(0).cloneRange(); window.__wamSavedRange = savedRange; } }
    function restoreRange() { editor.focus(); const selection = window.getSelection(); const range = window.__wamSavedRange || savedRange; if (selection && range) { selection.removeAllRanges(); selection.addRange(range); } }
    function activeCommands() { return [document.queryCommandState('bold') && 'bold', document.queryCommandState('italic') && 'italic', document.queryCommandState('insertUnorderedList') && 'bullets', document.queryCommandState('insertOrderedList') && 'numbers', document.queryCommandValue('formatBlock').toLowerCase() === 'h2' && 'heading', document.queryCommandValue('formatBlock').toLowerCase() === 'blockquote' && 'quote'].filter(Boolean); }
    function updateToolbar() { const active = activeCommands(); toolbar.querySelectorAll('button[data-command]').forEach((button) => button.classList.toggle('active', active.includes(button.dataset.command))); }
    function height() { return Math.max(246, Math.min(460, document.body.scrollHeight + 8)); }
    function reportLayout() { window.ReactNativeWebView?.postMessage(JSON.stringify({ type: 'layout', height: height() })); }
    function send() { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'change', html: clean(), height: height() })); captureRange(); updateToolbar(); }
    function applyBlockFormat(tag) { document.execCommand('formatBlock', false, tag); if (document.queryCommandValue('formatBlock').toLowerCase() !== tag) document.execCommand('formatBlock', false, '<' + tag + '>'); }
    window.wamRunCommand = (command) => { restoreRange(); if (command === 'heading') applyBlockFormat('h2'); else if (command === 'quote') applyBlockFormat('blockquote'); else if (command === 'bullets') document.execCommand('insertUnorderedList', false, null); else if (command === 'numbers') document.execCommand('insertOrderedList', false, null); else if (command === 'clear') { document.execCommand('removeFormat', false, null); applyBlockFormat('p'); } else document.execCommand(command, false, null); send(); };
    function toolbarButton(event) { const target = event.target; return target && target.closest ? target.closest('button[data-command]') : null; }
    toolbar.addEventListener('mousedown', (event) => { if (toolbarButton(event)) event.preventDefault(); });
    toolbar.addEventListener('touchstart', (event) => { const button = toolbarButton(event); if (!button) return; event.preventDefault(); lastTouchCommandAt = Date.now(); window.wamRunCommand(button.dataset.command); }, { passive: false });
    toolbar.addEventListener('click', (event) => { const button = toolbarButton(event); if (!button || Date.now() - lastTouchCommandAt < 700) return; event.preventDefault(); window.wamRunCommand(button.dataset.command); });
    editor.addEventListener('input', send); editor.addEventListener('mouseup', () => { captureRange(); updateToolbar(); }); editor.addEventListener('touchend', () => { captureRange(); updateToolbar(); }); editor.addEventListener('focus', () => { captureRange(); updateToolbar(); }); document.addEventListener('selectionchange', () => { captureRange(); updateToolbar(); }); setTimeout(() => { updateToolbar(); reportLayout(); }, 0);
    window.wamReportLayout = reportLayout;
    reportLayout();
    })();
  </script></body></html>`;
}
