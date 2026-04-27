# Infomind 프로젝트 — 에이전트 지침

## 참조 문서

| 문서 | 참조 시점 |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 서비스 구조, 라우팅, 인증 흐름 파악 시 |
| [PLAN.md](docs/PLAN.md) | 현재 개발 단계 및 구현 대상 확인 시 |

## 프로젝트 배경 및 핵심 맥락

### 왜 만드는가
- 기존 DaouOffice(SaaS) 대체 — 개발회사 자체 구축으로 비용 절감 + 주체성 확보
- "AI 중심" 그룹웨어 — 기존 AI는 우측 하단 챗봇 모달 수준. 여기서는 AI가 UI의 중심축

### sample/ 폴더의 역할
- AI 중심 UX 개념을 검증하기 위해 만든 **화면 설계(와이어프레임)** 에 해당
- 쌩 React(Vite + Tailwind)로 만들어진 프로토타입 — 실제 구현 베이스가 아님
- 구현 시 이 폴더를 **UX/레이아웃 레퍼런스**로만 활용하고, 실제 코드는 frontend/에서 새로 작성

### 왜 WebView(PWA/Capacitor)가 아닌 Expo인가
- 전자결재 알림 등 푸시 알림이 핵심 기능 — WebView 계열은 백그라운드 알림 신뢰성 부족
- Expo(React Native)로 네이티브 앱 + 웹을 단일 코드베이스로 지원

## 프로젝트 운영 규칙

- 화이트보드(WHITEBOARD.md)를 사용하지 않는다.
- 기능 구현 완료 시 [PLAN.md](docs/PLAN.md)의 해당 체크리스트 항목을 `[x]`로 업데이트한다.

## 아키텍처 핵심 제약

- **FastAPI 인증**: JWT를 Spring Boot에 검증 요청하지 않는다. `JWT_SECRET`으로 자체 검증한다. (`ai/app/core/auth.py` 참조)
- **SSE 스트리밍**: FastAPI 채팅 엔드포인트는 반드시 `StreamingResponse`로 응답한다. 일반 Response 사용 금지.
- **서비스 간 호출**: Spring Boot ↔ FastAPI 직접 호출 없음. 클라이언트가 각각 호출한다.
- **DB 접근 범위**: Spring Boot → PostgreSQL만. FastAPI → Qdrant + Ollama만.

---

## 코드 컨벤션

### Git

**브랜치 네이밍**

```
feature/<설명>      기능 개발
fix/<설명>          버그 수정
refactor/<설명>     동작 변경 없는 리팩토링
docs/<설명>         문서
chore/<설명>        빌드, 의존성, 설정
```

**커밋 메시지**

```
<type>: <제목>
```

타입: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`

- 제목은 72자 이하, 마침표 없음
- 이슈 번호 참조 시: `feat: 전자결재 상신 API (#12)`

**PR 규칙**

- `main`에 직접 푸시 금지 — PR을 통해서만 머지
- 머지 전 최소 1명 리뷰 승인 필요

### API 설계

**URL 구조**

```
/api/{리소스}              컬렉션
/api/{리소스}/{id}         단일 리소스
/api/{리소스}/{id}/{액션}  하위 액션
```

예시:
```
POST   /api/auth/login
GET    /api/approvals
POST   /api/approvals
POST   /api/approvals/{id}/approve
POST   /api/approvals/{id}/reject
```

AI 서비스는 `/ai/` 접두사 사용: `POST /ai/chat`

**응답 형식 (Spring Boot)**

성공:
```json
{ "data": { ... } }
```

실패:
```json
{ "code": "APPROVAL_NOT_FOUND", "message": "해당 결재 건을 찾을 수 없습니다." }
```

### Backend (Spring Boot)

**패키지 구조**

```
com.infomind
├── domain
│   └── {도메인}          # approval, post, user, report ...
│       ├── controller
│       ├── service
│       ├── repository
│       ├── entity
│       └── dto
└── global
    ├── auth              # JWT 필터, SecurityConfig
    ├── exception         # GlobalExceptionHandler
    └── config
```

**네이밍**

| 대상 | 규칙 | 예시 |
|---|---|---|
| 클래스 | PascalCase | `ApprovalService` |
| 메서드/변수 | camelCase | `submitApproval` |
| 상수 | UPPER_SNAKE | `MAX_RETRY_COUNT` |
| DB 컬럼 | snake_case | `created_at` |
| DTO | Request / Response 접미사 | `ApprovalSubmitRequest` |

### AI Backend (FastAPI)

**모듈 구조**

```
ai/app/
├── api/        # 라우트 핸들러
├── services/   # Ollama / Qdrant 호출
├── core/       # 설정, 인증, 의존성
└── models/     # Pydantic 스키마
```

**SSE 응답 형식**

```
data: {"token": "..."}\n\n
data: [DONE]\n\n
```

### Frontend (Expo)

**디렉토리 구조**

```
frontend/app/
├── (tabs)/       # 탭 네비게이션 화면
├── components/   # 공통 UI 컴포넌트
├── hooks/        # 커스텀 훅
├── services/     # API 클라이언트
├── store/        # 상태 관리
└── types/        # TypeScript 타입
```

**네이밍**

| 대상 | 규칙 |
|---|---|
| 컴포넌트 파일 | `PascalCase.tsx` |
| 그 외 파일 | `camelCase.ts` |
| 훅 | `use` 접두사 — `useApprovals` |

### 환경변수

- `.env.*` 파일은 커밋 금지 (`.gitignore` 등록됨)
- 모든 변수는 `.env.example`에 주석과 함께 선언
- 민감 값(비밀번호, 시크릿)은 `.env.example`에 기본값 없음
