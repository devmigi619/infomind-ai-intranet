import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { apiClient } from '../../shared/api/client';
import {Platform} from "react-native";

export interface User {
  id: number;
  username: string;
  name: string;
  department: string;
  position: string;
  role: string;
}

// === HTTP 함수 ===
const authApi = {
  login: async (username: string, password: string) => {
    const res = await apiClient.post('/api/auth/login', { username, password });
    const { token, refreshToken, user } = res.data.data;
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('refreshToken', refreshToken);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    return user as User;
  },
  logout: async () => {
    await AsyncStorage.multiRemove(['token', 'refreshToken', 'user']);
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
    await AsyncStorage.setItem('token', newToken);
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
    mutationFn: ({ username, password }: { username: string; password: string }) =>
      authApi.login(username, password),
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
