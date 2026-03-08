import { PublicKey, Connection } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { getConnection, getFallbackConnection, rpcDelay, JUPITER_API_KEY } from '@/constants/config';
import { TokenInfo } from '@/types';

export interface BuiltinToken {
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
}

// SOL 链上热门 token 内置元数据（按市值排名，CoinGecko CDN 图标）
export const BUILTIN_TOKENS: Record<string, BuiltinToken> = {
  'So11111111111111111111111111111111111111112': { symbol: 'SOL', name: 'Solana', decimals: 9, logoURI: 'https://assets.coingecko.com/coins/images/4128/small/solana.png' },
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': { symbol: 'USDC', name: 'USD Coin', decimals: 6, logoURI: 'https://assets.coingecko.com/coins/images/6319/small/usdc.png' },
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': { symbol: 'USDT', name: 'Tether USD', decimals: 6, logoURI: 'https://assets.coingecko.com/coins/images/325/small/Tether.png' },
  'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof': { symbol: 'RENDER', name: 'Render Token', decimals: 8, logoURI: 'https://assets.coingecko.com/coins/images/11636/small/rndr.png' },
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': { symbol: 'BONK', name: 'Bonk', decimals: 5, logoURI: 'https://assets.coingecko.com/coins/images/28600/small/bonk.jpg' },
  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': { symbol: 'RAY', name: 'Raydium', decimals: 6, logoURI: 'https://assets.coingecko.com/coins/images/13928/small/PSigc4ie_400x400.jpg' },
  'hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux': { symbol: 'HNT', name: 'Helium', decimals: 8, logoURI: 'https://assets.coingecko.com/coins/images/4284/small/Helium_HNT.png' },
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': { symbol: 'WIF', name: 'dogwifhat', decimals: 6, logoURI: 'https://assets.coingecko.com/coins/images/33566/small/dogwifhat.jpg' },
  'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3': { symbol: 'PYTH', name: 'Pyth Network', decimals: 6, logoURI: 'https://assets.coingecko.com/coins/images/31924/small/pyth.png' },
  'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL': { symbol: 'JTO', name: 'Jito', decimals: 9, logoURI: 'https://assets.coingecko.com/coins/images/33228/small/jto.png' },
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': { symbol: 'JUP', name: 'Jupiter', decimals: 6, logoURI: 'https://assets.coingecko.com/coins/images/34188/small/jup.png' },
};

let remoteTokenCache: Record<string, any> | null = null;
let remoteCacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000;

const TOKEN_LIST_SOURCES = [
  'https://token.jup.ag/all',
  'https://cdn.jsdelivr.net/gh/solana-labs/token-list@main/src/tokens/solana.tokenlist.json',
];

async function fetchWithTimeout(url: string, ms: number, headers?: Record<string, string>): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const res = await fetch(url, { signal: controller.signal, headers });
    clearTimeout(timer);
    if (res.status === 429 || res.status === 403) {
      throw new Error(`HTTP ${res.status}`);
    }
    return res;
  } catch (e) {
    clearTimeout(timer);
    throw e;
  }
}

async function fetchRemoteTokenMap(): Promise<Record<string, any>> {
  const now = Date.now();
  if (remoteTokenCache && now - remoteCacheTime < CACHE_TTL) {
    return remoteTokenCache;
  }

  for (const url of TOKEN_LIST_SOURCES) {
    try {
      const response = await fetchWithTimeout(url, 8000);
      const data = await response.json();

      const map: Record<string, any> = {};
      // Jupiter 格式: [{address, symbol, name, logoURI, decimals}, ...]
      // Solana Labs 格式: {tokens: [{address, symbol, name, logoURI, decimals}, ...]}
      const tokens: any[] = Array.isArray(data) ? data : data.tokens || [];
      for (const t of tokens) {
        map[t.address] = t;
      }

      if (Object.keys(map).length > 0) {
        remoteTokenCache = map;
        remoteCacheTime = now;
        return map;
      }
    } catch {
      continue;
    }
  }

  console.warn('All token list sources unavailable, using built-in data');
  return remoteTokenCache || {};
}

async function rpcRetry<T>(fn: (conn: Connection) => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    const conn = i === 0 ? getConnection() : getFallbackConnection();
    try {
      return await fn(conn);
    } catch (e: any) {
      lastError = e;
      const msg = e?.message || '';
      const isRetryable = msg.includes('429') || msg.includes('403') || msg.includes('502')
        || msg.includes('503') || msg.includes('ECONNREFUSED') || msg.includes('fetch failed')
        || msg.includes('JSON') || msg.includes('parse') || msg.includes('Unexpected token');
      if (isRetryable && i < maxRetries - 1) {
        const delay = (i + 1) * 1000;
        console.warn(`[RPC] Error: ${msg.slice(0, 60)}, fallback retry ${i + 1}/${maxRetries}`);
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
    }
  }
  throw lastError;
}

export async function getSolBalance(publicKey: PublicKey): Promise<number> {
  try {
    const balance = await rpcRetry((conn) => conn.getBalance(publicKey));
    return balance / 1e9;
  } catch (error) {
    console.error('Failed to get SOL balance:', error);
    throw error;
  }
}

export async function getAllTokens(publicKey: PublicKey): Promise<TokenInfo[]> {
  try {
    const tokenAccounts = await rpcRetry((conn) =>
      conn.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID })
    );

    const tokens: TokenInfo[] = [];

    for (const { pubkey, account } of tokenAccounts.value) {
      try {
        const parsed = account.data.parsed?.info;
        if (!parsed) continue;
        const mint = parsed.mint;
        const decimals = parsed.tokenAmount?.decimals ?? 9;
        const uiAmount = parsed.tokenAmount?.uiAmount ?? 0;
        const balance = Number(parsed.tokenAmount?.amount ?? 0);

        if (balance > 0) {
          tokens.push({
            mint,
            address: pubkey.toBase58(),
            balance,
            decimals,
            uiAmount,
          });
        }
      } catch (error) {
        console.error('Failed to parse token account:', error);
      }
    }

    return tokens;
  } catch (error) {
    console.error('Failed to get tokens:', error);
    throw error;
  }
}

// 链上 Metaplex 元数据查询（最终兜底，走 RPC）
const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
const onChainMetaCache = new Map<string, Partial<TokenInfo>>();

async function fetchOnChainMetadata(mint: string): Promise<Partial<TokenInfo>> {
  if (onChainMetaCache.has(mint)) return onChainMetaCache.get(mint)!;

  try {
    const mintPubkey = new PublicKey(mint);
    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('metadata'), METADATA_PROGRAM_ID.toBuffer(), mintPubkey.toBuffer()],
      METADATA_PROGRAM_ID
    );

    const accountInfo = await getConnection().getAccountInfo(metadataPDA);
    if (!accountInfo || accountInfo.data.length < 70) {
      onChainMetaCache.set(mint, {});
      return {};
    }

    const data = accountInfo.data;
    let offset = 1 + 32 + 32; // key + update_authority + mint

    const nameLen = data.readUInt32LE(offset);
    offset += 4;
    const name = data.slice(offset, offset + nameLen).toString('utf8').replace(/\0/g, '').trim();
    offset += nameLen;

    const symbolLen = data.readUInt32LE(offset);
    offset += 4;
    const symbol = data.slice(offset, offset + symbolLen).toString('utf8').replace(/\0/g, '').trim();
    offset += symbolLen;

    const uriLen = data.readUInt32LE(offset);
    offset += 4;
    const uri = data.slice(offset, offset + uriLen).toString('utf8').replace(/\0/g, '').trim();

    // 尝试从链下 URI 获取 logo
    let logoURI: string | undefined;
    if (uri) {
      try {
        const res = await fetchWithTimeout(uri, 5000);
        const json = await res.json();
        logoURI = json.image || json.logoURI;
      } catch {}
    }

    const result: Partial<TokenInfo> = { name: name || undefined, symbol: symbol || undefined, logoURI };
    onChainMetaCache.set(mint, result);
    return result;
  } catch {
    onChainMetaCache.set(mint, {});
    return {};
  }
}

// 获取 mint 的 decimals（从链上 mint account 读取）
async function fetchMintDecimals(mint: string): Promise<number | undefined> {
  try {
    const info = await getConnection().getParsedAccountInfo(new PublicKey(mint));
    const parsed = (info.value?.data as any)?.parsed;
    if (parsed?.info?.decimals !== undefined) {
      return parsed.info.decimals;
    }
  } catch {}
  return undefined;
}

export async function getTokenMetadata(mint: string): Promise<Partial<TokenInfo>> {
  // 1) 内置数据
  if (BUILTIN_TOKENS[mint]) {
    const b = BUILTIN_TOKENS[mint];
    return { symbol: b.symbol, name: b.name, decimals: b.decimals, logoURI: b.logoURI };
  }

  // 2) 远程 token list 缓存（Jupiter/Solana Labs，一次请求缓存所有）
  try {
    const map = await fetchRemoteTokenMap();
    const info = map[mint];
    if (info) {
      return { symbol: info.symbol, name: info.name, logoURI: info.logoURI, decimals: info.decimals };
    }
  } catch {}

  // 3) 未识别代币，返回空
  return {};
}

let tokenListCache: { addr: string; tokens: TokenInfo[]; time: number } | null = null;
const TOKEN_LIST_CACHE_TTL = 30_000;

export async function getAllTokensWithMetadata(publicKey: PublicKey): Promise<TokenInfo[]> {
  const addr = publicKey.toBase58();
  if (tokenListCache && tokenListCache.addr === addr && Date.now() - tokenListCache.time < TOKEN_LIST_CACHE_TTL) {
    return tokenListCache.tokens;
  }

  const { getCustomTokens } = require('@/services/storageService');
  const { SOL_MINT } = require('@/constants/config');

  const customTokens = await getCustomTokens() as Array<{ mint: string; symbol: string; name: string; decimals: number; logoURI?: string }>;
  const solBalance = await getSolBalance(publicKey).catch(() => 0);
  const onChainTokens = await getAllTokens(publicKey).catch(() => [] as TokenInfo[]);

  await fetchRemoteTokenMap();

  // 已有链上 token 的 mint 集合
  const onChainMints = new Set(onChainTokens.map(t => t.mint));

  // 1) SOL 始终第一个
  const solMeta = BUILTIN_TOKENS[SOL_MINT] || { symbol: 'SOL', name: 'Solana', decimals: 9 };
  const result: TokenInfo[] = [{
    mint: SOL_MINT,
    address: SOL_MINT,
    balance: solBalance * 1e9,
    decimals: solMeta.decimals,
    symbol: solMeta.symbol,
    name: solMeta.name,
    logoURI: solMeta.logoURI,
    uiAmount: solBalance,
  }];

  // 2) 链上有余额的 token（只显示能识别的，过滤未知代币）
  const customMints = new Set(customTokens.map(ct => ct.mint));
  for (const token of onChainTokens) {
    const metadata = await getTokenMetadata(token.mint);
    if (!metadata.symbol && !customMints.has(token.mint)) continue;
    result.push({
      ...token,
      symbol: metadata.symbol || token.symbol,
      name: metadata.name || token.name,
      logoURI: metadata.logoURI || token.logoURI,
    });
  }

  const existingMints = new Set(result.map(t => t.mint));

  // 3) 内置热门 token（链上没有的，显示余额 0）
  for (const [mint, meta] of Object.entries(BUILTIN_TOKENS)) {
    if (existingMints.has(mint)) continue;
    result.push({
      mint,
      address: mint,
      balance: 0,
      decimals: meta.decimals,
      symbol: meta.symbol,
      name: meta.name,
      logoURI: meta.logoURI,
      uiAmount: 0,
    });
  }

  // 4) 自定义 token（链上和内置都没有的，显示余额 0）
  const allMints = new Set(result.map(t => t.mint));
  for (const ct of customTokens) {
    if (allMints.has(ct.mint)) continue;
    result.push({
      mint: ct.mint,
      address: ct.mint,
      balance: 0,
      decimals: ct.decimals,
      symbol: ct.symbol,
      name: ct.name,
      logoURI: ct.logoURI,
      uiAmount: 0,
    });
  }

  tokenListCache = { addr, tokens: result, time: Date.now() };
  return result;
}

export interface SwappableToken {
  mint: string;
  symbol: string;
  name: string;
  decimals: number;
  logoURI?: string;
  isCustom?: boolean;
}

export function getBuiltinSwappableTokens(): SwappableToken[] {
  return Object.entries(BUILTIN_TOKENS).map(([mint, info]) => ({
    mint,
    symbol: info.symbol,
    name: info.name,
    decimals: info.decimals,
    logoURI: info.logoURI,
    isCustom: false,
  }));
}

export async function getAllSwappableTokens(): Promise<SwappableToken[]> {
  const { getCustomTokens } = require('@/services/storageService');
  const builtins = getBuiltinSwappableTokens();
  const builtinMints = new Set(builtins.map(t => t.mint));

  const customTokens: Array<{ mint: string; symbol: string; name: string; decimals: number; logoURI?: string }> =
    await getCustomTokens();

  const customs: SwappableToken[] = customTokens
    .filter(ct => !builtinMints.has(ct.mint))
    .map(ct => ({ ...ct, isCustom: true }));

  return [...builtins, ...customs];
}

export async function getTokenPrice(mint: string): Promise<number | null> {
  try {
    const response = await fetch(`https://price.jup.ag/v4/price?ids=${mint}`);
    const data = await response.json();

    if (data.data && data.data[mint]) {
      return data.data[mint].price;
    }

    return null;
  } catch (error) {
    console.error('Failed to get token price:', error);
    return null;
  }
}

export interface TokenPriceInfo {
  price: number;
  change24h: number;
}

const COINGECKO_ID_MAP: Record<string, string> = {
  'So11111111111111111111111111111111111111112': 'solana',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'usd-coin',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'tether',
  'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof': 'render-token',
  'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'bonk',
  '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': 'raydium',
  'hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux': 'helium',
  'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': 'dogwifcoin',
  'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3': 'pyth-network',
  'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL': 'jito-governance-token',
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 'jupiter-exchange-solana',
};

let priceCache: Record<string, TokenPriceInfo> = {};
let priceCacheTime = 0;
const PRICE_CACHE_TTL = 30_000;

export async function getTokenPricesBatch(mints: string[]): Promise<Record<string, TokenPriceInfo>> {
  const now = Date.now();
  if (now - priceCacheTime < PRICE_CACHE_TTL && Object.keys(priceCache).length > 0) {
    const cached: Record<string, TokenPriceInfo> = {};
    for (const m of mints) { if (priceCache[m]) cached[m] = priceCache[m]; }
    if (Object.keys(cached).length > 0) return cached;
  }

  const result: Record<string, TokenPriceInfo> = {};
  if (mints.length === 0) return result;

  // Jupiter Price API v3（一次性批量请求，最多 50 个）
  try {
    const ids = mints.join(',');
    const jupResponse = await fetchWithTimeout(
      `https://api.jup.ag/price/v3?ids=${ids}`,
      10000,
      { 'x-api-key': JUPITER_API_KEY },
    );
    const jupData = await jupResponse.json();

    if (jupData.data) {
      for (const mint of mints) {
        const info = jupData.data[mint];
        if (info && info.usdPrice != null) {
          result[mint] = {
            price: info.usdPrice,
            change24h: info.priceChange24h ?? 0,
          };
        }
      }
    }
  } catch (e: any) {
    if (e?.name !== 'AbortError') console.warn('[Price] Jupiter v3 batch failed:', e?.message);
  }

  // CoinGecko 补充（仅补充 Jupiter 没有的）
  try {
    const cgIds: string[] = [];
    const cgMintMap: Record<string, string> = {};
    for (const mint of mints) {
      if (result[mint]) continue;
      const cgId = COINGECKO_ID_MAP[mint];
      if (cgId) {
        cgIds.push(cgId);
        cgMintMap[cgId] = mint;
      }
    }

    if (cgIds.length > 0) {
      const cgUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${cgIds.join(',')}&vs_currencies=usd&include_24hr_change=true`;
      const cgResponse = await fetchWithTimeout(cgUrl, 10000);
      const cgData = await cgResponse.json();

      for (const [cgId, data] of Object.entries(cgData) as any) {
        const mint = cgMintMap[cgId];
        if (mint && data.usd != null) {
          result[mint] = { price: data.usd, change24h: data.usd_24h_change ?? 0 };
        }
      }
    }
  } catch (e: any) {
    if (e?.name !== 'AbortError') console.warn('[Price] CoinGecko batch failed:', e?.message);
  }

  if (Object.keys(result).length > 0) {
    priceCache = { ...priceCache, ...result };
    priceCacheTime = now;
  }

  return result;
}

export async function getAllTokensWithPrices(publicKey: PublicKey): Promise<{ tokens: TokenInfo[]; totalUsd: number; totalChange: number }> {
  const tokenList = await getAllTokensWithMetadata(publicKey);
  const mints = tokenList.map(t => t.mint).filter(Boolean);
  let prices: Record<string, TokenPriceInfo> = {};
  try {
    prices = await getTokenPricesBatch(mints);
  } catch (e) {
    console.warn('[Price] Batch price fetch failed entirely, continuing without prices');
  }

  let totalUsd = 0;
  let totalPrevUsd = 0;

  const enriched = tokenList.map(token => {
    const priceInfo = prices[token.mint];
    if (priceInfo) {
      const usdValue = token.uiAmount * priceInfo.price;
      totalUsd += usdValue;
      const prevPrice = priceInfo.change24h !== 0
        ? priceInfo.price / (1 + priceInfo.change24h / 100)
        : priceInfo.price;
      totalPrevUsd += token.uiAmount * prevPrice;
      return { ...token, usdPrice: priceInfo.price, usdValue, priceChange24h: priceInfo.change24h };
    }
    return token;
  });

  const totalChange = totalPrevUsd > 0 ? ((totalUsd - totalPrevUsd) / totalPrevUsd) * 100 : 0;

  enriched.sort((a, b) => {
    const aUsd = a.usdValue ?? 0;
    const bUsd = b.usdValue ?? 0;
    if (aUsd !== bUsd) return bUsd - aUsd;
    return b.uiAmount - a.uiAmount;
  });

  return { tokens: enriched, totalUsd, totalChange };
}
