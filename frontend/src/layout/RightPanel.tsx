import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  ScrollView,
  Platform,
} from 'react-native';
import { LayoutGrid, Sparkles } from 'lucide-react-native';
import { RightPanelHome } from './RightPanelHome';
import { RightPanelAI } from './RightPanelAI';
import { PulseDot } from '../shared/components/PulseDot';
import type { RpTab } from '../types';
import { useTheme } from '../shared/hooks/useTheme';

interface RightPanelProps {
  isOpen: boolean;
  rpTab: RpTab;
  onTabChange: (tab: RpTab) => void;
  userName: string;
  hasUnreadAi: boolean;
}

const TABS: { id: RpTab; label: string; Icon: React.ComponentType<{ size?: number; color?: string }> }[] = [
  { id: 'home', label: '대시보드', Icon: LayoutGrid },
  { id: 'ai', label: 'AI 어시스턴트', Icon: Sparkles },
];

export function RightPanel({ isOpen, rpTab, onTabChange, userName, hasUnreadAi }: RightPanelProps) {
  const widthAnim = useRef(new Animated.Value(isOpen ? 360 : 0)).current;
  const theme = useTheme();

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: isOpen ? 360 : 0,
      duration: 280,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: false,
    }).start();
  }, [isOpen, widthAnim]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: widthAnim,
          backgroundColor: theme.bg.surfaceAlt,
          borderLeftColor: theme.border.default,
        },
      ]}
    >
      <View style={styles.inner}>
        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map(({ id, label, Icon }, idx) => {
            const isActive = rpTab === id;
            const webTitleProp = Platform.OS === 'web' ? ({ title: label } as object) : {};
            return (
              <React.Fragment key={id}>
                {idx > 0 && (
                  <View style={[styles.tabDivider, { backgroundColor: theme.border.default }]} />
                )}
                <TouchableOpacity
                  onPress={() => onTabChange(id)}
                  style={[
                    styles.tab,
                    isActive && { backgroundColor: theme.brand.primaryTint },
                  ]}
                  activeOpacity={0.7}
                  accessibilityLabel={label}
                  {...webTitleProp}
                >
                  <Icon size={18} color={isActive ? theme.brand.primary : theme.text.muted} />
                  {isActive && (
                    <View
                      style={[styles.tabIndicator, { backgroundColor: theme.brand.primary }]}
                    />
                  )}
                  {id === 'ai' && hasUnreadAi && !isActive && (
                    <PulseDot ringColor={theme.bg.surfaceAlt} top={4} right={4} />
                  )}
                </TouchableOpacity>
              </React.Fragment>
            );
          })}
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentInner}
          showsVerticalScrollIndicator={false}
        >
          {rpTab === 'home' ? (
            <RightPanelHome userName={userName} />
          ) : (
            <RightPanelAI />
          )}
        </ScrollView>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderLeftWidth: 1,
    overflow: 'hidden',
  },
  inner: {
    width: 360,
    flex: 1,
    flexDirection: 'column',
  },
  tabs: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 4,
  },
  tab: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -8,
    width: 16,
    height: 2,
    borderRadius: 1,
  },
  tabDivider: {
    width: 1,
    height: 16,
    marginHorizontal: 4,
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
  },
});
