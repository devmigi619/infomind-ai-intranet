import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useToastStore } from '../../store/toastStore';

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
 * 서버 응답 구조
 *   성공: { success: true,  data: {...},  message: null }
 *   실패: { success: false, data: null,   message: "에러 메시지" }
 *   401:  { code: "UNAUTHORIZED", message: "인증이 필요합니다." }
 */
const extractMessage = (error: any): string | null =>
  error?.response?.data?.message ?? null;

/**
 * 인터셉터에서 처리된 에러임을 표시하는 플래그.
 * 컴포넌트 catch 블록에서 중복 처리를 방지할 수 있습니다.
 *   if ((err as any)?._handled) return;
 */
const markHandled = (error: any): any => {
  if (error && typeof error === 'object') error._handled = true;
  return error;
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status: number | undefined = error.response?.status;
    const toast = useToastStore.getState();

    // ── 401: 토큰 재발급 후 재시도 ───────────────────────────────────────
    if (status === 401 && !original._retry) {
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
        await AsyncStorage.multiRemove(['token', 'refreshToken', 'user']);
        // 재발급 실패 = 세션 만료
        toast.show({ variant: 'error', message: '세션이 만료되었습니다. 다시 로그인해 주세요.' });
        return Promise.reject(markHandled(err));
      } finally {
        isRefreshing = false;
      }
    }

    // ── 그 외 HTTP 에러 ──────────────────────────────────────────────────
    if (status === 403) {
      const msg = extractMessage(error) ?? '접근 권한이 없습니다.';
      toast.show({ variant: 'error', message: msg });
      return Promise.reject(markHandled(error));
    }

    if (status === 400) {
      const msg = extractMessage(error) ?? '요청이 올바르지 않습니다.';
      toast.show({ variant: 'error', message: msg });
      return Promise.reject(markHandled(error));
    }

    if (status !== undefined && status >= 500) {
      const msg = extractMessage(error) ?? '서버 오류가 발생했습니다.';
      toast.show({ variant: 'error', message: msg });
      return Promise.reject(markHandled(error));
    }

    // ── 네트워크 에러 (서버 응답 없음) ───────────────────────────────────
    if (!error.response) {
      toast.show({ variant: 'warning', message: '네트워크 연결을 확인해 주세요.' });
      return Promise.reject(markHandled(error));
    }

    return Promise.reject(error);
  },
);
