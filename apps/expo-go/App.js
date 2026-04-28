import Constants from 'expo-constants';
import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';

const fallbackUrl = 'https://aswer18400.github.io/QXwap/';

function normalizeUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return fallbackUrl;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export default function App() {
  const webViewRef = useRef(null);
  const defaultUrl = Constants.expoConfig?.extra?.defaultWebUrl || fallbackUrl;
  const [inputUrl, setInputUrl] = useState(defaultUrl);
  const [url, setUrl] = useState(normalizeUrl(defaultUrl));
  const [isLoading, setIsLoading] = useState(true);
  const [canGoBack, setCanGoBack] = useState(false);
  const [lastError, setLastError] = useState('');

  const source = useMemo(() => ({ uri: url }), [url]);

  const openUrl = () => {
    const next = normalizeUrl(inputUrl);
    setLastError('');
    setIsLoading(true);
    setUrl(next);
  };

  const reload = () => {
    setLastError('');
    webViewRef.current?.reload();
  };

  const goBack = () => {
    if (canGoBack) {
      webViewRef.current?.goBack();
    }
  };

  const openExternal = async () => {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert('เปิดลิงก์ไม่ได้', url);
      return;
    }
    await Linking.openURL(url);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'} />
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>QXwap Expo Go</Text>
          <Text style={styles.badge}>Preview</Text>
        </View>
        <Text style={styles.subtitle}>ใช้ทดสอบเว็บ QXwap บนมือถือผ่าน Expo Go</Text>
        <View style={styles.urlRow}>
          <TextInput
            value={inputUrl}
            onChangeText={setInputUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder="https://..."
            style={styles.input}
            returnKeyType="go"
            onSubmitEditing={openUrl}
          />
          <Pressable style={styles.primaryButton} onPress={openUrl}>
            <Text style={styles.primaryButtonText}>เปิด</Text>
          </Pressable>
        </View>
        <View style={styles.actionRow}>
          <Pressable style={[styles.smallButton, !canGoBack && styles.disabledButton]} onPress={goBack} disabled={!canGoBack}>
            <Text style={styles.smallButtonText}>ย้อนกลับ</Text>
          </Pressable>
          <Pressable style={styles.smallButton} onPress={reload}>
            <Text style={styles.smallButtonText}>รีโหลด</Text>
          </Pressable>
          <Pressable style={styles.smallButton} onPress={openExternal}>
            <Text style={styles.smallButtonText}>เปิด Browser</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.webWrap}>
        <WebView
          ref={webViewRef}
          source={source}
          style={styles.webview}
          sharedCookiesEnabled
          thirdPartyCookiesEnabled
          javaScriptEnabled
          domStorageEnabled
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled
          onLoadStart={() => {
            setIsLoading(true);
            setLastError('');
          }}
          onLoadEnd={() => setIsLoading(false)}
          onNavigationStateChange={(navState) => {
            setCanGoBack(navState.canGoBack);
            if (navState.url) {
              setUrl(navState.url);
              setInputUrl(navState.url);
            }
          }}
          onError={(event) => {
            const message = event.nativeEvent.description || 'โหลดเว็บไม่สำเร็จ';
            setLastError(message);
            setIsLoading(false);
          }}
        />
        {isLoading ? (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>กำลังโหลด...</Text>
          </View>
        ) : null}
        {lastError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>โหลดไม่สำเร็จ</Text>
            <Text style={styles.errorText}>{lastError}</Text>
            <Text style={styles.errorHint}>ตรวจว่า API/Pages เปิดอยู่ และมือถืออยู่เครือข่ายที่เข้าถึง URL นี้ได้</Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#111827',
  },
  header: {
    backgroundColor: '#111827',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  badge: {
    color: '#c7d2fe',
    backgroundColor: '#3730a3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '700',
  },
  subtitle: {
    color: '#cbd5e1',
    fontSize: 12,
  },
  urlRow: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 42,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingHorizontal: 12,
    color: '#111827',
  },
  primaryButton: {
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#4f46e5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  smallButton: {
    flex: 1,
    minHeight: 34,
    borderRadius: 10,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.45,
  },
  smallButtonText: {
    color: '#e5e7eb',
    fontSize: 12,
    fontWeight: '700',
  },
  webWrap: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  loadingText: {
    marginTop: 10,
    color: '#111827',
    fontWeight: '700',
  },
  errorBox: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  errorTitle: {
    color: '#991b1b',
    fontWeight: '900',
    marginBottom: 4,
  },
  errorText: {
    color: '#7f1d1d',
    fontWeight: '700',
  },
  errorHint: {
    color: '#7f1d1d',
    fontSize: 12,
    marginTop: 4,
  },
});
