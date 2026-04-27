import { apiClient } from './client';

export const approvalsApi = {
  getList: (type: 'my' | 'pending' = 'my') =>
    apiClient.get(`/api/approvals?type=${type}`),
  getDetail: (id: number) => apiClient.get(`/api/approvals/${id}`),
  create: (data: { title: string; content: string; type: string; approverIds: number[] }) =>
    apiClient.post('/api/approvals', data),
  approve: (id: number, comment = '') =>
    apiClient.post(`/api/approvals/${id}/approve`, { comment }),
  reject: (id: number, comment = '') =>
    apiClient.post(`/api/approvals/${id}/reject`, { comment }),
};
