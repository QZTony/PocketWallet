import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { loadSavedLocale, saveLocale, getCurrentLocale, t as translate, SupportedLocale } from './index';

interface I18nContextType {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => Promise<void>;
  t: (scope: string, options?: Record<string, any>) => string;
}

const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  setLocale: async () => {},
  t: translate,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>(getCurrentLocale());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadSavedLocale().then((saved) => {
      setLocaleState(saved);
      setReady(true);
    });
  }, []);

  const setLocale = useCallback(async (newLocale: SupportedLocale) => {
    await saveLocale(newLocale);
    setLocaleState(newLocale);
  }, []);

  const t = useCallback((scope: string, options?: Record<string, any>) => {
    return translate(scope, options);
  }, [locale]);

  if (!ready) return null;

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
