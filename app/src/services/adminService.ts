import {
  Announcement,
  BibleStudy,
  ContentStatus,
  DailyReading,
  LiveStream,
  PrayerRequest,
  PrayerRequestStatus,
  ReadingPlan,
} from './database';
import { supabase } from './supabase';

export type AnnouncementInput = {
  title: string;
  message: string;
  status: ContentStatus;
  publishedAt: string | null;
  expiresAt: string | null;
  actionLabel: string | null;
  actionUrl: string | null;
};

export type BibleStudyInput = {
  studyName: string;
  scriptureRef: string | null;
  studyDate: string;
  startTime: string | null;
  endTime: string | null;
  description: string | null;
  locationOrUrl: string | null;
  status: ContentStatus;
};

export type DailyReadingInput = {
  planId: string;
  dayNumber: number;
  scheduledDate: string;
  scriptureRef: string;
  reflection: string | null;
  audioUrl: string | null;
  status: ContentStatus;
  publishedAt: string | null;
};

export type ReadingPlanInput = {
  name: string;
  planYear: number;
  description: string | null;
  status: ContentStatus;
};

export type LiveStreamInput = {
  platform: string;
  streamUrl: string;
  isLive: boolean;
};

function publishedAtForStatus(status: ContentStatus, publishedAt: string | null) {
  if (status !== 'published') return null;
  return publishedAt || new Date().toISOString();
}

export async function getAdminPrayerRequests() {
  const { data, error } = await supabase
    .from('prayer_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  return { requests: (data as PrayerRequest[]) || [], error };
}

export async function moderatePrayerRequest(
  requestId: string,
  administratorId: string,
  status: PrayerRequestStatus,
  isPublic: boolean
) {
  const { data, error } = await supabase
    .from('prayer_requests')
    .update({
      status,
      is_public: isPublic,
      moderated_at: new Date().toISOString(),
      moderated_by: administratorId,
    })
    .eq('id', requestId)
    .select('*')
    .single();

  return { request: (data as PrayerRequest | null) || null, error };
}

export async function deletePrayerRequest(requestId: string) {
  return supabase.from('prayer_requests').delete().eq('id', requestId);
}

export async function getAdminAnnouncements() {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  return { announcements: (data as Announcement[]) || [], error };
}

export async function saveAnnouncement(
  input: AnnouncementInput,
  administratorId: string,
  announcementId?: string
) {
  const payload = {
    title: input.title.trim(),
    message: input.message.trim(),
    status: input.status,
    published_at: publishedAtForStatus(input.status, input.publishedAt),
    expires_at: input.expiresAt,
    action_label: input.actionLabel,
    action_url: input.actionUrl,
  };

  const result = announcementId
    ? await supabase
        .from('announcements')
        .update(payload)
        .eq('id', announcementId)
        .select('*')
        .single()
    : await supabase
        .from('announcements')
        .insert({ ...payload, created_by: administratorId })
        .select('*')
        .single();

  return { announcement: (result.data as Announcement | null) || null, error: result.error };
}

export async function deleteAnnouncement(announcementId: string) {
  return supabase.from('announcements').delete().eq('id', announcementId);
}

export async function getAdminBibleStudies() {
  const { data, error } = await supabase
    .from('bible_studies')
    .select('*')
    .order('study_date', { ascending: true })
    .limit(100);

  return { studies: (data as BibleStudy[]) || [], error };
}

export async function saveBibleStudy(
  input: BibleStudyInput,
  administratorId: string,
  studyId?: string
) {
  const payload = {
    study_name: input.studyName.trim(),
    scripture_ref: input.scriptureRef,
    study_date: input.studyDate,
    start_time: input.startTime,
    end_time: input.endTime,
    description: input.description,
    location_or_url: input.locationOrUrl,
    status: input.status,
  };

  const result = studyId
    ? await supabase
        .from('bible_studies')
        .update(payload)
        .eq('id', studyId)
        .select('*')
        .single()
    : await supabase
        .from('bible_studies')
        .insert({ ...payload, created_by: administratorId })
        .select('*')
        .single();

  return { study: (result.data as BibleStudy | null) || null, error: result.error };
}

export async function deleteBibleStudy(studyId: string) {
  return supabase.from('bible_studies').delete().eq('id', studyId);
}

export async function getAdminReadingPlans() {
  const { data, error } = await supabase
    .from('reading_plans')
    .select('*')
    .order('plan_year', { ascending: false });

  return { plans: (data as ReadingPlan[]) || [], error };
}

export async function saveReadingPlan(
  input: ReadingPlanInput,
  administratorId: string,
  planId?: string
) {
  const payload = {
    name: input.name.trim(),
    plan_year: input.planYear,
    description: input.description,
    status: input.status,
  };

  const result = planId
    ? await supabase
        .from('reading_plans')
        .update(payload)
        .eq('id', planId)
        .select('*')
        .single()
    : await supabase
        .from('reading_plans')
        .insert({ ...payload, created_by: administratorId })
        .select('*')
        .single();

  return { plan: (result.data as ReadingPlan | null) || null, error: result.error };
}

export async function getAdminDailyReadings() {
  const { data, error } = await supabase
    .from('daily_readings')
    .select('*')
    .order('scheduled_date', { ascending: true })
    .limit(500);

  return { readings: (data as DailyReading[]) || [], error };
}

export async function saveDailyReading(
  input: DailyReadingInput,
  administratorId: string,
  readingId?: string
) {
  const payload = {
    plan_id: input.planId,
    day_number: input.dayNumber,
    scheduled_date: input.scheduledDate,
    scripture_ref: input.scriptureRef.trim(),
    reflection: input.reflection,
    audio_url: input.audioUrl,
    status: input.status,
    published_at: publishedAtForStatus(input.status, input.publishedAt),
  };

  const result = readingId
    ? await supabase
        .from('daily_readings')
        .update(payload)
        .eq('id', readingId)
        .select('*')
        .single()
    : await supabase
        .from('daily_readings')
        .insert({ ...payload, created_by: administratorId })
        .select('*')
        .single();

  return { reading: (result.data as DailyReading | null) || null, error: result.error };
}

export async function deleteDailyReading(readingId: string) {
  return supabase.from('daily_readings').delete().eq('id', readingId);
}

export async function getAdminLiveStreams() {
  const { data, error } = await supabase
    .from('live_streams')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(30);

  return { streams: (data as LiveStream[]) || [], error };
}

export async function saveLiveStream(
  input: LiveStreamInput,
  administratorId: string,
  streamId?: string
) {
  const payload = {
    platform: input.platform.trim(),
    stream_url: input.streamUrl.trim(),
    is_live: input.isLive,
  };

  const result = streamId
    ? await supabase
        .from('live_streams')
        .update(payload)
        .eq('id', streamId)
        .select('*')
        .single()
    : await supabase
        .from('live_streams')
        .insert({ ...payload, created_by: administratorId })
        .select('*')
        .single();

  return { stream: (result.data as LiveStream | null) || null, error: result.error };
}

export async function deleteLiveStream(streamId: string) {
  return supabase.from('live_streams').delete().eq('id', streamId);
}
