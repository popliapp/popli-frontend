import React, { useEffect } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft, CreditCard, Building2, Smartphone, FileText, History } from 'lucide-react-native';
import { useWalletStore } from '../../store/walletStore';
import { formatEarnings } from '../../utils/earnings';

const ActionCard = ({ icon: Icon, title, description }: any) => (
  <Pressable className="bg-[#1A0E2C] border border-white/5 rounded-2xl p-4 gap-2 mb-4">
    <View className="flex-row items-center gap-3">
      <View className="w-10 h-10 rounded-full bg-[#EC4899]/10 items-center justify-center border border-[#EC4899]/20">
        <Icon size={20} color="#EC4899" />
      </View>
      <View className="flex-1">
        <Text className="text-white font-bold text-sm">{title}</Text>
        <Text className="text-neutral-grey text-xs mt-1 leading-5">{description}</Text>
      </View>
    </View>
  </Pressable>
);

export default function PayoutsScreen() {
  const router = useRouter();
  const { withdrawableBalance, fetchWallet } = useWalletStore();

  useEffect(() => {
    fetchWallet();
  }, []);

  return (
    <View className="flex-1 bg-[#12081E] pt-14">
      {/* Header */}
      <View className="flex-row items-center px-4 pb-6 border-b border-white/5">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={20} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white font-bold text-base ml-2">Payout Settings</Text>
      </View>

      <ScrollView 
        className="flex-1 px-4 py-6"
        contentContainerStyle={{ gap: 8, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="bg-gradient-to-r from-[#A855F7]/20 to-[#EC4899]/20 border border-white/10 rounded-3xl p-6 items-center gap-2 mb-6">
        <Text className="text-neutral-grey text-xs font-bold uppercase tracking-widest">Available Balance</Text>
          <Text className="text-white text-4xl font-black tracking-tight">{formatEarnings(withdrawableBalance)}</Text>
          <Pressable onPress={() => router.push('/withdraw' as any)} className="bg-[#EC4899] px-8 py-3 rounded-full mt-2 shadow-lg shadow-[#EC4899]/30">
            <Text className="text-white font-bold">Withdraw Funds</Text>
          </Pressable>
        </View>

        <Text className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-2 mb-2">Payment Methods</Text>

        <ActionCard 
          icon={Building2} 
          title="Bank Account" 
          description="Manage your linked bank accounts for direct deposits." 
        />
        <ActionCard 
          icon={Smartphone} 
          title="UPI Management" 
          description="Add or remove UPI IDs for instant transfers." 
        />
        
        <Text className="text-white/60 text-[10px] font-bold uppercase tracking-widest mt-4 mb-2">Taxes & History</Text>

        <ActionCard 
          icon={FileText} 
          title="Tax Information" 
          description="Update your tax details and download tax forms." 
        />
        <ActionCard 
          icon={History} 
          title="Withdrawal History" 
          description="View past withdrawals and their statuses." 
        />

      </ScrollView>
    </View>
  );
}
