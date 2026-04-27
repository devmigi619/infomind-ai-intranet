import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  ScrollView,
  Platform,
} from 'react-native';
import { Home } from 'lucide-react-native';
import { RightPanelHome } from './RightPanelHome';
import { RightPanelAI } from './RightPanelAI';
import { PulseDot } from './PulseDot';
import type { RpTab } from '../types';

interface RightPanelProps {
  isOpen: boolean;
  rpTab: RpTab;
  onTabChange: (tab: RpTab) => void;
  userName: string;
  hasUnreadAi: boolean;
}

export function RightPanel({
  isOpen,
  rpTab,
  onTabChange,
  userName,
  hasUnreadAi,
}: RightPanelProps) {
  const widthAnim = useRef(new Animated.Value(isOpen ? 360 : 0)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: isOpen ? 360 : 0,
      duration: 280,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
      useNativeDriver: false,
    }).start();
  }, [isOpen, widthAnim]);

  return (
    <Animated.View style={[styles.container, { width: widthAnim }]}>
      <View style={styles.inner}>
        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            onPress={() => onTabChange('home')}
            style={[styles.tab, rpTab === 'home' && styles.tabActive]}
            activeOpacity={0.7}
          >
            <Home
              size={16}
              color={rpTab === 'home' ? '#0A2463' : 'rgba(0,0,0,0.4)'}
            />
            {rpTab === 'home' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>

          <View style={styles.tabDivider} />

          <TouchableOpacity
            onPress={() => onTabChange('ai')}
            style={[styles.tab, rpTab === 'ai' && styles.tabActive]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.aiTabLabel,
                rpTab === 'ai' && styles.aiTabLabelActive,
              ]}
            >
              AI
            </Text>
            {rpTab === 'ai' && <View style={styles.tabIndicator} />}
            {hasUnreadAi && rpTab !== 'ai' && (
              <PulseDot ringColor="#FAFAFA" top={6} right={6} />
            )}
          </TouchableOpacity>
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
    backgroundColor: '#FAFAFA',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(0,0,0,0.08)',
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
  tabActive: {
    backgroundColor: 'rgba(10,36,99,0.08)',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -8,
    width: 16,
    height: 2,
    backgroundColor: '#0A2463',
    borderRadius: 1,
  },
  tabDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: 4,
  },
  aiTabLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: 'rgba(0,0,0,0.4)',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  aiTabLabelActive: {
    color: '#0A2463',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
  },
});
