import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { fetchScripture } from '../services/bibleService';
import { useAccessibility } from '../theme/AccessibilityContext';
import { spacing, radii } from '../theme/theme';

type Tab = 'read' | 'calendar';

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function buildMonthGrid(year: number, month: number) {
  // month is 0-indexed. Returns weeks of 7 cells (nulls for padding).
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

function toISODate(year: number, month: number, day: number) {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

export default function BibleCalendarScreen() {
  const { colors, fonts } = useAccessibility();
  const [tab, setTab] = useState<Tab>('read');
  const styles = makeStyles(colors, fonts);

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabButton, tab === 'read' && styles.tabButtonActive]}
          onPress={() => setTab('read')}
          accessibilityRole="button"
          accessibilityLabel="Read the Bible"
        >
          <Ionicons
            name="book-outline"
            size={20}
            color={tab === 'read' ? '#FFF' : colors.primary}
          />
          <Text style={[styles.tabText, tab === 'read' && styles.tabTextActive]}>
            Read
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, tab === 'calendar' && styles.tabButtonActive]}
          onPress={() => setTab('calendar')}
          accessibilityRole="button"
          accessibilityLabel="View calendar"
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={tab === 'calendar' ? '#FFF' : colors.primary}
          />
          <Text style={[styles.tabText, tab === 'calendar' && styles.tabTextActive]}>
            Calendar
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'read' ? <BibleReader colors={colors} fonts={fonts} /> : <EventCalendar colors={colors} fonts={fonts} />}
    </View>
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

// ---------- Calendar tab ----------

function EventCalendar({ colors, fonts }: any) {
  const styles = makeStyles(colors, fonts);
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const weeks = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const monthLabel = new Date(year, month, 1).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  const loadEvents = useCallback(async () => {
    setLoading(true);
    const start = toISODate(year, month, 1);
    const end = toISODate(year, month, new Date(year, month + 1, 0).getDate());

    const { data } = await supabase
      .from('bible_studies')
      .select('*')
      .gte('study_date', start)
      .lte('study_date', end)
      .order('study_date', { ascending: true });

    setEvents(data || []);
    setLoading(false);
  }, [year, month]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  function changeMonth(delta: number) {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setMonth(m);
    setYear(y);
    setSelectedDay(1);
  }

  const eventDates = useMemo(
    () => new Set(events.map((e) => e.study_date)),
    [events]
  );

  const selectedISO = toISODate(year, month, selectedDay);
  const dayEvents = events.filter((e) => e.study_date === selectedISO);
  const isToday = (day: number) =>
    day === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  return (
    <ScrollView style={styles.calendarBody} contentContainerStyle={{ paddingBottom: spacing.xl }}>
      <View style={styles.monthHeader}>
        <TouchableOpacity
          onPress={() => changeMonth(-1)}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          style={styles.stepperButton}
        >
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity
          onPress={() => changeMonth(1)}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          style={styles.stepperButton}
        >
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {WEEKDAY_LABELS.map((w, i) => (
          <Text key={i} style={styles.weekdayLabel}>
            {w}
          </Text>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={styles.weekRow}>
          {week.map((day, di) => {
            const iso = day ? toISODate(year, month, day) : null;
            const hasEvent = iso ? eventDates.has(iso) : false;
            const selected = day === selectedDay;
            return (
              <TouchableOpacity
                key={di}
                style={[
                  styles.dayCell,
                  selected && styles.dayCellSelected,
                  day ? (isToday(day) && !selected ? styles.dayCellToday : null) : null,
                ]}
                disabled={!day}
                onPress={() => day && setSelectedDay(day)}
                accessibilityRole={day ? 'button' : undefined}
                accessibilityLabel={day ? `${day} ${monthLabel}` : undefined}
              >
                {day ? (
                  <>
                    <Text
                      style={[styles.dayText, selected && styles.dayTextSelected]}
                    >
                      {day}
                    </Text>
                    {hasEvent ? (
                      <View
                        style={[
                          styles.eventDot,
                          selected && { backgroundColor: '#FFF' },
                        ]}
                      />
                    ) : null}
                  </>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}

      <View style={styles.agenda}>
        <Text style={styles.agendaHeading}>
          {new Date(year, month, selectedDay).toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </Text>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />
        ) : dayEvents.length ? (
          dayEvents.map((e) => (
            <View key={e.id} style={styles.eventCard}>
              <Text style={styles.eventTitle}>{e.study_name}</Text>
              {e.chapter ? (
                <Text style={styles.eventSubText}>Chapter: {e.chapter}</Text>
              ) : null}
              {e.start_time ? (
                <Text style={styles.eventSubText}>{e.start_time}</Text>
              ) : null}
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>No study scheduled for this day.</Text>
        )}
      </View>
    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof import('../theme/theme').getColors>, fonts: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    tabRow: {
      flexDirection: 'row',
      margin: spacing.lg,
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      overflow: 'hidden',
    },
    tabButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacing.sm + 2,
    },
    tabButtonActive: { backgroundColor: colors.primary },
    tabText: {
      marginLeft: spacing.xs,
      color: colors.primary,
      fontWeight: '600',
      fontSize: fonts.body,
    },
    tabTextActive: { color: '#FFF' },

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
    emptyText: { fontSize: fonts.body, color: colors.textMuted, marginTop: spacing.md },

    // calendar
    calendarBody: { flex: 1, paddingHorizontal: spacing.lg },
    monthHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing.sm,
    },
    monthLabel: {
      fontSize: fonts.subtitle,
      fontWeight: '700',
      color: colors.primary,
      marginHorizontal: spacing.md,
      minWidth: 160,
      textAlign: 'center',
    },
    weekdayRow: { flexDirection: 'row', marginBottom: spacing.xs },
    weekdayLabel: {
      flex: 1,
      textAlign: 'center',
      color: colors.textMuted,
      fontWeight: '600',
      fontSize: fonts.caption,
    },
    weekRow: { flexDirection: 'row', marginBottom: spacing.xs },
    dayCell: {
      flex: 1,
      aspectRatio: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radii.sm,
      marginHorizontal: 2,
    },
    dayCellSelected: { backgroundColor: colors.primary },
    dayCellToday: { borderWidth: 1, borderColor: colors.primary },
    dayText: { fontSize: fonts.body, color: colors.text },
    dayTextSelected: { color: '#FFF', fontWeight: '700' },
    eventDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.accentDeep,
      marginTop: 2,
    },
    agenda: { marginTop: spacing.lg },
    agendaHeading: {
      fontSize: fonts.subtitle,
      fontWeight: '700',
      color: colors.primary,
      marginBottom: spacing.sm,
    },
    eventCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    eventTitle: { fontSize: fonts.bodyLarge, fontWeight: '700', color: colors.primary },
    eventSubText: { fontSize: fonts.body, color: colors.textMuted, marginTop: 2 },
  });
}
