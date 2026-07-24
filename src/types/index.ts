export interface Creator {
  id: string;
  name: string;
  username: string;
  avatar: string;
  bio: string;
  category: 'music' | 'comedy' | 'fitness' | 'art' | 'gaming' | 'culinary' | 'motivation' | 'fashion' | 'lifestyle';
  followersCount: number;
  followingCount: number;
  wallet?: { totalEarnings: number };
  coinsEarned: number;
  giftsReceivedCount: number;
  isVerified: boolean;
  distanceKm?: number; // Calculated dynamically via GPS
  location: {
    city: string;
    latitude: number;
    longitude: number;
  };
}

export interface Comment {
  id: string;
  reelId: string;
  userId: string;
  text: string;
  likesCount: number;
  isLiked?: boolean;
  createdAt: string;
  user?: Pick<Creator, 'id' | 'name' | 'username' | 'avatar' | 'isVerified'>;
  parentId?: string | null;
  replies?: Comment[];
}

export interface Reel {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorUsername: string;
  creatorAvatar: string;
  videoUrl: string;
  thumbnailUrl: string;
  description: string;
  musicName: string;
  viewsCount: number;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
  savesCount: number;
  isLiked: boolean;
  isSaved: boolean;
  isFollowed: boolean;
  category: string;
  location?: {
    name?: string;
    city?: string;
    locationName?: string;
    latitude: number;
    longitude: number;
  };
  rewardEarned?: number; // in Rupees/Coins
  distanceKm?: number; // Calculated dynamically via GPS
  city?: string;
  isMonetized?: boolean;
  mediaType?: 'PHOTO' | 'VIDEO';
  taggedUsers?: { id: string; username: string }[];
  layersData?: any;
  createdAt?: string;
  mediaUrl?: string;
  creatorIsVerified?: boolean;
  creator?: {
    id: string;
    name: string;
    username: string;
    avatar: string;
    isVerified: boolean;
  };
}

export type GiftType = 'rose' | 'crown' | 'rocket' | 'fire' | 'diamond' | 'lion' | 'heart' | 'party' | 'sparkle' | 'star';

export interface Gift {
  id: GiftType;
  name: string;
  cost: number; // in coins
  icon: string; // symbol or emoji
  animationType: 'fly' | 'burst' | 'float' | 'spin';
}

export interface GiftTransaction {
  id: string;
  giftId: GiftType;
  giftName: string;
  cost: number;
  senderName: string;
  receiverName: string;
  timestamp: string;
  isAnonymous: boolean;
  message?: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  text: string;
  timestamp: string; // e.g. "9:41 AM"
  status: 'sending' | 'sent' | 'delivered' | 'seen' | 'failed';
  type?: 'TEXT' | 'STORY_MENTION' | 'VOICE';
  storyId?: string;
  mediaUrl?: string;
  replyToId?: string;
  replyToText?: string;
  reactions?: Record<string, string>; // userId -> emoji
}

export interface Chat {
  id: string;
  creatorId: string;
  creatorName: string;
  creatorUsername: string;
  creatorAvatar: string;
  isOnline: boolean;
  lastMessage: string;
  lastMessageTime: string;
  unreadCount: number;
}

export interface NotificationItem {
  id: string;
  type: string;
  actorId?: string;
  actorName?: string;
  actorAvatar?: string;
  targetType?: string;
  reelId?: string;
  reelThumbnail?: string;
  postId?: string;
  postThumbnail?: string;
  storyId?: string;
  storyThumbnail?: string;
  commentId?: string;
  commentText?: string;
  giftId?: string;
  giftType?: string;
  giftAmount?: number;
  body?: string;
  title?: string;
  createdAt: string;
  isRead: boolean;
  aggregatedCount?: number;
}

export interface TransactionItem {
  id: string;
  type: 'gift_send' | 'gift_receive' | 'coin_recharge' | 'withdrawal' | 'COIN_RECHARGE' | 'AD_REVENUE' | 'GIFT_RECEIVE';
  amount: number; // real ₹ price charged (never includes bonus)
  coinsCredited?: number; // total coins added to wallet (bonus included)
  currency: 'coins' | 'INR';
  description: string;
  status: 'success' | 'pending' | 'failed';
  timestamp: string;
}
export interface UserPreferences {
  theme: 'dark' | 'light';
  language: 'English' | 'Hindi' | 'Bengali' | 'Tamil';
  notificationsEnabled: boolean;
  isPrivateProfile: boolean;
}
