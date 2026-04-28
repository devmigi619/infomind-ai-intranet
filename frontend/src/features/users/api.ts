import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/client';

export interface UserInfo {
  id: number;
  username: string;
  name: string;
  department: string;
  position: string;
  role: string;
}

const usersApi = {
  getAll: (): Promise<UserInfo[]> =>
    apiClient.get('/api/users').then((r) => r.data?.data ?? []),
  updateFcmToken: (fcmToken: string) =>
    apiClient.put('/api/users/me/fcm-token', { fcmToken }),
};

export const useUsers = () =>
  useQuery({
    queryKey: ['users'],
    queryFn: usersApi.getAll,
  });

export const useUpdateFcmToken = () =>
  useMutation({
    mutationFn: usersApi.updateFcmToken,
  });

export { usersApi };
