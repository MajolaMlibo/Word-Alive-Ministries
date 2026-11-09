import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { BibleStudy } from '../services/database';
import { getSouthAfricaDate } from '../services/dailyReadingService';
import { useAccessibility } from '../theme/AccessibilityContext';
import { spacing } from '../theme/theme';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function buildMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const start = firstDay.getDay();
  const days = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(start).fill(null),
    ...Array.from({ length: days }, (_, i) => i + 1),
  ];

  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7)
    weeks.push(cells.slice(i, i + 7));

  return weeks;
}

function toISO(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(
    2,
    '0'
  )}`;
}

function dateFromISO(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatStudyTime(startTime: string) {
  return startTime.slice(0, 5);
}

export default function CalendarScreen() {
  const { colors, fonts } = useAccessibility();
  const styles = makeStyles(colors, fonts);

  const today = dateFromISO(getSouthAfricaDate());

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  const [events, setEvents] = useState<BibleStudy[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const weeks = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const monthLabel = new Date(year, month).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    try {
      const start = toISO(year, month, 1);
      const end = toISO(
        year,
        month,
        new Date(year, month + 1, 0).getDate()
      );

      const { data, error } = await supabase
        .from('bible_studies')
        .select('*')
        .gte('study_date', start)
        .lte('study_date', end)
        .order('study_date', { ascending: true });

      if (error) {
        console.warn('Unable to load calendar studies.', error.message);
        setEvents([]);
        setLoadError('We could not load the calendar. Please try again.');
        return;
      }

      setEvents((data as BibleStudy[]) || []);
    } catch (error) {
      console.warn('Unexpected error while loading calendar studies.', error);
      setEvents([]);
      setLoadError('We could not load the calendar. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const eventDates = useMemo(
    () => new Set(events.map((e) => e.study_date)),
    [events]
  );

  const selectedISO = toISO(year, month, selectedDay);

  const dayEvents = events.filter((e) => e.study_date === selectedISO);

  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  const changeMonth = (delta: number) => {
    let m = month + delta;
    let y = year;

    if (m < 0) {
      m = 11;
      y--;
    }

    if (m > 11) {
      m = 0;
      y++;
    }

    setMonth(m);
    setYear(y);
    setSelectedDay(1);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
    >
      {/* HERO */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>Ministry Calendar</Text>
        <Text style={styles.heroSub}>
          Align and Prosper
        </Text>
      </View>

      {/* MONTH CARD */}
      <View style={styles.calendarCard}>
        <View style={styles.monthHeader}>
          <TouchableOpacity onPress={() => changeMonth(-1)}>
            <Ionicons
              name="chevron-back-circle"
              size={32}
              color={colors.primary}
            />
          </TouchableOpacity>

          <Text style={styles.monthText}>{monthLabel}</Text>

          <TouchableOpacity onPress={() => changeMonth(1)}>
            <Ionicons
              name="chevron-forward-circle"
              size={32}
              color={colors.primary}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.weekRow}>
          {WEEKDAYS.map((d) => (
            <Text key={d} style={styles.weekday}>
              {d}
            </Text>
          ))}
        </View>

        {weeks.map((week, i) => (
          <View key={i} style={styles.weekRow}>
            {week.map((day, idx) => {
              if (!day)
                return <View key={idx} style={styles.dayContainer} />;

              const iso = toISO(year, month, day);
              const hasEvent = eventDates.has(iso);
              const selected = day === selectedDay;

              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.dayContainer,
                    selected && styles.selectedDay,
                    isToday(day) && !selected && styles.todayBorder,
                  ]}
                  onPress={() => setSelectedDay(day)}
                >
                  <Text
                    style={[
                      styles.dayText,
                      selected && styles.selectedDayText,
                    ]}
                  >
                    {day}
                  </Text>

                  {hasEvent && (
                    <View
                      style={[
                        styles.dot,
                        selected && { backgroundColor: '#FFF' },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* SELECTED DAY */}
      <View style={styles.agendaHeader}>
        <Ionicons
          name="calendar-outline"
          size={20}
          color={colors.primary}
        />
        <Text style={styles.agendaTitle}>
          {new Date(year, month, selectedDay).toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator
          color={colors.primary}
          style={{ marginTop: spacing.lg }}
        />
      ) : loadError ? (
        <View style={styles.emptyCard}>
          <Ionicons
            name="cloud-offline-outline"
            size={42}
            color={colors.textMuted}
          />
          <Text style={styles.emptyTitle}>Unable to load calendar</Text>
          <Text style={styles.emptyText}>{loadError}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadEvents}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : dayEvents.length ? (
        dayEvents.map((event) => (
          <View key={event.id} style={styles.eventCard}>
            <View style={styles.eventTop}>
              <View style={styles.eventIcon}>
                <Ionicons name="book" size={20} color="#FFF" />
              </View>

              <View style={{ flex: 1 }}>
                <Text style={styles.eventTitle}>{event.study_name}</Text>

                {event.scripture_ref && (
                  <Text style={styles.eventSub}>
                    {event.scripture_ref}
                  </Text>
                )}
              </View>
            </View>

            {event.start_time && (
              <View style={styles.infoRow}>
                <Ionicons
                  name="time-outline"
                  size={16}
                  color={colors.textMuted}
                />
                <Text style={styles.infoText}>
                  {formatStudyTime(event.start_time)}
                </Text>
              </View>
            )}

            {event.location_or_url && (
              <View style={styles.infoRow}>
                <Ionicons
                  name="location-outline"
                  size={16}
                  color={colors.textMuted}
                />
                <Text style={styles.infoText}>{event.location_or_url}</Text>
              </View>
            )}

            {event.description && (
              <Text style={styles.description}>{event.description}</Text>
            )}
          </View>
        ))
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons
            name="calendar-clear-outline"
            size={42}
            color={colors.textMuted}
          />
          <Text style={styles.emptyTitle}>No Bible Study</Text>
          <Text style={styles.emptyText}>
            There are no scheduled events for this day.
          </Text>
        </View>
      )}
    </ScrollView>
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
      borderRadius: 24,
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },

    heroTitle: {
      color: '#FFF',
      fontSize: fonts.display,
      fontWeight: '700',
    },

    heroSub: {
      color: '#DDF4E5',
      marginTop: 6,
      fontSize: fonts.body,
      lineHeight: fonts.body * 1.5,
      textAlign: 'auto',
    },

    calendarCard: {
      backgroundColor: colors.surface,
      borderRadius: 22,
      padding: spacing.md,
      marginBottom: spacing.lg,
      elevation: 2,
    },

    monthHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.md,
    },

    monthText: {
      fontSize: fonts.title,
      fontWeight: '700',
      color: colors.primary,
    },

    weekRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 8,
    },

    weekday: {
      flex: 1,
      textAlign: 'center',
      color: colors.textMuted,
      fontWeight: '700',
      fontSize: fonts.caption,
    },

    dayContainer: {
      flex: 1,
      aspectRatio: 1,
      margin: 2,
      borderRadius: 14,
      justifyContent: 'center',
      alignItems: 'center',
    },

    selectedDay: {
      backgroundColor: colors.primary,
    },

    todayBorder: {
      borderWidth: 1.5,
      borderColor: colors.primary,
    },

    dayText: {
      color: colors.text,
      fontSize: fonts.body,
      fontWeight: '600',
    },

    selectedDayText: {
      color: '#FFF',
    },

    dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: '#D4AF37',
      marginTop: 4,
    },

    agendaHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.md,
    },

    agendaTitle: {
      marginLeft: spacing.sm,
      fontSize: fonts.subtitle,
      fontWeight: '700',
      color: colors.text,
    },

    eventCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: spacing.md,
      marginBottom: spacing.md,
      elevation: 1,
    },

    eventTop: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },

    eventIcon: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.sm,
    },

    eventTitle: {
      fontSize: fonts.bodyLarge,
      fontWeight: '700',
      color: colors.text,
    },

    eventSub: {
      color: colors.textMuted,
      marginTop: 2,
    },

    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 4,
    },

    infoText: {
      marginLeft: 6,
      color: colors.textMuted,
      fontSize: fonts.body,
    },

    description: {
      marginTop: spacing.sm,
      color: colors.text,
      lineHeight: fonts.body * 1.5,
    },

    emptyCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: spacing.xl,
      alignItems: 'center',
    },

    emptyTitle: {
      marginTop: spacing.sm,
      fontSize: fonts.subtitle,
      fontWeight: '700',
      color: colors.text,
    },

    emptyText: {
      textAlign: 'center',
      color: colors.textMuted,
      marginTop: 6,
      lineHeight: fonts.body * 1.5,
    },

    retryButton: {
      alignItems: 'center',
      borderColor: colors.primary,
      borderRadius: 12,
      borderWidth: 1,
      marginTop: spacing.md,
      paddingHorizontal: spacing.lg,
      paddingVertical: 10,
    },

    retryButtonText: {
      color: colors.primary,
      fontWeight: '700',
    },
  });
}
