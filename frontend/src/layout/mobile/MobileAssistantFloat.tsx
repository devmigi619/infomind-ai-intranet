import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
  Alert,
} from 'react-native';
import { Sparkles, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../shared/hooks/useTheme';
import { useUiStore } from '../../store/uiStore';
import { PulseDot } from '../../shared/components/PulseDot';
import type { AssistantCard } from '../../features/ai-assistant/types';

// ─── Quick actions (모듈 진입 시뮬레이션) ────────────────────────────────────

interface QuickAction {
  emoji: string;
  label: string;
  target: string;
  disabled?: boolean;
}

const QUICK_ACTIONS: QuickAction[] = [
  { emoji: '💼', label: '휴가 신청', target: '휴가 결재 작성' },
  { emoji: '📝', label: '주간보고 작성', target: '주간보고 작성' },
  { emoji: '🚗', label: '차량 예약', target: '', disabled: true },
  { emoji: '🏢', label: '회의실 예약', target: '', disabled: true },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface MobileAssistantFloatProps {
  // Animated.Value owned by MobileMainScreen — drives the outer container height.
  // This component renders content only; height/position is managed by parent.
  heightAnim: Animated.Value;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MobileAssistantFloat({ heightAnim }: MobileAssistantFloatProps) {
  const theme = useTheme();
  const assistantStage = useUiStore((s) => s.assistantStage);
  const setAssistantStage = useUiStore((s) => s.setAssistantStage);
  const assistantMode = useUiStore((s) => s.assistantMode);
  const assistantContextCards = useUiStore((s) => s.assistantContextCards);
  const assistantContextSeen = useUiStore((s) => s.assistantContextSeen);

  // 'full' stage not used — auto-correct to 'medium'
  useEffect(() => {
    if (assistantStage === 'full') {
      setAssistantStage('medium');
    }
  }, [assistantStage, setAssistantStage]);

  // heightAnim is driven by parent; nothing to animate here

  const cardShadow =
    Platform.OS === 'web'
      ? ({ boxShadow: '0 2px 10px rgba(0,0,0,0.08)' } as object)
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.08,
          shadowRadius: 10,
          elevation: 3,
        };

  const handleQuickAction = (action: QuickAction) => {
    if (action.disabled) {
      if (Platform.OS === 'web') window.alert('준비 중입니다');
      else Alert.alert('안내', '준비 중입니다');
      return;
    }
    const msg = `${action.target} 화면으로 이동 (추후 구현)`;
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('안내', msg);
  };

  const handleChipPress = (card: AssistantCard) => {
    const msg = `${card.title}(으)로 이동 (추후 구현)`;
    if (Platform.OS === 'web') window.alert(msg);
    else Alert.alert('안내', msg);
  };

  const isCollapsed = assistantStage === 'collapsed';
  const contextActions = assistantContextCards.filter((c) => c.type === 'action');
  const showPulseDot =
    isCollapsed &&
    assistantMode === 'context' &&
    assistantContextCards.length > 0 &&
    !assistantContextSeen;

  return (
    <Animated.View
      style={[
        styles.container,
        cardShadow,
        {
          height: heightAnim,
          backgroundColor: theme.bg.surface,
          borderColor: theme.border.subtle,
        },
      ]}
    >
      {isCollapsed ? (
        <TouchableOpacity
          style={styles.collapsedBar}
          activeOpacity={0.8}
          onPress={() => setAssistantStage('medium')}
        >
          <View style={styles.rowLeft}>
            <View style={styles.sparklesWrap}>
              <Sparkles size={16} color={theme.brand.primary} />
              {showPulseDot && (
                <PulseDot ringColor={theme.bg.surface} top={-3} right={-3} />
              )}
            </View>
            <Text style={[styles.title, { color: theme.brand.primary }]}>AI 어시스턴트</Text>
          </View>
          <ChevronDown size={16} color={theme.brand.primary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.mediumContent}>
          <View style={styles.mediumHeader}>
            <View style={styles.rowLeft}>
              <Sparkles size={16} color={theme.brand.primary} />
              <Text style={[styles.title, { color: theme.brand.primary }]}>AI 어시스턴트</Text>
            </View>
            <TouchableOpacity
              style={styles.headerIconBtn}
              activeOpacity={0.7}
              onPress={() => setAssistantStage('collapsed')}
            >
              <ChevronUp size={16} color={theme.brand.primary} />
            </TouchableOpacity>
          </View>

          {assistantMode === 'context' && contextActions.length > 0 ? (
            <View style={styles.chipColumn}>
              {contextActions.slice(0, 3).map((card, i) => (
                <TouchableOpacity
                  key={i}
                  style={[
                    styles.contextChip,
                    {
                      backgroundColor: theme.bg.surface,
                      borderColor: theme.brand.primary,
                    },
                  ]}
                  activeOpacity={0.75}
                  onPress={() => handleChipPress(card)}
                >
                  <Text
                    style={[styles.chipLabel, { color: theme.brand.primary }]}
                    numberOfLines={1}
                  >
                    {card.title}
                  </Text>
                  <ChevronRight size={14} color={theme.brand.primary} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.grid}>
              {QUICK_ACTIONS.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  style={[
                    styles.actionCard,
                    {
                      backgroundColor: theme.bg.surface,
                      borderColor: theme.border.subtle,
                    },
                    action.disabled && styles.actionCardDisabled,
                  ]}
                  activeOpacity={action.disabled ? 0.5 : 0.75}
                  onPress={() => handleQuickAction(action)}
                >
                  <Text style={styles.actionEmoji}>{action.emoji}</Text>
                  <Text
                    style={[
                      styles.actionLabel,
                      { color: action.disabled ? theme.text.subtle : theme.text.body },
                    ]}
                    numberOfLines={1}
                  >
                    {action.label}
                    {action.disabled ? ' (준비중)' : ''}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  collapsedBar: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  sparklesWrap: {
    position: 'relative',
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mediumContent: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 10,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  mediumHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIconBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 6,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionCard: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionCardDisabled: {
    opacity: 0.5,
  },
  actionEmoji: {
    fontSize: 16,
  },
  actionLabel: {
    fontSize: 12,
    flex: 1,
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  chipColumn: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  contextChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 18,
    borderWidth: 1,
    gap: 4,
    alignSelf: 'flex-start',
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
});
