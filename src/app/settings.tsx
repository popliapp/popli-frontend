import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, Switch, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore, useKYCStore } from '../store';
import { getDefaultAvatar } from '../utils';
import { 
  ArrowLeft, Star, CreditCard, BarChart2, Clock, 
  Heart, Download, Bell, Database, Lock, Ban, 
  UserPlus, HelpCircle, AlertOctagon, Info, ChevronRight 
} from 'lucide-react-native';
import { SafeScreen } from '../components/layout/SafeScreen';
import { ConfirmSheet } from '../components/ConfirmSheet';

const SectionTitle = ({ title }: { title: string }) => (
  <Text className="text-neutral-grey text-[10px] font-bold uppercase tracking-widest mt-6 mb-4">{title}</Text>
);

const ListItem = ({ 
  icon: Icon, 
  title, 
  subtitle, 
  rightElement, 
  onPress 
}: { 
  icon: any, 
  title: string, 
  subtitle?: string, 
  rightElement?: React.ReactNode,
  onPress?: () => void 
}) => (
  <Pressable 
    onPress={onPress}
    className="flex-row items-center justify-between bg-[#1A0E2C] border-b border-[#2D1B4E]/50 px-4 py-4"
  >
    <View className="flex-row items-center gap-4">
      <Icon size={20} color="#9CA3AF" />
      <View>
        <Text className="text-white font-medium text-sm">{title}</Text>
        {subtitle && <Text className="text-neutral-grey text-[10px] mt-1">{subtitle}</Text>}
      </View>
    </View>
    {rightElement || <ChevronRight size={18} color="#4B5563" />}
  </Pressable>
);

export default function SettingsScreen() {
  const router = useRouter();
  const { userProfile, notificationsEnabled, toggleNotifications, logout } = useAuthStore();
  const { resetKYC } = useKYCStore();

const [dataSaver, setDataSaver] = useState(false);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);

  const handleLogout = () => {
    setIsLogoutConfirmOpen(true);
  };

  return (
    <SafeScreen edgeToEdgeBottom className="bg-[#12081E]">
      {/* Header */}
      <View className="flex-row items-center px-4 pb-6">
        <Pressable onPress={() => router.back()} className="p-2 -ml-2">
          <ArrowLeft size={20} color="#FFFFFF" />
        </Pressable>
        <Text className="text-white font-bold text-base ml-2">Settings</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        
        {/* Profile Card */}
        <View className="bg-[#1A0E2C] rounded-2xl mx-4 p-4 flex-row items-center justify-between border border-white/5">
          <Pressable 
            onPress={() => router.back()} 
            className="flex-row items-center gap-4 flex-1"
          >
            <View className="w-14 h-14 rounded-full overflow-hidden items-center justify-center border-2 border-[#F59E0B]/50 bg-[#F59E0B]/20">
              {userProfile?.avatar ? (
                <Image source={{ uri: userProfile.avatar }} className="w-full h-full" resizeMode="cover" />
              ) : (
                <Image source={{ uri: getDefaultAvatar(userProfile?.username || 'user') }} className="w-full h-full" resizeMode="cover" />
              )}
            </View>
            <View className="flex-1">
              <Text className="text-white font-bold text-base">{userProfile?.name || 'User'}</Text>
              <Text className="text-neutral-grey text-xs mt-1">@{userProfile?.username?.toUpperCase() || 'USER'}</Text>
            </View>
          </Pressable>
          <Pressable 
            onPress={() => router.push('/edit-profile')}
            className="bg-[#A855F7] px-4 py-2 rounded-lg ml-2"
          >
            <Text className="text-white font-bold text-xs uppercase">Edit Profile</Text>
          </Pressable>
        </View>

        <View className="px-4">
          
          {/* MONETIZATION */}
          <SectionTitle title="Monetization" />
          
          <Pressable 
            onPress={() => router.push('/(creator)/portal')}
            className="flex-row items-center justify-between bg-[#1A0E2C] rounded-2xl p-4 mb-4 shadow-sm border border-white/5" 
            style={{ borderLeftWidth: 4, borderLeftColor: '#FACC15' }}
          >
            <View className="flex-row items-center gap-4">
              <View className="w-8 h-8 rounded-full bg-[#FACC15]/10 items-center justify-center border border-[#FACC15]/20">
                <Star size={16} color="#FACC15" fill="#FACC15" />
              </View>
              <View>
                <Text className="text-white font-bold text-sm">Creator Portal</Text>
                <Text className="text-neutral-grey text-[10px] mt-1">View your growth & tools</Text>
              </View>
            </View>
            <ChevronRight size={18} color="#4B5563" />
          </Pressable>

          <View className="flex-row justify-between mb-2 gap-4">
            <Pressable 
              onPress={() => router.push('/withdraw')}
              className="flex-1 bg-[#1A0E2C] border border-white/5 rounded-2xl p-4 justify-between shadow-sm min-h-[96px]"
            >
              <View className="mb-2">
                <CreditCard size={20} color="#EC4899" />
              </View>
              <View>
                <Text className="text-white font-bold text-sm mb-1">Payout Settings</Text>
                <Text className="text-neutral-grey text-[9px] uppercase tracking-wider">Configure</Text>
              </View>
            </Pressable>

            <Pressable 
              onPress={() => router.push('/(creator)/earnings')}
              className="flex-1 bg-[#1A0E2C] border border-white/5 rounded-2xl p-4 justify-between shadow-sm min-h-[96px]"
            >
              <View className="mb-2">
                <BarChart2 size={20} color="#3B82F6" />
              </View>
              <View>
                <Text className="text-white font-bold text-sm mb-1">Earnings History</Text>
                <Text className="text-neutral-grey text-[9px] uppercase tracking-wider">Last 30 Days</Text>
              </View>
            </Pressable>
          </View>

          {/* CONTENT & ACTIVITY */}
          <SectionTitle title="Content & Activity" />
          <View className="rounded-2xl overflow-hidden border border-white/5 bg-[#1A0E2C]">
            <ListItem icon={Clock} title="Watch History" onPress={() => router.push('/(settings)/watch-history')} />
            <ListItem icon={Heart} title="Liked Videos" onPress={() => router.push('/(settings)/liked-videos')} />
            <ListItem icon={Download} title="Downloads" onPress={() => router.push('/(settings)/downloads')} />
          </View>

          {/* PREFERENCES */}
          <SectionTitle title="Preferences" />
          <View className="rounded-2xl overflow-hidden border border-white/5 bg-[#1A0E2C]">
            <ListItem 
              icon={Bell} 
              title="Push Notifications" 
              rightElement={
                <Switch
                  value={notificationsEnabled}
                  onValueChange={toggleNotifications}
                  trackColor={{ false: '#374151', true: '#A855F7' }}
                  thumbColor={'#FFFFFF'}
                />
              } 
            />
            <ListItem 
              icon={Database} 
              title="Data Saver" 
              rightElement={
                <Switch
                  value={dataSaver}
                  onValueChange={setDataSaver}
                  trackColor={{ false: '#374151', true: '#A855F7' }}
                  thumbColor={'#FFFFFF'}
                />
              } 
            />
          </View>

          {/* PRIVACY & SAFETY */}
          <SectionTitle title="Privacy & Safety" />
          <View className="rounded-2xl overflow-hidden border border-white/5 bg-[#1A0E2C]">
            <ListItem 
              icon={Lock} 
              title="Account Privacy" 
              rightElement={<Text className="text-neutral-grey text-xs">Public</Text>} 
              onPress={() => router.push('/(settings)/privacy')}
            />
            <ListItem icon={Ban} title="Blocked Accounts" onPress={() => router.push('/(settings)/blocked')} />
          </View>

          {/* SUPPORT */}
          <SectionTitle title="Support" />
          <View className="rounded-2xl overflow-hidden border border-white/5 bg-[#1A0E2C]">
            <ListItem icon={UserPlus} title="Refer a Friend" onPress={() => router.push('/referrals')} />
            <ListItem icon={HelpCircle} title="Help Center" onPress={() => router.push('/support')} />
            <ListItem icon={AlertOctagon} title="Report a Problem" onPress={() => router.push('/support')} />
            <ListItem icon={Info} title="About" onPress={() => router.push('/(settings)/about')} />
          </View>

      {/* LOG OUT */}
          <Pressable onPress={handleLogout} className="mt-6 mb-4 items-center py-4">
            <Text className="text-[#EF4444] font-bold text-sm tracking-widest">LOG OUT</Text>
          </Pressable>

          {/* FOOTER */}
          <View className="items-center pb-12 opacity-50">
            <Text className="text-neutral-grey text-[9px] mt-1">v2.0.0 (Preview)</Text>
          </View>

        </View>
      </ScrollView>

      <ConfirmSheet
        isVisible={isLogoutConfirmOpen}
        title="Log Out"
        message="Are you sure you want to log out?"
        confirmLabel="Log Out"
        cancelLabel="Cancel"
        destructive
        onCancel={() => setIsLogoutConfirmOpen(false)}
        onConfirm={() => {
          setIsLogoutConfirmOpen(false);
          logout();
          resetKYC();
        }}
      />
    </SafeScreen>
  );
}