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
import { useAccessibility } from '../theme/AccessibilityContext';
import { spacing } from '../theme/theme';
import {
  fetchScripture,
  getBibleReaderTextSize,
  saveLastPosition,
  saveBibleReaderTextSize,
  getLastPosition,
  type BibleReaderTextSize,
} from '../services/bibleService';
import {
  completeDailyReading,
  getDailyReadingCompletion,
  getTodaysDailyReading,
} from '../services/dailyReadingService';
import { DailyReading } from '../services/database';

type Tab = 'daily' | 'read';

const BIBLE_READER_TEXT_SCALE: Record<BibleReaderTextSize, number> = {
  standard: 1,
  large: 1.15,
  extraLarge: 1.3,
};

const BIBLE_READER_TEXT_SIZE_OPTIONS: {
  key: BibleReaderTextSize;
  label: string;
}[] = [
  { key: 'standard', label: 'Standard' },
  { key: 'large', label: 'Large' },
  { key: 'extraLarge', label: 'Extra large' },
];

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

function getFirstChapterFromReference(scriptureRef?: string) {
  if (!scriptureRef) return null;

  const match = scriptureRef
    .trim()
    .match(/^(.+?)\s+(\d+)(?::\d+)?(?:[-;].*)?$/);

  if (!match) return null;

  const matchingBook = BIBLE_BOOKS.find(
    ([name]) => name.toLowerCase() === match[1].trim().toLowerCase()
  );

  if (!matchingBook) return null;

  return {
    book: matchingBook[0],
    chapter: Math.min(Math.max(Number(match[2]), 1), matchingBook[1]),
  };
}

export default function Bible() {
  const { colors, fonts } = useAccessibility();
  const styles = makeStyles(colors, fonts);

  const [tab, setTab] = useState<Tab>('daily');
  const [reading, setReading] = useState<DailyReading | null>(null);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadReading = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const { reading: todayReading, error: readingError } =
        await getTodaysDailyReading();

      if (readingError) {
        console.warn('Unable to load today\'s reading.', readingError.message);
        setReading(null);
        setCompleted(false);
        setLoadError('We could not load today\'s reading. Please try again.');
        return;
      }

      setReading(todayReading);

      if (!todayReading) {
        setCompleted(false);
        return;
      }

      const { completed: isCompleted, error: completionError } =
        await getDailyReadingCompletion(todayReading.id);

      if (completionError) {
        console.warn(
          'Unable to load the daily reading completion status.',
          completionError.message
        );
        setCompleted(false);
        setLoadError('We could not confirm your reading progress. Please try again.');
        return;
      }

      setCompleted(isCompleted);
    } catch (error) {
      console.warn('Unexpected error while loading today\'s reading.', error);
      setReading(null);
      setCompleted(false);
      setLoadError('We could not load today\'s reading. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReading();
  }, [loadReading]);

  async function markComplete() {
    if (completed || !reading) return;

    setSubmitting(true);

    try {
      const { completion, error } = await completeDailyReading(reading.id);

      if (error || !completion) {
        console.warn('Unable to complete today\'s reading.', error?.message);
        Alert.alert(
          'Unable to mark complete',
          'Please check your connection and try again.'
        );
        return;
      }

      setCompleted(true);
      const dayLabel = completion.current_streak === 1 ? 'day' : 'days';
      Alert.alert(
        'Reading completed',
        `Today’s reading has been saved. Your current streak is ${completion.current_streak} ${dayLabel}.`
      );
    } catch (error) {
      console.warn('Unexpected error while completing today\'s reading.', error);
      Alert.alert(
        'Unable to mark complete',
        'Please check your connection and try again.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      {tab === 'daily' && (
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Holy Bible</Text>
          <Text style={styles.heroSub}>
            Read daily devotionals or explore the full KJV Bible.
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
        <BibleReader
          key={
            reading && !completed
              ? `daily-reading-${reading.id}`
              : 'personal-reading'
          }
          dailyReadingReference={
            reading && !completed ? reading.scripture_ref : undefined
          }
        />
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
              {reading
                ? reading.reflection ||
                  'Open the Read tab to read today’s passage.'
                : 'There is no scripture scheduled for today.'}
            </Text>

            {loadError ? (
              <View style={styles.readingError}>
                <Text style={styles.readingErrorText}>{loadError}</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadReading}>
                  <Text style={styles.retryButtonText}>Try again</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.completeBtn,
                  (completed || !reading) && styles.disabledCompleteBtn,
                ]}
                disabled={completed || submitting || !reading}
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
                  {!reading
                    ? 'No reading scheduled'
                    : completed
                      ? 'Completed'
                      : submitting
                        ? 'Saving...'
                        : 'Mark Complete'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function BibleReader({
  dailyReadingReference,
}: {
  dailyReadingReference?: string;
}) {
  const { colors, fonts } = useAccessibility();
  const dailyReadingStart = getFirstChapterFromReference(dailyReadingReference);
  const isGuidedDailyReading = Boolean(dailyReadingStart);

  const [book, setBook] = useState<string>(
    () => dailyReadingStart?.book ?? 'Genesis'
  );
  const [chapter, setChapter] = useState(() => dailyReadingStart?.chapter ?? 1);
  const [verse, setVerse] = useState<number | undefined>();
  const [input, setInput] = useState(
    () =>
      dailyReadingStart
        ? `${dailyReadingStart.book} ${dailyReadingStart.chapter}`
        : 'Genesis'
  );
  const [passage, setPassage] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchStep, setSearchStep] = useState<'book' | 'chapter' | 'verse' | null>(null);
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [highlightedVerses, setHighlightedVerses] = useState<number[]>([]);
  const [readerTextSize, setReaderTextSize] = useState<BibleReaderTextSize>(
    'standard'
  );
  const [isTextSizeMenuOpen, setIsTextSizeMenuOpen] = useState(false);
  const readerTextScale = BIBLE_READER_TEXT_SCALE[readerTextSize];
  const styles = makeStyles(colors, fonts, readerTextScale);

  useEffect(() => {
    let isActive = true;

    void getBibleReaderTextSize().then((savedTextSize) => {
      if (isActive) {
        setReaderTextSize(savedTextSize);
      }
    });

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (isGuidedDailyReading) return;

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
  }, [isGuidedDailyReading]);

  const load = useCallback(async () => {
    setLoading(true);

    try {
      // Always load the chapter so the verse picker remains available after a verse is chosen.
      const ref = `${book} ${chapter}`;
      const data = await fetchScripture(ref);
      setPassage(data);
      if (!isGuidedDailyReading) {
        saveLastPosition(book, chapter, verse);
      }
    } finally {
      setLoading(false);
    }
  }, [book, chapter, isGuidedDailyReading, verse]);

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

  function selectReaderTextSize(textSize: BibleReaderTextSize) {
    setReaderTextSize(textSize);
    setIsTextSizeMenuOpen(false);
    void saveBibleReaderTextSize(textSize);
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
          <View style={styles.readerHeading}>
            <Text style={styles.readerTitle}>
              {book} {chapter}
              {verse ? `:${verse}` : ''}
            </Text>
            <TouchableOpacity
              accessibilityLabel="Choose Bible text size"
              accessibilityRole="button"
              accessibilityState={{ expanded: isTextSizeMenuOpen }}
              onPress={() => setIsTextSizeMenuOpen((isOpen) => !isOpen)}
              style={styles.readerTextSizeButton}
            >
              <Text style={styles.readerTextSizeButtonText}>Aa</Text>
            </TouchableOpacity>
          </View>

          {isTextSizeMenuOpen ? (
            <View style={styles.readerTextSizeMenu}>
              {BIBLE_READER_TEXT_SIZE_OPTIONS.map((option) => (
                <TouchableOpacity
                  accessibilityLabel={`${option.label} Bible text size`}
                  accessibilityRole="button"
                  accessibilityState={{ selected: readerTextSize === option.key }}
                  key={option.key}
                  onPress={() => selectReaderTextSize(option.key)}
                  style={[
                    styles.readerTextSizeOption,
                    readerTextSize === option.key && styles.readerTextSizeOptionActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.readerTextSizeOptionText,
                      readerTextSize === option.key &&
                        styles.readerTextSizeOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

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

function makeStyles(colors: any, fonts: any, readerTextScale = 1) {
  const readerVerseFontSize = Math.round(
    fonts.bodyLarge * readerTextScale
  );
  const readerVerseLineHeight = Math.round(readerVerseFontSize * 1.9);

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

    disabledCompleteBtn: {
      backgroundColor: '#8A8A8A',
    },

    completeText: {
      color: '#FFF',
      fontWeight: '700',
      marginLeft: 8,
    },

    readingError: {
      backgroundColor: colors.background,
      borderRadius: 14,
      marginTop: spacing.xl,
      padding: spacing.md,
    },

    readingErrorText: {
      color: colors.text,
      lineHeight: fonts.body * 1.5,
      textAlign: 'center',
    },

    retryButton: {
      alignItems: 'center',
      borderColor: colors.primary,
      borderRadius: 10,
      borderWidth: 1,
      marginTop: spacing.md,
      paddingVertical: 10,
    },

    retryButtonText: {
      color: colors.primary,
      fontWeight: '700',
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
    },

    readerHeading: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },

    readerTextSizeButton: {
      alignItems: 'center',
      borderColor: colors.primary,
      borderRadius: 10,
      borderWidth: 1,
      justifyContent: 'center',
      minHeight: 44,
      minWidth: 44,
      paddingHorizontal: spacing.xs,
    },

    readerTextSizeButtonText: {
      color: colors.primary,
      fontSize: fonts.body,
      fontWeight: '700',
    },

    readerTextSizeMenu: {
      backgroundColor: colors.background,
      borderRadius: 12,
      flexDirection: 'row',
      marginBottom: spacing.md,
      padding: 4,
    },

    readerTextSizeOption: {
      alignItems: 'center',
      borderRadius: 9,
      flex: 1,
      minHeight: 44,
      justifyContent: 'center',
      paddingHorizontal: 4,
    },

    readerTextSizeOptionActive: {
      backgroundColor: colors.primary,
    },

    readerTextSizeOptionText: {
      color: colors.primary,
      fontSize: fonts.caption,
      fontWeight: '700',
    },

    readerTextSizeOptionTextActive: {
      color: '#FFF',
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
      fontSize: readerVerseFontSize,
      lineHeight: readerVerseLineHeight,
      color: colors.text,
      borderRadius: 8,
      marginBottom: spacing.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },

    verseText: {
      color: colors.text,
      fontSize: readerVerseFontSize,
      lineHeight: readerVerseLineHeight,
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
