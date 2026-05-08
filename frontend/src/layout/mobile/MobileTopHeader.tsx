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
    userId?: string;
  };
  onLogout: () => void;
  onSettingsClick: () => void;
}

export function MobileTopHeader({ user, onLogout, onSettingsClick }: MobileTopHeaderProps) {
  const theme = useTheme();
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = useUnreadNotificationCount();
  const goHome = useUiStore((s) => s.goHome);
  const isAdminMode = useUiStore((s) => s.isAdminMode);
  const toggleAdminMode = useUiStore((s) => s.toggleAdminMode);
  // PC TopHeader와 동일하게 'admin' 계정에게만 토글 노출
  const isAdmin = user?.userId === 'admin';

  return (
    <>
      <View
        style={[
          styles.container,
          {
            backgroundColor: theme.bg.surface,
            borderBottomColor: theme.border.default,
            // PC와 동일하게 관리자 모드 진입 시 상단 2px 빨간 띠
            borderTopWidth: theme.isAdmin ? 2 : 0,
            borderTopColor: theme.isAdmin ? theme.brand.primary : 'transparent',
          },
        ]}
      >
        {/* Left: Brand — tap to go home */}
        <TouchableOpacity activeOpacity={0.7} onPress={goHome}>
          <Text style={[styles.brand, { color: theme.text.primary }]}>Infomind</Text>
        </TouchableOpacity>

        {/* 관리자 배지 (PC와 동일) */}
        {theme.isAdmin && (
          <View style={[styles.adminBadge, { backgroundColor: theme.brand.primary }]}>
            <Text style={[styles.adminBadgeText, { color: theme.text.onBrand }]}>관리자</Text>
          </View>
        )}

        <View style={styles.spacer} />

        {/* Right: actions */}
        <View style={styles.rightControls}>
          {/* Admin mode toggle (ADMIN only) — PC와 동일한 라벨+스위치 패턴 */}
          {isAdmin && (
            <TouchableOpacity
              onPress={toggleAdminMode}
              activeOpacity={0.7}
              style={styles.adminToggle}
              accessibilityLabel="관리자 모드 토글"
            >
              <Text
                style={[
                  styles.adminLabel,
                  { color: theme.text.muted },
                  isAdminMode && { color: theme.brand.primary, fontWeight: '500' },
                ]}
              >
                관리자 모드
              </Text>
              <View
                style={[
                  styles.switch,
                  { backgroundColor: 'rgba(0,0,0,0.15)' },
                  isAdminMode && { backgroundColor: theme.brand.primary },
                ]}
              >
                <View
                  style={[
                    styles.switchKnob,
                    isAdminMode && styles.switchKnobActive,
                  ]}
                />
              </View>
            </TouchableOpacity>
          )}

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
    gap: 8,
  },
  brand: {
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 16 * 0.07,
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  adminBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    flexShrink: 0,
  },
  adminBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.04 * 11,
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
  adminToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginRight: 8,
  },
  adminLabel: {
    fontSize: 12,
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  switch: {
    width: 32,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchKnob: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  switchKnobActive: {
    transform: [{ translateX: 14 }],
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
