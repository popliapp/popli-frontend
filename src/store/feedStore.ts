/* eslint-disable @typescript-eslint/no-unused-vars */
 
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Creator, Reel, Comment, Chat, Message, NotificationItem, TransactionItem, GiftType } from '../types';
import { getHaversineDistance } from '../services/geoService';
import { apiClient } from '../api/client';
import { mmkvStoreStorage } from './storage';
import { getDefaultAvatar } from '../utils';

// ==========================================
// // 4. VIDEO FEED & DYNAMIC REELS STORE
// ==========================================

interface FeedState {
  creators: Creator[];
  reels: Reel[];
  comments: Comment[];
  moodFilter: string; // 'comedy' | 'motivation' | 'music' | 'all' etc
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  gpsCity: string | null;
  nearbyEnabled: boolean;
  setGPS: (lat: number, lon: number, city: string) => void;
  setNearbyEnabled: (enabled: boolean) => void;
  toggleLikeReel: (reelId: string) => void;
  toggleSaveReel: (reelId: string) => void;
  addLocalReel: (reel: Reel) => void;
  addComment: (comment: Omit<Comment, 'id' | 'createdAt' | 'likesCount'>) => Promise<any>;
  toggleCommentLike: (commentId: string) => void;
  setMoodFilter: (filter: string) => void;
  registerValidView: (reelId: string, creatorUsername: string) => void;
  fetchReels: (cursor?: string | null, limit?: number, category?: string) => Promise<void>;
  fetchExploreReels: (page?: number, limit?: number, category?: string) => Promise<void>;
  fetchCreators: () => Promise<void>;
  likedReels: Reel[];
  watchHistory: Reel[];
  userReels: Reel[];
  profileReels: Record<string, Reel[]>;
  fetchLikedReels: () => Promise<void>;
  fetchWatchHistory: () => Promise<void>;
  fetchUserReels: (userId: string) => Promise<void>;
  setProfileReels: (username: string, reels: Reel[]) => void;
  fetchFollowingReels: (page?: number, limit?: number) => Promise<void>;
  updateCreatorInfo: (creatorId: string, updates: Partial<{name: string, username: string, avatar: string}>) => void;
  deleteReel: (reelId: string) => Promise<void>;
  isGlobalMuted: boolean;
  toggleGlobalMute: () => void;
  seenReelIds: string[];
  clearSeenReels: () => void;
  homeNextCursor: string | null;
  exploreNextCursor: string | null;
  homeFeedReels: Reel[];
  isFetchingFeed: boolean;
  clearCache: () => void;
  _inFlightComments?: string[];
}
const inFlightLikes = new Set<string>();
const inFlightComments = new Set<string>();

export const useFeedStore = create<FeedState>()(
  persist(
    (set, get) => ({
     creators: [],
      reels: [],
      homeFeedReels: [],
      likedReels: [],
      watchHistory: [],
      userReels: [],
      profileReels: {},
      comments: [],
      seenReelIds: [],
      homeNextCursor: null,
      exploreNextCursor: null,
      moodFilter: 'all',
      gpsLatitude: null,
      gpsLongitude: null,
      gpsCity: null,
      nearbyEnabled: false,
      isGlobalMuted: false,
      isFetchingFeed: false,
      clearSeenReels: () => set({ seenReelIds: [] }),
    clearCache: () => set({
        reels: [],
        homeFeedReels: [],
        userReels: [],
        likedReels: [],
        profileReels: {},
        watchHistory: [],
        seenReelIds: [],
        homeNextCursor: null,
        exploreNextCursor: null,
        isFetchingFeed: false
      }),
      toggleGlobalMute: () => set((state) => ({ isGlobalMuted: !state.isGlobalMuted })),
      setGPS: (lat, lon, city) => {
        set({ gpsLatitude: lat, gpsLongitude: lon, gpsCity: city });
        // Recalculate distances for all creators dynamically
        set((state) => {
          const updatedCreators = state.creators.map((c) => {
            if (!c.location?.latitude || !c.location?.longitude) return c;
            const distance = getHaversineDistance(lat, lon, c.location.latitude, c.location.longitude);
            return { ...c, distanceKm: distance };
          });
          const updatedReels = state.reels.map((r) => {
            if (!r.location?.latitude || !r.location?.longitude) return r;
            const distance = getHaversineDistance(lat, lon, r.location.latitude, r.location.longitude);
            return { ...r, distanceKm: distance };
          });
          return { creators: updatedCreators, reels: updatedReels };
        });
      },
      setNearbyEnabled: (enabled) => set({ nearbyEnabled: enabled }),
    toggleLikeReel: async (reelId) => {
        const backupReels = get().reels;
        const backupHomeFeedReels = get().homeFeedReels || [];
        const backupUserReels = get().userReels;
        const backupLikedReels = get().likedReels;
        const backupWatchHistory = get().watchHistory;
        const backupProfileReels = get().profileReels;

        const updateReelArray = (arr: Reel[]) => arr.map(r => {
          if (r.id === reelId) {
            const newLiked = !r.isLiked;
            return {
              ...r,
              isLiked: newLiked,
              likesCount: Math.max(0, r.likesCount + (newLiked ? 1 : -1))
            };
          }
          return r;
        });

        // Optimistic UI update — instant
        set((state) => {
          const newProfileReels: Record<string, Reel[]> = {};
          Object.keys(state.profileReels).forEach(key => {
            newProfileReels[key] = updateReelArray(state.profileReels[key]);
          });

          return { 
            reels: updateReelArray(state.reels),
            homeFeedReels: updateReelArray(state.homeFeedReels || []),
            userReels: updateReelArray(state.userReels),
            likedReels: updateReelArray(state.likedReels),
            watchHistory: updateReelArray(state.watchHistory),
            profileReels: newProfileReels
          };
        });

        // Backend sync — fire and forget, rollback only on error
        apiClient.post(`/reels/${reelId}/like`).catch((e) => {
          console.error("Failed to toggle like, rolling back:", e);
          set({ 
            reels: backupReels,
            homeFeedReels: backupHomeFeedReels,
            userReels: backupUserReels,
            likedReels: backupLikedReels,
            watchHistory: backupWatchHistory,
            profileReels: backupProfileReels
          });
        });
      },
      toggleSaveReel: async (reelId) => {
      const backupReels = get().reels;
        const backupHomeFeedReels = get().homeFeedReels || [];
        const backupUserReels = get().userReels;
        const backupLikedReels = get().likedReels;
        const backupWatchHistory = get().watchHistory;
        const backupProfileReels = get().profileReels;

        const updateReelArray = (arr: Reel[]) => arr.map(r => {
          if (r.id === reelId) {
            const newSaved = !r.isSaved;
            return {
              ...r,
              isSaved: newSaved,
              savesCount: Math.max(0, r.savesCount + (newSaved ? 1 : -1))
            };
          }
          return r;
        });

        // Optimistic UI update
        set((state) => {
          const newProfileReels: Record<string, Reel[]> = {};
          Object.keys(state.profileReels).forEach(key => {
            newProfileReels[key] = updateReelArray(state.profileReels[key]);
          });

          return { 
            reels: updateReelArray(state.reels),
            userReels: updateReelArray(state.userReels),
            likedReels: updateReelArray(state.likedReels),
            watchHistory: updateReelArray(state.watchHistory),
            profileReels: newProfileReels
          };
        });

        // Backend sync
        try {
          await apiClient.post(`/reels/${reelId}/save`);
        } catch (e) {
          console.error("Failed to toggle save, rolling back:", e);
          set({ 
            reels: backupReels,
            homeFeedReels: backupHomeFeedReels,
            userReels: backupUserReels,
            likedReels: backupLikedReels,
            watchHistory: backupWatchHistory,
            profileReels: backupProfileReels
          });
        }
      },
  addLocalReel: (reel) =>
        set((state) => ({
          reels: state.reels.some(r => r.id === reel.id) ? state.reels : [reel, ...state.reels],
          userReels: state.userReels.some(r => r.id === reel.id) ? state.userReels : [reel, ...state.userReels],
        })),
      addComment: async (comment) => {
        const lockKey = `${comment.reelId}-${comment.text}`;
        if (inFlightComments.has(lockKey)) return;
        inFlightComments.add(lockKey);

        // Backend sync first to get the actual ID
        try {
          const payload: any = { text: comment.text };
          if (comment.parentId) payload.parentId = comment.parentId;
          const res = await apiClient.post(`/reels/${comment.reelId}/comments`, payload);
          const savedComment = res.data;
          
          set((state) => {
            const formattedComment: Comment = {
              id: savedComment.id,
              reelId: savedComment.reelId,
              userId: savedComment.userId,
              text: savedComment.text,
              likesCount: 0,
              createdAt: 'Just now',
              user: savedComment.user,
              parentId: savedComment.parentId,
              isLiked: false,
              replies: [],
            };

            // If it's a reply, nest it under the parent locally
            if (formattedComment.parentId) {
              return {
                comments: state.comments.map(c => {
                  if (c.id === formattedComment.parentId) {
                    return { ...c, replies: [...(c.replies || []), formattedComment] };
                  }
                  return c;
                }),
                reels: state.reels.map((r) => r.id === comment.reelId ? { ...r, commentsCount: r.commentsCount + 1 } : r)
              };
            }

            return {
              comments: [formattedComment, ...state.comments],
              reels: state.reels.map((r) => r.id === comment.reelId ? { ...r, commentsCount: r.commentsCount + 1 } : r)
            };
          });
          
          return savedComment;
        } catch (e) {
          console.error("Failed to add comment to backend:", e);
          throw e;
        } finally {
          inFlightComments.delete(`${comment.reelId}-${comment.text}`);
        }
      },
      toggleCommentLike: async (commentId) => {
        const backupComments = get().comments;

        set((state) => {
          // Recursive function to toggle like in potentially nested comments
          const toggleInComments = (commentsList: Comment[]): Comment[] => {
            return commentsList.map(c => {
              if (String(c.id) === String(commentId)) {
                const newLiked = !c.isLiked;
                return {
                  ...c,
                  isLiked: newLiked,
                  likesCount: Math.max(0, c.likesCount + (newLiked ? 1 : -1))
                };
              }
              if (c.replies && c.replies.length > 0) {
                return { ...c, replies: toggleInComments(c.replies) };
              }
              return c;
            });
          };

          return { comments: toggleInComments(state.comments) };
        });

        // Backend Sync
        if (!String(commentId).startsWith('temp-')) {
          try {
            await apiClient.post(`/reels/comments/${commentId}/like`);
          } catch (e) {
            console.error("Failed to toggle comment like, rolling back:", e);
            set({ comments: backupComments });
          }
        }
      },
      setMoodFilter: (filter) => set({ moodFilter: filter }),
registerValidView: async (reelId, creatorUsername) => {
        set((state) => {
          let newSeenIds = [...state.seenReelIds];
          if (!newSeenIds.includes(reelId)) {
            newSeenIds.push(reelId);
            if (newSeenIds.length > 50) newSeenIds.shift();
          }

          const bumpViews = (arr: Reel[]) =>
            arr.map(r => r.id === reelId ? { ...r, viewsCount: (r.viewsCount || 0) + 1 } : r);

          return {
            reels: bumpViews(state.reels),
            homeFeedReels: bumpViews(state.homeFeedReels || []),
            userReels: bumpViews(state.userReels),
            seenReelIds: newSeenIds,
          };
        });

        try {
          await apiClient.post(`/reels/${reelId}/view`, { watchDuration: 10000 });
        } catch (e) {
          console.error('Failed to register view:', e);
        }
      },
      fetchReels: async (cursor = null, limit = 10, category = 'all') => {
        if (get().isFetchingFeed) return;
        set({ isFetchingFeed: true });
        
        try {
          let cursorParam = cursor ? `&cursor=${cursor}` : '';
          console.log(`[FEED STORE] fetchReels API Request: cursor=${cursor}`);
          let res = await apiClient.get(`/reels/feed?limit=${limit}&category=${category}${cursorParam}&_t=${Date.now()}`);
          
     const formatVideoUrl = (url: string) => url || '';

          const fetchedReels = res.data.reels.map((r: any) => ({
            id: r.id,
            creatorId: r.creatorId,
            mediaType: r.mediaType,
            creatorUsername: r.creator?.username || 'user',
            creatorAvatar: r.creator?.avatar || getDefaultAvatar(r.creator?.username || 'user'),
            creatorIsVerified: r.creator?.isVerified || false,
            videoUrl: formatVideoUrl(r.mediaUrl),
            thumbnailUrl: r.thumbnailUrl || formatVideoUrl(r.mediaUrl), 
            description: r.description || '',
            musicName: r.musicName || 'Original Audio',
            likesCount: r.likesCount || 0,
            commentsCount: r.commentsCount || 0,
            savesCount: r.savesCount || 0,
            sharesCount: r.sharesCount || 0,
            viewsCount: r.viewsCount || 0,
            isLiked: false, 
            isSaved: false,
            category: r.category || 'lifestyle',
            isMonetized: r.isMonetized !== undefined ? r.isMonetized : true,
            layersData: r.layersData,
            createdAt: r.createdAt,
            location: r.location || (r.city ? { city: r.city, latitude: r.latitude, longitude: r.longitude } : null)
          }));

          set((state) => {
            const existingIds = new Set(state.reels.map(r => r.id));
            const newReels = fetchedReels.filter((r: any) => !existingIds.has(r.id));
            const finalReels = cursor ? [...state.reels, ...newReels] : fetchedReels;
            
            console.log(`[FEED STORE] Home State Update: cursor=${cursor}, newCursor=${res.data.nextCursor}`);
            
            return {
              reels: finalReels,
              homeNextCursor: res.data.nextCursor
            };
          });
        } catch (error) {
          console.error("Error fetching reels:", error);
        } finally {
          set({ isFetchingFeed: false });
        }
      },
      fetchExploreReels: async (page = 1, limit = 10, category = 'all') => {
        if (get().isFetchingFeed) return;
        set({ isFetchingFeed: true });
        
        try {
          const currentReels = get().reels;
          const seenIds = get().seenReelIds;
          
          let allExcludeIds = page === 1 ? [...seenIds] : [...seenIds, ...currentReels.map(r => r.id)];
          let excludeIdsParam = allExcludeIds.slice(-50).join(',');
          
          console.log(`[FEED STORE] fetchExploreReels API Request: page=${page}`);
          let res = await apiClient.get(`/reels/explore?page=${page}&limit=${limit}&category=${category}&excludeIds=${excludeIdsParam}&_t=${Date.now()}`);
          
          if (res.data.length === 0 && seenIds.length > 0) {
            get().clearSeenReels();
            excludeIdsParam = page === 1 ? '' : currentReels.map(r => r.id).join(',');
            res = await apiClient.get(`/reels/explore?page=${page}&limit=${limit}&category=${category}&excludeIds=${excludeIdsParam}&_t=${Date.now()}`);
          }

 const formatVideoUrl = (url: string) => url || '';

          const fetchedReels = res.data.map((r: any) => ({
            id: r.id,
            creatorId: r.creatorId,
            mediaType: r.mediaType,
            creatorUsername: r.creator?.username || 'user',
            creatorAvatar: r.creator?.avatar || getDefaultAvatar(r.creator?.username || 'user'),
            creatorIsVerified: r.creator?.isVerified || false,
            videoUrl: formatVideoUrl(r.mediaUrl), // Maps backend mediaUrl to frontend videoUrl and fixes .mov
            thumbnailUrl: r.thumbnailUrl || formatVideoUrl(r.mediaUrl), 
            description: r.description || '', // Maps backend description to frontend description
            musicName: r.musicName || 'Original Audio',
            likesCount: r.likesCount || 0,
            commentsCount: r.commentsCount || 0,
            savesCount: r.savesCount || 0,
            sharesCount: r.sharesCount || 0,
            viewsCount: r.viewsCount || 0,
            isLiked: false, 
            isSaved: false,
            category: r.category || 'lifestyle',
            isMonetized: r.isMonetized !== undefined ? r.isMonetized : true,
            layersData: r.layersData,
            createdAt: r.createdAt,
            location: r.location || (r.city ? { city: r.city, latitude: r.latitude, longitude: r.longitude } : null)
          }));

          set((state) => {
            const existingIds = new Set(state.reels.map(r => r.id));
            const newReels = fetchedReels.filter((r: any) => !existingIds.has(r.id));
            const finalReels = page === 1 ? fetchedReels : [...state.reels, ...newReels];
            
            console.log(`[FEED STORE] State Update: page=${page}`);
            console.log(`[FEED STORE] Fetched IDs: ${fetchedReels.map((r: any) => r.id).join(', ')}`);
            console.log(`[FEED STORE] Final Reels Count: ${finalReels.length}`);
            
            return {
              reels: finalReels
            };
          });
        } catch (error) {
          console.error("Error fetching reels:", error);
        } finally {
          set({ isFetchingFeed: false });
        }
      },
      fetchFollowingReels: async (page = 1, limit = 10) => {
        try {
          const res = await apiClient.get(`/reels/following?page=${page}&limit=${limit}&_t=${Date.now()}`);
       const formatVideoUrl = (url: string) => url || '';

          const fetchedReels = res.data.map((r: any) => ({
           id: r.id,
            creatorId: r.creatorId,
            mediaType: r.mediaType,
            creatorUsername: r.creator?.username || 'user',
            creatorAvatar: r.creator?.avatar || getDefaultAvatar(r.creator?.username || 'user'),
            creatorIsVerified: r.creator?.isVerified || false,
            videoUrl: formatVideoUrl(r.mediaUrl),
            thumbnailUrl: r.thumbnailUrl || formatVideoUrl(r.mediaUrl), 
            description: r.description || '',
            musicName: r.musicName || 'Original Audio',
            likesCount: r.likesCount || 0,
            commentsCount: r.commentsCount || 0,
            savesCount: r.savesCount || 0,
            sharesCount: r.sharesCount || 0,
            viewsCount: r.viewsCount || 0,
            isLiked: false, 
            isSaved: false,
            category: r.category || 'lifestyle',
            layersData: r.layersData,
            createdAt: r.createdAt,
            location: r.location || (r.city ? { city: r.city, latitude: r.latitude, longitude: r.longitude } : null)
          }));

       set((state) => {
            const existingIds = new Set(state.homeFeedReels.map(r => r.id));
            const newReels = fetchedReels.filter((r: any) => !existingIds.has(r.id));
            return { homeFeedReels: page === 1 ? fetchedReels : [...state.homeFeedReels, ...newReels] };
          });
        } catch (error) {
          console.error("Error fetching following reels:", error);
        }
      },
      fetchCreators: async () => {
        try {
          const res = await apiClient.get('/users/creators');
          // Format creator structure if needed
          const creators = res.data.map((c: any) => ({
            ...c,
            location: { latitude: c.latitude, longitude: c.longitude, city: c.city }
          }));
          set({ creators });
        } catch (error) {
          console.error("Error fetching creators:", error);
        }
      },
      fetchLikedReels: async () => {
        try {
          const res = await apiClient.get('/reels/liked');
      const formatVideoUrl = (url: string) => url || '';

          const fetchedReels = res.data.map((r: any) => ({
            id: r.id,
            creatorId: r.creatorId,
            creatorName: r.creator?.name || 'User',
            creatorUsername: r.creator?.username || 'user',
            creatorAvatar: r.creator?.avatar || getDefaultAvatar(r.creator?.username || 'user'),
            creatorIsVerified: r.creator?.isVerified || false,
            videoUrl: formatVideoUrl(r.mediaUrl),
            thumbnailUrl: r.thumbnailUrl || formatVideoUrl(r.mediaUrl), 
            description: r.description || '',
            musicName: r.musicName || 'Original Audio',
            likesCount: r.likesCount || 0,
            commentsCount: r.commentsCount || 0,
            savesCount: r.savesCount || 0,
            sharesCount: r.sharesCount || 0,
            viewsCount: r.viewsCount || 0,
            isLiked: true, // We know it's liked because it's from the liked endpoint
            isSaved: false,
            category: r.category || 'lifestyle',
            isMonetized: r.isMonetized !== undefined ? r.isMonetized : true,
            layersData: r.layersData,
            createdAt: r.createdAt,
            location: r.location || (r.city ? { city: r.city, latitude: r.latitude, longitude: r.longitude } : null)
          }));
          set({ likedReels: fetchedReels });
        } catch (error) {
          console.error("Error fetching liked reels:", error);
        }
      },
      fetchWatchHistory: async () => {
        try {
          const res = await apiClient.get('/reels/history');
 const formatVideoUrl = (url: string) => url || '';

          const fetchedReels = res.data.map((r: any) => ({
            id: r.id,
            creatorId: r.creatorId,
            creatorName: r.creator?.name || 'User',
            creatorUsername: r.creator?.username || 'user',
            creatorAvatar: r.creator?.avatar || getDefaultAvatar(r.creator?.username || 'user'),
            creatorIsVerified: r.creator?.isVerified || false,
            videoUrl: formatVideoUrl(r.mediaUrl),
            thumbnailUrl: r.thumbnailUrl || formatVideoUrl(r.mediaUrl), 
            description: r.description || '',
            musicName: r.musicName || 'Original Audio',
            likesCount: r.likesCount || 0,
            commentsCount: r.commentsCount || 0,
            savesCount: r.savesCount || 0,
            sharesCount: r.sharesCount || 0,
            viewsCount: r.viewsCount || 0,
            isLiked: false,
            isSaved: false,
            category: r.category || 'lifestyle',
            isMonetized: r.isMonetized !== undefined ? r.isMonetized : true,
            layersData: r.layersData,
            createdAt: r.createdAt,
            location: r.location || (r.city ? { city: r.city, latitude: r.latitude, longitude: r.longitude } : null)
          }));
          set({ watchHistory: fetchedReels });
        } catch (error) {
          console.error("Error fetching watch history:", error);
        }
      },
   fetchUserReels: async (userId: string) => {
        try {
          const res = await apiClient.get(`/reels/user/${userId}`);
          console.log(`[FEED STORE] fetchUserReels API Response: Profile query result count for user ${userId} is ${res.data.length}`);
          const formatVideoUrl = (url: string) => url || '';
          const existingReels = get().userReels;

          const fetchedReels = res.data.map((r: any) => {
            const existing = existingReels.find((e) => e.id === r.id);
            const backendThumb = r.thumbnailUrl || formatVideoUrl(r.mediaUrl);
            const isCfThumb = backendThumb.includes('cloudflarestream.com');
            const resolvedThumb = (isCfThumb && existing?.thumbnailUrl && !existing.thumbnailUrl.includes('cloudflarestream.com'))
              ? existing.thumbnailUrl
              : backendThumb;
            return {
            id: r.id,
            creatorId: r.creatorId,
            mediaType: r.mediaType,
            creatorName: r.creator?.name || 'User',
            creatorUsername: r.creator?.username || 'user',
            creatorAvatar: r.creator?.avatar || getDefaultAvatar(r.creator?.username || 'user'),
            creatorIsVerified: r.creator?.isVerified || false,
            videoUrl: formatVideoUrl(r.mediaUrl),
            thumbnailUrl: resolvedThumb,
            description: r.description || '',
            musicName: r.musicName || 'Original Audio',
            likesCount: r.likesCount || 0,
            commentsCount: r.commentsCount || 0,
            savesCount: r.savesCount || 0,
            sharesCount: r.sharesCount || 0,
          viewsCount: r.viewsCount || 0,
            viewEarnings: r.viewEarnings || 0,
            isLiked: false, 
            isSaved: false,
            category: r.category || 'lifestyle',
            isMonetized: r.isMonetized !== undefined ? r.isMonetized : true,
            layersData: r.layersData,
            createdAt: r.createdAt,
   location: r.location || (r.city ? { city: r.city, latitude: r.latitude, longitude: r.longitude } : null)
            };
          });

          set({ userReels: fetchedReels });
        } catch (error) {
          console.error("Error fetching user reels:", error);
        }
      },
      updateCreatorInfo: (creatorId, updates) => {
        set((state) => {
          const updateReel = (r: Reel) => {
            if (r.creatorId === creatorId) {
              return {
                ...r,
                creatorName: updates.name || r.creatorName,
                creatorUsername: updates.username || r.creatorUsername,
                creatorAvatar: updates.avatar || r.creatorAvatar,
              };
            }
            return r;
          };

          return {
            reels: state.reels.map(updateReel),
            userReels: state.userReels.map(updateReel),
            likedReels: state.likedReels.map(updateReel),
            watchHistory: state.watchHistory.map(updateReel),
            creators: state.creators.map(c => 
              c.id === creatorId ? { ...c, ...updates } : c
            )
          };
        });
      },
      deleteReel: async (reelId) => {
        try {
          await apiClient.delete(`/reels/${reelId}`);
          set((state) => ({
            reels: state.reels.filter(r => r.id !== reelId),
            userReels: state.userReels.filter(r => r.id !== reelId),
            likedReels: state.likedReels.filter(r => r.id !== reelId),
            watchHistory: state.watchHistory.filter(r => r.id !== reelId)
          }));
        } catch (error) {
          console.error("Error deleting reel:", error);
          throw error;
        }
      },

      setProfileReels: (username: string, reels: Reel[]) => {
        set((state) => ({
          profileReels: { ...state.profileReels, [username]: reels }
        }));
      },
    }),
   {
      name: 'popli-feed-store-v5',
      storage: createJSONStorage(() => mmkvStoreStorage),
      partialize: (state) => Object.fromEntries(
        Object.entries(state).filter(([key]) => !['userReels', 'isFetchingFeed'].includes(key))
      ) as any,
  onRehydrateStorage: () => (state) => {
        if (state) {
          state.isFetchingFeed = false;
          state.userReels = [];
          if (Array.isArray(state.reels)) {
            state.reels = state.reels.filter(
              (r) => r && typeof r.id === 'string' && r.id.length > 0
            );
          }
          if (Array.isArray(state.homeFeedReels)) {
            state.homeFeedReels = state.homeFeedReels.filter(
              (r) => r && typeof r.id === 'string' && r.id.length > 0
            );
          }
        }
      }
    }
  )
);
