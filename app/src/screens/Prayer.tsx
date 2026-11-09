import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { PrayerRequest } from '../services/database';
import {
  createPrayerRequest,
  deleteMyPrayerRequest,
  getMyPrayerRequests,
  updateMyPrayerRequest,
} from '../services/prayerService';
import { supabase } from '../services/supabase';
import { useAccessibility } from '../theme/AccessibilityContext';
import { spacing } from '../theme/theme';

const MAX_PRAYER_REQUEST_LENGTH = 4000;

function formatRequestedAt(value: string) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatStatus(status: PrayerRequest['status']) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default function PrayerScreen() {
  const { colors, fonts } = useAccessibility();
  const styles = makeStyles(colors, fonts);
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setRequests([]);
      setLoadError('Please sign in to view your prayer requests.');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const { requests: loadedRequests, error } = await getMyPrayerRequests(user.id);

    if (error) {
      console.warn('Unable to load prayer requests.', error.message);
      setRequests([]);
      setLoadError('We could not load your prayer requests. Please try again.');
    } else {
      setRequests(loadedRequests);
      setLoadError(null);
    }

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const resetForm = () => {
    setDescription('');
    setIsPublic(false);
    setEditingRequestId(null);
  };

  const saveRequest = async () => {
    const trimmedDescription = description.trim();

    if (!trimmedDescription) {
      Alert.alert('Add a prayer request', 'Please write your prayer request first.');
      return;
    }

    if (trimmedDescription.length > MAX_PRAYER_REQUEST_LENGTH) {
      Alert.alert(
        'Prayer request is too long',
        `Please use ${MAX_PRAYER_REQUEST_LENGTH.toLocaleString()} characters or fewer.`
      );
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      Alert.alert('Sign in required', 'Please sign in and try again.');
      return;
    }

    setSaving(true);

    const result = editingRequestId
      ? await updateMyPrayerRequest(editingRequestId, trimmedDescription, isPublic)
      : await createPrayerRequest(user.id, trimmedDescription, isPublic);

    setSaving(false);

    if (result.error || !result.request) {
      console.warn('Unable to save prayer request.', result.error?.message);
      Alert.alert(
        'Unable to save request',
        'Please check your connection and try again.'
      );
      return;
    }

    setRequests((current) => {
      const withoutSavedRequest = current.filter(
        (request) => request.id !== result.request!.id
      );
      return [result.request!, ...withoutSavedRequest];
    });
    resetForm();
    Alert.alert(
      editingRequestId ? 'Prayer request updated' : 'Prayer request sent',
      editingRequestId
        ? 'Your changes have been saved.'
        : 'Your prayer request has been sent for pastoral review.'
    );
  };

  const beginEdit = (request: PrayerRequest) => {
    setEditingRequestId(request.id);
    setDescription(request.description);
    setIsPublic(request.is_public);
  };

  const removeRequest = (request: PrayerRequest) => {
    Alert.alert(
      'Delete prayer request?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteMyPrayerRequest(request.id);

            if (error) {
              console.warn('Unable to delete prayer request.', error.message);
              Alert.alert(
                'Unable to delete request',
                'Please check your connection and try again.'
              );
              return;
            }

            setRequests((current) =>
              current.filter((currentRequest) => currentRequest.id !== request.id)
            );

            if (editingRequestId === request.id) {
              resetForm();
            }
          },
        },
      ]
    );
  };

  const onRefresh = () => {
    setRefreshing(true);
    void loadRequests();
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.hero}>
        <Ionicons name="heart" color="#FFF" size={32} />
        <Text style={styles.heroTitle}>Prayer Requests</Text>
        <Text style={styles.heroText}>
          Share your request privately with the Word Alive Ministries team.
        </Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>
          {editingRequestId ? 'Edit prayer request' : 'Share a prayer request'}
        </Text>
        <Text style={styles.helperText}>
          Requests are private unless pastoral staff approve a public request.
        </Text>
        <TextInput
          accessibilityLabel="Prayer request"
          multiline
          maxLength={MAX_PRAYER_REQUEST_LENGTH}
          onChangeText={setDescription}
          placeholder="Write your prayer request"
          placeholderTextColor={colors.textMuted}
          style={styles.textArea}
          textAlignVertical="top"
          value={description}
        />
        <Text style={styles.characterCount}>
          {description.length}/{MAX_PRAYER_REQUEST_LENGTH}
        </Text>
        <View style={styles.publicRow}>
          <View style={styles.publicTextWrap}>
            <Text style={styles.publicLabel}>May this be shared publicly?</Text>
            <Text style={styles.helperText}>
              Staff must still approve it before other members can see it.
            </Text>
          </View>
          <Switch value={isPublic} onValueChange={setIsPublic} />
        </View>
        <TouchableOpacity
          accessibilityRole="button"
          disabled={saving}
          onPress={() => void saveRequest()}
          style={[styles.primaryButton, saving && styles.disabledButton]}
        >
          {saving ? <ActivityIndicator color="#FFF" /> : null}
          <Text style={styles.primaryButtonText}>
            {saving
              ? 'Saving...'
              : editingRequestId
                ? 'Save changes'
                : 'Send prayer request'}
          </Text>
        </TouchableOpacity>
        {editingRequestId ? (
          <TouchableOpacity onPress={resetForm} style={styles.cancelButton}>
            <Text style={styles.cancelButtonText}>Cancel editing</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Text style={styles.listTitle}>My requests</Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} size="large" style={styles.loading} />
      ) : loadError ? (
        <View style={styles.emptyCard}>
          <Ionicons name="cloud-offline-outline" color={colors.textMuted} size={38} />
          <Text style={styles.emptyTitle}>Unable to load requests</Text>
          <Text style={styles.emptyText}>{loadError}</Text>
          <TouchableOpacity onPress={() => void loadRequests()} style={styles.outlineButton}>
            <Text style={styles.outlineButtonText}>Try again</Text>
          </TouchableOpacity>
        </View>
      ) : requests.length ? (
        requests.map((request) => (
          <View key={request.id} style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{formatStatus(request.status)}</Text>
              </View>
              <Text style={styles.requestDate}>{formatRequestedAt(request.created_at)}</Text>
            </View>
            <Text style={styles.requestDescription}>{request.description}</Text>
            <Text style={styles.visibilityText}>
              {request.is_public ? 'Public sharing requested' : 'Private request'}
            </Text>
            {request.status === 'pending' ? (
              <View style={styles.requestActions}>
                <TouchableOpacity onPress={() => beginEdit(request)}>
                  <Text style={styles.editText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeRequest(request)}>
                  <Text style={styles.deleteText}>Delete</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ))
      ) : (
        <View style={styles.emptyCard}>
          <Ionicons name="heart-outline" color={colors.textMuted} size={42} />
          <Text style={styles.emptyTitle}>No requests yet</Text>
          <Text style={styles.emptyText}>
            Your submitted prayer requests will appear here.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function makeStyles(colors: any, fonts: any) {
  return StyleSheet.create({
    container: { backgroundColor: colors.background, flex: 1 },
    content: { padding: spacing.lg, paddingBottom: spacing.xl },
    hero: {
      backgroundColor: colors.primary,
      borderRadius: 22,
      marginBottom: spacing.lg,
      padding: spacing.lg,
    },
    heroTitle: { color: '#FFF', fontSize: fonts.display, fontWeight: '700', marginTop: spacing.sm },
    heroText: { color: '#DDF4E6', fontSize: fonts.body, lineHeight: fonts.body * 1.5, marginTop: spacing.xs },
    formCard: { backgroundColor: colors.surface, borderRadius: 20, padding: spacing.lg },
    sectionTitle: { color: colors.primary, fontSize: fonts.subtitle, fontWeight: '700' },
    helperText: { color: colors.textMuted, fontSize: fonts.caption, lineHeight: fonts.caption * 1.5, marginTop: 4 },
    textArea: {
      borderColor: colors.borderSoft,
      borderRadius: 14,
      borderWidth: 1,
      color: colors.text,
      fontSize: fonts.body,
      lineHeight: fonts.body * 1.5,
      marginTop: spacing.md,
      minHeight: 132,
      padding: spacing.sm,
    },
    characterCount: { color: colors.textMuted, fontSize: fonts.caption, marginTop: 4, textAlign: 'right' },
    publicRow: { alignItems: 'center', flexDirection: 'row', marginTop: spacing.sm },
    publicTextWrap: { flex: 1, paddingRight: spacing.sm },
    publicLabel: { color: colors.text, fontSize: fonts.body, fontWeight: '600' },
    primaryButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', marginTop: spacing.md, paddingVertical: 14 },
    disabledButton: { opacity: 0.65 },
    primaryButtonText: { color: '#FFF', fontSize: fonts.body, fontWeight: '700', marginLeft: spacing.xs },
    cancelButton: { alignItems: 'center', marginTop: spacing.sm, paddingVertical: spacing.xs },
    cancelButtonText: { color: colors.primary, fontSize: fonts.body, fontWeight: '700' },
    listTitle: { color: colors.text, fontSize: fonts.subtitle, fontWeight: '700', marginBottom: spacing.sm, marginTop: spacing.xl },
    loading: { marginTop: spacing.xl },
    emptyCard: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 20, padding: spacing.xl },
    emptyTitle: { color: colors.text, fontSize: fonts.subtitle, fontWeight: '700', marginTop: spacing.sm },
    emptyText: { color: colors.textMuted, fontSize: fonts.body, lineHeight: fonts.body * 1.5, marginTop: spacing.xs, textAlign: 'center' },
    outlineButton: { borderColor: colors.primary, borderRadius: 12, borderWidth: 1, marginTop: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
    outlineButtonText: { color: colors.primary, fontSize: fonts.body, fontWeight: '700' },
    requestCard: { backgroundColor: colors.surface, borderRadius: 18, marginBottom: spacing.md, padding: spacing.md },
    requestHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
    statusBadge: { backgroundColor: colors.primaryMuted, borderRadius: 10, paddingHorizontal: spacing.sm, paddingVertical: 4 },
    statusText: { color: colors.primary, fontSize: fonts.caption, fontWeight: '700' },
    requestDate: { color: colors.textMuted, fontSize: fonts.caption },
    requestDescription: { color: colors.text, fontSize: fonts.body, lineHeight: fonts.body * 1.5, marginTop: spacing.sm },
    visibilityText: { color: colors.textMuted, fontSize: fonts.caption, marginTop: spacing.sm },
    requestActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.sm },
    editText: { color: colors.primary, fontSize: fonts.body, fontWeight: '700', marginRight: spacing.md },
    deleteText: { color: colors.danger, fontSize: fonts.body, fontWeight: '700' },
  });
}
