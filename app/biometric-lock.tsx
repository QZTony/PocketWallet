import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, Card, Icon } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useI18n } from '@/i18n/context';
import * as biometricService from '@/services/biometricService';
import * as storageService from '@/services/storageService';
import { colors } from '@/constants/theme';

export default function BiometricLock() {
  const { t } = useI18n();
  const router = useRouter();
  const [authenticating, setAuthenticating] = useState(false);
  const [biometricTypes, setBiometricTypes] = useState<string[]>([]);

  useEffect(() => {
    checkBiometricAndAuthenticate();
  }, []);

  const checkBiometricAndAuthenticate = async () => {
    try {
      const hasWallet = await storageService.hasWallet();
      if (!hasWallet) {
        router.replace('/');
        return;
      }

      const enabled = await biometricService.isBiometricEnabled();
      if (!enabled) {
        router.replace('/(tabs)');
        return;
      }

      const types = await biometricService.getSupportedBiometricTypes();
      setBiometricTypes(types);

      await handleAuthenticate();
    } catch (error) {
      console.error('Failed to check biometric:', error);
      router.replace('/(tabs)');
    }
  };

  const handleAuthenticate = async () => {
    try {
      setAuthenticating(true);

      const result = await biometricService.unlockWalletWithBiometric();

      if (result.success) {
        router.replace('/(tabs)');
      } else {
        Alert.alert(t('biometricLock.authFailed'), result.error || t('biometricLock.tryAgain'));
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('biometricLock.authFailed'));
    } finally {
      setAuthenticating(false);
    }
  };

  const handleUsePassword = () => {
    Alert.alert(
      t('biometricLock.passwordTitle'),
      t('biometricLock.passwordNotImpl'),
      [{ text: 'OK' }]
    );
  };

  const getBiometricIcon = () => {
    if (biometricTypes.includes('Face ID')) {
      return 'face-recognition';
    } else if (biometricTypes.includes('Fingerprint')) {
      return 'fingerprint';
    } else if (biometricTypes.includes('Iris')) {
      return 'eye';
    }
    return 'lock';
  };

  const getBiometricLabel = () => {
    if (biometricTypes.includes('Face ID')) {
      return 'Face ID';
    } else if (biometricTypes.includes('Fingerprint')) {
      return 'Fingerprint';
    } else if (biometricTypes.includes('Iris')) {
      return 'Iris';
    }
    return 'Biometric';
  };

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content style={styles.content}>
          <View style={styles.iconContainer}>
            <Icon source={getBiometricIcon()} size={80} color={colors.accent} />
          </View>

          <Text variant="headlineMedium" style={styles.title}>
            {t('biometricLock.unlockWallet')}
          </Text>

          <Text style={styles.description}>
            {t('biometricLock.useToAccess', { type: getBiometricLabel() })}
          </Text>

          <Button
            mode="contained"
            onPress={handleAuthenticate}
            loading={authenticating}
            disabled={authenticating}
            style={styles.button}
            icon={getBiometricIcon()}
            buttonColor={colors.buttonPrimary}
            textColor={colors.buttonPrimaryText}
          >
            {t('biometricLock.authenticateWith', { type: getBiometricLabel() })}
          </Button>

          <Button
            mode="text"
            onPress={handleUsePassword}
            disabled={authenticating}
            style={styles.textButton}
            textColor={colors.textSecondary}
          >
            {t('biometricLock.usePassword')}
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.bg,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    elevation: 0,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
  },
  content: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  iconContainer: {
    marginBottom: 24,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
    color: colors.text,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 32,
  },
  button: {
    width: '100%',
    marginBottom: 12,
    borderRadius: 12,
  },
  textButton: {
    marginTop: 8,
  },
});
