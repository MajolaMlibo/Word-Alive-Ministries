import { Announcement, AnnouncementRead } from './database';
import { supabase } from './supabase';

export async function getActiveAnnouncements(limit = 20) {
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('status', 'published')
    .lte('published_at', now)
    .or(`expires_at.is.null,expires_at.gt.${now}`)
    .order('published_at', { ascending: false })
    .limit(limit);

  return {
    announcements: (data as Announcement[]) || [],
    error,
  };
}

export async function getAnnouncementReads(userId: string) {
  const { data, error } = await supabase
    .from('announcement_reads')
    .select('announcement_id, user_id, read_at')
    .eq('user_id', userId);

  return {
    reads: (data as AnnouncementRead[]) || [],
    error,
  };
}

export async function markAnnouncementAsRead(
  userId: string,
  announcementId: string
) {
  const { data, error } = await supabase
    .from('announcement_reads')
    .insert({ user_id: userId, announcement_id: announcementId })
    .select('announcement_id, user_id, read_at')
    .single();

  return {
    read: (data as AnnouncementRead | null) || null,
    error,
  };
}
