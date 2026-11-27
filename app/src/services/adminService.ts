import {
  Announcement,
  BibleStudy,
  ContentStatus,
  DailyReading,
  LiveStream,
  MinistryLink,
  ReadingPlan,
} from './database';
import { validateScriptureReference } from './scriptureReference';
import { supabase } from './supabase';

export type AnnouncementInput = {
  sendPush?: boolean;
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

export type MinistryLinkInput = {
  label: string;
  url: string;
  isVisible: boolean;
};

function publishedAtForStatus(status: ContentStatus, publishedAt: string | null) {
  if (status !== 'published') return null;
  return publishedAt || new Date().toISOString();
}

export async function getAdminAnnouncements(offset: number, search: string) {
  const { data, error } = await supabase.from('announcements').select('*')
    .ilike('title', '%' + search.replace(/[\\%_]/g, '\\$&') + '%')
    .order('created_at', { ascending: false }).order('id').range(offset, offset + 25);
  return { items: (data as Announcement[]) || [], error };
}

export async function saveAnnouncement(
  input: AnnouncementInput,
  administratorId: string,
  announcementId?: string
) {
  const payload = {
    ...(input.sendPush ? { send_push: true } : {}),
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

export async function getAdminBibleStudies(offset: number, search: string) {
  const { data, error } = await supabase.rpc('admin_study_page', { term: search, page_offset: offset });
  return { items: (data as BibleStudy[]) || [], error };
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

// Calculate from the calendar so backfilled days and concurrent entries keep their correct number.
export function readingDayNumber(date: string, year: number | undefined): number | null {
  if (!year || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number(date.slice(0, 4)) !== year) return null;
  const timestamp = Date.parse(date + 'T00:00:00Z');
  if (!Number.isFinite(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date) return null;
  return 1 + (timestamp - Date.UTC(year, 0, 1)) / 86400000;
}

// month is zero-based. UTC also handles December rolling into the next year.
function monthStart(year: number, month: number) {
  return new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10);
}

export async function getAdminDailyReadings(planId: string, year: number, month: number) {
  const { data, error } = await supabase
    .from('daily_readings')
    .select('*')
    .eq('plan_id', planId)
    .gte('scheduled_date', monthStart(year, month))
    .lt('scheduled_date', monthStart(year, month + 1))
    .order('scheduled_date', { ascending: true });

  return { readings: (data as DailyReading[]) || [], error };
}

/**
 * Staff use this to review active readings across every plan, rather than only
 * the month currently open in the editor. The caller supplies the ministry's
 * local date so the service remains deterministic and easy to test.
 */
export async function getAdminCurrentAndUpcomingDailyReadings(fromDate: string) {
  const { data, error } = await supabase
    .from('daily_readings')
    .select('*')
    .gte('scheduled_date', fromDate)
    .neq('status', 'archived')
    .order('scheduled_date', { ascending: true });

  return { readings: (data as DailyReading[]) || [], error };
}

export async function getAdminAllDailyReadings() {
  const { data, error } = await supabase
    .from('daily_readings')
    .select('*')
    .neq('status', 'archived')
    .order('scheduled_date', { ascending: true });

  return { readings: (data as DailyReading[]) || [], error };
}

export async function saveDailyReading(
  input: DailyReadingInput,
  administratorId: string,
  readingId?: string
) {
  const referenceValidation = validateScriptureReference(input.scriptureRef);
  const archivingLegacyInvalidReference = !referenceValidation.isValid
    && input.status === 'archived'
    && Boolean(readingId);
  if (!referenceValidation.isValid && !archivingLegacyInvalidReference) {
    return { reading: null, error: new Error(referenceValidation.error) };
  }

  // Omit an unchanged legacy-invalid value so the database trigger permits
  // archiving it; any new or changed reference must pass the shared guard.
  const payload = {
    plan_id: input.planId,
    day_number: input.dayNumber,
    scheduled_date: input.scheduledDate,
    ...(referenceValidation.isValid
      ? { scripture_ref: referenceValidation.normalizedReference }
      : {}),
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

export async function getAdminLiveStreams(offset: number, search: string) {
  const { data, error } = await supabase.from('live_streams').select('*')
    .ilike('platform', '%' + search.replace(/[\\%_]/g, '\\$&') + '%')
    .order('updated_at', { ascending: false }).order('id').range(offset, offset + 25);
  return { items: (data as LiveStream[]) || [], error };
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

export async function getAdminMinistryLinks() {
  const { data, error } = await supabase
    .from('ministry_links')
    .select('*')
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });

  return { links: (data as MinistryLink[]) || [], error };
}

export async function saveMinistryLink(
  input: MinistryLinkInput,
  administratorId: string,
  linkId?: string
) {
  const payload = {
    label: input.label.trim(),
    url: input.url.trim(),
    is_visible: input.isVisible,
  };

  const result = linkId
    ? await supabase
        .from('ministry_links')
        .update(payload)
        .eq('id', linkId)
        .select('*')
        .single()
    : await supabase
        .from('ministry_links')
        .insert({ ...payload, created_by: administratorId })
        .select('*')
        .single();

  return { link: (result.data as MinistryLink | null) || null, error: result.error };
}

export async function deleteMinistryLink(linkId: string) {
  return supabase.from('ministry_links').delete().eq('id', linkId);
}
