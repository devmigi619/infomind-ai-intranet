import type {
  BoardPost,
  ApprovalItem,
  CalendarEvent,
  ChatMessage,
  WidgetData,
  PanelType,
  WeeklyReport,
  CertificateType,
  Vehicle,
  VehicleReservation,
  MeetingRoom,
  RoomReservation,
} from '@/types';

/* ===== 게시판 ===== */
export const demoBoardPosts: BoardPost[] = [
  {
    id: 'b1',
    category: '공지사항',
    title: '사내 보안 정책 변경 안내 (6/1부터 적용)',
    author: '인사팀',
    date: '2시간 전',
    views: 234,
    comments: 12,
    content: '보안 정책이 변경됩니다. 모든 직원은 6월 1일부터 새로운 보안 정책을 준수해야 합니다.',
  },
  {
    id: 'b2',
    category: '공지사항',
    title: '2025년 상반기 인사평가 일정 안내',
    author: '인사팀',
    date: '1일 전',
    views: 567,
    comments: 8,
    content: '상반기 인사평가가 6월 15일부터 시작됩니다.',
  },
  {
    id: 'b3',
    category: '경조사',
    title: '개발팀 박성민 님 결혼 소식',
    author: '동료',
    date: '5시간 전',
    views: 567,
    comments: 45,
  },
  {
    id: 'b4',
    category: '자유게시판',
    title: '사내 동호회 모집합니다 (배드민턴, 보드게임)',
    author: '김나영',
    date: '1일 전',
    views: 189,
    comments: 23,
  },
  {
    id: 'b5',
    category: '기술블로그',
    title: 'Kubernetes 클러스터 자동 스케일링 도입기',
    author: 'DevOps팀',
    date: '2일 전',
    views: 1203,
    comments: 8,
  },
  {
    id: 'b6',
    category: '자유게시판',
    title: '사내 헬스장 이용 후기 및 팁 공유',
    author: '이동욱',
    date: '3일 전',
    views: 345,
    comments: 31,
  },
];

/* ===== 전자결재 ===== */
export const demoApprovals: ApprovalItem[] = [
  {
    id: 'a1',
    type: '품의서',
    title: '노트북 구매 품의 (MacBook Pro 16")',
    requester: '김태영',
    date: '6/8',
    status: 'pending',
  },
  {
    id: 'a2',
    type: '휴가신청',
    title: '연차 휴가 신청 (6/15-16, 2일)',
    requester: '박소연',
    date: '6/7',
    status: 'pending',
  },
  {
    id: 'a3',
    type: '출장신청',
    title: '고객사 방문 출장 신청 (6/20-21)',
    requester: '최민재',
    date: '6/5',
    status: 'progress',
  },
  {
    id: 'a4',
    type: '교육신청',
    title: 'AWS Summit 참가 신청',
    requester: '정수민',
    date: '6/4',
    status: 'completed',
  },
  {
    id: 'a5',
    type: '품의서',
    title: '모니터 추가 구매 품의',
    requester: '한지은',
    date: '6/3',
    status: 'completed',
  },
];

/* ===== 캘린더 ===== */
export const demoCalendarEvents: CalendarEvent[] = [
  { id: 'e1', time: '10:00', title: '주간 팀 스탠드업', location: '3층 회의실 B' },
  { id: 'e2', time: '14:00', title: 'Q2 리뷰 회의', location: '5층 대회의실' },
  { id: 'e3', time: '16:30', title: '신입사원 멘토링', location: '온라인 (Zoom)' },
  { id: 'e4', time: '09:30', title: '고객사 미팅', location: '2층 접견실' },
  { id: 'e5', time: '11:00', title: '인터뷰 (백엔드 개발자)', location: '3층 면접실' },
];

/* ===== 주간보고 ===== */
export const demoWeeklyReports: WeeklyReport[] = [
  {
    id: 'wr1',
    author: '김태영',
    department: '개발팀',
    week: '6월 2주차',
    summary: 'API 서버 성능 개선, 신규 결제 모듈 개발 착수',
    status: 'submitted',
    submittedAt: '6/8',
  },
  {
    id: 'wr2',
    author: '박지영',
    department: '디자인팀',
    week: '6월 2주차',
    summary: '모바일 앱 UI 리뉴얼 와이어프레임 완료',
    status: 'submitted',
    submittedAt: '6/8',
  },
  {
    id: 'wr3',
    author: '이재현',
    department: '마케팅팀',
    week: '6월 2주차',
    summary: '6월 캠페인 런칭, SNS 콘텐츠 5건 제작',
    status: 'submitted',
    submittedAt: '6/7',
  },
  {
    id: 'wr4',
    author: '최동훈',
    department: '영업팀',
    week: '6월 2주차',
    summary: '신규 거래처 미팅 3건, 제안서 2건 발송',
    status: 'submitted',
    submittedAt: '6/7',
  },
  {
    id: 'wr5',
    author: '정수민',
    department: '개발팀',
    week: '6월 2주차',
    summary: 'DB 마이그레이션 준비, 코드 리뷰',
    status: 'draft',
  },
];

/* ===== 증명서 ===== */
export const demoCertificateTypes: CertificateType[] = [
  { id: 'ct1', name: '재직증명서', description: '현재 재직 중임을 증명하는 서류', processingTime: '즉시 발급' },
  { id: 'ct2', name: '경력증명서', description: '입사일부터 현재까지의 경력을 증명하는 서류', processingTime: '즉시 발급' },
  { id: 'ct3', name: '급여증명서', description: '최근 3개월 급여 내역 증명 서류', processingTime: '1영업일' },
  { id: 'ct4', name: '원천징수영수증', description: '연말정산용 원천징수 영수증', processingTime: '2영업일' },
];

/* ===== 차량 ===== */
export const demoVehicles: Vehicle[] = [
  { id: 'v1', name: '카니발', plateNumber: '12가 3456', status: 'available' },
  { id: 'v2', name: '스타렉스', plateNumber: '34나 5678', status: 'reserved' },
  { id: 'v3', name: 'K5', plateNumber: '56다 7890', status: 'available' },
  { id: 'v4', name: '소나타', plateNumber: '78라 9012', status: 'maintenance' },
  { id: 'v5', name: '카니발', plateNumber: '90마 1234', status: 'available' },
];

export const demoVehicleReservations: VehicleReservation[] = [
  { id: 'vr1', vehicleId: 'v2', vehicleName: '스타렉스', date: '2025-06-10', timeRange: '09:00-18:00', purpose: '고객사 방문', reserver: '최동훈' },
  { id: 'vr2', vehicleId: 'v1', vehicleName: '카니발', date: '2025-06-11', timeRange: '10:00-15:00', purpose: '워크샵 이동', reserver: '인사팀' },
];

/* ===== 회의실 ===== */
export const demoMeetingRooms: MeetingRoom[] = [
  { id: 'r1', name: '대회의실 (5F)', capacity: 20, facilities: ['프로젝터', '화이트보드', '영상회의'] },
  { id: 'r2', name: '중회의실 A (3F)', capacity: 10, facilities: ['프로젝터', '화이트보드'] },
  { id: 'r3', name: '중회의실 B (3F)', capacity: 10, facilities: ['프로젝터', 'TV'] },
  { id: 'r4', name: '소회의실 1 (2F)', capacity: 6, facilities: ['TV', '화이트보드'] },
  { id: 'r5', name: '소회의실 2 (2F)', capacity: 4, facilities: ['TV'] },
  { id: 'r6', name: '대회의실 (B1)', capacity: 30, facilities: ['프로젝터', '화이트보드', '영상회의', '마이크'] },
];

export const demoRoomReservations: RoomReservation[] = [
  { id: 'rr1', roomId: 'r1', roomName: '대회의실 (5F)', date: '2025-06-10', timeRange: '14:00-16:00', title: 'Q2 리뷰 회의', booker: '김태영' },
  { id: 'rr2', roomId: 'r2', roomName: '중회의실 A (3F)', date: '2025-06-10', timeRange: '10:00-11:00', title: '주간 스탠드업', booker: '박지영' },
  { id: 'rr3', roomId: 'r3', roomName: '중회의실 B (3F)', date: '2025-06-11', timeRange: '15:00-17:00', title: '디자인 리뷰', booker: '이재현' },
];

/* ===== 초기 채팅 ===== */
export const initialMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'ai',
    text: '안녕하세요, 김민수 님. 인포마인드 AI 비서입니다. 무엇을 도와드릴까요?',
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: 'msg-2',
    sender: 'user',
    text: '이번 주 주간보고 현황 알려줘',
    timestamp: new Date(Date.now() - 1000 * 60 * 4),
  },
  {
    id: 'msg-3',
    sender: 'ai',
    text: '6월 2주차 주간보고 제출 현황입니다.\n\n• 개발팀 김태영: 제출 완료 (6/8)\n• 디자인팀 박지영: 제출 완료 (6/8)\n• 마케팅팀 이재현: 제출 완료 (6/7)\n• 영업팀 최동훈: 제출 완료 (6/7)\n• 개발팀 정수민: 작성 중 (임시저장)\n\n총 4/5 팀원 제출 완료, 1명 작성 중입니다.',
    timestamp: new Date(Date.now() - 1000 * 60 * 3),
    widget: {
      type: 'weeklyReport',
      title: '주간보고 현황',
      items: [
        { label: '김태영 (개발팀)', value: '제출 완료' },
        { label: '박지영 (디자인팀)', value: '제출 완료' },
        { label: '이재현 (마케팅팀)', value: '제출 완료' },
        { label: '최동훈 (영업팀)', value: '제출 완료' },
        { label: '정수민 (개발팀)', value: '작성 중' },
      ],
    } as WidgetData,
    quickActions: [
      { label: '주간보고 보기', action: 'open-weeklyReport' },
      { label: '내 주간보고 작성', action: 'write-report' },
    ],
  },
];

/* ===== 제안 질문 ===== */
export const suggestedQueries = [
  { label: '\uD83D\uDCCB 주간보고 현황', panel: 'weeklyReport' as PanelType, query: '주간보고 현황 알려줘' },
  { label: '\uD83D\uDCC5 이번 주 일정', panel: 'calendar' as PanelType, query: '이번 주 일정 보여줘' },
  { label: '\uD83D\uDCBC 결재할 문서', panel: 'approval' as PanelType, query: '결재할 문서 뭐 있어' },
  { label: '\uD83D\uDDD3\uFE0F 회의실 예약', panel: 'meetingRoom' as PanelType, query: '회의실 예약 현황' },
];

/* ===== 대화결과 컨텍스트 데이터 ===== */
export interface ConversationContextData {
  docTitle: string;
  docTag: string;
  docTagColor: string;
  summary: string[];
  relatedTasks: { icon: string; title: string; subtitle: string }[];
}

export function getConversationContext(query: string): ConversationContextData | null {
  const lower = query.toLowerCase();
  if (lower.includes('출장')) {
    return {
      docTitle: '제주 출장 관련 규정',
      docTag: '규정',
      docTagColor: '#0A2463',
      summary: [
        '교통비는 실비 기준으로 지급',
        '항공료는 이코노미 기준',
        '숙박비는 1일 상한 20만원',
        '렌터카는 사전 승인 필요',
      ],
      relatedTasks: [
        { icon: 'FileText', title: '출장 신청서 작성', subtitle: '전자결재' },
        { icon: 'CreditCard', title: '교통비 정산 신청', subtitle: '경비 정산' },
        { icon: 'MessageCircle', title: '담당 부서 문의', subtitle: '총무팀' },
      ],
    };
  }
  if (lower.includes('휴가') || lower.includes('연차')) {
    return {
      docTitle: '휴가 사용 규정',
      docTag: '규정',
      docTagColor: '#0A2463',
      summary: [
        '입사 1년 미만: 월 1일 발생',
        '입사 1년 이상: 연 15일 기본',
        '3년 이상 재직 시 1일 추가',
        '최대 2년간 미사용 휴가 연차 이월 가능',
      ],
      relatedTasks: [
        { icon: 'FileText', title: '휴가 신청', subtitle: '전자결재' },
        { icon: 'Briefcase', title: '휴가 잔여일 확인', subtitle: '인사시스템' },
        { icon: 'MessageCircle', title: '인사팀 문의', subtitle: '인사팀' },
      ],
    };
  }
  if (lower.includes('결재') || lower.includes('품의')) {
    return {
      docTitle: '전자결재 매뉴얼',
      docTag: '매뉴얼',
      docTagColor: '#43A047',
      summary: [
        '10만원 이하: 팀장 승인',
        '10~100만원: 부서장 승인',
        '100만원 이상: 임원 승인 필요',
        '품의서 제출 후 2영업일 내 처리',
      ],
      relatedTasks: [
        { icon: 'FileText', title: '전자결재 작성', subtitle: '전자결재' },
        { icon: 'FileText', title: '결재 현황 확인', subtitle: '전자결재' },
        { icon: 'MessageCircle', title: '총무팀 문의', subtitle: '총무팀' },
      ],
    };
  }
  if (lower.includes('교육')) {
    return {
      docTitle: '사내 교육 지원 규정',
      docTag: '규정',
      docTagColor: '#0A2463',
      summary: [
        '연간 100만원 한도 내외부 교육 지원',
        '교육 신청은 2주 전 부서장 승인 필요',
        '교육 수료 후 보고서 1주일 내 제출',
        '동일 과정 재수강은 2년 경과 후 가능',
      ],
      relatedTasks: [
        { icon: 'FileText', title: '교육 신청', subtitle: '인사시스템' },
        { icon: 'CreditCard', title: '교육비 정산', subtitle: '경비 정산' },
        { icon: 'MessageCircle', title: '인사팀 문의', subtitle: '인사팀' },
      ],
    };
  }
  if (lower.includes('비품') || lower.includes('구매') || lower.includes('노트북')) {
    return {
      docTitle: '비품 구매 절차',
      docTag: '절차',
      docTagColor: '#FB8C00',
      summary: [
        '50만원 이하: 팀장 승인 후 구매',
        '50~200만원: 부서장 승인 + 견적 2건 첨부',
        '200만원 이상: 구매심의위원회审议',
        '구매 후 자산 등록 필수',
      ],
      relatedTasks: [
        { icon: 'FileText', title: '품의서 작성', subtitle: '전자결재' },
        { icon: 'Briefcase', title: '자산 등록', subtitle: '총무시스템' },
        { icon: 'MessageCircle', title: '구매팀 문의', subtitle: '구매팀' },
      ],
    };
  }
  if (lower.includes('차량') || lower.includes('차를')) {
    return {
      docTitle: '법인차량 이용 규정',
      docTag: '규정',
      docTagColor: '#0A2463',
      summary: [
        '예약은 사용일 기준 최소 1일 전 필수',
        '업무 목적 외 개인 사용 불가',
        '반납 시 연료 확인 및 날짜 변경 필수',
        '사고 발생 시 즉시 총무팀 보고 의무',
      ],
      relatedTasks: [
        { icon: 'Car', title: '차량 예약하기', subtitle: '차량예약관리' },
        { icon: 'MessageCircle', title: '총무팀 문의', subtitle: '총무팀' },
      ],
    };
  }
  if (lower.includes('회의실') || lower.includes('미팅룸')) {
    return {
      docTitle: '회의실 이용 안내',
      docTag: '안내',
      docTagColor: '#1E88E5',
      summary: [
        '최대 2시간 단위로 예약 가능',
        '30인실 이상 사용 시 사전 신청 필요',
        '사용 후 정리 정돈 필수',
        '예약 취소는 사용 1시간 전까지',
      ],
      relatedTasks: [
        { icon: 'CalendarDays', title: '회의실 예약하기', subtitle: '회의실예약' },
        { icon: 'MessageCircle', title: '시설팀 문의', subtitle: '시설팀' },
      ],
    };
  }
  if (lower.includes('증명서') || lower.includes('재직')) {
    return {
      docTitle: '증명서 발급 안내',
      docTag: '안내',
      docTagColor: '#1E88E5',
      summary: [
        '재직증명서, 경력증명서: 즉시 발급',
        '급여증명서: 1영업일 소요',
        '원천징수영수증: 2영업일 소요',
        '월 최대 5건까지 발급 가능',
      ],
      relatedTasks: [
        { icon: 'FileText', title: '증명서 발급 신청', subtitle: '증명서출력' },
        { icon: 'MessageCircle', title: '인사팀 문의', subtitle: '인사팀' },
      ],
    };
  }
  if (lower.includes('주간보고') || lower.includes('주간 보고')) {
    return {
      docTitle: '주간보고 작성 가이드',
      docTag: '가이드',
      docTagColor: '#43A047',
      summary: [
        '매주 금요일 17:00까지 제출',
        '주요 업무, 진행 현황, 차주 계획 포함',
        '팀장 승인 후 최종 제출',
        '미제출 시 자동 알림 발송',
      ],
      relatedTasks: [
        { icon: 'FileText', title: '주간보고 작성', subtitle: '주간보고' },
        { icon: 'FileText', title: '주간보고 현황', subtitle: '주간보고' },
      ],
    };
  }
  return null;
}
