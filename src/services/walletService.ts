import { Keypair, PublicKey } from '@solana/web3.js';
import * as bip39 from 'bip39';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { derivePath } from 'ed25519-hd-key';
import { Wallet, WalletRecord } from '@/types';
import * as storageService from './storageService';

// ---- 内部辅助 ----

function keypairFromMnemonic(mnemonic: string): { publicKey: Uint8Array; secretKey: Uint8Array } {
  if (!bip39.validateMnemonic(mnemonic)) throw new Error('Invalid mnemonic phrase');
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const path = "m/44'/501'/0'/0'";
  const derivedSeed = derivePath(path, seed.toString('hex')).key;
  return nacl.sign.keyPair.fromSeed(derivedSeed);
}

// ---- 多钱包操作 ----

export async function addWalletFromMnemonic(
  mnemonic: string,
  name?: string,
): Promise<{ wallet: Wallet; record: WalletRecord }> {
  const kp = keypairFromMnemonic(mnemonic);
  const pubKeyStr = bs58.encode(kp.publicKey);
  const privKeyStr = bs58.encode(kp.secretKey);
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const list = await storageService.getWalletList();
  const walletNum = list.length + 1;

  const record: WalletRecord = {
    id,
    name: name || `Wallet ${walletNum}`,
    publicKey: pubKeyStr,
    type: 'mnemonic',
    createdAt: Date.now(),
  };

  await storageService.addWalletRecord(record, privKeyStr, mnemonic);
  await storageService.setActiveWalletId(id);

  return {
    wallet: { publicKey: new PublicKey(kp.publicKey), secretKey: kp.secretKey },
    record,
  };
}

export async function addWalletFromPrivateKey(
  privateKeyString: string,
  name?: string,
): Promise<{ wallet: Wallet; record: WalletRecord }> {
  const secretKey = bs58.decode(privateKeyString);
  if (secretKey.length !== 64) throw new Error('Invalid private key length');
  const keypair = Keypair.fromSecretKey(secretKey);
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

  const list = await storageService.getWalletList();
  const walletNum = list.length + 1;

  const record: WalletRecord = {
    id,
    name: name || `Wallet ${walletNum}`,
    publicKey: keypair.publicKey.toBase58(),
    type: 'private_key',
    createdAt: Date.now(),
  };

  await storageService.addWalletRecord(record, privateKeyString);
  await storageService.setActiveWalletId(id);

  return {
    wallet: { publicKey: keypair.publicKey, secretKey },
    record,
  };
}

export async function generateAndAddWallet(
  name?: string,
): Promise<{ wallet: Wallet; mnemonic: string; record: WalletRecord }> {
  const mnemonic = bip39.generateMnemonic(128);
  const { wallet, record } = await addWalletFromMnemonic(mnemonic, name);
  return { wallet, mnemonic, record };
}

export async function switchWallet(id: string): Promise<Wallet | null> {
  await storageService.setActiveWalletId(id);
  return await restoreWallet();
}

export async function removeWallet(id: string): Promise<void> {
  await storageService.removeWalletRecord(id);
}

export async function getWalletList(): Promise<WalletRecord[]> {
  return storageService.getWalletList();
}

export async function getActiveWalletId(): Promise<string | null> {
  return storageService.getActiveWalletId();
}

export async function renameWallet(id: string, newName: string): Promise<void> {
  return storageService.renameWallet(id, newName);
}

export async function exportWalletPrivateKey(id: string): Promise<string | null> {
  return storageService.getWalletPrivateKey(id);
}

export async function exportWalletMnemonic(id: string): Promise<string | null> {
  return storageService.getWalletMnemonic(id);
}

// ---- 兼容旧接口 ----

export async function importFromMnemonic(mnemonic: string): Promise<Wallet> {
  const { wallet } = await addWalletFromMnemonic(mnemonic);
  return wallet;
}

export async function importFromPrivateKey(privateKeyString: string): Promise<Wallet> {
  const { wallet } = await addWalletFromPrivateKey(privateKeyString);
  return wallet;
}

export async function generateNewWallet(): Promise<{ wallet: Wallet; mnemonic: string }> {
  const { wallet, mnemonic } = await generateAndAddWallet();
  return { wallet, mnemonic };
}

export async function restoreWallet(): Promise<Wallet | null> {
  await storageService.migrateToMultiWallet();
  const privateKeyString = await storageService.getPrivateKey();
  if (!privateKeyString) return null;
  try {
    const secretKey = bs58.decode(privateKeyString);
    const keypair = Keypair.fromSecretKey(secretKey);
    return { publicKey: keypair.publicKey, secretKey };
  } catch (error) {
    console.error('Failed to restore wallet:', error);
    return null;
  }
}

export async function getCurrentPublicKey(): Promise<PublicKey | null> {
  const publicKeyString = await storageService.getPublicKey();
  if (!publicKeyString) return null;
  try {
    return new PublicKey(publicKeyString);
  } catch (error) {
    console.error('Invalid public key:', error);
    return null;
  }
}

export async function exportPrivateKey(): Promise<string | null> {
  return await storageService.getPrivateKey();
}

export async function exportMnemonic(): Promise<string | null> {
  return await storageService.getMnemonic();
}
