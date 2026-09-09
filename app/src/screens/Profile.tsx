import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { useAccessibility } from '../theme/AccessibilityContext';
import { spacing, radii, TEXT_SCALES, TextScaleKey } from '../theme/theme';

const TEXT_SIZE_OPTIONS: { key: TextScaleKey; label: string }[] = [
  { key: 'standard', label: 'A' },
  { key: 'large', label: 'A' },
  { key: 'extraLarge', label: 'A' },
];

export default function ProfileScreen() {
  const {
    colors,
    fonts,
    highContrast,
    setHighContrast,
    textScaleKey,
    setTextScaleKey,
  } = useAccessibility();
  const styles = makeStyles(colors, fonts);

  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single();

    setProfile(data);
  }

  return (
    <View style={styles.container}>
      <Ionicons name="person-circle" size={90} color={colors.primary} />
      <Text style={styles.name}>{profile?.name || 'Member'}</Text>

      <View style={styles.card}>
        <Text style={styles.label}>Reading Streak</Text>
        <Text style={styles.streak}>{profile?.current_streak || 0} Days</Text>
      </View>

      <View style={styles.settingsCard}>
        <Text style={styles.sectionLabel}>Display Settings</Text>

        <View style={styles.setting}>
          <View style={{ flex: 1 }}>
            <Text style={styles.settingLabel}>High Contrast</Text>
            <Text style={styles.settingHint}>Stronger colors, easier to read</Text>
          </View>
          <Switch
            value={highContrast}
            onValueChange={setHighContrast}
            accessibilityLabel="Toggle high contrast"
          />
        </View>

        <View style={[styles.setting, { marginTop: spacing.lg }]}>
          <Text style={styles.settingLabel}>Text Size</Text>
        </View>
        <View style={styles.textSizeRow}>
          {TEXT_SIZE_OPTIONS.map((option, index) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.textSizeButton,
                textScaleKey === option.key && styles.textSizeButtonActive,
              ]}
              onPress={() => setTextScaleKey(option.key)}
              accessibilityRole="button"
              accessibilityLabel={`Set text size to ${option.key}`}
            >
              <Text
                style={[
                  styles.textSizeButtonLabel,
                  { fontSize: 16 + index * 6 },
                  textScaleKey === option.key && styles.textSizeButtonLabelActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity
        style={styles.logout}
        onPress={() => supabase.auth.signOut()}
        accessibilityRole="button"
        accessibilityLabel="Sign out"
      >
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof import('../theme/theme').getColors>, fonts: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      padding: spacing.lg,
    },
    name: {
      fontSize: fonts.title,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: spacing.lg,
    },
    card: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      padding: spacing.lg,
    },
    label: { color: colors.textMuted, fontSize: fonts.body },
    streak: {
      fontSize: fonts.display,
      fontWeight: '700',
      color: colors.primary,
      marginTop: spacing.xs,
    },
    settingsCard: {
      width: '100%',
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      padding: spacing.lg,
      marginTop: spacing.lg,
    },
    sectionLabel: {
      fontSize: fonts.caption + 1,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: spacing.sm,
    },
    setting: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    settingLabel: { fontSize: fonts.body, color: colors.text, fontWeight: '600' },
    settingHint: { fontSize: fonts.caption, color: colors.textMuted, marginTop: 2 },
    textSizeRow: {
      flexDirection: 'row',
      marginTop: spacing.sm,
    },
    textSizeButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: colors.borderSoft,
      borderRadius: radii.sm,
      paddingVertical: spacing.sm + 2,
      marginRight: spacing.sm,
      minHeight: 48,
    },
    textSizeButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    textSizeButtonLabel: { color: colors.primary, fontWeight: '700' },
    textSizeButtonLabelActive: { color: '#FFF' },
    logout: {
      marginTop: spacing.xl,
      backgroundColor: colors.danger,
      paddingVertical: spacing.sm + 4,
      width: '100%',
      borderRadius: radii.md,
      alignItems: 'center',
      minHeight: 50,
      justifyContent: 'center',
    },
    logoutText: { color: '#FFF', fontWeight: '700', fontSize: fonts.body },
  });
}
