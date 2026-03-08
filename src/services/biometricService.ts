import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

/**
 * 生物识别服务
 * 处理指纹、面部识别等生物识别功能
 */

const BIOMETRIC_ENABLED_KEY = 'biometric_enabled';
const BIOMETRIC_SETUP_KEY = 'biometric_setup_complete';

// 检查设备是否支持生物识别
export async function isBiometricSupported(): Promise<boolean> {
  try {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    return compatible;
  } catch (error) {
    console.error('Failed to check biometric support:', error);
    return false;
  }
}

// 检查是否已注册生物识别
export async function isBiometricEnrolled(): Promise<boolean> {
  try {
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    return enrolled;
  } catch (error) {
    console.error('Failed to check biometric enrollment:', error);
    return false;
  }
}

// 获取支持的生物识别类型
export async function getSupportedBiometricTypes(): Promise<string[]> {
  try {
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const typeNames: string[] = [];

    types.forEach((type) => {
      switch (type) {
        case LocalAuthentication.AuthenticationType.FINGERPRINT:
          typeNames.push('Fingerprint');
          break;
        case LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION:
          typeNames.push('Face ID');
          break;
        case LocalAuthentication.AuthenticationType.IRIS:
          typeNames.push('Iris');
          break;
      }
    });

    return typeNames;
  } catch (error) {
    console.error('Failed to get biometric types:', error);
    return [];
  }
}

// 执行生物识别认证
export async function authenticateWithBiometric(
  promptMessage: string = 'Authenticate to access your wallet'
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      disableDeviceFallback: false,
      fallbackLabel: 'Use Passcode',
    });

    if (result.success) {
      return { success: true };
    } else {
      return {
        success: false,
        error: result.error || 'Authentication failed',
      };
    }
  } catch (error: any) {
    console.error('Biometric authentication error:', error);
    return {
      success: false,
      error: error.message || 'Authentication error',
    };
  }
}

// 启用生物识别
export async function enableBiometric(): Promise<boolean> {
  try {
    // 检查支持和注册状态
    const supported = await isBiometricSupported();
    if (!supported) {
      throw new Error('Biometric authentication is not supported on this device');
    }

    const enrolled = await isBiometricEnrolled();
    if (!enrolled) {
      throw new Error('No biometric credentials enrolled on this device');
    }

    // 执行一次认证以确认
    const result = await authenticateWithBiometric('Enable biometric unlock');

    if (result.success) {
      await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
      await SecureStore.setItemAsync(BIOMETRIC_SETUP_KEY, 'true');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Failed to enable biometric:', error);
    throw error;
  }
}

// 禁用生物识别
export async function disableBiometric(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY);
  } catch (error) {
    console.error('Failed to disable biometric:', error);
    throw error;
  }
}

// 检查生物识别是否已启用
export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const enabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    return enabled === 'true';
  } catch (error) {
    console.error('Failed to check biometric status:', error);
    return false;
  }
}

// 检查是否已完成生物识别设置
export async function isBiometricSetupComplete(): Promise<boolean> {
  try {
    const setup = await SecureStore.getItemAsync(BIOMETRIC_SETUP_KEY);
    return setup === 'true';
  } catch (error) {
    console.error('Failed to check biometric setup:', error);
    return false;
  }
}

// 标记生物识别设置完成（用户选择跳过）
export async function markBiometricSetupComplete(): Promise<void> {
  try {
    await SecureStore.setItemAsync(BIOMETRIC_SETUP_KEY, 'true');
  } catch (error) {
    console.error('Failed to mark biometric setup complete:', error);
    throw error;
  }
}

// 获取生物识别状态信息
export async function getBiometricStatus(): Promise<{
  supported: boolean;
  enrolled: boolean;
  enabled: boolean;
  types: string[];
}> {
  const supported = await isBiometricSupported();
  const enrolled = await isBiometricEnrolled();
  const enabled = await isBiometricEnabled();
  const types = await getSupportedBiometricTypes();

  return {
    supported,
    enrolled,
    enabled,
    types,
  };
}

// 验证并解锁钱包
export async function unlockWalletWithBiometric(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const enabled = await isBiometricEnabled();

    if (!enabled) {
      return {
        success: false,
        error: 'Biometric authentication is not enabled',
      };
    }

    const result = await authenticateWithBiometric('Unlock your wallet');

    return result;
  } catch (error: any) {
    console.error('Failed to unlock wallet:', error);
    return {
      success: false,
      error: error.message || 'Failed to unlock wallet',
    };
  }
}
