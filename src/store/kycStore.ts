import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { apiClient } from '../api/client';
import { mmkvStoreStorage } from './storage';
import { useAuthStore } from './authStore';

interface KYCState {
  currentStep: number;
  fullName: string;
  dob: string;
  city: string;
  address: string;
  category: string;
  panNumber: string;
  aadharNumber: string;
  aadharRefId: string;
  upiId: string;
  bankAccount: string;
  ifscCode: string;
  accountType: 'Savings' | 'Current';
  isPanVerified: boolean;
  isAadharVerified: boolean;
  isAadharOtpSent: boolean;
  isUpiLinked: boolean;
  isBankLinked: boolean;
  kycCompleted: boolean;
  updateKYCField: (fields: Partial<Omit<KYCState, 'updateKYCField' | 'setKYCStep' | 'verifyPAN' | 'initiateAadharOtp' | 'verifyAadharOtp' | 'verifyUPI' | 'verifyBank' | 'submitKYCToBackend' | 'fetchKycStatus' | 'resetKYC'>>) => void;
  setKYCStep: (step: number) => void;
  verifyPAN: () => Promise<{ success: boolean; error?: string }>;
  initiateAadharOtp: () => Promise<{ success: boolean; error?: string }>;
  verifyAadharOtp: (otp: string) => Promise<{ success: boolean; error?: string }>;
  verifyUPI: () => Promise<{ success: boolean; error?: string }>;
  verifyBank: () => Promise<{ success: boolean; error?: string }>;
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
      aadharRefId: '',
      upiId: '',
      bankAccount: '',
      ifscCode: '',
      accountType: 'Savings',
      isPanVerified: false,
      isAadharVerified: false,
      isAadharOtpSent: false,
      isUpiLinked: false,
      isBankLinked: false,
      kycCompleted: false,

      updateKYCField: (fields) => set(fields),
      setKYCStep: (step) => set({ currentStep: step }),

      verifyPAN: async () => {
        try {
          const state = get();
          await apiClient.post('/kyc/pan/verify', {
            panNumber: state.panNumber.trim().toUpperCase(),
            fullName: state.fullName.trim(),
          });
          set({ isPanVerified: true });
          return { success: true };
        } catch (e: any) {
          const error = e?.response?.data?.message ?? 'PAN verification failed. Please try again.';
          return { success: false, error };
        }
      },

      initiateAadharOtp: async () => {
        try {
          const state = get();
          const res = await apiClient.post('/kyc/aadhaar/initiate-otp', {
            aadharNumber: state.aadharNumber.replace(/\s/g, ''),
          });
          set({ isAadharOtpSent: true, aadharRefId: res.data.refId });
          return { success: true };
        } catch (e: any) {
          const error = e?.response?.data?.message ?? 'Failed to send OTP. Please try again.';
          return { success: false, error };
        }
      },

      verifyAadharOtp: async (otp: string) => {
        try {
          const state = get();
          await apiClient.post('/kyc/aadhaar/verify-otp', {
            refId: state.aadharRefId,
            otp: otp.trim(),
            fullName: state.fullName.trim(),
          });
          set({ isAadharVerified: true, isAadharOtpSent: false });
          return { success: true };
        } catch (e: any) {
          const error = e?.response?.data?.message ?? 'OTP verification failed. Please try again.';
          return { success: false, error };
        }
      },

      verifyUPI: async () => {
        try {
          const state = get();
          await apiClient.post('/kyc/upi/verify', { upiId: state.upiId.trim() });
          set({ isUpiLinked: true });
          return { success: true };
        } catch (e: any) {
          const error = e?.response?.data?.message ?? 'UPI verification failed.';
          return { success: false, error };
        }
      },

      verifyBank: async () => {
        try {
          const state = get();
          await apiClient.post('/kyc/bank/verify', {
            bankAccount: state.bankAccount.trim(),
            ifscCode: state.ifscCode.trim().toUpperCase(),
          });
          set({ isBankLinked: true });
          return { success: true };
        } catch (e: any) {
          const error = e?.response?.data?.message ?? 'Bank verification failed.';
          return { success: false, error };
        }
      },

      submitKYCToBackend: async () => {
        try {
          const state = get();
          await apiClient.post('/kyc/submit', {
            fullName: state.fullName,
            dob: state.dob,
            address: state.address,
            upiId: state.upiId,
            bankAccount: state.bankAccount,
            ifscCode: state.ifscCode,
            accountType: state.accountType,
          });
          set({ kycCompleted: true });
          useAuthStore.getState().updateProfile({ isVerified: true });
          return true;
        } catch (e) {
          console.error('Failed to submit KYC:', e);
          return false;
        }
      },

      fetchKycStatus: async () => {
        try {
          const res = await apiClient.get('/kyc/status');
          const data = res.data;
          const status = data?.status?.toUpperCase();
          set({
            isPanVerified: data.isPanVerified ?? false,
            isAadharVerified: data.isAadharVerified ?? false,
            isUpiLinked: data.isUpiLinked ?? false,
            isBankLinked: data.isBankLinked ?? false,
            fullName: data.fullName || '',
            dob: data.dob || '',
            address: data.address || '',
          });
          if (status === 'APPROVED' || status === 'PENDING') {
            set({ kycCompleted: true });
            if (status === 'APPROVED') {
              useAuthStore.getState().updateProfile({ isVerified: true });
            }
          }
        } catch (e) {
          console.error('Failed to fetch KYC status:', e);
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
          aadharRefId: '',
          upiId: '',
          bankAccount: '',
          ifscCode: '',
          accountType: 'Savings',
          isPanVerified: false,
          isAadharVerified: false,
          isAadharOtpSent: false,
          isUpiLinked: false,
          isBankLinked: false,
          kycCompleted: false,
        }),
    }),
    {
      name: 'popli-kyc-store',
      storage: createJSONStorage(() => mmkvStoreStorage),
    }
  )
);