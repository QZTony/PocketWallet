# 退出登录流程修复说明

## 问题描述
退出登录后显示空白主页，没有正确跳转到导入页面。

## 根本原因
1. `hasWallet()` 函数只检查单个 publicKey，不支持多钱包系统
2. `initializeWallet()` 在没有钱包时跳转，但 finally 块仍会设置 loading=false，导致显示空白页
3. 没有检查 publicKey 状态，可能渲染空白内容

## 修复内容

### 1. 更新 `storageService.ts` - `hasWallet()` 函数
```typescript
export async function hasWallet(): Promise<boolean> {
  const list = await getWalletList();
  if (list.length > 0) return true;

  // 兼容旧版本：检查是否有旧的单钱包数据
  const publicKey = await getPublicKey();
  return publicKey !== null;
}
```
- 现在优先检查钱包列表
- 支持多钱包系统
- 向后兼容旧的单钱包数据

### 2. 更新 `(tabs)/index.tsx` - 退出登录逻辑
```typescript
const handleLogout = () => {
  Alert.alert(t('home.logout'), t('home.logoutConfirm'), [
    { text: t('common.cancel'), style: 'cancel' },
    {
      text: t('home.logout'),
      style: 'destructive',
      onPress: async () => {
        try {
          // 清除所有钱包数据
          await storageService.clearWalletData();

          // 重置所有状态
          setPublicKey('');
          setTokens([]);
          setNfts([]);
          setTotalUsd(0);
          setTotalChange(0);
          setCurrentWalletName('');

          // 清除导航堆栈并跳转
          router.dismissAll();
          router.replace('/');
        } catch (error) {
          console.error('Logout failed:', error);
          router.dismissAll();
          router.replace('/');
        }
      }
    },
  ]);
};
```
- 清除所有钱包数据
- 重置所有页面状态
- 使用 `router.dismissAll()` 清除导航堆栈
- 跳转到导入页面

### 3. 更新 `(tabs)/index.tsx` - `initializeWallet()` 函数
```typescript
const initializeWallet = useCallback(async () => {
  try {
    setLoading(true);
    await loadSavedNetwork();
    setCurrentNetwork(getNetwork());
    const wallet = await walletService.restoreWallet();

    if (!wallet) {
      // 没有钱包，跳转到导入页面，保持 loading 状态
      router.replace('/');
      return;
    }

    // ... 加载钱包数据 ...

    setLoading(false);
  } catch (error) {
    console.error('Failed to initialize wallet:', error);
    setLoading(false);
  }
}, []);
```
- 移除 finally 块
- 只在成功加载或出错时设置 loading=false
- 跳转时保持 loading 状态，避免显示空白页

### 4. 添加 publicKey 检查
```typescript
if (loading) {
  return <View style={styles.loadingContainer}><ActivityIndicator /></View>;
}

// 如果没有 publicKey，说明没有钱包，跳转到导入页面
if (!publicKey) {
  router.replace('/');
  return <View style={styles.loadingContainer}><ActivityIndicator /></View>;
}
```
- 在渲染前检查 publicKey
- 如果没有 publicKey，跳转并显示 loading

### 5. 更新 `index.tsx` - 使用 `useFocusEffect`
```typescript
useFocusEffect(
  React.useCallback(() => {
    checkExistingWallet();
  }, [])
);
```
- 每次页面获得焦点时重新检查钱包状态
- 确保退出登录后能正确显示导入界面

## 测试步骤
1. 登录钱包
2. 点击菜单 -> 退出登录
3. 确认退出
4. 应该看到导入钱包页面（不是空白页）

## 预期结果
- ✅ 退出登录后正确跳转到导入页面
- ✅ 不显示空白页面
- ✅ 导入页面正常显示导入/生成钱包选项
- ✅ 所有状态正确清除
