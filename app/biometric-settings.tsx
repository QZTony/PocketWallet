import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Card, Switch, List, Button, Divider } from 'react-native-paper';
import { useI18n } from '@/i18n/context';
import * as biometricService from '@/services/biometricService';
import { colors } from '@/constants/theme';

export default function BiometricSettings() {
  const { t } = useI18n();
  const [biometricStatus, setBiometricStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    loadBiometricStatus();
  }, []);

  const loadBiometricStatus = async () => {
    try {
      const status = await biometricService.getBiometricStatus();
      setBiometricStatus(status);
    } catch (error) {
      console.error('Failed to load biometric status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBiometric = async (value: boolean) => {
    try {
      setToggling(true);

      if (value) {
        const success = await biometricService.enableBiometric();

        if (success) {
          Alert.alert(t('common.success'), t('biometricSettings.enableSuccess'));
          await loadBiometricStatus();
        } else {
          Alert.alert(t('common.error'), t('biometricSettings.enableFailed'));
        }
      } else {
        Alert.alert(
          t('biometricSettings.disableTitle'),
          t('biometricSettings.disableConfirm'),
          [
            { text: t('common.cancel'), style: 'cancel' },
            {
              text: t('common.disable'),
              style: 'destructive',
              onPress: async () => {
                await biometricService.disableBiometric();
                Alert.alert(t('common.success'), t('biometricSettings.disableSuccess'));
                await loadBiometricStatus();
              },
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('biometricSettings.enableFailed'));
    } finally {
      setToggling(false);
    }
  };

  const handleTestBiometric = async () => {
    try {
      const result = await biometricService.authenticateWithBiometric('Test biometric authentication');

      if (result.success) {
        Alert.alert(t('common.success'), t('biometricSettings.testSuccess'));
      } else {
        Alert.alert(t('common.error'), result.error || t('biometricSettings.testFailed'));
      }
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('biometricSettings.testFailed'));
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={{ color: colors.textSecondary }}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleLarge" style={styles.title}>
            {t('biometricSettings.title')}
          </Text>

          <List.Item
            title={t('biometricSettings.enableBiometric')}
            titleStyle={{ color: colors.text }}
            description={
              biometricStatus?.enabled
                ? t('biometricSettings.enabled')
                : t('biometricSettings.disabled')
            }
            descriptionStyle={{ color: colors.textSecondary }}
            right={() => (
              <Switch
                value={biometricStatus?.enabled || false}
                onValueChange={handleToggleBiometric}
                disabled={
                  toggling ||
                  !biometricStatus?.supported ||
                  !biometricStatus?.enrolled
                }
                color={colors.accent}
              />
            )}
          />

          <Divider style={styles.divider} />

          <View style={styles.statusSection}>
            <Text variant="titleSmall" style={styles.sectionTitle}>
              {t('biometricSettings.deviceStatus')}
            </Text>

            <List.Item
              title={t('biometricSettings.hardwareSupport')}
              titleStyle={{ color: colors.text }}
              description={
                biometricStatus?.supported
                  ? t('biometricSettings.supported')
                  : t('biometricSettings.notSupported')
              }
              descriptionStyle={{ color: colors.textSecondary }}
              left={(props) => (
                <List.Icon
                  {...props}
                  icon={biometricStatus?.supported ? 'check-circle' : 'close-circle'}
                  color={biometricStatus?.supported ? colors.positive : colors.negative}
                />
              )}
            />

            <List.Item
              title={t('biometricSettings.enrolled')}
              titleStyle={{ color: colors.text }}
              description={
                biometricStatus?.enrolled
                  ? t('biometricSettings.enrolledDesc')
                  : t('biometricSettings.notEnrolled')
              }
              descriptionStyle={{ color: colors.textSecondary }}
              left={(props) => (
                <List.Icon
                  {...props}
                  icon={biometricStatus?.enrolled ? 'check-circle' : 'close-circle'}
                  color={biometricStatus?.enrolled ? colors.positive : colors.negative}
                />
              )}
            />

            {biometricStatus?.types && biometricStatus.types.length > 0 && (
              <List.Item
                title={t('biometricSettings.availableMethods')}
                titleStyle={{ color: colors.text }}
                description={biometricStatus.types.join(', ')}
                descriptionStyle={{ color: colors.textSecondary }}
                left={(props) => <List.Icon {...props} icon="information" color={colors.textSecondary} />}
              />
            )}
          </View>

          {biometricStatus?.enabled && (
            <>
              <Divider style={styles.divider} />

              <Button
                mode="outlined"
                onPress={handleTestBiometric}
                style={styles.testButton}
                icon="fingerprint"
                textColor={colors.text}
              >
                {t('biometricSettings.testBiometric')}
              </Button>
            </>
          )}
        </Card.Content>
      </Card>

      {!biometricStatus?.supported && (
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.infoTitle}>
              {t('biometricSettings.notSupportedTitle')}
            </Text>
            <Text style={styles.infoText}>
              {t('biometricSettings.notSupportedDesc')}
            </Text>
          </Card.Content>
        </Card>
      )}

      {biometricStatus?.supported && !biometricStatus?.enrolled && (
        <Card style={styles.infoCard}>
          <Card.Content>
            <Text variant="titleSmall" style={styles.infoTitle}>
              {t('biometricSettings.setupRequired')}
            </Text>
            <Text style={styles.infoText}>
              {t('biometricSettings.setupRequiredDesc')}
            </Text>
          </Card.Content>
        </Card>
      )}

      <Card style={styles.securityCard}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.securityTitle}>
            {t('biometricSettings.securityInfo')}
          </Text>
          <Text style={styles.securityText}>
            {t('biometricSettings.securityBullet1')}
          </Text>
          <Text style={styles.securityText}>
            {t('biometricSettings.securityBullet2')}
          </Text>
          <Text style={styles.securityText}>
            {t('biometricSettings.securityBullet3')}
          </Text>
          <Text style={styles.securityText}>
            {t('biometricSettings.securityBullet4')}
          </Text>
        </Card.Content>
      </Card>
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
  card: {
    margin: 16,
    elevation: 0,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 16,
    color: colors.text,
  },
  divider: {
    marginVertical: 16,
    backgroundColor: colors.divider,
  },
  statusSection: {
    marginTop: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 8,
    marginLeft: 16,
    color: colors.text,
  },
  testButton: {
    marginTop: 16,
    borderColor: colors.buttonOutlineBorder,
    borderRadius: 12,
  },
  infoCard: {
    margin: 16,
    marginTop: 8,
    backgroundColor: 'rgba(255,176,32,0.1)',
    borderColor: colors.warning,
    borderWidth: 1,
    elevation: 0,
  },
  infoTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: colors.warning,
  },
  infoText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  securityCard: {
    margin: 16,
    marginTop: 8,
    backgroundColor: 'rgba(0,212,170,0.08)',
    borderColor: colors.accent,
    borderWidth: 1,
    elevation: 0,
  },
  securityTitle: {
    fontWeight: 'bold',
    marginBottom: 12,
    color: colors.accent,
  },
  securityText: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 6,
    lineHeight: 18,
  },
});
