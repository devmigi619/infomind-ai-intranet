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
          {TABS.map(({ id, label, Icon }, idx) => {
            const isActive = rpTab === id;
            // RN Web에서 hover 시 native browser tooltip 표시 (모바일 무시)
            const webTitleProp = Platform.OS === 'web' ? ({ title: label } as object) : {};
            return (
              <React.Fragment key={id}>
                {idx > 0 && <View style={styles.tabDivider} />}
                <TouchableOpacity
                  onPress={() => onTabChange(id)}
                  style={[styles.tab, isActive && styles.tabActive]}
                  activeOpacity={0.7}
                  accessibilityLabel={label}
                  {...webTitleProp}
                >
                  <Icon size={18} color={isActive ? '#0A2463' : 'rgba(0,0,0,0.4)'} />
                  {isActive && <View style={styles.tabIndicator} />}
                  {id === 'ai' && hasUnreadAi && !isActive && (
                    <PulseDot ringColor="#FAFAFA" top={4} right={4} />
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
          {rpTab === 'home' ? <RightPanelHome userName={userName} /> : <RightPanelAI />}
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
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
  },
});
