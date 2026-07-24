import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react-native';
import { useToastStore } from '../store/toastStore';

const CONFIG = {
  success: { icon: CheckCircle2, color: '#10B981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.35)' },
  error: { icon: XCircle, color: '#EF4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.35)' },
  info: { icon: Info, color: '#A855F7', bg: 'rgba(168, 85, 247, 0.12)', border: 'rgba(168, 85, 247, 0.35)' },
};

export function ToastHost() {
  const { visible, message, type, action, duration, toastId, hideToast } = useToastStore();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!visible) return;

    if (timerRef.current) clearTimeout(timerRef.current);

    Animated.parallel([
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, friction: 9, tension: 80 }),
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();

    timerRef.current = setTimeout(() => {
      dismiss();
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toastId, visible]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: 100, duration: 180, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => hideToast());
  };

  if (!visible) return null;

  const { icon: Icon, color, bg, border } = CONFIG[type];

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.wrapper,
        { bottom: insets.bottom + 16, opacity, transform: [{ translateY }] },
      ]}
    >
      <View style={[styles.toast, { backgroundColor: '#1A0E2C', borderColor: border }]}>
        <View style={[styles.iconWrap, { backgroundColor: bg }]}>
          <Icon size={16} color={color} />
        </View>
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
        {action ? (
          <Pressable
            onPress={() => {
              action.onPress();
              dismiss();
            }}
            hitSlop={8}
          >
            <Text style={[styles.actionLabel, { color }]}>{action.label}</Text>
          </Pressable>
        ) : (
          <Pressable onPress={dismiss} hitSlop={8}>
            <X size={16} color="#9CA3AF" />
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    elevation: 20,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  iconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});