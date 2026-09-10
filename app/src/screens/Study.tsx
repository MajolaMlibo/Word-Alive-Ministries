import React, { useEffect, useState, useCallback } from 'react';
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
import { useAccessibility } from '../theme/AccessibilityContext';
import { spacing, radii } from '../theme/theme';

type StudyFilter = 'upcoming' | 'past';

export default function StudyScreen() {
  const { colors, fonts } = useAccessibility();
  const styles = makeStyles(colors, fonts);

  const [filter, setFilter] = useState<StudyFilter>('upcoming');
  const [studies, setStudies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadStudies = useCallback(async (which: StudyFilter) => {
    setLoading(true);

    const today = new Date().toISOString().split('T')[0];

    let query = supabase.from('bible_studies').select('*');

    query =
      which === 'upcoming'
        ? query.gte('study_date', today).order('study_date', { ascending: true })
        : query.lt('study_date', today).order('study_date', { ascending: false });

    const { data } = await query;

    setStudies(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStudies(filter);
  }, [filter, loadStudies]);

  return (
    <View style={styles.container}>
      {/* Hero */}
      <View style={styles.hero}>
        <Ionicons name="library" size={34} color="#FFF" />
        <Text style={styles.heroTitle}>Bible Study</Text>
        <Text style={styles.heroSub}>
          Grow together through scheduled teachings and Scripture.
        </Text>
      </View>

      {/* Filter */}
      <View style={styles.segment}>
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            filter === 'upcoming' && styles.segmentActive,
          ]}
          onPress={() => setFilter('upcoming')}
        >
          <Text
            style={[
              styles.segmentText,
              filter === 'upcoming' && styles.segmentTextActive,
            ]}
          >
            Upcoming
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.segmentBtn,
            filter === 'past' && styles.segmentActive,
          ]}
          onPress={() => setFilter('past')}
        >
          <Text
            style={[
              styles.segmentText,
              filter === 'past' && styles.segmentTextActive,
            ]}
          >
            Past
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : studies.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name="book-outline"
            size={46}
            color={colors.textMuted}
          />
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptyText}>
            {filter === 'upcoming'
              ? 'There are no upcoming Bible studies.'
              : 'No previous studies have been added.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
        >
          {studies.map((study) => {
            const open = expandedId === study.id;

            return (
              <TouchableOpacity
                key={study.id}
                activeOpacity={0.9}
                style={styles.card}
                onPress={() => setExpandedId(open ? null : study.id)}
              >
                <View style={styles.topRow}>
                  <View style={styles.iconCircle}>
                    <Ionicons
                      name="book"
                      size={20}
                      color={colors.primary}
                    />
                  </View>

                  <View style={{ flex: 1 }}>
                    <Text style={styles.studyName}>
                      {study.study_name}
                    </Text>

                    {study.chapter ? (
                      <Text style={styles.chapter}>
                        Chapter {study.chapter}
                      </Text>
                    ) : null}
                  </View>

                  <Ionicons
                    name={open ? 'chevron-up' : 'chevron-down'}
                    size={22}
                    color={colors.primary}
                  />
                </View>

                <View style={styles.metaRow}>
                  <Ionicons
                    name="calendar-outline"
                    size={15}
                    color={colors.textMuted}
                  />
                  <Text style={styles.meta}>
                    {new Date(study.study_date).toLocaleDateString(
                      'en-GB',
                      {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      }
                    )}
                  </Text>

                  {study.start_time ? (
                    <>
                      <Text style={styles.dot}>•</Text>
                      <Ionicons
                        name="time-outline"
                        size={15}
                        color={colors.textMuted}
                      />
                      <Text style={styles.meta}>{study.start_time}</Text>
                    </>
                  ) : null}
                </View>

                {open && (
                  <View style={styles.detailBox}>
                    <Text style={styles.detailTitle}>Study Notes</Text>

                    <Text style={styles.detailText}>
                      {study.description ||
                        'No additional notes have been provided for this Bible study.'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
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
      marginBottom: spacing.lg,
    },

    heroTitle: {
      color: '#FFF',
      fontSize: fonts.display,
      fontWeight: '700',
      marginTop: spacing.sm,
    },

    heroSub: {
      color: '#DDF5E6',
      marginTop: 6,
      lineHeight: fonts.body * 1.5,
    },

    segment: {
      flexDirection: 'row',
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 4,
      marginBottom: spacing.lg,
    },

    segmentBtn: {
      flex: 1,
      paddingVertical: 12,
      alignItems: 'center',
      borderRadius: 12,
    },

    segmentActive: {
      backgroundColor: colors.primary,
    },

    segmentText: {
      color: colors.primary,
      fontWeight: '700',
    },

    segmentTextActive: {
      color: '#FFF',
    },

    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacing.lg,
    },

    emptyTitle: {
      fontSize: fonts.subtitle,
      fontWeight: '700',
      color: colors.text,
      marginTop: spacing.md,
    },

    emptyText: {
      textAlign: 'center',
      color: colors.textMuted,
      marginTop: spacing.xs,
      lineHeight: fonts.body * 1.5,
    },

    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: spacing.md,
      marginBottom: spacing.md,
      elevation: 2,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    },

    topRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    iconCircle: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacing.sm,
    },

    studyName: {
      fontSize: fonts.bodyLarge,
      fontWeight: '700',
      color: colors.text,
    },

    chapter: {
      color: colors.primary,
      marginTop: 2,
      fontWeight: '600',
    },

    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.sm,
      flexWrap: 'wrap',
    },

    meta: {
      color: colors.textMuted,
      marginLeft: 4,
      fontSize: fonts.caption + 1,
    },

    dot: {
      marginHorizontal: 6,
      color: colors.textMuted,
    },

    detailBox: {
      marginTop: spacing.md,
      paddingTop: spacing.md,
      borderTopWidth: 1,
      borderTopColor: colors.borderSoft,
    },

    detailTitle: {
      color: colors.primary,
      fontWeight: '700',
      marginBottom: spacing.xs,
    },

    detailText: {
      color: colors.text,
      lineHeight: fonts.body * 1.6,
    },
  });
}