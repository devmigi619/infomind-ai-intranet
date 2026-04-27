import { apiClient } from './client';

export const reportsApi = {
  getList: (page = 0) => apiClient.get(`/api/weekly-reports?page=${page}&size=20`),
  getDetail: (id: number) => apiClient.get(`/api/weekly-reports/${id}`),
  create: (data: unknown) => apiClient.post('/api/weekly-reports', data),
  update: (id: number, data: unknown) => apiClient.put(`/api/weekly-reports/${id}`, data),
};
