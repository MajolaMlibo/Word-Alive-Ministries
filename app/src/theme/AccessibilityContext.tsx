// AccessibilityContext.tsx
// Wrap the app (in App.tsx, inside your auth/navigation provider) with
// <AccessibilityProvider>. Every screen then reads shared colors and base font
// sizes from useAccessibility() instead of hardcoding them.

import React, { createContext, useContext } from 'react';
import { getColors, baseFontSizes } from './theme';

type AccessibilityState = {
  colors: ReturnType<typeof getColors>;
  fonts: Record<keyof typeof baseFontSizes, number>;
};

const AccessibilityContext = createContext<AccessibilityState | undefined>(
  undefined
);

export function AccessibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AccessibilityContext.Provider
      value={{
        colors: getColors(),
        fonts: baseFontSizes,
      }}
    >
      {children}
    </AccessibilityContext.Provider>
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
