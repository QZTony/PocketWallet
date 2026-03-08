# 交易历史功能文档

## 功能概述

Solana 钱包现已支持完整的交易历史记录功能，包括：

- ✅ 查看所有交易历史
- ✅ 按类型筛选（发送、接收、Swap、NFT 等）
- ✅ 搜索交易
- ✅ 查看交易详情
- ✅ 交易统计数据
- ✅ 导出 CSV
- ✅ 复制交易签名
- ✅ 在区块链浏览器查看
- ✅ 分享交易

## 新增文件

### 服务层
- `src/services/transactionService.ts` - 交易历史核心服务
  - 获取交易历史
  - 解析交易详情
  - 按类型筛选
  - 按日期分组
  - 计算统计数据
  - 导出 CSV
  - 搜索交易

### 组件层
- `src/components/TransactionList.tsx` - 交易列表组件
  - 显示交易列表
  - 交易类型图标
  - 状态标识
  - 时间格式化

### 页面层
- `app/transactions.tsx` - 交易历史页面
  - 显示所有交易
  - 统计卡片
  - 筛选和搜索
  - 导出功能

- `app/transaction-detail.tsx` - 交易详情页面
  - 完整交易信息
  - 复制签名
  - 在浏览器查看
  - 分享交易

## 支持的交易类型

### 1. Send（发送）
- SOL 转账
- SPL Token 转账
- 显示接收地址和金额

### 2. Receive（接收）
- 接收 SOL
- 接收 SPL Token
- 显示发送者地址和金额

### 3. Swap（交换）
- Jupiter Swap 交易
- 显示输入/输出代币
- 自动识别 Jupiter 程序

### 4. NFT Transfer（NFT 转移）
- NFT 转账
- 识别 Metaplex 程序
- 显示 NFT 信息

### 5. NFT Mint（NFT 铸造）
- NFT 铸造交易
- 显示铸造信息

### 6. Stake/Unstake（质押/解除质押）
- 质押 SOL
- 解除质押
- 显示质押信息

### 7. Unknown（未知）
- 其他类型交易
- 显示基本信息

## 功能详解

### 交易历史列表

**显示内容：**
- 交易类型图标（带颜色标识）
- 交易标题
- 时间（相对时间或绝对时间）
- 金额（正数/负数）
- 状态（成功/失败）
- Memo（如果有）

**交互功能：**
- 点击查看详情
- 下拉刷新
- 无限滚动（未来）

### 统计卡片

显示以下统计数据：
- **Total**: 总交易数
- **Success**: 成功交易数
- **Failed**: 失败交易数
- **Fees**: 总手续费（SOL）

### 筛选功能

按交易类型筛选：
- All（全部）
- Sent（已发送）
- Received（已接收）
- Swaps（交换）
- NFTs（NFT 交易）

### 搜索功能

支持搜索：
- 交易签名
- Token 符号
- 发送/接收地址
- Memo 内容

### 交易详情

**基本信息：**
- 交易签名
- 日期和时间
- 交易类型
- 状态
- 手续费

**金额信息：**
- 转账金额
- Token 符号
- 正负标识

**地址信息：**
- 发送者地址
- 接收者地址

**其他信息：**
- Memo（备注）
- 区块时间

**操作按钮：**
- View on Solscan（在浏览器查看）
- Copy Signature（复制签名）
- Share（分享）

## 技术实现

### 获取交易历史

使用 Solana RPC 方法：

```typescript
// 获取签名列表
const signatures = await connection.getSignaturesForAddress(publicKey, {
  limit: 50,
});

// 获取交易详情
const tx = await connection.getParsedTransaction(signature, {
  maxSupportedTransactionVersion: 0,
});
```

### 交易解析

**解析步骤：**

1. **获取账户余额变化**
   - 比较 preBalances 和 postBalances
   - 判断是发送还是接收

2. **解析 Token 转账**
   - 比较 preTokenBalances 和 postTokenBalances
   - 获取 Token 信息

3. **识别交易类型**
   - 检查 Program ID
   - Jupiter: `JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4`
   - Metaplex: `metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s`

4. **提取 Memo**
   - 查找 memo 指令
   - 解析 memo 内容

### 性能优化

**批量获取：**
- 一次获取多个交易
- 使用 Promise.all 并行处理

**缓存策略：**
- 缓存已解析的交易
- 避免重复请求

**分页加载：**
- 初始加载 50 条
- 滚动加载更多（未来）

## 使用方法

### 查看交易历史

1. 在主页点击 "Transaction History"
2. 等待加载完成
3. 浏览交易列表

### 筛选交易

1. 点击顶部的类型标签
2. 选择要查看的交易类型
3. 列表自动更新

### 搜索交易

1. 在搜索框输入关键词
2. 支持搜索：
   - 签名
   - Token 名称
   - 地址
   - Memo

### 查看详情

1. 点击任意交易
2. 查看完整信息
3. 可以复制、分享或在浏览器查看

### 导出 CSV

1. 点击 "Export CSV" 按钮
2. 生成 CSV 数据
3. 保存或分享文件

## 数据格式

### Transaction 接口

```typescript
interface Transaction {
  signature: string;        // 交易签名
  timestamp: number;        // 时间戳
  type: TransactionType;    // 交易类型
  status: 'success' | 'failed';  // 状态
  amount?: number;          // 金额
  token?: string;           // Token mint
  tokenSymbol?: string;     // Token 符号
  from?: string;            // 发送者
  to?: string;              // 接收者
  fee: number;              // 手续费
  memo?: string;            // 备注
  blockTime: number;        // 区块时间
}
```

### CSV 导出格式

```csv
Signature,Date,Type,Status,Amount,Token,From,To,Fee
abc123...,2024-01-01 12:00:00,send,success,1.5,SOL,xyz...,abc...,0.000005
```

## 注意事项

### RPC 限制

**公共 RPC：**
- 请求限制较严格
- 可能加载较慢
- 建议使用付费 RPC

**付费 RPC：**
- Helius（推荐）
- QuickNode
- Triton

### 交易数量

**默认限制：**
- 一次加载 50-100 条
- 可以调整 limit 参数

**历史深度：**
- Solana 保留所有历史
- 但获取大量历史可能较慢

### 解析准确性

**已知问题：**
- 复杂交易可能解析不完整
- 某些 DeFi 交易类型可能显示为 Unknown
- Memo 可能不总是可用

**改进方向：**
- 添加更多程序识别
- 改进交易类型判断
- 支持自定义标签

## 故障排除

### 交易加载失败

**问题：** 无法加载交易历史

**解决方案：**
1. 检查网络连接
2. 更换 RPC 端点
3. 减少 limit 参数
4. 重试加载

### 交易类型显示为 Unknown

**问题：** 某些交易显示为未知类型

**原因：**
- 新的程序或协议
- 复杂的多步骤交易
- 自定义程序

**解决方案：**
- 在浏览器查看详细信息
- 手动添加标签（未来功能）

### 金额显示不正确

**问题：** 金额显示异常

**原因：**
- Token decimals 解析错误
- 复杂的 Swap 交易
- 多个转账在一个交易中

**解决方案：**
- 在 Solscan 查看准确金额
- 检查交易详情

### 导出 CSV 失败

**问题：** 无法导出 CSV

**解决方案：**
1. 检查是否有交易数据
2. 确保有存储权限
3. 尝试减少导出数量

## 未来增强

计划添加的功能：

- [ ] 无限滚动加载
- [ ] 按日期范围筛选
- [ ] 自定义交易标签
- [ ] 交易分类统计图表
- [ ] 月度/年度报告
- [ ] 税务报告导出
- [ ] 交易备注编辑
- [ ] 收藏重要交易
- [ ] 交易提醒
- [ ] 批量操作
- [ ] 高级搜索（金额范围、日期范围）
- [ ] 交易分析（最常交互地址、Token 分布）

## API 参考

### transactionService.ts

```typescript
// 获取交易历史
getTransactionHistory(
  publicKey: PublicKey,
  limit?: number
): Promise<Transaction[]>

// 获取交易详情
getTransactionDetails(
  signature: string
): Promise<Transaction | null>

// 按类型筛选
filterTransactionsByType(
  transactions: Transaction[],
  type: TransactionType | 'all'
): Transaction[]

// 按日期分组
groupTransactionsByDate(
  transactions: Transaction[]
): Map<string, Transaction[]>

// 计算统计
calculateTransactionStats(
  transactions: Transaction[]
): TransactionStats

// 导出 CSV
exportTransactionsToCSV(
  transactions: Transaction[]
): string

// 搜索交易
searchTransactions(
  transactions: Transaction[],
  query: string
): Transaction[]
```

## 相关资源

- [Solana Transaction 文档](https://docs.solana.com/developing/programming-model/transactions)
- [Solscan 浏览器](https://solscan.io/)
- [Solana RPC API](https://docs.solana.com/api/http)
- [Jupiter 文档](https://docs.jup.ag/)
