/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-require-imports */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Creator, Reel, Comment, Chat, Message, NotificationItem, TransactionItem, GiftType } from '../types';
import { getHaversineDistance } from '../services/geoService';
import { apiClient } from '../api/client';
import { mmkvStoreStorage } from './storage';

// ==========================================
// // 1. AUTH & PREFERENCES STORE
// ==========================================

interface AuthState {
  isLoggedIn: boolean;
  isOnboarded: boolean;
  onboardingStep: 'interests' | 'location' | 'permissions' | 'personalization-loader' | 'profile-setup' | 'done';
  userProfile: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    bio: string;
    city: string;
   category: string;
    gender?: string;
    followersCount: number;
    followingCount: number;
    giftsReceivedCount: number;
    wallet?: { totalEarnings: number };
    coinsEarned?: number;
    isVerified: boolean;
    isProfileComplete?: boolean;
    email?: string;
    phone?: string;
    socialLinks?: { title: string; url: string }[];
  };
  followingIds: string[];
  theme: 'dark' | 'light';
  language: 'English' | 'Hindi' | 'Bengali' | 'Tamil';
  notificationsEnabled: boolean;
  isFirstLogin: boolean;
  setLogin: (status: boolean) => void;
  setOnboardingComplete: (status: boolean) => void;
  setFirstLogin: (status: boolean) => void;
  setOnboardingStep: (step: AuthState['onboardingStep']) => void;
  updateProfile: (profile: Partial<AuthState['userProfile']>) => Promise<{ success: boolean; error?: string }>;
  fetchProfile: () => Promise<void>;
  toggleTheme: () => void;
  setLanguage: (lang: AuthState['language']) => void;
  toggleNotifications: () => void;
  toggleFollow: (creatorId: string) => void;
  logout: () => void;

  token: string | null;
  setToken: (token: string | null) => void;
  blockedUsers: Creator[];
  fetchBlockedUsers: () => Promise<void>;
  fetchFollowingIds: (userId: string) => Promise<void>;
  toggleBlock: (creatorId: string) => Promise<void>;
  updatePreferences: (prefs: any) => Promise<void>;
  preferences: {
    isPrivateProfile: boolean;
  };
}

const inFlightFollows = new Set<string>();

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      isOnboarded: false,
      onboardingStep: 'interests' as const,
      token: null,
      userProfile: {
        id: '',
        name: '',
        username: '',
        avatar: '',
        bio: '',
        city: '',
        category: '',
        followersCount: 0,
        followingCount: 0,
        giftsReceivedCount: 0,
        isVerified: false
      },
      preferences: {
        isPrivateProfile: false
      },
      blockedUsers: [],
      followingIds: [],
      theme: 'dark',
      language: 'English',
      notificationsEnabled: true,
      isFirstLogin: true,

     setToken: (token) => set({ token }),
      setLogin: (status) => set({ isLoggedIn: status }),
      setOnboardingComplete: (status) => set({ isOnboarded: status }),
      setFirstLogin: (status) => set({ isFirstLogin: status }),
      setOnboardingStep: (step) => set({ onboardingStep: step }),
updateProfile: async (profile) => {
  set((state) => ({ userProfile: { ...state.userProfile, ...profile } }));
  try {
    const { email, phone, manualComplete, ...safeProfile } = profile as any;
    // Only send to backend if there's something worth saving
    const res = await apiClient.put('/users/me', safeProfile);

    // Only mark profile complete when explicitly requested by the final profile-setup screen
    if ((profile as any).manualComplete === true) {
      set((state) => ({ userProfile: { ...state.userProfile, isProfileComplete: true } }));
    }

          // Also update the feedStore so reels instantly show the new name/username/avatar
           
          const { useFeedStore } = require('./feedStore');
          useFeedStore.getState().updateCreatorInfo(useAuthStore.getState().userProfile.id, profile);
          
          return { success: true };
        } catch (e: any) {
          const errorMessage = e.response?.data?.message || e.message || 'Failed to update profile';
          console.error("Failed to update profile to backend:", errorMessage);
          return { success: false, error: errorMessage };
        }
      },
fetchProfile: async () => {
        try {
          const res = await apiClient.get('/users/me');
          if (res.data) {
            const currentIsProfileComplete = useAuthStore.getState().userProfile.isProfileComplete;
            set((state) => ({
              userProfile: {
                ...state.userProfile,
                ...res.data,
                isProfileComplete: currentIsProfileComplete || res.data.isProfileComplete || false,
              }
            }));
          }
        } catch (error: any) {
          if (error?.response?.status === 401) {
            const { performLogout } = require('../utils/logout');
            await performLogout('Your session has expired. Please sign in again.');
          } else {
            console.error('Failed to fetch fresh profile data:', error);
          }
        }
      },
      updatePreferences: async (prefs) => {
        const backupPrefs = get().preferences;
        set((state) => ({ preferences: { ...state.preferences, ...prefs } }));
        try {
          await apiClient.put('/users/me/preferences', prefs);
        } catch (e: any) {
          console.error("Failed to update preferences, rolling back:", e.response?.data || e.message);
          set({ preferences: backupPrefs });
        }
      },
      fetchBlockedUsers: async () => {
        try {
          const res = await apiClient.get('/social/blocked');
          set({ blockedUsers: res.data });
        } catch (error) {
          console.error("Failed to fetch blocked users:", error);
        }
      },
     fetchFollowingIds: async (userId: string) => {
        if (!userId || !get().token) return;
        try {
          const res = await apiClient.get(`/social/${userId}/following`);
          const ids = res.data.filter((f: any) => f.following?.id).map((f: any) => f.following.id);
          set({ followingIds: ids });
        } catch (error) {
          console.error("Failed to fetch following ids:", error);
        }
      },
      toggleBlock: async (creatorId) => {
        // Optimistic UI update for immediate feedback
        set((state) => {
          const isBlocked = state.blockedUsers.some(u => u.id === creatorId);
          if (isBlocked) {
            return { blockedUsers: state.blockedUsers.filter(u => u.id !== creatorId) };
          } else {
            // Add a mock object so it appears instantly; fetchBlockedUsers will correct it later
            return { blockedUsers: [...state.blockedUsers, { id: creatorId, name: 'Blocked User', username: 'blocked', avatar: 'https://ui-avatars.com/api/?name=U&background=1D1037&color=fff&size=200' } as any] };
          }
        });

        try {
          await apiClient.post(`/social/block/${creatorId}`);
          get().fetchBlockedUsers(); // Refresh list to get accurate user details
        } catch (error) {
          console.warn("Failed to toggle block (silenced):", error);
          get().fetchBlockedUsers(); // Revert on failure
        }
      },
      toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
      setLanguage: (lang) => set({ language: lang }),
      toggleNotifications: () => set((state) => ({ notificationsEnabled: !state.notificationsEnabled })),
      toggleFollow: async (creatorId) => {
        const state = useAuthStore.getState();
        
        // Prevent concurrent identical requests
        if (inFlightFollows.has(creatorId)) return;
        inFlightFollows.add(creatorId);

        const isFollowing = state.followingIds.includes(creatorId);
        
        // Optimistic UI update
        const newFollowing = isFollowing
          ? state.followingIds.filter((id) => id !== creatorId)
          : [...state.followingIds, creatorId];
          
        set({
          followingIds: newFollowing,
          userProfile: {
            ...state.userProfile,
            followingCount: state.userProfile.followingCount + (isFollowing ? -1 : 1)
          }
        });

        // API Call to sync with backend
        try {
          console.log(`Attempting to toggle follow for creator: ${creatorId}`);
          await apiClient.post(`/social/follow/${creatorId}`);
          console.log(`Successfully toggled follow on backend for: ${creatorId}`);
        } catch (error: any) {
          console.error("Failed to toggle follow on backend:", error?.message || error);
          // Revert local state on failure
          set({
            followingIds: state.followingIds,
            userProfile: {
              ...state.userProfile,
              followingCount: state.userProfile.followingCount // Restore original
            }
          });
        } finally {
          inFlightFollows.delete(creatorId);
        }
      },
logout: async () => {
        // 1. INSTANT UI LOGOUT (Optimistic update to prevent lag)
        set({ 
          isLoggedIn: false,
          isOnboarded: true,  // keep onboarded so login screen shows (not onboarding splash)
          onboardingStep: 'interests', // reset step for next signup
          followingIds: [], 
          token: null,
          isFirstLogin: true, // reset so next login goes through normal flow
          userProfile: {
            id: '',
            name: '',
            username: '',
            avatar: '',
            bio: '',
            city: '',
            category: '',
            followersCount: 0,
            followingCount: 0,
            giftsReceivedCount: 0,
            isVerified: false,
            isProfileComplete: false, // CRITICAL: clear this
          },
          blockedUsers: [],
          preferences: { isPrivateProfile: false }
        });

        // Trigger feedStore wipe instantly
        try {
           
          const { useFeedStore } = require('./feedStore');
          useFeedStore.getState().clearCache();
        } catch(e) {}
        
        // Trigger storyStore wipe instantly
        try {
           
          const { useStoryStore } = require('./storyStore');
          useStoryStore.getState().clearCache();
        } catch(e) {}

        // 2. BACKGROUND NETWORK CLEANUP
        try {
          // Sign out from Firebase
          const { firebaseAuth } = require('../lib/firebase');
        const { signOut } = require('firebase/auth');
await signOut(firebaseAuth).catch(() => {});

          // Sign out from Google (Native Session)
          try {
            const { GoogleSignin } = require('@react-native-google-signin/google-signin');
            await GoogleSignin.signOut();
          } catch (googleError) {
            console.log('Google signout error (might not be logged in via Google):', googleError);
          }

          const SecureStore = require('expo-secure-store');
          const refreshToken = await SecureStore.getItemAsync('refreshToken');
          if (refreshToken) {
            await apiClient.post('/auth/logout', { refreshToken }).catch(() => {});
            await SecureStore.deleteItemAsync('refreshToken');
          }
        } catch (e) {
          console.error('Logout error', e);
        }
      }
    }),
    {
      name: 'popli-auth-store',
      storage: createJSONStorage(() => mmkvStoreStorage)
    }
  )
);
