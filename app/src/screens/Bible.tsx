import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { useAccessibility } from '../theme/AccessibilityContext';
import { spacing, radii } from '../theme/theme';
import { fetchScripture } from '../services/bibleService';

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
        <Text style={styles.container}>
           <BibleReader colors={colors} fonts={fonts} />
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

// ---------- Read tab ----------

function BibleReader({ colors, fonts }: any) {
  const styles = makeStyles(colors, fonts);
  const [book, setBook] = useState('John');
  const [chapter, setChapter] = useState(1);
  const [passage, setPassage] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [bookInput, setBookInput] = useState('John');

  const load = useCallback(async (b: string, c: number) => {
    setLoading(true);
    try {
      // Adjust to match the real signature of fetchScripture in
      // services/bibleService.ts if it differs from (book, chapter).
      const data = await fetchScripture(b);
      setPassage(data);
    } catch (e) {
      console.error('Failed to load passage:', e);
      setPassage(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(book, chapter);
  }, [book, chapter, load]);

  function goToChapter(delta: number) {
    const next = chapter + delta;
    if (next < 1) return;
    setChapter(next);
  }

  function submitBook() {
    const trimmed = bookInput.trim();
    if (!trimmed) return;
    setBook(trimmed);
    setChapter(1);
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.readerControls}>
        <TextInput
          style={styles.bookInput}
          value={bookInput}
          onChangeText={setBookInput}
          onSubmitEditing={submitBook}
          placeholder="Book, e.g. John"
          placeholderTextColor={colors.textMuted}
          returnKeyType="go"
          accessibilityLabel="Bible book name"
        />
        <View style={styles.chapterStepper}>
          <TouchableOpacity
            style={styles.stepperButton}
            onPress={() => goToChapter(-1)}
            accessibilityRole="button"
            accessibilityLabel="Previous chapter"
          >
            <Ionicons name="chevron-back" size={22} color={colors.primary} />
          </TouchableOpacity>
          <Text style={styles.chapterLabel}>Ch. {chapter}</Text>
          <TouchableOpacity
            style={styles.stepperButton}
            onPress={() => goToChapter(1)}
            accessibilityRole="button"
            accessibilityLabel="Next chapter"
          >
            <Ionicons name="chevron-forward" size={22} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.readerBody} contentContainerStyle={{ paddingBottom: spacing.xl }}>
          <Text style={styles.passageTitle}>
            {book} {chapter}
          </Text>
          {passage?.verses?.length ? (
            passage.verses.map((v: any) => (
              <Text key={v.verse} style={styles.verseText}>
                <Text style={styles.verseNumber}>{v.verse} </Text>
                {v.text}
              </Text>
            ))
          ) : (
            <Text style={styles.emptyText}>
              This passage could not be loaded. Check the book name and try again.
            </Text>
          )}
        </ScrollView>
      )}
    </View>
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

        // reader
    readerControls: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
    bookInput: {
      backgroundColor: colors.surface,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      fontSize: fonts.body,
      color: colors.text,
      marginBottom: spacing.sm,
    },
    chapterStepper: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepperButton: {
      padding: spacing.sm,
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chapterLabel: {
      fontSize: fonts.bodyLarge,
      fontWeight: '700',
      color: colors.primary,
      marginHorizontal: spacing.md,
    },
    readerBody: { flex: 1, paddingHorizontal: spacing.lg },
    passageTitle: {
      fontSize: fonts.title,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: spacing.md,
    },
    verseText: {
      fontSize: fonts.bodyLarge,
      lineHeight: fonts.bodyLarge * 1.6,
      color: colors.text,
      marginBottom: spacing.xs,
    },
    verseNumber: { fontWeight: '700', color: colors.accentDeep },
  });
}
