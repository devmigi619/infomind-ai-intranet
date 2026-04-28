import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/client';

export interface ApprovalLine {
  seq: number;
  approverName: string;
  status: string;
  comment?: string;
  decidedAt?: string;
}

export interface Approval {
  id: number;
  title: string;
  type: string;
  status: string;
  requesterName: string;
  createdAt: string;
  content: string;
  approvalLines: ApprovalLine[];
}

const approvalsApi = {
  getList: (type: 'my' | 'pending' = 'my'): Promise<Approval[]> =>
    apiClient
      .get(`/api/approvals?type=${type}`)
      .then((r) => r.data?.data?.content ?? []),
  getDetail: (id: number): Promise<Approval> =>
    apiClient.get(`/api/approvals/${id}`).then((r) => r.data?.data ?? null),
  create: (data: { title: string; content: string; type: string; approverIds: number[] }) =>
    apiClient.post('/api/approvals', data).then((r) => r.data.data),
  approve: (id: number, comment = '') =>
    apiClient.post(`/api/approvals/${id}/approve`, { comment }).then((r) => r.data.data),
  reject: (id: number, comment = '') =>
    apiClient.post(`/api/approvals/${id}/reject`, { comment }).then((r) => r.data.data),
};

export const useApprovalList = (type: 'my' | 'pending' = 'my') =>
  useQuery({
    queryKey: ['approvals', type],
    queryFn: () => approvalsApi.getList(type),
  });

export const useApprovalDetail = (id: number) =>
  useQuery({
    queryKey: ['approval', id],
    queryFn: () => approvalsApi.getDetail(id),
    enabled: !!id,
  });

export const useCreateApproval = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: approvalsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals'] }),
  });
};

export const useApproveApproval = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: number; comment?: string }) =>
      approvalsApi.approve(id, comment),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals'] }),
  });
};

export const useRejectApproval = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comment }: { id: number; comment?: string }) =>
      approvalsApi.reject(id, comment),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['approvals'] }),
  });
};

export { approvalsApi };
