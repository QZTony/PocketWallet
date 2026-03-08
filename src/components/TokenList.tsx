import React, { useState } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Card } from 'react-native-paper';
import { useI18n } from '@/i18n/context';
import { TokenInfo } from '@/types';
import { colors } from '@/constants/theme';

interface TokenListProps {
  tokens: TokenInfo[];
  onTokenPress?: (token: TokenInfo) => void;
}

function TokenLogo({ uri, symbol }: { uri?: string; symbol?: string }) {
  const [failed, setFailed] = useState(false);
  const letter = (symbol || '?')[0];

  if (!uri || failed) {
    return (
      <View style={[styles.tokenLogo, styles.tokenLogoPlaceholder]}>
        <Text style={styles.tokenLogoText}>{letter}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={styles.tokenLogo}
      onError={() => setFailed(true)}
    />
  );
}

export default function TokenList({ tokens, onTokenPress }: TokenListProps) {
  const { t } = useI18n();
  if (tokens.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('components.noTokens')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      {tokens.map((item) => (
        <Card
          key={item.address}
          style={styles.tokenCard}
          onPress={() => onTokenPress?.(item)}
        >
          <Card.Content style={styles.tokenContent}>
            <View style={styles.tokenInfo}>
              <TokenLogo uri={item.logoURI} symbol={item.symbol} />
              <View style={styles.tokenDetails}>
                <Text style={styles.tokenSymbol}>{item.symbol || t('common.unknown')}</Text>
                <Text style={styles.tokenName}>{item.name || item.mint.slice(0, 8)}</Text>
              </View>
            </View>
            <View style={styles.tokenBalance}>
              {item.usdValue != null && item.usdValue > 0 ? (
                <>
                  <Text style={styles.balanceAmount}>${item.usdValue < 0.01 ? '<0.01' : item.usdValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                  <Text style={styles.balanceLabel}>{item.uiAmount.toFixed(4)} {item.symbol}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.balanceAmount}>{item.uiAmount.toFixed(4)}</Text>
                  <Text style={styles.balanceLabel}>{item.symbol}</Text>
                </>
              )}
            </View>
          </Card.Content>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
  },
  tokenCard: {
    marginBottom: 12,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    elevation: 0,
  },
  tokenContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tokenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  tokenLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  } as any,
  tokenLogoPlaceholder: {
    backgroundColor: colors.bgTertiary,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  tokenLogoText: {
    fontSize: 16,
    fontWeight: 'bold' as const,
    color: colors.textSecondary,
  },
  tokenDetails: {
    flex: 1,
  },
  tokenSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  tokenName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tokenBalance: {
    alignItems: 'flex-end',
  },
  balanceAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  balanceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
