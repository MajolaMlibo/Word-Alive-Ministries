import React from 'react';
import { Keyboard, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAccessibility } from '../theme/AccessibilityContext';

type Props = {
  placeholder: string;
  value: string;
  appliedSearch: string;
  filterActive: boolean;
  onChange: (text: string) => void;
  onSearch: () => void;
  onClearSearch: () => void;
  onClearFilters: () => void;
};

export default function AdminSearchBar(props: Props) {
  const { colors, fonts } = useAccessibility();
  function submit() {
    Keyboard.dismiss();
    props.onSearch();
  }
  return <View style={styles.row}>
    <View style={[styles.field, { borderColor: colors.borderSoft, backgroundColor: colors.surface }]}>
      <TextInput
        accessibilityLabel={props.placeholder}
        placeholder={props.placeholder}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, { color: colors.text, fontSize: fonts.body }]}
        autoCapitalize="none"
        returnKeyType="search"
        clearButtonMode="never"
        value={props.value}
        onChangeText={props.onChange}
        onSubmitEditing={submit}
      />
      {(props.value.length > 0 || props.appliedSearch.length > 0) && <TouchableOpacity
        accessibilityRole="button" accessibilityLabel="Clear search" onPress={props.onClearSearch} style={styles.control}>
        <Ionicons name="close" size={20} color={colors.textMuted} />
      </TouchableOpacity>}
      {props.filterActive && <TouchableOpacity
        accessibilityRole="button" accessibilityLabel="Clear filters" onPress={props.onClearFilters} style={styles.control}>
        <Ionicons name="funnel-outline" size={20} color={colors.text} />
        <Ionicons name="close-circle" size={13} color={colors.text} style={[styles.filterX, { backgroundColor: colors.surface }]} />
      </TouchableOpacity>}
    </View>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel="Search" onPress={submit}
      style={[styles.control, styles.submit, { backgroundColor: colors.primary }]}>
      <Ionicons name="search" size={21} color="#FFFFFF" />
    </TouchableOpacity>
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  field: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1 },
  input: { flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: 10 },
  control: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  submit: { borderRadius: 12 },
  filterX: { position: 'absolute', right: 8, bottom: 8, borderRadius: 7 },
});
