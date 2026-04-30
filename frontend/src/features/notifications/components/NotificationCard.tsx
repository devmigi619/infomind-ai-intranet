import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import {
  FileCheck,
  CheckCircle,
  Megaphone,
  AlertCircle,
} from 'lucide-react-native';
import { colors } from '../../../shared/constants/colors';
import { type Notification, type NotificationType, formatRelativeTime } from '../api';

// ─── Icon config per type ─────────────────────────────────────────────────────

const TYPE_CONFIG: Record<
  NotificationType,
  { Icon: React.ComponentType<{ size: number; color: string }>; iconColor: string; iconBg: string }
> = {
  approval_received: {
    Icon: FileCheck,
    iconColor: colors.semantic.warning,
    iconBg: colors.semanticTint.warning,
  },
  approval_result: {
    Icon: CheckCircle,
    iconColor: colors.semantic.success,
    iconBg: colors.semanticTint.success,
  },
  board_notice: {
    Icon: Megaphone,
    iconColor: colors.brand.primary,
    iconBg: colors.semanticTint.info,
  },
  report_deadline: {
    Icon: AlertCircle,
    iconColor: colors.semantic.danger,
    iconBg: colors.semanticTint.danger,
  },
};

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

// ─── Props ────────────────────────────────────────────────────────────────────

interface NotificationCardProps {
  notification: Notification;
  onClick: (id: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationCard({ notification, onClick }: NotificationCardProps) {
  const { id, type, title, createdAt, read } = notification;
  const { Icon, iconColor, iconBg } = TYPE_CONFIG[type];

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onClick(id)}
      style={[styles.card, read ? styles.cardRead : styles.cardUnread]}
    >
      {/* Unread dot */}
      <View style={[styles.unreadDot, read && styles.unreadDotHidden]} />

      {/* Icon box */}
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        <Icon size={15} color={iconColor} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text
          style={[styles.title, read ? styles.titleRead : styles.titleUnread]}
          numberOfLines={2}
        >
          {title}
        </Text>
        <Text style={styles.time}>{formatRelativeTime(createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  cardUnread: {
    backgroundColor: 'rgba(10,36,99,0.025)',
  },
  cardRead: {
    backgroundColor: colors.background.surface,
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand.primary,
    flexShrink: 0,
    marginTop: 13,
    marginRight: 8,
  },
  unreadDotHidden: {
    opacity: 0,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginRight: 10,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 14,
    lineHeight: 14 * 1.45,
    fontFamily: WEB_FONT,
  },
  titleUnread: {
    fontWeight: '500',
    color: colors.text.primary,
  },
  titleRead: {
    fontWeight: '400',
    color: colors.text.muted,
  },
  time: {
    fontSize: 12,
    color: colors.text.soft,
    marginTop: 3,
    fontFamily: WEB_FONT,
  },
});
