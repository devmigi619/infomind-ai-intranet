import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/client';

export interface Report {
  id: number;
  weekStart: string;
  thisWeek: string;
  nextWeek: string;
  issues: string | null;
  createdAt: string;
}

const reportsApi = {
  getList: (page = 0): Promise<Report[]> =>
    apiClient
      .get(`/api/weekly-reports?page=${page}&size=20`)
      .then((r) => r.data?.data?.content ?? []),
  getDetail: (id: number): Promise<Report> =>
    apiClient.get(`/api/weekly-reports/${id}`).then((r) => r.data.data),
  create: (data: unknown) =>
    apiClient.post('/api/weekly-reports', data).then((r) => r.data.data),
  update: (id: number, data: unknown) =>
    apiClient.put(`/api/weekly-reports/${id}`, data).then((r) => r.data.data),
};

export const useReportList = (page = 0) =>
  useQuery({
    queryKey: ['reports', page],
    queryFn: () => reportsApi.getList(page),
  });

export const useReportDetail = (id: number) =>
  useQuery({
    queryKey: ['report', id],
    queryFn: () => reportsApi.getDetail(id),
    enabled: !!id,
  });

export const useCreateReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reportsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  });
};

export const useUpdateReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: unknown }) =>
      reportsApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  });
};

export { reportsApi };
