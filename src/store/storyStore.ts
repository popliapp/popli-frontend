/* eslint-disable @typescript-eslint/no-unused-vars */
 
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Creator, Reel, Comment, Chat, Message, NotificationItem, TransactionItem, GiftType } from '../types';
import { getHaversineDistance } from '../services/geoService';
import { apiClient } from '../api/client';
import { mmkvStoreStorage } from './storage';

// ==========================================
// // 6. STORY STORE
// ==========================================

export interface Story {
  id: string; 
  creatorId: string;
  creatorName?: string;
  creatorUsername?: string;
  mediaUrl: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'PHOTO';
  creatorAvatar?: string;
  viewers: string[];
  viewsCount?: number;
  isCloseFriends: boolean;
  repliesAllowed: boolean;
  reactions: Record<string, string[]>;
  layersData?: any;
  createdAt: string;
  originalStoryId?: string;
  originalOwnerId?: string;
  originalOwnerUsername?: string;
}

interface StoryState {
  stories: Story[];
  storyArchive: Story[];
  addStory: (story: Story) => void;
  markStoryViewed: (storyId: string, viewerId: string) => void;
  addReaction: (storyId: string, viewerId: string, emoji: string) => void;
  fetchStories: () => Promise<void>;
  fetchStoryById: (storyId: string) => Promise<Story | null>;
  deleteStory: (storyId: string) => Promise<void>;
  isFetchingStories: boolean;
  clearCache: () => void;
}

export const useStoryStore = create<StoryState>()(
  persist(
    (set, get) => ({
      stories: [],
      storyArchive: [],
      isFetchingStories: false,
      clearCache: () => set({ stories: [], storyArchive: [], isFetchingStories: false }),
      addStory: (story) => set((state) => ({ stories: [story, ...state.stories] })),
      markStoryViewed: async (storyId, viewerId) => {
        const backupStories = get().stories;
        // Optimistic UI Update
        set((state) => ({
          stories: state.stories.map(s => 
            s.id === storyId && !s.viewers.includes(viewerId) && s.creatorId !== viewerId
              ? { ...s, viewers: [...s.viewers, viewerId] }
              : s
          )
        }));
        // Backend Sync
        try {
          await apiClient.post(`/stories/${storyId}/view`);
        } catch (e) {
          console.error("Failed to mark story as viewed, rolling back:", e);
          set({ stories: backupStories });
        }
      },
      addReaction: async (storyId, viewerId, emoji) => {
        const backupStories = get().stories;
        // Optimistic UI Update
        set((state) => ({
          stories: state.stories.map(s => {
            if (s.id === storyId) {
              const userReactions = s.reactions[viewerId] || [];
              return {
                ...s,
                reactions: {
                  ...s.reactions,
                  [viewerId]: [...userReactions, emoji]
                }
              };
            }
            return s;
          })
        }));
        // Backend Sync
        try {
          await apiClient.post(`/stories/${storyId}/react`, { reaction: emoji });
        } catch (e) {
          console.error("Failed to react to story, rolling back:", e);
          set({ stories: backupStories });
        }
      },
      fetchStories: async () => {
        set({ isFetchingStories: true });
        try {
          const res = await apiClient.get('/stories');
          if (res.data[0]?.viewers?.length > 0) console.log('[VIEWERS-DEBUG]', res.data[0].viewers[0]);
          
   const formatMediaUrl = (url: string) => url || '';

          const formattedStories = res.data.map((s: any) => ({
        id: s.id,
            creatorId: s.creatorId,
            creatorUsername: s.creator?.username || '',
            creatorAvatar: s.creator?.avatar,
            mediaUrl: formatMediaUrl(s.mediaUrl),
            mediaType: s.mediaType || 'IMAGE',
            viewers: (s.viewers || []).map((v: any) => v.user?.username || v.username || v.id || v.userId),
            viewsCount: s._count?.viewers || 0,
            isCloseFriends: s.isCloseFriends,
            repliesAllowed: s.repliesAllowed,
            reactions: {},
            layersData: s.layersData,
            createdAt: s.createdAt || new Date().toISOString(),
            originalStoryId: s.originalStoryId,
            originalOwnerId: s.originalOwnerId,
            originalOwnerUsername: s.originalOwnerUsername
          }));
          set({ stories: formattedStories });
        } catch (error: any) {
          if (error.response?.status === 401) {
            console.log("Session expired. Could not fetch stories. User will be logged out.");
          } else {
            console.error("Error fetching stories:", error.message);
          }
        } finally {
          set({ isFetchingStories: false });
        }
      },
      fetchStoryById: async (storyId) => {
        try {
          const res = await apiClient.get(`/stories/story/${storyId}`);
          const s = res.data;
          
     const formatMediaUrl = (url: string) => url || '';

          const formattedStory: Story = {
           id: s.id,
            creatorId: s.creatorId,
            creatorUsername: s.creator?.username,
            creatorAvatar: s.creator?.avatar,
            mediaUrl: formatMediaUrl(s.mediaUrl),
            mediaType: s.mediaType || 'IMAGE',
            viewers: (s.viewers || []).map((v: any) => v.user?.username || v.username || v.id || v.userId),
            viewsCount: s._count?.viewers || 0,
            isCloseFriends: s.isCloseFriends,
            repliesAllowed: s.repliesAllowed,
            reactions: {},
            layersData: s.layersData,
            createdAt: s.createdAt || new Date().toISOString(),
            originalStoryId: s.originalStoryId,
            originalOwnerId: s.originalOwnerId,
            originalOwnerUsername: s.originalOwnerUsername
          };
          
          // Check if it already exists to avoid duplicates
          const exists = get().stories.some(st => st.id === formattedStory.id);
          if (!exists) {
            set((state) => ({ stories: [formattedStory, ...state.stories] }));
          }
          return formattedStory;
        } catch (error) {
          console.error("Error fetching single story:", error);
          return null;
        }
      },
      deleteStory: async (storyId) => {
        const backupStories = get().stories;
        set((state) => ({
          stories: state.stories.filter(s => s.id !== storyId)
        }));
        try {
          await apiClient.delete(`/stories/${storyId}`);
        } catch (error) {
          console.error("Failed to delete story, rolling back:", error);
          set({ stories: backupStories });
        }
      }
    }),
    {
     name: 'popli-story-store-v2',
      storage: createJSONStorage(() => mmkvStoreStorage),
      partialize: (state) => ({
        stories: state.stories,
        storyArchive: state.storyArchive
      })
    }
  )
);
