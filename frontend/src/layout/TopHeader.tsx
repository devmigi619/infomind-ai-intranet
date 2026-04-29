import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Bell, PanelRight, Search } from 'lucide-react-native';
import { AvatarMenu } from './AvatarMenu';
import { PulseDot } from '../shared/components/PulseDot';

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

  return (
    <View style={styles.container}>
      {/* Left: Brand */}
      <TouchableOpacity onPress={onBrandClick} activeOpacity={0.6}>
        <Text style={styles.brand}>Infomind</Text>
      </TouchableOpacity>

      {/* Center: Search placeholder */}
      <View style={styles.searchBarWrap}>
        <View style={styles.searchBar}>
          <Search size={14} color="rgba(0,0,0,0.3)" style={styles.searchIcon} />
          <Text style={styles.searchPlaceholder}>통합검색 준비 중...</Text>
          <Text style={styles.preparingTag}>준비 중</Text>
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
            <Text style={[styles.adminLabel, isAdminMode && styles.adminLabelActive]}>
              관리자 모드
            </Text>
            <View style={[styles.switch, isAdminMode && styles.switchActive]}>
              <View style={[styles.switchKnob, isAdminMode && styles.switchKnobActive]} />
            </View>
          </TouchableOpacity>
        )}

        {/* Bell with red dot */}
        <TouchableOpacity style={styles.iconButton} activeOpacity={0.7}>
          <Bell size={18} color="rgba(0,0,0,0.55)" />
          <PulseDot ringColor="#ffffff" top={6} right={6} />
        </TouchableOpacity>

        {/* RightPanel toggle */}
        <TouchableOpacity
          onPress={onToggleRightPanel}
          style={[styles.iconButton, isRightPanelOpen && styles.iconButtonActive]}
          activeOpacity={0.7}
        >
          <PanelRight size={18} color={isRightPanelOpen ? '#0A2463' : 'rgba(0,0,0,0.55)'} />
          {hasUnreadAi && !isRightPanelOpen && <PulseDot ringColor="#ffffff" top={6} right={6} />}
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
  );
}

const styles = StyleSheet.create({
  container: {
    height: 48,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 16,
    gap: 16,
  },
  brand: {
    fontSize: 18,
    letterSpacing: 18 * 0.12,
    color: '#000000',
    fontWeight: '300',
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
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
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
    color: 'rgba(0,0,0,0.45)',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  preparingTag: {
    fontSize: 10,
    color: 'rgba(0,0,0,0.35)',
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
    color: 'rgba(0,0,0,0.55)',
    fontFamily: Platform.select({ web: "'Noto Sans KR', sans-serif", default: undefined }),
  },
  adminLabelActive: {
    color: '#0A2463',
    fontWeight: '500',
  },
  switch: {
    width: 32,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(0,0,0,0.15)',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  switchActive: {
    backgroundColor: '#0A2463',
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
  iconButtonActive: {
    backgroundColor: 'rgba(10,36,99,0.08)',
  },
});
