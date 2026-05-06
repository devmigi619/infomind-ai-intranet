import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import {
  FileCheck,
  CheckCircle,
  Megaphone,
  AlertCircle,
} from 'lucide-react-native';
import { useTheme } from '../../../shared/hooks/useTheme';
import { type Notification, type NotificationType, formatRelativeTime } from '../api';

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

// ─── Props ────────────────────────────────────────────────────────────────────

interface NotificationCardProps {
  notification: Notification;
  onClick: (id: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationCard({ notification, onClick }: NotificationCardProps) {
  const { id, type, title, createdAt, read } = notification;
  const theme = useTheme();

  // Type config resolved with theme tokens
  const TYPE_CONFIG: Record<
    NotificationType,
    { Icon: React.ComponentType<{ size: number; color: string }>; iconColor: string; iconBg: string }
  > = {
    approval_received: {
      Icon: FileCheck,
      iconColor: theme.semantic.warning,
      iconBg: theme.semanticTint.warning,
    },
    approval_result: {
      Icon: CheckCircle,
      iconColor: theme.semantic.success,
      iconBg: theme.semanticTint.success,
    },
    board_notice: {
      Icon: Megaphone,
      iconColor: theme.brand.primary,
      iconBg: theme.semanticTint.info,
    },
    report_deadline: {
      Icon: AlertCircle,
      iconColor: theme.semantic.danger,
      iconBg: theme.semanticTint.danger,
    },
  };

  const { Icon, iconColor, iconBg } = TYPE_CONFIG[type];

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onClick(id)}
      style={[
        styles.card,
        { borderBottomColor: theme.border.subtle },
        read
          ? { backgroundColor: theme.bg.surface }
          : { backgroundColor: theme.brand.primaryTintSoft },
      ]}
    >
      {/* Unread dot */}
      <View
        style={[
          styles.unreadDot,
          { backgroundColor: theme.brand.primary },
          read && styles.unreadDotHidden,
        ]}
      />

      {/* Icon box */}
      <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
        <Icon size={15} color={iconColor} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            read
              ? { fontWeight: '400', color: theme.text.muted }
              : { fontWeight: '500', color: theme.text.primary },
          ]}
          numberOfLines={2}
        >
          {title}
        </Text>
        <Text style={[styles.time, { color: theme.text.subtle }]}>
          {formatRelativeTime(createdAt)}
        </Text>
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
  },
  unreadDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
  time: {
    fontSize: 12,
    marginTop: 3,
    fontFamily: WEB_FONT,
  },
});
