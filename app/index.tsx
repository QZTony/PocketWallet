import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Text, SegmentedButtons, ActivityIndicator } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useI18n } from '@/i18n/context';
import * as walletService from '@/services/walletService';
import * as storageService from '@/services/storageService';
import * as biometricService from '@/services/biometricService';
import { colors } from '@/constants/theme';

export default function ImportWallet() {
  const router = useRouter();
  const { t } = useI18n();
  const [importType, setImportType] = useState('mnemonic');
  const [mnemonic, setMnemonic] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useFocusEffect(
    React.useCallback(() => {
      checkExistingWallet();
    }, [])
  );

  const checkExistingWallet = async () => {
    try {
      setChecking(true);
      const hasWallet = await storageService.hasWallet();
      console.log('[Import] Has wallet:', hasWallet);
      if (hasWallet) {
        console.log('[Import] Redirecting to home');
        router.replace('/(tabs)');
      } else {
        console.log('[Import] No wallet, showing import screen');
      }
    } catch (error) {
      console.error('[Import] Failed to check wallet:', error);
    } finally {
      setChecking(false);
    }
  };

  const handleImport = async () => {
    if (loading) return;

    try {
      setLoading(true);

      if (importType === 'mnemonic') {
        if (!mnemonic.trim()) {
          Alert.alert(t('common.error'), t('index.mnemonicError'));
          return;
        }

        const words = mnemonic.trim().split(/\s+/);
        if (words.length !== 12 && words.length !== 24) {
          Alert.alert(t('common.error'), t('index.mnemonicLengthError'));
          return;
        }

        await walletService.importFromMnemonic(mnemonic.trim());
        Alert.alert(t('common.success'), t('index.importSuccess'));

        await checkAndPromptBiometric();
      } else {
        if (!privateKey.trim()) {
          Alert.alert(t('common.error'), t('index.privateKeyError'));
          return;
        }

        await walletService.importFromPrivateKey(privateKey.trim());
        Alert.alert(t('common.success'), t('index.importSuccess'));

        await checkAndPromptBiometric();
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('index.importFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateNew = async () => {
    try {
      setLoading(true);
      const { wallet, mnemonic: newMnemonic } = await walletService.generateNewWallet();

      Alert.alert(
        t('index.newWalletTitle'),
        `${t('index.newWalletMsg')}\n\n${newMnemonic}\n\n${t('index.newWalletPublicKey')} ${wallet.publicKey.toBase58()}`,
        [
          {
            text: t('index.newWalletSaved'),
            onPress: async () => {
              await checkAndPromptBiometric();
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('index.generateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const checkAndPromptBiometric = async () => {
    try {
      const setupComplete = await biometricService.isBiometricSetupComplete();

      if (setupComplete) {
        router.replace('/(tabs)');
        return;
      }

      const status = await biometricService.getBiometricStatus();

      if (status.supported && status.enrolled) {
        router.replace('/biometric-setup');
      } else {
        await biometricService.markBiometricSetupComplete();
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Failed to check biometric:', error);
      router.replace('/(tabs)');
    }
  };

  if (checking) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text variant="headlineMedium" style={styles.title}>
          {t('index.title')}
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {t('index.subtitle')}
        </Text>

        <SegmentedButtons
          value={importType}
          onValueChange={setImportType}
          buttons={[
            { value: 'mnemonic', label: t('index.mnemonic') },
            { value: 'privateKey', label: t('index.privateKey') },
          ]}
          style={styles.segmentedButtons}
        />

        {importType === 'mnemonic' ? (
          <TextInput
            label={t('index.mnemonicLabel')}
            value={mnemonic}
            onChangeText={setMnemonic}
            mode="outlined"
            multiline
            numberOfLines={4}
            style={styles.input}
            placeholder={t('index.mnemonicPlaceholder')}
            textColor={colors.text}
            placeholderTextColor={colors.textTertiary}
            outlineColor={colors.inputBorder}
            activeOutlineColor={colors.accent}
          />
        ) : (
          <TextInput
            label={t('index.privateKeyLabel')}
            value={privateKey}
            onChangeText={setPrivateKey}
            mode="outlined"
            multiline
            numberOfLines={3}
            style={styles.input}
            placeholder={t('index.privateKeyPlaceholder')}
            secureTextEntry
            textColor={colors.text}
            placeholderTextColor={colors.textTertiary}
            outlineColor={colors.inputBorder}
            activeOutlineColor={colors.accent}
          />
        )}

        <Button
          mode="contained"
          onPress={handleImport}
          loading={loading}
          disabled={loading}
          style={styles.button}
          buttonColor={colors.buttonPrimary}
          textColor={colors.buttonPrimaryText}
        >
          {t('index.importWallet')}
        </Button>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>{t('common.or')}</Text>
          <View style={styles.dividerLine} />
        </View>

        <Button
          mode="outlined"
          onPress={handleGenerateNew}
          loading={loading}
          disabled={loading}
          style={styles.outlineButton}
          textColor={colors.text}
        >
          {t('index.generateNew')}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  content: {
    padding: 20,
  },
  title: {
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    color: colors.textSecondary,
  },
  segmentedButtons: {
    marginBottom: 20,
  },
  input: {
    marginBottom: 16,
    backgroundColor: colors.bgSecondary,
  },
  button: {
    marginTop: 8,
    borderRadius: 12,
  },
  outlineButton: {
    marginTop: 8,
    borderRadius: 12,
    borderColor: colors.buttonOutlineBorder,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  dividerText: {
    marginHorizontal: 16,
    color: colors.textSecondary,
  },
});
