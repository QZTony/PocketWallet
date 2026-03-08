import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Chip, Icon } from 'react-native-paper';
import { useI18n } from '@/i18n/context';
import { Transaction, TransactionType } from '@/services/transactionService';
import { colors } from '@/constants/theme';

interface TransactionListProps {
  transactions: Transaction[];
  onTransactionPress?: (transaction: Transaction) => void;
}

export default function TransactionList({ transactions, onTransactionPress }: TransactionListProps) {
  const { t } = useI18n();
  const getTransactionIcon = (type: TransactionType) => {
    switch (type) {
      case TransactionType.SEND:
        return { name: 'arrow-up', color: '#f44336' };
      case TransactionType.RECEIVE:
        return { name: 'arrow-down', color: '#4caf50' };
      case TransactionType.SWAP:
        return { name: 'swap-horizontal', color: '#2196f3' };
      case TransactionType.NFT_TRANSFER:
        return { name: 'image', color: '#9c27b0' };
      case TransactionType.NFT_MINT:
        return { name: 'plus-circle', color: '#ff9800' };
      case TransactionType.STAKE:
        return { name: 'lock', color: '#00bcd4' };
      case TransactionType.UNSTAKE:
        return { name: 'lock-open', color: '#00bcd4' };
      default:
        return { name: 'help-circle', color: '#9e9e9e' };
    }
  };

  const getTransactionTitle = (tx: Transaction) => {
    switch (tx.type) {
      case TransactionType.SEND:
        return 'Sent';
      case TransactionType.RECEIVE:
        return 'Received';
      case TransactionType.SWAP:
        return 'Swapped';
      case TransactionType.NFT_TRANSFER:
        return 'NFT Transfer';
      case TransactionType.NFT_MINT:
        return 'NFT Minted';
      case TransactionType.STAKE:
        return 'Staked';
      case TransactionType.UNSTAKE:
        return 'Unstaked';
      default:
        return 'Transaction';
    }
  };

  const formatAddress = (address?: string) => {
    if (!address) return 'Unknown';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString();
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const icon = getTransactionIcon(item.type);
    const title = getTransactionTitle(item);

    return (
      <TouchableOpacity
        onPress={() => onTransactionPress?.(item)}
        activeOpacity={0.7}
      >
        <Card style={styles.transactionCard}>
          <Card.Content style={styles.transactionContent}>
            <View style={styles.leftSection}>
              <View style={[styles.iconContainer, { backgroundColor: `${icon.color}20` }]}>
                <Icon source={icon.name} size={24} color={icon.color} />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionTitle}>{title}</Text>
                <Text style={styles.transactionDate}>{formatDate(item.timestamp)}</Text>
                {item.memo && (
                  <Text style={styles.transactionMemo} numberOfLines={1}>
                    {item.memo}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.rightSection}>
              {item.amount && (
                <Text
                  style={[
                    styles.amount,
                    item.type === TransactionType.RECEIVE && styles.amountPositive,
                    item.type === TransactionType.SEND && styles.amountNegative,
                  ]}
                >
                  {item.type === TransactionType.RECEIVE && '+'}
                  {item.type === TransactionType.SEND && '-'}
                  {item.amount.toFixed(4)} {item.tokenSymbol || 'SOL'}
                </Text>
              )}
              <Chip
                compact
                style={[
                  styles.statusChip,
                  item.status === 'success' ? styles.statusSuccess : styles.statusFailed,
                ]}
                textStyle={styles.statusText}
              >
                {item.status}
              </Chip>
            </View>
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  if (transactions.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Icon source="history" size={64} color={colors.textTertiary} />
        <Text style={styles.emptyText}>{t('components.noTransactions')}</Text>
        <Text style={styles.emptySubtext}>
          {t('components.txHistoryHere')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      {transactions.map((item) => (
        <React.Fragment key={item.signature}>
          {renderTransaction({ item })}
        </React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    padding: 16,
  },
  transactionCard: {
    marginBottom: 12,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    elevation: 0,
  },
  transactionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  transactionMemo: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 2,
    fontStyle: 'italic',
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  amountPositive: {
    color: colors.positive,
  },
  amountNegative: {
    color: colors.negative,
  },
  statusChip: {
    height: 24,
  },
  statusSuccess: {
    backgroundColor: colors.statusSuccess,
  },
  statusFailed: {
    backgroundColor: colors.statusFailed,
  },
  statusText: {
    fontSize: 10,
    textTransform: 'capitalize',
    color: colors.text,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
