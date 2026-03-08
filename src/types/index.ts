import { PublicKey } from '@solana/web3.js';

// 运行时钱包（解密后）
export interface Wallet {
  publicKey: PublicKey;
  secretKey: Uint8Array;
}

// 持久化钱包记录
export interface WalletRecord {
  id: string;
  name: string;
  publicKey: string;
  type: 'mnemonic' | 'private_key';
  createdAt: number;
}

// Token 信息
export interface TokenInfo {
  mint: string;
  address: string;
  balance: number;
  decimals: number;
  symbol?: string;
  name?: string;
  logoURI?: string;
  uiAmount: number;
  usdPrice?: number;
  usdValue?: number;
  priceChange24h?: number;
}

// Swap Quote
export interface SwapQuote {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: any[];
}

// Swap 结果
export interface SwapResult {
  txid: string;
  inputAmount: number;
  outputAmount: number;
}

// NFT 元数据
export interface NFTMetadata {
  name: string;
  symbol: string;
  description?: string;
  image?: string;
  external_url?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  properties?: {
    files?: Array<{
      uri: string;
      type: string;
    }>;
    category?: string;
    creators?: Array<{
      address: string;
      share: number;
    }>;
  };
}

// NFT 信息
export interface NFT {
  mint: string;
  name: string;
  symbol: string;
  uri: string;
  image?: string;
  description?: string;
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  collection?: {
    name: string;
    family: string;
  };
  creators?: Array<{
    address: string;
    share: number;
    verified: boolean;
  }>;
}
