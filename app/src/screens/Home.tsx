import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import { useAccessibility } from '../theme/AccessibilityContext';
import { spacing, radii } from '../theme/theme';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { colors, fonts } = useAccessibility();

  const [reading, setReading] = useState<any>(null);
  const [nextStudy, setNextStudy] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const getFormattedDate = () =>
    new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const loadDashboardData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        setProfile(profileData);
      }

      const { data: readingData } = await supabase
        .from('daily_readings')
        .select('*')
        .eq('scheduled_date', today)
        .single();

      setReading(readingData);

      const { data: studyData } = await supabase
        .from('bible_studies')
        .select('*')
        .gte('study_date', today)
        .order('study_date', { ascending: true })
        .limit(1)
        .single();

      setNextStudy(studyData);
    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const styles = makeStyles(colors, fonts);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: spacing.xl }}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* HERO */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <View>
            <Text style={styles.date}>{getFormattedDate()}</Text>
            <Text style={styles.greeting}>
              {greeting()}
              {profile?.name ? `, ${profile.name}` : ''}
            </Text>
          </View>

          <View style={styles.avatar}>
            <Ionicons name="person" size={26} color="#FFF" />
          </View>
        </View>

        <View style={styles.streakCard}>
          <Ionicons name="flame" size={20} color="#FDD835" />
          <Text style={styles.streakNumber}>
            {profile?.current_streak || 0}
          </Text>
          <Text style={styles.streakLabel}>Day Streak</Text>
        </View>
      </View>

      {/* TODAY'S WORD */}
      <View style={styles.featureCard}>
        <View style={styles.sectionHeader}>
          <Ionicons name="book" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Today's Word</Text>
        </View>

        <Text style={styles.reference}>
          {reading?.scripture_ref || 'Daily Reading'}
        </Text>

        <Text numberOfLines={5} style={styles.scripture}>
          {reading?.content ||
            'Daily Scrupture...'}
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Bible')}
        >
          <Text style={styles.primaryButtonText}>Continue Reading</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* NEXT STUDY */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Ionicons name="calendar" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Next Bible Study</Text>
        </View>

        <Text style={styles.studyName}>
          {nextStudy?.study_name || 'No upcoming study'}
        </Text>

        {nextStudy?.chapter ? (
          <Text style={styles.studyMeta}>Chapter {nextStudy.chapter}</Text>
        ) : null}

        {nextStudy?.study_date ? (
          <View style={styles.studyRow}>
            <Ionicons name="time-outline" size={16} color={colors.textMuted} />
            <Text style={styles.studyMeta}>
              {new Date(nextStudy.study_date).toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
              {nextStudy.start_time ? ` • ${nextStudy.start_time}` : ''}
            </Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('Calendar')}
        >
          <Text style={styles.secondaryButtonText}>Open Calendar</Text>
        </TouchableOpacity>
      </View>

      {/* ENCOURAGEMENT */}
      <View style={styles.encourageCard}>
        <Ionicons name="heart" size={22} color="#FDD835" />
        <Text style={styles.encourageTitle}>Stay Encouraged</Text>
        <Text style={styles.encourageText}>
          “Your word is a lamp to my feet and a light to my path.”
        </Text>
        <Text style={styles.encourageRef}>Psalm 119:105</Text>
      </View>
    </ScrollView>
  );
}

function makeStyles(
  colors: ReturnType<typeof import('../theme/theme').getColors>,
  fonts: any
) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: spacing.lg,
    },

    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },

    hero: {
      backgroundColor: colors.primary,
      borderRadius: 24,
      padding: spacing.lg,
      marginBottom: spacing.lg,
    },

    heroTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },

    date: {
      color: '#D9F7E2',
      fontSize: fonts.caption,
      marginBottom: 4,
    },

    greeting: {
      color: '#FFF',
      fontSize: fonts.display,
      fontWeight: '700',
      maxWidth: '85%',
    },

    avatar: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: 'rgba(255,255,255,0.15)',
      justifyContent: 'center',
      alignItems: 'center',
    },

    streakCard: {
      marginTop: spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.12)',
      borderRadius: 16,
      padding: spacing.md,
    },

    streakNumber: {
      color: '#FFF',
      fontSize: fonts.title,
      fontWeight: '700',
      marginHorizontal: 8,
    },

    streakLabel: {
      color: '#FFF',
      opacity: 0.9,
      fontSize: fonts.body,
    },

    featureCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: spacing.lg,
      marginBottom: spacing.lg,
      elevation: 2,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },

    card: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: spacing.lg,
      marginTop: spacing.lg,
      elevation: 1,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
    },

    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacing.sm,
    },

    sectionTitle: {
      marginLeft: spacing.xs,
      color: colors.primary,
      fontSize: fonts.body,
      fontWeight: '700',
    },

    reference: {
      fontSize: fonts.title,
      color: colors.primary,
      fontWeight: '700',
      marginBottom: spacing.sm,
    },

    scripture: {
      fontSize: fonts.body,
      color: colors.text,
      lineHeight: fonts.body * 1.7,
      fontStyle: 'italic',
      marginBottom: spacing.lg,
    },

    primaryButton: {
      backgroundColor: colors.primary,
      borderRadius: 14,
      paddingVertical: 14,
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
    },

    primaryButtonText: {
      color: '#FFF',
      fontWeight: '700',
      fontSize: fonts.body,
      marginRight: 6,
    },

    quickTitle: {
      fontSize: fonts.subtitle,
      fontWeight: '700',
      color: colors.text,
      marginBottom: spacing.md,
    },

    quickGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
    },

    quickItem: {
      width: '48%',
      backgroundColor: colors.surface,
      borderRadius: 18,
      paddingVertical: spacing.lg,
      alignItems: 'center',
      marginBottom: spacing.md,
    },

    quickText: {
      marginTop: spacing.sm,
      color: colors.primary,
      fontWeight: '600',
      fontSize: fonts.body,
    },

    studyName: {
      fontSize: fonts.title,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },

    studyMeta: {
      color: colors.textMuted,
      fontSize: fonts.body,
    },

    studyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: spacing.xs,
    },

    secondaryButton: {
      marginTop: spacing.lg,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.primary,
      paddingVertical: 12,
      alignItems: 'center',
    },

    secondaryButtonText: {
      color: colors.primary,
      fontWeight: '700',
      fontSize: fonts.body,
    },

    encourageCard: {
      marginTop: spacing.lg,
      backgroundColor: '#0E5C38',
      borderRadius: 20,
      padding: spacing.lg,
      alignItems: 'center',
    },

    encourageTitle: {
      color: '#FFF',
      fontWeight: '700',
      fontSize: fonts.subtitle,
      marginTop: spacing.sm,
    },

    encourageText: {
      color: '#FFF',
      textAlign: 'center',
      fontStyle: 'italic',
      lineHeight: fonts.body * 1.6,
      marginTop: spacing.sm,
    },

    encourageRef: {
      color: '#FDD835',
      fontWeight: '700',
      marginTop: spacing.sm,
    },
  });
}