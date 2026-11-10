import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../services/supabase';
import { BibleStudy, DailyReading } from '../services/database';
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

function formatStudyTime(startTime: string | null, endTime: string | null) {
  if (!startTime) return null;

  const start = startTime.slice(0, 5);
  return endTime ? `${start} – ${endTime.slice(0, 5)}` : start;
}

function getHttpsUrl(value: string | null) {
  const url = value?.trim();
  return url && /^https:\/\//i.test(url) ? url : null;
}

function StudyNotesCard({
  study,
  colors,
  styles,
  onOpenStudyLink,
}: {
  study: BibleStudy;
  colors: any;
  styles: any;
  onOpenStudyLink: (url: string) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const studyTime = formatStudyTime(study.start_time, study.end_time);
  const studyLink = getHttpsUrl(study.location_or_url);

  return (
    <View style={styles.studyNotesCard}>
      <TouchableOpacity
        accessibilityLabel={`${study.study_name} study notes`}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((isExpanded) => !isExpanded)}
        style={styles.studyNotesHeader}
      >
        <View style={styles.studyNotesIcon}>
          <Ionicons name="school" size={20} color="#FFF" />
        </View>
        <View style={styles.studyNotesHeadingText}>
          <Text style={styles.studyNotesTitle}>{study.study_name}</Text>
          {study.scripture_ref ? (
            <Text style={styles.studyNotesScripture}>{study.scripture_ref}</Text>
          ) : null}
        </View>
        <Ionicons
          color={colors.primary}
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={22}
        />
      </TouchableOpacity>

      {expanded ? (
        <View style={styles.studyNotesDetails}>
          {studyTime ? (
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={16} color={colors.textMuted} />
              <Text style={styles.infoText}>{studyTime}</Text>
            </View>
          ) : null}

          {study.location_or_url ? (
            <View style={styles.infoRow}>
              <Ionicons
                name="location-outline"
                size={16}
                color={colors.textMuted}
              />
              <Text style={styles.infoText}>{study.location_or_url}</Text>
            </View>
          ) : null}

          {studyLink ? (
            <TouchableOpacity
              accessibilityLabel="Open study link"
              accessibilityRole="link"
              onPress={() => void onOpenStudyLink(studyLink)}
              style={styles.studyLinkButton}
            >
              <Text style={styles.studyLinkButtonText}>Open study link</Text>
              <Ionicons name="open-outline" size={16} color={colors.primary} />
            </TouchableOpacity>
          ) : null}

          <Text style={styles.description}>
            {study.description || 'No additional study notes have been published.'}
          </Text>
        </View>
      ) : (
        <Text style={styles.studyNotesHint}>Tap to view study notes</Text>
      )}
    </View>
  );
}

export default function CalendarScreen() {
  const { colors, fonts } = useAccessibility();
  const styles = makeStyles(colors, fonts);

  const today = dateFromISO(getSouthAfricaDate());

  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  const [events, setEvents] = useState<BibleStudy[]>([]);
  const [readings, setReadings] = useState<DailyReading[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadWarning, setLoadWarning] = useState<string | null>(null);

  const weeks = useMemo(() => buildMonthGrid(year, month), [year, month]);

  const monthLabel = new Date(year, month).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  });

  const loadCalendarContent = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setLoadWarning(null);

    try {
      const start = toISO(year, month, 1);
      const end = toISO(
        year,
        month,
        new Date(year, month + 1, 0).getDate()
      );

      const [studiesResult, readingsResult] = await Promise.all([
        supabase
          .from('bible_studies')
          .select('*')
          .eq('status', 'published')
          .gte('study_date', start)
          .lte('study_date', end)
          .order('study_date', { ascending: true }),
        supabase
          .from('daily_readings')
          .select('*')
          .eq('status', 'published')
          .gte('scheduled_date', start)
          .lte('scheduled_date', end)
          .order('scheduled_date', { ascending: true }),
      ]);

      if (studiesResult.error) {
        console.warn('Unable to load calendar studies.', studiesResult.error.message);
        setEvents([]);
      } else {
        setEvents((studiesResult.data as BibleStudy[]) || []);
      }

      if (readingsResult.error) {
        console.warn(
          'Unable to load calendar reading-plan days.',
          readingsResult.error.message
        );
        setReadings([]);
      } else {
        setReadings((readingsResult.data as DailyReading[]) || []);
      }

      if (studiesResult.error && readingsResult.error) {
        setLoadError('We could not load the calendar. Please try again.');
      } else if (studiesResult.error) {
        setLoadWarning('Study events are unavailable. The reading plan is still shown.');
      } else if (readingsResult.error) {
        setLoadWarning('Reading-plan days are unavailable. Study events are still shown.');
      }
    } catch (error) {
      console.warn('Unexpected error while loading calendar content.', error);
      setEvents([]);
      setReadings([]);
      setLoadError('We could not load the calendar. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    void loadCalendarContent();
  }, [loadCalendarContent]);

  const eventDates = useMemo(
    () => new Set(events.map((e) => e.study_date)),
    [events]
  );
  const readingDates = useMemo(
    () => new Set(readings.map((reading) => reading.scheduled_date)),
    [readings]
  );
  const readingsByDate = useMemo(
    () => new Map(readings.map((reading) => [reading.scheduled_date, reading])),
    [readings]
  );

  const selectedISO = toISO(year, month, selectedDay);

  const dayEvents = events.filter((e) => e.study_date === selectedISO);
  const selectedReading = readingsByDate.get(selectedISO) || null;

  const isToday = (day: number) =>
    day === today.getDate() &&
    month === today.getMonth() &&
    year === today.getFullYear();

  const openStudyLink = useCallback(async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.warn('Unable to open study link.', error);
      Alert.alert('Unable to open link', 'Please try again later.');
    }
  }, []);

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
          <TouchableOpacity
            accessibilityLabel="Previous month"
            accessibilityRole="button"
            onPress={() => changeMonth(-1)}
          >
            <Ionicons
              name="chevron-back-circle"
              size={32}
              color={colors.primary}
            />
          </TouchableOpacity>

          <Text style={styles.monthText}>{monthLabel}</Text>

          <TouchableOpacity
            accessibilityLabel="Next month"
            accessibilityRole="button"
            onPress={() => changeMonth(1)}
          >
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
              const hasReading = readingDates.has(iso);
              const selected = day === selectedDay;
              const dateLabel = new Date(year, month, day).toLocaleDateString(
                'en-GB',
                { weekday: 'long', day: 'numeric', month: 'long' }
              );
              const contentLabel = [
                hasReading ? 'reading plan' : null,
                hasEvent ? 'study or event' : null,
              ]
                .filter(Boolean)
                .join(' and ');

              return (
                <TouchableOpacity
                  accessibilityLabel={
                    contentLabel ? `${dateLabel}: ${contentLabel}` : dateLabel
                  }
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
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

                  {hasReading || hasEvent ? (
                    <View style={styles.dayMarkers}>
                      {hasReading ? (
                        <View
                          style={[
                            styles.dot,
                            styles.readingDot,
                            selected && styles.selectedDot,
                          ]}
                        />
                      ) : null}
                      {hasEvent ? (
                        <View
                          style={[
                            styles.dot,
                            styles.studyDot,
                            selected && styles.selectedDot,
                          ]}
                        />
                      ) : null}
                    </View>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.dot, styles.readingDot]} />
            <Text style={styles.legendText}>Reading plan</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.dot, styles.studyDot]} />
            <Text style={styles.legendText}>Study or event</Text>
          </View>
        </View>
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
          <TouchableOpacity style={styles.retryButton} onPress={loadCalendarContent}>
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {loadWarning ? (
            <View style={styles.warningCard}>
              <Ionicons name="warning-outline" size={20} color={colors.primary} />
              <Text style={styles.warningText}>{loadWarning}</Text>
            </View>
          ) : null}

          {selectedReading ? (
            <View style={styles.readingCard}>
              <View style={styles.readingIcon}>
                <Ionicons name="book" size={21} color={colors.primary} />
              </View>
              <View style={styles.readingContent}>
                <Text style={styles.readingLabel}>
                  {selectedReading.scheduled_date.slice(0, 4)} Reading Plan
                </Text>
                <Text style={styles.readingReference}>
                  {selectedReading.scripture_ref}
                </Text>
                <Text style={styles.readingHint}>
                  Day {selectedReading.day_number} scheduled chapters
                </Text>
              </View>
            </View>
          ) : null}

          {dayEvents.length ? (
            <View style={styles.studyNotesSection}>
              <View style={styles.studyNotesSectionHeader}>
                <Ionicons name="school-outline" size={20} color={colors.primary} />
                <Text style={styles.studyNotesSectionTitle}>Study Notes</Text>
              </View>
              {dayEvents.map((event) => (
                <StudyNotesCard
                  colors={colors}
                  key={event.id}
                  study={event}
                  styles={styles}
                  onOpenStudyLink={openStudyLink}
                />
              ))}
            </View>
          ) : null}

          {!selectedReading && !dayEvents.length ? (
            <View style={styles.emptyCard}>
              <Ionicons
                name="calendar-clear-outline"
                size={42}
                color={colors.textMuted}
              />
              <Text style={styles.emptyTitle}>Nothing planned</Text>
              <Text style={styles.emptyText}>
                There is no reading-plan entry or published study for this day.
              </Text>
            </View>
          ) : null}
        </>
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
      borderRadius: 4,
      height: 8,
      width: 8,
    },

    dayMarkers: {
      flexDirection: 'row',
      gap: 3,
      marginTop: 4,
    },

    readingDot: {
      backgroundColor: colors.accent,
    },

    studyDot: {
      backgroundColor: colors.primary,
    },

    selectedDot: {
      backgroundColor: '#FFF',
    },

    legend: {
      alignItems: 'center',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing.md,
      justifyContent: 'center',
      marginTop: spacing.sm,
    },

    legendItem: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: spacing.xs,
    },

    legendText: {
      color: colors.textMuted,
      fontSize: fonts.caption,
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

    warningCard: {
      alignItems: 'center',
      backgroundColor: colors.accentSoft,
      borderRadius: 14,
      flexDirection: 'row',
      marginBottom: spacing.md,
      padding: spacing.sm,
    },

    warningText: {
      color: colors.text,
      flex: 1,
      fontSize: fonts.caption,
      lineHeight: fonts.caption * 1.4,
      marginLeft: spacing.xs,
    },

    readingCard: {
      backgroundColor: colors.surface,
      borderColor: colors.accent,
      borderRadius: 20,
      borderWidth: 1,
      flexDirection: 'row',
      padding: spacing.md,
      marginBottom: spacing.md,
      elevation: 1,
    },

    readingIcon: {
      alignItems: 'center',
      backgroundColor: colors.accentSoft,
      borderRadius: 21,
      height: 42,
      justifyContent: 'center',
      marginRight: spacing.sm,
      width: 42,
    },

    readingContent: {
      flex: 1,
    },

    readingLabel: {
      color: colors.textMuted,
      fontSize: fonts.caption,
      fontWeight: '700',
    },

    readingReference: {
      color: colors.primary,
      fontSize: fonts.bodyLarge,
      fontWeight: '700',
      marginTop: 2,
    },

    readingHint: {
      color: colors.textMuted,
      fontSize: fonts.caption,
      marginTop: 3,
    },

    studyNotesSection: {
      marginBottom: spacing.md,
    },

    studyNotesSectionHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      marginBottom: spacing.sm,
    },

    studyNotesSectionTitle: {
      color: colors.primary,
      fontSize: fonts.subtitle,
      fontWeight: '700',
      marginLeft: spacing.xs,
    },

    studyNotesCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      marginBottom: spacing.sm,
      padding: spacing.md,
      elevation: 1,
    },

    studyNotesHeader: {
      alignItems: 'center',
      flexDirection: 'row',
    },

    studyNotesIcon: {
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: 21,
      height: 42,
      marginRight: spacing.sm,
      justifyContent: 'center',
      width: 42,
    },

    studyNotesHeadingText: {
      flex: 1,
    },

    studyNotesTitle: {
      fontSize: fonts.bodyLarge,
      fontWeight: '700',
      color: colors.text,
    },

    studyNotesScripture: {
      color: colors.textMuted,
      marginTop: 2,
    },

    studyNotesHint: {
      color: colors.primary,
      fontSize: fonts.caption,
      fontWeight: '700',
      marginLeft: 54,
      marginTop: spacing.sm,
    },

    studyNotesDetails: {
      borderTopColor: colors.borderSoft,
      borderTopWidth: 1,
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
    },

    studyLinkButton: {
      alignItems: 'center',
      alignSelf: 'flex-start',
      flexDirection: 'row',
      gap: 4,
      marginTop: spacing.sm,
      paddingVertical: spacing.xs,
    },

    studyLinkButtonText: {
      color: colors.primary,
      fontSize: fonts.caption,
      fontWeight: '700',
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
