import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput as RNTextInput, useWindowDimensions } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { WebView } from 'react-native-webview';
import { useI18n } from '@/i18n/context';
import { colors } from '@/constants/theme';

const BOOKMARKS = [
  { name: 'Jupiter', url: 'https://jup.ag', icon: 'swap-horizontal-circle' },
  { name: 'Raydium', url: 'https://raydium.io', icon: 'water' },
  { name: 'Magic Eden', url: 'https://magiceden.io', icon: 'diamond-stone' },
  { name: 'Marinade', url: 'https://marinade.finance', icon: 'waves' },
  { name: 'Tensor', url: 'https://tensor.trade', icon: 'chart-line' },
  { name: 'Solscan', url: 'https://solscan.io', icon: 'magnify' },
];

const GRID_GAP = 14;
const COLUMNS = 3;

export default function Browser() {
  const { t } = useI18n();
  const { width: screenWidth } = useWindowDimensions();
  const itemWidth = Math.floor((screenWidth - GRID_GAP * (COLUMNS + 1)) / COLUMNS);
  const [url, setUrl] = useState('');
  const [currentUrl, setCurrentUrl] = useState('');
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const webviewRef = useRef<WebView>(null);

  const navigate = (targetUrl: string) => {
    let finalUrl = targetUrl;
    if (!finalUrl.startsWith('http')) finalUrl = 'https://' + finalUrl;
    setCurrentUrl(finalUrl);
    setUrl(finalUrl);
  };

  if (!currentUrl) {
    return (
      <View style={styles.container}>
        <View style={styles.homeHeader}>
          <Text style={styles.homeTitle}>{t('browser.title')}</Text>
          <Text style={styles.homeSubtitle}>{t('browser.subtitle')}</Text>
        </View>

        <View style={styles.searchBarContainer}>
          <IconButton icon="magnify" size={20} iconColor={colors.textTertiary} style={{ margin: 0 }} />
          <RNTextInput
            style={styles.searchInput}
            placeholder={t('browser.searchPlaceholder')}
            placeholderTextColor={colors.textTertiary}
            value={url}
            onChangeText={setUrl}
            onSubmitEditing={() => navigate(url)}
            returnKeyType="go"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <Text style={styles.bookmarksTitle}>{t('browser.popularDapps')}</Text>
        <View style={styles.bookmarksGrid}>
          {BOOKMARKS.map((bm) => (
            <TouchableOpacity
              key={bm.name}
              style={[styles.bookmarkItem, { width: itemWidth }]}
              onPress={() => navigate(bm.url)}
              activeOpacity={0.7}
            >
              <View style={styles.bookmarkIcon}>
                <IconButton icon={bm.icon} size={24} iconColor={colors.accent} style={{ margin: 0 }} />
              </View>
              <Text style={styles.bookmarkName} numberOfLines={1}>{bm.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <View style={styles.urlBarContainer}>
          <IconButton
            icon="arrow-left"
            size={20}
            iconColor={canGoBack ? colors.text : colors.textTertiary}
            onPress={() => webviewRef.current?.goBack()}
            disabled={!canGoBack}
            style={{ margin: 0 }}
          />
          <IconButton
            icon="arrow-right"
            size={20}
            iconColor={canGoForward ? colors.text : colors.textTertiary}
            onPress={() => webviewRef.current?.goForward()}
            disabled={!canGoForward}
            style={{ margin: 0 }}
          />
          <View style={styles.urlInputWrapper}>
            <RNTextInput
              style={styles.urlInput}
              value={url}
              onChangeText={setUrl}
              onSubmitEditing={() => navigate(url)}
              returnKeyType="go"
              autoCapitalize="none"
              autoCorrect={false}
              selectTextOnFocus
            />
          </View>
          <IconButton
            icon={isLoading ? 'close' : 'refresh'}
            size={20}
            iconColor={colors.textSecondary}
            onPress={() => {
              if (isLoading) webviewRef.current?.stopLoading();
              else webviewRef.current?.reload();
            }}
            style={{ margin: 0 }}
          />
          <IconButton
            icon="home"
            size={20}
            iconColor={colors.textSecondary}
            onPress={() => { setCurrentUrl(''); setUrl(''); }}
            style={{ margin: 0 }}
          />
        </View>
      </View>

      <WebView
        ref={webviewRef}
        source={{ uri: currentUrl }}
        style={styles.webview}
        onNavigationStateChange={(navState) => {
          setCanGoBack(navState.canGoBack);
          setCanGoForward(navState.canGoForward);
          if (navState.url) setUrl(navState.url);
        }}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        javaScriptEnabled
        domStorageEnabled
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    paddingTop: 48,
  },
  homeHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  homeTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text,
  },
  homeSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    backgroundColor: colors.bgSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    paddingHorizontal: 8,
    height: 46,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 0,
  },
  bookmarksTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    paddingHorizontal: 20,
    marginTop: 28,
    marginBottom: 16,
  },
  bookmarksGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: GRID_GAP,
    gap: GRID_GAP,
  },
  bookmarkItem: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: colors.bgSecondary,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  bookmarkIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.accentDim,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  bookmarkName: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  toolbar: {
    backgroundColor: colors.bg,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  urlBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    gap: 2,
  },
  urlInputWrapper: {
    flex: 1,
    backgroundColor: colors.bgSecondary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  urlInput: {
    fontSize: 13,
    color: colors.text,
    paddingVertical: 0,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
