import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  Image,
  FlatList,
} from 'react-native';
import { TextInput, Button, Text, Card, Portal, Modal, IconButton, Searchbar } from 'react-native-paper';
import * as swapService from '@/services/swapService';
import * as walletService from '@/services/walletService';
import * as storageService from '@/services/storageService';
import { getAllSwappableTokens, SwappableToken, BUILTIN_TOKENS, getAllTokensWithMetadata } from '@/services/tokenService';
import { SwapQuote, TokenInfo } from '@/types';
import { Keypair, VersionedTransaction } from '@solana/web3.js';
import { colors } from '@/constants/theme';
import { useI18n } from '@/i18n/context';
import { useFocusEffect } from '@react-navigation/native';

type SelectorTarget = 'input' | 'output';

function TokenIcon({ uri, symbol }: { uri?: string; symbol?: string }) {
  const [failed, setFailed] = useState(false);
  const letter = (symbol || '?')[0];

  if (!uri || failed) {
    return (
      <View style={styles.tokenIconPlaceholder}>
        <Text style={styles.tokenIconLetter}>{letter}</Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={styles.tokenIcon}
      onError={() => setFailed(true)}
    />
  );
}

export default function Swap() {
  const { t } = useI18n();
  const [inputToken, setInputToken] = useState<SwappableToken | null>(null);
  const [outputToken, setOutputToken] = useState<SwappableToken | null>(null);
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);

  const [selectorVisible, setSelectorVisible] = useState(false);
  const [selectorTarget, setSelectorTarget] = useState<SelectorTarget>('input');
  const [tokens, setTokens] = useState<SwappableToken[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [balanceMap, setBalanceMap] = useState<Record<string, number>>({});

  const [addTokenVisible, setAddTokenVisible] = useState(false);
  const [newMint, setNewMint] = useState('');
  const [newSymbol, setNewSymbol] = useState('');
  const [newName, setNewName] = useState('');
  const [newDecimals, setNewDecimals] = useState('9');

  useFocusEffect(useCallback(() => {
    loadTokens();
    loadBalances();
  }, []));

  const loadTokens = async () => {
    const list = await getAllSwappableTokens();
    setTokens(list);
  };

  const loadBalances = async () => {
    try {
      const wallet = await walletService.restoreWallet();
      if (!wallet) return;
      const allTokens = await getAllTokensWithMetadata(wallet.publicKey);
      const map: Record<string, number> = {};
      for (const t of allTokens) {
        map[t.mint] = t.uiAmount;
      }
      setBalanceMap(map);
    } catch (e) {
      console.log('[Swap] loadBalances skipped:', (e as any)?.message?.slice(0, 60));
    }
  };

  const openSelector = (target: SelectorTarget) => {
    setSelectorTarget(target);
    setSearchQuery('');
    setSelectorVisible(true);
    loadBalances();
  };

  const selectToken = (token: SwappableToken) => {
    if (selectorTarget === 'input') {
      setInputToken(token);
    } else {
      setOutputToken(token);
    }
    setSelectorVisible(false);
    setQuote(null);
  };

  const filteredTokens = tokens.filter((t) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      t.symbol.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.mint.toLowerCase().includes(q)
    );
  });

  const handleSwapDirection = () => {
    const temp = inputToken;
    setInputToken(outputToken);
    setOutputToken(temp);
    setQuote(null);
  };

  const handleGetQuote = async () => {
    if (!inputToken || !outputToken || !amount) {
      Alert.alert(t('common.error'), t('swap.selectAndAmount'));
      return;
    }

    try {
      setLoading(true);
      const amountInSmallestUnit = parseFloat(amount) * Math.pow(10, inputToken.decimals);
      const swapQuote = await swapService.getSwapQuote(
        inputToken.mint,
        outputToken.mint,
        amountInSmallestUnit,
        50
      );
      setQuote(swapQuote);
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('swap.quoteFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSwap = async () => {
    if (!quote) return;

    try {
      setSwapping(true);
      const wallet = await walletService.restoreWallet();

      if (!wallet) {
        Alert.alert(t('common.error'), t('send.walletNotFound'));
        return;
      }

      const keypair = Keypair.fromSecretKey(wallet.secretKey);

      const signTransaction = async (tx: any) => {
        if (tx instanceof VersionedTransaction) {
          tx.sign([keypair]);
          return tx;
        }
        tx.sign(keypair);
        return tx;
      };

      const result = await swapService.executeSwap(
        quote,
        wallet.publicKey,
        signTransaction
      );

      setQuote(null);
      setAmount('');
      setTimeout(() => loadBalances(), 3000);
    } catch (error: any) {
      const msg = error.message || '';
      if (msg.includes('Insufficient')) {
        Alert.alert(t('common.error'), t('swap.insufficientBalance'));
      } else {
        Alert.alert(t('common.error'), msg || t('swap.swapFailed'));
      }
    } finally {
      setSwapping(false);
    }
  };

  const handleAddExternalToken = async () => {
    if (!newMint.trim() || !newSymbol.trim()) {
      Alert.alert(t('common.error'), t('home.mintRequired'));
      return;
    }
    try {
      const token: storageService.CustomToken = {
        mint: newMint.trim(),
        symbol: newSymbol.trim().toUpperCase(),
        name: newName.trim() || newSymbol.trim().toUpperCase(),
        decimals: parseInt(newDecimals) || 9,
      };
      await storageService.addCustomToken(token);

      setNewMint('');
      setNewSymbol('');
      setNewName('');
      setNewDecimals('9');
      setAddTokenVisible(false);

      await loadTokens();

      const swappable: SwappableToken = { ...token, isCustom: true };
      selectToken(swappable);
    } catch (error) {
      Alert.alert(t('common.error'), t('home.addFailed'));
    }
  };

  const formatOutAmount = () => {
    if (!quote || !outputToken) return '';
    return (Number(quote.outAmount) / Math.pow(10, outputToken.decimals)).toFixed(6);
  };

  const formatBalance = (val: number | undefined) => {
    if (val === undefined || val === 0) return '0';
    if (val < 0.000001) return '<0.000001';
    if (val < 1) return val.toPrecision(4);
    if (val < 10000) return val.toFixed(4).replace(/\.?0+$/, '');
    return val.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const renderTokenItem = ({ item }: { item: SwappableToken }) => {
    const bal = balanceMap[item.mint];
    return (
      <TouchableOpacity style={styles.tokenRow} onPress={() => selectToken(item)}>
        <TokenIcon uri={item.logoURI} symbol={item.symbol} />
        <View style={styles.tokenRowInfo}>
          <Text style={styles.tokenRowSymbol}>{item.symbol}</Text>
          <Text style={styles.tokenRowName} numberOfLines={1}>{item.name}</Text>
        </View>
        <View style={styles.tokenRowRight}>
          {bal !== undefined && bal > 0 && (
            <Text style={styles.tokenRowBalance}>{formatBalance(bal)}</Text>
          )}
          {item.isCustom && (
            <View style={styles.customBadge}>
              <Text style={styles.customBadgeText}>{t('swap.custom')}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text variant="titleLarge" style={styles.title}>
          {t('swap.title')}
        </Text>

        {/* Input Token Selector */}
        <Text style={styles.fieldLabel}>{t('swap.from')}</Text>
        <TouchableOpacity style={styles.tokenSelector} onPress={() => openSelector('input')}>
          {inputToken ? (
            <View style={styles.selectedToken}>
              <TokenIcon uri={inputToken.logoURI} symbol={inputToken.symbol} />
              <Text style={styles.selectedTokenSymbol}>{inputToken.symbol}</Text>
              {balanceMap[inputToken.mint] !== undefined && (
                <Text style={styles.selectedTokenBalance}>
                  {formatBalance(balanceMap[inputToken.mint])}
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.selectorPlaceholder}>{t('swap.selectToken')}</Text>
          )}
          <IconButton icon="chevron-down" size={20} iconColor={colors.textSecondary} />
        </TouchableOpacity>

        <TextInput
          label={t('swap.amount')}
          value={amount}
          onChangeText={(v) => { setAmount(v); setQuote(null); }}
          mode="outlined"
          keyboardType="decimal-pad"
          style={styles.input}
          placeholder="0.0"
          textColor={colors.text}
          placeholderTextColor={colors.textTertiary}
          outlineColor={colors.inputBorder}
          activeOutlineColor={colors.accent}
        />

        {inputToken && balanceMap[inputToken.mint] > 0 && (
          <View style={styles.percentRow}>
            {[25, 50, 75, 100].map((pct) => (
              <TouchableOpacity
                key={pct}
                style={styles.percentBtn}
                activeOpacity={0.7}
                onPress={() => {
                  const bal = balanceMap[inputToken.mint] || 0;
                  const val = bal * pct / 100;
                  const decimals = inputToken.decimals;
                  const str = pct === 100
                    ? (val < 0.000001 ? val.toExponential(2) : val.toPrecision(Math.min(decimals, 10)))
                    : val.toFixed(Math.min(decimals, 8)).replace(/\.?0+$/, '');
                  setAmount(str);
                  setQuote(null);
                }}
              >
                <Text style={styles.percentBtnText}>{pct}%</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Swap Direction Button */}
        <View style={styles.swapDirectionRow}>
          <TouchableOpacity style={styles.swapDirectionBtn} onPress={handleSwapDirection}>
            <IconButton icon="swap-vertical" size={24} iconColor={colors.accent} />
          </TouchableOpacity>
        </View>

        {/* Output Token Selector */}
        <Text style={styles.fieldLabel}>{t('swap.to')}</Text>
        <TouchableOpacity style={styles.tokenSelector} onPress={() => openSelector('output')}>
          {outputToken ? (
            <View style={styles.selectedToken}>
              <TokenIcon uri={outputToken.logoURI} symbol={outputToken.symbol} />
              <Text style={styles.selectedTokenSymbol}>{outputToken.symbol}</Text>
              {balanceMap[outputToken.mint] !== undefined && (
                <Text style={styles.selectedTokenBalance}>
                  {formatBalance(balanceMap[outputToken.mint])}
                </Text>
              )}
            </View>
          ) : (
            <Text style={styles.selectorPlaceholder}>{t('swap.selectToken')}</Text>
          )}
          <IconButton icon="chevron-down" size={20} iconColor={colors.textSecondary} />
        </TouchableOpacity>

        {quote && outputToken && (
          <View style={styles.estimatedRow}>
            <Text style={styles.estimatedLabel}>{t('swap.estimatedOutput')}</Text>
            <Text style={styles.estimatedValue}>{formatOutAmount()} {outputToken.symbol}</Text>
          </View>
        )}

        <Button
          mode="contained"
          onPress={handleGetQuote}
          loading={loading}
          disabled={loading || swapping || !inputToken || !outputToken || !amount}
          style={styles.button}
          buttonColor={colors.buttonPrimary}
          textColor={colors.buttonPrimaryText}
        >
          {t('swap.getQuote')}
        </Button>

        {quote && (
          <Card style={styles.quoteCard}>
            <Card.Content>
              <Text variant="titleMedium" style={styles.quoteTitle}>
                {t('swap.quoteDetails')}
              </Text>

              <View style={styles.quoteRow}>
                <Text style={styles.quoteLabel}>{t('swap.input')}</Text>
                <Text style={styles.quoteValue}>
                  {(Number(quote.inAmount) / Math.pow(10, inputToken!.decimals)).toFixed(6)} {inputToken!.symbol}
                </Text>
              </View>

              <View style={styles.quoteRow}>
                <Text style={styles.quoteLabel}>{t('swap.output')}</Text>
                <Text style={styles.quoteValue}>
                  {formatOutAmount()} {outputToken!.symbol}
                </Text>
              </View>

              <View style={styles.quoteRow}>
                <Text style={styles.quoteLabel}>{t('swap.priceImpact')}</Text>
                <Text style={styles.quoteValue}>
                  {swapService.calculatePriceImpact(quote).toFixed(2)}%
                </Text>
              </View>

              <View style={styles.quoteRow}>
                <Text style={styles.quoteLabel}>{t('swap.route')}</Text>
                <Text style={styles.quoteValue}>
                  {swapService.formatSwapRoute(quote)}
                </Text>
              </View>

              <Button
                mode="contained"
                onPress={handleSwap}
                loading={swapping}
                disabled={swapping}
                style={styles.swapButton}
                buttonColor={colors.accent}
                textColor="#000"
              >
                {t('swap.executeSwap')}
              </Button>
            </Card.Content>
          </Card>
        )}
      </View>

      {/* Token Selector Modal */}
      <Portal>
        <Modal
          visible={selectorVisible}
          onDismiss={() => setSelectorVisible(false)}
          contentContainerStyle={styles.selectorModal}
        >
          <Text style={styles.selectorTitle}>
            {t(selectorTarget === 'input' ? 'swap.selectInputToken' : 'swap.selectOutputToken')}
          </Text>

          <Searchbar
            placeholder={t('swap.searchPlaceholder')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={styles.selectorSearch}
            inputStyle={{ color: colors.text }}
            placeholderTextColor={colors.textTertiary}
            iconColor={colors.textSecondary}
          />

          <FlatList
            data={filteredTokens}
            keyExtractor={(item) => item.mint}
            renderItem={renderTokenItem}
            extraData={balanceMap}
            style={styles.tokenList}
            ItemSeparatorComponent={() => <View style={styles.tokenSeparator} />}
            ListEmptyComponent={
              <Text style={styles.emptyListText}>{t('swap.noTokensFound')}</Text>
            }
          />

          <TouchableOpacity
            style={styles.addExternalBtn}
            onPress={() => {
              setSelectorVisible(false);
              setTimeout(() => setAddTokenVisible(true), 300);
            }}
          >
            <IconButton icon="plus-circle-outline" size={22} iconColor={colors.accent} />
            <Text style={styles.addExternalText}>{t('swap.addExternalToken')}</Text>
          </TouchableOpacity>
        </Modal>
      </Portal>

      {/* Add External Token Modal */}
      <Portal>
        <Modal
          visible={addTokenVisible}
          onDismiss={() => setAddTokenVisible(false)}
          contentContainerStyle={styles.addModal}
        >
          <Text style={styles.addModalTitle}>{t('swap.addExternalToken')}</Text>

          <TextInput
            label={t('swap.tokenMintAddress')}
            value={newMint}
            onChangeText={setNewMint}
            mode="outlined"
            style={styles.addModalInput}
            placeholder={t('swap.tokenMintPlaceholder')}
            textColor={colors.text}
            placeholderTextColor={colors.textTertiary}
            outlineColor={colors.inputBorder}
            activeOutlineColor={colors.accent}
          />
          <TextInput
            label={t('home.symbol')}
            value={newSymbol}
            onChangeText={setNewSymbol}
            mode="outlined"
            style={styles.addModalInput}
            placeholder="e.g. WIF"
            textColor={colors.text}
            placeholderTextColor={colors.textTertiary}
            outlineColor={colors.inputBorder}
            activeOutlineColor={colors.accent}
          />
          <TextInput
            label={t('home.name')}
            value={newName}
            onChangeText={setNewName}
            mode="outlined"
            style={styles.addModalInput}
            placeholder="e.g. dogwifhat"
            textColor={colors.text}
            placeholderTextColor={colors.textTertiary}
            outlineColor={colors.inputBorder}
            activeOutlineColor={colors.accent}
          />
          <TextInput
            label={t('home.decimals')}
            value={newDecimals}
            onChangeText={setNewDecimals}
            mode="outlined"
            style={styles.addModalInput}
            keyboardType="numeric"
            placeholder="9"
            textColor={colors.text}
            placeholderTextColor={colors.textTertiary}
            outlineColor={colors.inputBorder}
            activeOutlineColor={colors.accent}
          />

          <View style={styles.addModalButtons}>
            <Button
              mode="outlined"
              onPress={() => setAddTokenVisible(false)}
              style={styles.addModalBtn}
              textColor={colors.text}
            >
              {t('common.cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleAddExternalToken}
              style={styles.addModalBtn}
              buttonColor={colors.accent}
              textColor="#000"
            >
              {t('swap.addAndSelect')}
            </Button>
          </View>
        </Modal>
      </Portal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 20,
  },
  title: {
    marginBottom: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  fieldLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  tokenSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 12,
    minHeight: 56,
  },
  selectedToken: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectedTokenSymbol: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  selectedTokenBalance: {
    fontSize: 14,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  selectorPlaceholder: {
    fontSize: 16,
    color: colors.textTertiary,
  },
  input: {
    marginBottom: 8,
    backgroundColor: colors.bgSecondary,
  },
  percentRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  percentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.bgTertiary,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    alignItems: 'center',
  },
  percentBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.accent,
  },
  swapDirectionRow: {
    alignItems: 'center',
    marginVertical: 4,
  },
  swapDirectionBtn: {
    backgroundColor: colors.bgTertiary,
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  estimatedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.accentDim,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  estimatedLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  estimatedValue: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: 'bold',
  },
  button: {
    marginTop: 8,
    borderRadius: 12,
  },
  quoteCard: {
    marginTop: 24,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    elevation: 0,
  },
  quoteTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  quoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  quoteLabel: {
    color: colors.textSecondary,
  },
  quoteValue: {
    fontWeight: '600',
    color: colors.text,
    flexShrink: 1,
    textAlign: 'right',
  },
  swapButton: {
    marginTop: 16,
    borderRadius: 12,
  },

  // Token Selector Modal
  selectorModal: {
    backgroundColor: colors.bgSecondary,
    margin: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  selectorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    paddingTop: 20,
    paddingBottom: 12,
  },
  selectorSearch: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: colors.bgTertiary,
    elevation: 0,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  tokenList: {
    maxHeight: 360,
    paddingHorizontal: 8,
  },
  tokenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  tokenRowInfo: {
    flex: 1,
    marginLeft: 12,
  },
  tokenRowSymbol: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
  },
  tokenRowName: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tokenRowRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  tokenRowBalance: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  customBadge: {
    backgroundColor: colors.accentDim,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  customBadgeText: {
    fontSize: 10,
    color: colors.accent,
    fontWeight: '600',
  },
  tokenSeparator: {
    height: 1,
    backgroundColor: colors.divider,
    marginHorizontal: 12,
  },
  emptyListText: {
    textAlign: 'center',
    color: colors.textSecondary,
    paddingVertical: 32,
  },
  addExternalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    marginTop: 4,
  },
  addExternalText: {
    fontSize: 15,
    color: colors.accent,
    fontWeight: '600',
  },
  tokenIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  tokenIconPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.bgTertiary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenIconLetter: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },

  // Add External Token Modal
  addModal: {
    backgroundColor: colors.bgSecondary,
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  addModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  addModalInput: {
    marginBottom: 12,
    backgroundColor: colors.bgTertiary,
  },
  addModalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  addModalBtn: {
    minWidth: 80,
    borderRadius: 10,
  },
});
