import React from 'react';
import { View, Text, TouchableOpacity, Alert, Platform } from 'react-native';
import {
  FileText,
  Briefcase,
  MessageCircle,
  Car,
  CalendarDays,
  ClipboardList,
  CreditCard,
  GraduationCap,
  BookOpen,
  Clock,
  AlertCircle,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import type { AssistantCard } from '../types';
import { useUiStore } from '../../../store/uiStore';
import type { PanelId } from '../../../types';

// ─── Icon map ─────────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, LucideIcon> = {
  FileText,
  Briefcase,
  MessageCircle,
  Car,
  CalendarDays,
  ClipboardList,
  CreditCard,
  GraduationCap,
  BookOpen,
  Clock,
  AlertCircle,
};

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

// ─── Component ────────────────────────────────────────────────────────────────

interface ActionCardProps {
  card: AssistantCard;
}

export function ActionCard({ card }: ActionCardProps) {
  const Icon = ICON_MAP[card.icon] ?? FileText;
  const theme = useTheme();

  const handlePress = () => {
    const link = card.link;
    if (!link) return;

    let panelId: PanelId | null = null;
    if (link.includes('/approval/new?type=vacation') || link.includes('/hr/vacation') || link.includes('/leave')) {
      panelId = 'leave';
    } else if (link.includes('/approval')) {
      panelId = 'approval';
    } else if (link.includes('/vehicle')) {
      panelId = 'vehicle';
    } else if (link.includes('/meeting')) {
      panelId = 'meeting';
    } else if (link.includes('/report')) {
      panelId = 'report';
    } else if (link.includes('/certificate')) {
      panelId = 'certificate';
    } else if (link.includes('/expense') || link.includes('/asset')) {
      panelId = 'approval';
    } else if (link.includes('/docs') || link.includes('/documents')) {
      panelId = 'documents';
    }

    if (panelId) {
      useUiStore.getState().handleNavClick(panelId);
    } else {
      Alert.alert('', `${card.title} 경로: ${link}`);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      style={{
        backgroundColor: theme.bg.surface,
        borderColor: theme.border.default,
      }}
      className="flex-row items-center gap-3 border rounded-xl p-3.5"
    >
      {/* Icon box */}
      <View
        style={{ backgroundColor: theme.brand.primaryTint }}
        className="w-9 h-9 rounded-[9px] items-center justify-center flex-shrink-0"
      >
        <Icon size={18} color={theme.brand.primary} />
      </View>

      {/* Text */}
      <View className="flex-1 min-w-0">
        <Text
          style={{ color: theme.text.body, fontFamily: WEB_FONT }}
          className="text-[13px] font-medium"
          numberOfLines={1}
        >
          {card.title}
        </Text>
        {card.subtitle ? (
          <Text
            style={{ color: theme.text.subtle, fontFamily: WEB_FONT }}
            className="text-[11px] mt-0.5"
            numberOfLines={1}
          >
            {card.subtitle}
          </Text>
        ) : null}
      </View>

      {/* Arrow */}
      <ChevronRight size={16} color={theme.text.subtle} />
    </TouchableOpacity>
  );
}

