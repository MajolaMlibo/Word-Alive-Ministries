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
      <View style={styles.header}>
        <Ionicons name="library" size={26} color={colors.primary} />
        <Text style={styles.heading}>Bible Study</Text>
      </View>

      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'upcoming' && styles.filterButtonActive]}
          onPress={() => setFilter('upcoming')}
          accessibilityRole="button"
          accessibilityLabel="Show upcoming studies"
        >
          <Text
            style={[
              styles.filterText,
              filter === 'upcoming' && styles.filterTextActive,
            ]}
          >
            Upcoming
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'past' && styles.filterButtonActive]}
          onPress={() => setFilter('past')}
          accessibilityRole="button"
          accessibilityLabel="Show past studies"
        >
          <Text
            style={[styles.filterText, filter === 'past' && styles.filterTextActive]}
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
          <Ionicons name="book-outline" size={36} color={colors.textMuted} />
          <Text style={styles.emptyText}>
            {filter === 'upcoming'
              ? 'No studies are scheduled yet.'
              : 'No past studies to show.'}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingTop: 0 }}>
          {studies.map((study) => {
            const isOpen = expandedId === study.id;
            return (
              <TouchableOpacity
                key={study.id}
                style={styles.card}
                onPress={() => setExpandedId(isOpen ? null : study.id)}
                accessibilityRole="button"
                accessibilityLabel={`${study.study_name}, ${isOpen ? 'collapse' : 'expand'} details`}
              >
                <View style={styles.cardTopRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.studyName}>{study.study_name}</Text>
                    {study.chapter ? (
                      <Text style={styles.studySubText}>Chapter: {study.chapter}</Text>
                    ) : null}
                    {study.study_date ? (
                      <Text style={styles.studySubText}>
                        {new Date(study.study_date).toLocaleDateString('en-GB', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                        })}
                        {study.start_time ? ` | ${study.start_time}` : ''}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons
                    name={isOpen ? 'chevron-up' : 'chevron-down'}
                    size={22}
                    color={colors.primary}
                  />
                </View>

                {isOpen ? (
                  <View style={styles.detailBox}>
                    {study.description ? (
                      <Text style={styles.detailText}>{study.description}</Text>
                    ) : (
                      <Text style={styles.detailTextMuted}>
                        No additional notes for this study yet.
                      </Text>
                    )}
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof import('../theme/theme').getColors>, fonts: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: spacing.lg,
      paddingBottom: spacing.sm,
    },
    heading: {
      fontSize: fonts.title,
      fontWeight: '700',
      marginLeft: spacing.sm,
      color: colors.primary,
    },
    filterRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing.lg,
      marginBottom: spacing.md,
    },
    filterButton: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.lg,
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      marginRight: spacing.sm,
      minHeight: 44,
      justifyContent: 'center',
    },
    filterButtonActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterText: { color: colors.primary, fontWeight: '600', fontSize: fonts.body },
    filterTextActive: { color: '#FFF' },
    emptyText: {
      fontSize: fonts.body,
      color: colors.textMuted,
      marginTop: spacing.sm,
      textAlign: 'center',
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      padding: spacing.md,
      marginBottom: spacing.sm,
    },
    cardTopRow: { flexDirection: 'row', alignItems: 'center' },
    studyName: { fontSize: fonts.bodyLarge, fontWeight: '700', color: colors.primary },
    studySubText: { fontSize: fonts.body, color: colors.textMuted, marginTop: 2 },
    detailBox: {
      marginTop: spacing.sm,
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: colors.borderSoft,
    },
    detailText: { fontSize: fonts.body, color: colors.text, lineHeight: fonts.body * 1.5 },
    detailTextMuted: { fontSize: fonts.body, color: colors.textMuted, fontStyle: 'italic' },
  });
}
