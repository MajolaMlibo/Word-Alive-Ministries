import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import AdminSearchBar from './AdminSearchBar';
import { StudyCommentModerationItem } from '../services/database';
import {
  getStudyCommentModerationPage,
  StudyCommentModerationCursor,
  setStudyCommentVisibility,
} from '../services/studyCommentService';

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

export default function StudyCommentsManager({ styles }: { styles: any }) {
  const [searchInput, setSearchInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [comments, setComments] = useState<StudyCommentModerationItem[]>([]);
  const [cursor, setCursor] = useState<StudyCommentModerationCursor | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFirstPage = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getStudyCommentModerationPage(appliedSearch);
    setLoading(false);
    if (result.error) {
      console.warn('Unable to load study comments for moderation.', result.error.message);
      setComments([]);
      setCursor(null);
      setHasMore(false);
      setError('Comments could not be loaded. Please try again.');
      return;
    }
    setComments(result.items);
    setCursor(result.nextCursor);
    setHasMore(result.hasMore);
  }, [appliedSearch]);

  useEffect(() => { void loadFirstPage(); }, [loadFirstPage]);

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    const result = await getStudyCommentModerationPage(appliedSearch, cursor);
    setLoadingMore(false);
    if (result.error) {
      console.warn('Unable to load more study comments for moderation.', result.error.message);
      setError('More comments could not be loaded. Please try again.');
      return;
    }
    setComments((current) => [...current, ...result.items.filter((item) => !current.some((known) => known.id === item.id))]);
    setCursor(result.nextCursor);
    setHasMore(result.hasMore);
  };

  const setVisibility = (comment: StudyCommentModerationItem, visible: boolean) => {
    Alert.alert(
      `${visible ? 'Restore' : 'Hide'} comment?`,
      visible ? 'Members will be able to see this comment again.' : 'Members will no longer see this comment. The author and ministry team can still see it.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: visible ? 'Restore' : 'Hide',
          style: visible ? 'default' : 'destructive',
          onPress: async () => {
            const { error: updateError } = await setStudyCommentVisibility(comment.id, visible);
            if (updateError) {
              Alert.alert('Unable to update comment', 'Please refresh and try again.');
              return;
            }
            setComments((current) => current.map((item) => item.id === comment.id
              ? { ...item, status: visible ? 'visible' : 'hidden' }
              : item));
          },
        },
      ],
    );
  };

  return <View>
    <Text style={styles.panelHint}>Comments post immediately under the member’s name. Hide unsuitable content after review; hidden comments remain available to the author and ministry team.</Text>
    <AdminSearchBar
      appliedSearch={appliedSearch}
      filterActive={false}
      onChange={setSearchInput}
      onClearFilters={loadFirstPage}
      onClearSearch={() => { setSearchInput(''); setAppliedSearch(''); }}
      onSearch={() => setAppliedSearch(searchInput.trim())}
      placeholder="Search study, member, or comment"
      value={searchInput}
    />
    {error ? <Text style={styles.warningText}>{error}</Text> : null}
    {loading ? <ActivityIndicator color={styles.primaryColor} size="large" style={styles.loading} /> : comments.length ? comments.map((comment) => <View key={comment.id} style={styles.itemCard}>
      <Text style={styles.itemTitle}>{comment.author_name} · {comment.status === 'hidden' ? 'Hidden' : 'Visible'}</Text>
      <Text style={styles.itemMeta}>{comment.study_name} · {dateLabel(comment.study_date)} · {dateLabel(comment.created_at)}</Text>
      <Text style={styles.itemDescription}>{comment.body}</Text>
      <View style={styles.cardActions}>
        <TouchableOpacity onPress={() => setVisibility(comment, comment.status === 'hidden')}>
          <Text style={comment.status === 'hidden' ? styles.editText : styles.deleteText}>{comment.status === 'hidden' ? 'Restore' : 'Hide'}</Text>
        </TouchableOpacity>
      </View>
    </View>) : <View style={styles.emptyCard}><Text style={styles.emptyText}>No study comments match this search.</Text></View>}
    {hasMore ? <TouchableOpacity accessibilityRole="button" onPress={() => void loadMore()} style={styles.outlineButton}>
      <Text style={styles.outlineButtonText}>{loadingMore ? 'Loading…' : 'Load more comments'}</Text>
    </TouchableOpacity> : null}
  </View>;
}
