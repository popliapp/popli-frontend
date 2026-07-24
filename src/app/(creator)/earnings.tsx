import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, Platform, ActivityIndicator, Modal, Animated, Easing } from 'react-native';
import { showError, showInfo } from '../../store/toastStore';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  Download,
  Lock,
  Share2,
  FolderDown,
  CheckCircle2,
  X,
  FileText,
} from 'lucide-react-native';
import { useWalletStore } from '../../store/walletStore';
import { formatEarnings } from '../../utils/earnings';

export default function EarningsHistoryScreen() {
  const router = useRouter();
  const {
    totalEarnings,
    viewEarnings,
    giftEarnings,
    referralEarnings,
    referralLockedBalance,
    ledgers,
    fetchWallet,
  } = useWalletStore();

  // Action sheet: choose Download vs Share
  const [isActionSheetOpen, setIsActionSheetOpen] = useState(false);

  // Inline download progress state
  const [isDownloading, setIsDownloading] = useState(false);

  // Success screen state
  const [isSuccessVisible, setIsSuccessVisible] = useState(false);
  const [downloadedFilePath, setDownloadedFilePath] = useState<string | null>(null);
  const [downloadedFileName, setDownloadedFileName] = useState<string>('');

  // Indeterminate progress bar animation
  const progressAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    fetchWallet();
  }, []);

  useEffect(() => {
    if (isDownloading) {
      progressAnim.setValue(0);
      const loop = Animated.loop(
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: false,
        })
      );
      loop.start();
      return () => loop.stop();
    }
  }, [isDownloading]);

  const buildHtml = () => {
    const creditLedgers = ledgers?.filter((l) => l.credit > 0) || [];
    const rows = creditLedgers
      .map((item) => {
        const date = new Date(item.createdAt).toLocaleDateString('en-IN', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        });
        const source = item.description || item.source;
        const amount =
          item.credit < 0.01 && item.credit > 0 ? item.credit.toFixed(4) : item.credit.toFixed(2);
        return `
          <tr>
            <td>${date}</td>
            <td>${source}</td>
            <td style="color: #10B981; text-align: right;">+₹${amount}</td>
          </tr>`;
      })
      .join('');

    return `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            h1 { font-size: 22px; margin-bottom: 4px; }
            p { color: #666; font-size: 13px; margin-bottom: 24px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
            th { background: #f3f4f6; text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; color: #666; }
            td { padding: 10px 12px; border-bottom: 1px solid #eee; }
            .summary { margin-top: 24px; background: #f9fafb; border-radius: 8px; padding: 16px; }
            .summary-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; }
            .summary-row.total { font-weight: bold; font-size: 15px; border-top: 1px solid #ddd; margin-top: 8px; padding-top: 12px; }
          </style>
        </head>
        <body>
          <h1>Earnings History</h1>
          <p>Generated on ${new Date().toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}</p>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Source</th>
                <th style="text-align: right;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="3" style="text-align:center; color:#999;">No transactions found</td></tr>'}
            </tbody>
          </table>
          <div class="summary">
          <div class="summary-row"><span>View Earnings</span><span>${formatEarnings(viewEarnings)}</span></div>
            <div class="summary-row"><span>Gift Earnings</span><span>${formatEarnings(giftEarnings)}</span></div>
            <div class="summary-row"><span>Referral Earnings</span><span>${formatEarnings(referralEarnings)}</span></div>
            <div class="summary-row total"><span>Lifetime Total</span><span>${formatEarnings(totalEarnings)}</span></div>
          </div>
        </body>
      </html>`;
  };

  const openActionSheet = () => {
    if (isDownloading) return; // prevent triggering a new action while one is running
    setIsActionSheetOpen(true);
  };

  const handleDownloadToDevice = async () => {
    if (isDownloading) return; // guard against duplicate requests
    setIsActionSheetOpen(false);
    setIsDownloading(true);
    try {
      const html = buildHtml();
      const { uri } = await Print.printToFileAsync({ html });
      const fileName = `Popli_Earnings_${Date.now()}.pdf`;

      if (Platform.OS === 'android') {
        const downloadPath = `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${fileName}`;
        const sourcePath = uri.replace('file://', '');

        await ReactNativeBlobUtil.fs.cp(sourcePath, downloadPath);

        await ReactNativeBlobUtil.android.addCompleteDownload({
          title: fileName,
          description: 'Popli Earnings PDF',
          mime: 'application/pdf',
          path: downloadPath,
          showNotification: true,
        });

        setDownloadedFilePath(downloadPath);
        setDownloadedFileName(fileName);
        setIsSuccessVisible(true);
      } else {
        // iOS sandbox has no direct Downloads folder — use the share sheet's
        // "Save to Files" as the closest equivalent to a device download.
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Save Earnings PDF',
          UTI: 'com.adobe.pdf',
        });
        setDownloadedFilePath(null);
        setDownloadedFileName(fileName);
        setIsSuccessVisible(true);
      }
    } catch (e) {
      showError('Could not download the PDF. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async () => {
    setIsActionSheetOpen(false);
    try {
      const html = buildHtml();
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Share Earnings PDF',
      });
    } catch (e) {
      showError('Could not share the PDF. Please try again.');
    }
  };

  const handleViewFile = async () => {
    try {
      if (Platform.OS === 'android' && downloadedFilePath) {
        await ReactNativeBlobUtil.android.actionViewIntent(downloadedFilePath, 'application/pdf');
      }
    } catch (e) {
      showError('Could not open the file.');
    } finally {
      setIsSuccessVisible(false);
    }
  };

  const closeSuccess = () => {
    setIsSuccessVisible(false);
    setDownloadedFilePath(null);
    setDownloadedFileName('');
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: ['10%', '70%', '10%'],
  });

  const HistoryRow = ({ date, amount, source }: any) => (
    <View className="flex-row items-center justify-between border-b border-white/5 py-4 gap-2">
      <View className="flex-1 pr-2">
        <Text className="text-white font-bold text-sm" numberOfLines={2}>{source}</Text>
        <Text className="text-neutral-grey text-[10px] mt-1">{date}</Text>
      </View>
      <Text className="text-[#10B981] font-bold text-base shrink-0">+{amount}</Text>
    </View>
  );

  return (
    <View className="flex-1 bg-[#12081E] pt-14">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pb-6 border-b border-white/5">
        <View className="flex-row items-center">
          <Pressable onPress={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft size={20} color="#FFFFFF" />
          </Pressable>
          <Text className="text-white font-bold text-base ml-2">Earnings History</Text>
        </View>
        <Pressable
          onPress={openActionSheet}
          disabled={isDownloading}
          className="bg-[#3B82F6]/20 p-2 rounded-full border border-[#3B82F6]/30"
          style={{ opacity: isDownloading ? 0.5 : 1 }}
        >
          {isDownloading ? (
            <ActivityIndicator size="small" color="#3B82F6" />
          ) : (
            <Download size={16} color="#3B82F6" />
          )}
        </Pressable>
      </View>

      {/* Inline download progress bar, shown right below the header/download button */}
      {isDownloading && (
        <View className="px-4 pt-3">
          <View className="flex-row items-center gap-2 mb-2">
            <FileText size={14} color="#3B82F6" />
            <Text className="text-[#3B82F6] text-xs font-bold">Preparing your PDF...</Text>
          </View>
          <View className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
            <Animated.View
              style={{
                height: '100%',
                width: progressWidth,
                backgroundColor: '#3B82F6',
                borderRadius: 999,
              }}
            />
          </View>
        </View>
      )}

      <ScrollView
        className="flex-1 px-4 py-6"
        contentContainerStyle={{ gap: 24, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-[#1A0E2C] border border-white/5 rounded-3xl p-6 gap-6">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-neutral-grey text-xs font-medium">Lifetime Earnings</Text>
            <Text className="text-white text-3xl font-black mt-1">{formatEarnings(totalEarnings)}</Text>
            </View>
            <View className="w-12 h-12 rounded-full bg-[#3B82F6]/10 items-center justify-center border border-[#3B82F6]/20">
              <TrendingUp size={24} color="#3B82F6" />
            </View>
          </View>

          {referralLockedBalance > 0 && (
            <View className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded-2xl p-4">
              <View className="flex-row items-center gap-2">
                <Lock size={14} color="#F59E0B" />
              <Text className="text-[#F59E0B] text-xs font-bold">
                  {formatEarnings(referralLockedBalance)} locked
                </Text>
              </View>
              <Text className="text-neutral-grey text-[10px] mt-1">
                Complete 1 reel + KYC (both you and your referral partner) to unlock this amount for withdrawal.
              </Text>
            </View>
          )}

          <View className="flex-row gap-4 border-t border-white/5 pt-4">
            <View className="flex-1">
              <Text className="text-neutral-grey text-[10px] uppercase">Views</Text>
            <Text className="text-white font-bold mt-1">{formatEarnings(viewEarnings)}</Text>
            </View>
            <View className="flex-1 border-l border-white/5 pl-4">
              <Text className="text-neutral-grey text-[10px] uppercase">Gifts</Text>
            <Text className="text-white font-bold mt-1">{formatEarnings(giftEarnings)}</Text>
            </View>
            <View className="flex-1 border-l border-white/5 pl-4">
              <Text className="text-neutral-grey text-[10px] uppercase">Referrals</Text>
          <Text className="text-white font-bold mt-1">{formatEarnings(referralEarnings)}</Text>
            </View>
          </View>
        </View>

        <View className="gap-4">
          <Text className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Recent Transactions</Text>
          <View className="bg-[#1A0E2C] border border-white/5 rounded-3xl px-4">
            {ledgers && ledgers.filter((l) => l.credit > 0).length > 0 ? (
              ledgers.filter((l) => l.credit > 0).map((item) => (
                <HistoryRow
                  key={item.id}
                  source={item.description || item.source}
                 amount={formatEarnings(item.credit)}
                  date={new Date(item.createdAt).toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                />
              ))
            ) : (
              <View className="py-12 items-center justify-center opacity-50">
                <Calendar size={32} color="#9CA3AF" />
                <Text className="text-white font-medium mt-4">No earnings yet</Text>
                <Text className="text-neutral-grey text-xs mt-2 text-center px-8">
                  When you start earning from your content, your transaction history will appear here.
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* Action Sheet: Download to Device vs Share */}
      <Modal
        visible={isActionSheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setIsActionSheetOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/50"
          onPress={() => setIsActionSheetOpen(false)}
        />
        <View className="bg-[#1A0E2C] rounded-t-3xl px-5 pt-4 pb-10 border-t border-white/5">
          <View className="w-12 h-1 bg-white/20 rounded-full self-center mb-6" />
          <Text className="text-white font-bold text-lg mb-1">Export Earnings PDF</Text>
          <Text className="text-neutral-grey text-xs mb-4">Choose how you'd like to get your report</Text>

          <Pressable
            onPress={handleDownloadToDevice}
            className="flex-row items-center gap-4 py-4 border-b border-white/5 active:opacity-70"
          >
            <View className="w-12 h-12 rounded-full bg-[#3B82F6]/20 items-center justify-center">
              <FolderDown size={22} color="#3B82F6" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-base">Download to Device</Text>
              <Text className="text-white/50 text-xs mt-0.5">
                {Platform.OS === 'android'
                  ? 'Saves directly to your Downloads folder'
                  : 'Save a copy to your Files app'}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={handleShare}
            className="flex-row items-center gap-4 py-4 active:opacity-70"
          >
            <View className="w-12 h-12 rounded-full bg-[#A855F7]/20 items-center justify-center">
              <Share2 size={22} color="#A855F7" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-base">Share</Text>
              <Text className="text-white/50 text-xs mt-0.5">Send via WhatsApp, Email, or other apps</Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => setIsActionSheetOpen(false)}
            className="mt-2 py-3 items-center rounded-full bg-white/5"
          >
            <Text className="text-white/70 font-bold text-sm">Cancel</Text>
          </Pressable>
        </View>
      </Modal>

      {/* Success state */}
      <Modal
        visible={isSuccessVisible}
        transparent
        animationType="fade"
        onRequestClose={closeSuccess}
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="w-full bg-[#1A0E2C] rounded-3xl p-6 border border-white/10">
            <Pressable onPress={closeSuccess} className="self-end p-1 -mr-1 -mt-1" hitSlop={8}>
              <X size={18} color="#6B7280" />
            </Pressable>

            <View className="items-center mb-4">
              <View className="w-16 h-16 rounded-full bg-[#10B981]/15 items-center justify-center mb-4">
                <CheckCircle2 size={34} color="#10B981" />
              </View>
              <Text className="text-white font-bold text-lg text-center">
                Your file has been downloaded successfully.
              </Text>
              <Text className="text-neutral-grey text-sm text-center mt-2 leading-5">
                {Platform.OS === 'android'
                  ? 'It has been saved to your Downloads folder and is ready to view.'
                  : 'It has been saved and is ready to view in your Files app.'}
              </Text>
              {downloadedFileName ? (
                <Text className="text-white/40 text-xs mt-3" numberOfLines={1}>
                  {downloadedFileName}
                </Text>
              ) : null}
            </View>

            <View className="gap-3 mt-2">
              {Platform.OS === 'android' && downloadedFilePath ? (
                <Pressable
                  onPress={handleViewFile}
                  className="py-4 rounded-full items-center justify-center bg-[#3B82F6]"
                >
                  <Text className="text-white font-bold text-base">View File</Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={closeSuccess}
                className="py-4 rounded-full items-center justify-center bg-white/5 border border-white/10"
              >
                <Text className="text-white/80 font-bold text-base">Done</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}