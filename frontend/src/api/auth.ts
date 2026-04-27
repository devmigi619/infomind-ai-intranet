import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from './client';

export const authApi = {
  login: async (username: string, password: string) => {
    const res = await apiClient.post('/api/auth/login', { username, password });
    const { token, refreshToken, user } = res.data.data;
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('refreshToken', refreshToken);
    await AsyncStorage.setItem('user', JSON.stringify(user));
    return user;
  },
  refresh: async () => {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('No refresh token');
    const res = await apiClient.post('/api/auth/refresh', { refreshToken });
    const newToken = res.data.data.token;
    await AsyncStorage.setItem('token', newToken);
    return newToken;
  },
  logout: async () => {
    await AsyncStorage.multiRemove(['token', 'refreshToken', 'user']);
  },
  getStoredUser: async () => {
    const u = await AsyncStorage.getItem('user');
    return u ? JSON.parse(u) : null;
  },
};
