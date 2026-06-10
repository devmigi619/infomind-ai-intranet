import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
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
      className="flex-1 w-full rounded-xl border overflow-hidden"
      style={{
        height: heightAnim,
        backgroundColor: theme.bg.surface,
        borderColor: theme.border.subtle,
        ...cardShadow,
      }}
    >
      {isCollapsed ? (
        <TouchableOpacity
          className="h-10 flex-row items-center justify-between px-[14px]"
          activeOpacity={0.8}
          onPress={() => setAssistantStage('medium')}
        >
          <View className="flex-row items-center gap-1.5">
            <View className="relative w-5 h-5 items-center justify-center">
              <Sparkles size={16} color={theme.brand.primary} />
              {showPulseDot && (
                <PulseDot ringColor={theme.bg.surface} top={-3} right={-3} />
              )}
            </View>
            <Text
              className="text-sm font-medium"
              style={{
                color: theme.brand.primary,
                fontFamily: Platform.OS === 'web' ? "'Noto Sans KR', sans-serif" : undefined,
              }}
            >
              AI 어시스턴트
            </Text>
          </View>
          <ChevronDown size={16} color={theme.brand.primary} />
        </TouchableOpacity>
      ) : (
        <View className="px-[14px] pt-2.5 pb-[14px] gap-2.5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <Sparkles size={16} color={theme.brand.primary} />
              <Text
                className="text-sm font-medium"
                style={{
                  color: theme.brand.primary,
                  fontFamily: Platform.OS === 'web' ? "'Noto Sans KR', sans-serif" : undefined,
                }}
              >
                AI 어시스턴트
              </Text>
            </View>
            <TouchableOpacity
              className="w-7 h-7 items-center justify-center rounded-md"
              activeOpacity={0.7}
              onPress={() => setAssistantStage('collapsed')}
            >
              <ChevronUp size={16} color={theme.brand.primary} />
            </TouchableOpacity>
          </View>

          {assistantMode === 'context' && contextActions.length > 0 ? (
            <View className="flex-row flex-wrap gap-1.5">
              {contextActions.slice(0, 3).map((card, i) => (
                <TouchableOpacity
                  key={i}
                  className="flex-row items-center px-3 py-[9px] rounded-[18px] border gap-1 self-start"
                  style={{
                    backgroundColor: theme.bg.surface,
                    borderColor: theme.brand.primary,
                  }}
                  activeOpacity={0.75}
                  onPress={() => handleChipPress(card)}
                >
                  <Text
                    className="text-[13px] font-medium"
                    style={{
                      color: theme.brand.primary,
                      fontFamily: Platform.OS === 'web' ? "'Noto Sans KR', sans-serif" : undefined,
                    }}
                    numberOfLines={1}
                  >
                    {card.title}
                  </Text>
                  <ChevronRight size={14} color={theme.brand.primary} />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View className="flex-row flex-wrap gap-2">
              {QUICK_ACTIONS.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  className={`w-[47%] flex-row items-center gap-1.5 px-2.5 py-2 rounded-lg border ${
                    action.disabled ? 'opacity-50' : ''
                  }`}
                  style={{
                    backgroundColor: theme.bg.surface,
                    borderColor: theme.border.subtle,
                  }}
                  activeOpacity={action.disabled ? 0.5 : 0.75}
                  onPress={() => handleQuickAction(action)}
                >
                  <Text className="text-base">{action.emoji}</Text>
                  <Text
                    className="text-xs flex-1"
                    style={{
                      color: action.disabled ? theme.text.subtle : theme.text.body,
                      fontFamily: Platform.OS === 'web' ? "'Noto Sans KR', sans-serif" : undefined,
                    }}
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
