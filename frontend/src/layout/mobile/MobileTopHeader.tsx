import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
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
        className="flex-row items-center px-4"
        style={{
          height: 56,
          borderBottomWidth: 1,
          gap: 8,
          backgroundColor: theme.bg.surface,
          borderBottomColor: theme.border.default,
          // PC와 동일하게 관리자 모드 진입 시 상단 2px 빨간 띠
          borderTopWidth: theme.isAdmin ? 2 : 0,
          borderTopColor: theme.isAdmin ? theme.brand.primary : 'transparent',
        }}
      >
        {/* Left: Brand — tap to go home */}
        <TouchableOpacity activeOpacity={0.7} onPress={goHome}>
          <Text
            style={{
              fontSize: 16,
              fontWeight: '500',
              letterSpacing: 16 * 0.07,
              color: theme.text.primary,
              fontFamily: Platform.OS === 'web' ? "'Noto Sans KR', sans-serif" : undefined,
            }}
          >
            Infomind
          </Text>
        </TouchableOpacity>

        {/* 관리자 배지 (PC와 동일) */}
        {theme.isAdmin && (
          <View
            className="px-2 py-0.5 rounded shrink-0"
            style={{ backgroundColor: theme.brand.primary }}
          >
            <Text
              className="font-semibold"
              style={{
                fontSize: 11,
                letterSpacing: 0.04 * 11,
                color: theme.text.onBrand,
                fontFamily: Platform.OS === 'web' ? "'Noto Sans KR', sans-serif" : undefined,
              }}
            >
              관리자
            </Text>
          </View>
        )}

        <View className="flex-1" />

        {/* Right: actions */}
        <View className="flex-row items-center" style={{ gap: 4 }}>
          {/* Admin mode toggle (ADMIN only) — PC와 동일한 라벨+스위치 패턴 */}
          {isAdmin && (
            <TouchableOpacity
              onPress={toggleAdminMode}
              activeOpacity={0.7}
              className="flex-row items-center mr-2"
              style={{ gap: 8 }}
              accessibilityLabel="관리자 모드 토글"
            >
              <Text
                style={{
                  fontSize: 12,
                  color: isAdminMode ? theme.brand.primary : theme.text.muted,
                  fontWeight: isAdminMode ? '500' : 'normal',
                  fontFamily: Platform.OS === 'web' ? "'Noto Sans KR', sans-serif" : undefined,
                }}
              >
                관리자 모드
              </Text>
              <View
                className="w-8 h-[18px] rounded-full justify-center px-0.5"
                style={{
                  backgroundColor: isAdminMode ? theme.brand.primary : 'rgba(0,0,0,0.15)',
                }}
              >
                <View
                  className="w-3.5 h-3.5 rounded-full bg-white shadow-sm elevation-1"
                  style={{
                    transform: [{ translateX: isAdminMode ? 14 : 0 }],
                  }}
                />
              </View>
            </TouchableOpacity>
          )}

          {/* Notification bell */}
          <TouchableOpacity
            className="w-8 h-8 items-center justify-center rounded-lg relative"
            style={{
              backgroundColor: notifOpen ? theme.brand.primaryTint : 'transparent',
            }}
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
