import { apiClient } from './client';

export interface UserInfo {
  id: number;
  username: string;
  name: string;
  department: string;
  position: string;
  role: string;
}

export const usersApi = {
  getAll: () => apiClient.get<{ data: UserInfo[] }>('/api/users'),
  updateFcmToken: (fcmToken: string) =>
    apiClient.put('/api/users/me/fcm-token', { fcmToken }),
};
