import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/client';

export interface CommonCode {
  upCd: string;
  cd: string;
  cdNm: string;
  cdLvl?: number;
  cdOrd?: number;
  useYn: string;
  cdRmk?: string;
  engCdNm?: string;
}

export interface CreateCodeRequest {
  upCd: string;
  cd: string;
  cdNm: string;
  cdOrd?: number;
  cdRmk?: string;
  engCdNm?: string;
}

export interface UpdateCodeRequest {
  cdNm: string;
  useYn?: string;
  cdOrd?: number;
  cdRmk?: string;
  engCdNm?: string;
}

const commonCodeApi = {
  getCategories: (): Promise<CommonCode[]> =>
    apiClient.get('/api/admin/common-codes').then((r) => r.data?.data ?? []),

  getCodes: (upCd: string): Promise<CommonCode[]> =>
    apiClient.get(`/api/admin/common-codes/${upCd}`).then((r) => r.data?.data ?? []),

  create: (data: CreateCodeRequest): Promise<CommonCode> =>
    apiClient.post('/api/admin/common-codes', data).then((r) => r.data.data),

  update: (upCd: string, cd: string, data: UpdateCodeRequest): Promise<CommonCode> =>
    apiClient.put(`/api/admin/common-codes/${upCd}/${cd}`, data).then((r) => r.data.data),

  delete: (upCd: string, cd: string): Promise<void> =>
    apiClient.delete(`/api/admin/common-codes/${upCd}/${cd}`).then(() => undefined),
};

export const useCategories = () =>
  useQuery({
    queryKey: ['common-codes', 'categories'],
    queryFn: commonCodeApi.getCategories,
  });

export const useCommonCodes = (upCd: string) =>
  useQuery({
    queryKey: ['common-codes', upCd],
    queryFn: () => commonCodeApi.getCodes(upCd),
    enabled: !!upCd,
  });

export const useCreateCode = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: commonCodeApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['common-codes'] }),
  });
};

export const useUpdateCode = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ upCd, cd, data }: { upCd: string; cd: string; data: UpdateCodeRequest }) =>
      commonCodeApi.update(upCd, cd, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['common-codes'] }),
  });
};

export const useDeleteCode = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ upCd, cd }: { upCd: string; cd: string }) => commonCodeApi.delete(upCd, cd),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['common-codes'] }),
  });
};

export { commonCodeApi };
