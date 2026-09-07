// AccessibilityContext.tsx
// Wrap the app (in App.tsx, inside your auth/navigation provider) with
// <AccessibilityProvider>. Every screen then reads colors and font
// sizes from useAccessibility() instead of hardcoding them, so the
// text-size and high-contrast controls on the Profile screen apply
// everywhere at once.

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import { supabase } from '../services/supabase';
import {
  getColors,
  baseFontSizes,
  TEXT_SCALES,
  TextScaleKey,
  scaledFont,
} from './theme';

type AccessibilityState = {
  loading: boolean;
  highContrast: boolean;
  textScaleKey: TextScaleKey;
  colors: ReturnType<typeof getColors>;
  fonts: Record<keyof typeof baseFontSizes, number>;
  setHighContrast: (value: boolean) => void;
  setTextScaleKey: (key: TextScaleKey) => void;
};

const AccessibilityContext = createContext<AccessibilityState | undefined>(
  undefined
);

export function AccessibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [highContrast, setHighContrastState] = useState(false);
  const [textScaleKey, setTextScaleKeyState] = useState<TextScaleKey>(
    'standard'
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('high_contrast, text_scale')
        .eq('id', user.id)
        .single();

      if (data?.high_contrast) setHighContrastState(true);
      if (data?.text_scale && data.text_scale in TEXT_SCALES) {
        setTextScaleKeyState(data.text_scale as TextScaleKey);
      }
      setLoading(false);
    })();
  }, []);

  const persist = useCallback(
    async (patch: { high_contrast?: boolean; text_scale?: TextScaleKey }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase.from('profiles').update(patch).eq('id', user.id);
    },
    []
  );

  const setHighContrast = useCallback(
    (value: boolean) => {
      setHighContrastState(value);
      persist({ high_contrast: value });
    },
    [persist]
  );

  const setTextScaleKey = useCallback(
    (key: TextScaleKey) => {
      setTextScaleKeyState(key);
      persist({ text_scale: key });
    },
    [persist]
  );

  const colors = useMemo(() => getColors(highContrast), [highContrast]);

  const fonts = useMemo(() => {
    const scaleValue = TEXT_SCALES[textScaleKey];
    const entries = Object.entries(baseFontSizes).map(([key, size]) => [
      key,
      scaledFont(size, scaleValue),
    ]);
    return Object.fromEntries(entries) as Record<
      keyof typeof baseFontSizes,
      number
    >;
  }, [textScaleKey]);

  return (
    <AccessibilityContext.Provider
      value={{
        loading,
        highContrast,
        textScaleKey,
        colors,
        fonts,
        setHighContrast,
        setTextScaleKey,
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
