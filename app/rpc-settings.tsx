import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Text, TextInput, Divider } from 'react-native-paper';
import { useI18n } from '@/i18n/context';
import { colors } from '@/constants/theme';
import {
  NetworkType,
  getDefaultRpcUrl,
  getCustomRpcUrl,
  setCustomRpc,
  testRpcConnection,
  getNetwork,
} from '@/constants/config';

const NETWORKS: { key: NetworkType; label: string }[] = [
  { key: 'mainnet-beta', label: 'Mainnet' },
  { key: 'devnet', label: 'Devnet' },
  { key: 'testnet', label: 'Testnet' },
];

export default function RpcSettings() {
  const { t } = useI18n();
  const currentNetwork = getNetwork();

  const [rpcInputs, setRpcInputs] = useState<Record<NetworkType, string>>({
    'mainnet-beta': '',
    'devnet': '',
    'testnet': '',
  });

  const [testingNetwork, setTestingNetwork] = useState<NetworkType | null>(null);
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; latencyMs: number; error?: string }>>({});

  useEffect(() => {
    setRpcInputs({
      'mainnet-beta': getCustomRpcUrl('mainnet-beta') || '',
      'devnet': getCustomRpcUrl('devnet') || '',
      'testnet': getCustomRpcUrl('testnet') || '',
    });
  }, []);

  const handleSave = async (network: NetworkType) => {
    const url = rpcInputs[network].trim();
    if (url && !url.startsWith('http')) {
      Alert.alert(t('common.error'), t('rpcSettings.invalidUrl'));
      return;
    }
    await setCustomRpc(network, url || null);
    Alert.alert(t('common.success'), t('rpcSettings.saved'));
  };

  const handleTest = async (network: NetworkType) => {
    const url = rpcInputs[network].trim() || getDefaultRpcUrl(network);
    setTestingNetwork(network);
    setTestResults((prev) => ({ ...prev, [network]: undefined as any }));
    const result = await testRpcConnection(url);
    setTestResults((prev) => ({ ...prev, [network]: result }));
    setTestingNetwork(null);
  };

  const handleReset = async (network: NetworkType) => {
    setRpcInputs((prev) => ({ ...prev, [network]: '' }));
    await setCustomRpc(network, null);
    setTestResults((prev) => ({ ...prev, [network]: undefined as any }));
    Alert.alert(t('common.success'), t('rpcSettings.reset'));
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('rpcSettings.title')}</Text>
        <Text style={styles.subtitle}>{t('rpcSettings.subtitle')}</Text>
      </View>

      {NETWORKS.map(({ key, label }) => {
        const isActive = key === currentNetwork;
        const defaultUrl = getDefaultRpcUrl(key);
        const customUrl = rpcInputs[key];
        const result = testResults[key];
        const isTesting = testingNetwork === key;

        return (
          <View key={key} style={[styles.networkCard, isActive && styles.networkCardActive]}>
            <View style={styles.networkHeader}>
              <Text style={styles.networkLabel}>{label}</Text>
              {isActive && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>{t('rpcSettings.active')}</Text>
                </View>
              )}
            </View>

            <Text style={styles.defaultLabel}>{t('rpcSettings.defaultRpc')}</Text>
            <Text style={styles.defaultUrl} numberOfLines={1}>{defaultUrl}</Text>

            <Divider style={styles.divider} />

            <Text style={styles.customLabel}>{t('rpcSettings.customRpc')}</Text>
            <TextInput
              value={customUrl}
              onChangeText={(v) => setRpcInputs((prev) => ({ ...prev, [key]: v }))}
              mode="outlined"
              style={styles.input}
              placeholder={t('rpcSettings.rpcPlaceholder')}
              textColor={colors.text}
              placeholderTextColor={colors.textTertiary}
              outlineColor={colors.inputBorder}
              activeOutlineColor={colors.accent}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {result && (
              <View style={[styles.testResult, result.ok ? styles.testResultOk : styles.testResultFail]}>
                <Text style={[styles.testResultText, { color: result.ok ? colors.positive : colors.negative }]}>
                  {result.ok
                    ? `${t('rpcSettings.connectionOk')} (${result.latencyMs}ms)`
                    : `${t('rpcSettings.connectionFailed')}: ${result.error}`}
                </Text>
              </View>
            )}

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleTest(key)}
                disabled={isTesting}
                activeOpacity={0.7}
              >
                {isTesting ? (
                  <ActivityIndicator size="small" color={colors.accent} />
                ) : (
                  <Text style={styles.actionBtnText}>{t('rpcSettings.test')}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleSave(key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.actionBtnText, { color: colors.accent }]}>{t('rpcSettings.save')}</Text>
              </TouchableOpacity>

              {customUrl.trim() !== '' && (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => handleReset(key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.actionBtnText, { color: colors.negative }]}>{t('rpcSettings.resetDefault')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}

      <View style={styles.tipCard}>
        <Text style={styles.tipTitle}>{t('rpcSettings.tipTitle')}</Text>
        <Text style={styles.tipText}>{t('rpcSettings.tip1')}</Text>
        <Text style={styles.tipText}>{t('rpcSettings.tip2')}</Text>
        <Text style={styles.tipText}>{t('rpcSettings.tip3')}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: colors.text, marginBottom: 4 },
  subtitle: { fontSize: 13, color: colors.textSecondary, lineHeight: 18 },

  networkCard: {
    margin: 16,
    marginBottom: 0,
    padding: 16,
    backgroundColor: colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  networkCardActive: {
    borderColor: colors.accent,
  },
  networkHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  networkLabel: { fontSize: 17, fontWeight: '700', color: colors.text },
  activeBadge: {
    backgroundColor: colors.accentDim,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  activeBadgeText: { fontSize: 11, fontWeight: '600', color: colors.accent },
  defaultLabel: { fontSize: 12, color: colors.textTertiary, marginBottom: 4 },
  defaultUrl: { fontSize: 12, color: colors.textSecondary, fontFamily: 'monospace' },
  divider: { marginVertical: 12, backgroundColor: colors.divider },
  customLabel: { fontSize: 13, fontWeight: '600', color: colors.text, marginBottom: 8 },
  input: { backgroundColor: colors.bgSecondary, fontSize: 13 },

  testResult: {
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  testResultOk: { backgroundColor: 'rgba(0,212,170,0.1)' },
  testResultFail: { backgroundColor: 'rgba(255,77,77,0.1)' },
  testResultText: { fontSize: 12, fontWeight: '500' },

  btnRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.bgTertiary,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
  },
  actionBtnText: { fontSize: 13, fontWeight: '600', color: colors.text },

  tipCard: {
    margin: 16,
    padding: 16,
    backgroundColor: 'rgba(0,212,170,0.06)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  tipTitle: { fontSize: 14, fontWeight: '700', color: colors.accent, marginBottom: 8 },
  tipText: { fontSize: 12, color: colors.textSecondary, lineHeight: 18, marginBottom: 4 },
});
