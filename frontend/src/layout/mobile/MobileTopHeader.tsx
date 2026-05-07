import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Bell } from 'lucide-react-native';
import { useTheme } from '../../shared/hooks/useTheme';
import { useUiStore } from '../../store/uiStore';
import { AvatarMenu } from '../AvatarMenu';
import { NotificationDropdown } from '../../features/notifications/components/NotificationDropdown';
import { useUnreadNotificationCount } from '../../features/notifications/api';
import { PulseDot } from '../../shared/components/PulseDot';

interface MobileTopHeaderProps {
  user: {
    name: string;
    department?: string;
    position?: string;
    role?: string;
  };
  onLogout: () => void;
  onSettingsClick: () => void;
}

export function MobileTopHeader({ user, onLogout, onSettingsClick }: MobileTopHeaderProps) {
  const theme = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = useUnreadNotificationCount();
  const goHome = useUiStore((s) => s.goHome);

  return (
    <>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.bg.surface,
            borderBottomColor: theme.border.default,
          },
        ]}
      >
        {/* Left: Brand — tap to go home */}
        <TouchableOpacity activeOpacity={0.7} onPress={goHome}>
          <Text style={[styles.brand, { color: theme.text.primary }]}>Infomind</Text>
        </TouchableOpacity>

        <View style={styles.spacer} />

        {/* Right: actions */}
        <View style={styles.rightControls}>
          {/* Notification bell */}
          <TouchableOpacity
            style={[
              styles.iconButton,
              notifOpen && { backgroundColor: theme.brand.primaryTint },
            ]}
            activeOpacity={0.7}
            onPress={() => setNotifOpen((v) => !v)}
          >
            <Bell size={18} color={notifOpen ? theme.brand.primary : theme.text.muted} />
            {unreadCount > 0 && <PulseDot ringColor={theme.bg.surface} top={6} right={6} />}
          </TouchableOpacity>

          {/* Avatar */}
          <AvatarMenu
            name={user.name}
            department={user.department}
            position={user.position}
            onLogout={onLogout}
            onSettingsClick={onSettingsClick}
          />
        </View>
      </View>
      <NotificationDropdown isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 16,
    paddingRight: 16,
  },
  brand: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 16 * 0.07,
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  spacer: {
    flex: 1,
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    position: 'relative',
  },
});
