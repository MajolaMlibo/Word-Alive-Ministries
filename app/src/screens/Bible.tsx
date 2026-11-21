import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  Share,
  type ScrollViewInstance,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
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
import {
  BibleHighlightColor,
  BibleVerseSave,
  DailyReading,
} from '../services/database';
import {
  getAllBibleVerseSaves,
  getBibleVerseSaves,
  saveBibleVerseNote,
  setBibleVerseBookmarks,
  setBibleVerseHighlights,
} from '../services/bibleVerseSaveService';

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

const BIBLE_HIGHLIGHT_OPTIONS: {
  key: BibleHighlightColor;
  label: string;
  color: string;
}[] = [
  { key: 'gold', label: 'Gold', color: '#F7E7A9' },
  { key: 'green', label: 'Green', color: '#CBE8CE' },
  { key: 'blue', label: 'Blue', color: '#C9E3F6' },
  { key: 'pink', label: 'Pink', color: '#F8D2DE' },
];

const HIGHLIGHT_COLOR_BY_KEY = Object.fromEntries(
  BIBLE_HIGHLIGHT_OPTIONS.map((option) => [option.key, option.color])
) as Record<BibleHighlightColor, string>;

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
  const [searchStep, setSearchStep] = useState<'book' | 'chapter' | null>(null);
  const [isPassageNavigationOpen, setIsPassageNavigationOpen] = useState(false);
  const [selectedVerses, setSelectedVerses] = useState<number[]>([]);
  const [verseSaves, setVerseSaves] = useState<BibleVerseSave[]>([]);
  const [allVerseSaves, setAllVerseSaves] = useState<BibleVerseSave[]>([]);
  const [isVerseActionsOpen, setIsVerseActionsOpen] = useState(false);
  const [isSavedVersesOpen, setIsSavedVersesOpen] = useState(false);
  const [isNoteEditorOpen, setIsNoteEditorOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [savingVerseAction, setSavingVerseAction] = useState(false);
  const [readerTextSize, setReaderTextSize] = useState<BibleReaderTextSize>(
    'standard'
  );
  const [isTextSizeMenuOpen, setIsTextSizeMenuOpen] = useState(false);
  const readerScrollRef = useRef<ScrollViewInstance>(null);
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

  useEffect(() => {
    readerScrollRef.current?.scrollTo({ animated: true, y: 0 });
  }, [book, chapter]);

  const loadVerseSaves = useCallback(async () => {
    const { saves, error } = await getBibleVerseSaves(book, chapter);
    if (error) {
      console.warn('Unable to load saved Bible activity.', error.message);
      return;
    }
    setVerseSaves(saves);
  }, [book, chapter]);

  async function openSavedVerses() {
    const { saves, error } = await getAllBibleVerseSaves();
    if (error) {
      console.warn('Unable to load saved Bible activity.', error.message);
      Alert.alert('Unable to load saved verses', 'Please check your connection and try again.');
      return;
    }
    setAllVerseSaves(saves);
    setIsSavedVersesOpen(true);
  }

  function openSavedVerse(save: BibleVerseSave) {
    setBook(save.book);
    setChapter(save.chapter);
    setVerse(save.verse);
    setInput(`${save.book} ${save.chapter}:${save.verse}`);
    setSearchStep(null);
    setIsSavedVersesOpen(false);
  }

  useEffect(() => {
    setSelectedVerses([]);
    setIsVerseActionsOpen(false);
    void loadVerseSaves();
  }, [loadVerseSaves]);

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
    setIsPassageNavigationOpen(false);
  }

  const bookQuery = input.replace(/\s+\d.*$/, '').trim().toLowerCase();
  const bookSuggestions = BIBLE_BOOKS.filter(([name]) =>
    name.toLowerCase().includes(bookQuery)
  ).slice(0, 6);
  const chapters = Array.from({ length: getChapterCount(book) }, (_, index) => index + 1);

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
    setSearchStep(null);
    setIsPassageNavigationOpen(false);
  }

  function togglePassageNavigation() {
    setSearchStep(null);
    setIsPassageNavigationOpen((isOpen) => !isOpen);
  }

  function toggleVerseSelection(selectedVerse: number) {
    setSelectedVerses((current) =>
      current.includes(selectedVerse)
        ? current.filter((item) => item !== selectedVerse)
        : [...current, selectedVerse]
    );
  }

  const selectedVerseNumbers = [...selectedVerses].sort((left, right) => left - right);
  const verseSaveByNumber = new Map(verseSaves.map((save) => [save.verse, save]));
  const allSelectedVersesBookmarked =
    selectedVerseNumbers.length > 0 &&
    selectedVerseNumbers.every((selectedVerse) => verseSaveByNumber.get(selectedVerse)?.is_bookmarked);

  function selectedReferenceLabel() {
    return `${book} ${chapter}:${selectedVerseNumbers.join(', ')}`;
  }

  function selectedVerseText() {
    const selectedText = (passage?.verses ?? [])
      .filter((item: any) => selectedVerseNumbers.includes(item.verse))
      .map((item: any) => `${item.verse}. ${String(item.text).trim()}`)
      .join('\n');

    return `${selectedReferenceLabel()} (KJV)\n\n${selectedText}`;
  }

  async function saveHighlights(color: BibleHighlightColor | null) {
    if (!selectedVerseNumbers.length) return;
    setSavingVerseAction(true);
    const { error } = await setBibleVerseHighlights(book, chapter, selectedVerseNumbers, color);
    setSavingVerseAction(false);

    if (error) {
      console.warn('Unable to save Bible highlight.', error.message);
      Alert.alert('Unable to save highlight', 'Please check your connection and try again.');
      return;
    }

    await loadVerseSaves();
    setSelectedVerses([]);
    setIsVerseActionsOpen(false);
  }

  async function toggleBookmarks() {
    if (!selectedVerseNumbers.length) return;
    setSavingVerseAction(true);
    const { error } = await setBibleVerseBookmarks(
      book,
      chapter,
      selectedVerseNumbers,
      !allSelectedVersesBookmarked
    );
    setSavingVerseAction(false);

    if (error) {
      console.warn('Unable to save Bible bookmark.', error.message);
      Alert.alert('Unable to save bookmark', 'Please check your connection and try again.');
      return;
    }

    await loadVerseSaves();
    setSelectedVerses([]);
    setIsVerseActionsOpen(false);
  }

  async function copySelectedVerses() {
    if (!selectedVerseNumbers.length) return;

    try {
      await Clipboard.setStringAsync(selectedVerseText());
      setIsVerseActionsOpen(false);
      Alert.alert('Verse copied', 'The selected KJV passage is ready to paste.');
    } catch (error) {
      console.warn('Unable to copy Bible verse.', error);
      Alert.alert('Unable to copy verse', 'Please try again.');
    }
  }

  async function shareSelectedVerses() {
    if (!selectedVerseNumbers.length) return;

    try {
      await Share.share({ message: selectedVerseText() });
      setIsVerseActionsOpen(false);
    } catch (error) {
      console.warn('Unable to share Bible verse.', error);
      Alert.alert('Unable to share verse', 'Please try again.');
    }
  }

  function openNoteEditor() {
    if (selectedVerseNumbers.length !== 1) {
      Alert.alert('Select one verse', 'Notes belong to one verse at a time.');
      return;
    }

    const existingNote = verseSaveByNumber.get(selectedVerseNumbers[0])?.note ?? '';
    setNoteDraft(existingNote);
    setIsVerseActionsOpen(false);
    setIsNoteEditorOpen(true);
  }

  async function saveNote() {
    const selectedVerse = selectedVerseNumbers[0];
    if (!selectedVerse) return;

    const trimmedNote = noteDraft.trim();
    if (trimmedNote.length > 4000) {
      Alert.alert('Note is too long', 'A Bible note can contain up to 4,000 characters.');
      return;
    }

    setSavingVerseAction(true);
    const { error } = await saveBibleVerseNote(book, chapter, selectedVerse, trimmedNote || null);
    setSavingVerseAction(false);

    if (error) {
      console.warn('Unable to save Bible note.', error.message);
      Alert.alert('Unable to save note', 'Please check your connection and try again.');
      return;
    }

    await loadVerseSaves();
    setIsNoteEditorOpen(false);
    setNoteDraft('');
    setSelectedVerses([]);
  }

  function selectReaderTextSize(textSize: BibleReaderTextSize) {
    setReaderTextSize(textSize);
    setIsTextSizeMenuOpen(false);
    void saveBibleReaderTextSize(textSize);
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.readerContent}
        ref={readerScrollRef}
        showsVerticalScrollIndicator={false}
        style={styles.reader}
      >
      <View style={styles.readerNavigation}>
        <TouchableOpacity
          accessibilityLabel="Choose Bible passage"
          accessibilityRole="button"
          accessibilityState={{ expanded: isPassageNavigationOpen }}
          onPress={togglePassageNavigation}
          style={styles.readerNavigationButton}
        >
          <View>
            <Text style={styles.readerNavigationLabel}>Choose passage</Text>
            <Text style={styles.readerNavigationReference}>
              {book} {chapter}{verse ? `:${verse}` : ''} · KJV
            </Text>
          </View>
          <View style={styles.readerNavigationChange}>
            <Text style={styles.readerNavigationChangeText}>
              {isPassageNavigationOpen ? 'Close' : 'Change'}
            </Text>
            <Ionicons
              color={colors.primary}
              name={isPassageNavigationOpen ? 'chevron-up' : 'chevron-down'}
              size={20}
            />
          </View>
        </TouchableOpacity>

        {isPassageNavigationOpen ? (
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
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator
          color={colors.primary}
          style={{ marginTop: 40 }}
        />
      ) : (
        <View style={styles.readerCard}>
          <View style={styles.readerHeading}>
            <Text style={styles.readerTitle}>
              {book} {chapter}
              {verse ? `:${verse}` : ''}
            </Text>
            <View style={styles.readerHeaderActions}>
              <TouchableOpacity
                accessibilityLabel="Open saved Bible verses"
                accessibilityRole="button"
                onPress={() => void openSavedVerses()}
                style={styles.readerTextSizeButton}
              >
                <Ionicons name="bookmark-outline" size={21} color={colors.primary} />
              </TouchableOpacity>
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
              <TouchableOpacity
                accessibilityLabel="Highlight selected verses"
                disabled={savingVerseAction}
                style={[styles.toolButton, savingVerseAction && styles.disabledToolButton]}
                onPress={() => void saveHighlights('gold')}
              >
                <Ionicons name="color-fill-outline" size={18} color="#FFF" />
                <Text style={styles.toolButtonText}>Highlight</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel="Open selected verse actions"
                disabled={savingVerseAction}
                style={styles.moreButton}
                onPress={() => setIsVerseActionsOpen(true)}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color={colors.primary} />
                <Text style={styles.moreButtonText}>More</Text>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel="Clear selected verses"
                disabled={savingVerseAction}
                style={styles.clearSelectionButton}
                onPress={() => setSelectedVerses([])}
              >
                <Ionicons name="close" size={18} color={colors.primary} />
              </TouchableOpacity>
            </View>
          )}

          {passage?.verses?.filter((v: any) => !verse || v.verse === verse).map((v: any) => {
            const verseSave = verseSaveByNumber.get(v.verse);
            return (
              <TouchableOpacity
                accessibilityLabel={`Verse ${v.verse}${verseSave?.is_bookmarked ? ', bookmarked' : ''}${verseSave?.note ? ', has a note' : ''}`}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedVerses.includes(v.verse) }}
                key={v.verse}
                activeOpacity={0.7}
                onPress={() => toggleVerseSelection(v.verse)}
                style={[
                  styles.verse,
                  verseSave?.highlight_color && {
                    backgroundColor: HIGHLIGHT_COLOR_BY_KEY[verseSave.highlight_color],
                  },
                  selectedVerses.includes(v.verse) && styles.selectedVerse,
                ]}
              >
                <Text style={styles.verseText}>
                  <Text style={styles.verseNum}>{v.verse} </Text>
                  {v.text}
                </Text>
                {verseSave?.is_bookmarked || verseSave?.note ? (
                  <View style={styles.verseSaveIndicators}>
                    {verseSave.is_bookmarked ? (
                      <Ionicons name="bookmark" size={16} color={colors.primary} />
                    ) : null}
                    {verseSave.note ? (
                      <Ionicons name="chatbox-ellipses-outline" size={16} color={colors.primary} />
                    ) : null}
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
      </ScrollView>

      <Modal
        animationType="slide"
        transparent
        visible={isVerseActionsOpen}
        onRequestClose={() => setIsVerseActionsOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.actionSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Verse actions</Text>
                <Text style={styles.sheetReference}>{selectedReferenceLabel()} · KJV</Text>
              </View>
              <TouchableOpacity
                accessibilityLabel="Close verse actions"
                onPress={() => setIsVerseActionsOpen(false)}
                style={styles.sheetCloseButton}
              >
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Text style={styles.sheetLabel}>Highlight colour</Text>
            <View style={styles.highlightOptions}>
              {BIBLE_HIGHLIGHT_OPTIONS.map((option) => (
                <TouchableOpacity
                  accessibilityLabel={`Highlight selected verses ${option.label}`}
                  disabled={savingVerseAction}
                  key={option.key}
                  onPress={() => void saveHighlights(option.key)}
                  style={[styles.highlightOption, { backgroundColor: option.color }]}
                >
                  <Text style={styles.highlightOptionText}>{option.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              disabled={savingVerseAction}
              onPress={() => void saveHighlights(null)}
              style={styles.sheetAction}
            >
              <Ionicons name="color-fill-outline" size={20} color={colors.primary} />
              <Text style={styles.sheetActionText}>Remove highlight</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={savingVerseAction}
              onPress={() => void toggleBookmarks()}
              style={styles.sheetAction}
            >
              <Ionicons name={allSelectedVersesBookmarked ? 'bookmark' : 'bookmark-outline'} size={20} color={colors.primary} />
              <Text style={styles.sheetActionText}>
                {allSelectedVersesBookmarked ? 'Remove bookmark' : 'Bookmark verses'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={openNoteEditor} style={styles.sheetAction}>
              <Ionicons name="create-outline" size={20} color={colors.primary} />
              <Text style={styles.sheetActionText}>Add or edit private note</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => void copySelectedVerses()} style={styles.sheetAction}>
              <Ionicons name="copy-outline" size={20} color={colors.primary} />
              <Text style={styles.sheetActionText}>Copy verses</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => void shareSelectedVerses()} style={styles.sheetAction}>
              <Ionicons name="share-social-outline" size={20} color={colors.primary} />
              <Text style={styles.sheetActionText}>Share verses</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={isSavedVersesOpen}
        onRequestClose={() => setIsSavedVersesOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.actionSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Saved verses</Text>
                <Text style={styles.sheetReference}>Your private highlights, bookmarks, and notes</Text>
              </View>
              <TouchableOpacity
                accessibilityLabel="Close saved verses"
                onPress={() => setIsSavedVersesOpen(false)}
                style={styles.sheetCloseButton}
              >
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.savedVersesList} showsVerticalScrollIndicator={false}>
              {allVerseSaves.length ? allVerseSaves.map((save) => (
                <TouchableOpacity
                  key={save.id}
                  onPress={() => openSavedVerse(save)}
                  style={styles.savedVerseItem}
                >
                  <View style={styles.savedVerseReferenceRow}>
                    <Text style={styles.savedVerseReference}>{save.book} {save.chapter}:{save.verse}</Text>
                    <View style={styles.savedVerseIcons}>
                      {save.highlight_color ? <Ionicons name="color-fill" color={colors.primary} size={16} /> : null}
                      {save.is_bookmarked ? <Ionicons name="bookmark" color={colors.primary} size={16} /> : null}
                      {save.note ? <Ionicons name="chatbox-ellipses" color={colors.primary} size={16} /> : null}
                    </View>
                  </View>
                  {save.note ? <Text numberOfLines={2} style={styles.savedVerseNote}>{save.note}</Text> : null}
                </TouchableOpacity>
              )) : <Text style={styles.savedVersesEmpty}>No saved verses yet. Select a verse to highlight, bookmark, or add a note.</Text>}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={isNoteEditorOpen}
        onRequestClose={() => setIsNoteEditorOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.actionSheet}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Private Bible note</Text>
                <Text style={styles.sheetReference}>{selectedReferenceLabel()} · only you can see this</Text>
              </View>
              <TouchableOpacity
                accessibilityLabel="Close private note editor"
                onPress={() => setIsNoteEditorOpen(false)}
                style={styles.sheetCloseButton}
              >
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <TextInput
              accessibilityLabel="Private Bible note"
              editable={!savingVerseAction}
              maxLength={4000}
              multiline
              onChangeText={setNoteDraft}
              placeholder="Write what God is teaching you..."
              placeholderTextColor={colors.textMuted}
              style={styles.noteInput}
              textAlignVertical="top"
              value={noteDraft}
            />
            <Text style={styles.noteLength}>{noteDraft.length}/4000</Text>
            <TouchableOpacity
              disabled={savingVerseAction}
              onPress={() => void saveNote()}
              style={[styles.saveNoteButton, savingVerseAction && styles.disabledToolButton]}
            >
              <Text style={styles.saveNoteButtonText}>{savingVerseAction ? 'Saving...' : 'Save private note'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
      backgroundColor: colors.background,
      borderRadius: 14,
      padding: spacing.md,
      marginTop: spacing.sm,
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
    },

    readerContent: {
      paddingBottom: spacing.xl,
    },

    readerNavigation: {
      backgroundColor: colors.surface,
      borderRadius: 18,
      padding: spacing.sm,
    },

    readerNavigationButton: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      minHeight: 54,
      paddingHorizontal: spacing.xs,
    },

    readerNavigationLabel: {
      color: colors.textMuted,
      fontSize: fonts.caption,
      fontWeight: '700',
      textTransform: 'uppercase',
    },

    readerNavigationReference: {
      color: colors.primary,
      fontSize: fonts.body,
      fontWeight: '800',
      marginTop: 2,
    },

    readerNavigationChange: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 2,
    },

    readerNavigationChangeText: {
      color: colors.primary,
      fontSize: fonts.caption,
      fontWeight: '800',
    },

    readerCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      marginTop: spacing.md,
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

    readerHeaderActions: {
      flexDirection: 'row',
      gap: spacing.xs,
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

    disabledToolButton: {
      opacity: 0.55,
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

    clearSelectionButton: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 36,
      minWidth: 36,
    },

    verse: {
      alignItems: 'flex-start',
      fontSize: readerVerseFontSize,
      flexDirection: 'row',
      lineHeight: readerVerseLineHeight,
      color: colors.text,
      borderRadius: 8,
      marginBottom: spacing.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
    },

    verseText: {
      color: colors.text,
      flex: 1,
      fontSize: readerVerseFontSize,
      lineHeight: readerVerseLineHeight,
    },

    verseSaveIndicators: {
      flexDirection: 'row',
      gap: 4,
      marginLeft: spacing.xs,
      marginTop: 4,
    },

    selectedVerse: {
      backgroundColor: `${colors.primary}26`,
    },

    verseNum: {
      color: '#C9A227',
      fontWeight: '700',
    },

    modalBackdrop: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      flex: 1,
      justifyContent: 'flex-end',
    },

    actionSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      padding: spacing.lg,
      paddingBottom: spacing.xl,
    },

    sheetHandle: {
      alignSelf: 'center',
      backgroundColor: colors.textMuted,
      borderRadius: 3,
      height: 5,
      marginBottom: spacing.md,
      opacity: 0.55,
      width: 46,
    },

    sheetHeader: {
      alignItems: 'flex-start',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },

    sheetTitle: {
      color: colors.text,
      fontSize: fonts.bodyLarge,
      fontWeight: '800',
    },

    sheetReference: {
      color: colors.textMuted,
      fontSize: fonts.caption,
      marginTop: 2,
    },

    sheetCloseButton: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 40,
      minWidth: 40,
    },

    sheetLabel: {
      color: colors.textMuted,
      fontSize: fonts.caption,
      fontWeight: '700',
      marginBottom: spacing.xs,
      textTransform: 'uppercase',
    },

    highlightOptions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.xs,
      marginBottom: spacing.md,
    },

    highlightOption: {
      borderColor: `${colors.primary}33`,
      borderRadius: 10,
      borderWidth: 1,
      minHeight: 40,
      paddingHorizontal: spacing.sm,
      justifyContent: 'center',
    },

    highlightOptionText: {
      color: colors.text,
      fontSize: fonts.caption,
      fontWeight: '700',
    },

    sheetAction: {
      alignItems: 'center',
      borderTopColor: `${colors.textMuted}33`,
      borderTopWidth: 1,
      flexDirection: 'row',
      gap: spacing.sm,
      minHeight: 52,
      paddingVertical: spacing.sm,
    },

    sheetActionText: {
      color: colors.text,
      fontSize: fonts.body,
      fontWeight: '700',
    },

    noteInput: {
      borderColor: `${colors.primary}66`,
      borderRadius: 12,
      borderWidth: 1,
      color: colors.text,
      fontSize: fonts.body,
      minHeight: 150,
      padding: spacing.md,
    },

    noteLength: {
      alignSelf: 'flex-end',
      color: colors.textMuted,
      fontSize: fonts.caption,
      marginTop: spacing.xs,
    },

    saveNoteButton: {
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: 12,
      marginTop: spacing.md,
      minHeight: 48,
      justifyContent: 'center',
      paddingHorizontal: spacing.md,
    },

    saveNoteButtonText: {
      color: '#FFF',
      fontSize: fonts.body,
      fontWeight: '800',
    },

    savedVersesList: {
      maxHeight: 380,
    },

    savedVerseItem: {
      borderTopColor: `${colors.textMuted}33`,
      borderTopWidth: 1,
      paddingVertical: spacing.sm,
    },

    savedVerseReferenceRow: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },

    savedVerseReference: {
      color: colors.primary,
      fontSize: fonts.body,
      fontWeight: '800',
    },

    savedVerseIcons: {
      flexDirection: 'row',
      gap: 6,
    },

    savedVerseNote: {
      color: colors.textMuted,
      fontSize: fonts.caption,
      lineHeight: fonts.caption * 1.5,
      marginTop: 3,
    },

    savedVersesEmpty: {
      color: colors.textMuted,
      fontSize: fonts.body,
      lineHeight: fonts.body * 1.5,
      paddingVertical: spacing.lg,
      textAlign: 'center',
    },
  });
}
