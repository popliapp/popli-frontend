import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, Platform } from 'react-native';
import { Home, Compass, Plus, MessageSquare, User, Award, PlaySquare } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TAB_BAR_HEIGHT } from '../../components/layout/SafeScreen';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
 const bottomPadding = insets.bottom > 0 ? insets.bottom : (Platform.OS === 'android' ? 8 : 20);

  return (
    <Tabs
      initialRouteName="reels"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#FACC15', // Yellow
        tabBarInactiveTintColor: '#9CA3AF', // Cool Grey
        tabBarStyle: {
          backgroundColor: '#12081E', // Solid Dark Purple to prevent transparent bleed
          borderTopWidth: 1,
          borderTopColor: 'rgba(139, 92, 246, 0.2)', // Translucent Violet
          height: TAB_BAR_HEIGHT + bottomPadding,
          paddingBottom: bottomPadding,
          paddingTop: 8,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          elevation: 0,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: 'SF Pro Rounded',
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View className={`items-center justify-center ${focused ? 'scale-110' : ''}`}>
              <Home size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
              {focused && <View className="h-[3px] w-[3px] rounded-full bg-primary-pink mt-1" />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="discover"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="reels"
        options={{
          title: 'Reels',
          tabBarIcon: ({ color, focused }) => (
            <View className={`items-center justify-center ${focused ? 'scale-110' : ''}`}>
              <PlaySquare size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
              {focused && <View className="h-[3px] w-[3px] rounded-full bg-primary-pink mt-1" />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: '', // Remove text for a clean popup look
          tabBarStyle: { display: 'none' },
          tabBarIcon: ({ focused }) => (
            <View
              className="items-center justify-center shadow-2xl shadow-[#EC4899]"
              style={{
                width: 52,
                height: 52,
                top: -18,
                borderRadius: 26,
                borderWidth: 4,
                borderColor: '#0B001A', // Matches app background
              }}
            >
              <LinearGradient
                colors={['#EC4899', '#8B5CF6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: 26,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Plus size={26} color="#FFFFFF" strokeWidth={3} />
              </LinearGradient>
            </View>
          ),
          tabBarLabelStyle: {
            display: 'none',
          }
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: 'Rewards',
          tabBarIcon: ({ color, focused }) => (
            <View className={`items-center justify-center ${focused ? 'scale-110' : ''}`}>
              <Award size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
              {focused && <View className="h-[3px] w-[3px] rounded-full bg-primary-pink mt-1" />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View className={`items-center justify-center ${focused ? 'scale-110' : ''}`}>
              <User size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
              {focused && <View className="h-[3px] w-[3px] rounded-full bg-primary-pink mt-1" />}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
