import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Clipboard,
  Image,
} from 'react-native';
import {
  ActivityIndicator,
  Menu,
  IconButton,
  Portal,
  Modal,
  TextInput,
  Text,
  Button,
} from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useFocusEffect, CommonActions, useNavigation } from '@react-navigation/native';
import { useI18n } from '@/i18n/context';
import NFTGrid from '@/components/NFTGrid';
import * as walletService from '@/services/walletService';
import * as tokenService from '@/services/tokenService';
import * as storageService from '@/services/storageService';
import * as nftService from '@/services/nftService';
import { TokenInfo, WalletRecord } from '@/types';
import { NFT } from '@/services/nftService';
import { colors } from '@/constants/theme';
import { getNetwork, switchNetwork, loadSavedNetwork, NetworkType } from '@/constants/config';

function TokenLogo({ uri, symbol, size = 40 }: { uri?: string; symbol?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const letter = (symbol || '?')[0];
  if (!uri || failed) {
    return (
      <View style={[styles.tokenLogoFallback, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={styles.tokenLogoLetter}>{letter}</Text>
      </View>
    );
  }
  return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} onError={() => setFailed(true)} />;
}

export default function Home() {
  const router = useRouter();
  const { t } = useI18n();

  const [publicKey, setPublicKey] = useState('');
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [totalUsd, setTotalUsd] = useState(0);
  const [totalChange, setTotalChange] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentWalletName, setCurrentWalletName] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'tokens' | 'nft'>('tokens');
  const [nftsLoading, setNftsLoading] = useState(false);
  const [nftsLoaded, setNftsLoaded] = useState(false);

  const [networkMenuVisible, setNetworkMenuVisible] = useState(false);
  const [currentNetwork, setCurrentNetwork] = useState<NetworkType>(getNetwork());

  const [addTokenVisible, setAddTokenVisible] = useState(false);
  const [newTokenMint, setNewTokenMint] = useState('');
  const [newTokenSymbol, setNewTokenSymbol] = useState('');
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenDecimals, setNewTokenDecimals] = useState('9');

  const handleNetworkSwitch = async (network: NetworkType) => {
    setNetworkMenuVisible(false);
    await switchNetwork(network);
    setCurrentNetwork(network);
    handleRefresh();
  };

  const initializeWallet = useCallback(async () => {
    try {
      console.log('[Home] Starting wallet initialization...');
      setLoading(true);
      await loadSavedNetwork();
      setCurrentNetwork(getNetwork());

      console.log('[Home] Restoring wallet...');
      const wallet = await walletService.restoreWallet();

      if (!wallet) {
        console.log('[Home] No wallet found, redirecting to import page');
        // 没有钱包，跳转到导入页面，保持 loading 状态
        router.replace('/');
        return;
      }

      console.log('[Home] Wallet restored:', wallet.publicKey.toBase58());
      setPublicKey(wallet.publicKey.toBase58());

      const [list, activeId] = await Promise.all([
        walletService.getWalletList(),
        walletService.getActiveWalletId(),
      ]);
      const active = list.find(w => w.id === activeId);
      setCurrentWalletName(active?.name || 'Wallet');
      console.log('[Home] Active wallet:', active?.name);

      console.log('[Home] Loading tokens...');
      // 添加超时保护
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Token loading timeout')), 30000)
      );

      try {
        const result = await Promise.race([
          tokenService.getAllTokensWithPrices(wallet.publicKey),
          timeoutPromise
        ]) as any;

        setTokens(result.tokens);
        setTotalUsd(result.totalUsd);
        setTotalChange(result.totalChange);
        console.log('[Home] Tokens loaded:', result.tokens.length);
      } catch (tokenError) {
        console.error('[Home] Token loading failed:', tokenError);
        // 即使加载失败也继续，显示空列表
        setTokens([]);
        setTotalUsd(0);
        setTotalChange(0);
      }

      setLoading(false);
      console.log('[Home] Initialization complete');
    } catch (error) {
      console.error('[Home] Failed to initialize wallet:', error);
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { initializeWallet(); }, [initializeWallet]));

  const loadNfts = async (force = false) => {
    if (nftsLoaded && !force) return;
    setNftsLoading(true);
    try {
      const wallet = await walletService.restoreWallet();
      if (wallet) {
        const list = await nftService.getNFTs(wallet.publicKey);
        setNfts(list);
        setNftsLoaded(true);
        if (list.length > 0) {
          nftService.enrichNFTsWithPrices(list).then(setNfts).catch(() => {});
        }
      }
    } catch (e: any) {
      console.log('[Home] NFT load error:', e?.message);
    }
    finally { setNftsLoading(false); }
  };

  const lastRefreshRef = React.useRef(0);

  const handleRefresh = async () => {
    const now = Date.now();
    if (now - lastRefreshRef.current < 15000) {
      setRefreshing(false);
      return;
    }
    lastRefreshRef.current = now;

    setRefreshing(true);
    try {
      const wallet = await walletService.restoreWallet();
      if (wallet) {
        const result = await tokenService.getAllTokensWithPrices(wallet.publicKey);
        setTokens(result.tokens);
        setTotalUsd(result.totalUsd);
        setTotalChange(result.totalChange);
        if (activeTab === 'nft') {
          try {
            const list = await nftService.getNFTs(wallet.publicKey);
            setNfts(list);
          } catch (nftErr) {
            console.log('[Home] NFT refresh failed:', nftErr);
          }
        }
      }
    } catch (e) { console.error('Refresh error:', e); }
    finally { setRefreshing(false); }
  };

  const navigation = useNavigation();
  const rootNavigation = navigation.getParent();

  const handleLogout = () => {
    Alert.alert(t('home.logout'), t('home.logoutConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('home.logout'),
        style: 'destructive',
        onPress: async () => {
          try {
            await storageService.clearWalletData();

            setPublicKey('');
            setTokens([]);
            setNfts([]);
            setTotalUsd(0);
            setTotalChange(0);
            setCurrentWalletName('');
          } catch (error) {
            console.error('Logout failed:', error);
          } finally {
            const nav = rootNavigation || navigation;
            nav.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'index' }],
              })
            );
          }
        }
      },
    ]);
  };

  const handleAddToken = async () => {
    if (!newTokenMint.trim() || !newTokenSymbol.trim()) { Alert.alert(t('common.error'), t('home.mintRequired')); return; }
    try {
      await storageService.addCustomToken({ mint: newTokenMint.trim(), symbol: newTokenSymbol.trim().toUpperCase(), name: newTokenName.trim() || newTokenSymbol.trim().toUpperCase(), decimals: parseInt(newTokenDecimals) || 9 });
      setAddTokenVisible(false); setNewTokenMint(''); setNewTokenSymbol(''); setNewTokenName(''); setNewTokenDecimals('9');
      handleRefresh();
    } catch { Alert.alert(t('common.error'), t('home.addFailed')); }
  };

  const copyAddress = () => {
    Clipboard.setString(publicKey);
    Alert.alert(t('common.success'), t('home.addressCopied'));
  };

  const shortAddr = publicKey ? `${publicKey.slice(0, 6)}...${publicKey.slice(-4)}` : '';

  const changeUsd = totalChange !== 0 ? totalUsd - totalUsd / (1 + totalChange / 100) : 0;

  if (loading) {
    return <View style={styles.loadingContainer}><ActivityIndicator size="large" color={colors.accent} /></View>;
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.accountSelector} onPress={() => router.push('/wallet-manage')} activeOpacity={0.7}>
            <View style={styles.accountAvatar}>
              <Text style={styles.accountAvatarText}>{currentWalletName.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={styles.accountName} numberOfLines={1}>{currentWalletName}</Text>
            <IconButton icon="chevron-down" size={16} iconColor={colors.textSecondary} style={{ margin: 0 }} />
          </TouchableOpacity>

          <View style={styles.headerRight}>
            <IconButton icon="content-copy" size={20} iconColor={colors.textSecondary} onPress={copyAddress} style={{ margin: 0 }} />
            <Menu
              visible={menuVisible}
              onDismiss={() => setMenuVisible(false)}
              contentStyle={{ backgroundColor: colors.bgSecondary }}
              anchor={<IconButton icon="cog" size={22} iconColor={colors.text} onPress={() => setMenuVisible(true)} style={{ margin: 0 }} />}
            >
              <Menu.Item onPress={() => { setMenuVisible(false); router.push('/wallet-manage'); }} title={t('home.manageWallets')} leadingIcon="wallet-outline" titleStyle={{ color: colors.text }} />
              <Menu.Item onPress={() => { setMenuVisible(false); router.push('/rpc-settings'); }} title={t('home.rpcSettings')} leadingIcon="server-network" titleStyle={{ color: colors.text }} />
              <Menu.Item onPress={() => { setMenuVisible(false); router.push('/biometric-settings'); }} title={t('home.biometricSettings')} leadingIcon="fingerprint" titleStyle={{ color: colors.text }} />
              <Menu.Item onPress={() => { setMenuVisible(false); router.push('/language'); }} title={t('home.language')} leadingIcon="translate" titleStyle={{ color: colors.text }} />
              <Menu.Item onPress={() => { setMenuVisible(false); handleLogout(); }} title={t('home.logout')} leadingIcon="logout" titleStyle={{ color: colors.negative }} />
            </Menu>
          </View>
        </View>

        {/* Balance Area */}
        <View style={styles.balanceArea}>
          <View style={styles.addressRow}>
            <Text style={styles.addressText}>{shortAddr}</Text>
            <Menu
              visible={networkMenuVisible}
              onDismiss={() => setNetworkMenuVisible(false)}
              contentStyle={{ backgroundColor: colors.bgSecondary }}
              anchor={
                <TouchableOpacity style={styles.networkBadge} onPress={() => setNetworkMenuVisible(true)} activeOpacity={0.7}>
                  <View style={[styles.networkDot, { backgroundColor: currentNetwork === 'mainnet-beta' ? colors.positive : colors.warning }]} />
                  <Text style={styles.networkLabel}>{currentNetwork === 'mainnet-beta' ? 'Mainnet' : currentNetwork === 'devnet' ? 'Devnet' : 'Testnet'}</Text>
                  <IconButton icon="chevron-down" size={12} iconColor={colors.textTertiary} style={{ margin: 0, width: 16, height: 16 }} />
                </TouchableOpacity>
              }
            >
              {(['mainnet-beta', 'devnet', 'testnet'] as NetworkType[]).map(net => (
                <Menu.Item
                  key={net}
                  onPress={() => handleNetworkSwitch(net)}
                  title={net === 'mainnet-beta' ? 'Mainnet' : net === 'devnet' ? 'Devnet' : 'Testnet'}
                  leadingIcon={currentNetwork === net ? 'check' : undefined}
                  titleStyle={{ color: currentNetwork === net ? colors.accent : colors.text }}
                />
              ))}
            </Menu>
          </View>
          <Text style={styles.totalBalance}>${totalUsd.toFixed(2)}</Text>
          <View style={styles.changeRow}>
            <Text style={[styles.changeText, { color: totalChange >= 0 ? colors.positive : colors.negative }]}>
              {totalChange >= 0 ? '+' : ''}{changeUsd.toFixed(2)}
              {'  '}({totalChange >= 0 ? '+' : ''}{totalChange.toFixed(2)}%)
            </Text>
            <Text style={styles.changePeriod}>24h</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          {[
            { icon: 'arrow-top-right', label: t('home.send'), route: '/send' },
            { icon: 'arrow-bottom-left', label: t('home.receive'), route: '/receive' },
            { icon: 'history', label: t('home.history'), route: '/transactions' },
          ].map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={styles.actionItem}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <View style={styles.actionCircle}>
                <IconButton icon={item.icon} size={22} iconColor={colors.text} style={{ margin: 0 }} />
              </View>
              <Text style={styles.actionLabel}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Chips */}
        <View style={styles.tabRow}>
          {(['tokens', 'nft'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabChip, activeTab === tab && styles.tabChipActive]}
              onPress={() => {
                setActiveTab(tab);
                if (tab === 'nft') loadNfts();
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabChipText, activeTab === tab && styles.tabChipTextActive]}>
                {tab === 'tokens' ? t('home.tokens') : 'NFT'}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={{ flex: 1 }} />
          {activeTab === 'tokens' && (
            <TouchableOpacity onPress={() => setAddTokenVisible(true)}>
              <IconButton icon="plus" size={20} iconColor={colors.accent} style={{ margin: 0 }} />
            </TouchableOpacity>
          )}
        </View>

        {/* Token / NFT Content */}
        {activeTab === 'tokens' ? (
          <View style={styles.tokenListContainer}>
            {tokens.length === 0 ? (
              <Text style={styles.emptyText}>{t('components.noTokens')}</Text>
            ) : (
              tokens.map((token) => {
                const amt = token.uiAmount;
                const amtStr = amt === 0 ? '0' : amt < 0.000001 ? amt.toExponential(2) : amt < 1 ? amt.toFixed(6) : amt.toFixed(4);
                return (
                  <View key={token.address || token.mint} style={styles.tokenRow}>
                    <TokenLogo uri={token.logoURI} symbol={token.symbol} />
                    <View style={styles.tokenMid}>
                      <Text style={styles.tokenSymbol}>{token.symbol || t('common.unknown')}</Text>
                      <Text style={styles.tokenAmount}>{amtStr}</Text>
                    </View>
                    <View style={styles.tokenRight}>
                      <Text style={styles.tokenUsd}>
                        {token.usdValue != null ? `$${token.usdValue.toFixed(2)}` : '--'}
                      </Text>
                      {token.usdPrice != null ? (
                        <Text style={styles.tokenPrice}>
                          ${token.usdPrice < 0.01 ? token.usdPrice.toPrecision(4) : token.usdPrice.toFixed(2)}
                          {token.priceChange24h != null && token.priceChange24h !== 0 && (
                            <Text style={{ color: token.priceChange24h >= 0 ? colors.positive : colors.negative }}>
                              {' '}({token.priceChange24h >= 0 ? '+' : ''}{token.priceChange24h.toFixed(2)}%)
                            </Text>
                          )}
                        </Text>
                      ) : (
                        <Text style={styles.tokenPrice}>--</Text>
                      )}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        ) : (
          <View style={styles.nftContainer}>
            {nftsLoading ? (
              <ActivityIndicator size="small" color={colors.accent} style={{ marginTop: 32 }} />
            ) : (
              <NFTGrid nfts={nfts} onNFTPress={(nft) => router.push({ pathname: '/nft-detail', params: { mint: nft.mint } })} />
            )}
          </View>
        )}
      </ScrollView>

      {/* Add Token Modal */}
      <Portal>
        <Modal visible={addTokenVisible} onDismiss={() => setAddTokenVisible(false)} contentContainerStyle={styles.modal}>
          <Text style={styles.modalTitle}>{t('home.addCustomToken')}</Text>
          <TextInput label={t('home.mintAddress')} value={newTokenMint} onChangeText={setNewTokenMint} mode="outlined" style={styles.modalInput} placeholder={t('home.mintPlaceholder')} textColor={colors.text} placeholderTextColor={colors.textTertiary} outlineColor={colors.inputBorder} activeOutlineColor={colors.accent} />
          <TextInput label={t('home.symbol')} value={newTokenSymbol} onChangeText={setNewTokenSymbol} mode="outlined" style={styles.modalInput} placeholder={t('home.symbolPlaceholder')} textColor={colors.text} placeholderTextColor={colors.textTertiary} outlineColor={colors.inputBorder} activeOutlineColor={colors.accent} />
          <TextInput label={t('home.name')} value={newTokenName} onChangeText={setNewTokenName} mode="outlined" style={styles.modalInput} placeholder={t('home.namePlaceholder')} textColor={colors.text} placeholderTextColor={colors.textTertiary} outlineColor={colors.inputBorder} activeOutlineColor={colors.accent} />
          <TextInput label={t('home.decimals')} value={newTokenDecimals} onChangeText={setNewTokenDecimals} mode="outlined" style={styles.modalInput} keyboardType="numeric" placeholder="9" textColor={colors.text} placeholderTextColor={colors.textTertiary} outlineColor={colors.inputBorder} activeOutlineColor={colors.accent} />
          <View style={styles.modalBtns}>
            <Button mode="outlined" onPress={() => setAddTokenVisible(false)} textColor={colors.text} style={styles.modalBtn}>{t('common.cancel')}</Button>
            <Button mode="contained" onPress={handleAddToken} buttonColor={colors.accent} textColor="#000" style={styles.modalBtn}>{t('common.add')}</Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingTop: 48 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.bg },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 },
  accountSelector: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  accountAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.accent, justifyContent: 'center', alignItems: 'center' },
  accountAvatarText: { fontSize: 13, fontWeight: 'bold', color: '#000' },
  accountName: { fontSize: 15, fontWeight: '600', color: colors.text, maxWidth: 120 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },

  balanceArea: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  addressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  addressText: { fontSize: 13, color: colors.textSecondary },
  networkBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgSecondary, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: colors.cardBorder, gap: 4 },
  networkDot: { width: 6, height: 6, borderRadius: 3 },
  networkLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: '500' },
  totalBalance: { fontSize: 36, fontWeight: 'bold', color: colors.text, letterSpacing: -1 },
  changeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  changeText: { fontSize: 14, fontWeight: '500' },
  changePeriod: { fontSize: 12, color: colors.textTertiary },

  actionsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 24, paddingVertical: 16 },
  actionItem: { alignItems: 'center', gap: 6 },
  actionCircle: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.bgSecondary, borderWidth: 1, borderColor: colors.cardBorder, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },

  tabRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 8, gap: 8, borderBottomWidth: 1, borderBottomColor: colors.divider },
  tabChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: colors.chipBg },
  tabChipActive: { backgroundColor: colors.chipActiveBg },
  tabChipText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  tabChipTextActive: { color: colors.chipActiveText },

  tokenListContainer: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 24 },
  tokenRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.divider },
  tokenLogoFallback: { backgroundColor: colors.bgTertiary, justifyContent: 'center', alignItems: 'center' },
  tokenLogoLetter: { fontSize: 16, fontWeight: 'bold', color: colors.textSecondary },
  tokenMid: { flex: 1, marginLeft: 12 },
  tokenSymbol: { fontSize: 16, fontWeight: '600', color: colors.text },
  tokenAmount: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  tokenRight: { alignItems: 'flex-end' },
  tokenUsd: { fontSize: 16, fontWeight: '600', color: colors.text },
  tokenPrice: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },

  nftContainer: { paddingBottom: 24, minHeight: 200 },
  emptyText: { textAlign: 'center', color: colors.textSecondary, paddingVertical: 40, fontSize: 15 },

  modal: { backgroundColor: colors.bgSecondary, margin: 20, padding: 20, borderRadius: 16, borderWidth: 1, borderColor: colors.cardBorder },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16, textAlign: 'center', color: colors.text },
  modalInput: { marginBottom: 12, backgroundColor: colors.bgTertiary },
  modalBtns: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 8 },
  modalBtn: { minWidth: 80, borderRadius: 10 },
});
