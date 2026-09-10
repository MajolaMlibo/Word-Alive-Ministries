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
  const [profileName, setProfileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const Todays_Scripture = 'Numbers 6:24';

  const getFormattedDate = () =>
    new Date().toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

  const loadDashboardData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('name')
          .eq('id', user.id)
          .single();
        setProfileName(profile?.name || null);
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
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
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
       <View>
          <Text style={styles.dateBadge}>{getFormattedDate()}</Text>
          <Text> </Text>
       </View>

      <Text style={styles.greeting}>
        Good { new Date().getHours() < 12 ? 'morning' : 'afternoon'} {profileName ? `, ${profileName}` : ''}
      </Text>
      <Text style={styles.subGreeting}>Welcome to Word Alive Ministries</Text>

      {/* Today's Scripture */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="book-outline" size={22} color={colors.primary} />
          <Text style={styles.cardHeaderText}>Today's Scripture</Text>
        </View>

        <Text style={styles.title}>
          {reading?.scripture_ref || `${Todays_Scripture}`}
        </Text>
        {reading?.content ? (
          <Text style={styles.snippet}>"{reading.content}"</Text>
        ) : null}

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("Bible")}
          accessibilityRole="button"
          accessibilityLabel="Read today's scripture"
        >
          
          <Text style={styles.buttonText}>Read today's scripture</Text>
        </TouchableOpacity>
      </View>

      {/* Upcoming Bible Study */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="calendar-outline" size={22} color={colors.primary} />
          <Text style={styles.cardHeaderText}>Upcoming Bible Study</Text>
        </View>

        <Text style={styles.title}>
          {nextStudy?.study_name || 'No upcoming study scheduled'}
        </Text>
        {nextStudy?.chapter ? (
          <Text style={styles.subText}>Chapter: {nextStudy.chapter}</Text>
        ) : null}
        {nextStudy?.study_date ? (
          <Text style={styles.subText}>
            {new Date(nextStudy.study_date).toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
            {nextStudy?.start_time ? ` | ${nextStudy.start_time}` : ''}
          </Text>
        ) : null}

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate("Calendar")}
          accessibilityRole="button"
          accessibilityLabel="View calendar"
        >
          <Text style={styles.buttonText}>View calendar</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
}

function makeStyles(colors: ReturnType<typeof import('../theme/theme').getColors>, fonts: any) {
  return StyleSheet.create({
    container: { flex: 1, padding: spacing.lg, backgroundColor: colors.background },
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.background,
    },
    greeting: { fontSize: fonts.display, fontWeight: 'bold', color: colors.text },
    subGreeting: {
      fontSize: fonts.body,
      color: colors.textMuted,
      marginBottom: spacing.lg,
    },
    card: {
      backgroundColor: colors.surface,
      padding: spacing.lg,
      borderRadius: radii.lg,
      borderWidth: 2,
      borderColor: colors.border,
      marginBottom: spacing.lg,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      width: '100%',
      marginBottom: spacing.sm,
    },
    cardHeaderText: {
      fontWeight: '700',
      color: colors.primary,
      marginLeft: spacing.xs,
      fontSize: fonts.caption + 2,
      flex: 1,
    },
    dateBadge: {
      backgroundColor: colors.accentDeep,
      color: '#FFF',
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs / 2,
      marginRight: 40,
      marginLeft: 40,
      borderRadius: radii.sm,
      fontSize: fonts.caption,
      fontWeight: '700',
      overflow: 'hidden',
      textAlign: 'center' ,
    },
    title: { fontSize: fonts.title, fontWeight: 'bold', color: colors.primary, marginTop: 4 },
    snippet: {
      fontStyle: 'italic',
      textAlign: 'center',
      marginVertical: spacing.sm,
      color: colors.text,
      fontSize: fonts.body,
      lineHeight: fonts.body * 1.4,
    },
    subText: {
      fontSize: fonts.body,
      color: colors.textMuted,
      marginVertical: 2,
      alignSelf: 'flex-start',
    },
    button: {
      backgroundColor: colors.accent,
      paddingVertical: spacing.sm + 2,
      borderRadius: radii.sm,
      width: '100%',
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: spacing.sm,
      minHeight: 48,
    },
    buttonText: { fontWeight: '700', color: colors.text, fontSize: fonts.body },
    secondaryButton: {
      backgroundColor: colors.accentSoft,
      paddingVertical: spacing.sm,
      borderRadius: radii.sm,
      width: '100%',
      alignItems: 'center',
      marginTop: spacing.md,
      minHeight: 48,
      justifyContent: 'center',
    },
    secondaryButtonText: { fontWeight: '700', color: colors.primary, fontSize: fonts.body },
    quickLinksRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: spacing.sm,
    },
    quickLink: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: radii.md,
      borderWidth: 1,
      borderColor: colors.borderSoft,
      paddingVertical: spacing.md,
      marginHorizontal: spacing.xs / 2,
      minHeight: 76,
      justifyContent: 'center',
    },
    quickLinkText: {
      marginTop: spacing.xs,
      fontSize: fonts.caption + 1,
      color: colors.primary,
      fontWeight: '600',
      textAlign: 'center',
    },
  });
}
