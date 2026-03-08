# 生物识别解锁功能文档

## 功能概述

Solana 钱包现已支持生物识别解锁功能，提供快速、安全的钱包访问方式：

- ✅ 指纹识别（Fingerprint）
- ✅ 面部识别（Face ID）
- ✅ 虹膜识别（Iris）
- ✅ 自动锁定和解锁
- ✅ 设备安全硬件支持
- ✅ 可选启用/禁用
- ✅ 测试功能

## 新增文件

### 服务层
- `src/services/biometricService.ts` - 生物识别核心服务
  - 检查设备支持
  - 检查注册状态
  - 执行认证
  - 启用/禁用生物识别
  - 解锁钱包

### Hooks
- `src/hooks/useAppLock.ts` - 应用锁定 Hook
  - 启动时检查
  - 自动跳转锁定页面

### 页面层
- `app/biometric-setup.tsx` - 生物识别设置引导页
  - 首次设置引导
  - 功能介绍
  - 启用/跳过选项

- `app/biometric-lock.tsx` - 生物识别锁定页
  - 解锁界面
  - 自动触发认证
  - 备用密码选项（未来）

- `app/biometric-settings.tsx` - 生物识别设置页
  - 启用/禁用开关
  - 设备状态显示
  - 测试功能
  - 安全信息

## 支持的生物识别类型

### 1. Fingerprint（指纹识别）
- **Android**: 大多数设备支持
- **iOS**: Touch ID
- **图标**: 指纹图标

### 2. Face ID（面部识别）
- **iOS**: iPhone X 及以上
- **Android**: 部分高端设备
- **图标**: 面部识别图标

### 3. Iris（虹膜识别）
- **Android**: 部分三星设备
- **图标**: 眼睛图标

## 工作流程

### 首次设置流程

```
导入/创建钱包
    ↓
检查设备支持
    ↓
支持 → 显示设置引导页
    ↓
用户选择启用/跳过
    ↓
启用 → 执行认证测试
    ↓
成功 → 进入主页
```

### 日常使用流程

```
打开应用
    ↓
检查生物识别是否启用
    ↓
已启用 → 显示锁定页面
    ↓
自动触发认证
    ↓
成功 → 进入主页
失败 → 重试或使用密码
```

### 设置管理流程

```
主页 → 设置菜单
    ↓
生物识别设置
    ↓
查看状态/启用/禁用
    ↓
测试认证
```

## 技术实现

### 设备检查

```typescript
// 检查硬件支持
const supported = await LocalAuthentication.hasHardwareAsync();

// 检查是否已注册
const enrolled = await LocalAuthentication.isEnrolledAsync();

// 获取支持的类型
const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
```

### 执行认证

```typescript
const result = await LocalAuthentication.authenticateAsync({
  promptMessage: 'Authenticate to access your wallet',
  cancelLabel: 'Cancel',
  disableDeviceFallback: false,
  fallbackLabel: 'Use Passcode',
});

if (result.success) {
  // 认证成功
} else {
  // 认证失败
}
```

### 状态存储

使用 `expo-secure-store` 安全存储：
- `biometric_enabled`: 是否启用生物识别
- `biometric_setup_complete`: 是否完成设置引导

### 安全性

**设备级安全：**
- 生物识别数据不离开设备
- 使用设备安全硬件（Secure Enclave/TEE）
- 钱包私钥保持加密状态

**应用级安全：**
- 只存储启用状态，不存储生物识别数据
- 认证失败不影响钱包安全
- 可随时禁用

## 使用方法

### 首次设置

**自动引导：**
1. 导入或创建钱包后
2. 自动检测设备支持
3. 显示设置引导页
4. 选择"Enable Biometric Unlock"或"Skip for Now"

**手动设置：**
1. 主页 → 设置图标（右上角）
2. 选择"Biometric Settings"
3. 打开"Enable Biometric Unlock"开关
4. 完成认证测试

### 解锁钱包

**自动解锁：**
1. 打开应用
2. 自动显示解锁页面
3. 自动触发生物识别
4. 认证成功后进入主页

**手动解锁：**
1. 点击"Authenticate"按钮
2. 完成生物识别
3. 进入主页

### 禁用生物识别

1. 主页 → 设置 → Biometric Settings
2. 关闭"Enable Biometric Unlock"开关
3. 确认禁用
4. 下次打开应用不再需要认证

### 测试功能

1. Biometric Settings 页面
2. 点击"Test Biometric Authentication"
3. 完成认证测试
4. 查看结果

## 用户界面

### 设置引导页

**显示内容：**
- 标题："Secure Your Wallet"
- 功能介绍：
  - Quick Access（快速访问）
  - Enhanced Security（增强安全）
  - Convenient（便捷）
- 支持的生物识别类型
- 启用按钮
- 跳过按钮

### 锁定页面

**显示内容：**
- 生物识别图标（根据类型）
- 标题："Unlock Your Wallet"
- 描述："Use [Type] to access your wallet securely"
- 认证按钮
- 备用密码按钮（未来）

### 设置页面

**显示内容：**
- 启用/禁用开关
- 设备状态：
  - Hardware Support（硬件支持）
  - Biometric Enrolled（已注册）
  - Available Methods（可用方法）
- 测试按钮
- 安全信息

## 状态说明

### 设备状态

**Hardware Support:**
- ✅ 支持：设备有生物识别硬件
- ❌ 不支持：设备无生物识别硬件

**Biometric Enrolled:**
- ✅ 已注册：用户已在设备设置中注册生物识别
- ❌ 未注册：需要在设备设置中注册

**Available Methods:**
- 显示支持的生物识别类型
- 例如：Fingerprint, Face ID

### 应用状态

**Enabled:**
- 生物识别解锁已启用
- 打开应用时需要认证

**Disabled:**
- 生物识别解锁已禁用
- 打开应用直接进入主页

**Setup Complete:**
- 已完成首次设置引导
- 不再显示引导页

## 错误处理

### 认证失败

**原因：**
- 生物识别不匹配
- 用户取消
- 传感器错误
- 超时

**处理：**
- 显示错误提示
- 允许重试
- 提供备用方式（未来）

### 设备不支持

**显示：**
- "Biometric Not Supported"
- 说明信息
- 继续按钮

**处理：**
- 标记设置完成
- 跳转到主页
- 不显示生物识别选项

### 未注册生物识别

**显示：**
- "No Biometric Enrolled"
- 引导到设备设置
- 跳过按钮

**处理：**
- 允许跳过
- 可稍后在设置中启用

## 注意事项

### 安全性

**优点：**
- 快速便捷
- 设备级安全
- 不存储生物识别数据

**限制：**
- 依赖设备安全性
- 不能完全替代密码
- 某些设备可能不够安全

### 兼容性

**支持的设备：**
- iOS: iPhone 5s 及以上（Touch ID）
- iOS: iPhone X 及以上（Face ID）
- Android: 大多数中高端设备

**不支持的设备：**
- 旧款设备
- 低端设备
- 无生物识别硬件的设备

### 用户体验

**优点：**
- 无需记忆密码
- 快速解锁
- 现代化体验

**注意：**
- 首次设置需要引导
- 认证失败需要重试
- 某些场景可能不便（戴手套、口罩等）

## 故障排除

### 生物识别不工作

**问题：** 无法使用生物识别

**解决方案：**
1. 检查设备是否支持
2. 确认已在设备设置中注册
3. 重启应用
4. 重新启用生物识别

### 认证总是失败

**问题：** 生物识别认证失败

**解决方案：**
1. 清洁传感器
2. 重新注册生物识别
3. 检查设备设置
4. 使用备用方式

### 无法禁用

**问题：** 无法关闭生物识别

**解决方案：**
1. 确认网络连接
2. 重启应用
3. 清除应用数据（注意备份钱包）

### 启动时卡在锁定页面

**问题：** 无法进入主页

**解决方案：**
1. 完成生物识别认证
2. 如果认证失败，重试
3. 重启应用
4. 清除应用数据（注意备份）

## 未来增强

计划添加的功能：

- [ ] 密码备用解锁
- [ ] PIN 码解锁
- [ ] 自动锁定超时设置
- [ ] 锁定特定功能（如转账）
- [ ] 失败次数限制
- [ ] 锁定历史记录
- [ ] 多重认证（生物识别 + PIN）
- [ ] 紧急禁用功能
- [ ] 远程锁定（需要后端）

## API 参考

### biometricService.ts

```typescript
// 检查设备支持
isBiometricSupported(): Promise<boolean>

// 检查是否已注册
isBiometricEnrolled(): Promise<boolean>

// 获取支持的类型
getSupportedBiometricTypes(): Promise<string[]>

// 执行认证
authenticateWithBiometric(
  promptMessage?: string
): Promise<{ success: boolean; error?: string }>

// 启用生物识别
enableBiometric(): Promise<boolean>

// 禁用生物识别
disableBiometric(): Promise<void>

// 检查是否已启用
isBiometricEnabled(): Promise<boolean>

// 获取状态
getBiometricStatus(): Promise<{
  supported: boolean;
  enrolled: boolean;
  enabled: boolean;
  types: string[];
}>

// 解锁钱包
unlockWalletWithBiometric(): Promise<{
  success: boolean;
  error?: string;
}>
```

## 相关资源

- [Expo Local Authentication 文档](https://docs.expo.dev/versions/latest/sdk/local-authentication/)
- [iOS Touch ID/Face ID](https://developer.apple.com/documentation/localauthentication)
- [Android BiometricPrompt](https://developer.android.com/training/sign-in/biometric-auth)
- [安全最佳实践](https://owasp.org/www-project-mobile-top-10/)

## 隐私政策

**数据收集：**
- 不收集生物识别数据
- 只存储启用状态（本地）
- 不上传任何数据

**数据使用：**
- 仅用于本地认证
- 不与第三方共享
- 不用于其他目的

**用户权利：**
- 可随时禁用
- 可随时删除数据
- 完全控制权
