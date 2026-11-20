import React from 'react';
import { Linking, Text, TouchableOpacity, View } from 'react-native';

type Props = { text: string; styles: any };

function InlineText({ value, styles }: { value: string; styles: any }) {
  const parts = value.split(/(\*\*[^*]+\*\*|_[^_]+_|\[[^\]]+\]\(https:\/\/[^)]+\))/g);
  return <Text style={styles.formattedText}>{parts.map((part, index) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <Text key={index} style={styles.formattedBold}>{part.slice(2, -2)}</Text>;
    if (/^_[^_]+_$/.test(part)) return <Text key={index} style={styles.formattedItalic}>{part.slice(1, -1)}</Text>;
    const linkMatch = part.match(/^\[([^\]]+)\]\((https:\/\/[^)]+)\)$/);
    if (linkMatch) return <Text key={index} onPress={() => void Linking.openURL(linkMatch[2])} style={styles.formattedLink}>{linkMatch[1]}</Text>;
    return <React.Fragment key={index}>{part}</React.Fragment>;
  })}</Text>;
}

export default function FormattedText({ text, styles }: Props) {
  return <View>{text.split('\n').map((line, index) => {
    if (line.startsWith('## ')) return <InlineText key={index} value={line.slice(3)} styles={{ ...styles, formattedText: styles.formattedHeading }} />;
    if (line.startsWith('> ')) return <View key={index} style={styles.formattedQuote}><InlineText value={line.slice(2)} styles={styles} /></View>;
    const numbered = line.match(/^(\d+)\.\s(.*)$/);
    if (numbered) return <View key={index} style={styles.formattedListRow}><Text style={styles.formattedListMarker}>{numbered[1]}.</Text><InlineText value={numbered[2]} styles={styles} /></View>;
    if (line.startsWith('- ')) return <View key={index} style={styles.formattedListRow}><Text style={styles.formattedListMarker}>•</Text><InlineText value={line.slice(2)} styles={styles} /></View>;
    return <InlineText key={index} value={line || ' '} styles={styles} />;
  })}</View>;
}
