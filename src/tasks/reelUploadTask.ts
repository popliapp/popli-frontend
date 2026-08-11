import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import { useReelUploadStore } from '../store/reelUploadStore';
import { apiClient } from '../api/client';
import { useFeedStore } from '../store/feedStore';
import { useAuthStore } from '../store/authStore';

export const REEL_UPLOAD_TASK = 'REEL_BACKGROUND_POLL_TASK';

const NOTIFICATION_CHANNEL = 'reel-upload';
const NOTIFICATION_ID = 'reel-upload-progress';

export async function setupNotificationChannel() {
  await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL, {
    name: 'Reel Upload',
    importance: Notifications.AndroidImportance.LOW,
    showBadge: false,
    sound: null,
  });
}

async function showUploadNotification(body: string, progress?: number) {
  await Notifications.scheduleNotificationAsync({
    identifier: NOTIFICATION_ID,
    content: {
      title: 'Popli',
      body,
      data: {},
      ...(progress !== undefined && {
        subtitle: `${Math.round(progress)}%`,
      }),
    },
    trigger: null,
  });
}

async function dismissUploadNotification() {
  await Notifications.dismissNotificationAsync(NOTIFICATION_ID);
}

export async function pollAndAdvanceUpload() {
  const { task, updateTask, clearTask } = useReelUploadStore.getState();
  if (!task || task.status === 'done' || task.status === 'failed' || task.status === 'idle') {
    return;
  }

  try {
    if (task.status === 'polling' && task.uploadId) {
      const pollRes = await apiClient.get(`/video/asset?uploadId=${task.uploadId}`);
      const cfState = pollRes.data.status as string;
      const cfPct = typeof pollRes.data.pctComplete === 'number' ? pollRes.data.pctComplete : null;

      if (cfState === 'error') {
        updateTask({ status: 'failed', errorMessage: 'Video processing failed on Cloudflare. Please try again.' });
        await showUploadNotification('Reel upload failed.');
        return;
      }

      if (cfState === 'ready') {
        updateTask({ status: 'creating', cfState: 'ready', pctComplete: 100 });
        await showUploadNotification('Saving reel...');
        await createReelFromTask();
        return;
      }

      updateTask({
        cfState,
        pctComplete: cfPct !== null ? Math.round(cfPct) : task.pctComplete,
      });

      const label = cfState === 'inprogress'
        ? `Processing video... ${cfPct !== null ? Math.round(cfPct) + '%' : ''}`
        : 'Queued...';
      await showUploadNotification(label, cfPct ?? undefined);
    }

    if (task.status === 'creating') {
      await createReelFromTask();
    }
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || 'Upload failed.';
    const safeMsg = getSafeErrorMessage(msg);
    updateTask({ status: 'failed', errorMessage: safeMsg });
    await showUploadNotification('Reel upload failed.');
  }
}

async function createReelFromTask() {
  const { task, updateTask, clearTask } = useReelUploadStore.getState();
  if (!task || !task.reelPayload || !task.uploadId) return;

  const { token } = useAuthStore.getState();
  if (!token) {
    updateTask({ status: 'failed', errorMessage: 'Session expired. Please sign in again.' });
    return;
  }

  try {
    const pollRes = await apiClient.get(`/video/asset?uploadId=${task.uploadId}`);
    const assetData = pollRes.data;

    const payload = {
      ...task.reelPayload,
      mediaUrl: assetData.mediaUrl,
      thumbnailUrl: task.thumbnailUri || assetData.thumbnailUrl || assetData.mediaUrl,
      muxAssetId: assetData.assetId,
      muxPlaybackId: assetData.playbackId,
      muxUploadId: task.uploadId,
      durationSeconds: Math.round(assetData.duration || 0),
      idempotencyKey: task.idempotencyKey,
    };

    const res = await apiClient.post('/reels', payload);
    const backendReel = res.data;

    const { addLocalReel } = useFeedStore.getState();
    const { userProfile } = useAuthStore.getState();

    addLocalReel({
      id: backendReel.id,
      creatorId: userProfile?.id || '',
      creatorName: userProfile?.name || 'User',
      creatorUsername: userProfile?.username || 'user',
      creatorAvatar: userProfile?.avatar || '',
      creatorIsVerified: userProfile?.isVerified || false,
      videoUrl: payload.mediaUrl,
      thumbnailUrl: payload.thumbnailUrl,
      mediaType: 'VIDEO',
      description: backendReel.description || '',
      musicName: backendReel.musicName || 'Original Audio',
      likesCount: 0,
      commentsCount: 0,
      savesCount: 0,
      sharesCount: 0,
      viewsCount: 0,
      isLiked: false,
      isSaved: false,
      isFollowed: false,
      category: backendReel.category || 'comedy',
      isMonetized: backendReel.isMonetized !== undefined ? backendReel.isMonetized : true,
      layersData: backendReel.layersData,
    });

    updateTask({ status: 'done', pctComplete: 100 });
    await dismissUploadNotification();
    await Notifications.scheduleNotificationAsync({
      content: { title: 'Popli', body: 'Reel posted successfully!' },
      trigger: null,
    });

    setTimeout(() => {
      clearTask();
    }, 5000);
  } catch (err: any) {
    const msg = err?.response?.data?.message || err?.message || 'Failed to save reel.';
    const safeMsg = getSafeErrorMessage(msg);
    updateTask({ status: 'failed', errorMessage: safeMsg });
    await showUploadNotification('Reel upload failed.');
  }
}

function getSafeErrorMessage(raw: string): string {
  if (!raw) return 'Something went wrong. Please try again.';
  if (raw.toLowerCase().includes('network') || raw.toLowerCase().includes('fetch'))
    return 'Network connection was lost.';
  if (raw.toLowerCase().includes('cloudflare') || raw.toLowerCase().includes('processing'))
    return 'Video processing failed. Please try again.';
  if (raw.toLowerCase().includes('timeout')) return 'Video processing timed out. Please try again.';
  if (raw.toLowerCase().includes('session') || raw.toLowerCase().includes('401'))
    return 'Your session expired. Please sign in again.';
  if (raw.toLowerCase().includes('duplicate') || raw.toLowerCase().includes('already'))
    return 'This reel was already posted.';
  return 'Something went wrong. Please try again.';
}

TaskManager.defineTask(REEL_UPLOAD_TASK, async () => {
  await pollAndAdvanceUpload();
  return BackgroundFetch.BackgroundFetchResult.NewData;
});

export async function registerReelUploadBackgroundTask() {
  const status = await BackgroundFetch.getStatusAsync();
  if (
    status === BackgroundFetch.BackgroundFetchStatus.Restricted ||
    status === BackgroundFetch.BackgroundFetchStatus.Denied
  ) {
    return;
  }
  await BackgroundFetch.registerTaskAsync(REEL_UPLOAD_TASK, {
    minimumInterval: 15,
    stopOnTerminate: false,
    startOnBoot: false,
  });
}

export async function unregisterReelUploadBackgroundTask() {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(REEL_UPLOAD_TASK);
  if (isRegistered) {
    await BackgroundFetch.unregisterTaskAsync(REEL_UPLOAD_TASK);
  }
}