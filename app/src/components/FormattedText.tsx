import React from 'react';
import { Linking, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { displayText } from './richText';
import { tokenizeScriptureReferences } from '../services/scriptureReference';

type Props = { text: string; styles: any; containerStyle?: any };

function ScriptureTokens({ value, styles, navigation, textStyle }: { value: string; styles: any; navigation: any; textStyle?: any }) {
  return <>{tokenizeScriptureReferences(value).map((token, tokenIndex) => token.reference ? (
    <Text
      accessibilityHint="Opens this passage in the Bible reader"
      accessibilityLabel={`Open ${token.reference} in the Bible reader`}
      accessibilityRole="link"
      key={tokenIndex}
      onPress={() => navigation.navigate('Bible', { scriptureReference: token.reference, scriptureLinkNonce: String(Date.now()) })}
      style={[textStyle, styles.formattedLink]}
    >
      {token.text}
    </Text>
  ) : <Text key={tokenIndex} style={textStyle}>{token.text}</Text>)}</>;
}

function InlineText({ value, styles }: { value: string; styles: any }) {
  const navigation = useNavigation<any>();
  const parts = value.split(/(\*\*[^*]+\*\*|_[^_]+_|\[[^\]]+\]\(https:\/\/[^)]+\))/g);
  return <Text style={styles.formattedText}>{parts.map((part, index) => {
    if (/^\*\*[^*]+\*\*$/.test(part)) return <Text key={index} style={styles.formattedBold}><ScriptureTokens value={part.slice(2, -2)} styles={styles} navigation={navigation} textStyle={styles.formattedBold} /></Text>;
    if (/^_[^_]+_$/.test(part)) return <Text key={index} style={styles.formattedItalic}><ScriptureTokens value={part.slice(1, -1)} styles={styles} navigation={navigation} textStyle={styles.formattedItalic} /></Text>;
    const linkMatch = part.match(/^\[([^\]]+)\]\((https:\/\/[^)]+)\)$/);
    if (linkMatch) return <Text key={index} onPress={() => void Linking.openURL(linkMatch[2])} style={styles.formattedLink}>{linkMatch[1]}</Text>;
    return <React.Fragment key={index}><ScriptureTokens value={part} styles={styles} navigation={navigation} /></React.Fragment>;
  })}</Text>;
}

export default function FormattedText({ text, styles, containerStyle }: Props) {
  const display = displayText(text);
  return <View style={containerStyle}>{display.split('\n').map((line, index) => {
    if (line.startsWith('## ')) return <InlineText key={index} value={line.slice(3)} styles={{ ...styles, formattedText: styles.formattedHeading }} />;
    if (line.startsWith('> ')) return <View key={index} style={styles.formattedQuote}><InlineText value={line.slice(2)} styles={styles} /></View>;
    const numbered = line.match(/^(\d+)\.\s(.*)$/);
    if (numbered || /^[-*] /.test(line)) return <View key={index} style={styles.formattedListRow}>
      <Text style={styles.formattedListMarker}>{numbered ? numbered[1] + '.' : '•'}</Text>
      <View style={{ flex: 1 }}><InlineText value={numbered ? numbered[2] : line.slice(2)} styles={styles} /></View>
    </View>;
    return <InlineText key={index} value={line || ' '} styles={styles} />;
  })}</View>;
}
