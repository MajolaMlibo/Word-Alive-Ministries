/**
 * Application-facing records for the production schema.
 *
 * Keep these aligned with `supabase/migrations/202611070001_initial_schema.sql`.
 * They are deliberately independent of generated Supabase types until the new
 * project exists and its database types can be generated from the live schema.
 */

export type AppRole = 'pastor' | 'admin' | 'editor' | 'member';
export type ContentStatus = 'draft' | 'published' | 'archived';
export type PrayerRequestStatus = 'pending' | 'reviewed' | 'approved' | 'closed';

export interface Profile {
  id: string;
  name: string | null;
  surname: string | null;
  location: string | null;
  bio: string | null;
  avatar_path: string | null;
  current_streak: number;
  last_completed_at: string | null;
  text_scale: 'standard' | 'large' | 'extraLarge';
  high_contrast: boolean;
  notifications_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  user_id: string;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

export interface ReadingPlan {
  id: string;
  name: string;
  plan_year: number;
  description: string | null;
  status: ContentStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyReading {
  id: string;
  plan_id: string;
  day_number: number;
  scheduled_date: string;
  scripture_ref: string;
  reflection: string | null;
  audio_url: string | null;
  status: ContentStatus;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BibleStudy {
  id: string;
  study_name: string;
  scripture_ref: string | null;
  study_date: string;
  start_time: string | null;
  end_time: string | null;
  description: string | null;
  location_or_url: string | null;
  status: ContentStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReadingCompletion {
  id: string;
  user_id: string;
  reading_id: string;
  completed_at: string;
  created_at: string;
}

export interface PrayerRequest {
  id: string;
  user_id: string;
  description: string;
  status: PrayerRequestStatus;
  is_public: boolean;
  moderated_at: string | null;
  moderated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PrayerRequestPrayer {
  prayer_request_id: string;
  user_id: string;
  prayed_at: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  action_label: string | null;
  action_url: string | null;
  status: ContentStatus;
  published_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface HomeEncouragement {
  id: boolean;
  message: string;
  scripture_ref: string;
  updated_at: string;
}

export interface AnnouncementRead {
  announcement_id: string;
  user_id: string;
  read_at: string;
}

export interface LiveStream {
  id: string;
  platform: string;
  stream_url: string;
  is_live: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface MinistryLink {
  id: string;
  label: string;
  url: string;
  sort_order: number;
  is_visible: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface PushToken {
  id: string;
  user_id: string;
  token: string;
  platform: string | null;
  last_seen_at: string;
  created_at: string;
  updated_at: string;
}
