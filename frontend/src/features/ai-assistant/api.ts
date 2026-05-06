import { useQuery } from '@tanstack/react-query';
import type { AssistantResponse } from './types';

// ─── Intent Classification ────────────────────────────────────────────────────

const INTENT_KEYWORDS: Record<string, string[]> = {
  vacation: ['휴가', '연차', '반차', '월차'],
  vehicle: ['차량', '차를', '법인차', '렌터카'],
  meeting: ['회의실', '미팅룸', '회의 예약', '회의실 예약'],
  approval: ['결재', '품의', '승인', '전자결재'],
  report: ['주간보고', '주간 보고', '보고서'],
  certificate: ['증명서', '재직', '경력증명', '급여증명'],
  education: ['교육', '연수', '외부 교육', '사내 교육'],
  purchase: ['비품', '구매', '노트북', '소모품'],
  trip: ['출장', '출장비', '교통비 정산'],
};

export function classifyIntent(message: string): string | null {
  const lower = message.toLowerCase();
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return intent;
    }
  }
  return null;
}

// ─── Dummy Data Map ───────────────────────────────────────────────────────────

const ASSISTANT_DATA: Record<string, AssistantResponse> = {
  vacation: {
    intent: 'vacation',
    cards: [
      {
        type: 'action',
        icon: 'FileText',
        title: '휴가 신청',
        subtitle: '전자결재',
        link: '/approval/new?type=vacation',
      },
      {
        type: 'action',
        icon: 'Briefcase',
        title: '휴가 잔여일 확인',
        subtitle: '인사시스템',
        link: '/hr/vacation',
      },
      {
        type: 'action',
        icon: 'MessageCircle',
        title: '인사팀 문의',
        subtitle: '인사팀',
        link: '/chat/hr',
      },
      {
        type: 'info',
        icon: 'BookOpen',
        title: '휴가 사용 규정',
        tag: '규정',
        tagColor: '#0A2463',
        summaryItems: [
          '입사 1년 미만: 월 1일 발생',
          '입사 1년 이상: 연 15일 기본',
          '3년 이상 재직 시 1일 추가',
          '최대 2년간 미사용 휴가 연차 이월 가능',
        ],
        fullLink: '/docs/vacation',
      },
      {
        type: 'status',
        icon: 'Activity',
        title: '남은 휴가',
        value: '7일 (사용 8일 / 총 15일)',
      },
    ],
  },

  vehicle: {
    intent: 'vehicle',
    cards: [
      {
        type: 'action',
        icon: 'Car',
        title: '차량 예약하기',
        subtitle: '차량예약관리',
        link: '/vehicle/reserve',
      },
      {
        type: 'action',
        icon: 'MessageCircle',
        title: '총무팀 문의',
        subtitle: '총무팀',
        link: '/chat/general',
      },
      {
        type: 'info',
        icon: 'BookOpen',
        title: '법인차량 이용 규정',
        tag: '규정',
        tagColor: '#0A2463',
        summaryItems: [
          '예약은 사용일 기준 최소 1일 전 필수',
          '업무 목적 외 개인 사용 불가',
          '반납 시 연료 확인 및 날짜 변경 필수',
          '사고 발생 시 즉시 총무팀 보고 의무',
        ],
        fullLink: '/docs/vehicle',
      },
      {
        type: 'status',
        icon: 'Car',
        title: '차량 예약 현황',
        value: '소나타 1대 예약 가능',
      },
    ],
  },

  meeting: {
    intent: 'meeting',
    cards: [
      {
        type: 'action',
        icon: 'CalendarDays',
        title: '회의실 예약하기',
        subtitle: '회의실예약',
        link: '/meeting/reserve',
      },
      {
        type: 'action',
        icon: 'MessageCircle',
        title: '시설팀 문의',
        subtitle: '시설팀',
        link: '/chat/facility',
      },
      {
        type: 'info',
        icon: 'BookOpen',
        title: '회의실 이용 안내',
        tag: '안내',
        tagColor: '#1E88E5',
        summaryItems: [
          '최대 2시간 단위로 예약 가능',
          '30인실 이상 사용 시 사전 신청 필요',
          '사용 후 정리 정돈 필수',
          '예약 취소는 사용 1시간 전까지',
        ],
        fullLink: '/docs/meeting',
      },
      {
        type: 'status',
        icon: 'CalendarDays',
        title: '오늘 회의실 현황',
        value: '3층 A: 사용 중 / B: 예약 가능',
      },
    ],
  },

  approval: {
    intent: 'approval',
    cards: [
      {
        type: 'action',
        icon: 'FileText',
        title: '전자결재 작성',
        subtitle: '전자결재',
        link: '/approval/new',
      },
      {
        type: 'action',
        icon: 'ClipboardList',
        title: '결재 현황 확인',
        subtitle: '전자결재',
        link: '/approval',
      },
      {
        type: 'action',
        icon: 'MessageCircle',
        title: '총무팀 문의',
        subtitle: '총무팀',
        link: '/chat/general',
      },
      {
        type: 'info',
        icon: 'BookOpen',
        title: '전자결재 매뉴얼',
        tag: '매뉴얼',
        tagColor: '#43A047',
        summaryItems: [
          '10만원 이하: 팀장 승인',
          '10~100만원: 부서장 승인',
          '100만원 이상: 임원 승인 필요',
          '품의서 제출 후 2영업일 내 처리',
        ],
        fullLink: '/docs/approval',
      },
      {
        type: 'status',
        icon: 'Clock',
        title: '대기 중인 결재',
        value: '2건 (내가 결재해야 할 문서)',
      },
    ],
  },

  report: {
    intent: 'report',
    cards: [
      {
        type: 'action',
        icon: 'FileText',
        title: '주간보고 작성',
        subtitle: '주간보고',
        link: '/report/new',
      },
      {
        type: 'action',
        icon: 'ClipboardList',
        title: '주간보고 현황',
        subtitle: '주간보고',
        link: '/report',
      },
      {
        type: 'info',
        icon: 'BookOpen',
        title: '주간보고 작성 가이드',
        tag: '가이드',
        tagColor: '#43A047',
        summaryItems: [
          '매주 금요일 17:00까지 제출',
          '주요 업무, 진행 현황, 차주 계획 포함',
          '팀장 승인 후 최종 제출',
          '미제출 시 자동 알림 발송',
        ],
        fullLink: '/docs/report',
      },
      {
        type: 'status',
        icon: 'AlertCircle',
        title: '이번 주 제출 현황',
        value: 'D-1 (금요일 17:00 마감)',
      },
    ],
  },

  certificate: {
    intent: 'certificate',
    cards: [
      {
        type: 'action',
        icon: 'FileText',
        title: '증명서 발급 신청',
        subtitle: '증명서출력',
        link: '/certificate/new',
      },
      {
        type: 'action',
        icon: 'MessageCircle',
        title: '인사팀 문의',
        subtitle: '인사팀',
        link: '/chat/hr',
      },
      {
        type: 'info',
        icon: 'BookOpen',
        title: '증명서 발급 안내',
        tag: '안내',
        tagColor: '#1E88E5',
        summaryItems: [
          '재직증명서, 경력증명서: 즉시 발급',
          '급여증명서: 1영업일 소요',
          '원천징수영수증: 2영업일 소요',
          '월 최대 5건까지 발급 가능',
        ],
        fullLink: '/docs/certificate',
      },
    ],
  },

  education: {
    intent: 'education',
    cards: [
      {
        type: 'action',
        icon: 'GraduationCap',
        title: '교육 신청',
        subtitle: '인사시스템',
        link: '/education/new',
      },
      {
        type: 'action',
        icon: 'CreditCard',
        title: '교육비 정산',
        subtitle: '경비 정산',
        link: '/expense/education',
      },
      {
        type: 'action',
        icon: 'MessageCircle',
        title: '인사팀 문의',
        subtitle: '인사팀',
        link: '/chat/hr',
      },
      {
        type: 'info',
        icon: 'BookOpen',
        title: '사내 교육 지원 규정',
        tag: '규정',
        tagColor: '#0A2463',
        summaryItems: [
          '연간 100만원 한도 내외부 교육 지원',
          '교육 신청은 2주 전 부서장 승인 필요',
          '교육 수료 후 보고서 1주일 내 제출',
          '동일 과정 재수강은 2년 경과 후 가능',
        ],
        fullLink: '/docs/education',
      },
    ],
  },

  purchase: {
    intent: 'purchase',
    cards: [
      {
        type: 'action',
        icon: 'FileText',
        title: '품의서 작성',
        subtitle: '전자결재',
        link: '/approval/new?type=purchase',
      },
      {
        type: 'action',
        icon: 'Briefcase',
        title: '자산 등록',
        subtitle: '총무시스템',
        link: '/asset/new',
      },
      {
        type: 'action',
        icon: 'MessageCircle',
        title: '구매팀 문의',
        subtitle: '구매팀',
        link: '/chat/purchase',
      },
      {
        type: 'info',
        icon: 'BookOpen',
        title: '비품 구매 절차',
        tag: '절차',
        tagColor: '#FB8C00',
        summaryItems: [
          '50만원 이하: 팀장 승인 후 구매',
          '50~200만원: 부서장 승인 + 견적 2건 첨부',
          '200만원 이상: 구매심의위원회 심의',
          '구매 후 자산 등록 필수',
        ],
        fullLink: '/docs/purchase',
      },
    ],
  },

  trip: {
    intent: 'trip',
    cards: [
      {
        type: 'action',
        icon: 'FileText',
        title: '출장 신청서 작성',
        subtitle: '전자결재',
        link: '/approval/new?type=trip',
      },
      {
        type: 'action',
        icon: 'CreditCard',
        title: '교통비 정산 신청',
        subtitle: '경비 정산',
        link: '/expense/trip',
      },
      {
        type: 'action',
        icon: 'MessageCircle',
        title: '담당 부서 문의',
        subtitle: '총무팀',
        link: '/chat/general',
      },
      {
        type: 'info',
        icon: 'BookOpen',
        title: '출장 관련 규정',
        tag: '규정',
        tagColor: '#0A2463',
        summaryItems: [
          '교통비는 실비 기준으로 지급',
          '항공료는 이코노미 기준',
          '숙박비는 1일 상한 20만원',
          '렌터카는 사전 승인 필요',
        ],
        fullLink: '/docs/trip',
      },
    ],
  },
};

// ─── Public API ───────────────────────────────────────────────────────────────

export function getAssistantResponse(message: string): AssistantResponse | null {
  const intent = classifyIntent(message);
  if (!intent) return null;
  return ASSISTANT_DATA[intent] ?? null;
}

/**
 * React Query 훅 — 현재는 더미 데이터 동기 반환.
 * 추후 FastAPI SSE 응답과 연결 예정.
 */
export function useAssistantContext(message: string | null) {
  return useQuery<AssistantResponse | null>({
    queryKey: ['assistant', message],
    queryFn: () => Promise.resolve(message ? getAssistantResponse(message) : null),
    enabled: !!message,
    staleTime: Infinity,
  });
}
