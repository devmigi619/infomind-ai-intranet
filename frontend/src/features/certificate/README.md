# 증명서 모듈 (Phase 3)

## 개요

재직증명서 / 경력증명서 발급 신청 및 출력.

- 결재 모듈과 연계: 발급 신청 → 관리자 승인 → 출력 가능

## 디렉토리 (예정)

```
features/certificate/
├── README.md
├── api.ts                          # 증명서 API + 훅 (Phase 3에서 구현)
├── screens/
│   └── CertificateScreen.tsx       # 풀뷰 (신청 목록 + 신청 폼 + 출력)
└── panels/
    └── CertificatePanel.tsx        # LP 퀵뷰 (최근 발급 이력)
```

## 인터페이스 (예정)

### LP 퀵뷰 — `CertificatePanel`

```typescript
interface CertificatePanelProps {
  onOpenFullScreen: () => void;
  onClose: () => void;
}
```

표시 내용 (가이드):

- 최근 발급 이력
- "증명서 신청" 버튼

## 데이터 타입 (예정)

```typescript
type CertificateType = 'EMPLOYMENT' | 'CAREER';
type CertificateStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface CertificateRequest {
  id: number;
  type: CertificateType;
  status: CertificateStatus;
  purpose: string;
  requestedAt: string;
  approvedAt?: string;
  downloadUrl?: string; // 승인 후 출력 URL
}
```

## API (예정)

- `GET /api/certificates` → 내 신청 이력
- `POST /api/certificates` → 발급 신청
- `GET /api/certificates/{id}/download` → PDF 다운로드 (승인 후)

## 결재 연계

발급 신청 시 내부적으로 `approval` 모듈의 결재 흐름을 탄다.
또는 증명서 전용 간단 승인 흐름으로 독립 구현 — Phase 3에서 결정.

## 현재 상태

- [ ] Phase 3에서 구현 예정
- 현재는 `placeholder/screens/PlaceholderScreen.tsx`로 대체
