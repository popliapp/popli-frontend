import { apiClient } from './client';

export const authApi = {
  login: (phone: string, mockOtp: string) => apiClient.post('/auth/verify-otp', { phone, otp: mockOtp }),
  getMe: () => apiClient.get('/users/me'),
  updateProfile: (data: any) => apiClient.put('/users/me', data),
  getCreators: () => apiClient.get('/users/creators'),
};

export const reelsApi = {
  getFeed: (page = 1, lat?: number, lng?: number) => {
    const params = new URLSearchParams({ page: String(page) });
    if (lat && lng) {
      params.append('lat', String(lat));
      params.append('lng', String(lng));
    }
    return apiClient.get(`/reels/feed?${params.toString()}`);
  },
  likeReel: (id: string) => apiClient.post(`/reels/${id}/like`),
  saveReel: (id: string) => apiClient.post(`/reels/${id}/save`),
  getComments: (id: string, page = 1) => apiClient.get(`/reels/${id}/comments?page=${page}`),
  addComment: (id: string, content: string) => apiClient.post(`/reels/${id}/comments`, { content }),
};

export const storiesApi = {
  getStories: () => apiClient.get('/stories'),
  viewStory: (id: string) => apiClient.post(`/stories/${id}/view`),
  reactStory: (id: string, emoji: string) => apiClient.post(`/stories/${id}/react`, { emoji }),
};

export const chatApi = {
  getChats: () => apiClient.get('/chats'),
  getMessages: (id: string, page = 1) => apiClient.get(`/chats/${id}/messages?page=${page}`),
  markRead: (id: string) => apiClient.post(`/chats/${id}/read`),
};

export const notificationsApi = {
  getNotifications: (cursor?: string, limit = 20) => {
    const params = new URLSearchParams();
    if (cursor) params.append('cursor', cursor);
    if (limit) params.append('limit', String(limit));
    return apiClient.get(`/notifications?${params.toString()}`);
  },
  getUnreadCount: () => apiClient.get('/notifications/unread-count'),
  markRead: (id: string) => apiClient.patch(`/notifications/${id}/read`),
  markAllRead: () => apiClient.patch('/notifications/read-all'),
};

export const walletApi = {
  getWallet: () => apiClient.get('/wallet'),
  createRechargeOrder: (packageId: string) => apiClient.post('/wallet/recharge/create-order', { packageId }),
  verifyRechargePayment: (razorpayOrderId: string, razorpayPaymentId: string, razorpaySignature: string) =>
    apiClient.post('/wallet/recharge/verify', { razorpayOrderId, razorpayPaymentId, razorpaySignature }),
  getPaymentHistory: () => apiClient.get('/wallet/payments'),
  withdraw: (amount: number, upiId: string) => apiClient.post('/wallet/withdraw', { amount, upiId }),
};
export const emailOtpApi = {
  sendOtp: (email: string) => apiClient.post('/auth/email/send-otp', { email }),
  verifyOtp: (email: string, otp: string) => apiClient.post('/auth/email/verify-otp', { email, otp }),
  resendOtp: (email: string) => apiClient.post('/auth/email/resend-otp', { email }),
};