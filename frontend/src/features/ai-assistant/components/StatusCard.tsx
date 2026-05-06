import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import {
  Activity,
  Car,
  CalendarDays,
  Clock,
  AlertCircle,
  type LucideIcon,
} from 'lucide-react-native';
import { colors } from '../../../shared/constants/colors';
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

  return (
    <View style={styles.card}>
      {/* Header row: icon + label */}
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <Icon size={16} color={colors.semantic.success} />
        </View>
        <Text style={styles.label} numberOfLines={1}>{card.title}</Text>
      </View>

      {/* Value */}
      <Text style={styles.value}>{card.value ?? '—'}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 7,
    backgroundColor: colors.semanticTint.success,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.text.muted,
    fontFamily: WEB_FONT,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text.primary,
    fontFamily: WEB_FONT,
  },
});
