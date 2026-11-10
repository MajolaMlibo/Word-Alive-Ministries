// AccessibilityContext.tsx
// Wrap the app (in App.tsx, inside your auth/navigation provider) with
// <AccessibilityProvider>. Every screen then reads shared colors and base font
// sizes from useAccessibility() instead of hardcoding them.

import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { getColors, baseFontSizes, ColorScheme } from './theme';

type AccessibilityState = {
  colors: ReturnType<typeof getColors>;
  fonts: Record<keyof typeof baseFontSizes, number>;
  colorScheme: ColorScheme;
};

const AccessibilityContext = createContext<AccessibilityState | undefined>(
  undefined
);

export function AccessibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const systemColorScheme = useColorScheme();
  const colorScheme: ColorScheme = systemColorScheme === 'dark' ? 'dark' : 'light';
  const value = useMemo(
    () => ({
      colors: getColors(colorScheme),
      fonts: baseFontSizes,
      colorScheme,
    }),
    [colorScheme]
  );

  return (
    <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const ctx = useContext(AccessibilityContext);
  if (!ctx) {
    throw new Error(
      'useAccessibility must be used inside <AccessibilityProvider>'
    );
  }
  return ctx;
}
