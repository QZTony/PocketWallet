import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  ActivityIndicator,
  SegmentedButtons,
  Searchbar,
  Button,
  Card,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useI18n } from '@/i18n/context';
import TransactionList from '@/components/TransactionList';
import * as transactionService from '@/services/transactionService';
import * as walletService from '@/services/walletService';
import { Transaction, TransactionType } from '@/services/transactionService';
import { colors } from '@/constants/theme';

export default function TransactionsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    filterTransactions();
  }, [transactions, filterType, searchQuery]);

  const loadTransactions = async () => {
    try {
      const wallet = await walletService.restoreWallet();

      if (!wallet) {
        router.replace('/');
        return;
      }

      transactionService.resetTransactionPagination();
      const txHistory = await transactionService.getTransactionHistory(wallet.publicKey);
      setTransactions(txHistory);
      setHasMore(transactionService.getHasMore());

      const txStats = transactionService.calculateTransactionStats(txHistory);
      setStats(txStats);
    } catch (error) {
      console.error('Failed to load transactions:', error);
      Alert.alert(t('common.error'), t('transactions.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const wallet = await walletService.restoreWallet();
      if (!wallet) return;

      const moreTxs = await transactionService.getTransactionHistory(wallet.publicKey);
      const all = transactionService.getCachedTransactions();
      setTransactions(all);
      setHasMore(transactionService.getHasMore());

      const txStats = transactionService.calculateTransactionStats(all);
      setStats(txStats);
    } catch (error) {
      console.error('Failed to load more transactions:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    transactionService.clearTransactionCache();
    await loadTransactions();
    setRefreshing(false);
  };

  const filterTransactions = () => {
    let filtered = transactionService.filterTransactionsByType(transactions, filterType);

    if (searchQuery.trim()) {
      filtered = transactionService.searchTransactions(filtered, searchQuery);
    }

    setFilteredTransactions(filtered);
  };

  const handleTransactionPress = (transaction: Transaction) => {
    router.push({
      pathname: '/transaction-detail',
      params: { signature: transaction.signature },
    });
  };

  const handleExport = () => {
    try {
      const csv = transactionService.exportTransactionsToCSV(transactions);
      Alert.alert(t('transactions.export'), t('transactions.csvGenerated'));
      console.log(csv);
    } catch (error) {
      Alert.alert(t('common.error'), t('transactions.exportFailed'));
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>{t('transactions.loadingTx')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {stats && (
        <Card style={styles.statsCard}>
          <Card.Content>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totalTransactions}</Text>
                <Text style={styles.statLabel}>{t('transactions.total')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, styles.successText]}>
                  {stats.successfulTransactions}
                </Text>
                <Text style={styles.statLabel}>{t('transactions.success')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, styles.failedText]}>
                  {stats.failedTransactions}
                </Text>
                <Text style={styles.statLabel}>{t('transactions.failed')}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.totalFees.toFixed(4)}</Text>
                <Text style={styles.statLabel}>{t('transactions.feesSol')}</Text>
              </View>
            </View>
          </Card.Content>
        </Card>
      )}

      <View style={styles.controls}>
        <Searchbar
          placeholder={t('transactions.searchPlaceholder')}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={{ color: colors.text }}
          placeholderTextColor={colors.textTertiary}
          iconColor={colors.textSecondary}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterContainer}
        >
          <TouchableOpacity
            style={[
              styles.filterButton,
              filterType === 'all' && styles.filterButtonActive,
            ]}
            onPress={() => setFilterType('all')}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterType === 'all' && styles.filterButtonTextActive,
              ]}
            >
              {t('transactions.all')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filterType === TransactionType.SEND && styles.filterButtonActive,
            ]}
            onPress={() => setFilterType(TransactionType.SEND)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterType === TransactionType.SEND && styles.filterButtonTextActive,
              ]}
            >
              {t('transactions.sent')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filterType === TransactionType.RECEIVE && styles.filterButtonActive,
            ]}
            onPress={() => setFilterType(TransactionType.RECEIVE)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterType === TransactionType.RECEIVE && styles.filterButtonTextActive,
              ]}
            >
              {t('transactions.received')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filterType === TransactionType.SWAP && styles.filterButtonActive,
            ]}
            onPress={() => setFilterType(TransactionType.SWAP)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterType === TransactionType.SWAP && styles.filterButtonTextActive,
              ]}
            >
              {t('transactions.swaps')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterButton,
              filterType === TransactionType.NFT_TRANSFER && styles.filterButtonActive,
            ]}
            onPress={() => setFilterType(TransactionType.NFT_TRANSFER)}
          >
            <Text
              style={[
                styles.filterButtonText,
                filterType === TransactionType.NFT_TRANSFER && styles.filterButtonTextActive,
              ]}
            >
              {t('transactions.nfts')}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        <Button
          mode="outlined"
          onPress={handleExport}
          style={styles.exportButton}
          compact
          textColor={colors.text}
        >
          {t('transactions.exportCsv')}
        </Button>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />}
      >
        <TransactionList
          transactions={filteredTransactions}
          onTransactionPress={handleTransactionPress}
        />
        {hasMore && (
          <Button
            mode="text"
            onPress={loadMore}
            loading={loadingMore}
            disabled={loadingMore}
            style={styles.loadMoreButton}
            textColor={colors.accent}
          >
            {loadingMore ? t('common.loading') : t('transactions.loadMore')}
          </Button>
        )}
      </ScrollView>
    </View>
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
  loadingText: {
    marginTop: 16,
    color: colors.textSecondary,
  },
  statsCard: {
    margin: 16,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    elevation: 0,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  successText: {
    color: colors.positive,
  },
  failedText: {
    color: colors.negative,
  },
  controls: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchBar: {
    marginBottom: 12,
    elevation: 0,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.chipBg,
    marginRight: 8,
  },
  filterButtonActive: {
    backgroundColor: colors.chipActiveBg,
  },
  filterButtonText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: colors.chipActiveText,
  },
  exportButton: {
    marginTop: 4,
    borderColor: colors.buttonOutlineBorder,
  },
  loadMoreButton: {
    marginVertical: 16,
  },
});
