import { generateTheme, ThemeColors } from '@/themes/generateTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, DefaultTheme } from '@react-navigation/native';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { ColorValue, useColorScheme } from 'react-native';

type PaletteContextType = {
  warning: ColorValue | undefined;
  card: ColorValue | undefined;
  secondary: ColorValue | undefined;
  error: ColorValue | undefined;
  text: ColorValue | undefined;
  background: ColorValue | undefined;
  colors: ThemeColors;
  hue: number;
  setHue: (h: number) => void;
  navTheme: typeof DefaultTheme;
};

const PaletteContext = createContext<PaletteContextType | null>(null);

// React Navigation theme builder
function buildNavTheme(hue: number, scheme: 'light' | 'dark') {
  const colors = generateTheme(hue, scheme);
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;

  return {
    ...base,
    colors: {
      ...base.colors,
      ...colors,
    },
  };
}

// Provider
export function PaletteProvider({ children }: { children: ReactNode }) {
  const scheme: 'light' | 'dark' = useColorScheme() === 'dark' ? 'dark' : 'light';
  const [hue, setHueState] = useState(260);

  // gets saved hue
  useEffect(() => {
    AsyncStorage.getItem('hue').then(val => {
      if (val) setHueState(Number(val));
    });
  }, []);

  // saves hue on change
  const setHue = (h: number) => {
    setHueState(h);
    AsyncStorage.setItem('hue', String(h));
  };
  
  const colors = generateTheme(hue, scheme);
  const navTheme = buildNavTheme(hue, scheme);

  return (
    <PaletteContext.Provider
      value={{
        colors,
        hue,
        setHue,
        navTheme,
        secondary: colors.secondary,
        error: colors.error,
        warning: colors.warning,
        card: colors.card,
        text: colors.text,
        background: colors.background,
      }}
    >
      {children}
    </PaletteContext.Provider>
  );
}

// Hook
export function usePalette(): PaletteContextType {
  const ctx = useContext(PaletteContext);
  if (!ctx) throw new Error('usePalette doit être utilisé dans un PaletteProvider');
  return ctx;
}