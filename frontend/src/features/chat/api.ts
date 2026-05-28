import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/client';

// ─── DTOs ────────────────────────────────────────────────────────────────────

export interface ChatSessionDto {
  sessId: string;
  title: string;
  lastAt: string;
  msgCount: number;
}

export interface ChatMsgDto {
  chatSn: number;
  chatSe: 'U' | 'A';
  chatDesc: string;
  chatDt: string;
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export const useChatSessions = () =>
  useQuery<ChatSessionDto[]>({
    queryKey: ['chat', 'sessions'],
    queryFn: () =>
      apiClient.get('/api/chat/sessions').then((r) => r.data?.data ?? []),
  });

export const useChatSessionMessages = (sessId: string | null) =>
  useQuery<ChatMsgDto[]>({
    queryKey: ['chat', 'session', sessId],
    queryFn: () =>
      apiClient.get(`/api/chat/sessions/${sessId}`).then((r) => r.data?.data ?? []),
    enabled: !!sessId,
  });

// ─── Mutations ───────────────────────────────────────────────────────────────

export const useSaveChatMessages = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { sessId: string; entries: { chatSe: string; chatDesc: string }[] }) =>
      apiClient.post('/api/chat/messages', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat', 'sessions'] });
    },
  });
};

export const useDeleteChatSession = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessId: string) => apiClient.delete(`/api/chat/sessions/${sessId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat', 'sessions'] });
    },
  });
};
