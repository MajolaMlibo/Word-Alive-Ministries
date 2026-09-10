import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';
import  Notifications  from 'expo-notifications';
import Device from 'expo-device';

export async function registerNotifications(userId: string) {
  if (!Device.isDevice) return;

  const { status } = await Notifications.requestPermissionsAsync();

  if (status !== 'granted') return;

  const token = (await Notifications.getExpoPushTokenAsync()).data;

  await supabase.from('push_tokens').upsert({
    user_id: userId,
    token,
  });
}

export async function uploadAvatar(userId: string) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
    base64: true,
  });

  if (result.canceled) return null;

  const image = result.assets[0];
  const path = `${userId}/avatar.jpg`;

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, decode(image.base64!), {
      contentType: 'image/jpeg',
      upsert: true,
    });

  if (error) throw error;

  const { data } = supabase.storage.from('avatars').getPublicUrl(path);

  await supabase
    .from('profiles')
    .update({ avatar_url: data.publicUrl })
    .eq('id', userId);

  return data.publicUrl;
}