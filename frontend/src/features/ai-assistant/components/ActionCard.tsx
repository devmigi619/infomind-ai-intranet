import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
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
    Alert.alert('', `${card.title}(으)로 이동합니다 (추후 구현)\n경로: ${card.link ?? '-'}`);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      style={[
        styles.card,
        {
          backgroundColor: theme.bg.surface,
          borderColor: theme.border.default,
        },
      ]}
    >
      {/* Icon box */}
      <View style={[styles.iconBox, { backgroundColor: theme.brand.primaryTint }]}>
        <Icon size={18} color={theme.brand.primary} />
      </View>

      {/* Text */}
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: theme.text.body }]} numberOfLines={1}>{card.title}</Text>
        {card.subtitle ? (
          <Text style={[styles.subtitle, { color: theme.text.subtle }]} numberOfLines={1}>{card.subtitle}</Text>
        ) : null}
      </View>

      {/* Arrow */}
      <ChevronRight size={16} color={theme.text.subtle} />
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: WEB_FONT,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: WEB_FONT,
  },
});
