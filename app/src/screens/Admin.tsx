import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
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
import DateTimePicker from '@react-native-community/datetimepicker';
import { useContentList } from '../components/useContentList';
import MembersManager from '../components/MembersManager';
import PrayerInbox from '../components/PrayerInbox';
import RichTextField from '../components/RichTextField';
import {
  Announcement,
  BibleStudy,
  ContentStatus,
  DailyReading,
  LiveStream,
  MinistryLink,
  ReadingPlan,
  StudyMedia,
} from '../services/database';
import {
  deleteAnnouncement,
  deleteBibleStudy,
  deleteDailyReading,
  deleteLiveStream,
  deleteMinistryLink,
  getAdminAnnouncements,
  getAdminBibleStudies,
  getAdminDailyReadings,
  readingDayNumber,
  getAdminLiveStreams,
  getAdminMinistryLinks,
  getAdminReadingPlans,
  saveAnnouncement,
  saveBibleStudy,
  saveDailyReading,
  saveLiveStream,
  saveMinistryLink,
  saveReadingPlan,
} from '../services/adminService';
import { getCurrentUserRole, isAdminRole } from '../services/roleService';
import { supabase } from '../services/supabase';
import {
  chooseAndUploadStudyImages,
  deleteStudyMedia,
  getStudyMedia,
  getStudyMediaUrls,
} from '../services/studyMediaService';
import { useAccessibility } from '../theme/AccessibilityContext';
import { spacing } from '../theme/theme';

type AdminSection = 'prayer' | 'announcements' | 'studies' | 'plans' | 'readings' | 'streams' | 'links' | 'members';

const CONTENT_STATUSES: ContentStatus[] = ['draft', 'published', 'archived'];
const SECTIONS: { key: AdminSection; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'prayer', label: 'Prayer', icon: 'heart-outline' },
  { key: 'announcements', label: 'Notices', icon: 'megaphone-outline' },
  { key: 'studies', label: 'Studies', icon: 'school-outline' },
  { key: 'plans', label: 'Plans', icon: 'list-outline' },
  { key: 'readings', label: 'Readings', icon: 'book-outline' },
  { key: 'links', label: 'Links', icon: 'link-outline' },
  { key: 'members', label: 'Members', icon: 'people-outline' },
];

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function toOptional(value: string) {
  const trimmed = value.trim();
  return trimmed || null;
}

function isHttpsUrl(value: string) {
  return !value || /^https:\/\/\S+$/i.test(value);
}

function dateToInputValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function timeToInputValue(date: Date) {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function dateFromInputValue(value: string) {
  if (!value) return new Date();
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function timeFromInputValue(value: string) {
  const base = new Date();
  if (!value) return base;
  const [hours, minutes] = value.split(':').map(Number);
  base.setHours(hours, minutes, 0, 0);
  return base;
}

function splitDateTime(value: string | null) {
  if (!value) return { date: '', time: '' };
  const parsed = new Date(value);
  return { date: dateToInputValue(parsed), time: timeToInputValue(parsed) };
}

function combineDateTime(date: string, time: string) {
  const [year, month, day] = date.split('-').map(Number);
  const [hours, minutes] = time.split(':').map(Number);
  return new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function ContentStatusPicker({
  value,
  onChange,
  styles,
}: {
  value: ContentStatus;
  onChange: (value: ContentStatus) => void;
  styles: any;
}) {
  return (
    <View style={styles.statusPicker}>
      {CONTENT_STATUSES.map((status) => (
        <TouchableOpacity
          key={status}
          onPress={() => onChange(status)}
          style={[styles.statusOption, value === status && styles.statusOptionActive]}
        >
          <Text style={[styles.statusOptionText, value === status && styles.statusOptionTextActive]}>
            {titleCase(status)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  keyboardType,
  documentId,
  styles,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'url';
  documentId?: string;
  styles: any;
}) {
  if (multiline) {
    return (
      <RichTextField
        key={documentId || label}
        label={label}
        onChangeText={onChangeText}
        placeholder={placeholder}
        styles={styles}
        value={value}
      />
    );
  }

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType={keyboardType}
        multiline={false}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={styles.placeholderColor}
        style={[styles.field, multiline && styles.textArea]}
        textAlignVertical={multiline ? 'top' : 'center'}
        value={value}
      />
    </View>
  );
}

function DateTimeField({
  label,
  value,
  mode,
  onChange,
  optional = false,
  initialDate,
  styles,
}: {
  label: string;
  value: string;
  mode: 'date' | 'time';
  onChange: (value: string) => void;
  optional?: boolean;
  initialDate?: string;
  styles: any;
}) {
  const [showPicker, setShowPicker] = useState(false);
  if (Platform.OS === 'web') {
    return <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <input aria-label={label} type={mode} value={value}
        onChange={event => onChange(event.currentTarget.value)}
        style={{ font: 'inherit', color: styles.textColor, backgroundColor: styles.surfaceColor,
          border: '1px solid ' + styles.borderSoftColor, borderRadius: 12, padding: 12, minHeight: 44 }} />
    </View>;
  }
  const displayValue = value
    ? mode === 'date'
      ? dateFromInputValue(value).toLocaleDateString('en-GB', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        })
      : value
    : `Select ${mode}`;

  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.pickerFieldRow}>
        <TouchableOpacity
          accessibilityLabel={`${label}: ${displayValue}`}
          accessibilityRole="button"
          onPress={() => setShowPicker(true)}
          style={styles.pickerField}
        >
          <Ionicons
            color={styles.primaryColor}
            name={mode === 'date' ? 'calendar-outline' : 'time-outline'}
            size={20}
          />
          <Text style={[styles.pickerFieldText, !value && styles.pickerFieldPlaceholder]}>
            {displayValue}
          </Text>
        </TouchableOpacity>
        {optional && value ? (
          <TouchableOpacity
            accessibilityLabel={`Clear ${label}`}
            onPress={() => onChange('')}
            style={styles.clearPickerButton}
          >
            <Ionicons color={styles.textMutedColor} name="close" size={20} />
          </TouchableOpacity>
        ) : null}
      </View>
      {showPicker ? (
        <DateTimePicker
          display="default"
          mode={mode}
          onChange={(event, selectedDate) => {
            setShowPicker(false);
            if (event.type !== 'set' || !selectedDate) return;
            onChange(mode === 'date' ? dateToInputValue(selectedDate) : timeToInputValue(selectedDate));
          }}
          value={mode === 'date' ? dateFromInputValue(value || initialDate || '') : timeFromInputValue(value)}
        />
      ) : null}
    </View>
  );
}

function ContentActions({
  saving,
  editing,
  onSave,
  onCancel,
  styles,
}: {
  saving: boolean;
  editing: boolean;
  onSave: () => void;
  onCancel: () => void;
  styles: any;
}) {
  return (
    <>
      <TouchableOpacity
        disabled={saving}
        onPress={onSave}
        style={[styles.primaryButton, saving && styles.disabledButton]}
      >
        {saving ? <ActivityIndicator color="#FFF" /> : null}
        <Text style={styles.primaryButtonText}>
          {saving ? 'Saving...' : editing ? 'Save changes' : 'Create'}
        </Text>
      </TouchableOpacity>
      {editing ? (
        <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
          <Text style={styles.cancelButtonText}>Cancel editing</Text>
        </TouchableOpacity>
      ) : null}
    </>
  );
}

function AnnouncementsManager({ administratorId, styles }: { administratorId: string; styles: any }) {
  const blank = () => ({ sendPush: false, title: '', message: '', status: 'draft' as ContentStatus, expiryDate: '', expiryTime: '', actionLabel: '', actionUrl: '' });
  const list = useContentList(getAdminAnnouncements);
  const { items: announcements, loading } = list;
  const [form, setForm] = useState(blank);
  const [draftNumber, setDraftNumber] = useState(0);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);
  const savedForm = useRef(JSON.stringify(form));



  const applyForm = (nextForm: ReturnType<typeof blank>, nextEditing: Announcement | null) => {
    savedForm.current = JSON.stringify(nextForm);
    setEditing(nextEditing);
    setForm(nextForm);
  };
  const reset = () => { setDraftNumber(n => n + 1); applyForm(blank(), null); };
  const startEditing = (announcement: Announcement) => {
    const expiry = splitDateTime(announcement.expires_at);
    applyForm({
      sendPush: false,
      title: announcement.title,
      message: announcement.message,
      status: announcement.status,
      expiryDate: expiry.date,
      expiryTime: expiry.time,
      actionLabel: announcement.action_label || '',
      actionUrl: announcement.action_url || '',
    }, announcement);
  };
  const edit = (announcement: Announcement) => {
    if (editing?.id === announcement.id) return;
    const continueEditing = () => startEditing(announcement);
    if (JSON.stringify(form) === savedForm.current) {
      continueEditing();
      return;
    }
    Alert.alert('Unsaved notice changes', 'Save changes or cancel editing before opening another notice.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard changes', style: 'destructive', onPress: continueEditing },
    ]);
  };

  const save = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      Alert.alert('Title and message required', 'Add both before saving this notice.');
      return;
    }
    if (form.title.trim().length > 160 || form.message.trim().length > 5000) {
      Alert.alert('Notice is too long', 'Use 160 characters or fewer for the title and 5,000 or fewer for the message.');
      return;
    }
    if (!isHttpsUrl(form.actionUrl) || (Boolean(form.actionLabel.trim()) !== Boolean(form.actionUrl.trim()))) {
      Alert.alert('Check action link', 'Provide both a button label and an HTTPS link, or leave both blank.');
      return;
    }
    if (Boolean(form.expiryDate) !== Boolean(form.expiryTime)) {
      Alert.alert('Choose both expiry values', 'Select both an expiry date and an expiry time, or clear both.');
      return;
    }
    const expiresAt = form.expiryDate ? combineDateTime(form.expiryDate, form.expiryTime) : null;
    if (expiresAt && form.status === 'published' && new Date(expiresAt).getTime() <= Date.now()) {
      Alert.alert('Check expiry time', 'The expiry must be in the future when publishing a notice.'); return;
    }
    setSaving(true);
    const { announcement, error } = await saveAnnouncement({
      sendPush: form.sendPush && form.status === "published" && editing?.status !== "published",
      title: form.title,
      message: form.message,
      status: form.status,
      publishedAt: editing?.published_at || null,
      expiresAt,
      actionLabel: toOptional(form.actionLabel),
      actionUrl: toOptional(form.actionUrl),
    }, administratorId, editing?.id);
    setSaving(false);
    if (error || !announcement) {
      Alert.alert('Unable to save notice', 'Please check your connection and try again.');
      return;
    }
    list.reload();
    reset();
  };

  const remove = (announcement: Announcement) => Alert.alert('Delete notice?', 'This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      const { error } = await deleteAnnouncement(announcement.id);
      if (error) Alert.alert('Unable to delete notice', 'Please try again.');
      else { list.reload(); if (editing?.id === announcement.id) reset(); }
    } },
  ]);

  return (
    <View>
      <EditorCard title={editing ? 'Edit notice' : 'New notice'} styles={styles}>
        <Field label="Title" value={form.title} onChangeText={(title) => setForm(current => ({ ...current, title }))} styles={styles} />
        <Field label="Message" value={form.message} onChangeText={(message) => setForm(current => ({ ...current, message }))} multiline documentId={editing?.id || 'new-notice-' + draftNumber} styles={styles} />
        <Text style={styles.fieldLabel}>Status</Text>
        <ContentStatusPicker value={form.status} onChange={(status) => setForm(current => ({ ...current, status }))} styles={styles} />
        {form.status === 'published' && editing?.status !== 'published' && <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Send push notification</Text>
          <Switch accessibilityLabel="Send push notification" value={form.sendPush}
            onValueChange={sendPush => setForm(current => ({ ...current, sendPush }))} />
        </View>}
        <DateTimeField label="Expiry date (optional)" value={form.expiryDate} onChange={(expiryDate) => setForm(current => ({ ...current, expiryDate }))} mode="date" optional styles={styles} />
        <DateTimeField label="Expiry time (optional)" value={form.expiryTime} onChange={(expiryTime) => setForm(current => ({ ...current, expiryTime }))} mode="time" optional styles={styles} />
        <Field label="Action button label (optional)" value={form.actionLabel} onChangeText={(actionLabel) => setForm(current => ({ ...current, actionLabel }))} styles={styles} />
        <Field label="Action HTTPS link (optional)" value={form.actionUrl} onChangeText={(actionUrl) => setForm(current => ({ ...current, actionUrl }))} keyboardType="url" styles={styles} />
        <ContentActions saving={saving} editing={Boolean(editing)} onSave={() => void save()} onCancel={reset} styles={styles} />
      </EditorCard>
      <Text style={styles.listTitle}>Existing notices</Text>
    {list.searchControl('Search announcements')}
      {loading ? <ActivityIndicator color={styles.primaryColor} size="large" style={styles.loading} /> : announcements.length ? announcements.map((announcement) => (
        <ContentListCard key={announcement.id} title={announcement.title} subtitle={`${titleCase(announcement.status)} • ${announcement.published_at ? formatDate(announcement.published_at) : 'Not scheduled'}`} onEdit={() => edit(announcement)} onDelete={() => remove(announcement)} styles={styles} />
      )) : <EmptyState icon="megaphone-outline" message="No notices yet." styles={styles} />}
    {list.pageControl(styles)}
    </View>
  );
}

function StudyImagesManager({
  studyId,
  administratorId,
  styles,
}: {
  studyId: string;
  administratorId: string;
  styles: any;
}) {
  const [media, setMedia] = useState<StudyMedia[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { media: loadedMedia, error } = await getStudyMedia([studyId]);
    if (error) {
      Alert.alert('Unable to load study images', 'Please refresh and try again.');
      setLoading(false);
      return;
    }
    const { urls: loadedUrls, error: urlError } = await getStudyMediaUrls(loadedMedia);
    if (urlError) Alert.alert('Unable to load study images', 'Please refresh and try again.');
    setMedia(loadedMedia);
    setUrls(loadedUrls);
    setLoading(false);
  }, [studyId]);

  useEffect(() => { void load(); }, [load]);

  const addImages = async () => {
    setUploading(true);
    const { cancelled, error } = await chooseAndUploadStudyImages(studyId, administratorId);
    setUploading(false);
    if (cancelled) return;
    if (error) {
      Alert.alert('Unable to add images', 'An interrupted image can be removed here before retrying. ' + (error.message || ''));
      await load();
      return;
    }
    await load();
  };

  const removeImage = (item: StudyMedia) => Alert.alert(
    'Remove study image?',
    'Members will no longer see this image.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const { error } = await deleteStudyMedia(item);
          if (error) Alert.alert('Unable to remove image', 'Please try again.');
          else await load();
        },
      },
    ]
  );

  return (
    <View style={styles.studyImagesEditor}>
      <Text style={styles.fieldLabel}>Study images</Text>
      <Text style={styles.helperText}>
        Add up to six sermon-note images. Members see them only when this study is published.
      </Text>
      {loading ? <ActivityIndicator color={styles.primaryColor} /> : media.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.studyImageList}>
          {media.map((item) => (
            <View key={item.id} style={styles.studyImageItem}>
              {item.upload_pending && <Text style={styles.fieldLabel}>Incomplete upload</Text>}
              {urls[item.id] ? <Image source={{ uri: urls[item.id] }} style={styles.studyImagePreview} /> : null}
              <TouchableOpacity
                accessibilityLabel="Remove study image"
                onPress={() => removeImage(item)}
                style={styles.removeStudyImageButton}
              >
                <Ionicons name="close" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={styles.helperText}>No images added yet.</Text>
      )}
      <TouchableOpacity
        disabled={uploading || loading}
        onPress={() => void addImages()}
        style={[styles.addStudyImageButton, (uploading || loading) && styles.disabledButton]}
      >
        <Ionicons name="images-outline" size={19} color="#FFF" />
        <Text style={styles.addStudyImageButtonText}>{uploading ? 'Uploading...' : 'Add study images'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function StudiesManager({ administratorId, styles }: { administratorId: string; styles: any }) {
  const blank = () => ({ name: '', scripture: '', date: '', start: '', end: '', description: '', location: '', status: 'draft' as ContentStatus });
  const list = useContentList(getAdminBibleStudies);
  const { items: studies, loading } = list;
  const [form, setForm] = useState(blank);
  const [draftNumber, setDraftNumber] = useState(0);
  const [editing, setEditing] = useState<BibleStudy | null>(null);
  const [saving, setSaving] = useState(false);
  const savedForm = useRef(JSON.stringify(form));

  const applyForm = (nextForm: ReturnType<typeof blank>, nextEditing: BibleStudy | null) => {
    savedForm.current = JSON.stringify(nextForm);
    setEditing(nextEditing);
    setForm(nextForm);
  };
  const reset = () => { setDraftNumber(n => n + 1); applyForm(blank(), null); };
  const startEditing = (study: BibleStudy) => {
    applyForm({ name: study.study_name, scripture: study.scripture_ref || '', date: study.study_date, start: study.start_time?.slice(0, 5) || '', end: study.end_time?.slice(0, 5) || '', description: study.description || '', location: study.location_or_url || '', status: study.status }, study);
  };
  const edit = (study: BibleStudy) => {
    if (editing?.id === study.id) return;
    const continueEditing = () => startEditing(study);
    if (JSON.stringify(form) === savedForm.current) {
      continueEditing();
      return;
    }
    Alert.alert('Unsaved study changes', 'Save changes or cancel editing before opening another study.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard changes', style: 'destructive', onPress: continueEditing },
    ]);
  };
  const save = async () => {
    if (!form.name.trim() || !form.date) {
      Alert.alert('Check study details', 'A study name and date are required.'); return;
    }
    setSaving(true);
    const { study, error } = await saveBibleStudy({ studyName: form.name, scriptureRef: toOptional(form.scripture), studyDate: form.date, startTime: toOptional(form.start), endTime: toOptional(form.end), description: toOptional(form.description), locationOrUrl: toOptional(form.location), status: form.status }, administratorId, editing?.id);
    setSaving(false);
    if (error || !study) { Alert.alert('Unable to save study', 'Please check your connection and try again.'); return; }
    list.reload();
    startEditing(study);
  };
  const remove = (study: BibleStudy) => Alert.alert('Delete Bible study?', 'This cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { const { error } = await deleteBibleStudy(study.id); if (error) Alert.alert('Study kept', error.code === '23503' ? 'Open Edit and remove the study images first. You can retry each removal, or archive the study to keep its images.' : 'Please try again.'); else { list.reload(); if (editing?.id === study.id) reset(); } } }]);
  return <View>
    <EditorCard title={editing ? 'Edit study or event' : 'New study or event'} styles={styles}>
      <Field label="Study or event title" value={form.name} onChangeText={(name) => setForm(current => ({ ...current, name }))} styles={styles} />
      <Field label="Specific sermon verses (optional)" value={form.scripture} onChangeText={(scripture) => setForm(current => ({ ...current, scripture }))} styles={styles} />
      <DateTimeField label="Study date" value={form.date} onChange={(date) => setForm(current => ({ ...current, date }))} mode="date" styles={styles} />
      <DateTimeField label="Start time (optional)" value={form.start} onChange={(start) => setForm(current => ({ ...current, start }))} mode="time" optional styles={styles} />
      <DateTimeField label="End time (optional)" value={form.end} onChange={(end) => setForm(current => ({ ...current, end }))} mode="time" optional styles={styles} />
      <Field label="Location or HTTPS link (optional)" value={form.location} onChangeText={(location) => setForm(current => ({ ...current, location }))} styles={styles} />
      <Field label="Study notes or discussion summary (optional)" value={form.description} onChangeText={(description) => setForm(current => ({ ...current, description }))} multiline documentId={editing?.id || 'new-study-' + draftNumber} styles={styles} />
      <Text style={styles.fieldLabel}>Status</Text><ContentStatusPicker value={form.status} onChange={(status) => setForm(current => ({ ...current, status }))} styles={styles} />
      <ContentActions saving={saving} editing={Boolean(editing)} onSave={() => void save()} onCancel={reset} styles={styles} />
      {editing ? <StudyImagesManager studyId={editing.id} administratorId={administratorId} styles={styles} /> : (
        <Text style={styles.helperText}>Save this study first, then add its sermon-note images.</Text>
      )}
    </EditorCard>
    <Text style={styles.listTitle}>Scheduled studies and events</Text>
    {list.searchControl('Search studies')}
    {loading ? <ActivityIndicator color={styles.primaryColor} size="large" style={styles.loading} /> : studies.length ? studies.map((study) => <ContentListCard key={study.id} title={study.study_name} subtitle={`${study.study_date} • ${titleCase(study.status)}`} onEdit={() => edit(study)} onDelete={study.status === 'draft' ? () => remove(study) : undefined} styles={styles} />) : <EmptyState icon="school-outline" message="No Bible studies yet." styles={styles} />}
    {list.pageControl(styles)}
  </View>;
}

function PlansManager({ administratorId, styles }: { administratorId: string; styles: any }) {
  const blank = () => ({ name: '', year: '', description: '', status: 'draft' as ContentStatus });
  const [plans, setPlans] = useState<ReadingPlan[]>([]);
  const [form, setForm] = useState(blank);
  const [draftNumber, setDraftNumber] = useState(0);
  const [editing, setEditing] = useState<ReadingPlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    const { plans: loadedPlans, error } = await getAdminReadingPlans();
    if (error) Alert.alert('Unable to load plans', 'Please refresh and try again.'); else setPlans(loadedPlans);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const reset = () => { setDraftNumber(n => n + 1); setEditing(null); setForm(blank()); };
  const edit = (plan: ReadingPlan) => { setEditing(plan); setForm({ name: plan.name, year: String(plan.plan_year), description: plan.description || '', status: plan.status }); };
  const save = async () => {
    const year = Number(form.year);
    if (!form.name.trim() || !Number.isInteger(year) || year < 2000 || year > 2100) {
      Alert.alert('Check plan details', 'A name and year between 2000 and 2100 are required.'); return;
    }
    setSaving(true);
    const { plan, error } = await saveReadingPlan({ name: form.name, planYear: year, description: toOptional(form.description), status: form.status }, administratorId, editing?.id);
    setSaving(false);
    if (error || !plan) { Alert.alert('Unable to save plan', 'Plan names must be unique within the same year.'); return; }
    setPlans((current) => [plan, ...current.filter((item) => item.id !== plan.id)].sort((a, b) => b.plan_year - a.plan_year));
    reset();
  };
  return <View>
    <EditorCard title={editing ? 'Edit reading plan' : 'New reading plan'} styles={styles}>
      <Field label="Plan name" value={form.name} onChangeText={(name) => setForm(current => ({ ...current, name }))} styles={styles} />
      <Field label="Plan year" value={form.year} onChangeText={(year) => setForm(current => ({ ...current, year }))} keyboardType="numeric" placeholder="2027" styles={styles} />
      <Field label="Description (optional)" value={form.description} onChangeText={(description) => setForm(current => ({ ...current, description }))} multiline documentId={editing?.id || 'new-reading-plan-' + draftNumber} styles={styles} />
      <Text style={styles.fieldLabel}>Status</Text><ContentStatusPicker value={form.status} onChange={(status) => setForm(current => ({ ...current, status }))} styles={styles} />
      <ContentActions saving={saving} editing={Boolean(editing)} onSave={() => void save()} onCancel={reset} styles={styles} />
    </EditorCard>
    <Text style={styles.listTitle}>Reading plans</Text>
    {loading ? <ActivityIndicator color={styles.primaryColor} size="large" style={styles.loading} /> : plans.length ? plans.map((plan) => <ContentListCard key={plan.id} title={`${plan.name} (${plan.plan_year})`} subtitle={titleCase(plan.status)} onEdit={() => edit(plan)} onDelete={undefined} styles={styles} />) : <EmptyState icon="list-outline" message="No reading plans found." styles={styles} />}
  </View>;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function ReadingsManager({ administratorId, styles, scrollTo }: {
  administratorId: string; styles: any; scrollTo: (y: number) => void;
}) {
  const blank = (planId = '') => ({ planId, date: '', scripture: '', reflection: '', audioUrl: '', status: 'draft' as ContentStatus });
  const [plans, setPlans] = useState<ReadingPlan[] | null>(null);
  const [plansFailed, setPlansFailed] = useState(false);
  const [readings, setReadings] = useState<DailyReading[]>([]);
  const [form, setForm] = useState(blank());
  const [draftNumber, setDraftNumber] = useState(0);
  const [editing, setEditing] = useState<DailyReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [choosingPlan, setChoosingPlan] = useState(false);
  const selectedPlan = plans?.find(plan => plan.id === form.planId);
  const year = selectedPlan?.plan_year;
  const dayNumber = readingDayNumber(form.date, year);
  const [month, setMonth] = useState<number | null>(new Date().getMonth());
  const [revision, setRevision] = useState(0);
  const [loadError, setLoadError] = useState(false);
  const sectionY = useRef(0);
  const revealId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    getAdminReadingPlans().then(({ plans: items, error }) => {
      if (!active) return;
      if (error) {
        setPlansFailed(true);
        return;
      }
      setPlans(items);
      const today = new Date();
      const plan = items.find(p => p.plan_year === today.getFullYear() && p.status === 'published') ?? items[0];
      if (plan) {
        setMonth(plan.plan_year === today.getFullYear() ? today.getMonth() : 0);
        setForm(current => ({ ...current, planId: plan.id }));
      }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!form.planId || !year || month === null) return;
    let active = true;
    setLoading(true);
    setLoadError(false);
    getAdminDailyReadings(form.planId, year, month).then(result => {
      if (!active) return;
      setReadings(result.readings);
      setLoadError(Boolean(result.error));
      setLoading(false);
    });
    return () => { active = false; };
  }, [form.planId, year, month, revision]);

  const reset = () => { setDraftNumber(n => n + 1); setEditing(null); setForm(blank(form.planId)); };
  const edit = (reading: DailyReading) => {
    scrollTo(sectionY.current);
    setChoosingPlan(false);
    setEditing(reading);
    setForm({ planId: reading.plan_id, date: reading.scheduled_date, scripture: reading.scripture_ref, reflection: reading.reflection || '', audioUrl: reading.audio_url || '', status: reading.status });
  };
  const selectPlan = (plan: ReadingPlan) => {
    if (editing || saving) return;
    const change = () => {
      setChoosingPlan(false);
      if (plan.id === form.planId) return;
      revealId.current = null;
      setReadings([]);
      setLoading(true);
      const today = new Date();
      setMonth(plan.plan_year === today.getFullYear() ? today.getMonth() : 0);
      setDraftNumber(n => n + 1);
      setForm(blank(plan.id));
    };
    if (plan.id !== form.planId && JSON.stringify(form) !== JSON.stringify(blank(form.planId))) {
      Alert.alert('Change reading plan?', 'Discard this unsaved daily reading?', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Change plan', onPress: change },
      ]);
    } else change();
  };
  const save = async () => {
    if (!dayNumber || !form.scripture.trim()) {
      Alert.alert('Check reading details', `Choose a date in ${year} and enter a Scripture reference.`); return;
    }
    if (form.audioUrl && !isHttpsUrl(form.audioUrl)) { Alert.alert('Check audio link', 'Audio links must begin with https://.'); return; }
    setSaving(true);
    const { reading, error } = await saveDailyReading({ planId: form.planId, dayNumber, scheduledDate: form.date, scriptureRef: form.scripture, reflection: toOptional(form.reflection), audioUrl: toOptional(form.audioUrl), status: form.status, publishedAt: editing?.published_at || null }, administratorId, editing?.id);
    setSaving(false);
    if (error || !reading) { Alert.alert('Unable to save reading', error?.message?.includes('Publish the reading plan') ? 'Publish the year plan first, or save the reading as a draft.' : 'Check the day number and date. Only one reading across all plans can be published for a date.'); return; }
    revealId.current = reading.id;
    setLoading(true);
    setMonth(Number(reading.scheduled_date.slice(5, 7)) - 1);
    reset();
    setRevision(v => v + 1);
  };
  const remove = (reading: DailyReading) => Alert.alert('Delete unused draft?', 'A reading with member completions must be archived instead.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete draft', style: 'destructive', onPress: async () => {
      const { error } = await deleteDailyReading(reading.id);
      if (error) {
        Alert.alert('Reading kept', error.code === '23503' ? 'Members have completed this reading. Tap Edit and select Archived to preserve their history.' : 'Refresh the list and try again.');
        return;
      }
      setReadings(current => current.filter(item => item.id !== reading.id));
      if (editing?.id === reading.id) reset();
    } },
  ]);
  if (plansFailed) return <EmptyState icon="alert-circle-outline" message="Could not load reading plans. Pull down to refresh." styles={styles} />;
  if (!plans) return <ActivityIndicator color={styles.primaryColor} />;
  if (!plans.length) return <EmptyState icon="book-outline" message="Create a reading plan in Plans to schedule readings." styles={styles} />;
  return <View onLayout={event => { sectionY.current = event.nativeEvent.layout.y; }}>
    <EditorCard title={editing ? 'Edit daily reading' : 'New daily reading'} styles={styles}>
      <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded: choosingPlan, disabled: !!editing || saving }}
        disabled={!!editing || saving} style={styles.planButton} onPress={() => setChoosingPlan(open => !open)}>
        <Text style={styles.planButtonLabel}>Reading plan</Text>
        <Text style={styles.planButtonValue}>{selectedPlan?.name} ({year})</Text>
        {!editing && <Text style={styles.planButtonHint}>Tap to change year plan</Text>}
      </TouchableOpacity>
      {choosingPlan && !editing && plans.map(plan => <TouchableOpacity key={plan.id} accessibilityRole="button"
        accessibilityState={{ selected: form.planId === plan.id }} style={styles.planButton} onPress={() => selectPlan(plan)}>
        <Text style={styles.planButtonValue}>{plan.name} ({plan.plan_year}) · {titleCase(plan.status)}</Text>
      </TouchableOpacity>)}
      <DateTimeField label="Scheduled date" initialDate={year ? year + '-' + String((month ?? 0) + 1).padStart(2, '0') + '-01' : undefined} value={form.date} onChange={(date) => setForm(current => ({ ...current, date }))} mode="date" styles={styles} />
      <Text style={styles.itemMeta}>{dayNumber ? `Day ${dayNumber} of ${year}` : form.date ? `Choose a date in ${year}.` : 'Day number is calculated from the scheduled date.'}</Text>
      <Field label="Scripture reference" value={form.scripture} onChangeText={(scripture) => setForm(current => ({ ...current, scripture }))} placeholder="Psalms 107-111" styles={styles} />
      <Field label="Reflection (optional)" value={form.reflection} onChangeText={(reflection) => setForm(current => ({ ...current, reflection }))} multiline documentId={editing?.id || 'new-daily-reading-' + draftNumber} styles={styles} />
      <Field label="Audio HTTPS link (optional)" value={form.audioUrl} onChangeText={(audioUrl) => setForm(current => ({ ...current, audioUrl }))} keyboardType="url" styles={styles} />
      <Text style={styles.fieldLabel}>Status</Text><ContentStatusPicker value={form.status} onChange={(status) => setForm(current => ({ ...current, status }))} styles={styles} />
      <ContentActions saving={saving} editing={Boolean(editing)} onSave={() => void save()} onCancel={reset} styles={styles} />
    </EditorCard>
    <Text style={styles.listTitle}>Scheduled readings</Text>
    {selectedPlan && <>
      <Text style={styles.fieldLabel}>{selectedPlan.name} ({year})</Text>
      {MONTHS.map((name, index) => <React.Fragment key={name}>
        <TouchableOpacity accessibilityRole="button" aria-expanded={month === index} accessibilityState={{ expanded: month === index }}
          style={styles.planButton} onPress={() => { revealId.current = null; setLoading(true); setMonth(month === index ? null : index); }}>
          <Text style={styles.planButtonValue}>{month === index ? '▾' : '▸'} {name}</Text>
        </TouchableOpacity>
        {month === index && <View style={{ height: spacing.sm }} />}
        {month === index && (loading ? <ActivityIndicator color={styles.primaryColor} /> :
          loadError ? <TouchableOpacity accessibilityRole="button" onPress={() => { setLoading(true); setRevision(v => v + 1); }}>
            <Text style={styles.warningText}>Unable to load readings. Tap to retry.</Text>
          </TouchableOpacity> : readings.length ? readings.map(reading =>
            <View key={reading.id} onLayout={event => {
              if (revealId.current === reading.id) {
                revealId.current = null;
                scrollTo(sectionY.current + event.nativeEvent.layout.y);
              }
            }}>
              <ContentListCard title={reading.scripture_ref} subtitle={`${reading.scheduled_date} • Day ${reading.day_number} • ${titleCase(reading.status)}`}
                onEdit={() => edit(reading)} onDelete={reading.status === 'draft' ? () => remove(reading) : undefined} styles={styles} />
            </View>) : <EmptyState icon="book-outline" message={`No readings scheduled for ${name} ${year}.`} styles={styles} />)}
      </React.Fragment>)}
    </>}
  </View>;
}

function LinksManager({ administratorId, styles }: { administratorId: string; styles: any }) {
  const blank = () => ({ label: '', url: '', isVisible: true });
  const [links, setLinks] = useState<MinistryLink[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<MinistryLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    const { links: loadedLinks, error } = await getAdminMinistryLinks();
    if (error) Alert.alert('Unable to load ministry links', 'Please refresh and try again.'); else setLinks(loadedLinks);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const reset = () => { setEditing(null); setForm(blank()); };
  const edit = (link: MinistryLink) => {
    setEditing(link);
    setForm({ label: link.label, url: link.url, isVisible: link.is_visible });
  };
  const save = async () => {
    if (!form.label.trim() || form.label.trim().length > 80 || !form.url.trim() || !isHttpsUrl(form.url)) {
      Alert.alert('Check link details', 'Use a channel name of 80 characters or fewer and a valid HTTPS link.'); return;
    }
    setSaving(true);
    const { link, error } = await saveMinistryLink({ label: form.label, url: form.url, isVisible: form.isVisible }, administratorId, editing?.id);
    setSaving(false);
    if (error || !link) {
      Alert.alert('Unable to save ministry link', 'Channel names must be unique. Please check the details and try again.'); return;
    }
    setLinks((current) => [...current.filter((item) => item.id !== link.id), link].sort((first, second) => first.created_at.localeCompare(second.created_at) || first.id.localeCompare(second.id)));
    reset();
  };
  const remove = (link: MinistryLink) => Alert.alert('Delete ministry link?', 'Members will no longer see this channel link.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { const { error } = await deleteMinistryLink(link.id); if (error) Alert.alert('Unable to delete ministry link', 'Please try again.'); else { setLinks((current) => current.filter((item) => item.id !== link.id)); if (editing?.id === link.id) reset(); } } }]);
  return <View>
    <Text style={styles.panelHint}>Visible links appear in More under Connect with us. Lower display-order numbers appear first.</Text>
    <EditorCard title={editing ? 'Edit ministry link' : 'New ministry link'} styles={styles}>
      <Field label="Channel name" value={form.label} onChangeText={(label) => setForm({ ...form, label })} placeholder="WhatsApp Channel" styles={styles} />
      <Field label="HTTPS link" value={form.url} onChangeText={(url) => setForm({ ...form, url })} keyboardType="url" placeholder="https://" styles={styles} />
      <View style={styles.switchRow}><Text style={styles.switchLabel}>Visible to members</Text><Switch value={form.isVisible} onValueChange={(isVisible) => setForm({ ...form, isVisible })} /></View>
      <ContentActions saving={saving} editing={Boolean(editing)} onSave={() => void save()} onCancel={reset} styles={styles} />
    </EditorCard>
    <Text style={styles.listTitle}>Ministry links</Text>
    {loading ? <ActivityIndicator color={styles.primaryColor} size="large" style={styles.loading} /> : links.length ? links.map((link) => <ContentListCard key={link.id} title={link.label} subtitle={`${link.is_visible ? 'Visible' : 'Hidden'}`} onEdit={() => edit(link)} onDelete={() => remove(link)} styles={styles} />) : <EmptyState icon="link-outline" message="No ministry links yet." styles={styles} />}
  </View>;
}

function StreamsManager({ administratorId, styles }: { administratorId: string; styles: any }) {
  const blank = () => ({ platform: '', url: '', isLive: false });
  const list = useContentList(getAdminLiveStreams);
  const { items: streams, loading } = list;
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<LiveStream | null>(null);
  const [saving, setSaving] = useState(false);

  const reset = () => { setEditing(null); setForm(blank()); };
  const edit = (stream: LiveStream) => { setEditing(stream); setForm({ platform: stream.platform, url: stream.stream_url, isLive: stream.is_live }); };
  const save = async () => {
    if (!form.platform.trim() || !isHttpsUrl(form.url) || !form.url.trim()) { Alert.alert('Check stream details', 'Platform and a valid HTTPS link are required.'); return; }
    setSaving(true);
    const { stream, error } = await saveLiveStream({ platform: form.platform, streamUrl: form.url, isLive: form.isLive }, administratorId, editing?.id);
    setSaving(false);
    if (error || !stream) { Alert.alert('Unable to save stream', 'Please check your connection and try again.'); return; }
    list.reload();
    reset();
  };
  const remove = (stream: LiveStream) => Alert.alert('Delete stream?', 'This cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { const { error } = await deleteLiveStream(stream.id); if (error) Alert.alert('Unable to delete stream', 'Please try again.'); else { list.reload(); if (editing?.id === stream.id) reset(); } } }]);
  return <View>
    <EditorCard title={editing ? 'Edit stream' : 'New stream'} styles={styles}>
      <Field label="Platform" value={form.platform} onChangeText={(platform) => setForm({ ...form, platform })} placeholder="TikTok or Spotify" styles={styles} />
      <Field label="HTTPS link" value={form.url} onChangeText={(url) => setForm({ ...form, url })} keyboardType="url" placeholder="https://" styles={styles} />
      <View style={styles.switchRow}><Text style={styles.switchLabel}>Currently live</Text><Switch value={form.isLive} onValueChange={(isLive) => setForm({ ...form, isLive })} /></View>
      <ContentActions saving={saving} editing={Boolean(editing)} onSave={() => void save()} onCancel={reset} styles={styles} />
    </EditorCard>
    <Text style={styles.listTitle}>Configured streams</Text>
    {list.searchControl('Search streams')}
    {loading ? <ActivityIndicator color={styles.primaryColor} size="large" style={styles.loading} /> : streams.length ? streams.map((stream) => <ContentListCard key={stream.id} title={stream.platform} subtitle={stream.is_live ? 'Live now' : 'Not live'} onEdit={() => edit(stream)} onDelete={() => remove(stream)} styles={styles} />) : <EmptyState icon="videocam-outline" message="No livestream links configured." styles={styles} />}
    {list.pageControl(styles)}
  </View>;
}

function EditorCard({ title, children, styles }: { title: string; children: React.ReactNode; styles: any }) {
  const [expanded, setExpanded] = useState(false);
  const creating = title.startsWith('New ');
  return <View style={styles.editorCard}>
    {creating ? <TouchableOpacity accessibilityRole="button" accessibilityState={{ expanded }}
      onPress={() => setExpanded(open => !open)}>
      <Text style={styles.editorTitle}>{expanded ? '−' : '+'} {title}</Text>
    </TouchableOpacity> : <Text style={styles.editorTitle}>{title}</Text>}
    {(!creating || expanded) && children}
  </View>;
}

function ContentListCard({ title, subtitle, onEdit, onDelete, styles }: { title: string; subtitle: string; onEdit: () => void; onDelete?: () => void; styles: any }) {
  return <View style={styles.itemCard}>
    <Text style={styles.itemTitle}>{title}</Text><Text style={styles.itemMeta}>{subtitle}</Text>
    <View style={styles.cardActions}><TouchableOpacity onPress={onEdit}><Text style={styles.editText}>Edit</Text></TouchableOpacity>{onDelete ? <TouchableOpacity onPress={onDelete}><Text style={styles.deleteText}>Delete</Text></TouchableOpacity> : null}</View>
  </View>;
}

function EmptyState({ icon, message, styles }: { icon: keyof typeof Ionicons.glyphMap; message: string; styles: any }) {
  return <View style={styles.emptyCard}><Ionicons color={styles.textMutedColor} name={icon} size={38} /><Text style={styles.emptyText}>{message}</Text></View>;
}

export default function AdminScreen({ registerMemberBack }: { registerMemberBack: (action: (() => void) | null) => void }) {
  const [showIntroduction, setShowIntroduction] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setShowIntroduction(false), 10000);
    return () => clearTimeout(timer);
  }, []);

  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const { colors, fonts } = useAccessibility();
  const styles = makeStyles(colors, fonts);
  const [section, setSection] = useState<AdminSection>('prayer');
  const [administratorId, setAdministratorId] = useState<string | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [prayerAccess, setPrayerAccess] = useState({ may_read: false, may_delegate: false });
  const [viewMembers, setViewMembers] = useState(false);
  const [manageMembers, setManageMembers] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const checkAccess = useCallback(async () => {
    setCheckingAccess(true);
    const [roleResult, userResult, accessResult, membersResult, directoryResult] = await Promise.all([
      getCurrentUserRole(),
      supabase.auth.getUser(),
      supabase.rpc('prayer_care_capabilities').single(),
      supabase.rpc('can_manage_members'),
      supabase.rpc('can_view_member_directory'),
    ]);
    const permissions = accessResult.data as typeof prayerAccess | null;
    const access = permissions ?? { may_read: false, may_delegate: false };
    setPrayerAccess(access);
    const mayView = directoryResult.data === true;
    setViewMembers(mayView);
    setManageMembers(membersResult.data === true);
    setSection(current => (current === 'prayer' && !access.may_read) || (current === 'members' && !mayView) ? 'announcements' : current);
    setAllowed(isAdminRole(roleResult.role));
    setAdministratorId(userResult.data.user?.id || null);
    setCheckingAccess(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { void checkAccess(); }, [checkAccess]);
  const onRefresh = () => { setRefreshing(true); void checkAccess(); };

  if (checkingAccess) return <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  if (!allowed || !administratorId) return <View style={styles.center}><Ionicons color={colors.textMuted} name="lock-closed-outline" size={42} /><Text style={styles.deniedTitle}>Admin access required</Text><Text style={styles.deniedText}>This area is available only to approved pastors and administrators.</Text></View>;

  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
    <ScrollView
      ref={scroll}
      contentContainerStyle={styles.content}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      style={styles.container}
    >
      {showIntroduction && <View style={styles.hero}><Ionicons color="#FFF" name="shield-checkmark" size={31} /><Text style={styles.heroTitle}>Administration</Text><Text style={styles.heroText}>Manage ministry content and prayer-request handling.</Text></View>}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sectionTabs} contentContainerStyle={styles.sectionTabsContent}>
        {SECTIONS.filter(item => (item.key !== 'prayer' || prayerAccess.may_read) && (item.key !== 'members' || viewMembers)).map((item) => <TouchableOpacity key={item.key} onPress={() => setSection(item.key)} style={[styles.sectionTab, section === item.key && styles.sectionTabActive]}><Ionicons color={section === item.key ? '#FFF' : colors.primary} name={item.icon} size={17} /><Text style={[styles.sectionTabText, section === item.key && styles.sectionTabTextActive]}>{item.label}</Text></TouchableOpacity>)}
      </ScrollView>
      {section === 'prayer' && prayerAccess.may_read ? <PrayerInbox styles={styles} /> : null}
      {section === 'announcements' ? <AnnouncementsManager administratorId={administratorId} styles={styles} /> : null}
      {section === 'studies' ? <StudiesManager administratorId={administratorId} styles={styles} /> : null}
      {section === 'plans' ? <PlansManager administratorId={administratorId} styles={styles} /> : null}
      {section === 'readings' ? <ReadingsManager administratorId={administratorId} styles={styles} scrollTo={y => scroll.current?.scrollTo({ y, animated: true })} /> : null}
      {section === 'streams' ? <StreamsManager administratorId={administratorId} styles={styles} /> : null}
      {section === 'members' && viewMembers ? <MembersManager canEdit={manageMembers} registerMemberBack={registerMemberBack} styles={styles} ownerId={administratorId} onSelfChange={checkAccess} /> : null}
      {section === 'links' ? <LinksManager administratorId={administratorId} styles={styles} /> : null}
    </ScrollView>
  </KeyboardAvoidingView>;
}

function makeStyles(colors: any, fonts: any) {
  const styles = StyleSheet.create({
    container: { backgroundColor: colors.background, flex: 1 }, content: { padding: spacing.lg, paddingBottom: spacing.xl }, center: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: spacing.lg },
    hero: { backgroundColor: colors.primary, borderRadius: 22, marginBottom: spacing.lg, padding: spacing.lg }, heroTitle: { color: '#FFF', fontSize: fonts.display, fontWeight: '700', marginTop: spacing.sm }, heroText: { color: '#DDF4E6', fontSize: fonts.body, lineHeight: fonts.body * 1.5, marginTop: spacing.xs },
    sectionTabs: { marginBottom: spacing.lg }, sectionTabsContent: { paddingRight: spacing.lg }, sectionTab: { alignItems: 'center', borderColor: colors.primary, borderRadius: 14, borderWidth: 1, flexDirection: 'row', marginRight: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: 10 }, sectionTabActive: { backgroundColor: colors.primary }, sectionTabText: { color: colors.primary, fontSize: fonts.caption, fontWeight: '700', marginLeft: 4 }, sectionTabTextActive: { color: '#FFF' },
    panelHint: { color: colors.textMuted, fontSize: fonts.caption, lineHeight: fonts.caption * 1.5, marginBottom: spacing.sm }, editorCard: { backgroundColor: colors.surface, borderRadius: 20, padding: spacing.lg }, editorTitle: { color: colors.primary, fontSize: fonts.subtitle, fontWeight: '700', marginBottom: spacing.sm },
    fieldWrap: { marginTop: spacing.sm }, fieldLabel: { color: colors.text, fontSize: fonts.caption, fontWeight: '700', marginBottom: 4 }, field: { borderColor: colors.borderSoft, borderRadius: 12, borderWidth: 1, color: colors.text, fontSize: fonts.body, minHeight: 45, paddingHorizontal: spacing.sm }, textArea: { minHeight: 100, paddingTop: spacing.sm }, richTextHint: { color: colors.textMuted, fontSize: fonts.caption, lineHeight: fonts.caption * 1.4, marginBottom: spacing.xs }, richEditorFrame: { borderColor: colors.borderSoft, borderRadius: 12, borderWidth: 1, overflow: 'hidden' }, richEditor: { backgroundColor: colors.surface, flex: 0 }, pickerFieldRow: { alignItems: 'center', flexDirection: 'row' }, pickerField: { alignItems: 'center', borderColor: colors.borderSoft, borderRadius: 12, borderWidth: 1, flex: 1, flexDirection: 'row', minHeight: 45, paddingHorizontal: spacing.sm }, pickerFieldText: { color: colors.text, fontSize: fonts.body, marginLeft: spacing.xs }, pickerFieldPlaceholder: { color: colors.textMuted }, clearPickerButton: { marginLeft: spacing.xs, padding: spacing.xs },
    statusPicker: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm }, statusOption: { borderColor: colors.borderSoft, borderRadius: 10, borderWidth: 1, marginRight: 6, marginTop: 4, paddingHorizontal: 9, paddingVertical: 7 }, statusOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary }, statusOptionText: { color: colors.primary, fontSize: fonts.caption, fontWeight: '700' }, statusOptionTextActive: { color: '#FFF' },
    primaryButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', marginTop: spacing.md, paddingVertical: 14 }, primaryButtonText: { color: '#FFF', fontSize: fonts.body, fontWeight: '700', marginLeft: spacing.xs }, disabledButton: { opacity: 0.65 }, cancelButton: { alignItems: 'center', marginTop: spacing.sm, paddingVertical: spacing.xs }, cancelButtonText: { color: colors.primary, fontSize: fonts.body, fontWeight: '700' },
    listTitle: { color: colors.text, fontSize: fonts.subtitle, fontWeight: '700', marginBottom: spacing.sm, marginTop: spacing.xl }, loading: { marginTop: spacing.lg }, itemCard: { backgroundColor: colors.surface, borderRadius: 18, marginBottom: spacing.sm, padding: spacing.md }, itemTitle: { color: colors.text, fontSize: fonts.body, fontWeight: '700' }, itemMeta: { color: colors.textMuted, fontSize: fonts.caption, marginTop: 3 }, itemDescription: { color: colors.text, fontSize: fonts.body, lineHeight: fonts.body * 1.5, marginTop: spacing.xs }, cardActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.sm }, editText: { color: colors.primary, fontSize: fonts.body, fontWeight: '700', marginRight: spacing.md }, deleteText: { color: colors.danger, fontSize: fonts.body, fontWeight: '700' },
    switchRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm }, switchLabel: { color: colors.text, flex: 1, fontSize: fonts.caption, fontWeight: '600', paddingRight: spacing.sm }, outlineButton: { alignItems: 'center', borderColor: colors.primary, borderRadius: 12, borderWidth: 1, marginTop: spacing.sm, paddingVertical: 10 }, outlineButtonText: { color: colors.primary, fontSize: fonts.body, fontWeight: '700' }, adminDeleteButton: { alignItems: 'center', marginTop: spacing.sm, paddingVertical: spacing.xs }, adminDeleteButtonText: { color: colors.danger, fontSize: fonts.caption, fontWeight: '700' },
    emptyCard: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 18, padding: spacing.xl }, emptyText: { color: colors.textMuted, fontSize: fonts.body, lineHeight: fonts.body * 1.5, marginTop: spacing.sm, textAlign: 'center' }, deniedTitle: { color: colors.text, fontSize: fonts.subtitle, fontWeight: '700', marginTop: spacing.sm }, deniedText: { color: colors.textMuted, fontSize: fonts.body, lineHeight: fonts.body * 1.5, marginTop: spacing.xs, textAlign: 'center' },
    planButton: { borderColor: colors.borderSoft, borderRadius: 12, borderWidth: 1, marginTop: spacing.sm, padding: spacing.sm }, planButtonLabel: { color: colors.textMuted, fontSize: fonts.caption }, planButtonValue: { color: colors.text, fontSize: fonts.body, fontWeight: '700', marginTop: 3 }, planButtonHint: { color: colors.primary, fontSize: fonts.caption, fontWeight: '700', marginTop: 3 }, warningText: { color: colors.danger, fontSize: fonts.caption, lineHeight: fonts.caption * 1.5, marginTop: spacing.sm },
    studyImagesEditor: { borderTopColor: colors.borderSoft, borderTopWidth: 1, marginTop: spacing.lg, paddingTop: spacing.md }, helperText: { color: colors.textMuted, fontSize: fonts.caption, lineHeight: fonts.caption * 1.5 }, studyImageList: { gap: spacing.sm, paddingVertical: spacing.sm }, studyImageItem: { height: 96, position: 'relative', width: 96 }, studyImagePreview: { borderRadius: 10, height: 96, width: 96 }, removeStudyImageButton: { alignItems: 'center', backgroundColor: colors.danger, borderRadius: 14, height: 28, justifyContent: 'center', position: 'absolute', right: -6, top: -6, width: 28 }, addStudyImageButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', marginTop: spacing.sm, minHeight: 46, paddingHorizontal: spacing.md }, addStudyImageButtonText: { color: '#FFF', fontSize: fonts.body, fontWeight: '700', marginLeft: spacing.xs },
  });
  return { ...styles, borderSoftColor: colors.borderSoft, placeholderColor: colors.textMuted, primaryColor: colors.primary, surfaceColor: colors.surface, textColor: colors.text, textMutedColor: colors.textMuted };
}
