 
 
import { create } from 'zustand';
import { apiClient } from '../api/client';
import { Reel } from '../types';

interface Hashtag {
  id: string;
  name: string;
  usageCount: number;
}

interface HashtagState {
  trendingHashtags: Hashtag[];
  hashtagReels: Record<string, Reel[]>;
  searchSuggestions: Hashtag[];
  isFetchingTrending: boolean;
  isFetchingReels: boolean;
  isSearching: boolean;
  fetchTrending: () => Promise<void>;
  fetchReelsByHashtag: (name: string) => Promise<void>;
  searchHashtags: (query: string) => Promise<void>;
}

export const useHashtagStore = create<HashtagState>((set, get) => ({
  trendingHashtags: [],
  hashtagReels: {},
  searchSuggestions: [],
  isFetchingTrending: false,
  isFetchingReels: false,
  isSearching: false,

  fetchTrending: async () => {
    set({ isFetchingTrending: true });
    try {
      const res = await apiClient.get('/hashtags/trending?limit=15');
      set({ trendingHashtags: res.data });
    } catch (err) {
      console.error('Failed to fetch trending hashtags', err);
    } finally {
      set({ isFetchingTrending: false });
    }
  },

  fetchReelsByHashtag: async (name: string) => {
    const cleanName = name.replace('#', '').toLowerCase();
    set({ isFetchingReels: true });
    try {
      const res = await apiClient.get(`/hashtags/${cleanName}/reels`);
      
      const formattedReels = res.data.reels.map((backendReel: any) => ({
        id: backendReel.id,
        creatorId: backendReel.creator.id,
        creatorName: backendReel.creator.name,
        creatorUsername: backendReel.creator.username,
        creatorAvatar: backendReel.creator.avatar || 'https://ui-avatars.com/api/?name=U&background=1D1037&color=fff&size=200',
        creatorIsVerified: backendReel.creator.isVerified || false,
        videoUrl: backendReel.mediaUrl,
        thumbnailUrl: backendReel.thumbnailUrl || backendReel.mediaUrl,
        description: backendReel.description || '',
        musicName: backendReel.musicName || 'Original Audio',
        likesCount: backendReel.likesCount || 0,
        commentsCount: backendReel.commentsCount || 0,
        savesCount: backendReel.savesCount || 0,
        sharesCount: backendReel.sharesCount || 0,
        viewsCount: backendReel.viewsCount || 0,
        isLiked: false, 
        isSaved: false,
        isFollowed: false, 
        category: backendReel.category || 'comedy',
        isMonetized: backendReel.isMonetized !== undefined ? backendReel.isMonetized : true,
        layersData: backendReel.layersData,
      }));

      set((state) => ({
        hashtagReels: {
          ...state.hashtagReels,
          [cleanName]: formattedReels
        }
      }));
    } catch (err) {
      console.error(`Failed to fetch reels for hashtag ${name}`, err);
    } finally {
      set({ isFetchingReels: false });
    }
  },

  searchHashtags: async (query: string) => {
    const cleanQuery = query.replace('#', '').toLowerCase();
    if (!cleanQuery) {
      set({ searchSuggestions: [] });
      return;
    }
    set({ isSearching: true });
    try {
      const res = await apiClient.get(`/hashtags/search?q=${cleanQuery}`);
      set({ searchSuggestions: res.data });
    } catch (err) {
      console.error('Failed to search hashtags', err);
    } finally {
      set({ isSearching: false });
    }
  }
}));
