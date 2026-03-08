import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, useWindowDimensions } from 'react-native';
import { useI18n } from '@/i18n/context';
import { NFT } from '@/services/nftService';
import { colors } from '@/constants/theme';

interface NFTGridProps {
  nfts: NFT[];
  onNFTPress?: (nft: NFT) => void;
}

const GRID_GAP = 12;
const COLUMNS = 2;

function NFTImage({ uri }: { uri?: string }) {
  const [failed, setFailed] = useState(false);
  if (!uri || failed) {
    return (
      <View style={styles.placeholderImage}>
        <Text style={styles.placeholderText}>No Image</Text>
      </View>
    );
  }
  return <Image source={{ uri }} style={styles.nftImage} resizeMode="cover" onError={() => setFailed(true)} />;
}

export default function NFTGrid({ nfts, onNFTPress }: NFTGridProps) {
  const { t } = useI18n();
  const { width: screenWidth } = useWindowDimensions();
  const itemWidth = Math.floor((screenWidth - GRID_GAP * (COLUMNS + 1)) / COLUMNS);

  if (nfts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>{t('components.noNfts')}</Text>
        <Text style={styles.emptySubtext}>{t('components.nftsHere')}</Text>
      </View>
    );
  }

  return (
    <View style={styles.listContainer}>
      <View style={styles.gridWrapper}>
        {nfts.map((item) => (
          <TouchableOpacity
            key={item.mint}
            style={[styles.nftContainer, { width: itemWidth }]}
            onPress={() => onNFTPress?.(item)}
            activeOpacity={0.7}
          >
            <View style={[styles.imageContainer, { height: itemWidth }]}>
              <NFTImage uri={item.image} />
            </View>
            <View style={styles.nftInfo}>
              {item.collection?.name && (
                <Text style={styles.collectionName} numberOfLines={1}>{item.collection.name}</Text>
              )}
              <Text style={styles.nftName} numberOfLines={1}>{item.name}</Text>
              {item.floorPrice != null && item.floorPrice > 0 && (
                <View style={styles.priceRow}>
                  <Text style={styles.priceLabel}>{t('components.lastSale')}</Text>
                  <View style={styles.priceValue}>
                    <Image source={{ uri: 'https://assets.coingecko.com/coins/images/4128/small/solana.png' }} style={styles.solIcon} />
                    <Text style={styles.priceText}>{item.floorPrice.toFixed(3)}</Text>
                  </View>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  listContainer: {
    paddingHorizontal: GRID_GAP,
    paddingTop: 8,
  },
  gridWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  nftContainer: {
    borderRadius: 14,
    backgroundColor: colors.card,
    borderColor: colors.cardBorder,
    borderWidth: 1,
    overflow: 'hidden',
  },
  imageContainer: {
    width: '100%',
    backgroundColor: colors.bgTertiary,
  },
  nftImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bgSecondary,
  },
  placeholderText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  nftInfo: {
    padding: 10,
  },
  collectionName: {
    fontSize: 11,
    color: colors.textTertiary,
    marginBottom: 2,
  },
  nftName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  priceLabel: {
    fontSize: 10,
    color: colors.textTertiary,
  },
  priceValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  solIcon: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  priceText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textTertiary,
    textAlign: 'center',
  },
});
