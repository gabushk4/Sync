import i18n from '../i18n';
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGE_CODES } from './config';
import { setLuxonLocale } from './supported';

export async function initLocalization(language = DEFAULT_LANGUAGE) {
  const selectedLanguage = SUPPORTED_LANGUAGE_CODES.includes(language)
    ? language
    : DEFAULT_LANGUAGE;
  await applyLocale(selectedLanguage);
  return selectedLanguage;
}

export async function changeAppLocale(newLocale) {
  if (!SUPPORTED_LANGUAGE_CODES.includes(newLocale)) {
    throw new Error(`Unsupported language: ${newLocale}`);
  }
  await applyLocale(newLocale);
}

async function applyLocale(language) {
  setLuxonLocale(language);
  await i18n.changeLanguage(language);
}