import { Connection, clusterApiUrl } from '@solana/web3.js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type NetworkType = 'mainnet-beta' | 'devnet' | 'testnet';

const NETWORK_KEY = 'SELECTED_NETWORK';
const CUSTOM_RPC_KEY = 'CUSTOM_RPC_URLS';

const DEFAULT_RPC_URLS: Record<NetworkType, string> = {
  'mainnet-beta': 'https://api.mainnet-beta.solana.com',
  'devnet': clusterApiUrl('devnet'),
  'testnet': clusterApiUrl('testnet'),
};

const FALLBACK_MAINNET_RPCS = [
  'https://solana-mainnet.g.alchemy.com/v2/demo',
];

let customRpcUrls: Partial<Record<NetworkType, string>> = {};

let currentNetwork: NetworkType = 'mainnet-beta';
let currentConnection: Connection = new Connection(DEFAULT_RPC_URLS['mainnet-beta'], {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000,
});

function getRpcUrl(network: NetworkType): string {
  return customRpcUrls[network] || DEFAULT_RPC_URLS[network];
}

function rebuildConnection() {
  const url = getRpcUrl(currentNetwork);
  currentConnection = new Connection(url, {
    commitment: 'confirmed',
    confirmTransactionInitialTimeout: 60000,
  });
}

export function getNetwork(): NetworkType {
  return currentNetwork;
}

export function getConnection(): Connection {
  return currentConnection;
}

let fallbackIdx = 0;
const fallbackConnections: Connection[] = FALLBACK_MAINNET_RPCS.map(
  url => new Connection(url, { commitment: 'confirmed' })
);
export function getFallbackConnection(): Connection {
  if (currentNetwork !== 'mainnet-beta') return currentConnection;
  const conn = fallbackConnections[fallbackIdx % fallbackConnections.length];
  fallbackIdx++;
  return conn;
}

export function getCurrentRpcUrl(): string {
  return getRpcUrl(currentNetwork);
}

export function getDefaultRpcUrl(network: NetworkType): string {
  return DEFAULT_RPC_URLS[network];
}

export function getCustomRpcUrl(network: NetworkType): string | undefined {
  return customRpcUrls[network];
}

export async function loadSavedNetwork(): Promise<void> {
  try {
    const [savedNetwork, savedCustom] = await Promise.all([
      AsyncStorage.getItem(NETWORK_KEY),
      AsyncStorage.getItem(CUSTOM_RPC_KEY),
    ]);

    if (savedCustom) {
      try { customRpcUrls = JSON.parse(savedCustom); } catch {}
    }

    if (savedNetwork && (savedNetwork === 'mainnet-beta' || savedNetwork === 'devnet' || savedNetwork === 'testnet')) {
      currentNetwork = savedNetwork as NetworkType;
    }
    rebuildConnection();
  } catch (e) {
    console.error('[Config] Failed to load saved network:', e);
  }
}

export async function switchNetwork(network: NetworkType): Promise<void> {
  currentNetwork = network;
  rebuildConnection();
  await AsyncStorage.setItem(NETWORK_KEY, network);
}

export async function setCustomRpc(network: NetworkType, url: string | null): Promise<void> {
  if (url && url.trim()) {
    customRpcUrls[network] = url.trim();
  } else {
    delete customRpcUrls[network];
  }
  await AsyncStorage.setItem(CUSTOM_RPC_KEY, JSON.stringify(customRpcUrls));
  if (network === currentNetwork) {
    rebuildConnection();
  }
}

export async function testRpcConnection(url: string): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now();
  try {
    const conn = new Connection(url, { commitment: 'confirmed' });
    await conn.getLatestBlockhash();
    return { ok: true, latencyMs: Date.now() - start };
  } catch (e: any) {
    return { ok: false, latencyMs: Date.now() - start, error: e?.message || 'Connection failed' };
  }
}

export function getRpcEndpoint(): string {
  return getRpcUrl(currentNetwork);
}

export const NETWORK = currentNetwork;
export const RPC_ENDPOINT = DEFAULT_RPC_URLS['mainnet-beta'];

export const connection = currentConnection;

const RPC_DELAY_MS = 400;
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
export const rpcDelay = () => sleep(RPC_DELAY_MS);

export const JUPITER_API_URL = 'https://api.jup.ag/swap/v1';
export const JUPITER_API_KEY = '9a51fee8-a6d6-48af-91b4-bb24d0f2baaa';

export const STORAGE_KEYS = {
  PRIVATE_KEY: 'wallet_private_key',
  MNEMONIC: 'wallet_mnemonic',
  PUBLIC_KEY: 'wallet_public_key',
  WALLET_TYPE: 'wallet_type',
};

export const SOL_MINT = 'So11111111111111111111111111111111111111112';
