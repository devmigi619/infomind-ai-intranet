import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
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
        style={[
          styles.container,
          {
            backgroundColor: theme.bg.surface,
            borderBottomColor: theme.border.default,
            // 관리자 모드: 상단 2px 빨간 띠
            borderTopWidth: theme.isAdmin ? 2 : 0,
            borderTopColor: theme.isAdmin ? theme.brand.primary : 'transparent',
          },
        ]}
      >
        {/* Left: Brand + 관리자 배지 */}
        <TouchableOpacity onPress={onBrandClick} activeOpacity={0.6}>
          <Text
            style={[
              styles.brand,
              { color: theme.text.primary },
            ]}
          >
            Infomind
          </Text>
        </TouchableOpacity>

        {/* 관리자 배지 */}
        {theme.isAdmin && (
          <View style={[styles.adminBadge, { backgroundColor: theme.brand.primary }]}>
            <Text style={[styles.adminBadgeText, { color: theme.text.onBrand }]}>관리자</Text>
          </View>
        )}

        {/* Center: Search placeholder */}
        <View style={styles.searchBarWrap}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: theme.mode === 'dark' ? theme.bg.surfaceAlt : '#F0F0F0',
                borderColor: theme.border.default,
              },
            ]}
          >
            <Search size={14} color={theme.text.subtle} style={styles.searchIcon} />
            <Text style={[styles.searchPlaceholder, { color: theme.text.muted }]}>
              통합검색 준비 중...
            </Text>
            <Text style={[styles.preparingTag, { color: theme.text.subtle }]}>준비 중</Text>
          </View>
        </View>

        {/* Right: Controls */}
        <View style={styles.rightControls}>
          {/* Admin toggle (ADMIN only) */}
          {isAdmin && (
            <TouchableOpacity
              onPress={onToggleAdminMode}
              activeOpacity={0.7}
              style={styles.adminToggle}
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

          {/* Bell with notification dropdown */}
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

          {/* RightPanel toggle */}
          <TouchableOpacity
            onPress={onToggleRightPanel}
            style={[
              styles.iconButton,
              isRightPanelOpen && { backgroundColor: theme.brand.primaryTint },
            ]}
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

const styles = StyleSheet.create({
  container: {
    height: 48,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 16,
    gap: 16,
  },
  brand: {
    fontSize: 18,
    letterSpacing: 18 * 0.12,
    fontWeight: '300',
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
  searchBarWrap: {
    flex: 1,
    alignItems: 'center',
  },
  searchBar: {
    width: '100%',
    maxWidth: 480,
    height: 32,
    borderWidth: 1,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    opacity: 0.5,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 13,
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  preparingTag: {
    fontSize: 10,
    letterSpacing: 0.4,
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
