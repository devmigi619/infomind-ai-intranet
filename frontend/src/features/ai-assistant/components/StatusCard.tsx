import React from 'react';
import { View, Text, Platform } from 'react-native';
import {
  Activity,
  Car,
  CalendarDays,
  Clock,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import type { AssistantCard } from '../types';

// ─── Icon map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  Activity,
  Car,
  CalendarDays,
  Clock,
  AlertCircle,
};

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

// ─── Component ────────────────────────────────────────────────────────────────

interface StatusCardProps {
  card: AssistantCard;
}

export function StatusCard({ card }: StatusCardProps) {
  const Icon = ICON_MAP[card.icon] ?? Activity;
  const theme = useTheme();

  return (
    <View
      style={{
        backgroundColor: theme.bg.surface,
        borderColor: theme.border.default,
      }}
      className="border rounded-xl p-3.5 gap-2"
    >
      {/* Header row: icon + label */}
      <View className="flex-row items-center gap-2">
        <View
          style={{ backgroundColor: theme.semanticTint.success }}
          className="w-7 h-7 rounded-[7px] items-center justify-center flex-shrink-0"
        >
          <Icon size={16} color={theme.semantic.success} />
        </View>
        <Text
          style={{ color: theme.text.muted, fontFamily: WEB_FONT }}
          className="text-[12px] font-medium"
          numberOfLines={1}
        >
          {card.title}
        </Text>
      </View>

      {/* Value */}
      <Text
        style={{ color: theme.text.primary, fontFamily: WEB_FONT }}
        className="text-[15px] font-semibold"
      >
        {card.value ?? '—'}
      </Text>
    </View>
  );
}

