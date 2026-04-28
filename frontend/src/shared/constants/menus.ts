import type { PanelId } from '../../types';

export interface MenuMeta {
  panel: PanelId;
  label: string;
  iconName: string; // lucide-react-native 아이콘 이름
  pinnable: boolean; // false면 NavRail 핀 대상 아님
  category: 'core' | 'resource' | 'info' | 'admin';
}

export const ALL_MENUS: MenuMeta[] = [
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
];
