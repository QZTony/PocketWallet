# NFT 使用指南

## 快速开始

### 查看你的 NFT

1. 打开钱包应用
2. 在主页点击 **"View NFTs"** 按钮
3. 等待 NFT 加载完成
4. 浏览你的 NFT 收藏

### 搜索 NFT

在 NFT 页面顶部的搜索框中输入：
- NFT 名称
- 集合名称
- 符号

### 按集合筛选

如果你有多个集合的 NFT：
1. 查看搜索框下方的集合标签
2. 点击任意集合标签查看该集合的 NFT
3. 点击 "All" 查看所有 NFT

## NFT 详情

### 查看完整信息

点击任意 NFT 卡片，查看：
- **高清图片**：完整尺寸的 NFT 图片
- **描述**：NFT 的详细描述
- **属性**：所有 traits 和属性值
- **创作者**：创作者地址和份额
- **Mint 地址**：NFT 的唯一标识符

### 属性说明

NFT 属性通常包括：
- **Trait Type**：属性类型（如 Background, Eyes, Hat）
- **Value**：属性值（如 Blue, Laser, Crown）
- **Rarity**：某些 NFT 会显示稀有度

### 创作者信息

每个 NFT 可能有多个创作者：
- **地址**：创作者的钱包地址
- **份额**：创作者的版税份额（%）
- **验证状态**：是否经过验证（✓ Verified）

## 转移 NFT

### 步骤

1. 打开 NFT 详情页
2. 点击 **"Transfer NFT"** 按钮
3. 输入接收者的钱包地址
4. 确认转移
5. 等待交易确认

### 注意事项

⚠️ **转移前请确认：**
- 接收地址正确无误
- 钱包有足够 SOL 支付交易费用（约 0.000005 SOL）
- NFT 未被质押或锁定

⚠️ **转移后：**
- NFT 将从你的钱包移除
- 无法撤销转移
- 交易记录在区块链上永久保存

## 在浏览器查看

### Solscan 浏览器

1. 在 NFT 详情页点击 **"View on Explorer"**
2. 自动打开 Solscan 页面
3. 查看链上完整信息：
   - 交易历史
   - 持有者历史
   - 元数据详情
   - 合约信息

### 查看元数据

点击 **"View Metadata"** 查看：
- 原始 JSON 元数据
- IPFS 链接
- 文件信息

## 常见问题

### Q: 为什么我的 NFT 没有显示？

**A:** 可能的原因：
1. NFT 刚刚铸造，需要等待几分钟
2. RPC 端点不支持 DAS API（尝试使用 Helius）
3. NFT 不符合 Metaplex 标准
4. 网络连接问题

**解决方法：**
- 下拉刷新页面
- 检查网络连接
- 更换 RPC 端点

### Q: NFT 图片显示为 "No Image"？

**A:** 可能的原因：
1. NFT 元数据中没有图片
2. 图片链接失效
3. IPFS 网关响应慢

**解决方法：**
- 等待几秒钟，IPFS 可能需要时间
- 检查网络连接
- 在浏览器中查看元数据确认图片链接

### Q: 可以批量转移 NFT 吗？

**A:** 当前版本不支持批量转移，每次只能转移一个 NFT。未来版本会添加此功能。

### Q: 转移 NFT 需要多少费用？

**A:** 转移 NFT 需要约 0.000005 SOL 的网络费用。确保钱包有足够余额。

### Q: 支持压缩 NFT (cNFT) 吗？

**A:**
- 使用 DAS API 时：✅ 支持
- 使用 Legacy 方法时：❌ 不支持

建议使用支持 DAS API 的 RPC 端点（如 Helius）。

### Q: 可以在应用内出售 NFT 吗？

**A:** 当前版本不支持直接出售。你可以：
1. 转移 NFT 到市场钱包
2. 在 Magic Eden 或 Tensor 上架
3. 未来版本会集成市场功能

## 高级功能

### 查看 NFT 集合统计

虽然应用内不显示集合统计，但你可以：
1. 点击 "View on Explorer"
2. 在 Solscan 查看集合信息
3. 查看地板价、交易量等

### 验证 NFT 真伪

1. 查看创作者是否已验证（✓ Verified）
2. 在 Solscan 查看铸造历史
3. 检查集合官方信息

### 导出 NFT 列表

当前版本不支持导出，但你可以：
1. 截图保存
2. 复制 Mint 地址手动记录
3. 未来版本会添加导出功能

## 技术细节

### 支持的 NFT 标准

- ✅ Metaplex Token Metadata
- ✅ Metaplex Certified Collections
- ✅ Programmable NFTs (pNFTs)
- ✅ Compressed NFTs (cNFTs) - 需要 DAS API

### 元数据获取方式

1. **DAS API**（推荐）
   - 速度快
   - 数据完整
   - 支持 cNFT

2. **Legacy Method**（备用）
   - 兼容性好
   - 速度较慢
   - 不支持 cNFT

### RPC 端点推荐

**支持 DAS API：**
- Helius (推荐)
- QuickNode Enterprise
- Triton

**不支持 DAS API：**
- 公共 RPC
- 基础 QuickNode

## 最佳实践

### 安全建议

1. **转移前确认**
   - 仔细检查接收地址
   - 小额测试（如果可能）
   - 保存交易签名

2. **备份重要 NFT**
   - 截图保存
   - 记录 Mint 地址
   - 保存元数据链接

3. **防止诈骗**
   - 不要转移到未知地址
   - 验证集合真伪
   - 警惕钓鱼链接

### 性能优化

1. **使用优质 RPC**
   - Helius 或 QuickNode
   - 减少加载时间
   - 提高稳定性

2. **定期清理缓存**
   - 如果图片加载异常
   - 重启应用

3. **网络环境**
   - 使用稳定网络
   - IPFS 图片可能需要 VPN

## 相关资源

- [Metaplex 文档](https://docs.metaplex.com/)
- [Solscan 浏览器](https://solscan.io/)
- [Magic Eden 市场](https://magiceden.io/)
- [Tensor 市场](https://tensor.trade/)
- [Helius RPC](https://helius.dev/)

## 反馈和支持

如果遇到问题或有功能建议：
1. 查看 NFT_FEATURES.md 技术文档
2. 检查 README.md 故障排除部分
3. 提交 GitHub Issue
