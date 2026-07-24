import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import NetInfo, { useNetInfo } from '@react-native-community/netinfo';
import { WifiOff, AlertTriangle, Inbox } from 'lucide-react-native';

interface StateFeedbackProps {
  isLoading: boolean;
  error: string | null;
  isEmpty: boolean;
  emptyMessage?: string;
  children: React.ReactNode;
}

export const StateFeedback: React.FC<StateFeedbackProps> = ({
  isLoading,
  error,
  isEmpty,
  emptyMessage = "No items found.",
  children
}) => {
  const netInfo = useNetInfo();

  if (!netInfo.isConnected && netInfo.isConnected !== null) {
    return (
      <View style={styles.center}>
        <WifiOff size={48} color="#aaa" />
        <Text style={styles.text}>You are offline. Please check your connection.</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF2D55" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <AlertTriangle size={48} color="#FF2D55" />
        <Text style={styles.text}>{error}</Text>
      </View>
    );
  }

  if (isEmpty) {
    return (
      <View style={styles.center}>
        <Inbox size={48} color="#aaa" />
        <Text style={styles.text}>{emptyMessage}</Text>
      </View>
    );
  }

  return <>{children}</>;
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  text: { color: '#fff', marginTop: 16, fontSize: 16, textAlign: 'center' }
});
