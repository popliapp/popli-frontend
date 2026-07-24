import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info';

interface ToastAction {
  label: string;
  onPress: () => void;
}

interface ToastState {
  visible: boolean;
  message: string;
  type: ToastType;
  action?: ToastAction;
  duration: number;
  toastId: number;
  showToast: (
    message: string,
    type?: ToastType,
    options?: { action?: ToastAction; duration?: number }
  ) => void;
  hideToast: () => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  visible: false,
  message: '',
  type: 'info',
  action: undefined,
  duration: 3000,
  toastId: 0,
  showToast: (message, type = 'info', options) =>
    set({
      visible: true,
      message,
      type,
      action: options?.action,
      duration: options?.duration ?? 3000,
      toastId: get().toastId + 1,
    }),
  hideToast: () => set({ visible: false }),
}));

// Convenience helpers so screens can just call showSuccess('Saved!') etc.
export const showSuccess = (message: string, options?: { action?: ToastAction; duration?: number }) =>
  useToastStore.getState().showToast(message, 'success', options);

export const showError = (message: string, options?: { action?: ToastAction; duration?: number }) =>
  useToastStore.getState().showToast(message, 'error', options);

export const showInfo = (message: string, options?: { action?: ToastAction; duration?: number }) =>
  useToastStore.getState().showToast(message, 'info', options);