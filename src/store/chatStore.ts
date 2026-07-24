/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-require-imports */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Creator, Reel, Comment, Chat, Message, NotificationItem, TransactionItem, GiftType } from '../types';
import { getHaversineDistance } from '../services/geoService';
import { apiClient, BASE_URL } from '../api/client';
import io, { Socket } from 'socket.io-client';
import { formatRelativeTime } from '../utils';
import { mmkvStoreStorage } from './storage';


interface ChatState {
  chats: Chat[];
  messages: Message[];
  notifications: NotificationItem[];
  isTyping: Record<string, boolean>;
  mutedChats: string[];
  sendMessage: (chatId: string, text: string, mediaUrl?: string, options?: { type?: 'TEXT'|'VOICE', replyToId?: string, replyToText?: string }) => Promise<void>;
  toggleMuteChat: (chatId: string) => void;
  sendDirectMessage: (receiver: { id: string, name?: string, username?: string, avatar?: string }, text?: string, mediaUrl?: string) => void;
  sendTyping: (chatId: string, isTyping: boolean) => void;
  markChatRead: (chatId: string) => void;
  deleteChat: (chatId: string) => Promise<void>;
  deleteMessage: (chatId: string, messageId: string) => Promise<void>;
  markMessageSeen: (chatId: string, messageId: string) => Promise<void>;
  reactToMessage: (chatId: string, messageId: string, emoji: string) => Promise<void>;
  markNotificationsRead: () => Promise<void>;
connectSocket: () => void;
  disconnectSocket: () => void;
  leaveChat: (chatId: string) => void;
  getSocket: () => typeof socket;
  fetchChats: () => Promise<void>;
  fetchMessages: (chatId: string) => Promise<void>;
  fetchNotifications: () => Promise<void>;
  fetchNextNotifications: () => Promise<void>;
  notificationsCursor?: string;
  hasMoreNotifications: boolean;
  unreadNotificationsCount: number;
}

// Keep a reference to the active socket outside the store state 
// to prevent recursive serialization issues with Zustand/MMKV
let socket: Socket | null = null;

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      chats: [],
      messages: [],
      notifications: [],
      notificationsCursor: undefined,
      hasMoreNotifications: true,
      unreadNotificationsCount: 0,
     isTyping: {} as Record<string, boolean>,
      mutedChats: [],
      toggleMuteChat: (chatId) => {
        set((state) => ({
          mutedChats: state.mutedChats.includes(chatId)
            ? state.mutedChats.filter(id => id !== chatId)
            : [...state.mutedChats, chatId]
        }));
      },
      connectSocket: () => {
        if (socket?.connected) return;
        
        // Cleanup existing socket if it exists but is disconnected to prevent duplicate listeners
        if (socket) {
          socket.removeAllListeners();
          socket.disconnect();
          socket = null;
        }
        
         
          const { useAuthStore } = require('./authStore');
        const token = useAuthStore.getState().token;
        if (!token) return;

        socket = io(BASE_URL, {
          auth: { token },
          transports: ['websocket'],
        });

        socket.on('connect', () => {
          console.log('Chat socket connected:', socket?.id);
        });

        socket.on('new_message', (message: any) => {
          set((state) => {
            if (state.messages.some(m => m.id === message.id)) return state; // Prevent duplicates

            const formattedMsg = {
              id: message.id,
              chatId: message.chatId,
              senderId: message.senderId,
              text: message.text,
              mediaUrl: message.mediaUrl,
              type: message.type,
              storyId: message.storyId,
              replyToId: message.replyToId,
              replyToText: message.replyToText,
              reactions: message.reactions || {},
              timestamp: message.createdAt || new Date().toISOString(),
              status: message.status || 'delivered'
            };

            const isChatActive = state.messages.some(m => m.chatId === message.chatId);
            const updatedMessages = isChatActive ? [formattedMsg as any, ...state.messages] : state.messages;

            const updatedChats = state.chats.map((c) => {
              if (c.id === message.chatId) {
                return {
                  ...c,
                  lastMessage: message.text || (message.type === 'VOICE' ? 'Voice message' : 'Sent media'),
                  lastMessageTime: formatRelativeTime(new Date().toISOString()),
                  unreadCount: c.unreadCount + 1
                };
              }
              return c;
            });

            return { messages: updatedMessages, chats: updatedChats };
          });
        });

        socket.on('message_seen', (data: { chatId: string, messageId: string }) => {
          set((state) => ({
            messages: state.messages.map(m => 
              (m.id === data.messageId && m.chatId === data.chatId) 
                ? { ...m, status: 'seen' } 
                : m
            )
          }));
        });

        socket.on('message_reaction', (data: { chatId: string, messageId: string, userId: string, emoji: string }) => {
          set((state) => ({
            messages: state.messages.map(m => {
              if (m.id === data.messageId && m.chatId === data.chatId) {
                const newReactions = { ...(m.reactions || {}) };
                if (data.emoji) {
                  newReactions[data.userId] = data.emoji;
                } else {
                  delete newReactions[data.userId];
                }
                return { ...m, reactions: newReactions };
              }
              return m;
            })
          }));
        });

      socket.on('typing', (data: { chatId: string, isTyping: boolean, userId: string }) => {
          const { useAuthStore } = require('./authStore');
          const myId = useAuthStore.getState().userProfile?.id;
          if (data.userId === myId) return;
          set((state) => ({ isTyping: { ...state.isTyping, [data.chatId]: data.isTyping } }));
        });

        socket.on('new_notification', (notification: any) => {
          set((state) => {
            const exists = state.notifications.some(n => n.id === notification.id);
            if (exists) return state;
            return { notifications: [notification, ...state.notifications] };
          });
        });

        socket.on('notification:unread-count', (data: { count: number }) => {
          set({ unreadNotificationsCount: data.count });
        });

        socket.on('disconnect', () => {
          console.log('Chat socket disconnected');
        });
      },
  disconnectSocket: () => {
        if (socket) {
          socket.removeAllListeners();
          socket.disconnect();
          socket = null;
        }
      },
   leaveChat: (chatId: string) => {
        if (socket?.connected) {
          socket.emit('leave_chat', chatId);
        }
      },
      getSocket: () => socket,
    sendMessage: async (chatId, text, mediaUrl, options?: { type?: 'TEXT'|'VOICE', replyToId?: string, replyToText?: string }) => {
        const tempId = `temp-${Date.now()}`;
        const { useAuthStore } = require('./authStore');
        const { userProfile } = useAuthStore.getState();

        const displayText = text || (options?.type === 'VOICE' ? 'Voice message' : 'Sent media');

        const tempMsg = {
          id: tempId,
          chatId,
          senderId: userProfile?.id || 'me',
          text: displayText,
          mediaUrl,
          type: options?.type || 'TEXT',
          replyToId: options?.replyToId,
          replyToText: options?.replyToText,
          reactions: {},
          timestamp: new Date().toISOString(),
          status: 'sent'
        };

        // Step 1: Instant UI update — no await, no blocking
        set((state) => ({
          messages: [tempMsg as any, ...state.messages],
          chats: state.chats.map((c) =>
            c.id === chatId
              ? { ...c, lastMessage: displayText, lastMessageTime: 'Just now', unreadCount: 0 }
              : c
          ),
        }));

        // Step 2: Background save — fire and forget
        apiClient.post(`/chats/${chatId}/messages`, {
          text: displayText,
          mediaUrl,
          type: options?.type || 'TEXT',
          replyToId: options?.replyToId,
          replyToText: options?.replyToText,
        }).then((res) => {
          const rawMsg = res.data;
          const realId = rawMsg.id;
          if (!realId) return;

          set((state) => {
            const socketAlreadyAdded = state.messages.some(m => m.id === realId);
            return {
              messages: socketAlreadyAdded
                ? state.messages.filter(m => m.id !== tempId)
                : state.messages.map(m =>
                    m.id === tempId
                      ? {
                          ...m,
                          id: realId,
                          timestamp: rawMsg.createdAt || m.timestamp,
                          status: 'sent',
                        }
                      : m
                  ),
              chats: state.chats.map((c) =>
                c.id === chatId
                  ? { ...c, lastMessageTime: formatRelativeTime(rawMsg.createdAt || new Date().toISOString()) }
                  : c
              ),
            };
          });
        }).catch(() => {
          // Mark as failed — user can retry
          set((state) => ({
            messages: state.messages.map(m =>
              m.id === tempId ? { ...m, status: 'failed' } : m
            ),
          }));
        });
      },
      sendDirectMessage: async (receiver, text, mediaUrl) => {
        try {
          const chatRes = await apiClient.post(`/chats/user/${receiver.id}`);
          const chatId = chatRes.data.id;
          
          if (chatId) {
            await get().sendMessage(chatId, text || '', mediaUrl);
          }
          await get().fetchChats();
        } catch (error) {
          console.error("Failed to send direct message:", error);
        }
      },
      sendTyping: (chatId, isTyping) => {
        if (socket) {
          const { useAuthStore } = require('./authStore');
          const userId = useAuthStore.getState().userProfile?.id;
          socket.emit('typing', { chatId, isTyping, userId });
        }
      },
      markChatRead: async (chatId) => {
        set((state) => ({
          chats: state.chats.map((c) => {
            if (c.id === chatId) {
              return { ...c, unreadCount: 0 };
            }
            return c;
          })
        }));
        try {
          await apiClient.post(`/chats/${chatId}/read`);
        } catch (error) {
          console.error("Failed to mark chat read on backend", error);
        }
      },
    deleteChat: async (chatId) => {
        const backupChats = get().chats;
        set(state => ({
          chats: state.chats.filter(c => c.id !== chatId)
        }));
        try {
          await apiClient.delete(`/chats/${chatId}`);
        } catch (e) {
          console.error('Error deleting chat, rolling back:', e);
          set({ chats: backupChats });
          throw e;
        }
      },
      deleteMessage: async (chatId, messageId) => {
        const backupMessages = get().messages;
        set(state => ({
          messages: state.messages.filter(m => m.id !== messageId)
        }));
        try {
          await apiClient.delete(`/chats/${chatId}/messages/${messageId}`);
        } catch (e) {
          console.error('Error deleting message, rolling back:', e);
          set({ messages: backupMessages });
        }
      },
      markMessageSeen: async (chatId, messageId) => {
        set((state) => ({
          messages: state.messages.map((m) => 
            m.id === messageId ? { ...m, status: 'seen' } : m
          )
        }));
        try {
          await apiClient.post(`/chats/${chatId}/messages/${messageId}/read`);
          if (socket) {
            socket.emit('message_seen', { chatId, messageId });
          }
        } catch (error) {
          console.error("Failed to mark message seen", error);
        }
      },
      reactToMessage: async (chatId, messageId, emoji) => {
        // Optimistic update
         
        const { useAuthStore } = require('./authStore');
        const userId = useAuthStore.getState().userProfile?.id;
        
        const backupMessages = get().messages;
        
        if (userId) {
          set((state) => ({
            messages: state.messages.map((m) => {
              if (m.id === messageId) {
                const newReactions = { ...(m.reactions || {}) };
                if (emoji) {
                  newReactions[userId] = emoji;
                } else {
                  delete newReactions[userId];
                }
                return { ...m, reactions: newReactions };
              }
              return m;
            })
          }));
        }
        
        try {
          await apiClient.post(`/chats/${chatId}/messages/${messageId}/react`, { emoji });
          if (socket && userId) {
            socket.emit('message_reaction', { chatId, messageId, userId, emoji });
          }
        } catch (error) {
          console.error("Failed to react to message, rolling back:", error);
          set({ messages: backupMessages });
        }
      },
      markNotificationsRead: async () => {
        set((state) => ({
          notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
          unreadNotificationsCount: 0
        }));
        try {
          const { notificationsApi } = require('../api/services');
          await notificationsApi.markAllRead();
        } catch (e) {
          console.error("Failed to mark notifications read:", e);
        }
      },
      fetchChats: async () => {
        try {
          const res = await apiClient.get('/chats');
          const formattedChats = res.data.map((cp: any) => {
            const chat = cp.chat || cp; // Handle both formats just in case
            return {
              id: chat.id,
              creatorId: chat.participants?.[0]?.user?.id || 'unknown',
              creatorName: chat.participants?.[0]?.user?.name || 'Unknown',
              creatorUsername: chat.participants?.[0]?.user?.username || 'user',
              creatorAvatar: chat.participants?.[0]?.user?.avatar || 'https://ui-avatars.com/api/?name=U&background=1D1037&color=fff&size=200',
              lastMessage: chat.lastMessage || 'No messages yet',
              lastMessageTime: chat.lastMessageAt 
                ? formatRelativeTime(chat.lastMessageAt)
                : '',
              unreadCount: cp.unreadCount || 0
            };
          });
          set({ chats: formattedChats });
        } catch (error) {
          console.error("Failed to fetch chats:", error);
        }
      },
   fetchMessages: async (chatId) => {
        try {
          const res = await apiClient.get(`/chats/${chatId}/messages`);
          const fetchedMessages = res.data.map((m: any) => ({
            id: m.id,
            chatId: m.chatId,
            senderId: m.senderId,
            text: m.text,
            mediaUrl: m.mediaUrl,
            type: m.type,
            storyId: m.storyId,
            replyToId: m.replyToId,
            replyToText: m.replyToText,
            reactions: m.reactions || {},
            timestamp: m.createdAt,
            status: m.status || 'delivered'
          }));
          set({ messages: fetchedMessages });

          const joinRoom = () => socket?.emit('join_chat', chatId);
          if (socket?.connected) {
            joinRoom();
          } else if (socket) {
            socket.once('connect', joinRoom);
          }
        } catch (error) {
          console.error("Failed to fetch messages:", error);
        }
      },
      fetchNotifications: async () => {
        try {
          const { notificationsApi } = require('../api/services');
          const res = await notificationsApi.getNotifications();
          const rawNotifications = res.data.notifications || res.data;
          
          const formattedNotifs = rawNotifications.map((n: any) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            body: n.body,
            actorId: n.actorId,
            actorName: n.actorName,
            actorAvatar: n.actorAvatar,
            targetType: n.targetType,
            reelId: n.reelId,
            reelThumbnail: n.reelThumbnail,
            postId: n.postId,
            postThumbnail: n.postThumbnail,
            storyId: n.storyId,
            storyThumbnail: n.storyThumbnail,
            commentId: n.commentId,
            commentText: n.commentText,
            giftId: n.giftId,
            giftType: n.giftType,
            giftAmount: n.giftAmount,
            createdAt: n.createdAt,
            isRead: n.isRead,
            aggregatedCount: n.aggregatedCount
          }));
          set({ 
            notifications: formattedNotifs, 
            notificationsCursor: res.data.nextCursor,
            hasMoreNotifications: !!res.data.nextCursor
          });

          try {
            const unreadRes = await notificationsApi.getUnreadCount();
            set({ unreadNotificationsCount: unreadRes.data.count });
          } catch(e) {}
        } catch (error) {
          console.error("Failed to fetch notifications:", error);
        }
      },
      fetchNextNotifications: async () => {
        const state = get();
        if (!state.hasMoreNotifications || !state.notificationsCursor) return;
        
        try {
          const { notificationsApi } = require('../api/services');
          const res = await notificationsApi.getNotifications(state.notificationsCursor);
          const rawNotifications = res.data.notifications || res.data;
          
          const formattedNotifs = rawNotifications.map((n: any) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            body: n.body,
            actorId: n.actorId,
            actorName: n.actorName,
            actorAvatar: n.actorAvatar,
            targetType: n.targetType,
            reelId: n.reelId,
            reelThumbnail: n.reelThumbnail,
            postId: n.postId,
            postThumbnail: n.postThumbnail,
            storyId: n.storyId,
            storyThumbnail: n.storyThumbnail,
            commentId: n.commentId,
            commentText: n.commentText,
            giftId: n.giftId,
            giftType: n.giftType,
            giftAmount: n.giftAmount,
            createdAt: n.createdAt,
            isRead: n.isRead,
            aggregatedCount: n.aggregatedCount
          }));
          
          set({ 
            notifications: [...state.notifications, ...formattedNotifs], 
            notificationsCursor: res.data.nextCursor,
            hasMoreNotifications: !!res.data.nextCursor
          });
        } catch (error) {
          console.error("Failed to fetch next notifications:", error);
        }
      }
    }),
  {
      name: 'popli-chat-store',
      storage: createJSONStorage(() => mmkvStoreStorage),
      partialize: (state) => ({
        chats: state.chats,
        messages: state.messages,
        notifications: state.notifications,
        mutedChats: state.mutedChats,
        notificationsCursor: state.notificationsCursor,
        hasMoreNotifications: state.hasMoreNotifications,
        unreadNotificationsCount: state.unreadNotificationsCount,
      }),
    }
  )
);
