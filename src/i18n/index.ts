import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './locales/en';
import zh from './locales/zh';
import ja from './locales/ja';
import ko from './locales/ko';

export const SUPPORTED_LOCALES = ['en', 'zh', 'ja', 'ko'] as const;
export type SupportedLocale = typeof SUPPORTED_LOCALES[number];

const LOCALE_STORAGE_KEY = 'app_locale';

const i18n = new I18n({ en, zh, ja, ko });

i18n.enableFallback = true;
i18n.defaultLocale = 'en';

const deviceLocale = Localization.getLocales()?.[0]?.languageCode || 'en';
i18n.locale = SUPPORTED_LOCALES.includes(deviceLocale as SupportedLocale) ? deviceLocale : 'en';

export async function loadSavedLocale(): Promise<SupportedLocale> {
  try {
    const saved = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
    if (saved && SUPPORTED_LOCALES.includes(saved as SupportedLocale)) {
      i18n.locale = saved;
      return saved as SupportedLocale;
    }
  } catch {}
  return i18n.locale as SupportedLocale;
}

export async function saveLocale(locale: SupportedLocale): Promise<void> {
  i18n.locale = locale;
  await AsyncStorage.setItem(LOCALE_STORAGE_KEY, locale);
}

export function getCurrentLocale(): SupportedLocale {
  return i18n.locale as SupportedLocale;
}

export function t(scope: string, options?: Record<string, any>): string {
  return i18n.t(scope, options);
}

export default i18n;
