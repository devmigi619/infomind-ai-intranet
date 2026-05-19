/**
 * 색상 상수 모음
 * - `colors`: 다크모드 마이그레이션 이전의 정적 팔레트 (시맨틱 토큰은 `themes.ts` 사용)
 * - `deptColors` / `getDeptColor` / `getDeptColorSoft`: 캘린더 부서별 색상 (테마와 무관한 도메인 색)
 * - `mineHighlight`: 내 일정 강조 색
 */
export const colors = {
  brand: {
    primary: '#0A2463',
    primaryDark: '#082052',
    primaryTint: 'rgba(10,36,99,0.08)',
    primaryTintSoft: 'rgba(10,36,99,0.05)',
    primaryTintMid: 'rgba(10,36,99,0.14)',
    primaryBorder: 'rgba(10,36,99,0.5)',
  },
  background: {
    app: '#F9F9F9',
    surface: '#FFFFFF',
    surfaceAlt: '#FAFAFA',
    surfaceMute: '#F5F5F5',
    surfaceMuteAlt: '#F0F0F0',
  },
  border: {
    light: 'rgba(0,0,0,0.06)',
    medium: 'rgba(0,0,0,0.08)',
    strong: 'rgba(0,0,0,0.12)',
    subtle: 'rgba(0,0,0,0.04)',
  },
  text: {
    primary: '#000000',
    onBrand: '#FFFFFF',
    secondary: 'rgba(0,0,0,0.85)',
    body: 'rgba(0,0,0,0.7)',
    muted: 'rgba(0,0,0,0.55)',
    soft: 'rgba(0,0,0,0.45)',
    faint: 'rgba(0,0,0,0.35)',
    subtle: 'rgba(0,0,0,0.3)',
  },
  semantic: {
    warning: '#F59E0B',
    success: '#10B981',
    danger: '#EF4444',
    info: '#0A2463',
  },
  semanticTint: {
    warning: 'rgba(245,158,11,0.12)',
    success: 'rgba(16,185,129,0.12)',
    danger: 'rgba(239,68,68,0.12)',
    info: 'rgba(10,36,99,0.10)',
  },
  black: '#000000',
  white: '#FFFFFF',
};

/** 캘린더 부서별 색 토큰 (알려진 부서코드용) */
export const deptColors: Record<string, string> = {
  ALL: '#64748B',   // 전사 — 회색
  HR: '#EC4899',    // 인사 — 분홍
  DEV: '#2563EB',   // 개발 — 파랑
  SEC: '#8B5CF6',   // 보안 — 보라
  SALES: '#F59E0B', // 영업 — 노랑
  MNGT: '#10B981',  // 경영 — 초록
  DSN: '#06B6D4',   // 디자인 — 시안
};

/** DB에 없는 부서코드용 해시 기반 폴백 팔레트 */
const DEPT_PALETTE = [
  '#2563EB', '#8B5CF6', '#F59E0B', '#10B981', '#EC4899',
  '#06B6D4', '#F97316', '#6366F1',
];

/** 부서코드 → 색상 (알려진 코드는 deptColors, 미지 코드는 해시 폴백) */
export function getDeptColor(deptCd: string | null): string {
  if (!deptCd) return deptColors.ALL;
  if (deptColors[deptCd]) return deptColors[deptCd];
  let hash = 0;
  for (const ch of deptCd) hash = (hash * 31 + ch.charCodeAt(0)) | 0;
  return DEPT_PALETTE[Math.abs(hash) % DEPT_PALETTE.length];
}

/** 부서색의 연한 버전 (배경용, ~10% opacity) */
export function getDeptColorSoft(deptCd: string | null): string {
  return getDeptColor(deptCd) + '18';
}

/** 내 일정 하이라이트 색 */
export const mineHighlight = '#8b5cf6';
