import React, { useEffect } from 'react';
import { View, ScrollView, Text } from 'react-native';
import StoryRing from '../StoryRing';
import { useStoryStore, useAuthStore } from '../../store';
import { getDefaultAvatar } from '../../utils';

export const StoriesBar = () => {
  const { stories, fetchStories } = useStoryStore();
  const { userProfile, followingIds } = useAuthStore();

  useEffect(() => {
    fetchStories();
  }, []);

  // Group stories by creator
  const storyGroups = new Map<string, any>();
  stories.forEach(story => {
    if (!storyGroups.has(story.creatorId)) {
      storyGroups.set(story.creatorId, {
        creatorId: story.creatorId,
        creatorName: story.creatorName,
        creatorUsername: story.creatorUsername,
        creatorAvatar: story.creatorAvatar,
        stories: [],
        hasUnviewed: false
      });
    }
    const group = storyGroups.get(story.creatorId);
    group.stories.push(story);
    if (!story.viewers.includes(userProfile.username)) {
      group.hasUnviewed = true;
    }
  });

  // Convert to array and sort:
  // 1. Current user first
  // 2. Unviewed stories next
  // 3. Viewed stories last
  const groupedStories = Array.from(storyGroups.values()).sort((a, b) => {
    if (a.creatorId === userProfile.username) return -1;
    if (b.creatorId === userProfile.username) return 1;
    if (a.hasUnviewed && !b.hasUnviewed) return -1;
    if (!a.hasUnviewed && b.hasUnviewed) return 1;
    return 0;
  });

  // Always ensure current user is in the list even if they have no stories
  const hasOwnStory = groupedStories.find(g => g.creatorId === userProfile.username);

  return (
    <View className="border-b border-white/10 bg-[#12081E] py-2">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 16 }}
      >
        {!hasOwnStory && (
          <StoryRing
            userId={userProfile.username}
            name={userProfile.name}
            avatarUrl={userProfile.avatar || getDefaultAvatar(userProfile.name || userProfile.username)}
            size={68}
            showName={true}
          />
        )}
        
        {groupedStories.map(group => (
          <StoryRing
            key={group.creatorId}
            userId={group.creatorId}
            name={group.creatorUsername || group.creatorName}
            avatarUrl={group.creatorAvatar || getDefaultAvatar(group.creatorName || group.creatorUsername)}
            size={68}
            showName={true}
          />
        ))}
      </ScrollView>
    </View>
  );
};
