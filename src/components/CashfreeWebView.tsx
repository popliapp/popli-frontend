import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, Text, View, Linking, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface CashfreeWebViewProps {
  isVisible: boolean;
  paymentSessionId: string;
  environment?: 'sandbox' | 'production';
  onSuccess: (data: any) => void;
  onFailed: (data: any) => void;
  onClose: () => void;
}

export const CashfreeWebView: React.FC<CashfreeWebViewProps> = ({
  isVisible,
  paymentSessionId,
  environment = 'sandbox',
  onSuccess,
  onFailed,
  onClose,
}) => {
  const insets = useSafeAreaInsets();

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>Popli Payment</title>
      <script src="https://sdk.cashfree.com/js/v3/cashfree.js"></script>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body, html {
          width: 100%; height: 100%;
          display: flex; justify-content: center; align-items: center;
          background: #f8fafc; font-family: -apple-system, sans-serif;
        }
        .loader-wrap { display: flex; flex-direction: column; align-items: center; gap: 16px; }
        .loader {
          border: 3px solid #e2e8f0;
          border-top: 3px solid #A855F7;
          border-radius: 50%; width: 40px; height: 40px;
          animation: spin 0.9s linear infinite;
        }
        .loader-text { color: #64748b; font-size: 14px; }
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <div class="loader-wrap">
        <div class="loader"></div>
        <div class="loader-text">Opening Cashfree Payment Gateway...</div>
      </div>
      <script>
        window.addEventListener('load', function() {
          try {
            const cashfree = Cashfree({ mode: "${environment}" });
            cashfree.checkout({
              paymentSessionId: "${paymentSessionId}",
              redirectTarget: "_self" // Render within the WebView
            }).then(function (result) {
              if (result.error) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'FAILED', data: result.error.message }));
              }
              if (result.paymentDetails) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SUCCESS', data: result.paymentDetails }));
              }
            });
          } catch (e) {
             window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'FAILED', data: 'Failed to load Cashfree' }));
          }
        });
      </script>
    </body>
    </html>
  `;

  const handleMessage = (event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'SUCCESS') onSuccess(msg.data);
      else if (msg.type === 'FAILED') onFailed(msg.data);
      else if (msg.type === 'DISMISS') onClose();
    } catch {}
  };

  const webviewRef = React.useRef<WebView>(null);

  const handleCustomUrl = (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('about:')) return;

    let targetUrl = url;

    // React Native Linking doesn't natively parse "intent://" URLs.
    // We must convert "intent://pay?pa=...#Intent;scheme=upi;package=com.phonepe.app;end"
    // into "upi://pay?pa=..." so that the phone can open it.
    if (url.startsWith('intent://')) {
      const schemeMatch = url.match(/scheme=([^;]+)/);
      const scheme = schemeMatch && schemeMatch[1] ? schemeMatch[1] : 'upi';
      targetUrl = url.replace('intent://', `${scheme}://`).split('#Intent')[0];
    }

    Linking.openURL(targetUrl).catch(() => {
      console.log('Cannot open URL scheme, redirecting to PlayStore:', targetUrl);
      
      let playStoreUrl = '';
      if (url.startsWith('intent://') && url.includes('package=')) {
        const pkgMatch = url.match(/package=([^;]+)/);
        if (pkgMatch && pkgMatch[1]) {
          playStoreUrl = `market://details?id=${pkgMatch[1]}`;
        }
      } else if (targetUrl.startsWith('phonepe://')) {
        playStoreUrl = 'market://details?id=com.phonepe.app';
      } else if (targetUrl.startsWith('gpay://') || targetUrl.startsWith('tez://')) {
        playStoreUrl = 'market://details?id=com.google.android.apps.nbu.paisa.user';
      } else if (targetUrl.startsWith('paytmmp://') || targetUrl.startsWith('paytm://')) {
        playStoreUrl = 'market://details?id=net.one97.paytm';
      } else if (targetUrl.startsWith('bhim://')) {
        playStoreUrl = 'market://details?id=in.org.npci.upiapp';
      }
      
      if (playStoreUrl) {
        Linking.openURL(playStoreUrl).catch(e => {
          Linking.openURL(playStoreUrl.replace('market://details?id=', 'https://play.google.com/store/apps/details?id='));
        });
      } else if (targetUrl.startsWith('upi://')) {
         Linking.openURL('https://play.google.com/store/search?q=upi&c=apps');
      }
    });
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <WebView
          ref={webviewRef}
          source={{ html: htmlContent }}
          originWhitelist={['*']}
          onMessage={handleMessage}
          onShouldStartLoadWithRequest={(request) => {
            const url = request.url;
            if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('about:')) {
              return true;
            }
            handleCustomUrl(url);
            return false;
          }}
          onNavigationStateChange={(navState) => {
            if (navState.url.includes('popli.app')) {
              onSuccess({ orderId: 'redirected' });
            }
            if (!navState.url.startsWith('http://') && !navState.url.startsWith('https://') && !navState.url.startsWith('about:')) {
              webviewRef.current?.stopLoading();
              handleCustomUrl(navState.url);
            }
          }}
          style={styles.webview}
          javaScriptEnabled
          domStorageEnabled
          startInLoadingState
          allowsInlineMediaPlayback
          userAgent={Platform.OS === 'android' ? 'Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Mobile Safari/537.36' : undefined}
        />
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.cancelText}>Cancel Payment</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
  },
  footer: {
    backgroundColor: '#ffffff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e2e8f0',
    paddingTop: 12,
    paddingHorizontal: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  cancelBtn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fee2e2',
    backgroundColor: '#fff5f5',
  },
  cancelText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '600',
  },
});
