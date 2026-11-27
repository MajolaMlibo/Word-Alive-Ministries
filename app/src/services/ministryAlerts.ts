import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export const pushSupported = Platform.OS !== 'web' &&
  Constants.executionEnvironment !== ExecutionEnvironment.StoreClient;
const storageKey = 'ministry-alert-installation';

export async function deviceSubscription(userId: string) {
  const token = await AsyncStorage.getItem(storageKey);
  if (!token) return false;
  const { data, error } = await supabase.from('push_tokens').select('ministry_alerts')
    .eq('user_id', userId).eq('token', token).maybeSingle();
  if (error) throw error;
  return data?.ministry_alerts === true;
}

export async function setDeviceSubscription(userId: string, enabled: boolean) {
  if (!enabled) {
    const token = await AsyncStorage.getItem(storageKey);
    if (token) {
      const { error } = await supabase.from('push_tokens').delete().eq('user_id', userId).eq('token', token);
      if (error) throw error;
      await AsyncStorage.removeItem(storageKey);
    }
    return;
  }
  const notifications = await import('expo-notifications');
  if (Platform.OS === 'android') await notifications.setNotificationChannelAsync('ministry', {
    name: 'Ministry alerts', importance: notifications.AndroidImportance.DEFAULT,
  });
  const permission = await notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error('Allow notifications in your phone settings to receive ministry alerts.');
  const projectId = Constants.expoConfig?.extra?.eas?.projectId
    ?? Constants.easConfig?.projectId;
  if (!projectId) {
    throw new Error('Push notifications are not configured for this app.');
  }
  const { data: token } = await notifications.getExpoPushTokenAsync({ projectId });
  await AsyncStorage.setItem(storageKey, token);
  const { error } = await supabase.from('push_tokens').upsert({
    user_id: userId, token, platform: Platform.OS, ministry_alerts: true,
  }, { onConflict: 'token' });
  if (error) throw error;
}
