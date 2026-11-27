/**
 * Shared Scripture-reference parsing for reader navigation and formatted content.
 *
 * This deliberately validates book names and chapter bounds, but not verse counts:
 * the KJV reader/provider remains the authority for the passage text.
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

export type ScriptureReferenceValidation =
  | { isValid: true; normalizedReference: string; passages: ScripturePassage[] }
  | { isValid: false; error: string };

export type ScriptureTextToken = {
  text: string;
  reference?: string;
};

const bookByKey = new Map(BIBLE_BOOKS.map(([book, chapters]) => [book.toLowerCase(), { book, chapters }]));
const bookPattern = BIBLE_BOOKS
  .map(([book]) => book.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+'))
  .sort((left, right) => right.length - left.length)
  .join('|');

// Capture the separator separately so punctuation and whitespace remain visible text.
const referenceInTextPattern = new RegExp(
  `(^|[^A-Za-z0-9]\\s*)((?:${bookPattern})\\s+\\d+(?::\\d+(?:\\s*[-–—]\\s*\\d+)?)?(?:\\s*[-–—]\\s*\\d+)?)(?![A-Za-z0-9:–—-])`,
  'gi',
);

function tidy(value: string) {
  return value.trim().replace(/[–—]/g, '-').replace(/\s+/g, ' ');
}

function formatPassage(passage: ScripturePassage) {
  const start = `${passage.book} ${passage.startChapter}${passage.startVerse ? `:${passage.startVerse}` : ''}`;
  if (passage.endChapter === undefined && passage.endVerse === undefined) return start;
  return `${start}-${passage.startVerse === undefined ? passage.endChapter : passage.endVerse}`;
}

function invalid(error: string): ScriptureReferenceValidation {
  return { isValid: false, error };
}

function validateSegment(segment: string): ScriptureReferenceValidation {
  const match = segment.match(/^(.+?)\s+(\d+)(?::(\d+))?(?:\s*-\s*(\d+))?$/);
  if (!match) return invalid('Use a recognised Bible book and chapter, chapter range, or same-chapter verse range.');

  const [, enteredBook, startChapterText, startVerseText, endText] = match;
  const resolvedBook = bookByKey.get(enteredBook.trim().toLowerCase());
  if (!resolvedBook) return invalid(`“${enteredBook.trim()}” is not a recognised Bible book.`);

  const startChapter = Number(startChapterText);
  const startVerse = startVerseText ? Number(startVerseText) : undefined;
  const end = endText ? Number(endText) : undefined;
  if (!Number.isSafeInteger(startChapter) || startChapter < 1 || startChapter > resolvedBook.chapters) {
    return invalid(`${resolvedBook.book} has ${resolvedBook.chapters} chapter${resolvedBook.chapters === 1 ? '' : 's'}; check the starting chapter.`);
  }
  if (startVerse !== undefined && (!Number.isSafeInteger(startVerse) || startVerse < 1)) {
    return invalid('Verse numbers must be positive whole numbers.');
  }
  if (startVerse === undefined) {
    if (end !== undefined && (!Number.isSafeInteger(end) || end < startChapter || end > resolvedBook.chapters)) {
      return invalid(`Check the ending chapter for ${resolvedBook.book}.`);
    }
    const passage: ScripturePassage = { book: resolvedBook.book, startChapter, ...(end === undefined ? {} : { endChapter: end }) };
    return { isValid: true, normalizedReference: formatPassage(passage), passages: [passage] };
  }
  if (end !== undefined && (!Number.isSafeInteger(end) || end < startVerse)) {
    return invalid('The ending verse must be a positive number after the starting verse.');
  }
  const passage: ScripturePassage = { book: resolvedBook.book, startChapter, startVerse, ...(end === undefined ? {} : { endVerse: end }) };
  return { isValid: true, normalizedReference: formatPassage(passage), passages: [passage] };
}

/** Validates canonical single or semicolon-separated Bible references. */
export function validateScriptureReference(input: string): ScriptureReferenceValidation {
  const value = tidy(input);
  if (!value) return invalid('Enter a Bible book and chapter, for example “John 3”.');
  const segments = value.split(';').map(tidy);
  if (segments.some((segment) => !segment)) return invalid('Separate multiple passages with one semicolon.');

  const passages: ScripturePassage[] = [];
  for (const segment of segments) {
    const result = validateSegment(segment);
    if (!result.isValid) return result;
    passages.push(...result.passages);
  }
  return { isValid: true, normalizedReference: passages.map(formatPassage).join('; '), passages };
}

export function getFirstPassageFromScriptureReference(reference?: string) {
  if (!reference) return null;
  const result = validateScriptureReference(reference);
  if (!result.isValid) return null;
  const passage = result.passages[0];
  return { book: passage.book, chapter: passage.startChapter, verse: passage.startVerse };
}

export function getChapterCount(book: string) {
  return bookByKey.get(book.toLowerCase())?.chapters ?? 1;
}

/**
 * Splits ordinary rich-text content into plain and clickable Scripture tokens.
 * Only complete, canonical, validated references become links; ambiguous prose stays text.
 */
export function tokenizeScriptureReferences(value: string): ScriptureTextToken[] {
  const tokens: ScriptureTextToken[] = [];
  let cursor = 0;
  referenceInTextPattern.lastIndex = 0;

  for (let match = referenceInTextPattern.exec(value); match; match = referenceInTextPattern.exec(value)) {
    const separator = match[1] || '';
    const candidate = match[2];
    const candidateStart = match.index + separator.length;
    if (candidateStart > cursor) tokens.push({ text: value.slice(cursor, candidateStart) });

    const validation = validateScriptureReference(candidate);
    if (validation.isValid) {
      tokens.push({ text: candidate, reference: validation.normalizedReference });
    } else {
      tokens.push({ text: candidate });
    }
    cursor = candidateStart + candidate.length;
  }

  if (cursor < value.length || !tokens.length) tokens.push({ text: value.slice(cursor) });
  return tokens;
}
