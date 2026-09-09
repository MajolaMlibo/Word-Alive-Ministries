// types/database.ts

export interface Profile {
  id: string; // UUID linked to Auth
  name: string;
  current_streak: number;
  is_admin: boolean;
  text_size: string;
  high_contrast: boolean;
  last_updated: string; 
}

export interface DailyReading {
  id: string; // UUID
  scheduled_date: string; // YYYY-MM-DD format
  scripture_ref: string;
  content: string;
  audio_url?: string; // Optional field
  week_number: number;
  last_updated: string;
}

export interface BibleStudy {
  id: string; // UUID
  study_name: string;
  chapter: string;
  scheduled_time: string; // ISO Timestamp
  last_updated: string;
}

export interface UserProgress {
  id: string; // UUID
  user_id: string; // FK to Profiles
  reading_id: string; // FK to Daily_Readings
  completed_at: string; // ISO Timestamp
  last_updated: string;
}

export interface PrayerRequest {
  id: string; // UUID
  user_id: string; // FK to Profiles
  description: string;
  status: 'Pending' | 'Reviewed';
  sent_at: string; // ISO Timestamp
  last_updated: string;
}

export interface Announcement {
  id: string; // UUID
  message: string;
  broadcast_date: string; // ISO Timestamp
  expires_at: string; // ISO Timestamp
  last_updated: string;
}

export interface LiveStream {
  id: string; // UUID
  platform: string; // e.g., 'TikTok'
  stream_url: string;
  is_live: boolean;
  last_updated: string;
}