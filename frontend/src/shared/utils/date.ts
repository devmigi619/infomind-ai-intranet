/**
 * 범용 날짜 유틸 — 프로젝트 전체 공유
 * YYYYMMDD 문자열 기반 (백엔드 날짜 포맷과 동일)
 */

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

// ── YYYYMMDD ↔ Date 변환 ──────────────────────────────────────

export function toYmd(d: Date): string {
  return `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}`;
}

export function parseYmd(ymd: string): Date {
  return new Date(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8));
}

// ── 포맷 ──────────────────────────────────────────────────────

/** "20260515" → "2026.05.15" */
export function fmtYmd(ymd: string): string {
  return `${ymd.slice(0, 4)}.${ymd.slice(4, 6)}.${ymd.slice(6, 8)}`;
}

/** "20260515" → "2026-05-15" (input[type=date]용) */
export function fmtYmdDash(ymd: string): string {
  return `${ymd.slice(0, 4)}-${ymd.slice(4, 6)}-${ymd.slice(6, 8)}`;
}

/** "2026-05-15" → "20260515" */
export function dashToYmd(dash: string): string {
  return dash.replace(/-/g, '');
}

/** "20260515" → "5월 15일" */
export function fmtMonthDay(ymd: string): string {
  const m = parseInt(ymd.slice(4, 6), 10);
  const d = parseInt(ymd.slice(6, 8), 10);
  return `${m}월 ${d}일`;
}

/** "20260515" → "5.15" */
export function fmtShortDate(ymd: string): string {
  const m = parseInt(ymd.slice(4, 6), 10);
  const d = parseInt(ymd.slice(6, 8), 10);
  return `${m}.${d}`;
}

// ── 오늘/내일 ─────────────────────────────────────────────────

export function todayYmd(): string {
  return toYmd(new Date());
}

export function tomorrowYmd(): string {
  return toYmd(addDays(new Date(), 1));
}

// ── 날짜 계산 ─────────────────────────────────────────────────

export function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

export function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

/** 해당 월의 첫날~마지막날 YYYYMMDD */
export function getMonthRange(y: number, m: number): { st: string; end: string } {
  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);
  return { st: toYmd(first), end: toYmd(last) };
}

/** 해당 주의 일요일~토요일 YYYYMMDD */
export function getWeekRange(d: Date): { st: string; end: string } {
  const dow = d.getDay();
  const sun = addDays(d, -dow);
  const sat = addDays(sun, 6);
  return { st: toYmd(sun), end: toYmd(sat) };
}

/** 해당 주의 7일 Date 배열 (일~토) */
export function getWeekDates(d: Date): Date[] {
  const dow = d.getDay();
  const sun = addDays(d, -dow);
  return Array.from({ length: 7 }, (_, i) => addDays(sun, i));
}

// ── 상수 ──────────────────────────────────────────────────────

export const DOW_LABELS = ['일', '월', '화', '수', '목', '금', '토'] as const;

/** 일요일 빨강, 토요일 파랑 */
export const WEEKEND_COLORS = { sun: '#EF4444', sat: '#3B82F6' } as const;
