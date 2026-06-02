import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/client';

export interface AprvFormSummary {
  aprvFormId: string;
  aprvFormNm: string;
  fileYn: string;
  dtlCount: number;
  crtAt: string;
}

export interface AprvFormDtlItem {
  aprvRefCd: string;
  aprvRefNm: string;
  aprvRefSe: string | null;
  reqdYn: string;
}

export interface AprvFormDetail {
  aprvFormId: string;
  aprvFormNm: string;
  fileYn: string;
  rmk: string | null;
  dtls: AprvFormDtlItem[];
}

export interface CreateAprvFormRequest {
  aprvFormId: string;
  aprvFormNm: string;
  fileYn?: string;
  rmk?: string;
  dtls?: Omit<AprvFormDtlItem, never>[];
}

export interface UpdateAprvFormRequest {
  aprvFormNm: string;
  fileYn?: string;
  rmk?: string;
  dtls?: AprvFormDtlItem[];
}

const aprvFormApi = {
  getList: (): Promise<AprvFormSummary[]> =>
    apiClient.get('/api/admin/aprv-forms').then((r) => r.data?.data ?? []),

  getDetail: (aprvFormId: string): Promise<AprvFormDetail> =>
    apiClient.get(`/api/admin/aprv-forms/${aprvFormId}`).then((r) => r.data.data),

  create: (data: CreateAprvFormRequest): Promise<AprvFormDetail> =>
    apiClient.post('/api/admin/aprv-forms', data).then((r) => r.data.data),

  update: (aprvFormId: string, data: UpdateAprvFormRequest): Promise<AprvFormDetail> =>
    apiClient.put(`/api/admin/aprv-forms/${aprvFormId}`, data).then((r) => r.data.data),

  delete: (aprvFormId: string): Promise<void> =>
    apiClient.delete(`/api/admin/aprv-forms/${aprvFormId}`).then(() => undefined),
};

const QK = ['admin-aprv-forms'];

export const useAdminAprvForms = () =>
  useQuery({ queryKey: QK, queryFn: aprvFormApi.getList });

export const useAdminAprvFormDetail = (aprvFormId: string) =>
  useQuery({
    queryKey: [...QK, aprvFormId],
    queryFn: () => aprvFormApi.getDetail(aprvFormId),
    enabled: !!aprvFormId,
  });

export const useCreateAprvForm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: aprvFormApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
};

export const useUpdateAprvForm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ aprvFormId, data }: { aprvFormId: string; data: UpdateAprvFormRequest }) =>
      aprvFormApi.update(aprvFormId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
};

export const useDeleteAprvForm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (aprvFormId: string) => aprvFormApi.delete(aprvFormId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
};
