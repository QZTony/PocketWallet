import { PublicKey, Connection } from '@solana/web3.js';
import { getConnection, getFallbackConnection, rpcDelay, getRpcEndpoint } from '@/constants/config';
import axios from 'axios';

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
  floorPrice?: number;
  listingPrice?: number;
}

let nftCache: { addr: string; nfts: NFT[]; time: number } | null = null;
const NFT_CACHE_TTL = 60_000;

// 获取钱包的所有 NFTs — 多端点依次尝试
export async function getNFTs(publicKey: PublicKey): Promise<NFT[]> {
  const addr = publicKey.toBase58();

  if (nftCache && nftCache.addr === addr && Date.now() - nftCache.time < NFT_CACHE_TTL) {
    return nftCache.nfts;
  }

  const errors: string[] = [];

  // 1) Magic Eden REST API（最稳定的免费方案）
  try {
    const meResult = await getNFTsViaMagicEden(addr);
    if (meResult.length > 0) {
      nftCache = { addr, nfts: meResult, time: Date.now() };
      return meResult;
    }
  } catch (e: any) {
    errors.push('ME: ' + (e?.message || ''));
    console.log('[NFT] Magic Eden failed:', e?.message);
  }

  // 2) 用户自定义 RPC 的 DAS（仅当用户配置了支持 DAS 的 RPC 时有效）
  const userRpc = getRpcEndpoint();
  if (!userRpc.includes('api.mainnet-beta.solana.com')) {
    try {
      const dasResult = await fetchDAS(userRpc, addr);
      if (dasResult.length > 0) {
        nftCache = { addr, nfts: dasResult, time: Date.now() };
        return dasResult;
      }
    } catch (e: any) {
      console.log('[NFT] RPC DAS not supported:', e?.message?.slice(0, 60));
    }
  }

  // 3) Legacy SPL Token（仅标准 NFT，不支持 cNFT）
  try {
    const legacyResult = await getNFTsLegacy(publicKey);
    if (legacyResult.length > 0) {
      nftCache = { addr, nfts: legacyResult, time: Date.now() };
      return legacyResult;
    }
  } catch (e: any) {
    console.log('[NFT] Legacy failed:', e?.message);
  }

  if (errors.length > 0) {
    console.log('[NFT] All methods failed:', errors.join(' | '));
  }
  nftCache = { addr, nfts: [], time: Date.now() };
  return [];
}

function shortLabel(url: string): string {
  if (url.includes('helius')) return 'Helius';
  if (url.includes('alchemy')) return 'Alchemy';
  return url.slice(0, 30);
}

// ---------- DAS 端点（公共 RPC 通常不支持 DAS，这里作为最后兜底）----------
const DAS_ENDPOINTS: string[] = [];

async function fetchDAS(endpoint: string, ownerAddress: string): Promise<NFT[]> {
  console.log('[NFT/DAS] POST', endpoint.slice(0, 40));
  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: 'nft-das',
    method: 'getAssetsByOwner',
    params: {
      ownerAddress,
      page: 1,
      limit: 500,
      displayOptions: {
        showUnverifiedCollections: true,
        showCollectionMetadata: true,
        showFungible: false,
        showNativeBalance: false,
        showZeroBalance: false,
      },
    },
  });

  const res = await Promise.race([
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    }),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 20000)),
  ]);

  if (!res.ok) throw new Error(`HTTP ${res.status}${res.status === 429 ? ' rate limited' : ''}`);

  const json = await res.json();
  if (json.error) {
    const code = json.error.code;
    if (code === 429 || (json.error.message && json.error.message.includes('429'))) {
      throw new Error('Rate limited (429)');
    }
    throw new Error(json.error.message || JSON.stringify(json.error));
  }

  const items: any[] = json.result?.items || [];
  console.log('[NFT/DAS] Got', items.length, 'items from', endpoint.slice(0, 40));
  return parseDASItems(items);
}

function parseDASItems(items: any[]): NFT[] {
  const nfts: NFT[] = [];
  for (const item of items) {
    if (item.interface === 'FungibleToken' || item.interface === 'FungibleAsset') continue;
    const content = item.content || {};
    const meta = content.metadata || {};
    const files = content.files || [];
    const links = content.links || {};
    nfts.push({
      mint: item.id,
      name: meta.name || 'Unknown NFT',
      symbol: meta.symbol || '',
      uri: content.json_uri || '',
      image: links.image || files[0]?.uri || undefined,
      description: meta.description,
      attributes: meta.attributes,
      collection: item.grouping?.[0]
        ? { name: item.grouping[0].collection_metadata?.name || '', family: '' }
        : undefined,
      creators: item.creators?.map((c: any) => ({ address: c.address, share: c.share, verified: c.verified })),
    });
  }
  return nfts;
}

// ---------- Magic Eden API ----------
async function getNFTsViaMagicEden(ownerAddress: string): Promise<NFT[]> {
  console.log('[NFT/ME] Fetching via fetch for', ownerAddress);
  const url = `https://api-mainnet.magiceden.dev/v2/wallets/${ownerAddress}/tokens?offset=0&limit=100&listStatus=both`;

  const res = await Promise.race([
    fetch(url),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000)),
  ]);

  if (!res.ok) throw new Error(`HTTP ${res.status}${res.status === 429 ? ' rate limited' : ''}`);
  const items: any[] = await res.json();

  const nfts: NFT[] = [];
  for (const item of items) {
    nfts.push({
      mint: item.mintAddress || item.mint || '',
      name: item.name || 'Unknown NFT',
      symbol: item.symbol || item.collectionName || '',
      uri: '',
      image: item.image || undefined,
      description: item.description || undefined,
      attributes: item.attributes?.map((a: any) => ({ trait_type: a.trait_type, value: a.value })),
      collection: item.collectionName ? { name: item.collectionName, family: '' } : undefined,
      listingPrice: item.price || undefined,
      floorPrice: item.floorPrice || undefined,
    });
  }
  console.log('[NFT/ME] Loaded', nfts.length, 'NFTs');
  return nfts;
}

// Legacy: SPL Token Program + Token-2022
async function getNFTsLegacy(publicKey: PublicKey): Promise<NFT[]> {
  try {
    const { TOKEN_PROGRAM_ID } = require('@solana/spl-token');
    const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

    const programIds = [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID];
    const nftMints: string[] = [];
    const conn = getFallbackConnection();

    for (const programId of programIds) {
      try {
        console.log('[NFT/Legacy] Checking program', programId.toBase58());
        await rpcDelay();
        const tokenAccounts = await conn.getParsedTokenAccountsByOwner(publicKey, { programId });
        console.log('[NFT/Legacy] Found', tokenAccounts.value.length, 'accounts in', programId.toBase58().slice(0, 8));

        for (const { account } of tokenAccounts.value) {
          const parsedInfo = account.data.parsed.info;
          const amount = parsedInfo.tokenAmount.uiAmount;
          const decimals = parsedInfo.tokenAmount.decimals;
          if (amount === 1 && decimals === 0) {
            nftMints.push(parsedInfo.mint);
          }
        }
      } catch (err: any) {
        console.log('[NFT/Legacy] Skipped program', programId.toBase58().slice(0, 8), err?.message?.slice(0, 60));
      }
    }

    console.log('[NFT/Legacy] Found', nftMints.length, 'potential NFTs');

    if (nftMints.length === 0) return [];

    const nfts: NFT[] = [];
    for (const mint of nftMints) {
      try {
        await rpcDelay();
        const metadata = await getNFTMetadata(mint);
        if (metadata) {
          nfts.push({
            mint,
            name: metadata.name || 'Unknown NFT',
            symbol: metadata.symbol || '',
            uri: metadata.uri || '',
            image: metadata.image,
            description: metadata.description,
            attributes: metadata.attributes,
            creators: metadata.creators,
          });
        }
      } catch (error) {
        console.log(`[NFT/Legacy] Metadata skipped for ${mint}`);
      }
    }

    console.log('[NFT/Legacy] Loaded', nfts.length, 'NFTs');
    return nfts;
  } catch (error) {
    console.log('[NFT/Legacy] Failed:', (error as any)?.message?.slice(0, 60));
    return [];
  }
}

// 获取 NFT 元数据
async function getNFTMetadata(mint: string): Promise<(NFT & { uri: string }) | null> {
  try {
    // 计算 Metaplex 元数据账户地址
    const METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
    const mintPubkey = new PublicKey(mint);

    const [metadataPDA] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('metadata'),
        METADATA_PROGRAM_ID.toBuffer(),
        mintPubkey.toBuffer(),
      ],
      METADATA_PROGRAM_ID
    );

    const accountInfo = await getFallbackConnection().getAccountInfo(metadataPDA);

    if (!accountInfo) {
      return null;
    }

    const metadata = parseMetadata(accountInfo.data);

    // 获取链下元数据
    if (metadata.uri) {
      try {
        const response = await axios.get(metadata.uri, { timeout: 5000 });
        const offChainMetadata = response.data;

        return {
          mint,
          name: metadata.name || offChainMetadata.name || 'Unknown',
          symbol: metadata.symbol || offChainMetadata.symbol || '',
          uri: metadata.uri,
          image: offChainMetadata.image,
          description: offChainMetadata.description,
          attributes: offChainMetadata.attributes,
          creators: metadata.creators,
        };
      } catch {}
    }

    return {
      mint,
      name: metadata.name || 'Unknown',
      symbol: metadata.symbol || '',
      uri: metadata.uri || '',
      creators: metadata.creators,
    };
  } catch {
    return null;
  }
}

// 简化的元数据解析
function parseMetadata(data: Buffer): {
  name: string;
  symbol: string;
  uri: string;
  creators?: Array<{ address: string; share: number; verified: boolean }>;
} {
  try {
    // 跳过前 1 + 32 + 32 字节（key + update_authority + mint）
    let offset = 1 + 32 + 32;

    // 读取 name（前 4 字节是长度）
    const nameLength = data.readUInt32LE(offset);
    offset += 4;
    const name = data.slice(offset, offset + nameLength).toString('utf8').replace(/\0/g, '');
    offset += nameLength;

    // 读取 symbol
    const symbolLength = data.readUInt32LE(offset);
    offset += 4;
    const symbol = data.slice(offset, offset + symbolLength).toString('utf8').replace(/\0/g, '');
    offset += symbolLength;

    // 读取 uri
    const uriLength = data.readUInt32LE(offset);
    offset += 4;
    const uri = data.slice(offset, offset + uriLength).toString('utf8').replace(/\0/g, '');

    return { name, symbol, uri };
  } catch (error) {
    console.log('Failed to parse metadata');
    return { name: 'Unknown', symbol: '', uri: '' };
  }
}

// 获取 NFT 价格（通过 Magic Eden API）
export async function enrichNFTsWithPrices(nfts: NFT[]): Promise<NFT[]> {
  const enriched = [...nfts];
  for (let i = 0; i < enriched.length; i++) {
    const nft = enriched[i];
    try {
      // 添加延迟避免 rate limit
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const res = await Promise.race([
        axios.get(`https://api-mainnet.magiceden.dev/v2/tokens/${nft.mint}`, {
          timeout: 8000,
          headers: {
            'Accept': 'application/json',
          }
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 8000)
        ),
      ]);

      if (res.data) {
        nft.listingPrice = res.data.listPrice ? res.data.listPrice / 1e9 : undefined;
        nft.floorPrice = res.data.floorPrice ? res.data.floorPrice / 1e9 : nft.listingPrice;
      }
    } catch (error: any) {
      console.log(`[NFT Price] Skipped price for ${nft.mint.slice(0, 8)}:`, error?.message?.slice(0, 40));
      // 继续处理下一个 NFT
    }
  }
  return enriched;
}

// 价格缓存
const priceCache = new Map<string, { price: { listingPrice?: number; floorPrice?: number }; time: number }>();
const PRICE_CACHE_TTL = 300_000; // 5 分钟

// 获取单个 NFT 价格信息
export async function getNFTPrice(mint: string): Promise<{ listingPrice?: number; floorPrice?: number }> {
  // 检查缓存
  const cached = priceCache.get(mint);
  if (cached && Date.now() - cached.time < PRICE_CACHE_TTL) {
    return cached.price;
  }

  try {
    // 添加延迟避免 rate limit
    await new Promise(resolve => setTimeout(resolve, 300));

    const res = await Promise.race([
      axios.get(`https://api-mainnet.magiceden.dev/v2/tokens/${mint}`, {
        timeout: 8000,
        headers: {
          'Accept': 'application/json',
        }
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 8000)
      ),
    ]);

    const price = {
      listingPrice: res.data?.listPrice ? res.data.listPrice / 1e9 : undefined,
      floorPrice: res.data?.floorPrice ? res.data.floorPrice / 1e9 : undefined,
    };

    // 缓存结果
    priceCache.set(mint, { price, time: Date.now() });
    return price;
  } catch (error: any) {
    console.log('[NFT Price] Failed to fetch price:', error?.message?.slice(0, 60));
    // 返回空对象而不是抛出错误
    return {};
  }
}

// 获取 NFT 集合
export function groupNFTsByCollection(nfts: NFT[]): Map<string, NFT[]> {
  const collections = new Map<string, NFT[]>();

  for (const nft of nfts) {
    const collectionName = nft.collection?.name || 'Uncategorized';

    if (!collections.has(collectionName)) {
      collections.set(collectionName, []);
    }

    collections.get(collectionName)!.push(nft);
  }

  return collections;
}

// 转移 NFT
export async function transferNFT(
  mint: string,
  fromPublicKey: PublicKey,
  toPublicKey: PublicKey,
  secretKey: Uint8Array
): Promise<string> {
  const {
    getAssociatedTokenAddress,
    createAssociatedTokenAccountInstruction,
    createTransferInstruction,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
  } = require('@solana/spl-token');
  const { Transaction, Keypair } = require('@solana/web3.js');

  const conn = getConnection();
  const mintPubkey = new PublicKey(mint);
  const keypair = Keypair.fromSecretKey(secretKey);
  const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

  console.log('[NFT Transfer] Starting transfer for mint:', mint);
  console.log('[NFT Transfer] From:', fromPublicKey.toBase58());
  console.log('[NFT Transfer] To:', toPublicKey.toBase58());

  // 首先检查 mint 账户本身，确定它使用的 program
  let tokenProgramId = TOKEN_PROGRAM_ID;
  let fromATA: PublicKey;

  try {
    // 获取 mint 账户信息
    const mintAccountInfo = await conn.getAccountInfo(mintPubkey);
    if (!mintAccountInfo) {
      throw new Error('NFT mint account not found. This might be a compressed NFT (cNFT), which cannot be transferred using this method.');
    }

    console.log('[NFT Transfer] Mint account owner:', mintAccountInfo.owner.toBase58());

    // 根据 mint 账户的 owner 确定使用哪个 token program
    if (mintAccountInfo.owner.equals(TOKEN_2022_PROGRAM_ID)) {
      tokenProgramId = TOKEN_2022_PROGRAM_ID;
      console.log('[NFT Transfer] Detected Token-2022 Program from mint account');
    } else if (mintAccountInfo.owner.equals(TOKEN_PROGRAM_ID)) {
      tokenProgramId = TOKEN_PROGRAM_ID;
      console.log('[NFT Transfer] Detected Token Program (standard) from mint account');
    } else {
      throw new Error(`Unknown mint owner: ${mintAccountInfo.owner.toBase58()}. This might be a compressed NFT or use a custom program.`);
    }

    // 计算发送方的 ATA
    fromATA = await getAssociatedTokenAddress(mintPubkey, fromPublicKey, false, tokenProgramId);
    console.log('[NFT Transfer] From ATA:', fromATA.toBase58());

    // 验证发送方的 ATA 存在
    const fromATAInfo = await conn.getAccountInfo(fromATA);
    if (!fromATAInfo) {
      throw new Error(`Sender does not own this NFT. Token account ${fromATA.toBase58()} does not exist.`);
    }

    console.log('[NFT Transfer] From ATA exists, owner:', fromATAInfo.owner.toBase58());

  } catch (error: any) {
    console.log('[NFT Transfer] Error:', error?.message);
    throw error;
  }

  console.log('[NFT Transfer] Using program:', tokenProgramId.toBase58());

  const toATA = await getAssociatedTokenAddress(mintPubkey, toPublicKey, false, tokenProgramId);
  console.log('[NFT Transfer] To ATA:', toATA.toBase58());

  const transaction = new Transaction();

  // 检查接收方是否已有该 token 的 ATA，没有则创建
  const toAccountInfo = await conn.getAccountInfo(toATA);
  if (!toAccountInfo) {
    console.log('[NFT Transfer] Creating recipient ATA');
    transaction.add(
      createAssociatedTokenAccountInstruction(
        fromPublicKey,
        toATA,
        toPublicKey,
        mintPubkey,
        tokenProgramId,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      )
    );
  } else {
    console.log('[NFT Transfer] Recipient ATA already exists');
  }

  console.log('[NFT Transfer] Adding transfer instruction');
  transaction.add(
    createTransferInstruction(fromATA!, toATA, fromPublicKey, 1, [], tokenProgramId)
  );

  const { blockhash } = await conn.getLatestBlockhash('confirmed');
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = fromPublicKey;

  console.log('[NFT Transfer] Sending transaction...');
  const signature = await conn.sendTransaction(transaction, [keypair]);
  console.log('[NFT Transfer] Transaction sent:', signature);

  console.log('[NFT Transfer] Confirming transaction...');
  await conn.confirmTransaction(signature, 'confirmed');
  console.log('[NFT Transfer] Transaction confirmed!');

  return signature;
}

// 获取 NFT 详细信息（优先从缓存获取，避免额外 RPC 调用）
export async function getNFTDetails(mint: string): Promise<NFT | null> {
  if (nftCache) {
    const cached = nftCache.nfts.find(n => n.mint === mint);
    if (cached) return cached;
  }

  try {
    const metadata = await getNFTMetadata(mint);
    return metadata;
  } catch {
    return null;
  }
}
