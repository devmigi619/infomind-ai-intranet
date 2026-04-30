import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Platform } from 'react-native';

// ─── Types ───────────────────────────────────────────────────────────────────

export type NotificationType =
  | 'approval_received'
  | 'approval_result'
  | 'board_notice'
  | 'report_deadline';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  link?: string;
  createdAt: Date;
  read: boolean;
}

// ─── Relative time formatter ──────────────────────────────────────────────────

export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  const diffHour = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMin < 1) return '방금 전';
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;
  if (diffDay === 1) return '어제';
  return `${diffDay}일 전`;
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const now = new Date();

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: '1',
    type: 'approval_received',
    title: '김철수가 휴가 신청 결재를 요청했습니다',
    createdAt: new Date(now.getTime() - 3 * 60 * 1000), // 3분 전
    read: false,
  },
  {
    id: '2',
    type: 'approval_result',
    title: '이영희 부장이 출장 신청을 승인했습니다',
    createdAt: new Date(now.getTime() - 32 * 60 * 1000), // 32분 전
    read: false,
  },
  {
    id: '3',
    type: 'board_notice',
    title: '[공지] 4월 워크샵 일정 안내',
    createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2시간 전
    read: false,
  },
  {
    id: '4',
    type: 'report_deadline',
    title: '주간보고 마감이 D-1 입니다',
    createdAt: new Date(now.getTime() - 5 * 60 * 60 * 1000), // 5시간 전
    read: false,
  },
  {
    id: '5',
    type: 'approval_received',
    title: '박지민이 차량 예약 결재를 요청했습니다',
    createdAt: new Date(now.getTime() - 26 * 60 * 60 * 1000), // 어제
    read: true,
  },
  {
    id: '6',
    type: 'board_notice',
    title: '[공지] 사내 메일 시스템 점검 안내',
    createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2일 전
    read: true,
  },
];

// ─── Query keys ───────────────────────────────────────────────────────────────

const QUERY_KEY = ['notifications'] as const;

// ─── React Query hooks ────────────────────────────────────────────────────────

export function useNotifications() {
  return useQuery<Notification[]>({
    queryKey: QUERY_KEY,
    queryFn: () => Promise.resolve(MOCK_NOTIFICATIONS.map((n) => ({ ...n }))),
    staleTime: Infinity,
  });
}

export function useUnreadNotificationCount() {
  const { data } = useNotifications();
  return data ? data.filter((n) => !n.read).length : 0;
}

export function useMarkAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => id,
    onSuccess: (id) => {
      qc.setQueryData<Notification[]>(QUERY_KEY, (prev) =>
        prev ? prev.map((n) => (n.id === id ? { ...n, read: true } : n)) : prev,
      );
    },
  });
}

export function useMarkAllAsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => undefined,
    onSuccess: () => {
      qc.setQueryData<Notification[]>(QUERY_KEY, (prev) =>
        prev ? prev.map((n) => ({ ...n, read: true })) : prev,
      );
    },
  });
}

// Re-export Platform for convenience inside this feature
export { Platform };
