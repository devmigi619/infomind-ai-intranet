import { useState, useCallback } from 'react';
import type { ChatMessage, PanelType, WidgetData, QuickAction } from '@/types';
import { initialMessages } from '@/data/demo-data';

function generateId() {
  return `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getAIResponse(userText: string): { text: string; widget?: WidgetData; quickActions?: QuickAction[] } {
  const lower = userText.toLowerCase();

  if (lower.includes('결재') || lower.includes('승인') || lower.includes('품의')) {
    return {
      text: '현재 대기중인 결재 문서가 2건 있습니다.\n\n1. 노트북 구매 품의 (MacBook Pro 16") - 김태영\n2. 연차 휴가 신청 (6/15-16, 2일) - 박소연\n\n상세 내용을 확인하시려면 아래에서 선택해주세요.',
      widget: {
        type: 'approval' as PanelType,
        title: '전자결재',
        items: [
          { label: '노트북 구매 품의', value: '김태영' },
          { label: '연차 휴가 신청', value: '박소연' },
        ],
      },
      quickActions: [
        { label: '승인하러 가기', action: 'open-approval' },
        { label: '나중에 보기', action: 'dismiss' },
      ],
    };
  }

  if (lower.includes('일정') || lower.includes('회의') || lower.includes('미팅')) {
    return {
      text: '오늘 3개의 일정이 예정되어 있습니다:\n\n• 10:00 주간 팀 스탠드업 (3층 회의실 B)\n• 14:00 Q2 리뷰 회의 (5층 대회의실)\n• 16:30 신입사원 멘토링 (Zoom)',
      widget: {
        type: 'calendar' as PanelType,
        title: '일정관리',
        items: [
          { label: '주간 팀 스탠드업', value: '10:00' },
          { label: 'Q2 리뷰 회의', value: '14:00' },
          { label: '신입사원 멘토링', value: '16:30' },
        ],
      },
      quickActions: [
        { label: '일정 상세보기', action: 'open-calendar' },
        { label: '회의실 예약', action: 'open-meetingRoom' },
      ],
    };
  }

  if (lower.includes('공지') || lower.includes('게시판') || lower.includes('소식')) {
    return {
      text: '최근 게시판 소식을 정리해드립니다.\n\n• [공지] 사내 보안 정책 변경 안내 (6/1부터 적용)\n• [경조사] 개발팀 박성민 님 결혼 소식\n• [자유] 사내 동호회 모집합니다',
      widget: {
        type: 'board' as PanelType,
        title: '게시판',
        items: [
          { label: '사내 보안 정책 변경 안내', value: '공지사항' },
          { label: '박성민 님 결혼 소식', value: '경조사' },
          { label: '사내 동호회 모집', value: '자유게시판' },
        ],
      },
      quickActions: [
        { label: '게시판 가기', action: 'open-board' },
        { label: '글쓰기', action: 'write-post' },
      ],
    };
  }

  if (lower.includes('주간보고') || lower.includes('주간 보고')) {
    return {
      text: '6월 2주차 주간보고 현황입니다.\n\n• 개발팀 김태영: 제출 완료\n• 디자인팀 박지영: 제출 완료\n• 마케팅팀 이재현: 제출 완료\n• 영업팀 최동훈: 제출 완료\n• 개발팀 정수민: 작성 중\n\n총 4/5 팀원 제출 완료입니다.',
      widget: {
        type: 'weeklyReport' as PanelType,
        title: '주간보고 현황',
        items: [
          { label: '김태영 (개발팀)', value: '제출 완료' },
          { label: '박지영 (디자인팀)', value: '제출 완료' },
          { label: '이재현 (마케팅팀)', value: '제출 완료' },
          { label: '최동훈 (영업팀)', value: '제출 완료' },
          { label: '정수민 (개발팀)', value: '작성 중' },
        ],
      },
      quickActions: [
        { label: '주간보고 보기', action: 'open-weeklyReport' },
        { label: '내 보고 작성', action: 'write-report' },
      ],
    };
  }

  if (lower.includes('증명서')) {
    return {
      text: '발급 가능한 증명서 목록입니다:\n\n• 재직증명서 - 즉시 발급\n• 경력증명서 - 즉시 발급\n• 급여증명서 - 1영업일\n• 원천징수영수증 - 2영업일',
      widget: {
        type: 'certificate' as PanelType,
        title: '증명서 발급',
        items: [
          { label: '재직증명서', value: '즉시' },
          { label: '경력증명서', value: '즉시' },
          { label: '급여증명서', value: '1영업일' },
          { label: '원천징수영수증', value: '2영업일' },
        ],
      },
      quickActions: [
        { label: '증명서 신청', action: 'open-certificate' },
      ],
    };
  }

  if (lower.includes('차량') || lower.includes('차를')) {
    return {
      text: '현재 차량 예약 현황입니다.\n\n• 카니발 (12가 3456): 사용 가능\n• 스타렉스 (34나 5678): 예약됨\n• K5 (56다 7890): 사용 가능\n• 소나타 (78라 9012): 정비 중',
      widget: {
        type: 'vehicle' as PanelType,
        title: '차량 현황',
        items: [
          { label: '카니발', value: '사용 가능' },
          { label: '스타렉스', value: '예약됨' },
          { label: 'K5', value: '사용 가능' },
        ],
      },
      quickActions: [
        { label: '차량 예약', action: 'open-vehicle' },
      ],
    };
  }

  if (lower.includes('회의실') || lower.includes('미팅룸')) {
    return {
      text: '오늘의 회의실 예약 현황입니다.\n\n• 대회의실(5F): 14:00-16:00 Q2 리뷰\n• 중회의실A(3F): 10:00-11:00 스탠드업\n• 중회의실B(3F): 15:00-17:00 디자인 리뷰',
      widget: {
        type: 'meetingRoom' as PanelType,
        title: '회의실 예약',
        items: [
          { label: '대회의실(5F)', value: '14:00 예약' },
          { label: '중회의실A(3F)', value: '10:00 예약' },
          { label: '중회의실B(3F)', value: '15:00 예약' },
        ],
      },
      quickActions: [
        { label: '회의실 예약', action: 'open-meetingRoom' },
      ],
    };
  }

  return {
    text: `"${userText}"에 대해 확인해드리겠습니다.\n\n좀 더 구체적으로 알려주시면 정확한 정보를 찾아드릴 수 있습니다. 예를 들어:\n• "이번 주 주간보고 현황"\n• "결재할 문서 뭐 있어"\n• "회의실 예약 현황"\n• "증명서 발급 방법"\n\n와 같이 물어보시면 해당 업무 정보를 바로 보여드립니다.`,
  };
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = useCallback((text: string) => {
    if (!text.trim()) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      sender: 'user',
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      const response = getAIResponse(text);
      const aiMsg: ChatMessage = {
        id: generateId(),
        sender: 'ai',
        text: response.text,
        timestamp: new Date(),
        widget: response.widget,
        quickActions: response.quickActions,
      };
      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 600);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    inputValue,
    setInputValue,
    sendMessage,
    clearChat,
    isTyping,
  };
}
