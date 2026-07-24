import React, { useState } from 'react';
import { View, Text, Pressable, Modal, Dimensions, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showSuccess, showError } from '../store/toastStore';
import { ConfirmSheet } from './ConfirmSheet';
import { X, Lock, Zap, Coins } from 'lucide-react-native';
import { useWalletStore } from '../store';
import { useSystemConfig } from '../hooks/useSystemConfig';

interface RechargeCoinsSheetProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (coins: number) => void;
}

const { width } = Dimensions.get('window');

export default function RechargeCoinsSheet({ visible, onClose, onSuccess }: RechargeCoinsSheetProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const rechargeCoins = useWalletStore(state => state.rechargeCoins);
  const insets = useSafeAreaInsets();
  const { coinPackages, loading } = useSystemConfig();

  const selected = coinPackages.find(p => p.id === selectedId);
  const totalCoins = selected ? selected.coins + selected.bonusCoins : 0;

  const rateLabel = coinPackages.length > 0
    ? Math.round(coinPackages[0].coins / coinPackages[0].priceInr)
    : 10;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <Pressable className="flex-1" onPress={onClose} />

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
            <Pressable onPress={onClose} className="p-1.5 bg-white/5 rounded-full">
              <X size={18} color="#D1D5DB" />
            </Pressable>
          </View>

          <Text className="text-white/50 text-xs px-5 mb-3">
            Use Pop Coins to send gifts to your favourite creators
          </Text>

          <View className="bg-[#EAB308]/10 border border-[#EAB308]/30 rounded-xl py-2 mx-5 mb-4 flex-row items-center justify-center">
            <Coins size={14} color="#EAB308" fill="#EAB308" />
            <Text className="text-[#EAB308] font-bold text-xs ml-1.5">
              1 Rs = {rateLabel} Pop Coins
            </Text>
          </View>

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
                    onPress={() => setSelectedId(pkg.id)}
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
              onPress={() => { if (selectedId) setShowConfirm(true); }}
              className={`w-full py-4 rounded-xl items-center justify-center ${selectedId ? 'bg-[#A855F7]' : 'bg-[#A855F7]/30'}`}
            >
              <Text className={`font-bold text-sm ${selectedId ? 'text-white' : 'text-white/50'}`}>
                {isProcessing
                  ? 'Processing...'
                  : selectedId
                    ? `Pay Rs.${selected!.priceInr.toFixed(2)} - Get ${totalCoins.toLocaleString()} Coins`
                    : 'Select a Pack'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {selected && (
        <ConfirmSheet
          isVisible={showConfirm}
          title="Confirm Payment"
          message={`Pay Rs.${selected.priceInr.toFixed(2)} to get ${totalCoins.toLocaleString()} coins?`}
          confirmLabel="Pay Now"
          cancelLabel="Cancel"
          destructive={false}
          onCancel={() => setShowConfirm(false)}
          onConfirm={async () => {
            setShowConfirm(false);
            setIsProcessing(true);
            try {
              const success = await rechargeCoins(selected.priceInr, totalCoins);
              if (success) {
                showSuccess(`${totalCoins.toLocaleString()} coins added to your wallet`);
                if (onSuccess) onSuccess(totalCoins);
                onClose();
              } else {
                showError('Something went wrong while processing the payment');
              }
            } catch {
              showError('Payment failed. Please try again.');
            } finally {
              setIsProcessing(false);
            }
          }}
        />
      )}
    </Modal>
  );
}