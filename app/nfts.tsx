import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Text, ActivityIndicator, SegmentedButtons, Searchbar } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { useI18n } from '@/i18n/context';
import NFTGrid from '@/components/NFTGrid';
import * as nftService from '@/services/nftService';
import * as walletService from '@/services/walletService';
import { NFT } from '@/services/nftService';
import { colors } from '@/constants/theme';

export default function NFTsPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [filteredNfts, setFilteredNfts] = useState<NFT[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [collections, setCollections] = useState<Map<string, NFT[]>>(new Map());

  useEffect(() => {
    loadNFTs();
  }, []);

  useEffect(() => {
    filterNFTs();
  }, [nfts, viewMode, searchQuery]);

  const loadNFTs = async () => {
    try {
      const wallet = await walletService.restoreWallet();

      if (!wallet) {
        router.replace('/');
        return;
      }

      const nftList = await nftService.getNFTs(wallet.publicKey);
      setNfts(nftList);

      const grouped = nftService.groupNFTsByCollection(nftList);
      setCollections(grouped);
    } catch (error) {
      console.error('Failed to load NFTs:', error);
      Alert.alert(t('common.error'), t('nfts.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNFTs();
    setRefreshing(false);
  };

  const filterNFTs = () => {
    let filtered = [...nfts];

    if (viewMode !== 'all') {
      filtered = collections.get(viewMode) || [];
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (nft) =>
          nft.name.toLowerCase().includes(query) ||
          nft.symbol.toLowerCase().includes(query) ||
          nft.collection?.name.toLowerCase().includes(query)
      );
    }

    setFilteredNfts(filtered);
  };

  const handleNFTPress = (nft: NFT) => {
    router.push({
      pathname: '/nft-detail',
      params: { mint: nft.mint },
    });
  };

  const getCollectionButtons = () => {
    const buttons = [{ value: 'all', label: `${t('transactions.all')} (${nfts.length})` }];

    collections.forEach((nftList, collectionName) => {
      buttons.push({
        value: collectionName,
        label: `${collectionName} (${nftList.length})`,
      });
    });

    return buttons.slice(0, 4);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.loadingText}>{t('nfts.loadingNfts')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          {t('nfts.myNfts')}
        </Text>
        <Text style={styles.count}>
          {filteredNfts.length} {filteredNfts.length === 1 ? t('nfts.nft') : t('nfts.nftsPlural')}
        </Text>
      </View>

      <View style={styles.controls}>
        <Searchbar
          placeholder={t('nfts.searchPlaceholder')}
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
          inputStyle={{ color: colors.text }}
          placeholderTextColor={colors.textTertiary}
          iconColor={colors.textSecondary}
        />

        {collections.size > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.filterContainer}
          >
            {getCollectionButtons().map((button) => (
              <TouchableOpacity
                key={button.value}
                style={[
                  styles.filterButton,
                  viewMode === button.value && styles.filterButtonActive,
                ]}
                onPress={() => setViewMode(button.value)}
              >
                <Text
                  style={[
                    styles.filterButtonText,
                    viewMode === button.value && styles.filterButtonTextActive,
                  ]}
                >
                  {button.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.accent} />}
      >
        <NFTGrid nfts={filteredNfts} onNFTPress={handleNFTPress} />
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
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: colors.text,
  },
  count: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  controls: {
    padding: 16,
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
    marginBottom: 8,
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
});
