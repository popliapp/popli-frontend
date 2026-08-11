import { NativeModules, NativeEventEmitter } from 'react-native';
import { BASE_URL } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';

const { ReelUploadModule } = NativeModules;

export interface StoryUploadParams {
  localUri: string;
  mediaType: 'IMAGE' | 'VIDEO';
  storyPayload: Record<string, any>;
  idempotencyKey: string;
  taskId: string;
}

export interface StoryUploadStatus {
  status: 'idle' | 'uploading' | 'polling' | 'creating' | 'done' | 'failed';
  cfState?: string;
  pctComplete?: number;
  errorMessage?: string;
  taskId?: string;
  createdStoryJson?: string;
}

const emitter = ReelUploadModule ? new NativeEventEmitter(ReelUploadModule) : null;

export const StoryUploadNative = {
  startUpload: async (params: StoryUploadParams): Promise<void> => {
    if (!ReelUploadModule) throw new Error('ReelUploadModule not available');
    const token = useAuthStore.getState().token;
    await ReelUploadModule.startStoryUpload({
      localUri: params.localUri,
      mediaType: params.mediaType,
      baseUrl: BASE_URL,
      token: token ?? null,
      storyPayload: JSON.stringify(params.storyPayload),
      idempotencyKey: params.idempotencyKey,
      taskId: params.taskId,
    });
  },

  getCurrentStatus: async (): Promise<StoryUploadStatus> => {
    if (!ReelUploadModule) return { status: 'idle' };
    return ReelUploadModule.getStoryStatus();
  },

  clearStatus: async (): Promise<void> => {
    if (!ReelUploadModule) return;
    return ReelUploadModule.clearStoryStatus();
  },

  addProgressListener: (callback: (status: StoryUploadStatus) => void) => {
    if (!emitter) return { remove: () => {} };
    return emitter.addListener('StoryUploadProgress', callback);
  },
};