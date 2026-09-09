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
import { useAccessibility } from '../theme/AccessibilityContext';
import { spacing, radii } from '../theme/theme';

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

export default function Calendar() {
  const { colors, fonts } = useAccessibility();
  const styles = makeStyles(colors, fonts);

  return (
    <View style={styles.container}>
       <EventCalendar colors={colors} fonts={fonts} />
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
    // tabRow: {
    //   flexDirection: 'row',
    //   margin: spacing.lg,
    //   backgroundColor: colors.surface,
    //   borderRadius: radii.md,
    //   borderWidth: 1,
    //   borderColor: colors.borderSoft,
    //   overflow: 'hidden',
    // },
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
    stepperButton: {
      padding: spacing.sm,
      minWidth: 44,
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    eventTitle: { fontSize: fonts.bodyLarge, fontWeight: '700', color: colors.primary },
    eventSubText: { fontSize: fonts.body, color: colors.textMuted, marginTop: 2 },
    emptyText: { fontSize: fonts.body, color: colors.textMuted, marginTop: spacing.md },
  });
}
