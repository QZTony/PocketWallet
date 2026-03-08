# 网络连接问题修复

## 问题
主页一直黑屏转圈，控制台显示：
```
Home token loading failed: TypeError: Network request failed
```

## 原因
1. 默认 RPC URL 使用了 Alchemy，但 API key 可能无效或有限制
2. 网络请求可能超时或失败

## 修复

### 1. 更新 RPC 配置 (config.ts)
改用 Solana 官方公共 RPC 端点：

```typescript
const DEFAULT_RPC_URLS: Record<NetworkType, string> = {
  'mainnet-beta': clusterApiUrl('mainnet-beta'),  // 使用官方 RPC
  'devnet': clusterApiUrl('devnet'),
  'testnet': clusterApiUrl('testnet'),
};
```

### 2. 添加超时保护 ((tabs)/index.tsx)
为代币加载添加 30 秒超时：

```typescript
const timeoutPromise = new Promise((_, reject) =>
  setTimeout(() => reject(new Error('Token loading timeout')), 30000)
);

const result = await Promise.race([
  tokenService.getAllTokensWithPrices(wallet.publicKey),
  timeoutPromise
]);
```

### 3. 添加错误处理
即使代币加载失败，也显示主页：

```typescript
try {
  // 加载代币
} catch (tokenError) {
  console.error('[Home] Token loading failed:', tokenError);
  // 显示空列表
  setTokens([]);
  setTotalUsd(0);
  setTotalChange(0);
}
```

## 测试
1. 重启应用
2. 查看控制台日志（以 `[Home]` 开头）
3. 应该能看到主页，即使代币加载失败

## 如果还有问题

### 选项 1：使用自定义 RPC
在应用中：设置 -> RPC 设置 -> 输入自定义 RPC URL

推荐的 RPC 服务：
- Helius: https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
- QuickNode: https://your-endpoint.quiknode.pro/YOUR_KEY/
- Alchemy: https://solana-mainnet.g.alchemy.com/v2/YOUR_KEY

### 选项 2：切换到 Devnet 测试
在主页右上角网络选择器切换到 Devnet

### 选项 3：检查网络连接
- 确保设备有网络连接
- 检查防火墙设置
- 尝试使用 VPN
