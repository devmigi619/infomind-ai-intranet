import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/client';

export interface Post {
  id: number;
  title: string;
  category: string;
  authorName: string;
  viewCount: number;
  createdAt: string;
  content: string;
}

const postsApi = {
  getList: (page = 0, category = ''): Promise<Post[]> =>
    apiClient
      .get(`/api/posts?page=${page}&size=20${category ? `&category=${category}` : ''}`)
      .then((r) => r.data?.data?.content ?? []),
  getDetail: (id: number): Promise<Post> =>
    apiClient.get(`/api/posts/${id}`).then((r) => r.data.data),
  create: (data: { title: string; content: string; category: string }) =>
    apiClient.post('/api/posts', data).then((r) => r.data.data),
};

export const useBoardList = (page = 0, category = '') =>
  useQuery({
    queryKey: ['posts', page, category],
    queryFn: () => postsApi.getList(page, category),
  });

export const useBoardDetail = (id: number) =>
  useQuery({
    queryKey: ['post', id],
    queryFn: () => postsApi.getDetail(id),
    enabled: !!id,
  });

export const useCreatePost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: postsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  });
};

export { postsApi };
