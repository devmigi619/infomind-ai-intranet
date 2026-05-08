import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/client';

export interface JobGrade {
  jbgdCd: string;
  jbgdNm: string;
  jbgdSn?: number;
  useYn: string;
  rmk?: string;
}

export interface CreateJobGradeRequest {
  jbgdCd: string;
  jbgdNm: string;
  jbgdSn?: number;
  rmk?: string;
}

export interface UpdateJobGradeRequest {
  jbgdNm: string;
  jbgdSn?: number;
  useYn?: string;
  rmk?: string;
}

const jobGradeApi = {
  getAll: (): Promise<JobGrade[]> =>
    apiClient.get('/api/admin/job-grades').then((r) => r.data?.data ?? []),

  create: (data: CreateJobGradeRequest): Promise<JobGrade> =>
    apiClient.post('/api/admin/job-grades', data).then((r) => r.data.data),

  update: (jbgdCd: string, data: UpdateJobGradeRequest): Promise<JobGrade> =>
    apiClient.put(`/api/admin/job-grades/${jbgdCd}`, data).then((r) => r.data.data),

  delete: (jbgdCd: string): Promise<void> =>
    apiClient.delete(`/api/admin/job-grades/${jbgdCd}`).then(() => undefined),
};

export const useJobGrades = () =>
  useQuery({
    queryKey: ['job-grades'],
    queryFn: jobGradeApi.getAll,
  });

export const useCreateJobGrade = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: jobGradeApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-grades'] }),
  });
};

export const useUpdateJobGrade = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ jbgdCd, data }: { jbgdCd: string; data: UpdateJobGradeRequest }) =>
      jobGradeApi.update(jbgdCd, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-grades'] }),
  });
};

export const useDeleteJobGrade = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jbgdCd: string) => jobGradeApi.delete(jbgdCd),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-grades'] }),
  });
};
