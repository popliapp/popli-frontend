import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, FlatList, Pressable, TextInput,
  ActivityIndicator, Platform, Animated
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Send } from 'lucide-react-native';
import { apiClient } from '../../api/client';
import { useAuthStore } from '../../store';
import { io, Socket } from 'socket.io-client';

type Ticket = {
  id: string;
  subject: string;
  description: string;
  status: string;
  createdAt: string;
};

type TicketMessage = {
  id: string;
  message: string;
  senderRole: string;
  createdAt: string;
  sender: { id: string; name: string; username: string };
};

export default function MyTicketsScreen() {
  const router = useRouter();
  const { ticketId } = useLocalSearchParams<{ ticketId?: string }>();
  const { userProfile } = useAuthStore();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [input, setInput] = useState('');
 const [loading, setLoading] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
const prevMsgCount = useRef(0);
  const flatListRef = useRef<FlatList>(null);
  const socketRef = useRef<Socket | null>(null);
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!adminTyping) return;
    const animDot = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: -4, duration: 300, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0, duration: 300, useNativeDriver: true }),
        ])
      );
    const a1 = animDot(dot1, 0);
    const a2 = animDot(dot2, 150);
    const a3 = animDot(dot3, 300);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, [adminTyping]);

useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (ticketId && tickets.length > 0) {
      const t = tickets.find(t => t.id === ticketId);
      if (t) openChat(t);
    }
  }, [ticketId, tickets]);
useEffect(() => {
    if (!activeTicket) return;

    const baseUrl = process.env.EXPO_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3001';
    const socket = io(`${baseUrl}/support`, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.emit('join_ticket', activeTicket.id);

    socket.on('new_message', (msg: TicketMessage) => {
      setAdminTyping(false);
      setMessages(prev => {
        const withoutTemp = prev.filter(m => !m.id.startsWith('temp-'));
        const alreadyExists = withoutTemp.find(m => m.id === msg.id);
        if (alreadyExists) return prev;
        return [...withoutTemp, msg];
      });
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });

    socket.on('typing_start', ({ role }: { role: string }) => {
      if (role !== 'USER') setAdminTyping(true);
    });

    socket.on('typing_stop', ({ role }: { role: string }) => {
      if (role !== 'USER') setAdminTyping(false);
    });

    const ticketInterval = setInterval(async () => {
      try {
        const res = await apiClient.get('/support');
        const updatedTicket = (res.data as Ticket[]).find(t => t.id === activeTicket.id);
        if (updatedTicket) {
          setActiveTicket(updatedTicket);
          setTickets(res.data);
        }
      } catch {}
    }, 5000);

    return () => {
      socket.emit('leave_ticket', activeTicket.id);
      socket.disconnect();
      clearInterval(ticketInterval);
    };
  }, [activeTicket?.id]);

  async function fetchTickets() {
    setLoading(true);
    try {
      const res = await apiClient.get('/support');
      setTickets(res.data);
    } finally {
      setLoading(false);
    }
  }

async function openChat(ticket: Ticket) {
    setActiveTicket(ticket);
    prevMsgCount.current = 0;
    const res = await apiClient.get(`/support/${ticket.id}/messages`);
    const msgs = res.data as TicketMessage[];
    prevMsgCount.current = msgs.length;
    setMessages(msgs);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
  }
async function sendMessage() {
    if (!input.trim() || !activeTicket) return;
    const text = input.trim();
    const optimistic = {
      id: `temp-${Date.now()}`,
      message: text,
      senderRole: 'USER',
      createdAt: new Date().toISOString(),
      sender: { id: userProfile?.id || '', name: userProfile?.name || '', username: userProfile?.username || '' },
    };
    setInput('');
    setMessages(prev => [...prev, optimistic]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    try {
      await apiClient.post(`/support/${activeTicket.id}/message`, { message: text });
    } catch {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      setInput(text);
    }
  }
  const statusColor: Record<string, string> = {
    OPEN: '#22C55E',
    IN_PROGRESS: '#F59E0B',
    RESOLVED: '#6B7280',
    CLOSED: '#6B7280',
  };

  if (activeTicket) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#0B001A' }} edges={['top']}>
        <Stack.Screen options={{ headerShown: false }} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 0}>
          <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
            <Pressable onPress={() => setActiveTicket(null)} style={{ marginRight: 12 }}>
              <ArrowLeft size={22} color="#fff" />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }} numberOfLines={1}>{activeTicket.subject}</Text>
              <Text style={{ color: statusColor[activeTicket.status] || '#6B7280', fontSize: 11, fontWeight: '600', marginTop: 2 }}>{activeTicket.status}</Text>
            </View>
          </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={m => m.id}
            contentContainerStyle={{ padding: 16, gap: 10 }}
            renderItem={({ item }) => {
              const isMe = item.sender.id === userProfile?.id;
              return (
                <View style={{ alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                  {!isMe && (
                    <Text style={{ color: '#A855F7', fontSize: 11, fontWeight: '600', marginBottom: 3 }}>Popli Support</Text>
                  )}
                  <View style={{
                    backgroundColor: isMe ? '#7C3AED' : '#1F0A3C',
                    borderRadius: 14,
                    padding: 12,
                    maxWidth: '80%',
                    borderWidth: 1,
                    borderColor: isMe ? '#7C3AED' : 'rgba(255,255,255,0.08)',
                  }}>
                    <Text style={{ color: '#fff', fontSize: 14 }}>{item.message}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, marginTop: 4, textAlign: 'right' }}>
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                  </View>
                </View>
              );
            }}
          />

 {adminTyping && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
            <View style={{ backgroundColor: '#1F0A3C', borderRadius: 14, padding: 10, alignSelf: 'flex-start', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
              <Text style={{ color: '#A855F7', fontSize: 10, fontWeight: '600', marginBottom: 4 }}>Popli Support</Text>
              <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                {[dot1, dot2, dot3].map((dot, i) => (
                  <Animated.View key={i} style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#A855F7', transform: [{ translateY: dot }] }} />
                ))}
              </View>
            </View>
          </View>
        )}

          {activeTicket.status !== 'RESOLVED' && activeTicket.status !== 'CLOSED' ? (
            <View style={{ flexDirection: 'row', padding: 12, gap: 10, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' }}>
              <TextInput
                value={input}
               onChangeText={(v) => {
                  setInput(v);
                  if (!activeTicket || !socketRef.current) return;
                  socketRef.current.emit('typing_start', { ticketId: activeTicket.id, role: 'USER' });
                  clearTimeout((socketRef.current as any)._typingTimer);
                  (socketRef.current as any)._typingTimer = setTimeout(() => {
                    socketRef.current?.emit('typing_stop', { ticketId: activeTicket.id, role: 'USER' });
                  }, 1500);
                }}
                placeholder="Type a message..."
                placeholderTextColor="#6B7280"
                style={{ flex: 1, backgroundColor: '#1F0A3C', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}
                onSubmitEditing={sendMessage}
                returnKeyType="send"
              />
              <Pressable onPress={sendMessage} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#7C3AED', alignItems: 'center', justifyContent: 'center' }}>
                <Send size={18} color="#fff" />
              </Pressable>
            </View>
          ) : (
            <View style={{ padding: 16, alignItems: 'center' }}>
              <Text style={{ color: '#6B7280', fontSize: 13 }}>This ticket has been {activeTicket.status.toLowerCase()}.</Text>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#0B001A' }} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <ArrowLeft size={22} color="#fff" />
        </Pressable>
        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18 }}>My Tickets</Text>
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#A855F7" />
        </View>
      ) : tickets.length === 0 ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Text style={{ fontSize: 36 }}>🎫</Text>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>No tickets yet</Text>
          <Text style={{ color: '#6B7280', fontSize: 13 }}>Raise a support ticket if you need help</Text>
        </View>
      ) : (
        <FlatList
          data={tickets}
          keyExtractor={t => t.id}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openChat(item)}
              style={{ backgroundColor: '#1F0A3C', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, flex: 1, marginRight: 10 }}>{item.subject}</Text>
                <Text style={{ color: statusColor[item.status] || '#6B7280', fontSize: 11, fontWeight: '700' }}>{item.status}</Text>
              </View>
              <Text style={{ color: '#9CA3AF', fontSize: 12, marginTop: 6 }} numberOfLines={2}>{item.description}</Text>
              <Text style={{ color: '#6B7280', fontSize: 11, marginTop: 8 }}>{new Date(item.createdAt).toLocaleDateString()}</Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}