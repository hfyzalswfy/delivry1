import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import en from './locales/en.json';
import ar from './locales/ar.json';

const LANG_KEY = '@full_delivery_language';

const resources = {
  en: { translation: en },
  ar: { translation: ar },
};

const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  init: () => {},
  detect: async (callback: (lang: string) => void) => {
    try {
      const stored = await AsyncStorage.getItem(LANG_KEY);
      if (stored) { callback(stored); return; }
    } catch {}
    const deviceLang = getLocales()[0]?.languageCode ?? 'en';
    callback(deviceLang === 'ar' ? 'ar' : 'en');
  },
  cacheUserLanguage: async (lang: string) => {
    try { await AsyncStorage.setItem(LANG_KEY, lang); } catch {}
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    supportedLngs: ['en', 'ar'],
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

export default i18n;
