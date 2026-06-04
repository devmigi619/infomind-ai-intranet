import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/client';

export interface ReportForm {
  rptFormId: string; rptTtl: string; rptDesc: string; rptDtSe: string;
  rptAdmId: string; stYmd: string | null; deptCd: string; openYn: string;
  useYn: string; rmk: string | null; hasRounds: boolean;
}
export interface ReportRound {
  rptFormId: string; roundSn: number; roundNm: string; roundYmd: string;
  rptSum: string | null; locked: boolean; writtenCount: number; submittedCount: number;
}
export interface Submission {
  userId: string; userNm: string; status: 'NOT_WRITTEN' | 'DRAFT' | 'SUBMITTED';
  sbmtYmd: string | null; execDesc: string | null; planDesc: string | null;
}
export type FormRequest = Omit<ReportForm, 'hasRounds'>;
export type RoundRequest = Pick<ReportRound, 'roundNm' | 'roundYmd'>;

const api = {
  forms: (): Promise<ReportForm[]> => apiClient.get('/api/admin/report-forms').then(r => r.data?.data ?? []),
  createForm: (data: FormRequest): Promise<ReportForm> => apiClient.post('/api/admin/report-forms', data).then(r => r.data.data),
  updateForm: (id: string, data: FormRequest): Promise<ReportForm> => apiClient.put(`/api/admin/report-forms/${id}`, data).then(r => r.data.data),
  toggleForm: (id: string, enabled: boolean): Promise<ReportForm> => apiClient.patch(`/api/admin/report-forms/${id}/${enabled ? 'enable' : 'disable'}`).then(r => r.data.data),
  rounds: (id: string): Promise<ReportRound[]> => apiClient.get(`/api/admin/report-forms/${id}/rounds`).then(r => r.data?.data ?? []),
  createRound: (id: string, data: RoundRequest): Promise<ReportRound> => apiClient.post(`/api/admin/report-forms/${id}/rounds`, data).then(r => r.data.data),
  updateRound: (id: string, sn: number, data: RoundRequest): Promise<ReportRound> => apiClient.put(`/api/admin/report-forms/${id}/rounds/${sn}`, data).then(r => r.data.data),
  deleteRound: (id: string, sn: number): Promise<void> => apiClient.delete(`/api/admin/report-forms/${id}/rounds/${sn}`).then(() => undefined),
  submissions: (id: string, sn: number): Promise<Submission[]> => apiClient.get(`/api/admin/report-forms/${id}/rounds/${sn}/submissions`).then(r => r.data?.data ?? []),
  generateSummary: (id: string, sn: number): Promise<ReportRound> => apiClient.post(`/api/admin/report-forms/${id}/rounds/${sn}/summary`).then(r => r.data.data),
  updateSummary: (id: string, sn: number, summary: string): Promise<ReportRound> => apiClient.put(`/api/admin/report-forms/${id}/rounds/${sn}/summary`, { summary }).then(r => r.data.data),
};

const QK = ['admin-report'];
export const useReportForms = () => useQuery({ queryKey: [...QK, 'forms'], queryFn: api.forms });
export const useReportRounds = (id: string) => useQuery({ queryKey: [...QK, 'rounds', id], queryFn: () => api.rounds(id), enabled: !!id });
export const useReportSubmissions = (id: string, sn?: number) => useQuery({ queryKey: [...QK, 'submissions', id, sn], queryFn: () => api.submissions(id, sn!), enabled: !!id && !!sn });
const useRefresh = () => { const qc = useQueryClient(); return () => qc.invalidateQueries({ queryKey: QK }); };
export const useCreateReportForm = () => { const refresh = useRefresh(); return useMutation({ mutationFn: api.createForm, onSuccess: refresh }); };
export const useUpdateReportForm = () => { const refresh = useRefresh(); return useMutation({ mutationFn: ({ id, data }: { id: string; data: FormRequest }) => api.updateForm(id, data), onSuccess: refresh }); };
export const useToggleReportForm = () => { const refresh = useRefresh(); return useMutation({ mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => api.toggleForm(id, enabled), onSuccess: refresh }); };
export const useCreateReportRound = () => { const refresh = useRefresh(); return useMutation({ mutationFn: ({ id, data }: { id: string; data: RoundRequest }) => api.createRound(id, data), onSuccess: refresh }); };
export const useUpdateReportRound = () => { const refresh = useRefresh(); return useMutation({ mutationFn: ({ id, sn, data }: { id: string; sn: number; data: RoundRequest }) => api.updateRound(id, sn, data), onSuccess: refresh }); };
export const useDeleteReportRound = () => { const refresh = useRefresh(); return useMutation({ mutationFn: ({ id, sn }: { id: string; sn: number }) => api.deleteRound(id, sn), onSuccess: refresh }); };
export const useGenerateReportSummary = () => { const refresh = useRefresh(); return useMutation({ mutationFn: ({ id, sn }: { id: string; sn: number }) => api.generateSummary(id, sn), onSuccess: refresh }); };
export const useUpdateReportSummary = () => { const refresh = useRefresh(); return useMutation({ mutationFn: ({ id, sn, summary }: { id: string; sn: number; summary: string }) => api.updateSummary(id, sn, summary), onSuccess: refresh }); };
