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
  dark: {
    background: '#101713',
    surface: '#1B2820',
    primary: '#169136',
    primaryMuted: '#23442D',
    accent: '#E1BC45',
    accentDeep: '#F3D270',
    accentSoft: '#4A3D17',
    text: '#F6F8F3',
    textMuted: '#C2CCC4',
    border: '#46B964',
    borderSoft: '#405549',
    danger: '#FF8A80',
  },
};

export type ColorScheme = 'light' | 'dark';
export type AppColors = (typeof palette)[keyof typeof palette];

export function getColors(colorScheme: ColorScheme = 'light'): AppColors {
  return colorScheme === 'dark' ? palette.dark : palette.standard;
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

// Base font sizes. React Native keeps normal device font scaling enabled.
export const baseFontSizes = {
  caption: 13,
  body: 17,
  bodyLarge: 19,
  subtitle: 21,
  title: 26,
  display: 30,
};
