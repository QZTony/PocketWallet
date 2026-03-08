import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useI18n } from '@/i18n/context';
import { SUPPORTED_LOCALES, SupportedLocale } from '@/i18n/index';
import { colors } from '@/constants/theme';

const FLAG_EMOJI: Record<SupportedLocale, string> = {
  en: '🇺🇸',
  zh: '🇨🇳',
  ja: '🇯🇵',
  ko: '🇰🇷',
};

export default function LanguagePage() {
  const router = useRouter();
  const { locale, setLocale, t } = useI18n();

  const handleSelect = async (lang: SupportedLocale) => {
    await setLocale(lang);
    router.back();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('language.title')}</Text>

      {SUPPORTED_LOCALES.map((lang) => {
        const isActive = locale === lang;
        return (
          <TouchableOpacity
            key={lang}
            style={[styles.langRow, isActive && styles.langRowActive]}
            onPress={() => handleSelect(lang)}
          >
            <Text style={styles.flag}>{FLAG_EMOJI[lang]}</Text>
            <Text style={[styles.langLabel, isActive && styles.langLabelActive]}>
              {t(`language.${lang}`)}
            </Text>
            {isActive && (
              <IconButton icon="check" size={20} iconColor={colors.accent} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 24,
  },
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  langRowActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
  },
  flag: {
    fontSize: 28,
    marginRight: 16,
  },
  langLabel: {
    fontSize: 17,
    color: colors.text,
    flex: 1,
    fontWeight: '500',
  },
  langLabelActive: {
    color: colors.accent,
    fontWeight: 'bold',
  },
});
