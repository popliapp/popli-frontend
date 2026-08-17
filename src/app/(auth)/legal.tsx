import { useLocalSearchParams, useRouter } from 'expo-router';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const LEGAL_URLS: Record<string, string> = {
  terms: 'http://192.168.1.5:5173/terms',
  privacy: 'http://192.168.1.5:5173/privacy',
  guidelines: 'http://192.168.1.5:5173/guidelines',
};

const LEGAL_TITLES: Record<string, string> = {
  terms: 'Terms of Service',
  privacy: 'Privacy Policy',
  guidelines: 'Community Guidelines',
};

export default function LegalScreen() {
  const { type } = useLocalSearchParams<{ type: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const url = LEGAL_URLS[type] ?? LEGAL_URLS.terms;
  const title = LEGAL_TITLES[type] ?? 'Legal';

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>{title}</Text>
        <View style={{ width: 36 }} />
      </View>
      <WebView
        source={{ uri: url }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0D0015' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 12,
    paddingTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { color: 'rgba(255,255,255,0.8)', fontSize: 18 },
  topBarTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  webview: { flex: 1 },
});