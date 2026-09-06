import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@word_alive_scripture_';

export async function fetchScripture(reference: string) {
  const cacheKey = `${CACHE_PREFIX}${reference.replace(/\s+/g, '_').toLowerCase()}`;

  try {
    // 1. Check local cache first (Offline-first support)
    const cachedData = await AsyncStorage.getItem(cacheKey);
    if (cachedData) {
      console.log('Loaded scripture from local cache');
      return JSON.parse(cachedData);
    }

    // 2. If not cached, fetch live from the Bible API
    console.log('Fetching scripture...');
    const response = await fetch(`https://bible-api.com/${encodeURIComponent(reference)}?translation=kjv`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch scripture from network');
    }

    const data = await response.json();

    // 3. Save the fetched data to AsyncStorage for future offline access
    await AsyncStorage.setItem(cacheKey, JSON.stringify(data));

    return data;
  } catch (error) {
    console.error('Error fetching or caching scripture:', error);
    // Fallback error structure if completely offline with no cache
    return {
      reference: reference,
      text: 'Unable to load scripture. Please check your connection or ensure this passage has been viewed previously.',
    };
  }
}