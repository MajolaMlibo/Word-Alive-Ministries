import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FormattedText from '../components/FormattedText';
import { supabase } from '../services/supabase';
import { BibleStudy, StudyComment, StudyMedia } from '../services/database';
import { getStudyMedia, getStudyMediaUrls } from '../services/studyMediaService';
import { getStudyCommentPage, StudyCommentCursor, submitStudyComment } from '../services/studyCommentService';
import { getSouthAfricaDate } from '../services/dailyReadingService';
import { getCurrentUserRole, isAdminRole } from '../services/roleService';
import { useAccessibility } from '../theme/AccessibilityContext';
import { spacing } from '../theme/theme';

type StudyFilter = 'upcoming' | 'past';

function formatStudyDate(studyDate: string) {
  const [year, month, day] = studyDate.split('-').map(Number);

  return new Date(year, month - 1, day).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function formatStudyTime(startTime: string) {
  return startTime.slice(0, 5);
}

export default function StudyScreen() {
  const { colors, fonts } = useAccessibility();
  const styles = makeStyles(colors, fonts);

  const [filter, setFilter] = useState<StudyFilter>('past');
  const [todayStudies, setTodayStudies] = useState<BibleStudy[]>([]);
  const [studies, setStudies] = useState<BibleStudy[]>([]);
  const [studyMedia, setStudyMedia] = useState<StudyMedia[]>([]);
  const [studyMediaUrls, setStudyMediaUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [canSeeUpcoming, setCanSeeUpcoming] = useState(false);
  const [roleLoading, setRoleLoading] = useState(true);
  const [comments, setComments] = useState<StudyComment[]>([]);
  const [commentsCursor, setCommentsCursor] = useState<StudyCommentCursor | null>(null);
  const [commentsHaveMore, setCommentsHaveMore] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState('');
  const [commentSending, setCommentSending] = useState(false);

  const loadStudies = useCallback(async (which: StudyFilter, includeUpcoming: boolean) => {
    setLoading(true);
    setLoadError(null);

    try {
      const today = getSouthAfricaDate();
      const todayQuery = supabase
        .from('bible_studies')
        .select('*')
        .eq('status', 'published')
        .eq('study_date', today)
        .order('start_time', { ascending: true });

      const studyQuery = supabase
        .from('bible_studies')
        .select('*')
        .eq('status', 'published');

      const primaryQuery = which === 'upcoming' && includeUpcoming
        ? studyQuery.gt('study_date', today).order('study_date', { ascending: true })
        : studyQuery.lt('study_date', today).order('study_date', { ascending: false });

      const [todayResult, studiesResult] = await Promise.all([todayQuery, primaryQuery]);

      if (todayResult.error || studiesResult.error) {
        console.warn(
          'Unable to load Bible studies.',
          todayResult.error?.message || studiesResult.error?.message,
        );
        setTodayStudies([]);
        setStudies([]);
        setLoadError('We could not load Bible studies. Please try again.');
        return;
      }

      const loadedTodayStudies = (todayResult.data as BibleStudy[]) || [];
      const loadedStudies = (studiesResult.data as BibleStudy[]) || [];
      setTodayStudies(loadedTodayStudies);
      setStudies(loadedStudies);
    } catch (error) {
      console.warn('Unexpected error while loading Bible studies.', error);
      setTodayStudies([]);
      setStudies([]);
      setLoadError('We could not load Bible studies. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadRole = async () => {
      const { role, error } = await getCurrentUserRole();

      if (!isMounted) return;

      if (error) {
        console.warn('Unable to load the current study-access role.', error.message);
      }

      setCanSeeUpcoming(isAdminRole(role));
      setRoleLoading(false);
    };

    loadRole();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (roleLoading) return;

    if (filter === 'upcoming' && !canSeeUpcoming) {
      setFilter('past');
      return;
    }

    loadStudies(filter, canSeeUpcoming);
  }, [canSeeUpcoming, filter, loadStudies, roleLoading]);

  const [mediaIssue, setMediaIssue] = useState(false);
  const [mediaAttempt, retryMedia] = useState(0);
  useEffect(() => {
    let active = true;
    setStudyMedia([]);
    setStudyMediaUrls({});
    setMediaIssue(false);
    if (expandedId) void (async () => {
      try {
        const { media, error } = await getStudyMedia([expandedId]);
        if (error) throw error;
        const result = await getStudyMediaUrls(media);
        if (active) {
          setStudyMedia(media);
          setStudyMediaUrls(result.urls);
          setMediaIssue(Boolean(result.error));
        }
      } catch { if (active) setMediaIssue(true); }
    })();
    return () => { active = false; };
  }, [expandedId, mediaAttempt]);

  useEffect(() => {
    let active = true;
    setComments([]);
    setCommentsCursor(null);
    setCommentsHaveMore(false);
    setCommentsError(null);
    setCommentDraft('');

    if (!expandedId) return () => { active = false; };

    setCommentsLoading(true);
    void (async () => {
      const result = await getStudyCommentPage(expandedId);
      if (!active) return;
      setCommentsLoading(false);
      if (result.error) {
        console.warn('Unable to load study comments.', result.error.message);
        setCommentsError('Comments are unavailable right now. Please try again.');
        return;
      }
      setComments(result.items);
      setCommentsCursor(result.nextCursor);
      setCommentsHaveMore(result.hasMore);
    })();

    return () => { active = false; };
  }, [expandedId]);

  const loadMoreComments = async () => {
    if (!expandedId || !commentsCursor || commentsLoading) return;
    setCommentsLoading(true);
    const result = await getStudyCommentPage(expandedId, commentsCursor);
    setCommentsLoading(false);
    if (result.error) {
      console.warn('Unable to load more study comments.', result.error.message);
      setCommentsError('More comments could not be loaded. Please try again.');
      return;
    }
    setComments((current) => [...current, ...result.items.filter((item) => !current.some((known) => known.id === item.id))]);
    setCommentsCursor(result.nextCursor);
    setCommentsHaveMore(result.hasMore);
  };

  const sendComment = async () => {
    if (!expandedId || !commentDraft.trim() || commentSending) return;
    setCommentSending(true);
    setCommentsError(null);
    const result = await submitStudyComment(expandedId, commentDraft);
    setCommentSending(false);
    if (result.error || !result.comment) {
      console.warn('Unable to submit study comment.', result.error?.message);
      setCommentsError(result.error?.message || 'Your comment could not be posted. Please try again.');
      return;
    }
    setComments((current) => [result.comment!, ...current.filter((item) => item.id !== result.comment!.id)]);
    setCommentDraft('');
  };

  const renderStudyCard = (study: BibleStudy) => {
    const open = expandedId === study.id;
    const mediaForStudy = studyMedia.filter((item) => item.study_id === study.id);
    const commentsAvailable = study.status === 'published' && study.study_date <= getSouthAfricaDate();

    return (
      <View key={study.id} style={styles.card}>
        <TouchableOpacity
          accessibilityHint={open ? 'Collapses this study' : 'Expands this study'}
          accessibilityLabel={`${open ? 'Collapse' : 'Expand'} ${study.study_name}`}
          accessibilityRole="button"
          activeOpacity={0.9}
          onPress={() => setExpandedId(open ? null : study.id)}
        >
          <View style={styles.topRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="book" size={20} color={colors.primary} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.studyName}>{study.study_name}</Text>

              {study.scripture_ref ? (
                <Text style={styles.scriptureRef}>{study.scripture_ref}</Text>
              ) : null}
            </View>

            <Ionicons
              name={open ? 'chevron-up' : 'chevron-down'}
              size={22}
              color={colors.primary}
            />
          </View>

          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={15} color={colors.textMuted} />
            <Text style={styles.meta}>{formatStudyDate(study.study_date)}</Text>

            {study.start_time ? (
              <>
                <Text style={styles.dot}>•</Text>
                <Ionicons name="time-outline" size={15} color={colors.textMuted} />
                <Text style={styles.meta}>{formatStudyTime(study.start_time)}</Text>
              </>
            ) : null}
          </View>
        </TouchableOpacity>

        {open && (
          <View style={styles.detailBox}>
            <Text style={styles.detailTitle}>Study Notes</Text>

            <FormattedText
              styles={styles}
              text={study.description || 'No additional notes have been provided for this Bible study.'}
            />

            {mediaIssue && <TouchableOpacity onPress={() => retryMedia(n => n + 1)} accessibilityRole="button">
              <Text style={styles.detailTitle}>Retry loading study images</Text>
            </TouchableOpacity>}
            {mediaForStudy.length ? (
              <>
                <Text style={styles.imageHint}>Tap an image to view it full screen.</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.studyImageList}>
                  {mediaForStudy.map((item) => studyMediaUrls[item.id] ? (
                    <TouchableOpacity
                      accessibilityHint="Opens this image full screen"
                      accessibilityLabel="Open study image"
                      accessibilityRole="button"
                      key={item.id}
                      onPress={() => setSelectedImageUrl(studyMediaUrls[item.id])}
                    >
                      <Image source={{ uri: studyMediaUrls[item.id] }} style={styles.studyImage} />
                    </TouchableOpacity>
                  ) : null)}
                </ScrollView>
              </>
            ) : null}

            {study.location_or_url ? (
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={16} color={colors.textMuted} />
                <Text style={styles.locationText}>{study.location_or_url}</Text>
              </View>
            ) : null}

            <View style={styles.commentsSection}>
              <Text style={styles.detailTitle}>Study comments</Text>
              {commentsAvailable ? (
                <>
                  <Text style={styles.commentsHint}>Comments are posted with your account name. Keep the discussion kind and relevant to the study.</Text>
                  <TextInput
                    accessibilityLabel="Write a study comment"
                    editable={!commentSending}
                    maxLength={1200}
                    onChangeText={setCommentDraft}
                    placeholder="Share a thought from this study"
                    placeholderTextColor={colors.textMuted}
                    style={styles.commentInput}
                    value={commentDraft}
                  />
                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !commentDraft.trim() || commentSending }}
                    disabled={!commentDraft.trim() || commentSending}
                    onPress={() => void sendComment()}
                    style={[styles.commentSubmit, (!commentDraft.trim() || commentSending) && styles.commentSubmitDisabled]}
                  >
                    <Ionicons color="#FFFFFF" name="chatbubble-ellipses-outline" size={18} />
                    <Text style={styles.commentSubmitText}>{commentSending ? 'Posting…' : 'Post comment'}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.commentsHint}>Comments open when this study is published and takes place.</Text>
              )}

              {commentsError ? <Text style={styles.commentsError}>{commentsError}</Text> : null}
              {commentsLoading && comments.length === 0 ? <ActivityIndicator color={colors.primary} style={styles.commentsLoading} /> : null}
              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentCard}>
                  <View style={styles.commentHeader}>
                    <Text style={styles.commentAuthor}>{comment.author_name}</Text>
                    <Text style={styles.commentDate}>{new Date(comment.created_at).toLocaleDateString('en-GB')}</Text>
                  </View>
                  {comment.is_hidden ? (
                    <Text style={styles.commentHidden}>This comment is hidden by the ministry team.</Text>
                  ) : <Text style={styles.commentBody}>{comment.body}</Text>}
                </View>
              ))}
              {!commentsLoading && commentsAvailable && comments.length === 0 && !commentsError ? <Text style={styles.commentsHint}>Be the first to comment.</Text> : null}
              {commentsHaveMore ? (
                <TouchableOpacity accessibilityRole="button" onPress={() => void loadMoreComments()} style={styles.commentsMore}>
                  <Text style={styles.commentsMoreText}>{commentsLoading ? 'Loading…' : 'Load older comments'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {canSeeUpcoming && !roleLoading ? (
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
      ) : null}

      {loading || roleLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : loadError ? (
        <View style={styles.center}>
          <Ionicons
            name="cloud-offline-outline"
            size={46}
            color={colors.textMuted}
          />
          <Text style={styles.emptyTitle}>Unable to load studies</Text>
          <Text style={styles.emptyText}>{loadError}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadStudies(filter, canSeeUpcoming)}
          >
            <Text style={styles.retryButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : todayStudies.length === 0 && studies.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name="book-outline"
            size={46}
            color={colors.textMuted}
          />
          <Text style={styles.emptyTitle}>Nothing here yet</Text>
          <Text style={styles.emptyText}>
            {filter === 'upcoming' && canSeeUpcoming
              ? 'There are no upcoming Bible studies.'
              : 'No previous studies have been added.'}
          </Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
        >
          {todayStudies.length ? (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {todayStudies.length === 1 ? "Today's study" : "Today's studies"}
                </Text>
                <Text style={styles.sectionSubtitle}>Published for today</Text>
              </View>
              {todayStudies.map(renderStudyCard)}
            </>
          ) : null}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {filter === 'upcoming' && canSeeUpcoming ? 'Upcoming studies' : 'Past studies'}
            </Text>
            {canSeeUpcoming ? (
              <Text style={styles.sectionSubtitle}>
                {filter === 'upcoming'
                  ? 'Visible to pastors and administrators'
                  : 'Previously published studies'}
              </Text>
            ) : null}
          </View>

          {studies.length ? studies.map(renderStudyCard) : (
            <View style={styles.inlineEmpty}>
              <Text style={styles.inlineEmptyText}>
                {filter === 'upcoming' && canSeeUpcoming
                  ? 'There are no upcoming Bible studies.'
                  : 'No previous studies have been added.'}
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <Modal
        animationType="fade"
        onRequestClose={() => setSelectedImageUrl(null)}
        transparent
        visible={Boolean(selectedImageUrl)}
      >
        <View style={styles.imageModalBackdrop}>
          <TouchableOpacity
            accessibilityLabel="Close full screen image"
            accessibilityRole="button"
            onPress={() => setSelectedImageUrl(null)}
            style={styles.imageModalClose}
          >
            <Ionicons color="#FFFFFF" name="close" size={28} />
          </TouchableOpacity>
          {selectedImageUrl ? (
            <Image
              resizeMode="contain"
              source={{ uri: selectedImageUrl }}
              style={styles.fullScreenImage}
            />
          ) : null}
        </View>
      </Modal>
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

    sectionHeader: {
      marginBottom: spacing.sm,
      marginTop: spacing.xs,
    },

    sectionTitle: {
      color: colors.text,
      fontSize: fonts.subtitle,
      fontWeight: '700',
    },

    sectionSubtitle: {
      color: colors.textMuted,
      fontSize: fonts.caption,
      marginTop: 2,
    },

    inlineEmpty: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderRadius: 16,
      marginBottom: spacing.md,
      padding: spacing.lg,
    },

    inlineEmptyText: {
      color: colors.textMuted,
      lineHeight: fonts.body * 1.5,
      textAlign: 'center',
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

    scriptureRef: {
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

    formattedText: {
      color: colors.text,
      fontSize: fonts.body,
      lineHeight: fonts.body * 1.6,
    },

    formattedHeading: {
      color: colors.primary,
      fontSize: fonts.bodyLarge,
      fontWeight: '800',
      lineHeight: fonts.bodyLarge * 1.4,
      marginTop: spacing.sm,
    },

    formattedBold: { fontWeight: '800' },
    formattedItalic: { fontStyle: 'italic' },
    formattedLink: { color: colors.primary, fontWeight: '700', textDecorationLine: 'underline' },
    formattedQuote: { borderLeftColor: colors.accent, borderLeftWidth: 3, marginVertical: spacing.xs, paddingLeft: spacing.sm },
    formattedListRow: { flexDirection: 'row', gap: spacing.xs },
    formattedListMarker: { color: colors.primary, fontSize: fonts.body, fontWeight: '800', minWidth: 18 },
    studyImageList: { gap: spacing.sm, paddingTop: spacing.sm },
    studyImage: { borderRadius: 12, height: 180, width: 135 },
    imageHint: { color: colors.textMuted, fontSize: fonts.caption, marginTop: spacing.sm },
    imageModalBackdrop: { alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.94)', flex: 1, justifyContent: 'center', padding: spacing.md },
    imageModalClose: { alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.45)', borderRadius: 22, height: 44, justifyContent: 'center', position: 'absolute', right: spacing.md, top: spacing.xl, width: 44, zIndex: 1 },
    fullScreenImage: { height: '88%', width: '100%' },

    locationRow: {
      alignItems: 'center',
      flexDirection: 'row',
      marginTop: spacing.md,
    },

    locationText: {
      color: colors.textMuted,
      flex: 1,
      marginLeft: spacing.xs,
    },

    commentsSection: { borderTopColor: colors.borderSoft, borderTopWidth: 1, marginTop: spacing.lg, paddingTop: spacing.md },
    commentsHint: { color: colors.textMuted, fontSize: fonts.caption, lineHeight: fonts.caption * 1.5, marginBottom: spacing.sm },
    commentsError: { color: colors.danger, fontSize: fonts.caption, lineHeight: fonts.caption * 1.4, marginTop: spacing.sm },
    commentsLoading: { marginVertical: spacing.sm },
    commentInput: { borderColor: colors.borderSoft, borderRadius: 12, borderWidth: 1, color: colors.text, fontSize: fonts.body, minHeight: 46, paddingHorizontal: spacing.sm },
    commentSubmit: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', marginTop: spacing.sm, minHeight: 44, paddingHorizontal: spacing.md },
    commentSubmitDisabled: { opacity: 0.55 },
    commentSubmitText: { color: '#FFFFFF', fontSize: fonts.body, fontWeight: '700', marginLeft: spacing.xs },
    commentCard: { backgroundColor: colors.background, borderRadius: 12, marginTop: spacing.sm, padding: spacing.sm },
    commentHeader: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between' },
    commentAuthor: { color: colors.text, flex: 1, fontSize: fonts.caption, fontWeight: '800', paddingRight: spacing.sm },
    commentDate: { color: colors.textMuted, fontSize: fonts.caption },
    commentBody: { color: colors.text, fontSize: fonts.body, lineHeight: fonts.body * 1.45, marginTop: 3 },
    commentHidden: { color: colors.textMuted, fontSize: fonts.caption, fontStyle: 'italic', marginTop: 3 },
    commentsMore: { alignItems: 'center', borderColor: colors.primary, borderRadius: 10, borderWidth: 1, marginTop: spacing.sm, paddingVertical: 9 },
    commentsMoreText: { color: colors.primary, fontSize: fonts.caption, fontWeight: '700' },

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
