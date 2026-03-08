import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TextInput, Button, Text } from 'react-native-paper';
import { PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as walletService from '@/services/walletService';
import { getConnection } from '@/constants/config';
import { colors } from '@/constants/theme';
import { useI18n } from '@/i18n/context';

export default function Send() {
  const { t } = useI18n();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [tokenMint, setTokenMint] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendSOL = async () => {
    if (!recipient || !amount) {
      Alert.alert(t('common.error'), t('send.fillAllFields'));
      return;
    }

    try {
      setLoading(true);
      const wallet = await walletService.restoreWallet();

      if (!wallet) {
        Alert.alert(t('common.error'), t('send.walletNotFound'));
        return;
      }

      const recipientPubkey = new PublicKey(recipient);
      const lamports = parseFloat(amount) * LAMPORTS_PER_SOL;

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: wallet.publicKey,
          toPubkey: recipientPubkey,
          lamports,
        })
      );

      const signature = await getConnection().sendTransaction(transaction, [
        { publicKey: wallet.publicKey, secretKey: wallet.secretKey } as any,
      ]);

      await getConnection().confirmTransaction(signature, 'confirmed');

      Alert.alert(t('common.success'), `${t('send.txSent')}\nSignature: ${signature.slice(0, 8)}...`);
      setRecipient('');
      setAmount('');
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('send.sendTxFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSendToken = async () => {
    if (!recipient || !amount || !tokenMint) {
      Alert.alert(t('common.error'), t('send.fillAllFields'));
      return;
    }

    try {
      setLoading(true);
      const wallet = await walletService.restoreWallet();

      if (!wallet) {
        Alert.alert(t('common.error'), t('send.walletNotFound'));
        return;
      }

      const recipientPubkey = new PublicKey(recipient);
      const mintPubkey = new PublicKey(tokenMint);

      const fromTokenAccount = await getAssociatedTokenAddress(
        mintPubkey,
        wallet.publicKey
      );

      const toTokenAccount = await getAssociatedTokenAddress(
        mintPubkey,
        recipientPubkey
      );

      const tokenAmount = parseFloat(amount) * 1e9; // 假设 9 位小数

      const transaction = new Transaction().add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          wallet.publicKey,
          tokenAmount,
          [],
          TOKEN_PROGRAM_ID
        )
      );

      const signature = await getConnection().sendTransaction(transaction, [
        { publicKey: wallet.publicKey, secretKey: wallet.secretKey } as any,
      ]);

      await getConnection().confirmTransaction(signature, 'confirmed');

      Alert.alert(t('common.success'), `${t('send.tokenSent')}\nSignature: ${signature.slice(0, 8)}...`);
      setRecipient('');
      setAmount('');
      setTokenMint('');
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('send.sendTokenFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text variant="titleLarge" style={styles.title}>
          {t('send.title')}
        </Text>

        <TextInput
          label={t('send.recipientAddress')}
          value={recipient}
          onChangeText={setRecipient}
          mode="outlined"
          style={styles.input}
          placeholder={t('send.recipientPlaceholder')}
          textColor={colors.text}
          placeholderTextColor={colors.textTertiary}
          outlineColor={colors.inputBorder}
          activeOutlineColor={colors.accent}
        />

        <TextInput
          label={t('send.amount')}
          value={amount}
          onChangeText={setAmount}
          mode="outlined"
          keyboardType="decimal-pad"
          style={styles.input}
          placeholder="0.0"
          textColor={colors.text}
          placeholderTextColor={colors.textTertiary}
          outlineColor={colors.inputBorder}
          activeOutlineColor={colors.accent}
        />

        <Button
          mode="contained"
          onPress={handleSendSOL}
          loading={loading}
          disabled={loading}
          style={styles.button}
          buttonColor={colors.buttonPrimary}
          textColor={colors.buttonPrimaryText}
        >
          {t('send.sendSol')}
        </Button>

        <View style={styles.divider} />

        <Text variant="titleMedium" style={styles.subtitle}>
          {t('send.sendSplToken')}
        </Text>

        <TextInput
          label={t('send.tokenMintAddress')}
          value={tokenMint}
          onChangeText={setTokenMint}
          mode="outlined"
          style={styles.input}
          placeholder={t('send.tokenMintPlaceholder')}
          textColor={colors.text}
          placeholderTextColor={colors.textTertiary}
          outlineColor={colors.inputBorder}
          activeOutlineColor={colors.accent}
        />

        <Button
          mode="contained"
          onPress={handleSendToken}
          loading={loading}
          disabled={loading}
          style={styles.button}
          buttonColor={colors.buttonPrimary}
          textColor={colors.buttonPrimaryText}
        >
          {t('send.sendToken')}
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: 20,
  },
  title: {
    marginBottom: 24,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    marginBottom: 16,
    fontWeight: '600',
    color: colors.text,
  },
  input: {
    marginBottom: 16,
    backgroundColor: colors.bgSecondary,
  },
  button: {
    marginTop: 8,
    borderRadius: 12,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: 32,
  },
});
