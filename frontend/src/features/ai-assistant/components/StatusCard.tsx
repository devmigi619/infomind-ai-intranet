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
      style={[
        styles.card,
        {
          backgroundColor: theme.bg.surface,
          borderColor: theme.border.default,
        },
      ]}
    >
      {/* Header row: icon + label */}
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: theme.semanticTint.success }]}>
          <Icon size={16} color={theme.semantic.success} />
        </View>
        <Text style={[styles.label, { color: theme.text.muted }]} numberOfLines={1}>{card.title}</Text>
      </View>

      {/* Value */}
      <Text style={[styles.value, { color: theme.text.primary }]}>{card.value ?? '—'}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    fontFamily: WEB_FONT,
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    fontFamily: WEB_FONT,
  },
});
