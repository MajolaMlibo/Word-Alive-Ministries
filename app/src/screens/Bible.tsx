import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { useAccessibility } from '../theme/AccessibilityContext';
import { spacing, radii } from '../theme/theme';
import {
  fetchScripture,
  saveLastPosition,
  getLastPosition,
} from '../services/bibleService';

type Tab = 'daily' | 'read';

function parseReference(input: string) {
  const match = input.trim().match(/^(.*?)\s+(\d+)(?::(\d+))?$/);

  if (match) {
    return {
      book: match[1],
      chapter: Number(match[2]),
      verse: match[3] ? Number(match[3]) : undefined,
    };
  }

  return { book: input.trim(), chapter: 1 };
}

export default function Bible() {
  const { colors, fonts } = useAccessibility();
  const styles = makeStyles(colors, fonts);

  const [tab, setTab] = useState<Tab>('daily');
  const [reading, setReading] = useState<any>(null);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
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
    if (completed || !reading) return;

    setSubmitting(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase.from('user_progress').insert({
      user_id: user.id,
      reading_id: reading.id,
      completed_at: new Date().toISOString(),
    });

    if (error) {
      Alert.alert('Error', error.message);
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
      .update({
        current_streak: (profile?.current_streak || 0) + 1,
      })
      .eq('id', user.id);

    setCompleted(true);
    setSubmitting(false);
    Alert.alert('Well done!', 'Today’s reading has been completed.');
  }

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Holy Bible</Text>
        <Text style={styles.heroSub}>
          Read daily devotionals or explore the full NIV Bible.
        </Text>
      </View>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'daily' && styles.activeTab]}
          onPress={() => setTab('daily')}
        >
          <Ionicons
            name="book-outline"
            size={18}
            color={tab === 'daily' ? '#FFF' : colors.primary}
          />
          <Text
            style={[
              styles.tabText,
              tab === 'daily' && { color: '#FFF' },
            ]}
          >
            Today
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, tab === 'read' && styles.activeTab]}
          onPress={() => setTab('read')}
        >
          <Ionicons
            name="library-outline"
            size={18}
            color={tab === 'read' ? '#FFF' : colors.primary}
          />
          <Text
            style={[
              styles.tabText,
              tab === 'read' && { color: '#FFF' },
            ]}
          >
            Read
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'read' ? (
        <BibleReader />
      ) : loading ? (
        <ActivityIndicator
          color={colors.primary}
          style={{ marginTop: 40 }}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.todayCard}>
            <Text style={styles.date}>
              {new Date().toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>

            <Text style={styles.reference}>
              {reading?.scripture_ref || 'No reading'}
            </Text>

            <Text style={styles.scripture}>
              {reading?.content ||
                'There is no scripture scheduled for today.'}
            </Text>

            <TouchableOpacity
              style={[
                styles.completeBtn,
                completed && { backgroundColor: '#2E7D32' },
              ]}
              disabled={completed || submitting}
              onPress={markComplete}
            >
              <Ionicons
                name={
                  completed
                    ? 'checkmark-circle'
                    : 'checkmark-circle-outline'
                }
                size={20}
                color="#FFF"
              />
              <Text style={styles.completeText}>
                {completed ? 'Completed' : 'Mark Complete'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function BibleReader() {
  const { colors, fonts } = useAccessibility();
  const styles = makeStyles(colors, fonts);

  const [book, setBook] = useState('Genesis');
  const [chapter, setChapter] = useState(1);
  const [verse, setVerse] = useState<number | undefined>();
  const [input, setInput] = useState('Genesis 1');
  const [passage, setPassage] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await getLastPosition();
      if (saved?.book) {
        setBook(saved.book);
        setChapter(saved.chapter);
        setVerse(saved.verse);
        setInput(
          `${saved.book} ${saved.chapter}${
            saved.verse ? ':' + saved.verse : ''
          }`
        );
      }
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      const ref = `${book} ${chapter}${verse ? ':' + verse : ''}`;
      const data = await fetchScripture(ref);
      setPassage(data);
      saveLastPosition(book, chapter, verse);
    } finally {
      setLoading(false);
    }
  }, [book, chapter, verse]);

  useEffect(() => {
    load();
  }, [load]);

  function submit() {
    const p = parseReference(input);
    setBook(p.book);
    setChapter(p.chapter);
    setVerse(p.verse);
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.searchCard}>
        <TextInput
          value={input}
          onChangeText={setInput}
          onSubmitEditing={submit}
          placeholder="John 3"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
        />

        <View style={styles.stepper}>
          <TouchableOpacity
            onPress={() => {
              if (chapter > 1) {
                setVerse(undefined);
                setChapter(chapter - 1);
              }
            }}
          >
            <Ionicons
              name="chevron-back-circle"
              size={34}
              color={colors.primary}
            />
          </TouchableOpacity>

          <Text style={styles.chapter}>Chapter {chapter}</Text>

          <TouchableOpacity
            onPress={() => {
              setVerse(undefined);
              setChapter(chapter + 1);
            }}
          >
            <Ionicons
              name="chevron-forward-circle"
              size={34}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator
          color={colors.primary}
          style={{ marginTop: 40 }}
        />
      ) : (
        <ScrollView
          style={styles.reader}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.readerTitle}>
            {book} {chapter}
            {verse ? `:${verse}` : ''}
          </Text>

          {passage?.verses?.map((v: any) => (
            <Text key={v.verse} style={styles.verse}>
              <Text style={styles.verseNum}>{v.verse} </Text>
              {v.text}
            </Text>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function makeStyles(colors: any, fonts: any) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: spacing.lg,
    },

    hero: {
      backgroundColor: colors.primary,
      borderRadius: 22,
      padding: spacing.lg,
      marginBottom: spacing.md,
    },

    heroTitle: {
      color: '#FFF',
      fontSize: fonts.display,
      fontWeight: '700',
    },

    heroSub: {
      color: '#D8F4E3',
      marginTop: 6,
      lineHeight: fonts.body * 1.5,
    },

    tabs: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 4,
      marginBottom: spacing.lg,
    },

    tab: {
      flex: 1,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 12,
      borderRadius: 12,
    },

    activeTab: {
      backgroundColor: colors.primary,
    },

    tabText: {
      marginLeft: 6,
      fontWeight: '700',
      color: colors.primary,
    },

    todayCard: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: spacing.lg,
    },

    date: {
      color: colors.textMuted,
      marginBottom: spacing.sm,
    },

    reference: {
      color: colors.primary,
      fontSize: fonts.title,
      fontWeight: '700',
      marginBottom: spacing.md,
    },

    scripture: {
      fontSize: fonts.bodyLarge,
      color: colors.text,
      lineHeight: fonts.bodyLarge * 1.8,
    },

    completeBtn: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      marginTop: spacing.xl,
      paddingVertical: 14,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },

    completeText: {
      color: '#FFF',
      fontWeight: '700',
      marginLeft: 8,
    },

    searchCard: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: spacing.md,
      marginBottom: spacing.md,
    },

    input: {
      backgroundColor: colors.background,
      borderRadius: 12,
      paddingHorizontal: spacing.md,
      paddingVertical: 12,
      color: colors.text,
      fontSize: fonts.body,
      marginBottom: spacing.md,
    },

    stepper: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    chapter: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: fonts.bodyLarge,
    },

    reader: {
      flex: 1,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: spacing.lg,
    },

    readerTitle: {
      color: colors.primary,
      fontSize: fonts.title,
      fontWeight: '700',
      marginBottom: spacing.lg,
    },

    verse: {
      fontSize: fonts.bodyLarge,
      lineHeight: fonts.bodyLarge * 1.9,
      color: colors.text,
      marginBottom: spacing.sm,
    },

    verseNum: {
      color: '#C9A227',
      fontWeight: '700',
    },
  });
}