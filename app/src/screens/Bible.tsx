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
import { DailyReading } from '../services/database';

type Tab = 'daily' | 'read';

const BIBLE_BOOKS = [
  ['Genesis', 50], ['Exodus', 40], ['Leviticus', 27], ['Numbers', 36], ['Deuteronomy', 34],
  ['Joshua', 24], ['Judges', 21], ['Ruth', 4], ['1 Samuel', 31], ['2 Samuel', 24],
  ['1 Kings', 22], ['2 Kings', 25], ['1 Chronicles', 29], ['2 Chronicles', 36], ['Ezra', 10],
  ['Nehemiah', 13], ['Esther', 10], ['Job', 42], ['Psalms', 150], ['Proverbs', 31],
  ['Ecclesiastes', 12], ['Song of Solomon', 8], ['Isaiah', 66], ['Jeremiah', 52], ['Lamentations', 5],
  ['Ezekiel', 48], ['Daniel', 12], ['Hosea', 14], ['Joel', 3], ['Amos', 9], ['Obadiah', 1],
  ['Jonah', 4], ['Micah', 7], ['Nahum', 3], ['Habakkuk', 3], ['Zephaniah', 3], ['Haggai', 2],
  ['Zechariah', 14], ['Malachi', 4], ['Matthew', 28], ['Mark', 16], ['Luke', 24], ['John', 21],
  ['Acts', 28], ['Romans', 16], ['1 Corinthians', 16], ['2 Corinthians', 13], ['Galatians', 6],
  ['Ephesians', 6], ['Philippians', 4], ['Colossians', 4], ['1 Thessalonians', 5],
  ['2 Thessalonians', 3], ['1 Timothy', 6], ['2 Timothy', 4], ['Titus', 3], ['Philemon', 1],
  ['Hebrews', 13], ['James', 5], ['1 Peter', 5], ['2 Peter', 3], ['1 John', 5], ['2 John', 1],
  ['3 John', 1], ['Jude', 1], ['Revelation', 22],
] as const;

const getChapterCount = (book: string) =>
  BIBLE_BOOKS.find(([name]) => name === book)?.[1] ?? 1;

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
  const [reading, setReading] = useState<DailyReading | null>(null);
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
      {tab === 'daily' && (
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Holy Bible</Text>
          <Text style={styles.heroSub}>
            Read daily devotionals or explore the full NIV Bible.
          </Text>
        </View>
      )}

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
  const [input, setInput] = useState('Genesis');
  const [passage, setPassage] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchStep, setSearchStep] = useState<'book' | 'chapter' | 'verse' | null>(null);
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [highlightedVerses, setHighlightedVerses] = useState<number[]>([]);

  useEffect(() => {
    (async () => {
      const saved = await getLastPosition();
      if (saved?.book) {
        setBook(saved.book);
        setChapter(saved.chapter);
        setVerse(saved.verse);
        setInput(
         saved.chapter ? `${saved.book} ${saved.chapter}${saved.verse ? ':' + saved.verse : ''}` : saved.book
        );
      }
      if (saved?.chapter) {
        setChapter(saved.chapter);
      }
      setVerse(saved?.verse);
    })();
  }, []);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      // Always load the chapter so the verse picker remains available after a verse is chosen.
      const ref = `${book} ${chapter}`;
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
    if (!p.book) return;
    const matchingBook = BIBLE_BOOKS.find(
      ([name]) => name.toLowerCase() === p.book.toLowerCase()
    );

    if (!matchingBook) {
      Alert.alert('Book not found', 'Choose a book from the suggestions below.');
      return;
    }

    setBook(matchingBook[0]);
    setChapter(Math.min(Math.max(p.chapter, 1), matchingBook[1]));
    setVerse(p.verse);
    setSearchStep(null);
  }

  const bookQuery = input.replace(/\s+\d.*$/, '').trim().toLowerCase();
  const bookSuggestions = BIBLE_BOOKS.filter(([name]) =>
    name.toLowerCase().includes(bookQuery)
  ).slice(0, 6);
  const chapters = Array.from({ length: getChapterCount(book) }, (_, index) => index + 1);
  const verses = passage?.verses?.map((item: any) => item.verse) ?? [];

  function selectBook(selectedBook: string) {
    setBook(selectedBook);
    setChapter(1);
    setVerse(undefined);
    setSelectedVerses([]);
    setInput(selectedBook);
    setSearchStep('chapter');
  }

  function selectChapter(selectedChapter: number) {
    setChapter(selectedChapter);
    setVerse(undefined);
    setSelectedVerses([]);
    setInput(`${book} ${selectedChapter}`);
    setSearchStep('verse');
  }

  function selectVerse(selectedVerse: number) {
    setVerse(selectedVerse);
    setInput(`${book} ${chapter}:${selectedVerse}`);
    setSearchStep(null);
  }

  function toggleVerseSelection(selectedVerse: number) {
    setSelectedVerses((current) =>
      current.includes(selectedVerse)
        ? current.filter((item) => item !== selectedVerse)
        : [...current, selectedVerse]
    );
  }

  function highlightSelectedVerses() {
    setHighlightedVerses((current) => Array.from(new Set([...current, ...selectedVerses])));
    setSelectedVerses([]);
  }

  function showMoreVerseActions() {
    Alert.alert(
      `${book} ${chapter}:${selectedVerses.join(', ')}`,
      'More verse actions such as notes, sharing, and bookmarks can be added here.'
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.searchCard}>
        <TextInput
          value={input}
          onChangeText={(value) => {
            setInput(value);
            setSearchStep('book');
          }}
          onSubmitEditing={submit}
          onFocus={() => setSearchStep('book')}
          placeholder="Search a book, e.g. John"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          returnKeyType="search"
        />

        {searchStep && (
          <ScrollView
            style={styles.pickerScroll}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
          {searchStep === 'book' && <>
          <Text style={styles.pickerLabel}>Choose a book</Text>
          <View style={styles.bookSuggestions}>
          {bookSuggestions.map(([name]) => (
            <TouchableOpacity
              key={name}
              style={[styles.bookChip, name === book && styles.selectedChip]}
              onPress={() => selectBook(name)}
            >
              <Text style={[styles.bookChipText, name === book && styles.selectedChipText]}>
                {name}
              </Text>
            </TouchableOpacity>
          ))}
          </View>
          </>}

          {searchStep === 'chapter' && <>
          <Text style={styles.pickerLabel}>Choose a chapter</Text>
          <View style={styles.numberGrid}>
          {chapters.map((number) => (
            <TouchableOpacity
              key={number}
              style={[styles.numberChip, number === chapter && styles.selectedChip]}
              onPress={() => selectChapter(number)}
            >
              <Text style={[styles.numberChipText, number === chapter && styles.selectedChipText]}>{number}</Text>
            </TouchableOpacity>
          ))}
          </View>
          </>}

          {searchStep === 'verse' && <>
          <Text style={styles.pickerLabel}>Choose a verse</Text>
          {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.verseLoading} />
        ) : verses.length ? (
          <View style={styles.numberGrid}>
            {verses.map((number: number) => (
              <TouchableOpacity
                key={number}
                style={[styles.numberChip, number === verse && styles.selectedChip]}
                onPress={() => selectVerse(number)}
              >
                <Text style={[styles.numberChipText, number === verse && styles.selectedChipText]}>{number}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.pickerHint}>Choose a chapter to see its verses.</Text>
        )}
          </>}
          </ScrollView>
        )}

        <View style={styles.stepper}>
          <TouchableOpacity
            onPress={() => {
              if (chapter > 1) {
                setVerse(undefined);
                selectChapter(chapter - 1);
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
              if (chapter < getChapterCount(book)) selectChapter(chapter + 1);
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

          {selectedVerses.length > 0 && (
            <View style={styles.verseTools}>
              <Text style={styles.selectionCount}>{selectedVerses.length} selected</Text>
              <TouchableOpacity style={styles.toolButton} onPress={highlightSelectedVerses}>
                <Ionicons name="color-fill-outline" size={18} color="#FFF" />
                <Text style={styles.toolButtonText}>Highlight</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.moreButton} onPress={showMoreVerseActions}>
                <Ionicons name="ellipsis-horizontal" size={20} color={colors.primary} />
                <Text style={styles.moreButtonText}>More</Text>
              </TouchableOpacity>
            </View>
          )}

          {passage?.verses?.filter((v: any) => !verse || v.verse === verse).map((v: any) => (
            <TouchableOpacity
              key={v.verse}
              activeOpacity={0.7}
              onPress={() => toggleVerseSelection(v.verse)}
              style={[
                styles.verse,
                selectedVerses.includes(v.verse) && styles.selectedVerse,
                highlightedVerses.includes(v.verse) && styles.highlightedVerse,
              ]}
            >
              <Text style={styles.verseText}>
                <Text style={styles.verseNum}>{v.verse} </Text>
                {v.text}
              </Text>
            </TouchableOpacity>
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

    pickerLabel: {
      color: colors.text,
      fontWeight: '700',
      marginBottom: spacing.sm,
      marginTop: spacing.sm,
    },

    pickerScroll: {
      maxHeight: 230,
    },

    bookSuggestions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -3,
    },

    bookChip: {
      backgroundColor: colors.background,
      borderRadius: 10,
      margin: 3,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },

    bookChipText: {
      color: colors.text,
      fontWeight: '600',
    },

    numberGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginHorizontal: -3,
    },

    numberChip: {
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 8,
      justifyContent: 'center',
      margin: 3,
      minWidth: 34,
      paddingHorizontal: 8,
      paddingVertical: 8,
    },

    numberChipText: {
      color: colors.text,
      fontWeight: '700',
    },

    selectedChip: {
      backgroundColor: colors.primary,
    },

    selectedChipText: {
      color: '#FFF',
    },

    pickerHint: {
      color: colors.textMuted,
      fontSize: fonts.body,
      marginBottom: spacing.sm,
    },

    verseLoading: {
      marginVertical: spacing.sm,
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

    verseTools: {
      alignItems: 'center',
      backgroundColor: colors.background,
      borderRadius: 14,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.sm,
      marginBottom: spacing.md,
      padding: spacing.sm,
    },

    selectionCount: {
      color: colors.textMuted,
      fontSize: fonts.body,
      fontWeight: '600',
      marginRight: 'auto',
    },

    toolButton: {
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: 10,
      flexDirection: 'row',
      gap: 5,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },

    toolButtonText: {
      color: '#FFF',
      fontWeight: '700',
    },

    moreButton: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 3,
      paddingHorizontal: 6,
      paddingVertical: 8,
    },

    moreButtonText: {
      color: colors.primary,
      fontWeight: '700',
    },

    verse: {
      fontSize: fonts.bodyLarge,
      lineHeight: fonts.bodyLarge * 1.9,
      color: colors.text,
      borderRadius: 8,
      marginBottom: spacing.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },

    verseText: {
      color: colors.text,
      fontSize: fonts.bodyLarge,
      lineHeight: fonts.bodyLarge * 1.9,
    },

    selectedVerse: {
      backgroundColor: `${colors.primary}26`,
    },

    highlightedVerse: {
      backgroundColor: '#F7E7A9',
    },

    verseNum: {
      color: '#C9A227',
      fontWeight: '700',
    },
  });
}
