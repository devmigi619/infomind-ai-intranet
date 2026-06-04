import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/client';

export type ReportStatus = 'NOT_WRITTEN' | 'DRAFT' | 'SUBMITTED';

export interface MyReportRound {
  rptFormId: string;
  rptTtl: string;
  rptDesc: string;
  rptDtSe: string;
  roundSn: number;
  roundNm: string;
  roundYmd: string;
  status: ReportStatus;
  execDesc: string | null;
  planDesc: string | null;
  sbmtYmd: string | null;
  targetCount: number;
  submittedCount: number;
}

export interface ReportSubmission {
  userId: string;
  userNm: string;
  status: ReportStatus;
  sbmtYmd: string | null;
  execDesc: string | null;
  planDesc: string | null;
}

export interface ReportWriteRequest {
  execDesc: string;
  planDesc: string;
}

const reportsApi = {
  getMyRounds: (): Promise<MyReportRound[]> =>
    apiClient.get('/api/reports/my-rounds').then((r) => r.data?.data ?? []),
  getMyRound: (formId: string, roundSn: number): Promise<MyReportRound> =>
    apiClient.get(`/api/reports/${formId}/rounds/${roundSn}`).then((r) => r.data.data),
  getSubmissions: (formId: string, roundSn: number): Promise<ReportSubmission[]> =>
    apiClient.get(`/api/reports/${formId}/rounds/${roundSn}/submissions`).then((r) => r.data?.data ?? []),
  saveDraft: (formId: string, roundSn: number, data: ReportWriteRequest): Promise<MyReportRound> =>
    apiClient.put(`/api/reports/${formId}/rounds/${roundSn}/draft`, data).then((r) => r.data.data),
  submit: (formId: string, roundSn: number, data: ReportWriteRequest): Promise<MyReportRound> =>
    apiClient.post(`/api/reports/${formId}/rounds/${roundSn}/submit`, data).then((r) => r.data.data),
};

const QK = ['reports'];

export const useMyReportRounds = () =>
  useQuery({
    queryKey: [...QK, 'my-rounds'],
    queryFn: reportsApi.getMyRounds,
  });

export const useMyReportRound = (formId?: string, roundSn?: number) =>
  useQuery({
    queryKey: [...QK, 'my-round', formId, roundSn],
    queryFn: () => reportsApi.getMyRound(formId!, roundSn!),
    enabled: !!formId && !!roundSn,
  });

export const useReportSubmissions = (formId?: string, roundSn?: number) =>
  useQuery({
    queryKey: [...QK, 'submissions', formId, roundSn],
    queryFn: () => reportsApi.getSubmissions(formId!, roundSn!),
    enabled: !!formId && !!roundSn,
  });

export const useSaveReportDraft = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ formId, roundSn, data }: { formId: string; roundSn: number; data: ReportWriteRequest }) =>
      reportsApi.saveDraft(formId, roundSn, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
};

export const useSubmitReport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ formId, roundSn, data }: { formId: string; roundSn: number; data: ReportWriteRequest }) =>
      reportsApi.submit(formId, roundSn, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
};

export { reportsApi };
