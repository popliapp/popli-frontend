import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { TransactionItem } from '../types';
import { apiClient } from '../api/client';
import { mmkvStoreStorage } from './storage';

// ==========================================
// WALLET & COINS STORE
// ==========================================

export interface WalletLedgerItem {
  id: string;
  source: string;
  sourceId: string;
  credit: number;
  debit: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}

export interface WithdrawalRequestItem {
  id: string;
  amount: number;
  status: string;
  netPayable: number;
  transactionId: string;
  createdAt: string;
}

interface WalletState {
  coinBalance: number;
  inrEarnings: number;
  pendingBalance: number;
  approvedBalance: number;
  withdrawableBalance: number;
  totalEarnings: number;
  totalWithdrawn: number;
  viewEarnings: number;
  giftEarnings: number;
  referralEarnings: number;
  bonusEarnings: number;
  referralLockedBalance: number;
  ledgers: WalletLedgerItem[];
  withdrawalRequests: WithdrawalRequestItem[];
  transactions: TransactionItem[];
  rechargeCoins: (amount: number, coins: number) => Promise<boolean>;
  sendGiftCoins: (receiverId: string, giftId: string, cost: number, message?: string, reelId?: string) => Promise<boolean>;
  withdrawEarnings: (amount: number, upiId: string) => Promise<boolean>;
  fetchWallet: () => Promise<void>;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      coinBalance: 0,
      inrEarnings: 0,
      pendingBalance: 0,
      approvedBalance: 0,
      withdrawableBalance: 0,
      totalEarnings: 0,
      totalWithdrawn: 0,
    viewEarnings: 0,
      giftEarnings: 0,
      referralEarnings: 0,
      bonusEarnings: 0,
      referralLockedBalance: 0,
      ledgers: [],
      withdrawalRequests: [],
      transactions: [],
rechargeCoins: async (amount, coins) => {
        try {
          console.warn("Using Sandbox Payment Gateway. Real integration (Razorpay/Stripe) is pending.");

          // Optimistic update — instant UI
          const optimisticTxn = {
            id: 'optimistic_' + Date.now(),
            type: 'COIN_RECHARGE',
            amount: amount,
            coinsCredited: coins,
            status: 'success',
            description: `Coin Recharge • ${coins} coins`,
            createdAt: new Date().toISOString(),
          } as unknown as TransactionItem;

          set((state) => ({
            coinBalance: state.coinBalance + coins,
            transactions: [optimisticTxn, ...state.transactions],
          }));

          await apiClient.post('/wallet/recharge', {
            amount: amount,
            coins: coins,
            paymentReference: 'SANDBOX_TXN_' + Date.now(),
          });

          // Background sync — real data replaces optimistic
          get().fetchWallet();
          return true;
        } catch (e: any) {
          console.error("Recharge API failed:", e?.message);
          // Rollback on failure
          set((state) => ({
            coinBalance: state.coinBalance - coins,
            transactions: state.transactions.filter(t => !(t.id as string).startsWith('optimistic_')),
          }));
          return false;
        }
      },

      sendGiftCoins: async (receiverId, giftId, cost, message, reelId) => {
        if (get().coinBalance >= cost) {
          set((state) => ({ coinBalance: state.coinBalance - cost }));
          try {
            await apiClient.post('/gifts/send', {
              receiverId,
              giftId,
              cost,
              message,
              reelId,
            });
            await get().fetchWallet();
            return true;
          } catch (e: any) {
            console.error("Gift API failed:", e?.message);
            set((state) => ({ coinBalance: state.coinBalance + cost }));
            return false;
          }
        }
        return false;
      },

      withdrawEarnings: async (amount, upiId) => {
        if (get().withdrawableBalance >= amount) {
          set((state) => ({ withdrawableBalance: state.withdrawableBalance - amount }));
          try {
            await apiClient.post('/wallet/withdraw', { amount, upiId });
            get().fetchWallet();
            return true;
          } catch (e) {
            console.error("Withdrawal failed:", e);
            set((state) => ({ withdrawableBalance: state.withdrawableBalance + amount }));
            return false;
          }
        }
        return false;
      },

      fetchWallet: async () => {
        try {
          const res = await apiClient.get('/wallet');
          set({
            coinBalance: res.data.coinBalance || 0,
            inrEarnings: res.data.inrEarnings || 0,
            pendingBalance: res.data.pendingBalance || 0,
            approvedBalance: res.data.approvedBalance || 0,
            withdrawableBalance: res.data.withdrawableBalance || 0,
            totalEarnings: res.data.totalEarnings || 0,
            totalWithdrawn: res.data.totalWithdrawn || 0,
           viewEarnings: res.data.viewEarnings || 0,
            giftEarnings: res.data.giftEarnings || 0,
            referralEarnings: res.data.referralEarnings || 0,
            bonusEarnings: res.data.bonusEarnings || 0,
            referralLockedBalance: res.data.referralLockedBalance || 0,
            ledgers: res.data.ledgers || [],
            withdrawalRequests: res.data.withdrawalRequests || [],
            transactions: res.data.transactions || [],
          });
        } catch (e) {
          console.error("Failed to fetch wallet:", e);
        }
      },
    }),
    {
      name: 'popli-wallet-store',
      storage: createJSONStorage(() => mmkvStoreStorage),
    }
  )
);