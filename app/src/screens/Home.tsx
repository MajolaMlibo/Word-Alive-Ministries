import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Image,
  Linking,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { supabase } from '../services/supabase';
import {
  getSouthAfricaDate,
  getTodaysDailyReading,
} from '../services/dailyReadingService';
import {
  DailyVersePreview,
  getDailyVersePreview,
} from '../services/bibleService';
import {
  getActiveAnnouncements,
  getAnnouncementReads,
  markAnnouncementAsRead,
} from '../services/announcementService';
import { Announcement, BibleStudy, DailyReading, Profile } from '../services/database';
import { getAvatarSignedUrl } from '../services/profileService';
import { useAccessibility } from '../theme/AccessibilityContext';
import { spacing } from '../theme/theme';

const SWIPE_TO_MARK_READ_DISTANCE = 88;

type AnnouncementReadTimes = Record<string, string>;

function formatAnnouncementDate(publishedAt: string | null) {
  if (!publishedAt) return null;

  return new Date(publishedAt).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

function orderAnnouncements(
  announcements: Announcement[],
  readTimes: AnnouncementReadTimes
) {
  return [...announcements].sort((first, second) => {
    const firstReadAt = readTimes[first.id];
    const secondReadAt = readTimes[second.id];

    if (firstReadAt && !secondReadAt) return 1;
    if (!firstReadAt && secondReadAt) return -1;

    if (firstReadAt && secondReadAt) {
      return new Date(firstReadAt).getTime() - new Date(secondReadAt).getTime();
    }

    return (
      new Date(second.published_at || 0).getTime() -
      new Date(first.published_at || 0).getTime()
    );
  });
}

type AnnouncementCardProps = {
  announcement: Announcement;
  isRead: boolean;
  isMarking: boolean;
  onMarkAsRead: (announcement: Announcement) => Promise<boolean>;
  onOpenAction: (url: string) => Promise<void>;
  primaryColor: string;
  styles: ReturnType<typeof makeStyles>;
};

function AnnouncementCard({
  announcement,
  isRead,
  isMarking,
  onMarkAsRead,
  onOpenAction,
  primaryColor,
  styles,
}: AnnouncementCardProps) {
  const [expanded, setExpanded] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const publishedDate = formatAnnouncementDate(announcement.published_at);
  const canExpand = announcement.message.length > 180;

  const resetSwipe = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
    }).start();
  };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          !isRead &&
          !isMarking &&
          gesture.dx < -12 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_, gesture) => {
          if (!isRead && !isMarking) {
            translateX.setValue(Math.min(0, gesture.dx));
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (!isRead && !isMarking && gesture.dx <= -SWIPE_TO_MARK_READ_DISTANCE) {
            Animated.timing(translateX, {
              toValue: -SWIPE_TO_MARK_READ_DISTANCE,
              duration: 120,
              useNativeDriver: true,
            }).start(async ({ finished }) => {
              if (!finished) return;

              const marked = await onMarkAsRead(announcement);

              if (!marked) {
                resetSwipe();
              } else {
                translateX.setValue(0);
              }
            });
            return;
          }

          resetSwipe();
        },
        onPanResponderTerminate: resetSwipe,
      }),
    [announcement, isMarking, isRead, onMarkAsRead, translateX]
  );

  const markRead = () => {
    void onMarkAsRead(announcement);
  };

  return (
    <View style={styles.announcementSwipeContainer}>
      {!isRead ? (
        <View pointerEvents="none" style={styles.announcementSwipeHint}>
          <Ionicons name="checkmark-circle" size={19} color="#FFF" />
          <Text style={styles.announcementSwipeHintText}>Mark as read</Text>
        </View>
      ) : null}
      <Animated.View
        {...(!isRead && !isMarking ? panResponder.panHandlers : {})}
        style={[styles.announcementCard, { transform: [{ translateX }] }]}
      >
        <Text style={styles.announcementTitle}>{announcement.title}</Text>
        {publishedDate ? (
          <Text style={styles.announcementDate}>Posted {publishedDate}</Text>
        ) : null}
        <Text
          ellipsizeMode="tail"
          numberOfLines={expanded ? undefined : 3}
          style={styles.announcementMessage}
        >
          {announcement.message}
        </Text>
        {canExpand ? (
          <TouchableOpacity
            accessibilityLabel={
              expanded
                ? `Show less of ${announcement.title}`
                : `Read more of ${announcement.title}`
            }
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            onPress={() => setExpanded(!expanded)}
          >
            <Text style={styles.announcementToggle}>
              {expanded ? 'Show less' : 'Read more'}
            </Text>
          </TouchableOpacity>
        ) : null}
        {announcement.action_label && announcement.action_url ? (
          <TouchableOpacity
            accessibilityLabel={`${announcement.action_label}: opens an external link`}
            accessibilityRole="link"
            onPress={() => void onOpenAction(announcement.action_url!)}
            style={styles.announcementActionButton}
          >
            <Text style={styles.announcementActionButtonText}>
              {announcement.action_label}
            </Text>
            <Ionicons name="open-outline" size={17} color="#FFF" />
          </TouchableOpacity>
        ) : null}
        {isRead ? (
          <View style={styles.announcementReadState}>
            <Ionicons
              name="checkmark-circle-outline"
              size={18}
              color={primaryColor}
            />
            <Text style={styles.announcementReadStateText}>Read</Text>
          </View>
        ) : (
          <TouchableOpacity
            accessibilityLabel={`Mark ${announcement.title} as read`}
            accessibilityRole="button"
            disabled={isMarking}
            onPress={markRead}
            style={styles.announcementReadButton}
          >
            <Ionicons
              name="checkmark-circle-outline"
              size={18}
              color={primaryColor}
            />
            <Text style={styles.announcementReadButtonText}>
              {isMarking ? 'Saving...' : 'Mark as read'}
            </Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const { colors, fonts } = useAccessibility();

  const [reading, setReading] = useState<DailyReading | null>(null);
  const [versePreview, setVersePreview] = useState<DailyVersePreview | null>(
    null
  );
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [announcementsError, setAnnouncementsError] = useState<string | null>(
    null
  );
  const [announcementReadTimes, setAnnouncementReadTimes] =
    useState<AnnouncementReadTimes>({});
  const [markingAnnouncementId, setMarkingAnnouncementId] = useState<
    string | null
  >(null);
  const [nextStudy, setNextStudy] = useState<BibleStudy | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
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
      const today = getSouthAfricaDate();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.warn('Unable to load the Home profile.', profileError.message);
        }

        const nextProfile = (profileData as Profile | null) || null;
        setProfile(nextProfile);

        if (nextProfile?.avatar_path) {
          try {
            setAvatarUrl(await getAvatarSignedUrl(nextProfile.avatar_path));
          } catch (avatarError) {
            console.warn('Unable to load the Home profile photo.', avatarError);
            setAvatarUrl(null);
          }
        } else {
          setAvatarUrl(null);
        }
      }

      const { reading: readingData, error: readingError } =
        await getTodaysDailyReading();

      if (readingError) {
        console.warn('Unable to load today\'s reading.', readingError.message);
      }

      setReading(readingData);

      if (readingData) {
        const { preview, error: previewError } = await getDailyVersePreview(
          readingData.scripture_ref
        );

        if (previewError) {
          console.warn('Unable to load the daily verse preview.', previewError.message);
        }

        setVersePreview(preview);
      } else {
        setVersePreview(null);
      }

      const {
        announcements: announcementData,
        error: announcementError,
      } = await getActiveAnnouncements();

      if (announcementError) {
        console.warn('Unable to load announcements.', announcementError.message);
        setAnnouncements([]);
        setAnnouncementReadTimes({});
        setAnnouncementsError(
          'Announcements are unavailable. Please try again.'
        );
      } else {
        const { reads, error: announcementReadsError } = user
          ? await getAnnouncementReads(user.id)
          : { reads: [], error: null };

        if (announcementReadsError) {
          console.warn(
            'Unable to load announcement read status.',
            announcementReadsError.message
          );
          setAnnouncements([]);
          setAnnouncementReadTimes({});
          setAnnouncementsError(
            'Announcements are unavailable. Please try again.'
          );
        } else {
          const readTimes = reads.reduce<AnnouncementReadTimes>(
            (result, read) => ({
              ...result,
              [read.announcement_id]: read.read_at,
            }),
            {}
          );

          setAnnouncementReadTimes(readTimes);
          setAnnouncements(orderAnnouncements(announcementData, readTimes));
          setAnnouncementsError(null);
        }
      }

      const { data: studyData, error: studyError } = await supabase
        .from('bible_studies')
        .select('*')
        .eq('status', 'published')
        .gte('study_date', today)
        .order('study_date', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (studyError) {
        console.warn('Unable to load the next Bible study.', studyError.message);
      }

      setNextStudy((studyData as BibleStudy | null) || null);

    } catch (err) {
      console.log(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadDashboardData();
    }, [loadDashboardData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const retryAnnouncements = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  const unreadAnnouncementCount = announcements.filter(
    (announcement) => !announcementReadTimes[announcement.id]
  ).length;

  const announcementHint =
    unreadAnnouncementCount === 0
      ? `${announcements.length} ${announcements.length === 1 ? 'update' : 'updates'} • Read cards are at the bottom.`
      : unreadAnnouncementCount === announcements.length
        ? `${announcements.length} ${announcements.length === 1 ? 'update' : 'updates'} • Swipe left on a card to mark it as read.`
        : `${unreadAnnouncementCount} unread of ${announcements.length} updates • Swipe left on a card to mark it as read.`;

  const openAnnouncementLink = useCallback(async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch (error) {
      console.warn('Unable to open announcement link.', error);
      Alert.alert(
        'Unable to open link',
        'Please check your connection and try again.'
      );
    }
  }, []);

  const markAnnouncementRead = useCallback(
    async (announcement: Announcement) => {
      if (markingAnnouncementId || announcementReadTimes[announcement.id]) {
        return false;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert('Sign in required', 'Please sign in and try again.');
        return false;
      }

      setMarkingAnnouncementId(announcement.id);

      try {
        const { read, error } = await markAnnouncementAsRead(
          user.id,
          announcement.id
        );

        if (error || !read) {
          console.warn('Unable to mark announcement as read.', error?.message);
          Alert.alert(
            'Unable to mark as read',
            'Please check your connection and try again.'
          );
          return false;
        }

        const nextReadTimes = {
          ...announcementReadTimes,
          [announcement.id]: read.read_at,
        };

        setAnnouncementReadTimes(nextReadTimes);
        setAnnouncements((current) =>
          orderAnnouncements(current, nextReadTimes)
        );
        return true;
      } finally {
        setMarkingAnnouncementId(null);
      }
    },
    [announcementReadTimes, markingAnnouncementId]
  );

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

          {avatarUrl ? (
            <Image
              accessibilityLabel="Your profile photo"
              source={{ uri: avatarUrl }}
              style={styles.avatar}
            />
          ) : (
            <View style={styles.avatar}>
              <Ionicons name="person" size={26} color="#FFF" />
            </View>
          )}
        </View>

        <View style={styles.streakCard}>
          <Ionicons name="flame" size={20} color={colors.accent} />
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

        {versePreview ? (
          <>
            <Text style={styles.previewReference}>
              {versePreview.reference} (KJV)
            </Text>
            <Text
              ellipsizeMode="tail"
              numberOfLines={3}
              style={styles.scripture}
            >
              {versePreview.text}
            </Text>
          </>
        ) : (
          <Text numberOfLines={5} style={styles.scripture}>
            {reading
              ? reading.reflection || 'Open the Bible tab to read today’s passage.'
              : 'There is no scripture scheduled for today.'}
          </Text>
        )}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate('Bible')}
        >
          <Text style={styles.primaryButtonText}>Continue Reading</Text>
          <Ionicons name="arrow-forward" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* ANNOUNCEMENTS */}
      <View style={styles.announcementsSection}>
        <View style={styles.sectionHeader}>
          <Ionicons name="megaphone" size={20} color={colors.primary} />
          <Text style={styles.sectionTitle}>Church Announcements</Text>
        </View>

        {announcements.length && !announcementsError ? (
          <View style={styles.announcementHintRow}>
            <Ionicons
              name="chevron-back"
              size={18}
              color={colors.primary}
            />
            <Text style={styles.announcementHintText}>{announcementHint}</Text>
          </View>
        ) : null}

        {announcementsError ? (
          <View style={styles.announcementCard}>
            <View style={styles.announcementState}>
              <Ionicons
                name="cloud-offline-outline"
                size={22}
                color={colors.textMuted}
              />
              <Text style={styles.announcementStateText}>
                {announcementsError}
              </Text>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={retryAnnouncements}
                style={styles.announcementRetryButton}
              >
                <Text style={styles.announcementRetryText}>Try again</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : announcements.length ? (
          announcements.map((announcement) => (
            <AnnouncementCard
              announcement={announcement}
              isMarking={markingAnnouncementId === announcement.id}
              isRead={Boolean(announcementReadTimes[announcement.id])}
              key={announcement.id}
              onMarkAsRead={markAnnouncementRead}
              onOpenAction={openAnnouncementLink}
              primaryColor={colors.primary}
              styles={styles}
            />
          ))
        ) : (
          <View style={styles.announcementCard}>
            <View style={styles.announcementState}>
              <Ionicons
                name="megaphone-outline"
                size={22}
                color={colors.textMuted}
              />
              <Text style={styles.announcementStateText}>
                Church announcements will appear here.
              </Text>
            </View>
          </View>
        )}
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

        {nextStudy?.scripture_ref ? (
          <Text style={styles.studyMeta}>{nextStudy.scripture_ref}</Text>
        ) : null}

        {nextStudy?.study_date ? (
          <View style={styles.studyRow}>
            <Ionicons name="time-outline" size={16} color={colors.textMuted} />
            <Text style={styles.studyMeta}>
              {new Date(
                `${nextStudy.study_date}T00:00:00`
              ).toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
              {nextStudy.start_time
                ? ` • ${nextStudy.start_time.slice(0, 5)}`
                : ''}
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
      overflow: 'hidden',
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

    previewReference: {
      color: colors.textMuted,
      fontSize: fonts.caption,
      fontWeight: '700',
      marginBottom: spacing.xs,
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

    announcementsSection: {
      marginTop: spacing.lg,
    },

    announcementHintRow: {
      alignItems: 'center',
      flexDirection: 'row',
      marginBottom: spacing.sm,
    },

    announcementHintText: {
      color: colors.textMuted,
      flex: 1,
      fontSize: fonts.caption,
      lineHeight: fonts.caption * 1.4,
      marginLeft: 2,
    },

    announcementSwipeContainer: {
      backgroundColor: colors.primary,
      borderRadius: 20,
      marginBottom: spacing.md,
      overflow: 'hidden',
    },

    announcementSwipeHint: {
      alignItems: 'flex-end',
      bottom: 0,
      flexDirection: 'row',
      justifyContent: 'flex-end',
      paddingRight: spacing.lg,
      position: 'absolute',
      right: 0,
      top: 0,
    },

    announcementSwipeHintText: {
      color: '#FFF',
      fontSize: fonts.caption,
      fontWeight: '700',
      marginLeft: spacing.xs,
    },

    announcementCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: spacing.lg,
      elevation: 1,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
    },

    announcementTitle: {
      color: colors.text,
      fontSize: fonts.body,
      fontWeight: '700',
    },

    announcementDate: {
      color: colors.textMuted,
      fontSize: fonts.caption,
      marginTop: 2,
    },

    announcementMessage: {
      color: colors.text,
      lineHeight: fonts.body * 1.5,
      marginTop: spacing.xs,
    },

    announcementToggle: {
      color: colors.primary,
      fontSize: fonts.caption,
      fontWeight: '700',
      marginTop: spacing.xs,
    },

    announcementActionButton: {
      alignItems: 'center',
      backgroundColor: colors.primary,
      borderRadius: 14,
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: spacing.md,
      paddingVertical: 12,
    },

    announcementActionButtonText: {
      color: '#FFF',
      fontSize: fonts.body,
      fontWeight: '700',
      marginRight: spacing.xs,
    },

    announcementReadButton: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: spacing.md,
      paddingVertical: spacing.xs,
    },

    announcementReadButtonText: {
      color: colors.primary,
      fontSize: fonts.caption,
      fontWeight: '700',
      marginLeft: spacing.xs,
    },

    announcementReadState: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'center',
      marginTop: spacing.md,
    },

    announcementReadStateText: {
      color: colors.textMuted,
      fontSize: fonts.caption,
      fontWeight: '700',
      marginLeft: spacing.xs,
    },

    announcementState: {
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },

    announcementStateText: {
      color: colors.textMuted,
      lineHeight: fonts.body * 1.5,
      marginTop: spacing.xs,
      textAlign: 'center',
    },

    announcementRetryButton: {
      borderColor: colors.primary,
      borderRadius: 12,
      borderWidth: 1,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.xs,
    },

    announcementRetryText: {
      color: colors.primary,
      fontWeight: '700',
    },

  });
}
