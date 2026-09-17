/**
 * LanguageContext — Global context for language state and translation.
 * Persists language choice locally in AsyncStorage.
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { translations, type Language, type TranslationKey } from './translations';

const LANGUAGE_STORAGE_KEY = '@matsyamitra_language';

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: TranslationKey, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'en',
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key, fallback) => fallback || key,
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    // Load persisted language from storage
    AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
      .then((saved) => {
        if (saved === 'en' || saved === 'kn') {
          setLanguageState(saved);
        }
      })
      .catch((err) => {
        console.warn('Failed to load saved language:', err);
      });
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang).catch((err) => {
      console.warn('Failed to persist language:', err);
    });
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguageState((prev) => {
      const next: Language = prev === 'en' ? 'kn' : 'en';
      AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, next).catch((err) => {
        console.warn('Failed to persist language:', err);
      });
      return next;
    });
  }, []);

  const t = useCallback(
    (key: TranslationKey, fallback?: string): string => {
      const langDict = translations[language] || translations.en;
      if (key in langDict) {
        return langDict[key];
      }
      return fallback || key;
    },
    [language],
  );

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
