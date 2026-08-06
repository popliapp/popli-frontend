import React from 'react';
import {
  View,
  StyleSheet,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  ScrollView,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenWrapperProps {
  children: React.ReactNode;
  scrollable?: boolean;
  disableKeyboardDismiss?: boolean;
  bottomButton?: React.ReactNode;
  backgroundColor?: string;
  contentContainerStyle?: object;
}

export const ScreenWrapper = ({
  children,
  scrollable = false,
  disableKeyboardDismiss = false,
  bottomButton,
  backgroundColor = '#12081E',
  contentContainerStyle,
}: ScreenWrapperProps) => {
  const insets = useSafeAreaInsets();

  const topPadding = Math.max(insets.top, 16);
  const bottomInset = Math.max(insets.bottom, 16);

  const inner = scrollable ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[
        styles.scrollContent,
        !bottomButton && { paddingBottom: bottomInset },
        contentContainerStyle,
      ]}
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View
      style={[
        styles.flex,
        !bottomButton && { paddingBottom: bottomInset },
        contentContainerStyle,
      ]}
    >
      {children}
    </View>
  );

  const wrapped = disableKeyboardDismiss ? (
    inner
  ) : (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      {inner}
    </TouchableWithoutFeedback>
  );

  const body = (
    <View style={[styles.flex, { backgroundColor, paddingTop: topPadding }]}>
      {wrapped}
      {bottomButton && (
        <View style={[styles.bottomButton, { paddingBottom: bottomInset }]}>
          {bottomButton}
        </View>
      )}
    </View>
  );

  if (Platform.OS === 'ios') {
    return (
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor }]}
        behavior="padding"
        keyboardVerticalOffset={insets.top}
      >
        {body}
      </KeyboardAvoidingView>
    );
  }

  return body;
};

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  bottomButton: {
    paddingHorizontal: 16,
  },
});