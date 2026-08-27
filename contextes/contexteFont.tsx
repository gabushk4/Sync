import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFonts } from 'expo-font';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

type Fonts = {
    title: string;
    body: string;
    number: string;
}

type FontContextType = {
  fonts: Fonts;
  setFontFamily: (fonts: Fonts) => void;
  fontsLoaded: boolean;
};

const DEFAULT_FONTS = {
    title: 'Karla-Medium',
    body: 'Karla-Light',
    number: 'Nunito-Light',
};

// Fonts bundlées dans l'app
const BUNDLED_FONTS: Record<string, any> = {
    KarlaMedium: require('@/assets/fonts/Karla-Regular.ttf'),
    KarlaLight: require('@/assets/fonts/Karla-Light.ttf'),
    NunitoLight: require('@/assets/fonts/Nunito-Light.ttf'),
};

const FontContext = createContext<FontContextType | null>(null);

export function FontProvider({ children }: { children: ReactNode }) {
  const [fonts, setFontFamilyState] = useState(DEFAULT_FONTS);
  const [fontsLoaded] = useFonts(BUNDLED_FONTS);

  // Charger la préférence sauvegardée
  useEffect(() => {
    AsyncStorage.getItem('fonts').then(val => {
      if (val) {
        try {
          const parsed = JSON.parse(val) as Fonts;
          setFontFamilyState(parsed);
        } catch (e) {
          // Ignore JSON parse error and keep the default fonts
        }
      }
    });
  }, []);

  const setFontFamily = (font: Fonts) => {
    setFontFamilyState(font);
    AsyncStorage.setItem('fonts', JSON.stringify(font));
  };

  return (
    <FontContext.Provider value={{ fonts, setFontFamily, fontsLoaded }}>
      {children}
    </FontContext.Provider>
  );
}

export function useFont(): FontContextType {
  const ctx = useContext(FontContext);
  if (!ctx) throw new Error('useFont doit être utilisé dans un FontProvider');
  return ctx;
}