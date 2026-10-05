import { generateTheme, ThemeColors } from '@/themes/generateTheme';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Same package as the ThemeProvider in app/_layout.tsx that receives this theme.
import { DarkTheme, DefaultTheme } from 'expo-router/react-navigation';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import { useSettings } from './contexteSettings';
import { DEFAULT_HUE } from '@/constants/Colors';

type PaletteContextType = {
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
  const scheme = useColorScheme() ?? 'light';
  const { settings } = useSettings()

  const [hue, setHueState] = useState(settings.theme || DEFAULT_HUE);

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
  
  const colors = generateTheme(hue, scheme === 'dark' ? 'dark' : 'light');
  const navTheme = buildNavTheme(hue, scheme === 'dark' ? 'dark' : 'light');

  return (
    <PaletteContext.Provider value={{ colors, hue, setHue, navTheme }}>
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