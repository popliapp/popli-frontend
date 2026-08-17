import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Sentry from '@sentry/react-native';

const BACKEND_FALLBACK = 'http://192.168.1.5:3001';

const resolveBaseUrl = () => {
  // 1. Primary: Use exactly what is configured in .env
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL.trim();
  }

  // 2. Optional Development Convenience: Extract from Expo Host URI
  if (__DEV__) {
    // @ts-ignore
    const hostUri = Constants.expoConfig?.hostUri || (Constants.manifest as any)?.hostUri || (Constants.manifest2 as any)?.extra?.expoGo?.debuggerHost;
    // Do NOT use hostUri if it's an ngrok/exp.direct tunnel, because it won't route port 3000 to the backend.
    if (hostUri && !hostUri.includes('exp.direct') && !hostUri.includes('ngrok.io') && !hostUri.includes('ngrok-free.app') && !hostUri.includes('ngrok.app') && !hostUri.includes('loca.lt')) {
      const lanIp = hostUri.split(':')[0].trim(); // e.g. "192.168.1.28"
      // Prevent crash if lanIp contains underscores (invalid hostname)
      if (!lanIp.includes('_')) {
        return `http://${lanIp}:3001`;
      }
    }
  }

return BACKEND_FALLBACK.trim();
};

let resolved = resolveBaseUrl();
// Sanitize resolved URL just in case of weird hidden characters or quotes
resolved = resolved.replace(/['"]/g, '').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();

export const BASE_URL = resolved;
if (__DEV__) {
  console.log('[API CLIENT] Initialized with BASE_URL:', BASE_URL);
}

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Bypass-Tunnel-Reminder': 'true'
  },
});

// Request interceptor to attach JWT token and log requests
apiClient.interceptors.request.use(
  (config) => {
    if (__DEV__) {
      console.log(`[API REQUEST] ${config.method?.toUpperCase()} ${config.url}`, config.params || '');
    }
    
    // Dynamically require to avoid require cycle with authStore
    const { useAuthStore } = require('../store/authStore');
    const { token } = useAuthStore.getState();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
if (__DEV__) {
      console.error(`[API REQUEST ERROR]`, error);
    }
    return Promise.reject(error);
  }
);

const EXPECTED_API_STATUSES = new Set([400, 401, 403, 404, 409, 422, 429]);

// Response interceptor to handle token refresh automatically and log responses
apiClient.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(`[API RESPONSE] ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`);
    }
    return response;
  },
  async (error) => {
    const originalRequest = error.config;
    
    if (axios.isCancel(error)) {
      if (__DEV__) {
        console.log(`[API REQUEST CANCELED] ${originalRequest?.url}`);
      }
      return Promise.reject(error);
    }
    
if (__DEV__) {
      if (error.response?.status !== 401) {
        console.warn(`[API ERROR] ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url} - Status: ${error.response?.status || 'NETWORK_ERROR'}`);
      }
    }

    const status = error.response?.status;
    if (!axios.isCancel(error) && (!status || !EXPECTED_API_STATUSES.has(status))) {
      Sentry.captureException(error, {
        tags: {
          component: 'api-client',
          http_status: status ?? 'network_error',
          method: originalRequest?.method?.toUpperCase(),
        },
        extra: {
          url: originalRequest?.url,
        },
      });
    }
    
 if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const code = error.response?.data?.code;
      const terminalCodes = ['USER_NOT_FOUND', 'ACCOUNT_DELETED', 'ACCOUNT_DISABLED'];

      if (terminalCodes.includes(code)) {
        const { performLogout } = require('../utils/logout');
        await performLogout('Your session has expired. Please sign in again.');
        return Promise.reject(error);
      }

      try {
        const { useAuthStore } = require('../store/authStore');
        const SecureStore = require('expo-secure-store');
        const refreshToken = await SecureStore.getItemAsync('refreshToken');
        if (refreshToken) {
          const res = await axios.post(`${BASE_URL}/auth/refresh-token`, { refreshToken });
          if (res.data.accessToken) {
            useAuthStore.getState().setToken(res.data.accessToken);
            originalRequest.headers.Authorization = `Bearer ${res.data.accessToken}`;
            return apiClient(originalRequest);
          }
        }
      } catch (refreshError) {
        const { performLogout } = require('../utils/logout');
        const SecureStore = require('expo-secure-store');
        await SecureStore.deleteItemAsync('refreshToken');
        await performLogout('Your session has expired. Please sign in again.');
      }
    }
    return Promise.reject(error);
  }
);
