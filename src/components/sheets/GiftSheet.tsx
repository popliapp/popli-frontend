import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Platform, StyleSheet, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { X, Coins, Gift, Heart, Crown, Gem, Rocket, PartyPopper, Sparkles, Star, Flower2 } from 'lucide-react-native';
import { useWalletStore } from '../../store';
import { useSystemConfig } from '../../hooks/useSystemConfig';
import RechargeCoinsSheet from '../RechargeCoinsSheet';
import { Reel } from '../../types';
import { MotiView } from 'moti';

interface GiftSheetProps {
  reel: Reel | null;
  isOpen: boolean;
  onClose: () => void;
  onSendSuccess: (giftIcon: string) => void;
}

const getGiftIconComponent = (id: string, size: number) => {
  switch (id) {
    case 'rocket': return <Rocket color="#F97316" size={size} />;
    case 'rose': return <Flower2 color="#EF4444" size={size} />;
    case 'heart': return <Heart color="#F43F5E" size={size} />;
    case 'crown': return <Crown color="#F59E0B" size={size} />;
    case 'diamond': return <Gem color="#3B82F6" size={size} />;
    case 'party': return <PartyPopper color="#F97316" size={size} />;
    case 'sparkle': return <Sparkles color="#EAB308" size={size} />;
    case 'star': return <Star color="#EAB308" size={size} />;
    default: return <Gift color="#8B5CF6" size={size} />;
  }
};

export const GiftSheet = ({ reel, isOpen, onClose, onSendSuccess }: GiftSheetProps) => {
const [selectedGiftId, setSelectedGiftId] = useState<string>('rose');
  const [showInsufficientModal, setShowInsufficientModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showRechargeSheet, setShowRechargeSheet] = useState(false);
  const router = useRouter();
  const insets = useSafeAreaInsets();
 const { coinBalance, sendGiftCoins, fetchWallet } = useWalletStore();
const { config, loading: configLoading } = useSystemConfig();
  const gifts = config?.gifts ?? [];

  useEffect(() => {
    if (isOpen) {
      fetchWallet();
    }
  }, [isOpen]);

const selectedGift = gifts.find((g) => g.id === selectedGiftId) ?? gifts[0] ?? null;

  const handleSendGift = async () => {
    if (!reel || isSending) return;

   if (coinBalance < selectedGift.costInCoins) {
      setShowInsufficientModal(true);
      return;
    }

    setIsSending(true);
   const success = await sendGiftCoins(reel.creatorId, selectedGift.id, selectedGift.costInCoins, '', reel.id);
    setIsSending(false);
    
    if (success) {
      onClose();
      onSendSuccess(selectedGift.iconUrl);
    } else {
      setShowErrorModal(true);
    }
  };
if (!reel) return null;
if (configLoading) return null;
if (!selectedGift) return null;

  return (
    <Modal transparent visible={isOpen} animationType="none" onRequestClose={onClose}>
      <TouchableOpacity className="absolute inset-0 bg-black/40 z-40" onPress={onClose} activeOpacity={1} />

      <MotiView
        from={{ translateY: 600, opacity: 0 }}
        animate={{ translateY: 0, opacity: 1 }}
        exit={{ translateY: 600, opacity: 0 }}
        transition={{ type: 'timing', duration: 300 }}
        className="absolute bottom-0 left-0 right-0 bg-[#12081E] border-t border-white/10 rounded-t-[32px] z-50 shadow-2xl flex-col"
        style={{ paddingBottom: Math.max(insets.bottom, 20) }}
      >
        <View className="items-center py-3">
          <View className="w-12 h-1.5 bg-white/20 rounded-full" />
        </View>

       <>
            <View className="flex-row items-center justify-between px-5 pb-4">
              <View className="flex-row items-center gap-2">
                <Gift size={20} color="#A855F7" />
                <Text className="text-white font-extrabold text-lg">Send a Gift</Text>
              </View>

              <View className="flex-row items-center gap-4">
                <View className="flex-row items-center gap-1.5">
                  <Coins size={14} color="#FBBF24" fill="#FBBF24" />
                  <Text className="text-yellow-400 font-bold">{coinBalance.toLocaleString()} Coins</Text>
                </View>
                
               <TouchableOpacity 
                  onPress={() => setShowRechargeSheet(true)}
                  className="bg-[#FBBF24] px-4 py-1.5 rounded-full active:scale-95 shadow-lg"
                >
                  <Text className="text-[#12081E] text-xs font-extrabold">+ Recharge</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View className="py-2">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
               {gifts.map((gift) => {
                  const isSelected = gift.id === selectedGiftId;
                  return (
                    <TouchableOpacity
                      key={gift.id}
                      onPress={() => setSelectedGiftId(gift.id)}
                      activeOpacity={0.7}
                      className="w-[90px] h-[110px] items-center justify-center rounded-2xl border"
                      style={
                        isSelected 
                          ? { backgroundColor: 'rgba(168, 85, 247, 0.15)', borderColor: '#A855F7' }
                          : { backgroundColor: '#1A0E2C', borderColor: 'rgba(255, 255, 255, 0.05)' }
                      }
                    >
                      <View className="mb-3">
                        {getGiftIconComponent(gift.id, 32)}
                      </View>
                      <Text className="text-white font-bold text-xs mb-1">{gift.name}</Text>
                      <View className="flex-row items-center gap-1">
                        <Coins size={10} color="#FBBF24" fill="#FBBF24" />
                       <Text className="text-white/50 text-[10px] font-medium">{gift.costInCoins}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View 
              className="px-5 pt-6 items-center"
              style={{ paddingBottom: Math.max(insets.bottom, 16) }}
            >
              <Text className="text-white/50 text-xs mb-3">
                Sending to @{reel.creatorUsername}
              </Text>
              
              <TouchableOpacity
                onPress={handleSendGift}
                disabled={isSending}
                className={`w-full py-4 rounded-xl items-center justify-center ${isSending ? 'bg-white/10' : 'bg-[#A855F7]'}`}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#A855F7" />
                ) : (
                  <Text className="text-white text-sm font-bold">Send Gift</Text>
                )}
              </TouchableOpacity>
            </View>
        </>
      </MotiView>

      {showInsufficientModal && (
        <View style={[StyleSheet.absoluteFill, { elevation: 100, zIndex: 100 }]} className="flex-1 bg-black/60 items-center justify-center px-6">
          <MotiView 
            from={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            className="bg-[#1A0E2C] border border-white/10 w-full rounded-[24px] p-6 items-center shadow-2xl"
          >
            <View className="w-16 h-16 rounded-full bg-red-500/20 items-center justify-center mb-4">
              <Coins size={32} color="#EF4444" />
            </View>
            <Text className="text-white font-bold text-center mt-6">You don&apos;t have enough coins</Text>
            <Text className="text-[#9CA3AF] text-center mt-2 px-6">
            You need {selectedGift.costInCoins - coinBalance} more coins to send this {selectedGift.name}.
            </Text>
          <TouchableOpacity 
              onPress={() => {
                setShowInsufficientModal(false);
                setShowRechargeSheet(true);
              }}
              className="bg-[#A855F7] w-full py-4 rounded-full items-center active:scale-95 transition-all mb-3"
            >
              <Text className="text-white font-bold text-sm">Recharge Coins</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setShowInsufficientModal(false)}
              className="py-2"
            >
              <Text className="text-white/40 font-medium text-xs">Cancel</Text>
            </TouchableOpacity>
          </MotiView>
        </View>
      )}

     {showErrorModal && (
        <View style={[StyleSheet.absoluteFill, { elevation: 100, zIndex: 100 }]} className="flex-1 bg-black/60 items-center justify-center px-6">
          <MotiView 
            from={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15 }}
            className="bg-[#1A0E2C] border border-white/10 w-full rounded-[24px] p-6 items-center shadow-2xl"
          >
            <View className="w-16 h-16 rounded-full bg-red-500/20 items-center justify-center mb-4">
              <X size={32} color="#EF4444" />
            </View>
            <Text className="text-white text-xl font-black mb-2 text-center">Transfer Failed</Text>
            <Text className="text-white/60 text-xs text-center leading-5 mb-6 px-4">
              We couldn&apos;t process your gift. Please try again.
            </Text>
            <TouchableOpacity 
              onPress={() => setShowErrorModal(false)}
              className="bg-[#EF4444] w-full py-4 rounded-full items-center active:scale-95 transition-all"
            >
              <Text className="text-white font-bold text-sm">Dismiss</Text>
            </TouchableOpacity>
          </MotiView>
        </View>
      )}

<RechargeCoinsSheet
        visible={showRechargeSheet}
        onClose={() => setShowRechargeSheet(false)}
        onSuccess={() => {
          setShowRechargeSheet(false);
          fetchWallet();
        }}
      />
    </Modal>
  );
};