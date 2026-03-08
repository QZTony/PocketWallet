import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, Button, Card, Switch, List, Divider } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useI18n } from '@/i18n/context';
import * as biometricService from '@/services/biometricService';
import { colors } from '@/constants/theme';

export default function BiometricSetup() {
  const { t } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [biometricStatus, setBiometricStatus] = useState<any>(null);
  const [enabling, setEnabling] = useState(false);

  useEffect(() => {
    checkBiometricStatus();
  }, []);

  const checkBiometricStatus = async () => {
    try {
      const status = await biometricService.getBiometricStatus();
      setBiometricStatus(status);
    } catch (error) {
      console.error('Failed to check biometric status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEnableBiometric = async () => {
    try {
      setEnabling(true);

      const success = await biometricService.enableBiometric();

      if (success) {
        Alert.alert(
          t('common.success'),
          t('biometricSetup.enableSuccess'),
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(tabs)'),
            },
          ]
        );
      } else {
        Alert.alert(t('common.error'), t('biometricSetup.enableFailed'));
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('biometricSetup.enableFailed'));
    } finally {
      setEnabling(false);
    }
  };

  const handleSkip = async () => {
    try {
      await biometricService.markBiometricSetupComplete();
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Failed to skip biometric setup:', error);
      router.replace('/(tabs)');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={{ color: colors.textSecondary }}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (!biometricStatus?.supported) {
    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.title}>
              {t('biometricSetup.notSupported')}
            </Text>
            <Text style={styles.description}>
              {t('biometricSetup.notSupportedDesc')}
            </Text>
          </Card.Content>
        </Card>
        <Button mode="contained" onPress={handleSkip} style={styles.button} buttonColor={colors.buttonPrimary} textColor={colors.buttonPrimaryText}>
          {t('biometricSetup.continue')}
        </Button>
      </View>
    );
  }

  if (!biometricStatus?.enrolled) {
    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.title}>
              {t('biometricSetup.notEnrolled')}
            </Text>
            <Text style={styles.description}>
              {t('biometricSetup.notEnrolledDesc')}
            </Text>
          </Card.Content>
        </Card>
        <Button mode="contained" onPress={handleSkip} style={styles.button} buttonColor={colors.buttonPrimary} textColor={colors.buttonPrimaryText}>
          {t('biometricSetup.skipForNow')}
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="headlineSmall" style={styles.title}>
            {t('biometricSetup.secureWallet')}
          </Text>
          <Text style={styles.description}>
            {t('biometricSetup.secureWalletDesc')}
          </Text>

          <View style={styles.featureList}>
            <List.Item
              title={t('biometricSetup.quickAccess')}
              description={t('biometricSetup.quickAccessDesc')}
              titleStyle={{ color: colors.text }}
              descriptionStyle={{ color: colors.textSecondary }}
              left={(props) => <List.Icon {...props} icon="flash" color={colors.accent} />}
            />
            <List.Item
              title={t('biometricSetup.enhancedSecurity')}
              description={t('biometricSetup.enhancedSecurityDesc')}
              titleStyle={{ color: colors.text }}
              descriptionStyle={{ color: colors.textSecondary }}
              left={(props) => <List.Icon {...props} icon="shield-check" color={colors.accent} />}
            />
            <List.Item
              title={t('biometricSetup.convenient')}
              description={t('biometricSetup.convenientDesc')}
              titleStyle={{ color: colors.text }}
              descriptionStyle={{ color: colors.textSecondary }}
              left={(props) => <List.Icon {...props} icon="hand-okay" color={colors.accent} />}
            />
          </View>

          <Divider style={styles.divider} />

          <View style={styles.supportedTypes}>
            <Text variant="titleSmall" style={styles.subtitle}>
              {t('biometricSetup.availableOnDevice')}
            </Text>
            {biometricStatus?.types.map((type: string, index: number) => (
              <Text key={index} style={styles.typeText}>
                • {type}
              </Text>
            ))}
          </View>
        </Card.Content>
      </Card>

      <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={handleEnableBiometric}
          loading={enabling}
          disabled={enabling}
          style={styles.button}
          buttonColor={colors.accent}
          textColor="#000"
        >
          {t('biometricSetup.enableBiometric')}
        </Button>

        <Button
          mode="text"
          onPress={handleSkip}
          disabled={enabling}
          style={styles.skipButton}
          textColor={colors.textSecondary}
        >
          {t('biometricSetup.skipForNow')}
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: colors.bg,
    justifyContent: 'center',
  },
  card: {
    elevation: 0,
    marginBottom: 24,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
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
    marginBottom: 24,
    lineHeight: 20,
  },
  featureList: {
    marginVertical: 16,
  },
  divider: {
    marginVertical: 16,
    backgroundColor: colors.divider,
  },
  supportedTypes: {
    marginTop: 8,
  },
  subtitle: {
    fontWeight: '600',
    marginBottom: 8,
    color: colors.text,
  },
  typeText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 8,
    marginBottom: 4,
  },
  actions: {
    marginTop: 16,
  },
  button: {
    marginBottom: 12,
    borderRadius: 12,
  },
  skipButton: {
    marginTop: 8,
  },
});
