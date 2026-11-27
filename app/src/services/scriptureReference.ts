/**
 * Canonical Bible-book metadata and reference checks for staff-managed readings.
 *
 * The guard deliberately checks book names, chapter bounds, and the supported
 * single- or multi-passage syntax. Exact verse-count validation is not done
 * offline; the KJV reader remains the source of the passage text.
 */

export const BIBLE_BOOKS = [
  ['Genesis', 50], ['Exodus', 40], ['Leviticus', 27], ['Numbers', 36], ['Deuteronomy', 34],
  ['Joshua', 24], ['Judges', 21], ['Ruth', 4], ['1 Samuel', 31], ['2 Samuel', 24],
  ['1 Kings', 22], ['2 Kings', 25], ['1 Chronicles', 29], ['2 Chronicles', 36], ['Ezra', 10],
  ['Nehemiah', 13], ['Esther', 10], ['Job', 42], ['Psalms', 150], ['Proverbs', 31],
  ['Ecclesiastes', 12], ['Song of Solomon', 8], ['Isaiah', 66], ['Jeremiah', 52], ['Lamentations', 5],
  ['Ezekiel', 48], ['Daniel', 12], ['Hosea', 14], ['Joel', 3], ['Amos', 9], ['Obadiah', 1],
  ['Jonah', 4], ['Micah', 7], ['Nahum', 3], ['Habakkuk', 3], ['Zephaniah', 3], ['Haggai', 2],
  ['Zechariah', 14], ['Malachi', 4], ['Matthew', 28], ['Mark', 16], ['Luke', 24], ['John', 21],
  ['Acts', 28], ['Romans', 16], ['1 Corinthians', 16], ['2 Corinthians', 13], ['Galatians', 6],
  ['Ephesians', 6], ['Philippians', 4], ['Colossians', 4], ['1 Thessalonians', 5],
  ['2 Thessalonians', 3], ['1 Timothy', 6], ['2 Timothy', 4], ['Titus', 3], ['Philemon', 1],
  ['Hebrews', 13], ['James', 5], ['1 Peter', 5], ['2 Peter', 3], ['1 John', 5], ['2 John', 1],
  ['3 John', 1], ['Jude', 1], ['Revelation', 22],
] as const;

export type ScripturePassage = {
  book: string;
  startChapter: number;
  startVerse?: number;
  endChapter?: number;
  endVerse?: number;
};

export type ScriptureReference = {
  passages: ScripturePassage[];
};

export type ScriptureReferenceValidation =
  | { isValid: true; normalizedReference: string; reference: ScriptureReference }
  | { isValid: false; error: string; suggestedReference?: string };

const bookByKey = new Map(BIBLE_BOOKS.map(([book, chapters]) => [book.toLowerCase(), { book, chapters }]));

// These aliases are explicit, unambiguous variants in supplied reading plans.
// They are offered for staff confirmation and are never saved automatically.
const BOOK_ALIASES: Record<string, string> = {
  psalm: 'Psalms',
  'song of songs': 'Song of Solomon',
};

function tidy(value: string) {
  return value.trim().replace(/[–—]/g, '-').replace(/\s+/g, ' ');
}

function formatPassage(passage: ScripturePassage) {
  const start = `${passage.book} ${passage.startChapter}${passage.startVerse ? `:${passage.startVerse}` : ''}`;
  if (!passage.endChapter && !passage.endVerse) return start;
  if (!passage.startVerse) return `${start}-${passage.endChapter}`;
  return `${start}-${passage.endVerse}`;
}

function invalid(error: string, suggestedReference?: string): ScriptureReferenceValidation {
  return { isValid: false, error, ...(suggestedReference ? { suggestedReference } : {}) };
}

type SegmentResult =
  | { isValid: true; passage: ScripturePassage; usedAlias: boolean }
  | { isValid: false; error: string };

function validateSegment(segment: string): SegmentResult {
  const match = segment.match(/^(.+?)\s+(\d+)(?::(\d+))?(?:\s*-\s*(\d+))?$/);
  if (!match) {
    return { isValid: false, error: 'Use a book and chapter, chapter range, or same-chapter verse range.' };
  }

  const [, enteredBook, startChapterText, startVerseText, endText] = match;
  const enteredBookKey = enteredBook.trim().toLowerCase();
  const directBook = bookByKey.get(enteredBookKey);
  const aliasBook = BOOK_ALIASES[enteredBookKey];
  const resolvedBook = directBook ?? (aliasBook ? bookByKey.get(aliasBook.toLowerCase()) : undefined);

  if (!resolvedBook) {
    return { isValid: false, error: `“${enteredBook.trim()}” is not a recognised Bible book.` };
  }

  const startChapter = Number(startChapterText);
  const startVerse = startVerseText ? Number(startVerseText) : undefined;
  const end = endText ? Number(endText) : undefined;

  if (!Number.isSafeInteger(startChapter) || startChapter < 1 || startChapter > resolvedBook.chapters) {
    return {
      isValid: false,
      error: `${resolvedBook.book} has ${resolvedBook.chapters} chapter${resolvedBook.chapters === 1 ? '' : 's'}; check the starting chapter.`,
    };
  }
  if (startVerse !== undefined && (!Number.isSafeInteger(startVerse) || startVerse < 1)) {
    return { isValid: false, error: 'Verse numbers must be positive whole numbers.' };
  }

  if (startVerse === undefined) {
    if (end !== undefined && (!Number.isSafeInteger(end) || end < 1)) {
      return { isValid: false, error: 'The ending chapter must be a positive whole number.' };
    }
    if (end !== undefined && end < startChapter) {
      return { isValid: false, error: 'The ending chapter must not be before the starting chapter.' };
    }
    if (end !== undefined && end > resolvedBook.chapters) {
      return {
        isValid: false,
        error: `${resolvedBook.book} ends at chapter ${resolvedBook.chapters}; check the ending chapter.`,
      };
    }
    return {
      isValid: true,
      passage: { book: resolvedBook.book, startChapter, ...(end !== undefined ? { endChapter: end } : {}) },
      usedAlias: !directBook,
    };
  }

  if (end !== undefined && (!Number.isSafeInteger(end) || end < startVerse)) {
    return { isValid: false, error: 'The ending verse must be a positive number after the starting verse.' };
  }

  return {
    isValid: true,
    passage: { book: resolvedBook.book, startChapter, startVerse, ...(end !== undefined ? { endVerse: end } : {}) },
    usedAlias: !directBook,
  };
}

/**
 * Valid examples: "John 3", "Psalms 119:1-90", and
 * "2 John 1; 3 John 1". A daily reading may contain multiple passages,
 * separated by a semicolon, but never an ambiguous slash-delimited value.
 */
export function validateScriptureReference(input: string): ScriptureReferenceValidation {
  const value = tidy(input);
  if (!value) return invalid('Enter a Bible book and chapter, for example “John 3”.');

  const segments = value.split(';').map(tidy);
  if (segments.some((segment) => !segment)) {
    return invalid('Separate multiple passages with one semicolon and do not leave an empty passage.');
  }

  const passages: ScripturePassage[] = [];
  let usedAlias = false;
  for (const [index, segment] of segments.entries()) {
    const result = validateSegment(segment);
    if (!result.isValid) return invalid(`Passage ${index + 1}: ${result.error}`);
    passages.push(result.passage);
    usedAlias ||= result.usedAlias;
  }

  const normalizedReference = passages.map(formatPassage).join('; ');
  if (usedAlias) {
    return invalid(`Use the app’s canonical book name: “${normalizedReference}”.`, normalizedReference);
  }

  return { isValid: true, normalizedReference, reference: { passages } };
}

export function getFirstChapterFromScriptureReference(scriptureRef?: string) {
  if (!scriptureRef) return null;
  const validation = validateScriptureReference(scriptureRef);
  if (!validation.isValid) return null;
  const passage = validation.reference.passages[0];
  return { book: passage.book, chapter: passage.startChapter };
}

export function getFirstVerseReference(scriptureRef: string) {
  const validation = validateScriptureReference(scriptureRef);
  if (!validation.isValid) return null;
  const passage = validation.reference.passages[0];
  return `${passage.book} ${passage.startChapter}:${passage.startVerse ?? 1}`;
}

export function getChapterCount(book: string) {
  return bookByKey.get(book.toLowerCase())?.chapters ?? 1;
}
