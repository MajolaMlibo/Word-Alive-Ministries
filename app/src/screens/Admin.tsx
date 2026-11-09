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
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Announcement,
  BibleStudy,
  ContentStatus,
  DailyReading,
  LiveStream,
  PrayerRequest,
  PrayerRequestStatus,
  ReadingPlan,
} from '../services/database';
import {
  deleteAnnouncement,
  deleteBibleStudy,
  deleteDailyReading,
  deleteLiveStream,
  deletePrayerRequest,
  getAdminAnnouncements,
  getAdminBibleStudies,
  getAdminDailyReadings,
  getAdminLiveStreams,
  getAdminPrayerRequests,
  getAdminReadingPlans,
  moderatePrayerRequest,
  saveAnnouncement,
  saveBibleStudy,
  saveDailyReading,
  saveLiveStream,
  saveReadingPlan,
} from '../services/adminService';
import { getCurrentUserRole, isAdminRole } from '../services/roleService';
import {
  getHomeEncouragement,
  saveHomeEncouragement,
} from '../services/homeContentService';
import { supabase } from '../services/supabase';
import { useAccessibility } from '../theme/AccessibilityContext';
import { spacing } from '../theme/theme';

type AdminSection = 'home' | 'prayer' | 'announcements' | 'studies' | 'plans' | 'readings' | 'streams';

const CONTENT_STATUSES: ContentStatus[] = ['draft', 'published', 'archived'];
const PRAYER_STATUSES: PrayerRequestStatus[] = [
  'pending',
  'reviewed',
  'approved',
  'closed',
];

const SECTIONS: { key: AdminSection; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'home', label: 'Home', icon: 'home-outline' },
  { key: 'prayer', label: 'Prayer', icon: 'heart-outline' },
  { key: 'announcements', label: 'Notices', icon: 'megaphone-outline' },
  { key: 'studies', label: 'Studies', icon: 'school-outline' },
  { key: 'plans', label: 'Plans', icon: 'list-outline' },
  { key: 'readings', label: 'Readings', icon: 'book-outline' },
  { key: 'streams', label: 'Streams', icon: 'videocam-outline' },
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
  styles,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'numeric' | 'url';
  styles: any;
}) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType={keyboardType}
        multiline={multiline}
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
  styles,
}: {
  label: string;
  value: string;
  mode: 'date' | 'time';
  onChange: (value: string) => void;
  optional?: boolean;
  styles: any;
}) {
  const [showPicker, setShowPicker] = useState(false);
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
          value={mode === 'date' ? dateFromInputValue(value) : timeFromInputValue(value)}
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

function HomeManager({ styles }: { styles: any }) {
  const [message, setMessage] = useState('');
  const [scriptureRef, setScriptureRef] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { encouragement, error } = await getHomeEncouragement();
    if (error || !encouragement) {
      Alert.alert('Unable to load Home encouragement', 'Please refresh and try again.');
    } else {
      setMessage(encouragement.message);
      setScriptureRef(encouragement.scripture_ref);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!message.trim() || !scriptureRef.trim()) {
      Alert.alert('Message and reference required', 'Add both fields before saving.');
      return;
    }
    if (message.trim().length > 1000 || scriptureRef.trim().length > 160) {
      Alert.alert('Home message is too long', 'Use 1,000 characters or fewer for the message and 160 or fewer for the reference.');
      return;
    }
    setSaving(true);
    const { encouragement, error } = await saveHomeEncouragement(message, scriptureRef);
    setSaving(false);
    if (error || !encouragement) {
      Alert.alert('Unable to save Home encouragement', 'Please check your connection and try again.');
      return;
    }
    setMessage(encouragement.message);
    setScriptureRef(encouragement.scripture_ref);
    Alert.alert('Home encouragement updated', 'Members will see this message after refreshing Home.');
  };

  if (loading) return <ActivityIndicator color={styles.primaryColor} size="large" style={styles.loading} />;

  return <EditorCard title="Stay Encouraged card" styles={styles}>
    <Text style={styles.panelHint}>This message is shown on the Home screen for every signed-in member.</Text>
    <Field label="Encouragement message" value={message} onChangeText={setMessage} multiline styles={styles} />
    <Field label="Scripture reference" value={scriptureRef} onChangeText={setScriptureRef} placeholder="Psalm 119:105" styles={styles} />
    <TouchableOpacity disabled={saving} onPress={() => void save()} style={[styles.primaryButton, saving && styles.disabledButton]}>
      {saving ? <ActivityIndicator color="#FFF" /> : null}
      <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save changes'}</Text>
    </TouchableOpacity>
    <TouchableOpacity onPress={() => void load()} style={styles.cancelButton}>
      <Text style={styles.cancelButtonText}>Reset to saved message</Text>
    </TouchableOpacity>
  </EditorCard>;
}

function PrayerManager({ administratorId, styles }: { administratorId: string; styles: any }) {
  const [requests, setRequests] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { requests: loadedRequests, error } = await getAdminPrayerRequests();
    if (error) {
      console.warn('Unable to load requests for administration.', error.message);
      Alert.alert('Unable to load prayer requests', 'Please refresh and try again.');
    } else {
      setRequests(loadedRequests);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (request: PrayerRequest, status: PrayerRequestStatus, isPublic: boolean) => {
    setSavingId(request.id);
    const { request: savedRequest, error } = await moderatePrayerRequest(
      request.id,
      administratorId,
      status,
      isPublic
    );
    setSavingId(null);

    if (error || !savedRequest) {
      Alert.alert('Unable to update request', 'Please check your connection and try again.');
      return;
    }

    setRequests((current) =>
      current.map((item) => (item.id === savedRequest.id ? savedRequest : item))
    );
  };

  const remove = (request: PrayerRequest) => {
    Alert.alert('Delete prayer request?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await deletePrayerRequest(request.id);

          if (error) {
            Alert.alert('Unable to delete request', 'Please check your connection and try again.');
            return;
          }

          setRequests((current) => current.filter((item) => item.id !== request.id));
        },
      },
    ]);
  };

  if (loading) return <ActivityIndicator color={styles.primaryColor} size="large" style={styles.loading} />;

  return (
    <View>
      <Text style={styles.panelHint}>
        Review private requests carefully. Public sharing requires an Approved status.
      </Text>
      {requests.length ? requests.map((request) => (
        <PrayerAdminCard key={request.id} request={request} saving={savingId === request.id} onDelete={remove} onSave={save} styles={styles} />
      )) : <EmptyState icon="heart-outline" message="No prayer requests have been submitted." styles={styles} />}
    </View>
  );
}

function PrayerAdminCard({
  request,
  saving,
  onDelete,
  onSave,
  styles,
}: {
  request: PrayerRequest;
  saving: boolean;
  onDelete: (request: PrayerRequest) => void;
  onSave: (request: PrayerRequest, status: PrayerRequestStatus, isPublic: boolean) => Promise<void>;
  styles: any;
}) {
  const [status, setStatus] = useState<PrayerRequestStatus>(request.status);
  const [isPublic, setIsPublic] = useState(request.is_public);

  return (
    <View style={styles.itemCard}>
      <Text style={styles.itemMeta}>Submitted {formatDate(request.created_at)}</Text>
      <Text style={styles.itemDescription}>{request.description}</Text>
      <View style={styles.statusPicker}>
        {PRAYER_STATUSES.map((option) => (
          <TouchableOpacity
            key={option}
            onPress={() => setStatus(option)}
            style={[styles.statusOption, status === option && styles.statusOptionActive]}
          >
            <Text style={[styles.statusOptionText, status === option && styles.statusOptionTextActive]}>
              {titleCase(option)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Visible to members after approval</Text>
        <Switch value={isPublic} onValueChange={setIsPublic} />
      </View>
      <TouchableOpacity disabled={saving} onPress={() => void onSave(request, status, isPublic)} style={styles.outlineButton}>
        <Text style={styles.outlineButtonText}>{saving ? 'Saving...' : 'Save handling'}</Text>
      </TouchableOpacity>
      <TouchableOpacity disabled={saving} onPress={() => onDelete(request)} style={styles.adminDeleteButton}>
        <Text style={styles.adminDeleteButtonText}>Delete request</Text>
      </TouchableOpacity>
    </View>
  );
}

function AnnouncementsManager({ administratorId, styles }: { administratorId: string; styles: any }) {
  const blank = () => ({ title: '', message: '', status: 'draft' as ContentStatus, expiryDate: '', expiryTime: '', actionLabel: '', actionUrl: '' });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { announcements: loadedAnnouncements, error } = await getAdminAnnouncements();
    if (error) Alert.alert('Unable to load notices', 'Please refresh and try again.');
    else setAnnouncements(loadedAnnouncements);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const reset = () => { setEditing(null); setForm(blank()); };
  const edit = (announcement: Announcement) => {
    setEditing(announcement);
    const expiry = splitDateTime(announcement.expires_at);
    setForm({
      title: announcement.title,
      message: announcement.message,
      status: announcement.status,
      expiryDate: expiry.date,
      expiryTime: expiry.time,
      actionLabel: announcement.action_label || '',
      actionUrl: announcement.action_url || '',
    });
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
    setAnnouncements((current) => [announcement, ...current.filter((item) => item.id !== announcement.id)]);
    reset();
  };

  const remove = (announcement: Announcement) => Alert.alert('Delete notice?', 'This cannot be undone.', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: async () => {
      const { error } = await deleteAnnouncement(announcement.id);
      if (error) Alert.alert('Unable to delete notice', 'Please try again.');
      else { setAnnouncements((current) => current.filter((item) => item.id !== announcement.id)); if (editing?.id === announcement.id) reset(); }
    } },
  ]);

  return (
    <View>
      <EditorCard title={editing ? 'Edit notice' : 'New notice'} styles={styles}>
        <Field label="Title" value={form.title} onChangeText={(title) => setForm({ ...form, title })} styles={styles} />
        <Field label="Message" value={form.message} onChangeText={(message) => setForm({ ...form, message })} multiline styles={styles} />
        <Text style={styles.fieldLabel}>Status</Text>
        <ContentStatusPicker value={form.status} onChange={(status) => setForm({ ...form, status })} styles={styles} />
        <DateTimeField label="Expiry date (optional)" value={form.expiryDate} onChange={(expiryDate) => setForm({ ...form, expiryDate })} mode="date" optional styles={styles} />
        <DateTimeField label="Expiry time (optional)" value={form.expiryTime} onChange={(expiryTime) => setForm({ ...form, expiryTime })} mode="time" optional styles={styles} />
        <Field label="Action button label (optional)" value={form.actionLabel} onChangeText={(actionLabel) => setForm({ ...form, actionLabel })} styles={styles} />
        <Field label="Action HTTPS link (optional)" value={form.actionUrl} onChangeText={(actionUrl) => setForm({ ...form, actionUrl })} keyboardType="url" styles={styles} />
        <ContentActions saving={saving} editing={Boolean(editing)} onSave={() => void save()} onCancel={reset} styles={styles} />
      </EditorCard>
      <Text style={styles.listTitle}>Existing notices</Text>
      {loading ? <ActivityIndicator color={styles.primaryColor} size="large" style={styles.loading} /> : announcements.length ? announcements.map((announcement) => (
        <ContentListCard key={announcement.id} title={announcement.title} subtitle={`${titleCase(announcement.status)} • ${announcement.published_at ? formatDate(announcement.published_at) : 'Not scheduled'}`} onEdit={() => edit(announcement)} onDelete={() => remove(announcement)} styles={styles} />
      )) : <EmptyState icon="megaphone-outline" message="No notices yet." styles={styles} />}
    </View>
  );
}

function StudiesManager({ administratorId, styles }: { administratorId: string; styles: any }) {
  const blank = () => ({ name: '', scripture: '', date: '', start: '', end: '', description: '', location: '', status: 'draft' as ContentStatus });
  const [studies, setStudies] = useState<BibleStudy[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<BibleStudy | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    const { studies: loadedStudies, error } = await getAdminBibleStudies();
    if (error) Alert.alert('Unable to load studies', 'Please refresh and try again.'); else setStudies(loadedStudies);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const reset = () => { setEditing(null); setForm(blank()); };
  const edit = (study: BibleStudy) => {
    setEditing(study);
    setForm({ name: study.study_name, scripture: study.scripture_ref || '', date: study.study_date, start: study.start_time?.slice(0, 5) || '', end: study.end_time?.slice(0, 5) || '', description: study.description || '', location: study.location_or_url || '', status: study.status });
  };
  const save = async () => {
    if (!form.name.trim() || !form.date) {
      Alert.alert('Check study details', 'A study name and date are required.'); return;
    }
    setSaving(true);
    const { study, error } = await saveBibleStudy({ studyName: form.name, scriptureRef: toOptional(form.scripture), studyDate: form.date, startTime: toOptional(form.start), endTime: toOptional(form.end), description: toOptional(form.description), locationOrUrl: toOptional(form.location), status: form.status }, administratorId, editing?.id);
    setSaving(false);
    if (error || !study) { Alert.alert('Unable to save study', 'Please check your connection and try again.'); return; }
    setStudies((current) => [...current.filter((item) => item.id !== study.id), study].sort((a, b) => a.study_date.localeCompare(b.study_date)));
    reset();
  };
  const remove = (study: BibleStudy) => Alert.alert('Delete Bible study?', 'This cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { const { error } = await deleteBibleStudy(study.id); if (error) Alert.alert('Unable to delete study', 'Please try again.'); else { setStudies((current) => current.filter((item) => item.id !== study.id)); if (editing?.id === study.id) reset(); } } }]);
  return <View>
    <EditorCard title={editing ? 'Edit Bible study' : 'New Bible study'} styles={styles}>
      <Field label="Study name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} styles={styles} />
      <Field label="Scripture reference (optional)" value={form.scripture} onChangeText={(scripture) => setForm({ ...form, scripture })} styles={styles} />
      <DateTimeField label="Study date" value={form.date} onChange={(date) => setForm({ ...form, date })} mode="date" styles={styles} />
      <DateTimeField label="Start time (optional)" value={form.start} onChange={(start) => setForm({ ...form, start })} mode="time" optional styles={styles} />
      <DateTimeField label="End time (optional)" value={form.end} onChange={(end) => setForm({ ...form, end })} mode="time" optional styles={styles} />
      <Field label="Location or HTTPS link (optional)" value={form.location} onChangeText={(location) => setForm({ ...form, location })} styles={styles} />
      <Field label="Description (optional)" value={form.description} onChangeText={(description) => setForm({ ...form, description })} multiline styles={styles} />
      <Text style={styles.fieldLabel}>Status</Text><ContentStatusPicker value={form.status} onChange={(status) => setForm({ ...form, status })} styles={styles} />
      <ContentActions saving={saving} editing={Boolean(editing)} onSave={() => void save()} onCancel={reset} styles={styles} />
    </EditorCard>
    <Text style={styles.listTitle}>Scheduled studies</Text>
    {loading ? <ActivityIndicator color={styles.primaryColor} size="large" style={styles.loading} /> : studies.length ? studies.map((study) => <ContentListCard key={study.id} title={study.study_name} subtitle={`${study.study_date} • ${titleCase(study.status)}`} onEdit={() => edit(study)} onDelete={() => remove(study)} styles={styles} />) : <EmptyState icon="school-outline" message="No Bible studies yet." styles={styles} />}
  </View>;
}

function PlansManager({ administratorId, styles }: { administratorId: string; styles: any }) {
  const blank = () => ({ name: '', year: '', description: '', status: 'draft' as ContentStatus });
  const [plans, setPlans] = useState<ReadingPlan[]>([]);
  const [form, setForm] = useState(blank);
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
  const reset = () => { setEditing(null); setForm(blank()); };
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
      <Field label="Plan name" value={form.name} onChangeText={(name) => setForm({ ...form, name })} styles={styles} />
      <Field label="Plan year" value={form.year} onChangeText={(year) => setForm({ ...form, year })} keyboardType="numeric" placeholder="2027" styles={styles} />
      <Field label="Description (optional)" value={form.description} onChangeText={(description) => setForm({ ...form, description })} multiline styles={styles} />
      <Text style={styles.fieldLabel}>Status</Text><ContentStatusPicker value={form.status} onChange={(status) => setForm({ ...form, status })} styles={styles} />
      <ContentActions saving={saving} editing={Boolean(editing)} onSave={() => void save()} onCancel={reset} styles={styles} />
    </EditorCard>
    <Text style={styles.listTitle}>Reading plans</Text>
    {loading ? <ActivityIndicator color={styles.primaryColor} size="large" style={styles.loading} /> : plans.length ? plans.map((plan) => <ContentListCard key={plan.id} title={`${plan.name} (${plan.plan_year})`} subtitle={titleCase(plan.status)} onEdit={() => edit(plan)} onDelete={undefined} styles={styles} />) : <EmptyState icon="list-outline" message="No reading plans found." styles={styles} />}
  </View>;
}

function ReadingsManager({ administratorId, styles }: { administratorId: string; styles: any }) {
  const blank = (planId = '') => ({ planId, dayNumber: '', date: '', scripture: '', reflection: '', audioUrl: '', status: 'draft' as ContentStatus });
  const [plans, setPlans] = useState<ReadingPlan[]>([]);
  const [readings, setReadings] = useState<DailyReading[]>([]);
  const [form, setForm] = useState(blank());
  const [editing, setEditing] = useState<DailyReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    const [plansResult, readingsResult] = await Promise.all([
      getAdminReadingPlans(),
      getAdminDailyReadings(),
    ]);
    if (plansResult.error || readingsResult.error) {
      Alert.alert('Unable to load readings', 'Please refresh and try again.');
    } else {
      setPlans(plansResult.plans);
      setReadings(readingsResult.readings);
      setForm((current) => current.planId ? current : blank(plansResult.plans[0]?.id || ''));
    }
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const reset = () => { setEditing(null); setForm(blank(plans[0]?.id || '')); };
  const edit = (reading: DailyReading) => {
    setEditing(reading);
    setForm({ planId: reading.plan_id, dayNumber: String(reading.day_number), date: reading.scheduled_date, scripture: reading.scripture_ref, reflection: reading.reflection || '', audioUrl: reading.audio_url || '', status: reading.status });
  };
  const cyclePlan = () => {
    if (plans.length < 2) return;
    const index = plans.findIndex((plan) => plan.id === form.planId);
    const nextPlan = plans[(index + 1) % plans.length];
    setForm({ ...form, planId: nextPlan.id });
  };
  const save = async () => {
    const dayNumber = Number(form.dayNumber);
    if (!form.planId || !Number.isInteger(dayNumber) || dayNumber < 1 || dayNumber > 366 || !form.date || !form.scripture.trim()) {
      Alert.alert('Check reading details', 'Plan, day number (1–366), date, and Scripture reference are required.'); return;
    }
    if (form.audioUrl && !isHttpsUrl(form.audioUrl)) { Alert.alert('Check audio link', 'Audio links must begin with https://.'); return; }
    setSaving(true);
    const { reading, error } = await saveDailyReading({ planId: form.planId, dayNumber, scheduledDate: form.date, scriptureRef: form.scripture, reflection: toOptional(form.reflection), audioUrl: toOptional(form.audioUrl), status: form.status, publishedAt: editing?.published_at || null }, administratorId, editing?.id);
    setSaving(false);
    if (error || !reading) { Alert.alert('Unable to save reading', 'Please check for duplicate day numbers or dates in this plan.'); return; }
    setReadings((current) => [...current.filter((item) => item.id !== reading.id), reading].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date)));
    reset();
  };
  const remove = (reading: DailyReading) => Alert.alert('Delete daily reading?', 'This removes the scheduled reading and cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { const { error } = await deleteDailyReading(reading.id); if (error) Alert.alert('Unable to delete reading', 'Please try again.'); else { setReadings((current) => current.filter((item) => item.id !== reading.id)); if (editing?.id === reading.id) reset(); } } }]);
  const selectedPlan = plans.find((plan) => plan.id === form.planId);
  return <View>
    <EditorCard title={editing ? 'Edit daily reading' : 'New daily reading'} styles={styles}>
      {plans.length ? <TouchableOpacity onPress={cyclePlan} style={styles.planButton}>
        <Text style={styles.planButtonLabel}>Reading plan</Text>
        <Text style={styles.planButtonValue}>{selectedPlan ? `${selectedPlan.name} (${selectedPlan.plan_year})` : 'Choose a plan'}</Text>
        {plans.length > 1 ? <Text style={styles.planButtonHint}>Tap to change</Text> : null}
      </TouchableOpacity> : <Text style={styles.warningText}>No reading plan exists. Create a plan in Supabase before adding a reading.</Text>}
      <Field label="Day number (1–366)" value={form.dayNumber} onChangeText={(dayNumber) => setForm({ ...form, dayNumber })} keyboardType="numeric" styles={styles} />
      <DateTimeField label="Scheduled date" value={form.date} onChange={(date) => setForm({ ...form, date })} mode="date" styles={styles} />
      <Field label="Scripture reference" value={form.scripture} onChangeText={(scripture) => setForm({ ...form, scripture })} placeholder="Psalms 107-111" styles={styles} />
      <Field label="Reflection (optional)" value={form.reflection} onChangeText={(reflection) => setForm({ ...form, reflection })} multiline styles={styles} />
      <Field label="Audio HTTPS link (optional)" value={form.audioUrl} onChangeText={(audioUrl) => setForm({ ...form, audioUrl })} keyboardType="url" styles={styles} />
      <Text style={styles.fieldLabel}>Status</Text><ContentStatusPicker value={form.status} onChange={(status) => setForm({ ...form, status })} styles={styles} />
      <ContentActions saving={saving} editing={Boolean(editing)} onSave={() => void save()} onCancel={reset} styles={styles} />
    </EditorCard>
    <Text style={styles.listTitle}>Scheduled readings</Text>
    {loading ? <ActivityIndicator color={styles.primaryColor} size="large" style={styles.loading} /> : readings.length ? readings.map((reading) => <ContentListCard key={reading.id} title={reading.scripture_ref} subtitle={`${reading.scheduled_date} • Day ${reading.day_number} • ${titleCase(reading.status)}`} onEdit={() => edit(reading)} onDelete={() => remove(reading)} styles={styles} />) : <EmptyState icon="book-outline" message="No daily readings found." styles={styles} />}
  </View>;
}

function StreamsManager({ administratorId, styles }: { administratorId: string; styles: any }) {
  const blank = () => ({ platform: '', url: '', isLive: false });
  const [streams, setStreams] = useState<LiveStream[]>([]);
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState<LiveStream | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    const { streams: loadedStreams, error } = await getAdminLiveStreams();
    if (error) Alert.alert('Unable to load streams', 'Please refresh and try again.'); else setStreams(loadedStreams);
    setLoading(false);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const reset = () => { setEditing(null); setForm(blank()); };
  const edit = (stream: LiveStream) => { setEditing(stream); setForm({ platform: stream.platform, url: stream.stream_url, isLive: stream.is_live }); };
  const save = async () => {
    if (!form.platform.trim() || !isHttpsUrl(form.url) || !form.url.trim()) { Alert.alert('Check stream details', 'Platform and a valid HTTPS link are required.'); return; }
    setSaving(true);
    const { stream, error } = await saveLiveStream({ platform: form.platform, streamUrl: form.url, isLive: form.isLive }, administratorId, editing?.id);
    setSaving(false);
    if (error || !stream) { Alert.alert('Unable to save stream', 'Please check your connection and try again.'); return; }
    setStreams((current) => [stream, ...current.filter((item) => item.id !== stream.id)]);
    reset();
  };
  const remove = (stream: LiveStream) => Alert.alert('Delete stream?', 'This cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { const { error } = await deleteLiveStream(stream.id); if (error) Alert.alert('Unable to delete stream', 'Please try again.'); else { setStreams((current) => current.filter((item) => item.id !== stream.id)); if (editing?.id === stream.id) reset(); } } }]);
  return <View>
    <EditorCard title={editing ? 'Edit stream' : 'New stream'} styles={styles}>
      <Field label="Platform" value={form.platform} onChangeText={(platform) => setForm({ ...form, platform })} placeholder="TikTok or Spotify" styles={styles} />
      <Field label="HTTPS link" value={form.url} onChangeText={(url) => setForm({ ...form, url })} keyboardType="url" placeholder="https://" styles={styles} />
      <View style={styles.switchRow}><Text style={styles.switchLabel}>Currently live</Text><Switch value={form.isLive} onValueChange={(isLive) => setForm({ ...form, isLive })} /></View>
      <ContentActions saving={saving} editing={Boolean(editing)} onSave={() => void save()} onCancel={reset} styles={styles} />
    </EditorCard>
    <Text style={styles.listTitle}>Configured streams</Text>
    {loading ? <ActivityIndicator color={styles.primaryColor} size="large" style={styles.loading} /> : streams.length ? streams.map((stream) => <ContentListCard key={stream.id} title={stream.platform} subtitle={stream.is_live ? 'Live now' : 'Not live'} onEdit={() => edit(stream)} onDelete={() => remove(stream)} styles={styles} />) : <EmptyState icon="videocam-outline" message="No livestream links configured." styles={styles} />}
  </View>;
}

function EditorCard({ title, children, styles }: { title: string; children: React.ReactNode; styles: any }) {
  return <View style={styles.editorCard}><Text style={styles.editorTitle}>{title}</Text>{children}</View>;
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

export default function AdminScreen() {
  const { colors, fonts } = useAccessibility();
  const styles = makeStyles(colors, fonts);
  const [section, setSection] = useState<AdminSection>('prayer');
  const [administratorId, setAdministratorId] = useState<string | null>(null);
  const [checkingAccess, setCheckingAccess] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const checkAccess = useCallback(async () => {
    setCheckingAccess(true);
    const [roleResult, userResult] = await Promise.all([
      getCurrentUserRole(),
      supabase.auth.getUser(),
    ]);
    setAllowed(isAdminRole(roleResult.role));
    setAdministratorId(userResult.data.user?.id || null);
    setCheckingAccess(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { void checkAccess(); }, [checkAccess]);
  const onRefresh = () => { setRefreshing(true); void checkAccess(); };

  if (checkingAccess) return <View style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></View>;
  if (!allowed || !administratorId) return <View style={styles.center}><Ionicons color={colors.textMuted} name="lock-closed-outline" size={42} /><Text style={styles.deniedTitle}>Admin access required</Text><Text style={styles.deniedText}>This area is available only to approved pastors and administrators.</Text></View>;

  return <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
    <View style={styles.hero}><Ionicons color="#FFF" name="shield-checkmark" size={31} /><Text style={styles.heroTitle}>Administration</Text><Text style={styles.heroText}>Manage ministry content and prayer-request handling.</Text></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.sectionTabs} contentContainerStyle={styles.sectionTabsContent}>
      {SECTIONS.map((item) => <TouchableOpacity key={item.key} onPress={() => setSection(item.key)} style={[styles.sectionTab, section === item.key && styles.sectionTabActive]}><Ionicons color={section === item.key ? '#FFF' : colors.primary} name={item.icon} size={17} /><Text style={[styles.sectionTabText, section === item.key && styles.sectionTabTextActive]}>{item.label}</Text></TouchableOpacity>)}
    </ScrollView>
    {section === 'home' ? <HomeManager styles={styles} /> : null}
    {section === 'prayer' ? <PrayerManager administratorId={administratorId} styles={styles} /> : null}
    {section === 'announcements' ? <AnnouncementsManager administratorId={administratorId} styles={styles} /> : null}
    {section === 'studies' ? <StudiesManager administratorId={administratorId} styles={styles} /> : null}
    {section === 'plans' ? <PlansManager administratorId={administratorId} styles={styles} /> : null}
    {section === 'readings' ? <ReadingsManager administratorId={administratorId} styles={styles} /> : null}
    {section === 'streams' ? <StreamsManager administratorId={administratorId} styles={styles} /> : null}
  </ScrollView>;
}

function makeStyles(colors: any, fonts: any) {
  const styles = StyleSheet.create({
    container: { backgroundColor: colors.background, flex: 1 }, content: { padding: spacing.lg, paddingBottom: spacing.xl }, center: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: spacing.lg },
    hero: { backgroundColor: colors.primary, borderRadius: 22, marginBottom: spacing.lg, padding: spacing.lg }, heroTitle: { color: '#FFF', fontSize: fonts.display, fontWeight: '700', marginTop: spacing.sm }, heroText: { color: '#DDF4E6', fontSize: fonts.body, lineHeight: fonts.body * 1.5, marginTop: spacing.xs },
    sectionTabs: { marginBottom: spacing.lg }, sectionTabsContent: { paddingRight: spacing.lg }, sectionTab: { alignItems: 'center', borderColor: colors.primary, borderRadius: 14, borderWidth: 1, flexDirection: 'row', marginRight: spacing.xs, paddingHorizontal: spacing.sm, paddingVertical: 10 }, sectionTabActive: { backgroundColor: colors.primary }, sectionTabText: { color: colors.primary, fontSize: fonts.caption, fontWeight: '700', marginLeft: 4 }, sectionTabTextActive: { color: '#FFF' },
    panelHint: { color: colors.textMuted, fontSize: fonts.caption, lineHeight: fonts.caption * 1.5, marginBottom: spacing.sm }, editorCard: { backgroundColor: colors.surface, borderRadius: 20, padding: spacing.lg }, editorTitle: { color: colors.primary, fontSize: fonts.subtitle, fontWeight: '700', marginBottom: spacing.sm },
    fieldWrap: { marginTop: spacing.sm }, fieldLabel: { color: colors.text, fontSize: fonts.caption, fontWeight: '700', marginBottom: 4 }, field: { borderColor: colors.borderSoft, borderRadius: 12, borderWidth: 1, color: colors.text, fontSize: fonts.body, minHeight: 45, paddingHorizontal: spacing.sm }, textArea: { minHeight: 100, paddingTop: spacing.sm }, pickerFieldRow: { alignItems: 'center', flexDirection: 'row' }, pickerField: { alignItems: 'center', borderColor: colors.borderSoft, borderRadius: 12, borderWidth: 1, flex: 1, flexDirection: 'row', minHeight: 45, paddingHorizontal: spacing.sm }, pickerFieldText: { color: colors.text, fontSize: fonts.body, marginLeft: spacing.xs }, pickerFieldPlaceholder: { color: colors.textMuted }, clearPickerButton: { marginLeft: spacing.xs, padding: spacing.xs },
    statusPicker: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.sm }, statusOption: { borderColor: colors.borderSoft, borderRadius: 10, borderWidth: 1, marginRight: 6, marginTop: 4, paddingHorizontal: 9, paddingVertical: 7 }, statusOptionActive: { backgroundColor: colors.primary, borderColor: colors.primary }, statusOptionText: { color: colors.primary, fontSize: fonts.caption, fontWeight: '700' }, statusOptionTextActive: { color: '#FFF' },
    primaryButton: { alignItems: 'center', backgroundColor: colors.primary, borderRadius: 14, flexDirection: 'row', justifyContent: 'center', marginTop: spacing.md, paddingVertical: 14 }, primaryButtonText: { color: '#FFF', fontSize: fonts.body, fontWeight: '700', marginLeft: spacing.xs }, disabledButton: { opacity: 0.65 }, cancelButton: { alignItems: 'center', marginTop: spacing.sm, paddingVertical: spacing.xs }, cancelButtonText: { color: colors.primary, fontSize: fonts.body, fontWeight: '700' },
    listTitle: { color: colors.text, fontSize: fonts.subtitle, fontWeight: '700', marginBottom: spacing.sm, marginTop: spacing.xl }, loading: { marginTop: spacing.lg }, itemCard: { backgroundColor: colors.surface, borderRadius: 18, marginBottom: spacing.sm, padding: spacing.md }, itemTitle: { color: colors.text, fontSize: fonts.body, fontWeight: '700' }, itemMeta: { color: colors.textMuted, fontSize: fonts.caption, marginTop: 3 }, itemDescription: { color: colors.text, fontSize: fonts.body, lineHeight: fonts.body * 1.5, marginTop: spacing.xs }, cardActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: spacing.sm }, editText: { color: colors.primary, fontSize: fonts.body, fontWeight: '700', marginRight: spacing.md }, deleteText: { color: colors.danger, fontSize: fonts.body, fontWeight: '700' },
    switchRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm }, switchLabel: { color: colors.text, flex: 1, fontSize: fonts.caption, fontWeight: '600', paddingRight: spacing.sm }, outlineButton: { alignItems: 'center', borderColor: colors.primary, borderRadius: 12, borderWidth: 1, marginTop: spacing.sm, paddingVertical: 10 }, outlineButtonText: { color: colors.primary, fontSize: fonts.body, fontWeight: '700' }, adminDeleteButton: { alignItems: 'center', marginTop: spacing.sm, paddingVertical: spacing.xs }, adminDeleteButtonText: { color: colors.danger, fontSize: fonts.caption, fontWeight: '700' },
    emptyCard: { alignItems: 'center', backgroundColor: colors.surface, borderRadius: 18, padding: spacing.xl }, emptyText: { color: colors.textMuted, fontSize: fonts.body, lineHeight: fonts.body * 1.5, marginTop: spacing.sm, textAlign: 'center' }, deniedTitle: { color: colors.text, fontSize: fonts.subtitle, fontWeight: '700', marginTop: spacing.sm }, deniedText: { color: colors.textMuted, fontSize: fonts.body, lineHeight: fonts.body * 1.5, marginTop: spacing.xs, textAlign: 'center' },
    planButton: { borderColor: colors.borderSoft, borderRadius: 12, borderWidth: 1, marginTop: spacing.sm, padding: spacing.sm }, planButtonLabel: { color: colors.textMuted, fontSize: fonts.caption }, planButtonValue: { color: colors.text, fontSize: fonts.body, fontWeight: '700', marginTop: 3 }, planButtonHint: { color: colors.primary, fontSize: fonts.caption, fontWeight: '700', marginTop: 3 }, warningText: { color: colors.danger, fontSize: fonts.caption, lineHeight: fonts.caption * 1.5, marginTop: spacing.sm },
  });
  return { ...styles, placeholderColor: colors.textMuted, primaryColor: colors.primary, textMutedColor: colors.textMuted };
}
