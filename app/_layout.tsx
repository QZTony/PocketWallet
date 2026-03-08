import { Stack } from 'expo-router';
import { PaperProvider, MD3DarkTheme } from 'react-native-paper';
import { colors } from '@/constants/theme';
import { I18nProvider, useI18n } from '@/i18n/context';

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: colors.accent,
    background: colors.bg,
    surface: colors.card,
    surfaceVariant: colors.bgTertiary,
    onSurface: colors.text,
    onBackground: colors.text,
    outline: colors.inputBorder,
    elevation: {
      level0: colors.bg,
      level1: colors.card,
      level2: colors.bgSecondary,
      level3: colors.bgTertiary,
      level4: colors.surface,
      level5: colors.surface,
    },
  },
};

const screenOptions = {
  headerStyle: { backgroundColor: colors.bg },
  headerTintColor: colors.text,
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.bg },
};

function AppStack() {
  const { t } = useI18n();

  return (
    <Stack screenOptions={screenOptions}>
      <Stack.Screen name="index" options={{ title: t('nav.importWallet') }} />
      <Stack.Screen name="biometric-setup" options={{ title: t('nav.biometricSetup'), headerShown: false }} />
      <Stack.Screen name="biometric-lock" options={{ title: t('nav.unlockWallet'), headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="send" options={{ title: t('nav.sendTokens') }} />
      <Stack.Screen name="receive" options={{ title: t('nav.receive') }} />
      <Stack.Screen name="nfts" options={{ title: t('nav.myNfts') }} />
      <Stack.Screen name="nft-detail" options={{ title: t('nav.nftDetails') }} />
      <Stack.Screen name="transactions" options={{ title: t('nav.transactionHistory') }} />
      <Stack.Screen name="transaction-detail" options={{ title: t('nav.transactionDetails') }} />
      <Stack.Screen name="biometric-settings" options={{ title: t('nav.biometricSettings') }} />
      <Stack.Screen name="language" options={{ title: t('nav.language') }} />
      <Stack.Screen name="wallet-manage" options={{ title: t('nav.walletManage') }} />
      <Stack.Screen name="rpc-settings" options={{ title: t('nav.rpcSettings') }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <I18nProvider>
      <PaperProvider theme={darkTheme}>
        <AppStack />
      </PaperProvider>
    </I18nProvider>
  );
}
