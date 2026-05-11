import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/client';

export interface AdminBoard {
  brdId: string;
  brdSe: string | null;
  brdNm: string | null;
  brdDesc: string | null;
  deptCd: string | null;
  ord: number | null;
  fileUseYn: string;
  cmtUseYn: string;
  useYn: string;
}

export interface CreateBoardRequest {
  brdId: string;
  brdSe: string;
  brdNm: string;
  brdDesc?: string;
  deptCd?: string;
  ord?: number;
  fileUseYn?: string;
  cmtUseYn?: string;
}

export interface UpdateBoardRequest {
  brdSe?: string;
  brdNm?: string;
  brdDesc?: string;
  deptCd?: string;
  ord?: number;
  fileUseYn?: string;
  cmtUseYn?: string;
  useYn?: string;
}

const adminBoardApi = {
  getList: (keyword?: string, status?: string): Promise<AdminBoard[]> =>
    apiClient
      .get('/api/admin/boards', { params: { keyword, status } })
      .then((r) => r.data?.data ?? []),

  create: (data: CreateBoardRequest): Promise<AdminBoard> =>
    apiClient.post('/api/admin/boards', data).then((r) => r.data.data),

  update: (brdId: string, data: UpdateBoardRequest): Promise<AdminBoard> =>
    apiClient.put(`/api/admin/boards/${brdId}`, data).then((r) => r.data.data),

  disable: (brdId: string): Promise<void> =>
    apiClient.delete(`/api/admin/boards/${brdId}`).then(() => undefined),

  enable: (brdId: string): Promise<void> =>
    apiClient.put(`/api/admin/boards/${brdId}/enable`).then(() => undefined),
};

const QK = ['admin-boards'];

export const useAdminBoards = (keyword?: string, status?: string) =>
  useQuery({
    queryKey: [...QK, keyword, status],
    queryFn: () => adminBoardApi.getList(keyword, status),
  });

export const useCreateBoard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminBoardApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
};

export const useUpdateBoard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ brdId, data }: { brdId: string; data: UpdateBoardRequest }) =>
      adminBoardApi.update(brdId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
};

export const useDisableBoard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (brdId: string) => adminBoardApi.disable(brdId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
};

export const useEnableBoard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (brdId: string) => adminBoardApi.enable(brdId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
};
