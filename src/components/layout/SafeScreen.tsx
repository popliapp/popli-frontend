import React from 'react';
import { View, ViewProps, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const TAB_BAR_HEIGHT = 58;

interface SafeScreenProps extends ViewProps {
  children: React.ReactNode;
  /**
   * If true, adds extra padding at the bottom to ensure content isn't 
   * hidden behind the absolute positioned custom bottom tab bar.
   * Default: false
   */
  withBottomTabs?: boolean;
  /**
   * If true, avoids padding the top so the screen renders under the status bar.
   * Default: false
   */
  edgeToEdgeTop?: boolean;
  /**
   * If true, avoids padding the bottom so the screen renders under the navigation bar.
   * Default: false
   */
  edgeToEdgeBottom?: boolean;
}

/**
 * Global wrapper to handle safe areas (Notches, Dynamic Islands, Nav bars) 
 * reliably across all devices. Replaces hardcoded pt-12, pt-14, etc.
 */
export const SafeScreen = ({ 
  children, 
  withBottomTabs = false,
  edgeToEdgeTop = false,
  edgeToEdgeBottom = false,
  style, 
  className,
  ...rest 
}: SafeScreenProps) => {
  const insets = useSafeAreaInsets();
  
  // Calculate top padding: min 16px to prevent content from touching the very top if no notch
  const paddingTop = edgeToEdgeTop ? 0 : Math.max(insets.top, 16);
  
  // Calculate bottom padding
  let paddingBottom = edgeToEdgeBottom ? 0 : Math.max(insets.bottom, 16);
  
  if (withBottomTabs) {
    // If the screen sits behind tabs, add the tab bar height
    paddingBottom += TAB_BAR_HEIGHT;
  }

  return (
    <View 
      className={`flex-1 ${className || ''}`}
      style={[
        { paddingTop, paddingBottom },
        style
      ]}
      {...rest}
    >
      {children}
    </View>
  );
};
