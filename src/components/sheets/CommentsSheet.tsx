import React, { useState } from 'react';
import { View, Text, Image, TextInput, Pressable, ScrollView, Platform, Modal } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { X, Send, Heart, Smile } from 'lucide-react-native';
import { useFeedStore, useAuthStore } from '../../store';
import { formatSocialCount, getDefaultAvatar } from '../../utils';
import { MotiView } from 'moti';
import { apiClient } from '../../api/client';
import { Comment } from '../../types';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface CommentsSheetProps {
  reelId: string;
  isOpen: boolean;
  onClose: () => void;
  highlightedCommentId?: string;
}

export const CommentsSheet = ({ reelId, isOpen, onClose, highlightedCommentId }: CommentsSheetProps) => {
  const [newCommentText, setNewCommentText] = useState('');
  const [localComments, setLocalComments] = useState<Comment[]>([]);
  const [replyingTo, setReplyingTo] = useState<{id: string, username: string} | null>(null);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const inputRef = React.useRef<TextInput>(null);

  const { addComment, toggleCommentLike } = useFeedStore();
  const { userProfile } = useAuthStore();
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    if (isOpen && reelId) {
      setTimeout(() => {
        setNewCommentText('');
        setReplyingTo(null);
        setMentionQuery(null);
        setSuggestions([]);
      }, 0);
      apiClient.get(`/reels/${reelId}/comments`)
        .then(res => {
          const mapComment = (c: any): Comment => ({
            id: c.id,
            reelId: c.reelId,
            userId: c.userId,
            user: c.user,
            text: c.text,
            createdAt: new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            likesCount: c.likesCount,
            isLiked: c.isLiked, // Mapped from backend
            parentId: c.parentId,
            replies: c.replies ? c.replies.map(mapComment) : []
          });
          const mapped = res.data.map(mapComment);
          setLocalComments(mapped);
        })
        .catch(err => console.log('Failed to fetch comments', err));
    }
  }, [isOpen, reelId]);

  const reelComments = localComments;

  const handleTextChange = (text: string) => {
    setNewCommentText(text);

    // Regex to match the last word if it starts with @
    const match = text.match(/@([\w.-]*)$/);
    if (match) {
      const query = match[1];
      setMentionQuery(query);
      
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();

      timeoutRef.current = setTimeout(() => {
        abortControllerRef.current = new AbortController();
        apiClient.get(`/users/search?q=${query}`, { signal: abortControllerRef.current.signal })
          .then(res => {
            setSuggestions(Array.isArray(res.data) ? res.data : res.data.users || []);
          })
          .catch(err => {
            if (err.name !== 'CanceledError') console.error('Mention search error:', err);
          });
      }, 300); // 300ms debounce
    } else {
      setMentionQuery(null);
      setSuggestions([]);
    }
  };

  const handleSelectSuggestion = (username: string) => {
    if (mentionQuery !== null) {
      // Replace the last @mentionQuery with @username 
      const newText = newCommentText.replace(new RegExp(`@${mentionQuery}$`), `@${username} `);
      setNewCommentText(newText);
      setMentionQuery(null);
      setSuggestions([]);
    }
  };

  const handlePostComment = async () => {
    if (!newCommentText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    
    const textToPost = newCommentText.trim();
    const parentId = replyingTo ? replyingTo.id : undefined;
    
    setNewCommentText('');
    setReplyingTo(null);
    setMentionQuery(null);
    setSuggestions([]);

    const tempId = `temp-${Date.now()}`;

    // Optimistic backend-connected store update
    const addCommentPromise = addComment({
      reelId,
      userId: userProfile.id,
      user: {
        id: userProfile.id,
        name: userProfile.name,
        username: userProfile.username,
        avatar: userProfile.avatar,
        isVerified: userProfile.isVerified
      },
      text: textToPost,
      parentId
    });

    // Optimistic local update
    const optimisticComment: Comment = {
      id: tempId,
      reelId,
      userId: userProfile.id,
      user: {
        id: userProfile.id,
        name: userProfile.name,
        username: userProfile.username,
        avatar: userProfile.avatar,
        isVerified: userProfile.isVerified
      },
      text: textToPost,
      createdAt: 'Just now',
      likesCount: 0,
      isLiked: false,
      parentId,
      replies: []
    };

    setLocalComments(prev => {
      if (parentId) {
        return prev.map(c => {
          if (c.id === parentId) {
            return { ...c, replies: [...(c.replies || []), optimisticComment] };
          }
          return c;
        });
      }
      return [optimisticComment, ...prev];
    });

    addCommentPromise.then((realComment) => {
      if (realComment && realComment.id) {
        setLocalComments(prev => {
          const replaceTempId = (list: Comment[]): Comment[] => {
            return list.map(c => {
              if (c.id === tempId) {
                return { ...c, id: realComment.id };
              }
              if (c.replies && c.replies.length > 0) {
                return { ...c, replies: replaceTempId(c.replies) };
              }
              return c;
            });
          };
          return replaceTempId(prev);
        });
      }
    }).catch(e => {
      console.error("Failed to post comment:", e);
      // Revert the optimistic update since the API failed
      setLocalComments(prev => {
        const removeTempId = (list: Comment[]): Comment[] => {
          return list.filter(c => c.id !== tempId).map(c => ({
            ...c,
            replies: c.replies ? removeTempId(c.replies) : []
          }));
        };
        return removeTempId(prev);
      });
    });

    // We can release the submission lock after a short delay to prevent double taps,
    // since the actual backend call is handled inside feedStore.addComment asynchronously.
    setTimeout(() => {
      setIsSubmitting(false);
    }, 500);
  };

  const handleLike = (commentId: string | number) => {
    if (String(commentId).startsWith('temp-')) return; // Cannot like a temporary comment
    
    toggleCommentLike(String(commentId));
    
    // Optimistic local update
    const toggleInList = (list: Comment[]): Comment[] => {
      return list.map(c => {
        if (String(c.id) === String(commentId)) {
          const newLiked = !c.isLiked;
          return { ...c, isLiked: newLiked, likesCount: (c.likesCount || 0) + (newLiked ? 1 : -1) };
        }
        if (c.replies && c.replies.length > 0) {
          return { ...c, replies: toggleInList(c.replies) };
        }
        return c;
      });
    };
    setLocalComments(prev => toggleInList(prev));
  };

  const router = useRouter();

  const renderCommentText = (text: string) => {
    const parts = text.split(/(@[\w.-]+)/g);
    return (
      <Text className="text-white text-xs leading-5 pr-4 font-normal">
        {parts.map((part, i) => {
          if (part.startsWith('@')) {
            const username = part.substring(1);
            return (
              <Text 
                key={i} 
                className="text-[#D946EF] font-bold"
                onPress={() => {
                  onClose();
                  router.push(`/user/${username}` as any);
                }}
              >
                {part}
              </Text>
            );
          }
          return <Text key={i}>{part}</Text>;
        })}
      </Text>
    );
  };

  const renderCommentRow = (comment: Comment, isReply = false) => {
    const isHighlighted = String(comment.id) === String(highlightedCommentId);
    return (
      <View key={comment.id} className={`flex-row items-start py-3.5 px-4 gap-3 border-b border-white/5 ${isReply ? 'ml-10 border-b-0 py-2 px-0' : ''} ${isHighlighted ? 'bg-[#D946EF]/20 rounded-lg' : ''}`}>
        <Image 
          source={{ 
            uri: comment.user?.avatar
              ? comment.user.avatar
              : getDefaultAvatar(comment.user?.username || 'user')
          }} 
          className="w-9 h-9 rounded-full" 
        />
      
      <View className="flex-1 gap-1">
        <View className="flex-row items-center flex-wrap gap-1.5">
          <Text className="text-white/80 font-bold text-xs">@{comment.user?.username}</Text>
          <Text className="text-neutral-grey text-[10px]">{comment.createdAt}</Text>
        </View>
        
        {renderCommentText(comment.text)}
        
        <View className="flex-row items-center gap-4 pt-1">
          <Pressable 
            onPress={() => {
              const targetId = isReply ? comment.parentId! : comment.id;
              if (String(targetId).startsWith('temp-')) return;
              setReplyingTo({ id: targetId, username: comment.user?.username || 'user' });
              setTimeout(() => {
                inputRef.current?.focus();
              }, 100);
            }}
            className="py-2 pr-3"
          >
            <Text className="text-neutral-grey text-[10px] font-semibold">Reply</Text>
          </Pressable>
          <Pressable 
            onPress={() => handleLike(comment.id)} 
            className="flex-row items-center gap-1 py-2 px-2"
          >
            <Heart size={12} color={comment.isLiked ? "#D946EF" : "#9CA3AF"} fill={comment.isLiked ? "#D946EF" : "transparent"} />
            <Text className="text-neutral-grey text-[10px]">
              {comment.likesCount > 0 ? formatSocialCount(comment.likesCount) : 'Like'}
            </Text>
          </Pressable>
        </View>

        {/* Render Nested Replies */}
        {!isReply && comment.replies && comment.replies.length > 0 && (
          <View className="mt-2">
            {comment.replies.map(reply => renderCommentRow(reply, true))}
          </View>
        )}
      </View>
    </View>
    );
  };

  if (!isOpen) return null;

  return (
    <Modal visible={isOpen} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView 
        behavior="padding"
        style={{ flex: 1 }}
      >
        <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0 bg-black/40" onPress={onClose} />
        <MotiView
          from={{ translateY: 600, opacity: 0 }}
          animate={{ translateY: 0, opacity: 1 }}
          exit={{ translateY: 600, opacity: 0 }}
          transition={{ type: 'timing', duration: 300 }}
          className="h-[65%] bg-background-plum rounded-t-3xl border-t border-white/10 z-50 shadow-2xl flex-col"
        >
      {/* Drag handle line */}
      <View className="items-center py-2.5">
        <View className="w-10 h-1 bg-white/20 rounded-full" />
      </View>

      {/* Header bar */}
      <View className="flex-row items-center justify-between px-4 pb-3 border-b border-white/5">
        <View className="flex-row items-center gap-2">
          <Text className="text-white font-bold text-lg">Comments</Text>
          <View className="bg-[#D946EF]/20 px-1.5 py-0.5 rounded">
            <Text className="text-[#D946EF] text-[10px] font-bold">{formatSocialCount(reelComments.length)}</Text>
          </View>
        </View>
        <Pressable onPress={onClose} className="p-1">
          <X size={20} color="#D1D5DB" />
        </Pressable>
      </View>

      {/* Comments List */}
      <ScrollView 
        className="flex-1 px-4 py-2" 
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {reelComments.length === 0 ? (
          <View className="py-12 items-center justify-center">
            <Text className="text-white/60 text-sm">No comments yet. Be the first to vibe! 💬</Text>
          </View>
        ) : (
          reelComments.map((comment) => renderCommentRow(comment))
        )}
        <View className="h-10" />
      </ScrollView>

      {/* Footer Input */}
      <View className="bg-background-dark/90 border-t border-white/10">
        
        {/* Mention Suggestions */}
        {suggestions.length > 0 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            className="px-4 py-2 border-b border-white/5"
            style={{ maxHeight: 50 }}
          >
            {suggestions.map((u) => (
              <Pressable 
                key={u.id} 
                onPress={() => handleSelectSuggestion(u.username)}
                className="mr-3 flex-row items-center bg-[#1D1037] border border-white/10 rounded-full pr-3 pl-1 py-1"
              >
                <Image 
                  source={{ uri: u.avatar || getDefaultAvatar(u.username) }} 
                  className="w-6 h-6 rounded-full bg-neutral-grey mr-2" 
                />
                <Text className="text-white text-xs font-semibold">@{u.username}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {replyingTo && (
          <View className="flex-row items-center justify-between px-4 pt-3 pb-1">
            <Text className="text-white/60 text-xs font-semibold">
              Replying to <Text className="text-[#D946EF] font-bold">@{replyingTo.username}</Text>
            </Text>
            <Pressable onPress={() => setReplyingTo(null)}>
              <X size={14} color="#D1D5DB" />
            </Pressable>
          </View>
        )}
        <View 
          className="px-4 pt-4 flex-row items-center gap-4"
          style={{ paddingBottom: Math.max(insets.bottom, 16) }}
        >
          <Image 
            source={{ 
              uri: userProfile.avatar
                ? userProfile.avatar
                : getDefaultAvatar(userProfile.username)
            }} 
            className="w-10 h-10 rounded-full bg-neutral-grey" 
          />
          
          <View className="flex-1 flex-row items-center bg-[#1D1037] rounded-full px-4 py-2.5 border border-white/5">
            <TextInput
              ref={inputRef}
              value={newCommentText}
              onChangeText={handleTextChange}
              placeholder="Add a comment..."
              placeholderTextColor="rgba(255, 255, 255, 0.4)"
              className="flex-1 text-white text-sm py-1 font-normal"
              style={{ maxHeight: 80, minHeight: 36 }}
              multiline
            />

          </View>

          <Pressable onPress={handlePostComment} className="px-2 py-2">
            <Text className={`font-bold text-base ${newCommentText.trim() ? 'text-[#D946EF]' : 'text-[#D946EF]/50'}`}>Post</Text>
          </Pressable>
        </View>
      </View>
        </MotiView>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
