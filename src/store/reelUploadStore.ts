import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStoreStorage } from './storage';

export type ReelUploadStatus =
  | 'idle'
  | 'uploading'
  | 'polling'
  | 'creating'
  | 'done'
  | 'failed';

export interface ReelUploadTask {
  taskId: string;
  idempotencyKey: string;
  uploadId: string | null;
  cfState: string | null;
  pctComplete: number;
  status: ReelUploadStatus;
  errorMessage: string | null;
  reelPayload: Record<string, any> | null;
  localUri: string;
  thumbnailUri: string | null;
  createdAt: number;
}

export interface StoryUploadTask {
  taskId: string;
  idempotencyKey: string;
  mediaType: 'IMAGE' | 'VIDEO';
  cfState: string | null;
  pctComplete: number;
  status: ReelUploadStatus;
  errorMessage: string | null;
  storyPayload: Record<string, any> | null;
  localUri: string;
  createdAt: number;
}

interface ReelUploadState {
  task: ReelUploadTask | null;
  setTask: (task: ReelUploadTask) => void;
  updateTask: (updates: Partial<ReelUploadTask>) => void;
  clearTask: () => void;
  storyTask: StoryUploadTask | null;
  setStoryTask: (task: StoryUploadTask) => void;
  updateStoryTask: (updates: Partial<StoryUploadTask>) => void;
  clearStoryTask: () => void;
}

export const useReelUploadStore = create<ReelUploadState>()(
  persist(
    (set) => ({
      task: null,
      setTask: (task) => set({ task }),
      updateTask: (updates) =>
        set((state) =>
          state.task ? { task: { ...state.task, ...updates } } : state,
        ),
      clearTask: () => set({ task: null }),
      storyTask: null,
      setStoryTask: (storyTask) => set({ storyTask }),
      updateStoryTask: (updates) =>
        set((state) =>
          state.storyTask ? { storyTask: { ...state.storyTask, ...updates } } : state,
        ),
      clearStoryTask: () => set({ storyTask: null }),
    }),
    {
      name: 'popli-reel-upload-v1',
      storage: createJSONStorage(() => mmkvStoreStorage),
    },
  ),
);