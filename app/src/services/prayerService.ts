import { PrayerRequest } from './database';
import { supabase } from './supabase';

export async function getMyPrayerRequests(userId: string) {
  const { data, error } = await supabase
    .from('prayer_requests')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return {
    requests: (data as PrayerRequest[]) || [],
    error,
  };
}

export async function createPrayerRequest(
  userId: string,
  description: string,
  isPublic: boolean
) {
  const { data, error } = await supabase
    .from('prayer_requests')
    .insert({ user_id: userId, description, is_public: isPublic })
    .select('*')
    .single();

  return {
    request: (data as PrayerRequest | null) || null,
    error,
  };
}

export async function updateMyPrayerRequest(
  requestId: string,
  description: string,
  isPublic: boolean
) {
  const { data, error } = await supabase
    .from('prayer_requests')
    .update({ description, is_public: isPublic })
    .eq('id', requestId)
    .select('*')
    .single();

  return {
    request: (data as PrayerRequest | null) || null,
    error,
  };
}

export async function deleteMyPrayerRequest(requestId: string) {
  return supabase.from('prayer_requests').delete().eq('id', requestId);
}
