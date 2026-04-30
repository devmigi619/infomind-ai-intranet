import React, { useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Platform,
  Alert,
} from 'react-native';
import { colors } from '../../../shared/constants/colors';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
} from '../api';
import { NotificationCard } from './NotificationCard';

const WEB_FONT = Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined });

// ─── Props ────────────────────────────────────────────────────────────────────

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
  const { data: notifications = [] } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ESC key to close (Web only)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleCardClick = (id: string) => {
    const notif = notifications.find((n) => n.id === id);
    markAsRead.mutate(id);
    const msg = notif
      ? `"${notif.title}" 콘텐츠로 이동 (추후 구현)`
      : '콘텐츠로 이동 (추후 구현)';
    if (Platform.OS === 'web') {
      window.alert(msg);
    } else {
      Alert.alert('안내', msg);
    }
    // Dropdown stays open so user can interact with other notifications
  };

  const handleMarkAllAsRead = () => {
    if (unreadCount === 0) return;
    markAllAsRead.mutate();
  };

  const handleViewAll = () => {
    if (Platform.OS === 'web') {
      window.alert('알림 센터는 추후 구현됩니다');
    } else {
      Alert.alert('안내', '알림 센터는 추후 구현됩니다');
    }
  };

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Backdrop — tap outside to close */}
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        {/* Dropdown panel — stopPropagation so inner taps don't close */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          style={styles.dropdown}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>알림</Text>
            <TouchableOpacity
              onPress={handleMarkAllAsRead}
              activeOpacity={0.7}
              disabled={unreadCount === 0}
            >
              <Text
                style={[
                  styles.markAllText,
                  unreadCount === 0 && styles.markAllTextDisabled,
                ]}
              >
                모두 읽음
              </Text>
            </TouchableOpacity>
          </View>

          {/* Body */}
          <ScrollView
            style={styles.body}
            showsVerticalScrollIndicator={false}
          >
            {notifications.map((notif) => (
              <NotificationCard
                key={notif.id}
                notification={notif}
                onClick={handleCardClick}
              />
            ))}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={handleViewAll} activeOpacity={0.7}>
              <Text style={styles.viewAllText}>전체 알림 보기 →</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdown: {
    position: 'absolute',
    top: 44,
    right: 16,
    width: 380,
    maxHeight: 520,
    backgroundColor: colors.background.surface,
    borderWidth: 1,
    borderColor: colors.border.medium,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
    elevation: 12,
    overflow: 'hidden',
  },
  header: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.primary,
    fontFamily: WEB_FONT,
  },
  markAllText: {
    fontSize: 13,
    color: colors.brand.primary,
    fontFamily: WEB_FONT,
  },
  markAllTextDisabled: {
    color: colors.text.subtle,
  },
  body: {
    flex: 1,
  },
  footer: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    flexShrink: 0,
  },
  viewAllText: {
    fontSize: 13,
    color: colors.brand.primary,
    fontFamily: WEB_FONT,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
