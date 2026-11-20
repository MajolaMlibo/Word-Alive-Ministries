import React, { useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Selection = { start: number; end: number };

type Props = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  styles: any;
};

export default function RichTextField({ label, value, onChangeText, placeholder, styles }: Props) {
  const [selection, setSelection] = useState<Selection>({ start: 0, end: 0 });

  const replaceSelection = (before: string, after = before, fallback = 'text') => {
    const start = selection.start;
    const end = selection.end;
    const selected = value.slice(start, end) || fallback;
    const next = `${value.slice(0, start)}${before}${selected}${after}${value.slice(end)}`;
    onChangeText(next);
    const cursor = start + before.length + selected.length;
    setSelection({ start: cursor, end: cursor });
  };

  const prefixLine = (prefix: string) => {
    const lineStart = value.lastIndexOf('\n', Math.max(0, selection.start - 1)) + 1;
    onChangeText(`${value.slice(0, lineStart)}${prefix}${value.slice(lineStart)}`);
    const cursor = selection.start + prefix.length;
    setSelection({ start: cursor, end: cursor });
  };

  const clearFormatting = () => {
    const start = selection.start;
    const end = selection.end;
    const selected = value.slice(start, end) || value;
    const plain = selected
      .replace(/^#{1,2}\s/gm, '')
      .replace(/^>\s/gm, '')
      .replace(/^[-*]\s/gm, '')
      .replace(/\*\*/g, '')
      .replace(/_/g, '')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)');
    const next = selection.start === selection.end ? plain : `${value.slice(0, start)}${plain}${value.slice(end)}`;
    onChangeText(next);
    setSelection({ start, end: start + plain.length });
  };

  const Tool = ({ icon, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void }) => (
    <TouchableOpacity accessibilityLabel={label} onPress={onPress} style={styles.richToolButton}>
      <Ionicons name={icon} color={styles.primaryColor} size={19} />
    </TouchableOpacity>
  );

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.richTextHint}>Select text, then use the writing tools. Formatting appears for members after publishing.</Text>
      <View style={styles.richToolbar}>
        <Tool label="Make selected text bold" icon="text" onPress={() => replaceSelection('**')} />
        <Tool label="Make selected text italic" icon="text-outline" onPress={() => replaceSelection('_')} />
        <Tool label="Add a heading" icon="text-outline" onPress={() => prefixLine('## ')} />
        <Tool label="Add a bullet" icon="list-outline" onPress={() => prefixLine('- ')} />
        <Tool label="Add a numbered list item" icon="list" onPress={() => prefixLine('1. ')} />
        <Tool label="Add a quote" icon="chatbox-ellipses-outline" onPress={() => prefixLine('> ')} />
        <Tool label="Add a link" icon="link-outline" onPress={() => replaceSelection('[', '](https://)', 'link text')} />
        <Tool label="Clear selected formatting" icon="remove-circle-outline" onPress={clearFormatting} />
      </View>
      <TextInput
        accessibilityLabel={label}
        multiline
        onChangeText={onChangeText}
        onSelectionChange={(event) => setSelection(event.nativeEvent.selection)}
        placeholder={placeholder}
        placeholderTextColor={styles.placeholderColor}
        selection={selection}
        style={[styles.field, styles.textArea]}
        textAlignVertical="top"
        value={value}
      />
    </View>
  );
}
