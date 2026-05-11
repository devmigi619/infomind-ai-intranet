import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../shared/api/client';

export interface AdminUser {
  userId: string;
  userNm: string;
  userSe: string; // 'ADMIN' | 'USER' | 'INVALID'
  deptCd: string | null;
  jbgdCd: string | null;
  eml: string | null;
  mtelno: string | null;
  hireYmd: string | null;
}

export interface CreateUserRequest {
  userId: string;
  userNm: string;
  pwd: string;
  userSe?: string;
  deptCd?: string;
  jbgdCd?: string;
  eml?: string;
  mtelno?: string;
  hireYmd?: string;
}

export interface UpdateUserRequest {
  userNm: string;
  userSe?: string;
  deptCd?: string;
  jbgdCd?: string;
  eml?: string;
  mtelno?: string;
  hireYmd?: string;
}

export interface ResetPasswordRequest {
  newPassword: string;
}

const adminUserApi = {
  getList: (keyword?: string, status?: string): Promise<AdminUser[]> =>
    apiClient
      .get('/api/admin/users', { params: { keyword, status } })
      .then((r) => r.data?.data ?? []),

  create: (data: CreateUserRequest): Promise<AdminUser> =>
    apiClient.post('/api/admin/users', data).then((r) => r.data.data),

  update: (userId: string, data: UpdateUserRequest): Promise<AdminUser> =>
    apiClient.put(`/api/admin/users/${userId}`, data).then((r) => r.data.data),

  resetPassword: (userId: string, data: ResetPasswordRequest): Promise<void> =>
    apiClient.post(`/api/admin/users/${userId}/reset-password`, data).then(() => undefined),

  disable: (userId: string): Promise<void> =>
    apiClient.patch(`/api/admin/users/${userId}/disable`).then(() => undefined),

  enable: (userId: string): Promise<void> =>
    apiClient.patch(`/api/admin/users/${userId}/enable`).then(() => undefined),
};

const QK = ['admin-users'];

export const useAdminUsers = (keyword?: string, status?: string) =>
  useQuery({
    queryKey: [...QK, keyword, status],
    queryFn: () => adminUserApi.getList(keyword, status),
  });

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminUserApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
};

export const useUpdateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: UpdateUserRequest }) =>
      adminUserApi.update(userId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
};

export const useResetPassword = () =>
  useMutation({
    mutationFn: ({ userId, data }: { userId: string; data: ResetPasswordRequest }) =>
      adminUserApi.resetPassword(userId, data),
  });

export const useDisableUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => adminUserApi.disable(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
};

export const useEnableUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => adminUserApi.enable(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: QK }),
  });
};
