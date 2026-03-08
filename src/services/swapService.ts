import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import axios from 'axios';
import { JUPITER_API_URL, JUPITER_API_KEY } from '@/constants/config';
import { SwapQuote, SwapResult } from '@/types';

const jupiterHeaders = { 'x-api-key': JUPITER_API_KEY };

/**
 * Swap 服务
 * 集成 Jupiter Aggregator 实现代币交换
 */

// 获取 Swap Quote
export async function getSwapQuote(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number = 50
): Promise<SwapQuote> {
  try {
    const response = await axios.get(`${JUPITER_API_URL}/quote`, {
      headers: jupiterHeaders,
      params: {
        inputMint,
        outputMint,
        amount: Math.round(amount),
        slippageBps,
      },
    });

    return response.data;
  } catch (error: any) {
    console.error('Failed to get swap quote:', error);
    const msg = error?.response?.data?.error || error?.message || 'Failed to get swap quote';
    throw new Error(msg);
  }
}

// 执行 Swap
export async function executeSwap(
  quote: SwapQuote,
  userPublicKey: PublicKey,
  signTransaction: (tx: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>
): Promise<SwapResult> {
  try {
    // 1. 获取 Swap 交易
    const swapResponse = await axios.post(`${JUPITER_API_URL}/swap`, {
      quoteResponse: quote,
      userPublicKey: userPublicKey.toBase58(),
      wrapAndUnwrapSol: true,
      dynamicComputeUnitLimit: true,
      dynamicSlippage: true,
      prioritizationFeeLamports: {
        priorityLevelWithMaxLamports: {
          priorityLevel: 'medium',
          maxLamports: 100000,
        },
      },
    }, { headers: jupiterHeaders });

    const { swapTransaction } = swapResponse.data;

    // 2. 反序列化交易
    const transactionBuf = Buffer.from(swapTransaction, 'base64');
    const transaction = VersionedTransaction.deserialize(transactionBuf);

    // 3. 签名交易
    const signedTransaction = await signTransaction(transaction);

    // 4. 发送交易
    const { getConnection } = require('@/constants/config');
    const conn = getConnection();
    const rawTransaction = signedTransaction.serialize();
    const txid = await conn.sendRawTransaction(rawTransaction, {
      skipPreflight: true,
      maxRetries: 3,
    });

    // 轮询确认（避免 signatureSubscribe WebSocket 不兼容）
    let confirmed = false;
    for (let i = 0; i < 15; i++) {
      await new Promise(r => setTimeout(r, 2000));
      try {
        const { value } = await conn.getSignatureStatuses([txid]);
        const status = value?.[0];
        if (status) {
          if (status.err) {
            const errStr = JSON.stringify(status.err);
            if (errStr.includes('Custom":1') || errStr.includes('Custom":0')) {
              throw new Error('Insufficient SOL balance for transaction fees');
            }
            throw new Error(`Transaction failed: ${errStr}`);
          }
          if (status.confirmationStatus === 'confirmed' || status.confirmationStatus === 'finalized') {
            confirmed = true;
            break;
          }
        }
      } catch (e: any) {
        if (e.message?.includes('Transaction failed')) throw e;
      }
    }

    return {
      txid,
      inputAmount: Number(quote.inAmount),
      outputAmount: Number(quote.outAmount),
    };
  } catch (error: any) {
    console.error('Failed to execute swap:', error);
    const msg = error?.response?.data?.error || error?.message || 'Failed to execute swap';
    throw new Error(msg);
  }
}

// 获取支持的 Token 列表
export async function getSupportedTokens(): Promise<any[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await axios.get('https://token.jup.ag/all', { signal: controller.signal });
    clearTimeout(timeout);
    return response.data;
  } catch (error) {
    console.warn('Failed to get supported tokens, returning empty list');
    return [];
  }
}

// 计算价格影响
export function calculatePriceImpact(quote: SwapQuote): number {
  return parseFloat(quote.priceImpactPct) * 100;
}

// 格式化 Swap 路由信息
export function formatSwapRoute(quote: SwapQuote): string {
  if (!quote.routePlan || quote.routePlan.length === 0) {
    return 'Direct swap';
  }

  const dexes = quote.routePlan.map((step: any) => {
    return step.swapInfo?.label || 'Unknown DEX';
  });

  return dexes.join(' → ');
}
