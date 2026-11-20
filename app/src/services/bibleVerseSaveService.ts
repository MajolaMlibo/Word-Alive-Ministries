import {
  BibleHighlightColor,
  BibleVerseSave,
} from './database';
import { supabase } from './supabase';

type VerseSavePatch = {
  highlightColor?: BibleHighlightColor | null;
  isBookmarked?: boolean;
  note?: string | null;
};

type VerseReference = {
  book: string;
  chapter: number;
  verse: number;
};

async function getSignedInUserId() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { userId: null, error: error ?? new Error('You must be signed in to save Bible activity.') };
  }

  return { userId: user.id, error: null };
}

function hasSavedContent(save: Pick<BibleVerseSave, 'highlight_color' | 'is_bookmarked' | 'note'>) {
  return Boolean(save.highlight_color || save.is_bookmarked || save.note?.trim());
}

export async function getBibleVerseSaves(book: string, chapter: number) {
  const { data, error } = await supabase
    .from('bible_verse_saves')
    .select('*')
    .eq('translation', 'KJV')
    .eq('book', book)
    .eq('chapter', chapter)
    .order('verse', { ascending: true });

  return { saves: (data as BibleVerseSave[]) || [], error };
}

export async function getAllBibleVerseSaves() {
  const { data, error } = await supabase
    .from('bible_verse_saves')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(250);

  return { saves: (data as BibleVerseSave[]) || [], error };
}

async function updateVerseSave(reference: VerseReference, patch: VerseSavePatch) {
  const { userId, error: userError } = await getSignedInUserId();
  if (userError || !userId) return { save: null, error: userError };

  const { data: existing, error: existingError } = await supabase
    .from('bible_verse_saves')
    .select('*')
    .eq('user_id', userId)
    .eq('translation', 'KJV')
    .eq('book', reference.book)
    .eq('chapter', reference.chapter)
    .eq('verse', reference.verse)
    .maybeSingle();

  if (existingError) return { save: null, error: existingError };

  const next = {
    highlight_color:
      patch.highlightColor === undefined
        ? (existing as BibleVerseSave | null)?.highlight_color ?? null
        : patch.highlightColor,
    is_bookmarked:
      patch.isBookmarked === undefined
        ? (existing as BibleVerseSave | null)?.is_bookmarked ?? false
        : patch.isBookmarked,
    note:
      patch.note === undefined
        ? (existing as BibleVerseSave | null)?.note ?? null
        : patch.note?.trim() || null,
  };

  if (!hasSavedContent(next)) {
    if (!existing) return { save: null, error: null };
    const { error } = await supabase.from('bible_verse_saves').delete().eq('id', existing.id);
    return { save: null, error };
  }

  const result = existing
    ? await supabase
        .from('bible_verse_saves')
        .update(next)
        .eq('id', existing.id)
        .select('*')
        .single()
    : await supabase
        .from('bible_verse_saves')
        .insert({
          user_id: userId,
          translation: 'KJV',
          book: reference.book,
          chapter: reference.chapter,
          verse: reference.verse,
          ...next,
        })
        .select('*')
        .single();

  return { save: (result.data as BibleVerseSave | null) || null, error: result.error };
}

export async function setBibleVerseHighlights(
  book: string,
  chapter: number,
  verses: number[],
  color: BibleHighlightColor | null
) {
  const results = await Promise.all(
    verses.map((verse) => updateVerseSave({ book, chapter, verse }, { highlightColor: color }))
  );
  return { error: results.find((result) => result.error)?.error ?? null };
}

export async function setBibleVerseBookmarks(
  book: string,
  chapter: number,
  verses: number[],
  isBookmarked: boolean
) {
  const results = await Promise.all(
    verses.map((verse) => updateVerseSave({ book, chapter, verse }, { isBookmarked }))
  );
  return { error: results.find((result) => result.error)?.error ?? null };
}

export async function saveBibleVerseNote(
  book: string,
  chapter: number,
  verse: number,
  note: string | null
) {
  return updateVerseSave({ book, chapter, verse }, { note });
}
