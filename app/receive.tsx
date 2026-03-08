import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Clipboard } from 'react-native';
import { Text, Button, IconButton } from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import { useI18n } from '@/i18n/context';
import { colors } from '@/constants/theme';
import { getNetwork } from '@/constants/config';
import * as walletService from '@/services/walletService';

const NETWORK_LABELS: Record<string, string> = {
  'mainnet-beta': 'Mainnet',
  'devnet': 'Devnet',
  'testnet': 'Testnet',
};

export default function Receive() {
  const { t } = useI18n();
  const [publicKey, setPublicKey] = useState('');

  useEffect(() => {
    (async () => {
      const wallet = await walletService.restoreWallet();
      if (wallet) setPublicKey(wallet.publicKey.toBase58());
    })();
  }, []);

  const handleCopy = () => {
    Clipboard.setString(publicKey);
    Alert.alert(t('common.success'), t('receive.copied'));
  };

  const network = getNetwork();

  return (
    <View style={styles.container}>
      <View style={styles.networkBadge}>
        <View style={[styles.networkDot, { backgroundColor: network === 'mainnet-beta' ? colors.positive : colors.warning }]} />
        <Text style={styles.networkText}>{NETWORK_LABELS[network] || network}</Text>
      </View>

      <View style={styles.qrContainer}>
        {publicKey ? (
          <QRCode
            value={publicKey}
            size={220}
            backgroundColor="white"
            color="black"
          />
        ) : null}
      </View>

      <Text style={styles.hint}>{t('receive.scanQr')}</Text>

      <View style={styles.addressBox}>
        <Text style={styles.addressText} selectable>{publicKey}</Text>
      </View>

      <Button
        mode="contained"
        onPress={handleCopy}
        icon="content-copy"
        style={styles.copyButton}
        buttonColor={colors.accent}
        textColor="#000"
      >
        {t('receive.copyAddress')}
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    paddingTop: 24,
    paddingHorizontal: 24,
  },
  networkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    gap: 6,
    marginBottom: 28,
  },
  networkDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  networkText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  qrContainer: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 20,
    marginBottom: 24,
  },
  hint: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  addressBox: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 16,
    width: '100%',
    marginBottom: 24,
  },
  addressText: {
    fontSize: 14,
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 0.5,
    lineHeight: 22,
  },
  copyButton: {
    width: '100%',
    borderRadius: 12,
  },
});
