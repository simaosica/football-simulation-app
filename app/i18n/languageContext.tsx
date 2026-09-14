// app/i18n/languageContext.tsx
'use client';
import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from './translations';

export type Language = 'en' | 'pt';

export const languageFlags: Record<Language, string> = {
  en: '🇬🇧',
  pt: '🇵🇹'
};

type LanguageContextType = {
  lang: Language;
  t: (typeof translations)[Language];
  toggleLanguage: () => void;
  ready: boolean;
};

const languages: Language[] = ['en', 'pt'];

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>('en');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('lang') as Language | null;
    if (saved && languages.includes(saved)) setLang(saved);
    setReady(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('lang', lang);
  }, [lang]);

  const toggleLanguage = () => {
    setLang(prev => {
      const idx = languages.indexOf(prev);
      return languages[(idx + 1) % languages.length];
    });
  };

  return (
    <LanguageContext.Provider value={{ lang, t: translations[lang], toggleLanguage, ready }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}