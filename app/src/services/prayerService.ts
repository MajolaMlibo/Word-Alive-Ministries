import { PrayerRequest } from './database';
import { supabase } from './supabase';

export async function getMyPrayerRequests(userId: string) {
  const { data, error } = await supabase
    .from('prayer_requests')
    .select('*, prayer_replies(id,author_name,body,created_at)')
    .eq('user_id', userId)
    .order('created_at', { referencedTable: 'prayer_replies', ascending: true })
    .order('created_at', { ascending: false });

  return {
    requests: (data as PrayerRequest[]) || [],
    error,
  };
}

export async function createPrayerRequest(
  userId: string,
  description: string
) {
  const { data, error } = await supabase
    .from('prayer_requests')
    .insert({ user_id: userId, description })
    .select('*')
    .single();

  return {
    request: (data as PrayerRequest | null) || null,
    error,
  };
}

export async function updateMyPrayerRequest(
  requestId: string,
  description: string
) {
  const { data, error } = await supabase
    .from('prayer_requests')
    .update({ description })
    .eq('id', requestId)
    .select('*')
    .single();

  return {
    request: (data as PrayerRequest | null) || null,
    error,
  };
}

export async function deleteMyPrayerRequest(requestId: string) {
  return supabase.from('prayer_requests').delete().eq('id', requestId).select('id').single();
}
