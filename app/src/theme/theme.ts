// theme.ts
// Single source of truth for colors, spacing, and type sizing.
// Keeps the five screens visually consistent and makes future screens
// easy to match without re-guessing hex values.

export const palette = {
  standard: {
    background: '#FDFCF0',
    surface: '#FFFFFF',
    primary: '#004D00',       // deep green - headings, primary actions
    primaryMuted: '#E6F0E6',
    accent: '#E6C200',        // gold - primary CTA fills
    accentDeep: '#B8860B',    // darker gold - badges, secondary emphasis
    accentSoft: '#F5DEB3',    // pale gold - secondary buttons
    text: '#1A1A1A',
    textMuted: '#5A5A5A',
    border: '#004D00',
    borderSoft: '#E3E0CE',
    danger: '#B22222',
  },
  // High contrast is not "dark mode" - it is the same palette pushed to
  // stronger separation between text/background/borders, which is what
  // actually helps low-vision and older readers.
  highContrast: {
    background: '#FFFFFF',
    surface: '#FFFFFF',
    primary: '#00330A',
    primaryMuted: '#D7E8D9',
    accent: '#8A6A00',
    accentDeep: '#7A5300',
    accentSoft: '#EDEDED',
    text: '#000000',
    textMuted: '#2B2B2B',
    border: '#000000',
    borderSoft: '#000000',
    danger: '#8B0000',
  },
};

export function getColors(highContrast: boolean) {
  return highContrast ? palette.highContrast : palette.standard;
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
