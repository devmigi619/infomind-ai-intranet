/**
 * useToast — 컴포넌트에서 토스트를 띄우는 편의 훅
 *
 * 사용 예:
 *   const toast = useToast();
 *   toast.success('예약이 완료되었습니다.');
 *   toast.error('예약에 실패했습니다.');
 */
import { useToastStore } from '../../store/toastStore';

export function useToast() {
  const show = useToastStore((s) => s.show);

  return {
    show,
    success: (message: string, duration?: number) =>
      show({ variant: 'success', message, duration }),
    error: (message: string, duration?: number) =>
      show({ variant: 'error', message, duration }),
    warning: (message: string, duration?: number) =>
      show({ variant: 'warning', message, duration }),
    info: (message: string, duration?: number) =>
      show({ variant: 'info', message, duration }),
  };
}
