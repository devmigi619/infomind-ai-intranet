import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
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
      style={{
        borderLeftWidth: 1,
        overflow: 'hidden',
        width: widthAnim,
        backgroundColor: theme.bg.surfaceAlt,
        borderLeftColor: theme.border.default,
      }}
    >
      <View
        className="flex-1 flex-col"
        style={{ width: 360 }}
      >
        {/* Tabs */}
        <View className="flex-row items-center px-4 pt-3 pb-2" style={{ gap: 4 }}>
          {TABS.map(({ id, label, Icon }, idx) => {
            const isActive = rpTab === id;
            const webTitleProp = Platform.OS === 'web' ? ({ title: label } as object) : {};
            return (
              <React.Fragment key={id}>
                {idx > 0 && (
                  <View
                    style={{
                      width: 1,
                      height: 16,
                      marginHorizontal: 4,
                      backgroundColor: theme.border.default,
                    }}
                  />
                )}
                <TouchableOpacity
                  onPress={() => onTabChange(id)}
                  className="w-9 h-9 items-center justify-center rounded-lg relative"
                  style={{
                    backgroundColor: isActive ? theme.brand.primaryTint : 'transparent',
                  }}
                  activeOpacity={0.7}
                  accessibilityLabel={label}
                  {...webTitleProp}
                >
                  <Icon size={18} color={isActive ? theme.brand.primary : theme.text.muted} />
                  {isActive && (
                    <View
                      className="absolute"
                      style={{
                        bottom: -8,
                        left: '50%',
                        marginLeft: -8,
                        width: 16,
                        height: 2,
                        borderRadius: 1,
                        backgroundColor: theme.brand.primary,
                      }}
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
          className="flex-1"
          contentContainerStyle={{ padding: 16 }}
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
