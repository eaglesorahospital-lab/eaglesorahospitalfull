import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from './locales/en.json';
import hiTranslations from './locales/hi.json';
import mrTranslations from './locales/mr.json';

const LANGUAGE_STORAGE_KEY = 'eglesora_language';

// Read saved language or default to English
const savedLanguage = typeof window !== 'undefined'
  ? localStorage.getItem(LANGUAGE_STORAGE_KEY) || 'en'
  : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: enTranslations },
      hi: { translation: hiTranslations },
      mr: { translation: mrTranslations },
    },
    lng: savedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

// Synchronize language changes with localStorage
i18n.on('languageChanged', (lng) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
    // Update HTML lang attribute for accessibility
    document.documentElement.lang = lng;
  }
});

if (typeof window !== 'undefined') {
  document.documentElement.lang = savedLanguage;
}

export default i18n;
