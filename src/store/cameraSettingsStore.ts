/* eslint-disable @typescript-eslint/no-unused-vars */
 
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Creator, Reel, Comment, Chat, Message, NotificationItem, TransactionItem, GiftType } from '../types';
import { getHaversineDistance } from '../services/geoService';
import { apiClient } from '../api/client';
import { mmkvStoreStorage } from './storage';

// ==========================================
// // 9. CAMERA SETTINGS STORE
// ==========================================

interface CameraSettingsState {
  saveOriginals: boolean;
  hdr: boolean;
  grid: boolean;
  mirrorFront: boolean;
  autoFlash: boolean;
  quality: 'High' | 'Standard';
  fps: 30 | 60;
  stabilization: boolean;
  videoResolution: '1080p' | '4K';
  beautyStrength: number;
  locationTagging: boolean;
  updateSetting: (key: keyof Omit<CameraSettingsState, 'updateSetting'>, value: any) => void;
}

export const useCameraSettingsStore = create<CameraSettingsState>()(
  persist(
    (set) => ({
      saveOriginals: false,
      hdr: false,
      grid: false,
      mirrorFront: true,
      autoFlash: false,
      quality: 'High',
      fps: 30,
      stabilization: true,
      videoResolution: '1080p',
      beautyStrength: 50,
      locationTagging: false,
      updateSetting: (key, value) => set({ [key]: value })
    }),
    {
      name: 'popli-camera-settings',
      storage: createJSONStorage(() => mmkvStoreStorage)
    }
  )
);

