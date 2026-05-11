import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export interface CodeOption {
  /** 실제 저장 값 (CD) */
  value: string;
  /** 화면 표시명 (CD_NM) */
  label: string;
}

interface CommonCodeDto {
  upCd: string;
  cd: string;
  cdNm: string;
  cdOrd?: number;
  useYn: string;
}

/**
 * 공통코드 콤보박스 훅.
 *
 * _SE 로 끝나는 컬럼의 선택 옵션을 항상 이 훅으로 가져온다.
 *
 * @param upCd - 컬럼명 대문자 (예: 'USER_SE', 'APRVL_SE')
 *
 * @example
 * const roleOptions = useCodeList('USER_SE');
 * // → [{ value: 'ADMIN', label: '관리자' }, { value: 'USER', label: '일반' }]
 */
export function useCodeList(upCd: string): CodeOption[] {
  const { data = [] } = useQuery<CommonCodeDto[]>({
    queryKey: ['codes', upCd],
    queryFn: () =>
      apiClient.get(`/api/codes/${upCd}`).then((r) => r.data?.data ?? []),
    enabled: !!upCd,
    staleTime: 1000 * 60 * 10, // 10분 캐시 — 공통코드는 자주 바뀌지 않음
  });

  return data.map((c) => ({ value: c.cd, label: c.cdNm }));
}
