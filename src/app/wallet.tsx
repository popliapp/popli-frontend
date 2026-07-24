import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, Dimensions, Platform } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ArrowLeft, Coins, ArrowUpRight, TrendingUp, Landmark, Wallet, ArrowDownLeft, Clock, CheckCircle2, ListFilter, AlertCircle } from 'lucide-react-native';
import { useWalletStore, useKYCStore } from '../store';
import { formatEarnings } from '../utils/earnings';
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeScreen } from '../components/layout/SafeScreen';
import { showSuccess, showError, showInfo } from '../store/toastStore';
import { useSystemConfig } from '../hooks/useSystemConfig';

const { width } = Dimensions.get('window');


const TABS = [
  { id: 'ALL', label: 'All Transactions' },
  { id: 'VIEW_EARNING', label: 'View Earnings' },
  { id: 'GIFT_RECEIVED', label: 'Gift Earnings' },
  { id: 'GIFT_SEND', label: 'Gifts Sent' },
  { id: 'WITHDRAWAL', label: 'Withdrawals' },
  { id: 'CHALLENGE_EARNING', label: 'Challenge Earnings' }
];

export default function WalletScreen() {
  const router = useRouter();
  const { coinBalance, pendingBalance, withdrawableBalance, totalEarnings, totalWithdrawn, ledgers, withdrawalRequests, transactions, rechargeCoins, withdrawEarnings } = useWalletStore();
  const { kycCompleted, upiId } = useKYCStore();

 const { coinPackages } = useSystemConfig();
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [customUpi, setCustomUpi] = useState(upiId || '');
  const [activeTab, setActiveTab] = useState('ALL');
  const [amountError, setAmountError] = useState('');
  const [upiError, setUpiError] = useState('');

  useFocusEffect(
    useCallback(() => {
      useWalletStore.getState().fetchWallet();
    }, [])
  );

 const handleWithdraw = async () => {
    setAmountError('');
    setUpiError('');

    if (!kycCompleted) {
      showError('Complete your KYC verification to enable withdrawals', {
        duration: 5000,
        action: { label: 'Verify Now', onPress: () => router.push('/kyc') },
      });
      return;
    }

    let hasError = false;
    const amountNum = parseFloat(withdrawAmount);
    if (!withdrawAmount || isNaN(amountNum) || amountNum <= 0) {
      setAmountError('Please enter a valid amount');
      hasError = true;
    }
    if (!customUpi.trim()) {
      setUpiError('Please enter your UPI ID');
      hasError = true;
    }
    if (hasError) return;

    const success = await withdrawEarnings(amountNum, customUpi.trim());
    if (success) {
      showSuccess(`₹${amountNum.toLocaleString()} queued for transfer. Settles in 24 hours.`);
      setWithdrawAmount('');
    } else {
      showError('Withdrawal failed. Please try again.');
    }
  };
  const filteredLedgers = ledgers.filter(l => activeTab === 'ALL' || l.source === activeTab);

  return (
    <SafeScreen edgeToEdgeBottom className="bg-background-plum">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1">
        <View className="flex-row items-center justify-between px-4 pb-3 border-b border-white/5 bg-background-card/15">
        <Pressable onPress={() => router.back()} className="p-1">
          <ArrowLeft size={20} color="#D1D5DB" />
        </Pressable>
        <Text className="text-white font-bold text-base">Creator Rewards</Text>
        <View className="w-5" />
      </View>

      <ScrollView className="flex-1 px-4 py-4 gap-6" showsVerticalScrollIndicator={false}>
        
        {/* Dashboard Balances */}
        <View className="bg-background-card/70 border border-white/10 rounded-3xl p-5 shadow shadow-primary-purple/10">
          <View className="items-center mb-6">
            <Text className="text-white/60 text-[10px] font-bold uppercase tracking-wider mb-1">Total Lifetime Earnings</Text>
           <Text className="text-white font-black text-3xl">{formatEarnings(totalEarnings)}</Text>
          </View>
          
          <View className="flex-row justify-between bg-black/20 rounded-2xl p-4 border border-white/5">
            <View className="flex-1 border-r border-white/10">
              <View className="flex-row items-center gap-1.5 mb-1">
                <Clock size={12} color="#F59E0B" />
                <Text className="text-white/60 text-[9px] font-bold uppercase">Pending Validation</Text>
              </View>
            <Text className="text-accent-yellow font-black text-lg">{formatEarnings(pendingBalance)}</Text>
            </View>
            <View className="flex-1 pl-4">
              <View className="flex-row items-center gap-1.5 mb-1">
                <CheckCircle2 size={12} color="#10B981" />
                <Text className="text-white/60 text-[9px] font-bold uppercase">Withdrawable</Text>
              </View>
            <Text className="text-accent-green font-black text-lg">{formatEarnings(withdrawableBalance)}</Text>
            </View>
          </View>
        </View>

        {/* Withdrawal Section */}
        <View className="bg-background-card/50 border border-white/5 rounded-3xl p-6 gap-4">
          <View className="flex-row items-center gap-2 pb-2 border-b border-white/5">
            <Landmark size={16} color="#8B5CF6" />
            <Text className="text-white font-bold text-xs">Request Cash Withdrawal</Text>
          </View>

          <View className="gap-6">
            <View className="gap-2">
              <Text className="text-white/60 text-[10px] font-bold uppercase pl-1">Withdrawal Amount (Min ₹500)</Text>
       <TextInput
                value={withdrawAmount}
                onChangeText={(v) => { setWithdrawAmount(v); if (amountError) setAmountError(''); }}
                placeholder={`Max available: ₹${withdrawableBalance.toFixed(2)}`}
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                keyboardType="numeric"
                className={`bg-background-dark/50 border text-white rounded-2xl px-4 h-12 text-xs font-semibold ${amountError ? 'border-red-500' : 'border-white/10'}`}
              />
              {amountError ? (
                <View className="flex-row items-center gap-1.5 mt-1">
                  <AlertCircle size={11} color="#EF4444" />
                  <Text className="text-red-400 text-[10px] font-medium">{amountError}</Text>
                </View>
              ) : null}
            </View>

            <View className="gap-2">
              <Text className="text-white/60 text-[10px] font-bold uppercase pl-1">Recipient UPI ID</Text>
              <TextInput
                value={customUpi}
                onChangeText={(v) => { setCustomUpi(v); if (upiError) setUpiError(''); }}
                placeholder="username@bank"
                placeholderTextColor="rgba(255, 255, 255, 0.3)"
                className={`bg-background-dark/50 border text-white rounded-2xl px-4 h-12 text-xs font-semibold ${upiError ? 'border-red-500' : 'border-white/10'}`}
              />
              {upiError ? (
                <View className="flex-row items-center gap-1.5 mt-1">
                  <AlertCircle size={11} color="#EF4444" />
                  <Text className="text-red-400 text-[10px] font-medium">{upiError}</Text>
                </View>
              ) : null}
            </View>

            <Pressable
              onPress={handleWithdraw}
              className="bg-primary-purple h-12 rounded-2xl items-center justify-center shadow shadow-primary-purple/35 flex-row gap-2"
            >
              <Text className="text-white text-xs font-black uppercase tracking-wider">Submit Request</Text>
            </Pressable>
          </View>
        </View>

        {/* Coin Balance for Gifting */}
        <View className="bg-background-card/70 border border-white/10 rounded-3xl p-4 shadow shadow-primary-purple/10 flex-row items-center justify-between">
          <View className="flex-row items-center gap-3">
            <View className="w-10 h-10 rounded-full bg-accent-gold/20 items-center justify-center border border-accent-gold/30">
              <Coins size={20} color="#FCD34D" fill="#F59E0B" />
            </View>
            <View>
              <Text className="text-white/60 text-[9px] font-bold uppercase tracking-wider">Virtual Coins Balance</Text>
              <Text className="text-accent-yellow font-black text-lg mt-0.5" numberOfLines={1}>{coinBalance.toLocaleString()}</Text>
            </View>
          </View>
        <Pressable onPress={() => showInfo('Recharge coming soon!')} className="bg-white/10 px-4 py-2 rounded-xl">
             <Text className="text-white font-bold text-xs">Buy Coins</Text>
          </Pressable>
        </View>

        {/* Tabs and Ledgers */}
        <View className="gap-4 pb-24">
          <View className="flex-row items-center gap-2 pl-1">
             <ListFilter size={16} color="#D1D5DB" />
             <Text className="text-white/80 font-bold text-xs uppercase tracking-wider">Ledger & History</Text>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
            <View className="flex-row gap-2">
              {TABS.map(tab => (
                <Pressable
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-xl border ${activeTab === tab.id ? 'bg-primary-purple/30 border-primary-purple' : 'bg-background-card/30 border-white/10'}`}
                >
                  <Text className={`text-[10px] font-bold uppercase ${activeTab === tab.id ? 'text-white' : 'text-white/50'}`}>{tab.label}</Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <View className="gap-3 mt-2">
            {(() => {
              const allHistory = [
                ...ledgers.map(l => ({
                  id: l.id,
                  source: l.source,
                  description: l.description || l.source.replace('_', ' '),
                  credit: l.credit,
                  debit: l.debit,
                  balanceAfter: l.balanceAfter,
                  createdAt: l.createdAt,
                  type: 'LEDGER'
                })),
                ...transactions.filter((t: any) => t.status === 'SUCCESS' || t.status === 'success').map((t: any) => {
                  const isDebit = t.type === 'GIFT_SEND' || t.type === 'WITHDRAWAL';
                  return {
                    id: t.id,
                    source: t.type,
                    description: t.description || t.type.replace('_', ' '),
                    credit: isDebit ? 0 : t.amount,
                    debit: isDebit ? t.amount : 0,
                    balanceAfter: null,
                    createdAt: t.timestamp || t.createdAt,
                    type: 'COIN_TX'
                  };
                })
              ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

              const filteredHistory = allHistory.filter(item => activeTab === 'ALL' || item.source === activeTab);

              if (filteredHistory.length === 0) {
                return (
                  <View className="py-8 items-center justify-center border border-white/5 rounded-2xl border-dashed">
                    <Text className="text-white/40 text-xs font-semibold">No transactions found.</Text>
                  </View>
                );
              }

              return filteredHistory.map((tx) => {
              const isIncome = tx.credit > 0;
              const amount = isIncome ? tx.credit : tx.debit;
              const isCoin = tx.type === 'COIN_TX';

              return (
                <View 
                  key={tx.id}
                  className="bg-background-card/40 border border-white/5 rounded-2xl p-4 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3 flex-1 pr-4">
                    <View className={`w-9 h-9 rounded-full items-center justify-center border ${
                      isIncome 
                        ? 'bg-green-500/10 border-green-500/25' 
                        : 'bg-red-500/10 border-red-500/25'
                    }`}>
                      {isIncome ? (
                        <ArrowDownLeft size={16} color="#10B981" />
                      ) : (
                        <ArrowUpRight size={16} color="#EF4444" />
                      )}
                    </View>

                    <View className="flex-1 gap-1">
                      <Text className="text-white text-xs font-bold" numberOfLines={1}>{tx.description || tx.source.replace('_', ' ')}</Text>
                      <Text className="text-neutral-grey text-[9px] font-semibold">{new Date(tx.createdAt).toLocaleString()}</Text>
                    </View>
                  </View>

                  <View className="items-end">
            <Text className={`font-black text-xs flex-row items-center ${isIncome ? 'text-accent-green' : 'text-red-400'}`}>
                      {isCoin ? `${isIncome ? '+' : '-'}${amount.toFixed(0)} 🪙` : `${isIncome ? '+' : '-'}${formatEarnings(amount)}`}
                    </Text>
                    {tx.balanceAfter !== null && (
                      <Text className="text-neutral-grey text-[8px] font-semibold uppercase mt-0.5">Bal: {formatEarnings(tx.balanceAfter)}</Text>
                    )}
                  </View>
                </View>
              );
            });
            })()}
          </View>
        </View>

      </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
}
