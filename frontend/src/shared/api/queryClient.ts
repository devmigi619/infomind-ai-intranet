import { QueryClient } from '@tanstack/react-query';

/**
 * 앱 전역 싱글턴 QueryClient.
 * App.tsx 의 QueryClientProvider 와 shared/api/client.ts 인터셉터 양쪽에서 참조한다.
 * (인터셉터에서 세션 만료 시 currentUser 쿼리를 직접 초기화하기 위함)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,               // 에러는 인터셉터가 처리 — RQ 재시도 불필요
      refetchOnWindowFocus: true,
      staleTime: 1000 * 60,       // 1분
    },
  },
});
