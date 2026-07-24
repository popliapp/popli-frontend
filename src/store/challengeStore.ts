 
 
import { create } from 'zustand';
import { apiClient } from '../api/client';

export interface Challenge {
  id: string;
  title: string;
  description: string;
  hashtagName: string | null;
  bannerUrl: string | null;
  rules: string | null;
  type: string;
  rewardPool: number;
  status: string;
  participantCount: number;
  startDate: string;
  endDate: string;
}

interface ChallengeState {
  activeChallenges: Challenge[];
  isLoading: boolean;
  fetchActiveChallenges: () => Promise<void>;
  joinChallenge: (id: string) => Promise<boolean>;
}

export const useChallengeStore = create<ChallengeState>((set) => ({
  activeChallenges: [],
  isLoading: false,

  fetchActiveChallenges: async () => {
    set({ isLoading: true });
    try {
      const res = await apiClient.get('/challenges?limit=5');
      set({ activeChallenges: res.data || [] });
    } catch (error) {
      console.error('Failed to fetch challenges', error);
    } finally {
      set({ isLoading: false });
    }
  },

  joinChallenge: async (id: string) => {
    try {
      await apiClient.post(`/challenges/${id}/join`);
      return true;
    } catch (error) {
      console.error('Failed to join challenge', error);
      return false;
    }
  }
}));
