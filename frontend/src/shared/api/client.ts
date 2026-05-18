import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useToastStore } from '../../store/toastStore';
import { useUiStore } from '../../store/uiStore';
import { queryClient } from './queryClient';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;
if (!BASE_URL) {
  throw new Error(
    'EXPO_PUBLIC_API_URL 환경변수가 설정되지 않았습니다. frontend/.env.local 파일을 만들어주세요. (frontend/.env.example 참고)',
  );
}

export const apiClient = axios.create({ baseURL: BASE_URL, timeout: 10000 });

// ─── Request 인터셉터: JWT 주입 ─────────────────────────────────────────────

apiClient.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── Response 인터셉터 ─────────────────────────────────────────────────────

let isRefreshing = false;
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
};

/**
 * 인터셉터에서 처리된 에러임을 표시하는 플래그.
 * 컴포넌트 catch 블록에서 중복 처리를 방지할 수 있습니다.
 *   if ((err as any)?._handled) return;
 */
const markHandled = (error: any): any => {
  if (error && typeof error === 'object') error._handled = true;
  return error;
};

/**
 * 세션 만료 처리 — 토큰 삭제 + currentUser 초기화 + UI 리셋 + 토스트
 * 418 리프레시 실패 또는 419 직접 수신 시 호출
 */
const forceLogout = async () => {
  const toast = useToastStore.getState();

  await AsyncStorage.multiRemove(['token', 'refreshToken', 'user']);
  if (Platform.OS !== 'web') {
    await SecureStore.deleteItemAsync('refreshToken').catch(() => {});
  }

  queryClient.setQueryData(['auth', 'currentUser'], null);
  useUiStore.getState().resetUiToDefaults();

  toast.show({ variant: 'error', message: '세션이 만료되었습니다. 다시 로그인해 주세요.' });
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status: number | undefined = error.response?.status;
    const toast = useToastStore.getState();

    // ── 418: 액세스 토큰 거부 → 리프레시 후 재시도 ──────────────────────
    if (status === 418 && !original._retry) {
      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return apiClient(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        let refreshToken: string | null;
        if (Platform.OS === 'android' || Platform.OS === 'ios') {
          refreshToken = await SecureStore.getItemAsync('refreshToken');
        } else {
          refreshToken = await AsyncStorage.getItem('refreshToken');
        }

        if (!refreshToken) throw new Error('No refresh token');

        const res = await axios.post(`${BASE_URL}/api/auth/refresh`, { refreshToken });
        const newToken: string = res.data.data.token;
        const newRefreshToken: string | undefined = res.data.data.refreshToken;

        await AsyncStorage.setItem('token', newToken);
        if (newRefreshToken) {
          if (Platform.OS === 'android' || Platform.OS === 'ios') {
            await SecureStore.setItemAsync('refreshToken', newRefreshToken);
          } else {
            await AsyncStorage.setItem('refreshToken', newRefreshToken);
          }
        }

        processQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      } catch (err) {
        processQueue(err, null);
        await forceLogout();
        return Promise.reject(markHandled(err));
      } finally {
        isRefreshing = false;
      }
    }

    // ── 419: 리프레시 토큰 거부 → 세션 만료 처리 ────────────────────────
    if (status === 419) {
      await forceLogout();
      return Promise.reject(markHandled(error));
    }

    // ── 네트워크 에러 (서버 응답 없음) ───────────────────────────────────
    if (!error.response) {
      toast.show({ variant: 'warning', message: '네트워크 연결을 확인해 주세요.' });
      return Promise.reject(markHandled(error));
    }

    // ── 4xx 에러 ─────────────────────────────────────────────────────────
    if (status !== undefined && status >= 400 && status < 500) {
      toast.show({ variant: 'error', message: '요청에 실패했습니다.' });
      return Promise.reject(markHandled(error));
    }

    // ── 5xx 에러 ─────────────────────────────────────────────────────────
    if (status !== undefined && status >= 500) {
      toast.show({ variant: 'error', message: '알 수 없는 에러가 발생했습니다.' });
      return Promise.reject(markHandled(error));
    }

    return Promise.reject(error);
  },
);
