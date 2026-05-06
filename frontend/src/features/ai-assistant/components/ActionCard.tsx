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
import { colors } from '../../../shared/constants/colors';
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

  const handlePress = () => {
    Alert.alert('', `${card.title}(으)로 이동합니다 (추후 구현)\n경로: ${card.link ?? '-'}`);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      style={styles.card}
    >
      {/* Icon box */}
      <View style={styles.iconBox}>
        <Icon size={18} color={colors.brand.primary} />
      </View>

      {/* Text */}
      <View style={styles.textWrap}>
        <Text style={styles.title} numberOfLines={1}>{card.title}</Text>
        {card.subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>{card.subtitle}</Text>
        ) : null}
      </View>

      {/* Arrow */}
      <ChevronRight size={16} color={colors.text.soft} />
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: 12,
    padding: 14,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: colors.brand.primaryTint,
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
    color: colors.text.secondary,
    fontFamily: WEB_FONT,
  },
  subtitle: {
    fontSize: 11,
    color: colors.text.soft,
    marginTop: 2,
    fontFamily: WEB_FONT,
  },
});
