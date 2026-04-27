import { apiClient } from './client';

export const postsApi = {
  getList: (page = 0, category = '') =>
    apiClient.get(`/api/posts?page=${page}&size=20${category ? `&category=${category}` : ''}`),
  getDetail: (id: number) => apiClient.get(`/api/posts/${id}`),
  create: (data: { title: string; content: string; category: string }) =>
    apiClient.post('/api/posts', data),
};
