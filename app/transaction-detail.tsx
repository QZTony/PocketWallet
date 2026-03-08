import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  Linking,
  Share,
} from 'react-native';
import { Text, Button, Card, ActivityIndicator, Chip, Divider } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useI18n } from '@/i18n/context';
import * as transactionService from '@/services/transactionService';
import { Transaction, TransactionType } from '@/services/transactionService';
import * as Clipboard from 'expo-clipboard';
import { colors } from '@/constants/theme';

export default function TransactionDetail() {
  const { t } = useI18n();
  const router = useRouter();
  const { signature } = useLocalSearchParams<{ signature: string }>();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (signature) {
      loadTransactionDetails();
    }
  }, [signature]);

  const loadTransactionDetails = async () => {
    try {
      const tx = await transactionService.getTransactionDetails(signature);
      setTransaction(tx);
    } catch (error) {
      console.error('Failed to load transaction details:', error);
      Alert.alert(t('common.error'), t('txDetail.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopySignature = async () => {
    await Clipboard.setStringAsync(signature);
    Alert.alert(t('txDetail.copied'), t('txDetail.signatureCopied'));
  };

  const handleViewOnExplorer = () => {
    const url = `https://solscan.io/tx/${signature}`;
    Linking.openURL(url);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Solana Transaction: https://solscan.io/tx/${signature}`,
      });
    } catch (error) {
      console.error('Failed to share:', error);
    }
  };

  const getTransactionTypeLabel = (type: TransactionType) => {
    switch (type) {
      case TransactionType.SEND:
        return t('txDetail.typeSend');
      case TransactionType.RECEIVE:
        return t('txDetail.typeReceive');
      case TransactionType.SWAP:
        return t('txDetail.typeSwap');
      case TransactionType.NFT_TRANSFER:
        return t('txDetail.typeNftTransfer');
      case TransactionType.NFT_MINT:
        return t('txDetail.typeNftMint');
      case TransactionType.STAKE:
        return t('txDetail.typeStake');
      case TransactionType.UNSTAKE:
        return t('txDetail.typeUnstake');
      default:
        return t('txDetail.typeUnknown');
    }
  };

  const formatAddress = (address?: string) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!transaction) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{t('txDetail.txNotFound')}</Text>
        <Button mode="contained" onPress={() => router.back()} buttonColor={colors.buttonPrimary} textColor={colors.buttonPrimaryText}>
          {t('common.goBack')}
        </Button>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <Text variant="headlineSmall" style={styles.title}>
              {getTransactionTypeLabel(transaction.type)}
            </Text>
            <Chip
              style={[
                styles.statusChip,
                transaction.status === 'success' ? styles.statusSuccess : styles.statusFailed,
              ]}
              textStyle={{ color: colors.text, fontSize: 12 }}
            >
              {transaction.status}
            </Chip>
          </View>

          {transaction.amount && (
            <View style={styles.amountContainer}>
              <Text style={styles.amountLabel}>{t('txDetail.amount')}</Text>
              <Text
                style={[
                  styles.amount,
                  transaction.type === TransactionType.RECEIVE && styles.amountPositive,
                  transaction.type === TransactionType.SEND && styles.amountNegative,
                ]}
              >
                {transaction.type === TransactionType.RECEIVE && '+'}
                {transaction.type === TransactionType.SEND && '-'}
                {transaction.amount.toFixed(6)} {transaction.tokenSymbol || 'SOL'}
              </Text>
            </View>
          )}
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            {t('txDetail.txDetails')}
          </Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('txDetail.signature')}</Text>
            <Text style={styles.detailValue} numberOfLines={1}>
              {formatAddress(signature)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('txDetail.date')}</Text>
            <Text style={styles.detailValue}>{formatDate(transaction.timestamp)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('txDetail.type')}</Text>
            <Text style={styles.detailValue}>{getTransactionTypeLabel(transaction.type)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>{t('txDetail.fee')}</Text>
            <Text style={styles.detailValue}>{transaction.fee.toFixed(6)} SOL</Text>
          </View>

          {transaction.from && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('txDetail.from')}</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {formatAddress(transaction.from)}
              </Text>
            </View>
          )}

          {transaction.to && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{t('txDetail.to')}</Text>
              <Text style={styles.detailValue} numberOfLines={1}>
                {formatAddress(transaction.to)}
              </Text>
            </View>
          )}

          {transaction.memo && (
            <>
              <Divider style={styles.divider} />
              <View style={styles.memoContainer}>
                <Text style={styles.detailLabel}>{t('txDetail.memo')}</Text>
                <Text style={styles.memoText}>{transaction.memo}</Text>
              </View>
            </>
          )}
        </Card.Content>
      </Card>

      <View style={styles.actions}>
        <Button
          mode="contained"
          onPress={handleViewOnExplorer}
          style={styles.actionButton}
          icon="open-in-new"
          buttonColor={colors.buttonPrimary}
          textColor={colors.buttonPrimaryText}
        >
          {t('txDetail.viewOnSolscan')}
        </Button>

        <Button
          mode="outlined"
          onPress={handleCopySignature}
          style={styles.actionButton}
          icon="content-copy"
          textColor={colors.text}
        >
          {t('txDetail.copySignature')}
        </Button>

        <Button
          mode="text"
          onPress={handleShare}
          style={styles.actionButton}
          icon="share-variant"
          textColor={colors.accent}
        >
          {t('txDetail.share')}
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: colors.bg,
  },
  errorText: {
    fontSize: 18,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  card: {
    margin: 16,
    marginBottom: 8,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    elevation: 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontWeight: 'bold',
    color: colors.text,
  },
  statusChip: {
    height: 28,
  },
  statusSuccess: {
    backgroundColor: colors.statusSuccess,
  },
  statusFailed: {
    backgroundColor: colors.statusFailed,
  },
  amountContainer: {
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: colors.bgTertiary,
    borderRadius: 12,
  },
  amountLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text,
  },
  amountPositive: {
    color: colors.positive,
  },
  amountNegative: {
    color: colors.negative,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 16,
    color: colors.text,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
    flex: 1,
    textAlign: 'right',
    marginLeft: 16,
  },
  divider: {
    marginVertical: 16,
    backgroundColor: colors.divider,
  },
  memoContainer: {
    marginTop: 8,
  },
  memoText: {
    fontSize: 14,
    color: colors.text,
    marginTop: 8,
    padding: 12,
    backgroundColor: colors.bgTertiary,
    borderRadius: 8,
    fontStyle: 'italic',
  },
  actions: {
    padding: 16,
    paddingBottom: 32,
  },
  actionButton: {
    marginBottom: 12,
    borderRadius: 12,
    borderColor: colors.buttonOutlineBorder,
  },
});
