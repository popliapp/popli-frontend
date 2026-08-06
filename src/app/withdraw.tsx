import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, Landmark, Clock, CheckCircle2, History, AlertCircle } from 'lucide-react-native';
import { apiClient } from '../api/client';
import { useWalletStore } from '../store/walletStore';
import { SafeScreen } from '../components/layout/SafeScreen';
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { showSuccess, showError } from '../store/toastStore';
import { formatEarnings } from '../utils/earnings';

export default function WithdrawScreen() {
  const router = useRouter();
  const { totalEarnings, pendingBalance, withdrawableBalance, ledgers, fetchWallet } = useWalletStore();
  const [loading, setLoading] = useState(true);
  
 const [amount, setAmount] = useState('');
  const [withdrawing, setWithdrawing] = useState(false);
 const [activeTab, setActiveTab] = useState<'ALL' | 'VIEW' | 'GIFT'>('ALL');

  const [amountError, setAmountError] = useState('');
  const [upiError, setUpiError] = useState('');

const [tdsPercent, setTdsPercent] = useState<number | null>(null);
  const [feePercent, setFeePercent] = useState<number | null>(null);
  const [minWithdrawalInr, setMinWithdrawalInr] = useState<number | null>(null);
  const [configError, setConfigError] = useState(false);
  useEffect(() => {
    const loadWallet = async () => {
      try {
        await fetchWallet();
      } catch (error) {
        console.error('Failed to fetch wallet', error);
      } finally {
        setLoading(false);
      }
    };
const fetchConfigs = async () => {
      try {
        const res = await apiClient.get('/system/public-configs');
      if (typeof res.data?.tdsPercentage === 'number') setTdsPercent(res.data.tdsPercentage);
        if (typeof res.data?.platformFeePercentage === 'number') setFeePercent(res.data.platformFeePercentage);
        if (typeof res.data?.minWithdrawalInr === 'number') setMinWithdrawalInr(res.data.minWithdrawalInr);
      } catch (error) {
        setConfigError(true);
      }
    };
    loadWallet();
    fetchConfigs();
  }, []);

  const pendingValidation = pendingBalance ?? 0;
  const withdrawable = withdrawableBalance ?? 0;

const handleWithdrawSubmit = async () => {
    setAmountError('');

    if (!amount) {
      setAmountError('Enter an amount to withdraw');
      return;
    }

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      setAmountError('Enter a valid amount');
      return;
    }
    if (amt < minWithdrawalInr!) {
      setAmountError(`Minimum withdrawal is ₹${minWithdrawalInr}`);
      return;
    }
    if (amt > withdrawable) {
      setAmountError('Insufficient withdrawable balance');
      return;
    }

    try {
      setWithdrawing(true);
      await apiClient.post('/wallet/withdraw', { amount: amt });
      showSuccess('Withdrawal request submitted. Admin will process it within 24 hours.');
      setAmount('');
      await fetchWallet();
    } catch (e: any) {
      const msg = e.response?.data?.message || 'Failed to withdraw';
      if (msg.toLowerCase().includes('kyc')) {
        showError(msg, {
          duration: 5000,
          action: { label: 'Complete KYC', onPress: () => router.push('/kyc' as any) },
        });
      } else {
        showError(msg);
      }
    } finally {
      setWithdrawing(false);
    }
  };
  const filteredLedgers = ledgers.filter((l: any) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'VIEW') return l.source === 'VIEW_EARNING';
    if (activeTab === 'GIFT') return l.source === 'GIFT_RECEIVED';
    return true;
  });

if (loading) {
    return (
      <View className="flex-1 bg-[#12081E] items-center justify-center">
        <ActivityIndicator size="large" color="#A855F7" />
      </View>
    );
  }

if (configError || tdsPercent === null || feePercent === null || minWithdrawalInr === null) {
    return (
      <SafeScreen edgeToEdgeBottom className="bg-[#12081E] flex-1">
        <View className="flex-row items-center justify-center px-4 pt-4 pb-4 relative">
          <Pressable onPress={() => router.back()} className="absolute left-4 p-2 -ml-2 z-10 active:opacity-70">
            <ChevronLeft color="white" size={28} />
          </Pressable>
          <Text className="text-white font-bold text-lg tracking-wide">Creator Rewards</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8 gap-4">
          <AlertCircle size={48} color="#EF4444" />
          <Text className="text-white font-bold text-base text-center">Platform configuration unavailable</Text>
          <Text className="text-gray-400 text-sm text-center">Withdrawal rates could not be loaded from the server. Please try again.</Text>
          <Pressable
            onPress={() => {
              setConfigError(false);
              setTdsPercent(null);
              setFeePercent(null);
              setLoading(true);
              fetchWallet().finally(() => setLoading(false));
              apiClient.get('/system/public-configs').then((res) => {
                if (typeof res.data?.tdsPercentage === 'number') setTdsPercent(res.data.tdsPercentage);
                if (typeof res.data?.platformFeePercentage === 'number') setFeePercent(res.data.platformFeePercentage);
              }).catch(() => setConfigError(true));
            }}
            className="bg-[#A855F7] px-8 py-3 rounded-xl"
          >
            <Text className="text-white font-bold">Retry</Text>
          </Pressable>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen edgeToEdgeBottom className="bg-[#12081E] flex-1">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-center px-4 pt-4 pb-4 relative">
          <Pressable onPress={() => router.back()} className="absolute left-4 p-2 -ml-2 z-10 active:opacity-70">
            <ChevronLeft color="white" size={28} />
          </Pressable>
          <Text className="text-white font-bold text-lg tracking-wide">Creator Rewards</Text>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          
        {/* Huge Balance */}
          <View className="items-center mt-2 mb-8">
             <Text className="text-white font-black text-6xl tracking-tighter">{formatEarnings(totalEarnings)}</Text>
          </View>

          <View className="px-5">
            
            {/* Pending & Withdrawable Split Card */}
            <View className="bg-[#1D1037] border border-[#3E2B5C] rounded-2xl p-5 mb-6 flex-row justify-between shadow-lg">
              <View className="flex-1 border-r border-[#3E2B5C] pr-4">
                <View className="flex-row items-center gap-1.5 mb-2">
                  <Clock size={14} color="#FBBF24" />
                  <Text className="text-gray-400 font-bold text-[10px] uppercase tracking-wider">Pending Validation</Text>
                </View>
              <Text className="text-[#FBBF24] font-black text-xl">{formatEarnings(pendingValidation)}</Text>
              </View>
              <View className="flex-1 pl-4">
                 <View className="flex-row items-center gap-1.5 mb-2">
                  <CheckCircle2 size={14} color="#10B981" />
                  <Text className="text-gray-400 font-bold text-[10px] uppercase tracking-wider">Withdrawable</Text>
                </View>
              <Text className="text-[#10B981] font-black text-xl">{formatEarnings(withdrawable)}</Text>
              </View>
            </View>

            {/* Request Cash Withdrawal Form */}
            <View className="bg-[#1D1037] rounded-[24px] p-6 mb-8 border border-[#3E2B5C] shadow-lg">
              <View className="flex-row items-center gap-2 mb-6">
                <Landmark size={20} color="#A855F7" />
                <Text className="text-white font-bold text-base">Request Cash Withdrawal</Text>
              </View>

          <View className="mb-5">
                <Text className="text-gray-400 font-bold text-[10px] uppercase tracking-wider mb-2">Withdrawal Amount (Min ₹500)</Text>
              <TextInput 
                  value={amount}
                  onChangeText={(v) => { setAmount(v); if (amountError) setAmountError(''); }}
                  placeholder={`Max available: ₹${withdrawable.toFixed(2)}`}
                  placeholderTextColor="rgba(255, 255, 255, 0.2)"
                  keyboardType="numeric"
                  className={`bg-[#12081E] border rounded-xl px-4 h-14 text-white font-medium ${amountError ? 'border-red-500' : 'border-[#3E2B5C]'}`}
                />
                {amountError ? (
                  <View className="flex-row items-center gap-1.5 mt-2">
                    <AlertCircle size={12} color="#EF4444" />
                    <Text className="text-red-400 text-xs font-medium">{amountError}</Text>
                  </View>
                ) : null}
            {amount !== '' && parseFloat(amount) >= 500 && (
                  <View className="bg-[#12081E] border border-[#3E2B5C] rounded-xl p-4 mt-3 gap-2">
                    <View className="flex-row justify-between">
                      <Text className="text-gray-400 text-xs">Requested</Text>
                      <Text className="text-white font-bold text-xs">₹{parseFloat(amount).toFixed(2)}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-gray-400 text-xs">TDS ({tdsPercent}%)</Text>
                      <Text className="text-red-400 font-bold text-xs">-₹{(parseFloat(amount) * (tdsPercent / 100)).toFixed(2)}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-gray-400 text-xs">Platform Fee ({feePercent}%)</Text>
                      <Text className="text-red-400 font-bold text-xs">-₹{(parseFloat(amount) * (feePercent / 100)).toFixed(2)}</Text>
                    </View>
                    <View className="flex-row justify-between border-t border-[#3E2B5C] pt-2 mt-1">
                      <Text className="text-white font-bold text-xs">You'll receive</Text>
                      <Text className="text-[#10B981] font-black text-xs">₹{(parseFloat(amount) * (1 - (tdsPercent + feePercent) / 100)).toFixed(2)}</Text>
                    </View>
                  </View>
                )}
              </View>

 <View className="mb-6 bg-[#12081E] border border-[#3E2B5C] rounded-xl p-4">
                <Text className="text-gray-400 font-bold text-[10px] uppercase tracking-wider mb-1">Payout Destination</Text>
                <Text className="text-white text-sm font-medium">Your KYC-verified UPI or bank account</Text>
                <Text className="text-gray-500 text-xs mt-1">Payment will be sent to the UPI ID or bank account verified during KYC.</Text>
              </View>

              <Pressable 
                onPress={handleWithdrawSubmit}
                disabled={withdrawing}
                className="bg-[#A855F7] py-4 rounded-xl items-center justify-center active:scale-95"
              >
                {withdrawing ? (
                   <ActivityIndicator color="white" />
                ) : (
                   <Text className="text-white font-bold text-sm uppercase tracking-widest">Submit Request</Text>
                )}
              </Pressable>
            </View>

            {/* Ledger & History */}
            <View className="flex-row items-center gap-2 mb-4">
              <History size={18} color="white" />
              <Text className="text-white font-bold text-base">LEDGER & HISTORY</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6 flex-row">
              <Pressable 
                onPress={() => setActiveTab('ALL')}
                className={`px-4 py-3 rounded-xl border mr-3 ${activeTab === 'ALL' ? 'border-[#A855F7] bg-[#1D1037]' : 'border-[#3E2B5C] bg-[#1D1037]/50'}`}
              >
                <Text className={`font-bold text-[11px] uppercase tracking-wider ${activeTab === 'ALL' ? 'text-white' : 'text-gray-400'}`}>All Transactions</Text>
              </Pressable>
              
              <Pressable 
                onPress={() => setActiveTab('VIEW')}
                className={`px-4 py-3 rounded-xl border mr-3 ${activeTab === 'VIEW' ? 'border-[#A855F7] bg-[#1D1037]' : 'border-[#3E2B5C] bg-[#1D1037]/50'}`}
              >
                <Text className={`font-bold text-[11px] uppercase tracking-wider ${activeTab === 'VIEW' ? 'text-white' : 'text-gray-400'}`}>View Earnings</Text>
              </Pressable>
              
              <Pressable 
                onPress={() => setActiveTab('GIFT')}
                className={`px-4 py-3 rounded-xl border ${activeTab === 'GIFT' ? 'border-[#A855F7] bg-[#1D1037]' : 'border-[#3E2B5C] bg-[#1D1037]/50'}`}
              >
                <Text className={`font-bold text-[11px] uppercase tracking-wider ${activeTab === 'GIFT' ? 'text-white' : 'text-gray-400'}`}>Gift Earnings</Text>
              </Pressable>
            </ScrollView>

            <View className="bg-[#1D1037] border border-[#3E2B5C] rounded-2xl p-6 min-h-[150px] justify-center shadow-lg border-dashed">
               {filteredLedgers.length === 0 ? (
                 <Text className="text-gray-500 text-center font-medium">No transactions found.</Text>
               ) : (
               filteredLedgers.map((l: any, i: number) => {
                 const amt = Math.abs(l.credit > 0 ? l.credit : l.debit);
                   const displayAmt = formatEarnings(amt);
                   return (
                   <View key={i} className="flex-row justify-between items-center mb-4 last:mb-0 border-b border-[#3E2B5C] pb-4 last:border-0 last:pb-0">
                     <View>
                       <Text className="text-white font-bold text-sm">{l.source}</Text>
                       <Text className="text-gray-400 text-[10px] mt-0.5">{new Date(l.createdAt).toLocaleDateString()}</Text>
                     </View>
                     <View className="items-end">
                       <Text className={`${l.credit > 0 ? 'text-[#10B981]' : 'text-red-400'} font-black text-sm`}>
                         {l.credit > 0 ? '+' : '-'}{displayAmt}
                       </Text>
                       <Text className="text-gray-500 text-[10px] mt-0.5">Bal: ₹{l.balanceAfter?.toFixed(2)}</Text>
                     </View>
                   </View>
                 )})
               )}
            </View>

          </View>
  </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}