import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import {
  Text,
  IconButton,
  Button,
  Portal,
  Modal,
  TextInput,
  ActivityIndicator,
  RadioButton,
} from 'react-native-paper';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useI18n } from '@/i18n/context';
import { colors } from '@/constants/theme';
import * as walletService from '@/services/walletService';
import { WalletRecord } from '@/types';

export default function WalletManage() {
  const router = useRouter();
  const { t } = useI18n();
  const [wallets, setWallets] = useState<WalletRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [addVisible, setAddVisible] = useState(false);
  const [importType, setImportType] = useState<'mnemonic' | 'private_key'>('mnemonic');
  const [inputValue, setInputValue] = useState('');
  const [walletName, setWalletName] = useState('');
  const [adding, setAdding] = useState(false);

  const [renameVisible, setRenameVisible] = useState(false);
  const [renameTarget, setRenameTarget] = useState<WalletRecord | null>(null);
  const [renameName, setRenameName] = useState('');

  const [exportVisible, setExportVisible] = useState(false);
  const [exportTarget, setExportTarget] = useState<WalletRecord | null>(null);
  const [exportedPrivateKey, setExportedPrivateKey] = useState('');
  const [exportedMnemonic, setExportedMnemonic] = useState('');

  const loadWallets = useCallback(async () => {
    try {
      const [list, currentId] = await Promise.all([
        walletService.getWalletList(),
        walletService.getActiveWalletId(),
      ]);
      setWallets(list);
      setActiveId(currentId);
    } catch (e) {
      console.error('Failed to load wallets:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { loadWallets(); }, [loadWallets]);

  const handleSwitch = async (id: string) => {
    if (id === activeId) return;
    try {
      await walletService.switchWallet(id);
      setActiveId(id);
      router.back();
    } catch (e) {
      Alert.alert(t('common.error'), t('walletManage.switchFailed'));
    }
  };

  const handleDelete = (record: WalletRecord) => {
    if (wallets.length <= 1) {
      Alert.alert(t('common.error'), t('walletManage.cannotDeleteLast'));
      return;
    }
    Alert.alert(
      t('walletManage.deleteWallet'),
      t('walletManage.deleteConfirm', { name: record.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            await walletService.removeWallet(record.id);
            loadWallets();
          },
        },
      ],
    );
  };

  const handleAdd = async () => {
    if (!inputValue.trim()) {
      Alert.alert(t('common.error'), t('walletManage.inputRequired'));
      return;
    }
    setAdding(true);
    try {
      if (importType === 'mnemonic') {
        await walletService.addWalletFromMnemonic(inputValue.trim(), walletName.trim() || undefined);
      } else {
        await walletService.addWalletFromPrivateKey(inputValue.trim(), walletName.trim() || undefined);
      }
      setAddVisible(false);
      setInputValue('');
      setWalletName('');
      loadWallets();
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('walletManage.addFailed'));
    } finally {
      setAdding(false);
    }
  };

  const handleGenerate = async () => {
    setAdding(true);
    try {
      const { mnemonic, record } = await walletService.generateAndAddWallet(
        walletName.trim() || undefined,
      );
      setAddVisible(false);
      setInputValue('');
      setWalletName('');
      Alert.alert(
        t('walletManage.newWalletCreated'),
        `${t('walletManage.saveMnemonic')}\n\n${mnemonic}\n\n${t('walletManage.publicKey')}\n${record.publicKey}`,
        [{ text: t('walletManage.saved'), onPress: () => loadWallets() }],
      );
    } catch (e: any) {
      Alert.alert(t('common.error'), e.message || t('walletManage.addFailed'));
    } finally {
      setAdding(false);
    }
  };

  const handleRename = async () => {
    if (!renameTarget || !renameName.trim()) return;
    await walletService.renameWallet(renameTarget.id, renameName.trim());
    setRenameVisible(false);
    setRenameTarget(null);
    loadWallets();
  };

  const openRename = (record: WalletRecord) => {
    setRenameTarget(record);
    setRenameName(record.name);
    setRenameVisible(true);
  };

  const openExport = async (record: WalletRecord) => {
    try {
      const privateKey = await walletService.exportWalletPrivateKey(record.id);
      const mnemonic = await walletService.exportWalletMnemonic(record.id);

      setExportTarget(record);
      setExportedPrivateKey(privateKey || '');
      setExportedMnemonic(mnemonic || '');
      setExportVisible(true);
    } catch (e) {
      Alert.alert(t('common.error'), t('walletManage.exportFailed'));
    }
  };

  const shortAddr = (addr: string) =>
    addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadWallets(); }} tintColor={colors.accent} />
        }
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('walletManage.myWallets')}</Text>
          <Text style={styles.sectionSubtitle}>
            {wallets.length} {t('walletManage.walletsCount')}
          </Text>
        </View>

        {wallets.map((w) => {
          const isActive = w.id === activeId;
          return (
            <TouchableOpacity
              key={w.id}
              style={[styles.walletCard, isActive && styles.walletCardActive]}
              onPress={() => handleSwitch(w.id)}
              activeOpacity={0.7}
            >
              <View style={styles.walletCardLeft}>
                <View style={[styles.avatar, isActive && styles.avatarActive]}>
                  <Text style={[styles.avatarText, isActive && styles.avatarTextActive]}>
                    {w.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={styles.walletInfo}>
                  <View style={styles.walletNameRow}>
                    <Text style={styles.walletName} numberOfLines={1}>{w.name}</Text>
                    {isActive && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>{t('walletManage.current')}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.walletAddr}>{shortAddr(w.publicKey)}</Text>
                  <Text style={styles.walletType}>
                    {w.type === 'mnemonic' ? t('walletManage.typeMnemonic') : t('walletManage.typePrivateKey')}
                  </Text>
                </View>
              </View>
              <View style={styles.walletActions}>
                <IconButton
                  icon="key-outline"
                  size={18}
                  iconColor={colors.accent}
                  onPress={() => openExport(w)}
                />
                <IconButton
                  icon="pencil-outline"
                  size={18}
                  iconColor={colors.textSecondary}
                  onPress={() => openRename(w)}
                />
                <IconButton
                  icon="delete-outline"
                  size={18}
                  iconColor={colors.negative}
                  onPress={() => handleDelete(w)}
                />
              </View>
            </TouchableOpacity>
          );
        })}

        <View style={styles.addSection}>
          <Button
            mode="contained"
            icon="plus"
            onPress={() => setAddVisible(true)}
            style={styles.addButton}
            buttonColor={colors.buttonPrimary}
            textColor={colors.buttonPrimaryText}
          >
            {t('walletManage.addWallet')}
          </Button>
        </View>
      </ScrollView>

      {/* Add Wallet Modal */}
      <Portal>
        <Modal
          visible={addVisible}
          onDismiss={() => setAddVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text style={styles.modalTitle}>{t('walletManage.addWallet')}</Text>

          <TextInput
            label={t('walletManage.walletName')}
            value={walletName}
            onChangeText={setWalletName}
            mode="outlined"
            style={styles.modalInput}
            placeholder={t('walletManage.walletNamePlaceholder')}
            textColor={colors.text}
            placeholderTextColor={colors.textTertiary}
            outlineColor={colors.inputBorder}
            activeOutlineColor={colors.accent}
          />

          <Text style={styles.importLabel}>{t('walletManage.importMethod')}</Text>
          <View style={styles.radioRow}>
            <TouchableOpacity
              style={[styles.radioOption, importType === 'mnemonic' && styles.radioOptionActive]}
              onPress={() => setImportType('mnemonic')}
            >
              <RadioButton
                value="mnemonic"
                status={importType === 'mnemonic' ? 'checked' : 'unchecked'}
                onPress={() => setImportType('mnemonic')}
                color={colors.accent}
                uncheckedColor={colors.textSecondary}
              />
              <Text style={[styles.radioText, importType === 'mnemonic' && styles.radioTextActive]}>
                {t('walletManage.typeMnemonic')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.radioOption, importType === 'private_key' && styles.radioOptionActive]}
              onPress={() => setImportType('private_key')}
            >
              <RadioButton
                value="private_key"
                status={importType === 'private_key' ? 'checked' : 'unchecked'}
                onPress={() => setImportType('private_key')}
                color={colors.accent}
                uncheckedColor={colors.textSecondary}
              />
              <Text style={[styles.radioText, importType === 'private_key' && styles.radioTextActive]}>
                {t('walletManage.typePrivateKey')}
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            label={importType === 'mnemonic' ? t('index.mnemonicLabel') : t('index.privateKeyLabel')}
            value={inputValue}
            onChangeText={setInputValue}
            mode="outlined"
            style={styles.modalInputMulti}
            multiline={importType === 'mnemonic'}
            numberOfLines={importType === 'mnemonic' ? 3 : 1}
            placeholder={importType === 'mnemonic' ? t('index.mnemonicPlaceholder') : t('index.privateKeyPlaceholder')}
            textColor={colors.text}
            placeholderTextColor={colors.textTertiary}
            outlineColor={colors.inputBorder}
            activeOutlineColor={colors.accent}
            secureTextEntry={importType === 'private_key'}
          />

          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={() => setAddVisible(false)}
              style={styles.modalBtn}
              textColor={colors.text}
            >
              {t('common.cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleAdd}
              style={styles.modalBtn}
              buttonColor={colors.accent}
              textColor="#000"
              loading={adding}
              disabled={adding}
            >
              {t('walletManage.import')}
            </Button>
          </View>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('common.or')}</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            mode="outlined"
            icon="plus-circle-outline"
            onPress={handleGenerate}
            style={styles.generateBtn}
            textColor={colors.accent}
            loading={adding}
            disabled={adding}
          >
            {t('walletManage.generateNew')}
          </Button>
        </Modal>
      </Portal>

      {/* Rename Modal */}
      <Portal>
        <Modal
          visible={renameVisible}
          onDismiss={() => setRenameVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text style={styles.modalTitle}>{t('walletManage.renameWallet')}</Text>
          <TextInput
            label={t('walletManage.walletName')}
            value={renameName}
            onChangeText={setRenameName}
            mode="outlined"
            style={styles.modalInput}
            textColor={colors.text}
            outlineColor={colors.inputBorder}
            activeOutlineColor={colors.accent}
          />
          <View style={styles.modalButtons}>
            <Button
              mode="outlined"
              onPress={() => setRenameVisible(false)}
              style={styles.modalBtn}
              textColor={colors.text}
            >
              {t('common.cancel')}
            </Button>
            <Button
              mode="contained"
              onPress={handleRename}
              style={styles.modalBtn}
              buttonColor={colors.accent}
              textColor="#000"
            >
              {t('common.confirm')}
            </Button>
          </View>
        </Modal>
      </Portal>

      {/* Export Modal */}
      <Portal>
        <Modal
          visible={exportVisible}
          onDismiss={() => setExportVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <Text style={styles.modalTitle}>{t('walletManage.exportWallet')}</Text>

          <View style={styles.warningBox}>
            <Text style={styles.warningText}>⚠️ {t('walletManage.exportWarning')}</Text>
          </View>

          {exportedMnemonic && (
            <View style={styles.exportSection}>
              <Text style={styles.exportLabel}>{t('walletManage.mnemonic')}</Text>
              <View style={styles.exportBox}>
                <ScrollView style={styles.exportScroll}>
                  <Text style={styles.exportText} selectable>{exportedMnemonic}</Text>
                </ScrollView>
                <IconButton
                  icon="content-copy"
                  size={20}
                  iconColor={colors.accent}
                  onPress={async () => {
                    await Clipboard.setStringAsync(exportedMnemonic);
                    Alert.alert(t('common.success'), t('walletManage.copiedToClipboard'));
                  }}
                  style={styles.copyButton}
                />
              </View>
            </View>
          )}

          <View style={styles.exportSection}>
            <Text style={styles.exportLabel}>{t('walletManage.privateKey')}</Text>
            <View style={styles.exportBox}>
              <ScrollView style={styles.exportScroll}>
                <Text style={styles.exportText} selectable>{exportedPrivateKey}</Text>
              </ScrollView>
              <IconButton
                icon="content-copy"
                size={20}
                iconColor={colors.accent}
                onPress={async () => {
                  await Clipboard.setStringAsync(exportedPrivateKey);
                  Alert.alert(t('common.success'), t('walletManage.copiedToClipboard'));
                }}
                style={styles.copyButton}
              />
            </View>
          </View>

          <Button
            mode="contained"
            onPress={() => setExportVisible(false)}
            style={styles.closeButton}
            buttonColor={colors.accent}
            textColor="#000"
          >
            {t('common.close')}
          </Button>
        </Modal>
      </Portal>
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
  section: {
    padding: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  walletCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  walletCardActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
  },
  walletCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.bgTertiary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarActive: {
    backgroundColor: colors.accent,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textSecondary,
  },
  avatarTextActive: {
    color: '#000',
  },
  walletInfo: {
    flex: 1,
  },
  walletNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  walletName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    maxWidth: '60%',
  },
  activeBadge: {
    backgroundColor: colors.accent,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
  },
  walletAddr: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  walletType: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 1,
  },
  walletActions: {
    flexDirection: 'row',
  },
  addSection: {
    padding: 16,
    paddingTop: 8,
  },
  addButton: {
    borderRadius: 12,
  },
  modal: {
    backgroundColor: colors.bgSecondary,
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    maxHeight: '85%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: colors.text,
  },
  modalInput: {
    marginBottom: 12,
    backgroundColor: colors.bgTertiary,
  },
  modalInputMulti: {
    marginBottom: 12,
    backgroundColor: colors.bgTertiary,
    minHeight: 60,
  },
  importLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  radioRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: colors.bgTertiary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  radioOptionActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentDim,
  },
  radioText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  radioTextActive: {
    color: colors.text,
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    minWidth: 80,
    borderRadius: 10,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.divider,
  },
  dividerText: {
    marginHorizontal: 12,
    color: colors.textTertiary,
    fontSize: 13,
  },
  generateBtn: {
    borderColor: colors.accent,
    borderRadius: 10,
  },
  warningBox: {
    backgroundColor: colors.negative + '20',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.negative + '40',
  },
  warningText: {
    color: colors.negative,
    fontSize: 13,
    lineHeight: 18,
  },
  exportSection: {
    marginBottom: 16,
  },
  exportLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  exportBox: {
    backgroundColor: colors.bgTertiary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 4,
  },
  exportScroll: {
    flex: 1,
    maxHeight: 100,
    padding: 12,
  },
  exportText: {
    fontSize: 12,
    color: colors.text,
    fontFamily: 'monospace',
    lineHeight: 18,
  },
  copyButton: {
    margin: 0,
  },
  closeButton: {
    marginTop: 8,
    borderRadius: 10,
  },
});
