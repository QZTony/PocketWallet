# NFT 功能文档

## 功能概述

Solana 钱包现已支持 NFT 显示和管理功能，包括：

- ✅ 查看所有 NFT
- ✅ 按集合分组显示
- ✅ 搜索 NFT
- ✅ 查看 NFT 详细信息（图片、属性、创作者等）
- ✅ 转移 NFT
- ✅ 在区块链浏览器查看

## 新增文件

### 服务层
- `src/services/nftService.ts` - NFT 核心服务
  - 获取钱包所有 NFT
  - 获取 NFT 元数据
  - 按集合分组
  - 转移 NFT

### 组件层
- `src/components/NFTGrid.tsx` - NFT 网格展示组件
  - 2 列网格布局
  - 显示 NFT 图片和名称
  - 支持点击查看详情

### 页面层
- `app/nfts.tsx` - NFT 列表页面
  - 显示所有 NFT
  - 按集合筛选
  - 搜索功能
  - 下拉刷新

- `app/nft-detail.tsx` - NFT 详情页面
  - 显示 NFT 完整信息
  - 属性展示
  - 创作者信息
  - 转移功能
  - 在浏览器查看

## 技术实现

### NFT 获取方式

项目支持两种 NFT 获取方式：

**1. DAS API (Digital Asset Standard) - 推荐**
```typescript
// 使用 Solana DAS API 获取 NFT
const response = await axios.post(connection.rpcEndpoint, {
  jsonrpc: '2.0',
  method: 'getAssetsByOwner',
  params: {
    ownerAddress: publicKey.toBase58(),
    page: 1,
    limit: 1000,
  },
});
```

优点：
- 速度快
- 数据完整
- 包含压缩 NFT (cNFT)

**2. Legacy Method - 备用方案**
```typescript
// 通过 Token Program 获取 NFT
const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
  programId: TOKEN_PROGRAM_ID,
});

// 筛选 NFT (amount = 1, decimals = 0)
// 然后获取 Metaplex 元数据
```

优点：
- 兼容性好
- 不依赖特定 RPC 提供商

### Metaplex 元数据

NFT 元数据存储在 Metaplex 标准账户中：

```typescript
// 计算元数据 PDA
const METADATA_PROGRAM_ID = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';
const [metadataPDA] = PublicKey.findProgramAddressSync(
  [
    Buffer.from('metadata'),
    METADATA_PROGRAM_ID.toBuffer(),
    mintPubkey.toBuffer(),
  ],
  METADATA_PROGRAM_ID
);
```

元数据包含：
- 链上数据：名称、符号、URI
- 链下数据（通过 URI 获取）：图片、描述、属性

## 使用方法

### 查看 NFT

1. 在主页点击 "View NFTs" 按钮
2. 等待加载完成
3. 浏览 NFT 网格

### 筛选 NFT

1. 使用顶部搜索框搜索 NFT 名称
2. 点击集合标签按集合筛选
3. 下拉刷新更新列表

### 查看详情

1. 点击任意 NFT
2. 查看完整信息：
   - 高清图片
   - 描述
   - 属性（Traits）
   - 创作者信息
   - Mint 地址

### 转移 NFT

1. 在 NFT 详情页点击 "Transfer NFT"
2. 输入接收者钱包地址
3. 确认转移
4. 等待交易确认

### 在浏览器查看

1. 在 NFT 详情页点击 "View on Explorer"
2. 自动打开 Solscan 浏览器
3. 查看链上完整信息

## 注意事项

### RPC 要求

DAS API 需要支持的 RPC 端点：
- ✅ Helius
- ✅ QuickNode (Enterprise)
- ✅ Triton
- ❌ 公共 RPC（不支持）

如果使用公共 RPC，系统会自动降级到 Legacy 方法。

### 性能优化

1. **图片加载**
   - 使用 React Native Image 组件
   - 自动缓存
   - 支持占位符

2. **元数据缓存**
   - 链下元数据会被缓存
   - 减少重复请求

3. **分页加载**
   - 当前一次加载所有 NFT
   - 未来可添加分页支持

### 已知限制

1. **压缩 NFT (cNFT)**
   - DAS API 支持
   - Legacy 方法不支持

2. **大型集合**
   - 超过 1000 个 NFT 可能需要分页
   - 当前限制 1000 个

3. **元数据格式**
   - 仅支持 Metaplex 标准
   - 非标准 NFT 可能无法正确显示

## 故障排除

### NFT 不显示

**问题：** NFT 列表为空

**解决方案：**
1. 检查 RPC 端点是否支持 DAS API
2. 尝试使用 Helius 或 QuickNode
3. 检查钱包是否真的拥有 NFT

### 图片加载失败

**问题：** NFT 图片显示为占位符

**解决方案：**
1. 检查网络连接
2. 某些 NFT 使用 IPFS，可能加载较慢
3. 尝试刷新页面

### 转移失败

**问题：** 转移 NFT 时出错

**解决方案：**
1. 确保有足够 SOL 支付交易费用
2. 检查接收地址是否正确
3. 某些 NFT 可能有转移限制（如质押中）

## 未来增强

计划添加的功能：

- [ ] NFT 详情页显示交易历史
- [ ] NFT 价格估值（使用 Magic Eden API）
- [ ] 批量转移 NFT
- [ ] NFT 收藏夹
- [ ] 隐藏/显示 NFT
- [ ] NFT 排序（按名称、日期、稀有度）
- [ ] 支持 NFT 市场链接（Magic Eden, Tensor）
- [ ] 显示 NFT 地板价
- [ ] 支持 NFT Staking
- [ ] 显示 NFT 稀有度排名

## API 参考

### nftService.ts

```typescript
// 获取所有 NFT
getNFTs(publicKey: PublicKey): Promise<NFT[]>

// 获取 NFT 详情
getNFTDetails(mint: string): Promise<NFT | null>

// 按集合分组
groupNFTsByCollection(nfts: NFT[]): Map<string, NFT[]>

// 转移 NFT
transferNFT(
  mint: string,
  fromPublicKey: PublicKey,
  toPublicKey: PublicKey,
  secretKey: Uint8Array
): Promise<string>
```

## 相关资源

- [Metaplex 文档](https://docs.metaplex.com/)
- [Solana DAS API](https://docs.helius.dev/compression-and-das-api/digital-asset-standard-das-api)
- [NFT 标准](https://docs.metaplex.com/programs/token-metadata/overview)
- [Solscan](https://solscan.io/)
