import * as Localization from 'expo-localization';
import { Settings } from 'luxon';
import {
    DEFAULT_LANGUAGE,
    SUPPORTED_LANGUAGES,
    SUPPORTED_LANGUAGE_CODES,
} from './config';

/**
 * Compares the device locales against supported ones and returns the best match.
 */
export function getBestAvailableLocale() {
  const deviceLocales = Localization.getLocales();
  
  for (const locale of deviceLocales) {
    const language = SUPPORTED_LANGUAGE_CODES.find(code =>
      SUPPORTED_LANGUAGES[code].allowedLocales.some(
        allowed => allowed.toLowerCase() === locale.languageTag.toLowerCase(),
      ),
    );
    if (language) return language;
  }

  return DEFAULT_LANGUAGE;
}

export function getCurrentDateLocale() {
  const language = i18n.resolvedLanguage || i18n.language || 'fr';
  return SUPPORTED_LANGUAGES[language]?.locale || 'fr-CA';
}

/**
 * Configure Luxon to globally use a specific locale string
 */
export function setLuxonLocale(language) {
  Settings.defaultLocale = SUPPORTED_LANGUAGES[language].locale;
}