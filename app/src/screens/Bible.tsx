import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { useAccessibility } from '../theme/AccessibilityContext';
import { spacing, radii } from '../theme/theme';

export default function DailyReadingScreen() {
  const { colors, fonts } = useAccessibility();
  const [reading, setReading] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadReading = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0];

    const { data } = await supabase
      .from('daily_readings')
      .select('*')
      .eq('scheduled_date', today)
      .single();

    setReading(data);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && data) {
      const { data: progress } = await supabase
        .from('user_progress')
        .select('id')
        .eq('user_id', user.id)
        .eq('reading_id', data.id)
        .maybeSingle();
      setCompleted(!!progress);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadReading();
  }, [loadReading]);

  async function markComplete() {
    if (completed || submitting) return;
    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user || !reading) {
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from('user_progress').insert({
      user_id: user.id,
      reading_id: reading.id,
      completed_at: new Date().toISOString(),
    });

    if (error) {
      Alert.alert('Could not save', error.message);
      setSubmitting(false);
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('current_streak')
      .eq('id', user.id)
      .single();

    await supabase
      .from('profiles')
      .update({ current_streak: (profile?.current_streak || 0) + 1 })
      .eq('id', user.id);

    setCompleted(true);
    setSubmitting(false);
    Alert.alert('Well done', 'Today\u2019s reading is marked complete.');
  }

  const styles = makeStyles(colors, fonts);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!reading) {
    return (
      <View style={styles.center}>
        <Ionicons name="book-outline" size={40} color={colors.textMuted} />
        <Text style={styles.emptyText}>
          No reading has been scheduled for today yet.
        </Text>
        <Text style={styles.emptySubText}>Please check back soon.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: spacing.xl }}>
      <View style={styles.header}>
        <Ionicons name="book" size={28} color={colors.primary} />
        <Text style={styles.heading}>Today's Reading</Text>
      </View>

      <Text style={styles.dateText}>
        {new Date().toLocaleDateString('en-GB', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })}
      </Text>

      <View style={styles.card}>
        <Text style={styles.reference}>{reading.scripture_ref}</Text>
        <Text style={styles.scripture}>{reading.content}</Text>

        <TouchableOpacity
          style={[styles.button, completed && styles.buttonDone]}
          onPress={markComplete}
          disabled={completed || submitting}
          accessibilityRole="button"
          accessibilityLabel={
            completed ? 'Reading already completed' : 'Mark reading as complete'
          }
        >
          <Ionicons
            name={completed ? 'checkmark-done-circle' : 'checkmark-circle'}
            size={22}
            color={completed ? '#FFF' : colors.text}
          />
          <Text style={[styles.buttonText, completed && styles.buttonTextDone]}>
            {completed ? '  Completed' : '  Mark as complete'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof import('../theme/theme').getColors>, fonts: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
      padding: spacing.lg,
    },
    emptyText: {
      fontSize: fonts.bodyLarge,
      color: colors.text,
      textAlign: 'center',
      marginTop: spacing.md,
      fontWeight: '600',
    },
    emptySubText: {
      fontSize: fonts.body,
      color: colors.textMuted,
      marginTop: spacing.xs,
      textAlign: 'center',
    },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs },
    heading: {
      fontSize: fonts.title,
      fontWeight: '700',
      marginLeft: spacing.sm,
      color: colors.primary,
    },
    dateText: {
      fontSize: fonts.body,
      color: colors.textMuted,
      marginBottom: spacing.lg,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderColor: colors.border,
      padding: spacing.lg,
    },
    reference: {
      fontSize: fonts.subtitle,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: spacing.md,
    },
    scripture: {
      fontSize: fonts.bodyLarge,
      lineHeight: fonts.bodyLarge * 1.6,
      color: colors.text,
    },
    button: {
      backgroundColor: colors.accent,
      marginTop: spacing.xl,
      paddingVertical: spacing.sm + 4,
      borderRadius: radii.sm,
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      minHeight: 50,
    },
    buttonDone: { backgroundColor: colors.primary },
    buttonText: { fontWeight: '700', color: colors.text, fontSize: fonts.body },
    buttonTextDone: { color: '#FFF' },
  });
}
