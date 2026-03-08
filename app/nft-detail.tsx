import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Linking,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { Text, Button, ActivityIndicator, IconButton, TextInput, Portal, Modal } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useI18n } from '@/i18n/context';
import * as nftService from '@/services/nftService';
import * as walletService from '@/services/walletService';
import { NFT } from '@/services/nftService';
import { colors } from '@/constants/theme';
import * as Clipboard from 'expo-clipboard';

export default function NFTDetail() {
  const { t } = useI18n();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const { mint } = useLocalSearchParams<{ mint: string }>();
  const [nft, setNft] = useState<NFT | null>(null);
  const [loading, setLoading] = useState(true);
  const [transferring, setTransferring] = useState(false);
  const [transferVisible, setTransferVisible] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState('');
  const [priceInfo, setPriceInfo] = useState<{ listingPrice?: number; floorPrice?: number }>({});

  useEffect(() => {
    if (mint) {
      loadNFTDetails();
      loadPrice();
    }
  }, [mint]);

  const loadNFTDetails = async () => {
    try {
      const details = await nftService.getNFTDetails(mint);
      setNft(details);
    } catch (error) {
      console.error('Failed to load NFT details:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPrice = async () => {
    try {
      const info = await nftService.getNFTPrice(mint);
      setPriceInfo(info);
    } catch (error) {
      console.log('[NFT Detail] Failed to load price:', error);
      // 价格加载失败不影响页面显示
    }
  };

  const handleTransfer = async () => {
    const addr = recipientAddress.trim();
    if (!addr) {
      Alert.alert(t('common.error'), t('nftDetail.enterRecipient'));
      return;
    }

    try {
      setTransferring(true);
      const wallet = await walletService.restoreWallet();
      if (!wallet) {
        Alert.alert(t('common.error'), t('send.walletNotFound'));
        return;
      }
      const { PublicKey } = require('@solana/web3.js');
      let recipientPubkey: any;
      try {
        recipientPubkey = new PublicKey(addr);
      } catch {
        Alert.alert(t('common.error'), t('send.invalidAddress'));
        return;
      }
      const signature = await nftService.transferNFT(mint, wallet.publicKey, recipientPubkey, wallet.secretKey);
      setTransferVisible(false);
      setRecipientAddress('');
      Alert.alert(t('common.success'), `${t('nftDetail.transferSuccess')}\nTx: ${signature.slice(0, 8)}...`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (error: any) {
      const errorMsg = error.message || t('nftDetail.transferFailed');

      // 检查是否是 compressed NFT
      if (errorMsg.includes('compressed NFT') || errorMsg.includes('cNFT')) {
        Alert.alert(
          t('common.error'),
          'This appears to be a Compressed NFT (cNFT). Compressed NFTs use a different transfer mechanism and are not yet supported in this wallet.\n\nCompressed NFTs require special handling through the Bubblegum program.',
          [{ text: 'OK' }]
        );
      } else if (errorMsg.includes('does not own this NFT')) {
        Alert.alert(t('common.error'), 'You do not own this NFT or it has already been transferred.');
      } else {
        Alert.alert(t('common.error'), errorMsg);
      }
    } finally {
      setTransferring(false);
    }
  };

  const copyMint = async () => {
    await Clipboard.setStringAsync(mint);
    Alert.alert('', t('home.addressCopied'));
  };

  const openMarketplace = () => {
    Linking.openURL(`https://magiceden.io/item-details/${mint}`);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  if (!nft) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{t('nftDetail.nftNotFound')}</Text>
        <Button mode="contained" onPress={() => router.back()} buttonColor={colors.buttonPrimary} textColor={colors.buttonPrimaryText}>
          {t('common.goBack')}
        </Button>
      </View>
    );
  }

  const shortMint = `${mint.slice(0, 5)}...${mint.slice(-4)}`;

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <IconButton icon="chevron-left" size={24} iconColor={colors.text} style={{ margin: 0 }} />
        </TouchableOpacity>

        {/* NFT Image */}
        <View style={[styles.imageContainer, { height: screenWidth * 0.85 }]}>
          {nft.image ? (
            <Image source={{ uri: nft.image }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={styles.placeholderImage}>
              <Text style={styles.placeholderText}>{t('nftDetail.noImage')}</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          {/* NFT Name */}
          <Text style={styles.name}>{nft.name}</Text>

          {/* View on marketplace */}
          <TouchableOpacity style={styles.marketplaceRow} onPress={openMarketplace}>
            <Text style={styles.marketplaceText}>{t('nftDetail.viewOnMarketplace')}</Text>
            <IconButton icon="open-in-new" size={18} iconColor={colors.text} style={{ margin: 0 }} />
          </TouchableOpacity>

          <View style={styles.divider} />

          {/* Price info */}
          {priceInfo.listingPrice != null && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('nftDetail.nftPrice')}</Text>
              <View style={styles.infoValue}>
                <Image source={{ uri: 'https://assets.coingecko.com/coins/images/4128/small/solana.png' }} style={styles.solIcon} />
                <Text style={styles.infoText}>{priceInfo.listingPrice.toFixed(3)} SOL</Text>
              </View>
            </View>
          )}

          {priceInfo.floorPrice != null && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t('nftDetail.floorPrice')}</Text>
              <View style={styles.infoValue}>
                <Image source={{ uri: 'https://assets.coingecko.com/coins/images/4128/small/solana.png' }} style={styles.solIcon} />
                <Text style={styles.infoText}>{priceInfo.floorPrice.toFixed(3)} SOL</Text>
              </View>
            </View>
          )}

          {/* Mint address */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('nftDetail.contractAddress')}</Text>
            <TouchableOpacity style={styles.infoValue} onPress={copyMint}>
              <Text style={styles.infoText}>{shortMint}</Text>
              <IconButton icon="content-copy" size={16} iconColor={colors.textSecondary} style={{ margin: 0, marginLeft: 2 }} />
            </TouchableOpacity>
          </View>

          {/* Token Standard */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('nftDetail.tokenStandard')}</Text>
            <Text style={styles.infoText}>Metaplex</Text>
          </View>

          {/* Network */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('nftDetail.network')}</Text>
            <Text style={styles.infoText}>Solana</Text>
          </View>

          {/* Attributes */}
          {nft.attributes && nft.attributes.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionTitle}>{t('nftDetail.attributes')}</Text>
              <View style={styles.attributesGrid}>
                {nft.attributes.map((attr, index) => (
                  <View key={index} style={styles.attribute}>
                    <Text style={styles.attributeType}>{attr.trait_type}</Text>
                    <Text style={styles.attributeValue}>{attr.value}</Text>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Transfer Button */}
      <TouchableOpacity
        style={styles.bottomBar}
        activeOpacity={0.8}
        onPress={() => setTransferVisible(true)}
        disabled={transferring}
      >
        <View style={styles.transferBtn}>
          <Text style={styles.transferBtnLabel}>{t('nftDetail.transfer')}</Text>
        </View>
      </TouchableOpacity>

      {/* Transfer Modal */}
      {transferVisible && <Portal>
        <Modal
          visible={transferVisible}
          onDismiss={() => !transferring && setTransferVisible(false)}
          contentContainerStyle={styles.transferModal}
        >
          <Text style={styles.transferModalTitle}>{t('nftDetail.transferNft')}</Text>

          {nft && (
            <View style={styles.transferNftPreview}>
              {nft.image ? (
                <Image source={{ uri: nft.image }} style={styles.transferNftImage} />
              ) : (
                <View style={[styles.transferNftImage, { backgroundColor: colors.bgTertiary, justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ color: colors.textSecondary }}>NFT</Text>
                </View>
              )}
              <Text style={styles.transferNftName} numberOfLines={1}>{nft.name}</Text>
            </View>
          )}

          <TextInput
            label={t('nftDetail.enterRecipient')}
            value={recipientAddress}
            onChangeText={setRecipientAddress}
            mode="outlined"
            style={styles.transferInput}
            placeholder="recipient wallet address"
            textColor={colors.text}
            placeholderTextColor={colors.textTertiary}
            outlineColor={colors.inputBorder}
            activeOutlineColor={colors.accent}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.transferModalBtns}>
            <Button
              mode="outlined"
              onPress={() => { setTransferVisible(false); setRecipientAddress(''); }}
              disabled={transferring}
              style={styles.transferModalBtn}
              textColor={colors.text}
            >
              {t('common.cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleTransfer}
              loading={transferring}
              disabled={transferring || !recipientAddress.trim()}
              style={styles.transferModalBtn}
              buttonColor={colors.accent}
              textColor="#000"
            >
              {t('nftDetail.transfer')}
            </Button>
          </View>
        </Modal>
      </Portal>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scrollView: {
    flex: 1,
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
  backBtn: {
    position: 'absolute',
    top: 44,
    left: 8,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageContainer: {
    width: '100%',
    backgroundColor: colors.bgTertiary,
  },
  image: {
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
    fontSize: 16,
  },
  content: {
    padding: 20,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
  },
  marketplaceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: colors.bgSecondary,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  marketplaceText: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  infoValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  solIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  attributesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attribute: {
    backgroundColor: colors.bgSecondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: 12,
    minWidth: '30%',
    flexGrow: 1,
  },
  attributeType: {
    fontSize: 10,
    color: colors.textTertiary,
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  attributeValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  bottomBar: {
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.bg,
  },
  transferBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  transferBtnLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  transferModal: {
    backgroundColor: colors.bgSecondary,
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  transferModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  transferNftPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.bgTertiary,
  },
  transferNftImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  transferNftName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  transferInput: {
    marginBottom: 16,
    backgroundColor: colors.bgTertiary,
  },
  transferModalBtns: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  transferModalBtn: {
    minWidth: 90,
    borderRadius: 10,
  },
});
