import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import { MENU_ICON_NAME, type MenuMeta } from '../constants/menus';
import type { PanelId } from '../../types';

interface MenuDto {
  menuId: string;
  menuNm: string;
  menuSn: number;
  admYn: 'Y' | 'N';
}

/** GET /api/menus → MenuMeta[] 변환 (iconName, pinnable 프론트 보완) */
export function useMenuList(): MenuMeta[] {
  const { data = [] } = useQuery<MenuDto[]>({
    queryKey: ['menus'],
    queryFn: () => apiClient.get('/api/menus').then((r) => r.data?.data ?? []),
    staleTime: 1000 * 60 * 10, // 10분
  });

  return data.map((dto) => ({
    panel: dto.menuId as PanelId,
    label: dto.menuNm,
    iconName: MENU_ICON_NAME[dto.menuId] ?? 'FileText',
    pinnable: true as const,
    admYn: dto.admYn,
  }));
}

/** 모드별 필터링 편의 훅 */
export function useMenusForMode(isAdminMode: boolean): MenuMeta[] {
  const menus = useMenuList();
  return menus.filter((m) => (isAdminMode ? m.admYn === 'Y' : m.admYn === 'N'));
}
