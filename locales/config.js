export const SUPPORTED_LANGUAGES = {
  en: {
    labelKey: 'english',
    locale: 'en-CA',
    allowedLocales: ['en', 'en-CA', 'en-US'],
  },
  fr: {
    labelKey: 'french',
    locale: 'fr-CA',
    allowedLocales: ['fr', 'fr-CA', 'fr-FR'],
  }
};

export const DEFAULT_LANGUAGE = 'fr';

export const SUPPORTED_LANGUAGE_CODES = Object.keys(SUPPORTED_LANGUAGES);