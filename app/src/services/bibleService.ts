import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@word_alive_scripture_';
export const LAST_POSITION_KEY = '@word_alive_last_position';


function getCacheKey(reference: string) {
  return `${CACHE_PREFIX}${reference.replace(/\s+/g, '_').toLowerCase()}`;
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