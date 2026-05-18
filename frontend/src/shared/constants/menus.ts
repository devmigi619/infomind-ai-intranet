import type { PanelId } from '../../types';
import {
  LayoutList,
  FileCheck,
  FileText,
  Calendar,
  Building2,
  Car,
  Users,
  BookOpen,
  Shield,
  Tag,
  List,

  GraduationCap,
  Network,
  Settings,
    TreePalm,
    BookA
} from 'lucide-react-native';
import type React from 'react';

export interface MenuMeta {
  panel: PanelId;
  label: string;
  iconName: string;
  pinnable: true;
  admYn: 'Y' | 'N';
}

/** 아이콘 이름 → lucide 컴포넌트 매핑 (프론트엔드 단일 관리) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const MENU_ICON_MAP: Record<string, React.ComponentType<any>> = {
  LayoutList,
  FileCheck,
  FileText,
  Calendar,
  Building2,
  Car,
  Users,
  BookOpen,
  Shield,
  Tag,
  List,
  BookA,
  GraduationCap,
  Network,
  Settings,
  TreePalm,
};

/** menu_id → iconName 매핑 (DB에 없으므로 프론트 유지) */
export const MENU_ICON_NAME: Record<string, string> = {
  board: 'LayoutList',
  approval: 'FileCheck',
  report: 'FileText',
  calendar: 'Calendar',
  meeting: 'Building2',
  vehicle: 'Car',
  contacts: 'Users',
  documents: 'BookOpen',
  certificate: 'FileText',
  users: 'Users',
  roles: 'Shield',
  boards: 'Tag',
  leave: 'TreePalm',
  'leave-req': 'TreePalm',
  'approval-line': 'FileText',
  'common-code': 'BookA',
  'job-grade': 'GraduationCap',
  dept: 'Network',
  system: 'Settings',
};
