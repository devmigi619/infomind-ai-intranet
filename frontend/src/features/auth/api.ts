import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../../shared/api/client';
import {Platform} from "react-native";

export interface User {
  id: number;
    userId: string;
  name: string;
  department: string;
  position: string;
  role: string;
}

// === HTTP 함수 ===
const authApi = {
  login: async (userId: string, password: string) => {
    const res = await apiClient.post('/api/auth/login', { userId, password });
    const { token, refreshToken, user: raw } = res.data.data;

    // 백엔드 UserInfoResponse 필드명 → 프론트 User 인터페이스 매핑
    // 백엔드: userNm / userSe / deptCd / jbgdCd
    // 프론트:  name  / role  / department / position
    const user: User = {
      id:         raw.id        ?? 0,
      userId:     raw.userId,
      name:       raw.userNm    ?? raw.userId,
      department: raw.deptCd    ?? '',
      position:   raw.jbgdCd   ?? '',
      role:       raw.userSe    ?? 'USER',
    };

    await AsyncStorage.setItem('token', token);
    // refresh 함수와 일관: 모바일은 SecureStore, 웹은 AsyncStorage
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      await SecureStore.setItemAsync('refreshToken', refreshToken);
    } else {
      await AsyncStorage.setItem('refreshToken', refreshToken);
    }
    await AsyncStorage.setItem('user', JSON.stringify(user));
    return user;
  },
  logout: async () => {
    await AsyncStorage.multiRemove(['token', 'refreshToken', 'user']);
    // 모바일은 SecureStore에 저장돼 있으니 같이 정리
    if (Platform.OS === 'android' || Platform.OS === 'ios') {
      await SecureStore.deleteItemAsync('refreshToken').catch(() => {});
    }
  },
  getStoredUser: async (): Promise<User | null> => {
    const u = await AsyncStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  },
  refresh: async () => {
    let refreshToken;
    if(Platform.OS === "android" || Platform.OS === "ios") {
        refreshToken = await SecureStore.getItemAsync("refreshToken");
    }else {
        refreshToken = await AsyncStorage.getItem('refreshToken');
    }
    if (!refreshToken) throw new Error('No refresh token');
    const res = await apiClient.post('/api/auth/refresh', { refreshToken });
    const newToken = res.data.data.token;
    const newRefreshToken = res.data.data.refreshToken;
    await AsyncStorage.setItem('token', newToken);
    // Rolling refresh: 새 refresh token도 저장 (모바일은 SecureStore, 웹은 AsyncStorage)
    if (newRefreshToken) {
      if (Platform.OS === "android" || Platform.OS === "ios") {
        await SecureStore.setItemAsync('refreshToken', newRefreshToken);
      } else {
        await AsyncStorage.setItem('refreshToken', newRefreshToken);
      }
    }
    return newToken;
  },
};

// === React Query 훅 ===
export const useCurrentUser = () =>
  useQuery({
    queryKey: ['auth', 'currentUser'],
    queryFn: authApi.getStoredUser,
    staleTime: Infinity,
  });

export const useLogin = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) =>
      authApi.login(userId, password),
    onSuccess: (user) => {
      qc.setQueryData(['auth', 'currentUser'], user);
    },
  });
};

export const useLogout = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      qc.setQueryData(['auth', 'currentUser'], null);
      qc.clear();
    },
  });
};

export { authApi };
