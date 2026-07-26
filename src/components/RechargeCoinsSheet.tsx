import React, { useState } from 'react';
import { View, Text, Pressable, Modal, Dimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showSuccess, showError } from '../store/toastStore';
import { X, Lock, Zap, Coins } from 'lucide-react-native';
import { useWalletStore } from '../store';
import { useSystemConfig } from '../hooks/useSystemConfig';
import { RazorpayWebView } from './RazorpayWebView';
import { walletApi } from '../api/services';
import { useAuthStore } from '../store/authStore';

interface RechargeCoinsSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (coins: number) => void;
}

const { width } = Dimensions.get('window');

type Step = 'idle' | 'creating_order' | 'payment_open' | 'verifying';

export default function RechargeCoinsSheet({ visible, onClose, onSuccess }: RechargeCoinsSheetProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('idle');
  const [showConfirm, setShowConfirm] = useState(false);
  const [razorpayOptions, setRazorpayOptions] = useState<any>(null);
  const [confirming, setConfirming] = useState(false);
  const insets = useSafeAreaInsets();
const { config, loading } = useSystemConfig();
  const coinPackages = config?.coinPackages ?? [];

  const selected = coinPackages.find(p => p.id === selectedId);
  const totalCoins = selected ? selected.coins + selected.bonusCoins : 0;
  const isProcessing = step !== 'idle';

const rateLabel = coinPackages.length > 0
    ? Math.round(coinPackages[0].coins / coinPackages[0].priceInr)
    : null;
  const stepLabel = () => {
    if (step === 'creating_order') return 'Creating order...';
    if (step === 'payment_open') return 'Processing...';
    if (step === 'verifying') return 'Verifying payment...';
    if (selected) return `Pay Rs.${selected.priceInr.toFixed(2)} - Get ${totalCoins.toLocaleString()} Coins`;
    return 'Select a Pack';
  };

  const handleConfirmPay = async () => {
    if (!selected || step !== 'idle' || confirming) return;
    setConfirming(true);
    setShowConfirm(false);
    setStep('creating_order');

    try {
      console.log('[RECHARGE] calling createRechargeOrder for package:', selected.id);
      const orderRes = await walletApi.createRechargeOrder(selected.id);
      console.log('[RECHARGE] order success:', JSON.stringify(orderRes.data));

      const userProfile = useAuthStore.getState().userProfile;
      const orderData = orderRes.data;

      setRazorpayOptions({
        key: orderData.keyId,
        order_id: orderData.orderId,
        amount: orderData.amount,
        currency: 'INR',
        name: 'Popli',
        description: orderData.coins + ' Pop Coins',
        theme: { color: '#A855F7' },
        prefill: {
          contact: userProfile?.phone || '',
          name: userProfile?.name || '',
          email: userProfile?.email || '',
        },
      });

      onClose();
      setTimeout(() => setStep('payment_open'), 400);
    } catch (e: any) {
      console.log('[RECHARGE] error:', JSON.stringify(e?.response?.data), e?.message, e?.code);
      setStep('idle');
      setConfirming(false);
      showError(e?.response?.data?.message || 'Failed to create order. Please try again.');
    }
  };

  const handlePaymentSuccess = async (data: any) => {
    setStep('verifying');
    setRazorpayOptions(null);

    try {
      const res = await walletApi.verifyRechargePayment(
        data.razorpay_order_id,
        data.razorpay_payment_id,
        data.razorpay_signature,
      );

      const { coinBalance, coinsAdded, duplicate } = res.data;

      if (!duplicate) {
        useWalletStore.setState({ coinBalance });
        showSuccess(`${coinsAdded.toLocaleString()} Pop Coins added to your wallet`);
        if (onSuccess) onSuccess(coinsAdded);
      }

      await useWalletStore.getState().fetchWallet();
      setSelectedId(null);
      onClose();
    } catch (e: any) {
      showError(e?.response?.data?.message || 'Verification failed. Contact support if amount was deducted.');
    } finally {
      setStep('idle');
      setConfirming(false);
    }
  };

  const handlePaymentFailed = (_data: any) => {
    setRazorpayOptions(null);
    setStep('idle');
    setConfirming(false);
    showError('Payment failed. Please try again.');
  };

  const handlePaymentDismiss = () => {
    setRazorpayOptions(null);
    setStep('idle');
    setConfirming(false);
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="slide" onRequestClose={isProcessing ? undefined : onClose}>
        <View className="flex-1 justify-end bg-black/60">
          <Pressable className="flex-1" onPress={isProcessing ? undefined : onClose} />

          <View
            className="bg-[#12081E] rounded-t-[32px] pt-3 shadow-2xl border-t border-white/10"
            style={{ paddingBottom: Math.max(insets.bottom, 20) }}
          >
            <View className="w-10 h-1 bg-white/20 rounded-full self-center mb-4" />

            <View className="flex-row justify-between items-center px-5 mb-2">
              <View className="flex-row items-center gap-2">
                <View className="bg-[#EAB308]/20 p-1.5 rounded-full">
                  <Coins size={16} color="#EAB308" fill="#EAB308" />
                </View>
                <Text className="text-white font-extrabold text-lg">Recharge Pop Coins</Text>
              </View>
              <Pressable onPress={isProcessing ? undefined : onClose} className="p-1.5 bg-white/5 rounded-full">
                <X size={18} color="#D1D5DB" />
              </Pressable>
            </View>

            <Text className="text-white/50 text-xs px-5 mb-3">
              Use Pop Coins to send gifts to your favourite creators
            </Text>

        {rateLabel !== null && (
              <View className="bg-[#EAB308]/10 border border-[#EAB308]/30 rounded-xl py-2 mx-5 mb-4 flex-row items-center justify-center">
                <Coins size={14} color="#EAB308" fill="#EAB308" />
                <Text className="text-[#EAB308] font-bold text-xs ml-1.5">
                  1 Rs = {rateLabel} Pop Coins
                </Text>
              </View>
            )}

            {loading ? (
              <View className="py-10 items-center">
                <ActivityIndicator color="#A855F7" />
              </View>
            ) : coinPackages.length === 0 ? (
              <View className="py-10 items-center px-5">
                <Text className="text-white/40 text-sm text-center">No coin packages available right now.</Text>
              </View>
            ) : (
              <View className="flex-row flex-wrap px-4 justify-between gap-y-3">
                {coinPackages.map((pkg) => {
                  const isSelected = selectedId === pkg.id;
                  const total = pkg.coins + pkg.bonusCoins;
                  return (
                    <Pressable
                      key={pkg.id}
                      onPress={() => !isProcessing && setSelectedId(pkg.id)}
                      className="bg-[#1D1037]/60 rounded-2xl p-4 items-center border relative"
                      style={[
                        { borderColor: isSelected ? '#A855F7' : 'rgba(255,255,255,0.05)' },
                        { width: (width - 40) / 2 - 6 },
                      ]}
                    >
                      {pkg.badge && (
                        <View
                          className="absolute -top-2 right-2 px-2 py-0.5 rounded"
                          style={{ backgroundColor: pkg.badgeColor || '#A855F7' }}
                        >
                          <Text className="text-white text-[8px] font-bold">{pkg.badge}</Text>
                        </View>
                      )}

                      <View className="bg-[#EAB308]/20 w-10 h-10 rounded-full items-center justify-center mb-2">
                        <Coins size={20} color="#EAB308" fill="#EAB308" />
                      </View>

                      <Text className="text-white font-black text-lg mb-1">
                        {pkg.coins.toLocaleString()}
                      </Text>

                      {pkg.bonusCoins > 0 && (
                        <Text className="text-green-500 text-[9px] font-bold mb-1">
                          +{pkg.bonusCoins.toLocaleString()} bonus
                        </Text>
                      )}

                      <Text className="text-[#A855F7] font-bold text-base mb-1">
                        Rs.{pkg.priceInr.toFixed(2)}
                      </Text>

                      {pkg.description ? (
                        <Text className="text-white/40 text-[9px] text-center">{pkg.description}</Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            )}

            <View className="px-5 pt-6 pb-2">
              <View className="flex-row items-center justify-between gap-2 mb-4 bg-white/5 p-3 rounded-lg border border-white/5">
                <View className="flex-row items-center gap-1.5">
                  <Lock size={12} color="#9CA3AF" />
                  <Text className="text-white/50 text-xs">
                    Secured via Razorpay - PCI-DSS compliant
                  </Text>
                </View>
                <Zap size={14} color="#6B7280" />
              </View>

              <Pressable
                disabled={!selectedId || isProcessing}
                onPress={() => { if (selectedId && !isProcessing) setShowConfirm(true); }}
                className={`w-full py-4 rounded-xl items-center justify-center ${selectedId && !isProcessing ? 'bg-[#A855F7]' : 'bg-[#A855F7]/30'}`}
              >
                {isProcessing ? (
                  <View className="flex-row items-center gap-2">
                    <ActivityIndicator size="small" color="white" />
                    <Text className="text-white font-bold text-sm">{stepLabel()}</Text>
                  </View>
                ) : (
                  <Text className={`font-bold text-sm ${selectedId ? 'text-white' : 'text-white/50'}`}>
                    {stepLabel()}
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>

        {showConfirm && selected && (
          <View className="absolute inset-0 bg-black/70 items-center justify-center px-6">
            <View className="bg-[#1A0E2C] w-full rounded-3xl p-6 border border-white/10">
              <Text className="text-white font-bold text-lg text-center mb-2">Confirm Payment</Text>
              <Text className="text-white/50 text-sm text-center mb-6">
                Pay Rs.{selected.priceInr.toFixed(2)} to get {totalCoins.toLocaleString()} coins?
              </Text>
              <Pressable
                onPress={handleConfirmPay}
                className="py-3.5 rounded-2xl items-center mb-2.5 bg-[#A855F7]"
              >
                <Text className="text-white font-bold text-sm">Pay Now</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowConfirm(false)}
                className="py-3.5 rounded-2xl items-center border border-white/10"
              >
                <Text className="text-white/70 font-bold text-sm">Cancel</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Modal>

      {razorpayOptions && step === 'payment_open' && (
        <RazorpayWebView
          isVisible={true}
          options={razorpayOptions}
          onSuccess={handlePaymentSuccess}
          onFailed={handlePaymentFailed}
          onClose={handlePaymentDismiss}
        />
      )}
    </>
  );
}