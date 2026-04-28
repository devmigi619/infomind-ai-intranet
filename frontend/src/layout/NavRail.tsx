import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import {
  Home,
  LayoutList,
  FileCheck,
  FileText,
  Calendar,
  Building2,
  Car,
  LayoutGrid,
  Users,
  Shield,
  Tag,
  Settings,
} from 'lucide-react-native';
import type { PanelId } from '../types';

interface NavRailProps {
  activePanel: PanelId | null;
  activeFullScreen: PanelId | null;
  isAdminMode: boolean;
  onPanelClick: (panel: PanelId | 'home') => void;
}

type NavModule = {
  id: PanelId | 'home';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  icon: React.ComponentType<any>;
  label: string;
  unread?: number;
};

const userModules: NavModule[] = [
  { id: 'home', icon: Home, label: '홈' },
  { id: 'board', icon: LayoutList, label: '게시판' },
  { id: 'approval', icon: FileCheck, label: '전자결재', unread: 2 },
  { id: 'report', icon: FileText, label: '주간보고' },
  { id: 'calendar', icon: Calendar, label: '캘린더' },
  { id: 'meeting', icon: Building2, label: '회의실' },
  { id: 'vehicle', icon: Car, label: '차량' },
];

const adminModules: NavModule[] = [
  { id: 'admin-home', icon: LayoutGrid, label: '관리자 홈' },
  { id: 'admin-users', icon: Users, label: '사용자 관리' },
  { id: 'admin-roles', icon: Shield, label: '권한 관리' },
  { id: 'admin-categories', icon: Tag, label: '게시판 카테고리' },
  { id: 'admin-approval-line', icon: FileText, label: '결재선 템플릿' },
  { id: 'admin-system', icon: Settings, label: '시스템 설정' },
];

export function NavRail({
  activePanel,
  activeFullScreen,
  isAdminMode,
  onPanelClick,
}: NavRailProps) {
  const modules = isAdminMode ? adminModules : userModules;
  const homeId: PanelId | 'home' = isAdminMode ? 'admin-home' : 'home';

  const isHomeActive = activePanel === null && activeFullScreen === null;

  return (
    <View style={styles.container}>
      {modules.map((mod, idx) => {
        const Icon = mod.icon;
        const isHomeButton = mod.id === 'home' || mod.id === 'admin-home';
        const isActive = isHomeButton
          ? isHomeActive
          : activePanel === mod.id || activeFullScreen === mod.id;

        return (
          <React.Fragment key={mod.id}>
            <TouchableOpacity
              onPress={() => onPanelClick(mod.id === homeId ? 'home' : mod.id)}
              style={[styles.iconButton, isActive && styles.iconButtonActive]}
              activeOpacity={0.7}
            >
              {isActive && <View style={styles.activeIndicator} />}
              <Icon
                size={22}
                color={isActive ? '#0A2463' : 'rgba(0,0,0,0.55)'}
              />
              {mod.unread && mod.unread > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{mod.unread}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
            {idx === 0 && <View style={styles.divider} />}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 64,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: 'rgba(0,0,0,0.08)',
    paddingTop: 12,
    paddingBottom: 12,
    alignItems: 'center',
    gap: 4,
  },
  iconButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    position: 'relative',
  },
  iconButtonActive: {
    backgroundColor: 'rgba(10,36,99,0.08)',
  },
  activeIndicator: {
    position: 'absolute',
    left: -8,
    top: 12,
    bottom: 12,
    width: 2,
    backgroundColor: '#0A2463',
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  divider: {
    width: 32,
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.08)',
    marginVertical: 4,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 9,
    color: '#ffffff',
    fontWeight: '600',
  },
});
