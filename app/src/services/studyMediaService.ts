import * as ImagePicker from 'expo-image-picker';
import { decode } from 'base64-arraybuffer';
import { StudyMedia } from './database';
import { supabase } from './supabase';

const STUDY_MEDIA_BUCKET = 'study-media';
const MAX_STUDY_IMAGES_PER_UPLOAD = 6;

function extensionForMimeType(mimeType?: string | null) {
  if (mimeType === 'image/png') return 'png';
  if (mimeType === 'image/webp') return 'webp';
  return 'jpg';
}

function contentTypeForMimeType(mimeType?: string | null) {
  if (mimeType === 'image/png') return 'image/png';
  if (mimeType === 'image/webp') return 'image/webp';
  return 'image/jpeg';
}

export async function getStudyMedia(studyIds: string[]) {
  if (!studyIds.length) return { media: [] as StudyMedia[], error: null };

  const { data, error } = await supabase
    .from('study_media')
    .select('*')
    .in('study_id', studyIds)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  return { media: (data as StudyMedia[]) || [], error };
}

export async function getStudyMediaUrls(media: StudyMedia[]) {
  const signedUrls = await Promise.all(
    media.filter(item => !item.upload_pending).map(async (item) => {
      const { data, error } = await supabase.storage
        .from(STUDY_MEDIA_BUCKET)
        .createSignedUrl(item.storage_path, 60 * 60);

      return { id: item.id, url: data?.signedUrl ?? null, error };
    })
  );

  const error = signedUrls.find((item) => item.error)?.error ?? null;
  return {
    urls: Object.fromEntries(
      signedUrls
        .filter((item): item is { id: string; url: string; error: null } => Boolean(item.url))
        .map((item) => [item.id, item.url])
    ) as Record<string, string>,
    error,
  };
}

export async function chooseAndUploadStudyImages(studyId: string, administratorId: string) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    return { media: [] as StudyMedia[], cancelled: false, error: new Error('Photo-library permission was not granted.') };
  }

  const selection = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: MAX_STUDY_IMAGES_PER_UPLOAD,
    quality: 0.75,
    base64: true,
  });

  if (selection.canceled) return { media: [] as StudyMedia[], cancelled: true, error: null };

  const { data: existing, error: existingError } = await supabase
    .from('study_media')
    .select('id')
    .eq('study_id', studyId);

  if (existingError) return { media: [] as StudyMedia[], cancelled: false, error: existingError };
  if ((existing?.length ?? 0) + selection.assets.length > MAX_STUDY_IMAGES_PER_UPLOAD) {
    return {
      media: [] as StudyMedia[],
      cancelled: false,
      error: new Error(`A study can contain up to ${MAX_STUDY_IMAGES_PER_UPLOAD} images.`),
    };
  }

  const uploaded: StudyMedia[] = [];
  for (const [index, image] of selection.assets.entries()) {
    if (!image.base64) {
      return { media: uploaded, cancelled: false, error: new Error('The selected image could not be prepared for upload.') };
    }

    const extension = extensionForMimeType(image.mimeType);
    const storagePath = `${studyId}/${Date.now()}-${index}.${extension}`;
    const { data, error: rowError } = await supabase
      .from('study_media')
      .insert({
        study_id: studyId,
        upload_pending: true,
        storage_path: storagePath,
        sort_order: (existing?.length ?? 0) + uploaded.length,
        created_by: administratorId,
      })
      .select('*')
      .single();

    if (rowError) return { media: uploaded, cancelled: false, error: rowError };

    const { error: uploadError } = await supabase.storage
      .from(STUDY_MEDIA_BUCKET)
      .upload(storagePath, decode(image.base64), {
        contentType: contentTypeForMimeType(image.mimeType),
        upsert: false,
      });

    if (uploadError) {
      return { media: uploaded, cancelled: false, error: uploadError };
    }

    const { error: finaliseError } = await supabase.from('study_media')
      .update({ upload_pending: false }).eq('id', data.id).select('id').single();
    if (finaliseError) return { media: uploaded, cancelled: false, error: finaliseError };
    uploaded.push({ ...data, upload_pending: false } as StudyMedia);
  }

  return { media: uploaded, cancelled: false, error: null };
}

export async function deleteStudyMedia(media: StudyMedia) {
  const { error: storageError } = await supabase.storage
    .from(STUDY_MEDIA_BUCKET)
    .remove([media.storage_path]);
  if (storageError) return { error: storageError };

  const { error } = await supabase.from('study_media').delete().eq('id', media.id);
  return { error };
}
