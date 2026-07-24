/* eslint-disable @typescript-eslint/no-unused-vars */
 
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Creator, Reel, Comment, Chat, Message, NotificationItem, TransactionItem, GiftType } from '../types';
import { getHaversineDistance } from '../services/geoService';
import { apiClient } from '../api/client';
import { mmkvStoreStorage } from './storage';
import { useAuthStore } from './authStore';

// ==========================================
// // 2. KYC & ONBOARDING STATE STORE
// ==========================================

interface KYCState {
  currentStep: number;
  fullName: string;
  dob: string;
  city: string;
  address: string;
  category: string;
  panNumber: string;
  aadharNumber: string;
  upiId: string;
  bankAccount: string;
  ifscCode: string;
  accountType: 'Savings' | 'Current';
  isPanVerified: boolean;
  isAadharVerified: boolean;
  isUpiLinked: boolean;
  isBankLinked: boolean;
  kycCompleted: boolean;
  updateKYCField: (fields: Partial<Omit<KYCState, 'updateKYCField' | 'setKYCStep' | 'verifyPAN' | 'verifyAadhar' | 'linkUPI' | 'linkBank' | 'resetKYC'>>) => void;
  setKYCStep: (step: number) => void;
  verifyPAN: () => Promise<boolean>;
  verifyAadhar: () => Promise<boolean>;
  linkUPI: () => Promise<boolean>;
  linkBank: () => Promise<boolean>;
  submitKYCToBackend: () => Promise<boolean>;
  fetchKycStatus: () => Promise<void>;
  resetKYC: () => void;
}

export const useKYCStore = create<KYCState>()(
  persist(
    (set, get) => ({
      currentStep: 1,
      fullName: '',
      dob: '',
      city: '',
      address: '',
      category: 'comedy',
      panNumber: '',
      aadharNumber: '',
      upiId: '',
      bankAccount: '',
      ifscCode: '',
      accountType: 'Savings',
      isPanVerified: false,
      isAadharVerified: false,
      isUpiLinked: false,
      isBankLinked: false,
      kycCompleted: false,
      updateKYCField: (fields) => set(fields),
      setKYCStep: (step) => set({ currentStep: step }),
      verifyPAN: async () => {
        const isValid = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(get().panNumber.toUpperCase());
        if (isValid) {
          await new Promise((r) => setTimeout(r, 1200)); // Simulate animation
          set({ isPanVerified: true });
          return true;
        }
        return false;
      },
      verifyAadhar: async () => {
        const isValid = /^[0-9]{12}$/.test(get().aadharNumber.replace(/\s/g, ''));
        if (isValid) {
          await new Promise((r) => setTimeout(r, 1200));
          set({ isAadharVerified: true });
          return true;
        }
        return false;
      },
      linkUPI: async () => {
        const isValid = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/.test(get().upiId);
        if (isValid) {
          await new Promise((r) => setTimeout(r, 1000));
          set({ isUpiLinked: true });
          return true;
        }
        return false;
      },
      linkBank: async () => {
        const isAcValid = get().bankAccount.length >= 9 && get().bankAccount.length <= 18;
        const isIfscValid = /^[A-Z]{4}0[A-Z0-9]{6}$/.test(get().ifscCode.toUpperCase());
        if (isAcValid && isIfscValid) {
          await new Promise((r) => setTimeout(r, 1000));
          set({ isBankLinked: true, kycCompleted: true });
          useAuthStore.getState().updateProfile({ isVerified: true }); // Unlock verified gold badge!
          return true;
        }
        return false;
      },
      submitKYCToBackend: async () => {
        try {
          const state = get();
          await apiClient.post('/kyc/submit', {
            fullName: state.fullName,
            dob: state.dob,
            address: state.address,
            panNumber: state.panNumber,
            aadharNumber: state.aadharNumber,
            upiId: state.upiId,
            bankAccount: state.bankAccount,
            ifscCode: state.ifscCode,
            accountType: state.accountType
          });
          return true;
        } catch (e) {
          console.error("Failed to submit KYC to backend:", e);
          return false;
        }
      },
      fetchKycStatus: async () => {
        try {
          const res = await apiClient.get('/kyc/status');
          const status = res.data?.status?.toUpperCase();
          if (status === 'APPROVED' || status === 'PENDING') {
            set({ kycCompleted: true, currentStep: 3 });
            useAuthStore.getState().updateProfile({ isVerified: true });
          }
        } catch (e) {
          console.error("Failed to fetch KYC status:", e);
        }
      },
      resetKYC: () =>
        set({
          currentStep: 1,
          fullName: '',
          dob: '',
          city: '',
          address: '',
          category: 'comedy',
          panNumber: '',
          aadharNumber: '',
          upiId: '',
          bankAccount: '',
          ifscCode: '',
          accountType: 'Savings',
          isPanVerified: false,
          isAadharVerified: false,
          isUpiLinked: false,
          isBankLinked: false,
          kycCompleted: false
        })
    }),
    {
      name: 'popli-kyc-store',
      storage: createJSONStorage(() => mmkvStoreStorage)
    }
  )
);

