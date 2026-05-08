import type { PanelId } from '../../types';

export interface MenuMeta {
  panel: PanelId;
  label: string;
  iconName: string; // lucide-react-native 아이콘 이름
  pinnable: boolean; // false면 NavRail 핀 대상 아님
  category: 'core' | 'resource' | 'info' | 'admin';
}

export const ALL_MENUS: MenuMeta[] = [
  // 일반 메뉴
  { panel: 'board', label: '게시판', iconName: 'LayoutList', pinnable: true, category: 'core' },
  { panel: 'approval', label: '전자결재', iconName: 'FileCheck', pinnable: true, category: 'core' },
  { panel: 'report', label: '주간보고', iconName: 'FileText', pinnable: true, category: 'core' },
  {
    panel: 'calendar',
    label: '캘린더',
    iconName: 'Calendar',
    pinnable: true,
    category: 'resource',
  },
  {
    panel: 'meeting',
    label: '회의실',
    iconName: 'Building2',
    pinnable: true,
    category: 'resource',
  },
  { panel: 'vehicle', label: '차량', iconName: 'Car', pinnable: true, category: 'resource' },
  { panel: 'contacts', label: '주소록', iconName: 'Users', pinnable: true, category: 'info' },
  { panel: 'documents', label: '자료실', iconName: 'BookOpen', pinnable: true, category: 'info' },
  { panel: 'certificate', label: '증명서', iconName: 'FileText', pinnable: true, category: 'info' },

  // 관리자 메뉴
  { panel: 'admin-users', label: '사용자 관리', iconName: 'Users', pinnable: true, category: 'admin' },
  { panel: 'admin-roles', label: '권한 관리', iconName: 'Shield', pinnable: true, category: 'admin' },
  { panel: 'admin-categories', label: '게시판 카테고리', iconName: 'Tag', pinnable: true, category: 'admin' },
  { panel: 'admin-approval-line', label: '결재선 템플릿', iconName: 'FileText', pinnable: true, category: 'admin' },
  { panel: 'admin-common-code', label: '공통코드 관리', iconName: 'List', pinnable: true, category: 'admin' },
  { panel: 'admin-system', label: '시스템 설정', iconName: 'Settings', pinnable: true, category: 'admin' },
];

export function getMenusForMode(isAdminMode: boolean): MenuMeta[] {
  return ALL_MENUS.filter((m) => (isAdminMode ? m.category === 'admin' : m.category !== 'admin'));
}
