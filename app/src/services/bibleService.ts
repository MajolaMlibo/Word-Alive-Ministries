import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@word_alive_scripture_';
export const LAST_POSITION_KEY = '@word_alive_last_position';
const READER_TEXT_SIZE_KEY = '@word_alive_bible_reader_text_size';

export type BibleReaderTextSize = 'standard' | 'large' | 'extraLarge';

const BIBLE_READER_TEXT_SIZES: BibleReaderTextSize[] = [
  'standard',
  'large',
  'extraLarge',
];

export type DailyVersePreview = {
  reference: string;
  text: string;
};


function getCacheKey(reference: string) {
  return `${CACHE_PREFIX}${reference.replace(/\s+/g, '_').toLowerCase()}`;
}

function getFirstVerseReference(scriptureRef: string) {
  const match = scriptureRef
    .trim()
    .match(/^(.+?)\s+(\d+)(?::\d+)?(?:[-;].*)?$/);

  if (!match) return null;

  return `${match[1]} ${match[2]}:1`;
}

export async function getDailyVersePreview(scriptureRef: string) {
  const verseReference = getFirstVerseReference(scriptureRef);

  if (!verseReference) {
    return {
      preview: null,
      error: new Error('The scheduled reading could not be interpreted.'),
    };
  }

  const cacheKey = getCacheKey(`kjv_preview_${verseReference}`);

  try {
    const response = await fetch(
      `https://bible-api.com/${encodeURIComponent(verseReference)}?translation=kjv`
    );

    if (!response.ok) {
      throw new Error('Unable to load the daily verse preview.');
    }

    const data = await response.json();
    const text = typeof data.text === 'string' ? data.text.trim() : '';

    if (!text) {
      throw new Error('The daily verse preview was empty.');
    }

    const preview: DailyVersePreview = {
      reference:
        typeof data.reference === 'string' ? data.reference : verseReference,
      text,
    };

    await AsyncStorage.setItem(cacheKey, JSON.stringify(preview));

    return { preview, error: null };
  } catch (error) {
    console.warn('Unable to load daily verse preview, checking cache:', error);

    try {
      const cachedPreview = await AsyncStorage.getItem(cacheKey);

      if (cachedPreview) {
        return {
          preview: JSON.parse(cachedPreview) as DailyVersePreview,
          error: null,
        };
      }
    } catch (cacheError) {
      console.warn('Unable to read daily verse preview cache:', cacheError);
    }

    return {
      preview: null,
      error:
        error instanceof Error
          ? error
          : new Error('Unable to load the daily verse preview.'),
    };
  }
}

export async function fetchScripture(reference: string) {
  const cacheKey = getCacheKey(reference);

  try {
    // 1. Always try the network first so the user gets fresh scripture
    console.log('Fetching scripture...');
    const response = await fetch(
      `https://bible-api.com/${encodeURIComponent(reference)}?translation=kjv`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch scripture from network');
    }

    const data = await response.json();

    // 2. Save the fresh data to AsyncStorage for future offline access
    await AsyncStorage.setItem(cacheKey, JSON.stringify(data));

    return data;
  } catch (error) {
    console.error('Error fetching scripture, checking local cache:', error);

    // 3. Network failed (offline, timeout, bad reference, etc) — fall back to cache
    try {
      const cachedData = await AsyncStorage.getItem(cacheKey);
      if (cachedData) {
        console.log('Loaded scripture from local cache');
        return JSON.parse(cachedData);
      }
    } catch (cacheError) {
      console.error('Error reading scripture cache:', cacheError);
    }

    // 4. Nothing cached either — return a clear fallback structure
    return {
      reference,
      text: 'Unable to load scripture. Please check your connection or ensure this passage has been viewed previously.',
    };
  }
}

// Remembers the last book/chapter/verse the user was reading so the screen
// can restore it after being closed or navigated away from.
export async function saveLastPosition(book: string, chapter: number, verse?: number) {
  try {
    await AsyncStorage.setItem(LAST_POSITION_KEY, JSON.stringify({ book, chapter, verse }));
  } catch (error) {
    console.error('Error saving last read position:', error);
  }
}

export async function getLastPosition(): Promise<{ book: string; chapter: number; verse?: number } | null> {
  try {
    const saved = await AsyncStorage.getItem(LAST_POSITION_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Error reading last read position:', error);
    return null;
  }
}

export async function getBibleReaderTextSize(): Promise<BibleReaderTextSize> {
  try {
    const saved = await AsyncStorage.getItem(READER_TEXT_SIZE_KEY);

    return BIBLE_READER_TEXT_SIZES.includes(saved as BibleReaderTextSize)
      ? (saved as BibleReaderTextSize)
      : 'standard';
  } catch (error) {
    console.warn('Unable to load Bible reader text size.', error);
    return 'standard';
  }
}

export async function saveBibleReaderTextSize(
  textSize: BibleReaderTextSize
) {
  try {
    await AsyncStorage.setItem(READER_TEXT_SIZE_KEY, textSize);
  } catch (error) {
    console.warn('Unable to save Bible reader text size.', error);
  }
}
