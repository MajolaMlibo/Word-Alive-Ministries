import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';

export type AvatarUpload = {
  path: string;
  signedUrl: string;
};

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

export async function getAvatarSignedUrl(path: string) {
  const { data, error } = await supabase.storage
    .from('avatars')
    .createSignedUrl(path, 60 * 60 * 24);

  if (error || !data?.signedUrl) {
    throw error ?? new Error('Unable to create a profile-photo link.');
  }

  return data.signedUrl;
}

export async function uploadAvatar(userId: string): Promise<AvatarUpload | null> {
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
  if (!image.base64) {
    throw new Error('The selected photo could not be prepared for upload.');
  }

  const isPng = image.mimeType === 'image/png';
  const path = `${userId}/avatar.${isPng ? 'png' : 'jpg'}`;
  const contentType = isPng ? 'image/png' : 'image/jpeg';

  const { error } = await supabase.storage
    .from('avatars')
    .upload(path, decode(image.base64), {
      contentType,
      upsert: true,
    });

  if (error) throw error;

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ avatar_path: path })
    .eq('id', userId);

  if (profileError) throw profileError;

  return {
    path,
    signedUrl: await getAvatarSignedUrl(path),
  };
}
