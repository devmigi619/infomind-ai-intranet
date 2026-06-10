import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Bell, PanelRight, Search } from 'lucide-react-native';
import { AvatarMenu } from './AvatarMenu';
import { PulseDot } from '../shared/components/PulseDot';
import { NotificationDropdown } from '../features/notifications/components/NotificationDropdown';
import { useUnreadNotificationCount } from '../features/notifications/api';
import { useTheme } from '../shared/hooks/useTheme';

interface TopHeaderProps {
  user: {
    name: string;
    department?: string;
    position?: string;
    role?: string;
  } | null;
  onBrandClick: () => void;
  onLogout: () => void;
  onSettingsClick: () => void;
  onToggleRightPanel: () => void;
  isRightPanelOpen: boolean;
  isAdminMode: boolean;
  onToggleAdminMode: () => void;
  hasUnreadAi: boolean;
}

export function TopHeader({
  user,
  onBrandClick,
  onLogout,
  onSettingsClick,
  onToggleRightPanel,
  isRightPanelOpen,
  isAdminMode,
  onToggleAdminMode,
  hasUnreadAi,
}: TopHeaderProps) {
  const isAdmin = user?.role === 'ADMIN';
  const [notifOpen, setNotifOpen] = useState(false);
  const unreadCount = useUnreadNotificationCount();
  const theme = useTheme();

  return (
    <>
      <View
        className="flex-row items-center pl-5 pr-4"
        style={{
          height: 48,
          borderBottomWidth: 1,
          gap: 16,
          backgroundColor: theme.bg.surface,
          borderBottomColor: theme.border.default,
          // 관리자 모드: 상단 2px 빨간 띠
          borderTopWidth: theme.isAdmin ? 2 : 0,
          borderTopColor: theme.isAdmin ? theme.brand.primary : 'transparent',
        }}
      >
        {/* Left: Brand + 관리자 배지 */}
        <TouchableOpacity onPress={onBrandClick} activeOpacity={0.6}>
          <Text
            className="font-light"
            style={{
              fontSize: 18,
              letterSpacing: 18 * 0.12,
              color: theme.text.primary,
              fontFamily: Platform.OS === 'web' ? "'Noto Sans KR', sans-serif" : undefined,
            }}
          >
            Infomind
          </Text>
        </TouchableOpacity>

        {/* 관리자 배지 */}
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

        {/* Center: Search placeholder */}
        <View className="flex-1 items-center">
          <View
            className="w-full max-w-[480px] h-8 border rounded-full flex-row items-center px-3.5 opacity-50"
            style={{
              backgroundColor: theme.mode === 'dark' ? theme.bg.surfaceAlt : '#F0F0F0',
              borderColor: theme.border.default,
            }}
          >
            <Search size={14} color={theme.text.subtle} className="mr-2" />
            <Text
              className="flex-1"
              style={{
                fontSize: 13,
                color: theme.text.muted,
                fontFamily: Platform.OS === 'web' ? "'Noto Sans KR', sans-serif" : undefined,
              }}
            >
              통합검색 준비 중...
            </Text>
            <Text
              style={{
                fontSize: 10,
                letterSpacing: 0.4,
                color: theme.text.subtle,
                fontFamily: Platform.OS === 'web' ? "'Noto Sans KR', sans-serif" : undefined,
              }}
            >
              준비 중
            </Text>
          </View>
        </View>

        {/* Right: Controls */}
        <View className="flex-row items-center" style={{ gap: 8 }}>
          {/* Admin toggle (ADMIN only) */}
          {isAdmin && (
            <TouchableOpacity
              onPress={onToggleAdminMode}
              activeOpacity={0.7}
              className="flex-row items-center mr-2"
              style={{ gap: 8 }}
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

          {/* Bell with notification dropdown */}
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

          {/* RightPanel toggle */}
          <TouchableOpacity
            onPress={onToggleRightPanel}
            className="w-8 h-8 items-center justify-center rounded-lg relative"
            style={{
              backgroundColor: isRightPanelOpen ? theme.brand.primaryTint : 'transparent',
            }}
            activeOpacity={0.7}
          >
            <PanelRight
              size={18}
              color={isRightPanelOpen ? theme.brand.primary : theme.text.muted}
            />
            {hasUnreadAi && !isRightPanelOpen && (
              <PulseDot ringColor={theme.bg.surface} top={6} right={6} />
            )}
          </TouchableOpacity>

          {/* Avatar dropdown */}
          {user && (
            <AvatarMenu
              name={user.name}
              department={user.department}
              position={user.position}
              onLogout={onLogout}
              onSettingsClick={onSettingsClick}
            />
          )}
        </View>
      </View>
      <NotificationDropdown isOpen={notifOpen} onClose={() => setNotifOpen(false)} />
    </>
  );
}
