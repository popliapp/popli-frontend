 
 
import { create } from 'zustand';
import { apiClient } from '../api/client';

export interface StoryHighlight {
  id: string;
  creatorId: string;
  title: string;
  coverUrl: string;
  storyIds: string[];
}

interface StoryHighlightState {
  highlights: StoryHighlight[];
  fetchHighlights: (creatorId: string) => Promise<void>;
  createHighlight: (title: string, coverUrl: string, storyIds: string[]) => Promise<void>;
  deleteHighlight: (highlightId: string) => Promise<void>;
}

export const useStoryHighlightStore = create<StoryHighlightState>()((set, get) => ({
  highlights: [],
  fetchHighlights: async (creatorId: string) => {
    try {
      const res = await apiClient.get(`/stories/highlights/${creatorId}`);
      set({ highlights: res.data });
    } catch (error) {
      console.error("Error fetching highlights:", error);
    }
  },
  createHighlight: async (title: string, coverUrl: string, storyIds: string[]) => {
    try {
      const res = await apiClient.post('/stories/highlights', { title, coverUrl, storyIds });
      set({ highlights: [res.data, ...get().highlights] });
    } catch (error) {
      console.error("Error creating highlight:", error);
      throw error;
    }
  },
  deleteHighlight: async (highlightId: string) => {
    try {
      await apiClient.delete(`/stories/highlights/${highlightId}`);
      set({ highlights: get().highlights.filter(h => h.id !== highlightId) });
    } catch (error) {
      console.error("Error deleting highlight:", error);
      throw error;
    }
  }
}));
