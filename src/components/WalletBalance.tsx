import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from 'react-native-paper';
import { useI18n } from '@/i18n/context';
import { colors } from '@/constants/theme';

interface WalletBalanceProps {
  balance: number;
  publicKey: string;
}

export default function WalletBalance({ balance, publicKey }: WalletBalanceProps) {
  const { t } = useI18n();
  const formatPublicKey = (key: string) => {
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  };

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text style={styles.label}>{t('components.walletAddress')}</Text>
        <Text style={styles.address}>{formatPublicKey(publicKey)}</Text>

        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>{t('components.solBalance')}</Text>
          <Text style={styles.balance}>{balance.toFixed(4)} SOL</Text>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    margin: 16,
    elevation: 4,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
  },
  label: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 16,
  },
  balanceContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  balanceLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  balance: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.accent,
  },
});
