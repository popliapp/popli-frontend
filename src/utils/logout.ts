import { showError } from '../store/toastStore';

export async function performLogout(message?: string) {
  const { useAuthStore } = require('../store/authStore');
  const { useFeedStore } = require('../store/feedStore');

  try {
    const { useStoryStore } = require('../store/storyStore');
    useStoryStore.getState().clearCache();
  } catch {}

  try {
    useFeedStore.getState().clearCache();
  } catch {}

  await useAuthStore.getState().logout();

  if (message) {
  setTimeout(() => showError(message), 300);
  }
}

const INVALID_SESSION_CODES = [
  'USER_NOT_FOUND',
  'ACCOUNT_DELETED',
  'ACCOUNT_DISABLED',
  'TOKEN_EXPIRED',
  'INVALID_TOKEN',
];

export function isInvalidSessionError(error: any): boolean {
  if (!error?.response) return false;
  const status = error.response.status;
  const code = error.response.data?.code;
  if (status !== 401) return false;
  if (!code) return true;
  return INVALID_SESSION_CODES.includes(code);
}