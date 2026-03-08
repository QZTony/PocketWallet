import { PublicKey, Connection, ParsedTransactionWithMeta, ConfirmedSignatureInfo } from '@solana/web3.js';
import { getConnection, rpcDelay } from '@/constants/config';
import axios from 'axios';

export interface Transaction {
  signature: string;
  timestamp: number;
  type: TransactionType;
  status: 'success' | 'failed';
  amount?: number;
  token?: string;
  tokenSymbol?: string;
  from?: string;
  to?: string;
  fee: number;
  memo?: string;
  blockTime: number;
}

export enum TransactionType {
  SEND = 'send',
  RECEIVE = 'receive',
  SWAP = 'swap',
  NFT_TRANSFER = 'nft_transfer',
  NFT_MINT = 'nft_mint',
  STAKE = 'stake',
  UNSTAKE = 'unstake',
  UNKNOWN = 'unknown',
}

// ---- 缓存 & 分页状态 ----
const txCache = new Map<string, Transaction>();
let lastSignature: string | undefined = undefined;
let cachedPublicKey: string | undefined = undefined;
let hasMore = true;

const PAGE_SIZE = 10;
const BATCH_SIZE = 5;

export function resetTransactionPagination() {
  lastSignature = undefined;
  hasMore = true;
}

export function clearTransactionCache() {
  txCache.clear();
  resetTransactionPagination();
  cachedPublicKey = undefined;
}

export function getHasMore(): boolean {
  return hasMore;
}

// 批量解析签名对应的交易详情，返回解析后的 Transaction 列表
async function fetchAndParseBatch(
  sigInfos: ConfirmedSignatureInfo[],
  publicKey: PublicKey
): Promise<Transaction[]> {
  const results: Transaction[] = [];

  for (let i = 0; i < sigInfos.length; i += BATCH_SIZE) {
    const batch = sigInfos.slice(i, i + BATCH_SIZE);

    // 分离：已缓存 vs 需要请求
    const uncached: { idx: number; sig: string }[] = [];
    for (let j = 0; j < batch.length; j++) {
      const sig = batch[j].signature;
      if (txCache.has(sig)) {
        results.push(txCache.get(sig)!);
      } else {
        uncached.push({ idx: j, sig });
      }
    }

    if (uncached.length === 0) continue;

    try {
      const parsedTxs = await getConnection().getParsedTransactions(
        uncached.map(u => u.sig),
        { maxSupportedTransactionVersion: 0 }
      );

      for (let k = 0; k < uncached.length; k++) {
        const tx = parsedTxs[k];
        const sigInfo = batch[uncached[k].idx];
        if (!tx || !tx.meta) continue;

        const transaction: Transaction = {
          signature: sigInfo.signature,
          timestamp: sigInfo.blockTime || 0,
          type: TransactionType.UNKNOWN,
          status: tx.meta.err ? 'failed' : 'success',
          fee: tx.meta.fee / 1e9,
          blockTime: sigInfo.blockTime || 0,
        };

        const parsed = parseTransactionDetails(tx, publicKey);
        Object.assign(transaction, parsed);

        txCache.set(sigInfo.signature, transaction);
        results.push(transaction);
      }
    } catch (error) {
      console.error('Failed to parse batch:', error);
    }

    if (i + BATCH_SIZE < sigInfos.length) {
      await rpcDelay();
    }
  }

  return results;
}

// 分页获取交易历史，首次调用获取第一页，后续调用获取下一页
export async function getTransactionHistory(
  publicKey: PublicKey,
  limit: number = PAGE_SIZE
): Promise<Transaction[]> {
  try {
    const pubkeyStr = publicKey.toBase58();
    if (cachedPublicKey !== pubkeyStr) {
      clearTransactionCache();
      cachedPublicKey = pubkeyStr;
    }

    const opts: any = { limit };
    if (lastSignature) {
      opts.before = lastSignature;
    }

    const signatures = await getConnection().getSignaturesForAddress(publicKey, opts);

    if (signatures.length === 0) {
      hasMore = false;
      return [];
    }

    if (signatures.length < limit) {
      hasMore = false;
    }

    lastSignature = signatures[signatures.length - 1].signature;

    return await fetchAndParseBatch(signatures, publicKey);
  } catch (error) {
    console.error('Failed to get transaction history:', error);
    throw error;
  }
}

// 获取所有已缓存的交易（按时间排序）
export function getCachedTransactions(): Transaction[] {
  return Array.from(txCache.values()).sort((a, b) => b.timestamp - a.timestamp);
}

// 解析交易详情
function parseTransactionDetails(
  tx: ParsedTransactionWithMeta,
  publicKey: PublicKey
): Partial<Transaction> {
  const details: Partial<Transaction> = {};

  if (!tx.transaction || !tx.meta) {
    return details;
  }

  const accountKeys = tx.transaction.message.accountKeys;
  const instructions = tx.transaction.message.instructions;

  // 检查 SOL 转账
  const preBalances = tx.meta.preBalances;
  const postBalances = tx.meta.postBalances;

  const userIndex = accountKeys.findIndex(
    (key) => key.pubkey.toBase58() === publicKey.toBase58()
  );

  if (userIndex !== -1) {
    const balanceChange = postBalances[userIndex] - preBalances[userIndex];

    if (balanceChange > 0) {
      details.type = TransactionType.RECEIVE;
      details.amount = balanceChange / 1e9;
      details.token = 'SOL';
      details.tokenSymbol = 'SOL';

      // 查找发送者
      for (let i = 0; i < accountKeys.length; i++) {
        if (i !== userIndex && preBalances[i] > postBalances[i]) {
          details.from = accountKeys[i].pubkey.toBase58();
          break;
        }
      }
      details.to = publicKey.toBase58();
    } else if (balanceChange < 0) {
      details.type = TransactionType.SEND;
      details.amount = Math.abs(balanceChange) / 1e9;
      details.token = 'SOL';
      details.tokenSymbol = 'SOL';
      details.from = publicKey.toBase58();

      // 查找接收者
      for (let i = 0; i < accountKeys.length; i++) {
        if (i !== userIndex && postBalances[i] > preBalances[i]) {
          details.to = accountKeys[i].pubkey.toBase58();
          break;
        }
      }
    }
  }

  // 检查 Token 转账
  if (tx.meta.preTokenBalances && tx.meta.postTokenBalances) {
    const preTokenBalances = tx.meta.preTokenBalances;
    const postTokenBalances = tx.meta.postTokenBalances;

    for (const postBalance of postTokenBalances) {
      const preBalance = preTokenBalances.find(
        (pre) => pre.accountIndex === postBalance.accountIndex
      );

      if (preBalance && postBalance.owner === publicKey.toBase58()) {
        const preAmount = parseFloat(preBalance.uiTokenAmount.uiAmountString || '0');
        const postAmount = parseFloat(postBalance.uiTokenAmount.uiAmountString || '0');
        const change = postAmount - preAmount;

        if (change !== 0) {
          details.amount = Math.abs(change);
          details.token = postBalance.mint;
          details.tokenSymbol = postBalance.uiTokenAmount.uiAmountString || 'Unknown';

          if (change > 0) {
            details.type = TransactionType.RECEIVE;
          } else {
            details.type = TransactionType.SEND;
          }
        }
      }
    }
  }

  // 检查是否是 Swap（Jupiter）
  for (const instruction of instructions) {
    if ('parsed' in instruction) {
      continue;
    }

    const programId = instruction.programId.toBase58();

    // Jupiter Program ID
    if (programId === 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4' ||
        programId === 'JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB') {
      details.type = TransactionType.SWAP;
    }

    // Metaplex NFT Program
    if (programId === 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s') {
      details.type = TransactionType.NFT_TRANSFER;
    }
  }

  // 检查 memo
  for (const instruction of instructions) {
    if ('parsed' in instruction && instruction.parsed.type === 'memo') {
      details.memo = instruction.parsed.info;
    }
  }

  return details;
}

// 获取交易详情（优先从缓存，缓存未命中再单笔查询）
export async function getTransactionDetails(signature: string): Promise<Transaction | null> {
  if (txCache.has(signature)) {
    return txCache.get(signature)!;
  }

  try {
    await rpcDelay();
    const tx = await getConnection().getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx || !tx.meta) {
      return null;
    }

    const publicKey = tx.transaction.message.accountKeys[0].pubkey;

    const transaction: Transaction = {
      signature,
      timestamp: tx.blockTime || 0,
      type: TransactionType.UNKNOWN,
      status: tx.meta.err ? 'failed' : 'success',
      fee: tx.meta.fee / 1e9,
      blockTime: tx.blockTime || 0,
    };

    const parsed = parseTransactionDetails(tx, publicKey);
    Object.assign(transaction, parsed);

    txCache.set(signature, transaction);
    return transaction;
  } catch (error) {
    console.error('Failed to get transaction details:', error);
    return null;
  }
}

// 按类型筛选交易
export function filterTransactionsByType(
  transactions: Transaction[],
  type: TransactionType | 'all'
): Transaction[] {
  if (type === 'all') {
    return transactions;
  }
  return transactions.filter((tx) => tx.type === type);
}

// 按日期分组交易
export function groupTransactionsByDate(transactions: Transaction[]): Map<string, Transaction[]> {
  const groups = new Map<string, Transaction[]>();

  for (const tx of transactions) {
    const date = new Date(tx.timestamp * 1000);
    const dateKey = date.toLocaleDateString();

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }

    groups.get(dateKey)!.push(tx);
  }

  return groups;
}

// 计算交易统计
export function calculateTransactionStats(transactions: Transaction[]): {
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  totalFees: number;
  sentAmount: number;
  receivedAmount: number;
} {
  let totalFees = 0;
  let sentAmount = 0;
  let receivedAmount = 0;
  let successfulTransactions = 0;
  let failedTransactions = 0;

  for (const tx of transactions) {
    totalFees += tx.fee;

    if (tx.status === 'success') {
      successfulTransactions++;
    } else {
      failedTransactions++;
    }

    if (tx.type === TransactionType.SEND && tx.amount) {
      sentAmount += tx.amount;
    } else if (tx.type === TransactionType.RECEIVE && tx.amount) {
      receivedAmount += tx.amount;
    }
  }

  return {
    totalTransactions: transactions.length,
    successfulTransactions,
    failedTransactions,
    totalFees,
    sentAmount,
    receivedAmount,
  };
}

// 导出交易历史为 CSV
export function exportTransactionsToCSV(transactions: Transaction[]): string {
  const headers = ['Signature', 'Date', 'Type', 'Status', 'Amount', 'Token', 'From', 'To', 'Fee'];
  const rows = transactions.map((tx) => [
    tx.signature,
    new Date(tx.timestamp * 1000).toLocaleString(),
    tx.type,
    tx.status,
    tx.amount?.toString() || '',
    tx.tokenSymbol || '',
    tx.from || '',
    tx.to || '',
    tx.fee.toString(),
  ]);

  const csv = [headers, ...rows].map((row) => row.join(',')).join('\n');
  return csv;
}

// 搜索交易
export function searchTransactions(
  transactions: Transaction[],
  query: string
): Transaction[] {
  const lowerQuery = query.toLowerCase();

  return transactions.filter(
    (tx) =>
      tx.signature.toLowerCase().includes(lowerQuery) ||
      tx.tokenSymbol?.toLowerCase().includes(lowerQuery) ||
      tx.from?.toLowerCase().includes(lowerQuery) ||
      tx.to?.toLowerCase().includes(lowerQuery) ||
      tx.memo?.toLowerCase().includes(lowerQuery)
  );
}
