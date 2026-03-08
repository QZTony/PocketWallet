# 快速开始指南

## 安装步骤

1. 进入项目目录：
```bash
cd C:\Users\zeki\Desktop\solana-mobile-wallet
```

2. 安装依赖：
```bash
npm install
```

3. 启动开发服务器：
```bash
npm start
```

4. 运行应用：
   - 按 `a` 在 Android 模拟器运行
   - 按 `i` 在 iOS 模拟器运行（仅 Mac）
   - 扫描二维码在真机运行

## 测试钱包

### 使用测试助记词（Devnet）

1. 修改 `src/constants/config.ts`：
```typescript
export const NETWORK = 'devnet';
```

2. 使用测试助记词导入（或生成新钱包）

3. 获取测试 SOL：
   访问 https://faucet.solana.com/

### 常用 Token 地址

**Mainnet:**
- SOL: `So11111111111111111111111111111111111111112`
- USDC: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- USDT: `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`

## 功能说明

### 1. 导入钱包
- 支持 12/24 词助记词
- 支持 Base58 私钥
- 可生成新钱包

### 2. 查看余额
- 显示 SOL 余额
- 显示所有 SPL Token
- 下拉刷新

### 3. Swap 代币
- 使用 Jupiter 聚合器
- 自动寻找最佳价格
- 显示价格影响和路由

### 4. 转账
- 发送 SOL
- 发送 SPL Token

## 注意事项

⚠️ **安全提醒：**
- 这是开发版钱包，请勿存储大量资金
- 务必备份助记词
- 私钥加密存储在设备本地
- 不要分享私钥或助记词

⚠️ **网络费用：**
- 每笔交易需要约 0.000005 SOL 手续费
- Swap 可能需要更多费用（取决于路由复杂度）
- 确保钱包有足够 SOL 支付费用

## 下一步开发

### 实现 0 手续费功能

需要创建后端服务器作为 fee payer：

1. 创建 Node.js 服务器
2. 服务器持有 fee payer 钱包
3. 用户签名交易，服务器添加费用支付签名
4. 服务器提交交易

### 其他功能
- NFT 显示
- 交易历史
- 多钱包管理
- 生物识别解锁
- 价格图表

## 故障排除

### 依赖安装失败
```bash
# 清除缓存
npm cache clean --force
# 删除 node_modules
rm -rf node_modules
# 重新安装
npm install
```

### Metro bundler 错误
```bash
# 清除 Metro 缓存
npm start -- --clear
```

### Android 构建失败
```bash
# 清除 Android 构建
cd android
./gradlew clean
cd ..
npm run android
```

## 联系支持

如有问题，请查看：
- README.md
- Solana 文档: https://docs.solana.com
- Expo 文档: https://docs.expo.dev
