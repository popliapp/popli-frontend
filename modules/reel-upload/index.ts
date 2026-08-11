import { NativeModules, NativeEventEmitter, Platform } from 'react-native';
import { BASE_URL } from '../../src/api/client';
import { useAuthStore } from '../../src/store/authStore';

const { ReelUploadModule } = NativeModules;

export interface ReelUploadParams {
  localUri: string;
  thumbnailUrl?: string;
  reelPayload: Record<string, any>;
  idempotencyKey: string;
  taskId: string;
}

export interface ReelUploadStatus {
  status: 'idle' | 'uploading' | 'polling' | 'creating' | 'done' | 'failed';
  cfState?: string;
  pctComplete?: number;
  errorMessage?: string;
  taskId?: string;
  createdReelJson?: string;
}

const emitter = ReelUploadModule ? new NativeEventEmitter(ReelUploadModule) : null;

export const ReelUploadNative = {
  startUpload: async (params: ReelUploadParams): Promise<void> => {
    if (!ReelUploadModule) throw new Error('ReelUploadModule not available');
    const token = useAuthStore.getState().token;
    await ReelUploadModule.startUpload({
      localUri: params.localUri,
      thumbnailUrl: params.thumbnailUrl ?? null,
      baseUrl: BASE_URL,
      token: token ?? null,
      reelPayload: JSON.stringify(params.reelPayload),
      idempotencyKey: params.idempotencyKey,
      taskId: params.taskId,
    });
  },

  getCurrentStatus: async (): Promise<ReelUploadStatus> => {
    if (!ReelUploadModule) return { status: 'idle' };
    return ReelUploadModule.getCurrentStatus();
  },

  clearStatus: async (): Promise<void> => {
    if (!ReelUploadModule) return;
    return ReelUploadModule.clearStatus();
  },

  addProgressListener: (callback: (status: ReelUploadStatus) => void) => {
    if (!emitter) return { remove: () => {} };
    return emitter.addListener('ReelUploadProgress', callback);
  },
};