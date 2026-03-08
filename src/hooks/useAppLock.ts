import React, { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import * as biometricService from '@/services/biometricService';
import * as storageService from '@/services/storageService';

export default function useAppLock() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    checkAppLock();
  }, []);

  const checkAppLock = async () => {
    try {
      // 检查是否有钱包
      const hasWallet = await storageService.hasWallet();

      if (!hasWallet) {
        // 没有钱包，跳转到导入页面
        if (segments[0] !== 'index') {
          router.replace('/');
        }
        return;
      }

      // 检查生物识别是否启用
      const biometricEnabled = await biometricService.isBiometricEnabled();

      if (biometricEnabled) {
        // 生物识别已启用，检查当前是否在锁定页面
        const isOnLockScreen = segments[0] === 'biometric-lock';

        if (!isOnLockScreen) {
          // 不在锁定页面，跳转到锁定页面
          router.replace('/biometric-lock');
        }
      }
    } catch (error) {
      console.error('Failed to check app lock:', error);
    }
  };
}
