// theme.ts
// Single source of truth for colors, spacing, and type sizing.
// Keeps the five screens visually consistent and makes future screens
// easy to match without re-guessing hex values.

export const palette = {
  standard: {
    background: '#FDFCF0',
    surface: '#FFFFFF',
    primary: '#0B641A',       // ministry green - headings, primary actions
    primaryMuted: '#E7F3E8',
    accent: '#D4AF37',        // ministry gold - selected and celebratory accents
    accentDeep: '#9B7A13',
    accentSoft: '#F7EBC2',
    text: '#1A1A1A',
    textMuted: '#5A5A5A',
    border: '#0B641A',
    borderSoft: '#E3E0CE',
    danger: '#B22222',
  },
};

export function getColors() {
  return palette.standard;
}

export const spacing = {
  xs: 6,
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
};

export const radii = {
  sm: 8,
  md: 14,
  lg: 20,
};

// Base font sizes at 1x scale. Every screen should read from these
// instead of hardcoding numbers, so the text-size control on Profile
// affects the whole app.
export const baseFontSizes = {
  caption: 13,
  body: 17,
  bodyLarge: 19,
  subtitle: 21,
  title: 26,
  display: 30,
};

// Three-step scale is enough to matter without breaking layout.
// Stored as a plain multiplier so it is trivial to persist as a number.
export const TEXT_SCALES = {
  standard: 1,
  large: 1.15,
  extraLarge: 1.3,
} as const;

export type TextScaleKey = keyof typeof TEXT_SCALES;

export function scaledFont(base: number, scaleValue: number) {
  return Math.round(base * scaleValue);
}
