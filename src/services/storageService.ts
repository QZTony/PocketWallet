import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/config';
import { WalletRecord } from '@/types';

const WALLET_LIST_KEY = 'wallet_list';
const ACTIVE_WALLET_KEY = 'active_wallet_id';

function walletPkKey(id: string) { return `w_pk_${id}`; }
function walletMnKey(id: string) { return `w_mn_${id}`; }

// ---- 多钱包管理 ----

export async function getWalletList(): Promise<WalletRecord[]> {
  try {
    const data = await AsyncStorage.getItem(WALLET_LIST_KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

async function saveWalletList(list: WalletRecord[]): Promise<void> {
  await AsyncStorage.setItem(WALLET_LIST_KEY, JSON.stringify(list));
}

export async function getActiveWalletId(): Promise<string | null> {
  return await AsyncStorage.getItem(ACTIVE_WALLET_KEY);
}

export async function setActiveWalletId(id: string): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_WALLET_KEY, id);
  const list = await getWalletList();
  const record = list.find(w => w.id === id);
  if (record) {
    const pk = await SecureStore.getItemAsync(walletPkKey(id));
    if (pk) {
      await SecureStore.setItemAsync(STORAGE_KEYS.PRIVATE_KEY, pk);
      await SecureStore.setItemAsync(STORAGE_KEYS.PUBLIC_KEY, record.publicKey);
      await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_TYPE, record.type);
      const mn = await SecureStore.getItemAsync(walletMnKey(id));
      if (mn) await SecureStore.setItemAsync(STORAGE_KEYS.MNEMONIC, mn);
      else await SecureStore.deleteItemAsync(STORAGE_KEYS.MNEMONIC);
    }
  }
}

export async function addWalletRecord(
  record: WalletRecord,
  privateKey: string,
  mnemonic?: string,
): Promise<void> {
  await SecureStore.setItemAsync(walletPkKey(record.id), privateKey);
  if (mnemonic) await SecureStore.setItemAsync(walletMnKey(record.id), mnemonic);
  const list = await getWalletList();
  list.push(record);
  await saveWalletList(list);
}

export async function removeWalletRecord(id: string): Promise<void> {
  await SecureStore.deleteItemAsync(walletPkKey(id));
  await SecureStore.deleteItemAsync(walletMnKey(id));
  const list = await getWalletList();
  await saveWalletList(list.filter(w => w.id !== id));
  const activeId = await getActiveWalletId();
  if (activeId === id) {
    const remaining = list.filter(w => w.id !== id);
    if (remaining.length > 0) {
      await setActiveWalletId(remaining[0].id);
    } else {
      await AsyncStorage.removeItem(ACTIVE_WALLET_KEY);
      await clearWalletData();
    }
  }
}

export async function renameWallet(id: string, newName: string): Promise<void> {
  const list = await getWalletList();
  const idx = list.findIndex(w => w.id === id);
  if (idx >= 0) {
    list[idx].name = newName;
    await saveWalletList(list);
  }
}

export async function getWalletPrivateKey(id: string): Promise<string | null> {
  return await SecureStore.getItemAsync(walletPkKey(id));
}

export async function getWalletMnemonic(id: string): Promise<string | null> {
  return await SecureStore.getItemAsync(walletMnKey(id));
}

// ---- 兼容旧接口（操作当前活跃钱包）----

export async function savePrivateKey(privateKey: string): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEYS.PRIVATE_KEY, privateKey);
}

export async function getPrivateKey(): Promise<string | null> {
  return await SecureStore.getItemAsync(STORAGE_KEYS.PRIVATE_KEY);
}

export async function saveMnemonic(mnemonic: string): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEYS.MNEMONIC, mnemonic);
}

export async function getMnemonic(): Promise<string | null> {
  return await SecureStore.getItemAsync(STORAGE_KEYS.MNEMONIC);
}

export async function savePublicKey(publicKey: string): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEYS.PUBLIC_KEY, publicKey);
}

export async function getPublicKey(): Promise<string | null> {
  return await SecureStore.getItemAsync(STORAGE_KEYS.PUBLIC_KEY);
}

export async function saveWalletType(type: 'mnemonic' | 'private_key'): Promise<void> {
  await SecureStore.setItemAsync(STORAGE_KEYS.WALLET_TYPE, type);
}

export async function getWalletType(): Promise<string | null> {
  return await SecureStore.getItemAsync(STORAGE_KEYS.WALLET_TYPE);
}

export async function clearWalletData(): Promise<void> {
  const list = await getWalletList();
  for (const w of list) {
    await SecureStore.deleteItemAsync(walletPkKey(w.id));
    await SecureStore.deleteItemAsync(walletMnKey(w.id));
  }
  await AsyncStorage.removeItem(WALLET_LIST_KEY);
  await AsyncStorage.removeItem(ACTIVE_WALLET_KEY);
  await SecureStore.deleteItemAsync(STORAGE_KEYS.PRIVATE_KEY);
  await SecureStore.deleteItemAsync(STORAGE_KEYS.MNEMONIC);
  await SecureStore.deleteItemAsync(STORAGE_KEYS.PUBLIC_KEY);
  await SecureStore.deleteItemAsync(STORAGE_KEYS.WALLET_TYPE);
}

export async function hasWallet(): Promise<boolean> {
  const list = await getWalletList();
  if (list.length > 0) return true;

  // 兼容旧版本：检查是否有旧的单钱包数据
  const publicKey = await getPublicKey();
  return publicKey !== null;
}

// 迁移旧的单钱包数据到多钱包结构
export async function migrateToMultiWallet(): Promise<void> {
  const list = await getWalletList();
  if (list.length > 0) return;
  const pk = await getPrivateKey();
  const pubKey = await getPublicKey();
  const walletType = await getWalletType();
  if (!pk || !pubKey) return;
  const mn = await getMnemonic();
  const id = Date.now().toString(36);
  const record: WalletRecord = {
    id,
    name: 'Wallet 1',
    publicKey: pubKey,
    type: (walletType as 'mnemonic' | 'private_key') || 'private_key',
    createdAt: Date.now(),
  };
  await addWalletRecord(record, pk, mn || undefined);
  await setActiveWalletId(id);
}

// ---- 自定义 Token 元数据存储 ----
const CUSTOM_TOKENS_KEY = 'custom_tokens';

export interface CustomToken {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

export async function getCustomTokens(): Promise<CustomToken[]> {
  try {
    const data = await AsyncStorage.getItem(CUSTOM_TOKENS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function addCustomToken(token: CustomToken): Promise<void> {
  const tokens = await getCustomTokens();
  const idx = tokens.findIndex(t => t.mint === token.mint);
  if (idx >= 0) {
    tokens[idx] = token;
  } else {
    tokens.push(token);
  }
  await AsyncStorage.setItem(CUSTOM_TOKENS_KEY, JSON.stringify(tokens));
}

export async function removeCustomToken(mint: string): Promise<void> {
  const tokens = await getCustomTokens();
  await AsyncStorage.setItem(
    CUSTOM_TOKENS_KEY,
    JSON.stringify(tokens.filter(t => t.mint !== mint))
  );
}
