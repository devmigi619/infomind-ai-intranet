# 아키텍처

## 서비스 구조 (로컬 개발)

```
[브라우저 :8081 (Expo Web)]
        │
        ├── /api/* ───► [Spring Boot :8080]
        │                  │
        │                  └── JWT 발급, 업무 API
        │                       └── PostgreSQL (로컬 설치 또는 원격)
        │
        └── /ai/*  ───► [FastAPI :8000]  ← 선택 (Ollama 설치 시만)
                          │
                          └── JWT 자체검증 (Spring과 시크릿 공유)
                              SSE 스트리밍
                              └── [Ollama :11434]
```

각 서비스는 호스트 OS에서 직접 실행하며, 포트가 그대로 노출된다 (Nginx 없음).

## 서비스 구조 (운영기)

```
[인터넷]
    │
    ▼
[Nginx :443 / :80]  ← SSL 종단, 리버스 프록시
    │
    ├── /api/*  ──► [Spring Boot :8080]
    │                   │
    │                   └── JWT 발급, 업무 API
    │                        └── PostgreSQL :5432
    │
    ├── /ai/*   ──► [FastAPI :8000]
    │                   │
    │                   └── JWT 자체검증 (공유 시크릿)
    │                       SSE 스트리밍
    │                       └── [Ollama :11434]  ← GPU 서버 내부
    │
    └── /*      ──► [Expo Web 정적 파일 (빌드 결과물)]
```

Nginx 역할:
- 단일 도메인(`https://infomind.example.com`)에서 모든 서비스 라우팅
- SSL 종단 처리 (Let's Encrypt)
- `/ai/chat` SSE 엔드포인트: `proxy_buffering off`, `X-Accel-Buffering: no` 필수
- 정적 파일(`/`): `npx expo export --platform web` 결과물 서빙

## 서비스 역할

| 서비스 | 역할 | 로컬 포트 |
|---|---|---|
| Frontend (Expo Web) | UI | 8081 |
| Spring Boot | 업무 API, JWT 발급, FCM | 8080 |
| FastAPI | AI 채팅, RAG, Ollama 연동 (선택) | 8000 |
| PostgreSQL | 로컬 DB — 직접 설치 또는 원격 접속 | 5432 |
| Ollama | 로컬 LLM (선택, 직접 설치) | 11434 |

> Qdrant / Nginx / Docker Compose 통합은 **GPU 개발기 / 운영기에서 사용**. 추후 정비 예정.

## 라우팅

로컬에서는 클라이언트가 각 서비스를 **직접** 호출한다.

| 경로 | 목적지 |
|---|---|
| `http://localhost:8080/api/*` | Spring Boot |
| `http://localhost:8000/ai/*` | FastAPI |
| `http://localhost:8081/` | Expo Web |

> 운영기에서는 Nginx 리버스 프록시를 통해 단일 도메인에서 라우팅. (추후 정비)

## 인증 흐름

1. `POST /api/auth/login` → Spring Boot가 JWT 발급 (HS256, 공유 시크릿)
2. 업무 API → Spring Boot에서 JWT 검증
3. AI 채팅 → FastAPI가 동일 시크릿으로 JWT 자체 검증 → SSE 직접 스트리밍

**JWT 위임 패턴 채택 근거**: Spring Boot를 통한 SSE 중계는 응답 버퍼링으로 불가. FastAPI 자체 인증은 사용자 정보 이중 관리 문제. 공유 시크릿 방식으로 두 문제를 모두 해결.

**트레이드오프**: `JWT_SECRET`을 두 서비스에 환경변수로 주입해야 하며, Redis 토큰 블랙리스트 없이는 즉시 로그아웃 무효화 불가 (내부 시스템 + 8시간 만료로 감수).

## 보안 (Spring Security)

### 인가 규칙 (`SecurityConfig`)

| URL 패턴 | 조건 |
|---|---|
| `POST /api/auth/login` | 인증 없이 허용 |
| `/api/auth/refresh` | 인증 없이 허용 |
| `/api/auth/logout` | 인증 없이 허용 |
| `/actuator/health` | 인증 없이 허용 |
| `/api/admin/**` | 유효 토큰 + `ROLE_ADMIN` 필요 |
| `/api/codes/**` | 유효 토큰 필요 (ADMIN 불필요 — 폼 콤보박스용) |
| `/api/menus` | 유효 토큰 필요 (ADMIN 불필요 — NavRail 메뉴 목록) |
| 그 외 모든 요청 | 유효 토큰 필요 |

### 인증 실패 처리

- `AuthenticationEntryPoint` 커스텀 등록 — 인증 없는 요청에 **HTTP 401** + JSON 응답 반환
- 기본값(403)이 아닌 401을 명시해 클라이언트 인터셉터의 토큰 재발급 흐름이 정상 동작하도록 보장

```json
{ "code": "UNAUTHORIZED", "message": "인증이 필요합니다." }
```

### 클라이언트 토큰 관리 (`frontend/src/shared/api/client.ts`)

- **Request 인터셉터**: 모든 요청에 `Authorization: Bearer {token}` 자동 삽입
- **Response 인터셉터**: 401 수신 시 리프레시 토큰으로 자동 재발급 후 원래 요청 재시도
- 동시 다발 401 처리: `failedQueue`로 재발급 중 도착한 요청을 큐잉했다가 일괄 재시도
- 플랫폼별 저장소: iOS/Android → `SecureStore` (리프레시), 웹 → `AsyncStorage`

### 공통 토스트 메시지 시스템

서버 응답 구조(`ApiResponse<T>`)에 맞춰 HTTP 에러를 자동으로 토스트로 표시한다.

**서버 응답 구조**

```json
// 성공
{ "success": true, "data": { ... }, "message": null }

// 실패 (400 / 500)
{ "success": false, "data": null, "message": "에러 메시지" }

// 인증 실패 (401)
{ "code": "UNAUTHORIZED", "message": "인증이 필요합니다." }
```

**인터셉터 자동 처리 규칙**

| 상황 | 토스트 |
|---|---|
| 401 → 재발급 성공 | 없음 (조용히 재시도) |
| 401 → 재발급 실패 | 🔴 "세션이 만료되었습니다. 다시 로그인해 주세요." |
| 403 | 🔴 서버 `message` 또는 "접근 권한이 없습니다." |
| 400 | 🔴 서버 `message` 또는 "요청이 올바르지 않습니다." |
| 5xx | 🔴 서버 `message` 또는 "서버 오류가 발생했습니다." |
| 네트워크 에러 (응답 없음) | 🟡 "네트워크 연결을 확인해 주세요." |

에러가 인터셉터에서 처리되면 `error._handled = true` 플래그가 설정된다.  
컴포넌트 catch 블록에서 중복 처리를 방지하려면 이 플래그를 확인한다.

```ts
} catch (err: any) {
  if ((err as any)?._handled) return; // 인터셉터에서 이미 토스트 표시
  toast.error(err?.message ?? '오류가 발생했습니다.');
}
```

**관련 파일**

| 파일 | 역할 |
|---|---|
| `store/toastStore.ts` | Zustand 토스트 store — `show(item)` / `hide(id)` / `clear()` |
| `shared/components/AppToast.tsx` | 토스트 UI — 화면 상단 overlay, fade+slide 애니메이션, 자동 dismiss |
| `shared/hooks/useToast.ts` | 컴포넌트용 편의 훅 |

**컴포넌트에서 성공 토스트 사용법**

```ts
const toast = useToast();
toast.success('저장되었습니다.');
toast.error('처리 중 오류가 발생했습니다.');
toast.warning('입력값을 확인해 주세요.');
toast.info('처리 중입니다.');

// 지속 시간(ms) 직접 지정
toast.success('완료되었습니다.', 5000);
```

> `AppToast`는 `App.tsx` 루트에 마운트(`zIndex: 200`). 성공 메시지는 컴포넌트에서 명시적으로 호출하고, 에러는 인터셉터가 자동 처리한다.

## 데이터베이스

### 로컬
- **PostgreSQL** — 직접 설치 또는 원격 서버 접속
- 접속 정보는 `backend/src/main/resources/application-local.yml` 에 직접 입력
- `ddl-auto: none` — 스키마는 직접 관리 (JPA 자동 DDL 미사용)
- ORM: **JPA + MyBatis 혼합** 사용
  - JPA: 엔티티 매핑, 기본 CRUD
  - MyBatis: 복잡한 쿼리, 커스텀 SQL (`resources/mapper/**/*.xml`)

### 운영기 (추후)
- PostgreSQL 16 (Docker Compose)
- 영구 볼륨 `postgres-data`

### 주요 테이블 목록

| 테이블 | 엔티티 | 설명 |
|---|---|---|
| `INT_USER` | `User` | 사용자 계정. PK = `USER_ID` (String) |
| `INT_RF_TK` | `RefreshToken` | 리프레시 토큰 저장. UUID PK |
| `INT_PST` | `Post` | 게시글 |
| `INT_PST_CMT` | `PostComment` | 게시글 댓글 (대댓글 2단계까지) |
| `INT_BRD` | `Board` | 게시판 |
| `INT_APV` | `Approval` | 전자결재 |
| `INT_WKL_RPT` | `WeeklyReport` | 주간보고 |
| `INT_COM_CODE` | `CommonCode` | 공통코드 (상위코드 + 하위코드) |
| `INT_JBGD` | `JobGrade` | 직급. PK = `JBGD_CD` |
| `INT_DEPT` | `Department` | 부서 (계층 구조, `UP_DEPT_CD` 자기 참조) |
| `INT_MENU` | `Menu` | 메뉴 목록. PK = `MENU_ID` (panelId와 동일) |
| `INT_COM_FILE_GRP` | `AttachmentGroup` | 첨부 그룹. PK = `AFILE_ID` (도메인별 접두어 `BRD_/APV_/RPT_` + 타임스탬프) |
| `INT_COM_FILE` | `Attachment` | 첨부 파일 메타. PK = `(AFILE_ID, AFILE_SN)` |
| `INT_COM_FILE_BLOB` | `AttachmentBlob` | 5MB 초과 파일의 BLOB 본체 (FK = INT_COM_FILE) |
| `INT_COM_FILE_EMB` | `AttachmentEmbedding` | 청크별 임베딩 + 태그. PK = `(AFILE_ID, AFILE_SN, EMB_ID)` |

> `crt_at`, `upd_at` 컬럼 타입: `TIMESTAMP` (PostgreSQL DATE는 시분초 미지원으로 변경됨)

## BaseEntity — Audit 필드

모든 JPA 엔티티는 `BaseEntity`를 상속한다. `@PrePersist/@PreUpdate`로 자동 설정되며 JPA `@EnableJpaAuditing`은 미사용.

| 필드 | 컬럼 | updatable | 설명 |
|---|---|---|---|
| `crtAt` | `CRT_AT` | false | 생성일시 |
| `crtBy` | `CRT_BY` | false | 생성자 (userId, 미인증 시 `"system"`) |
| `crtIp` | `CRT_IP` | false | 생성 IP |
| `updAt` | `UPD_AT` | true | 최종 수정일시 |
| `updBy` | `UPD_BY` | true | 최종 수정자 |
| `updIp` | `UPD_IP` | true | 최종 수정 IP |

**IP 추출 우선순위**: `X-Forwarded-For` 첫 번째 값 → `RemoteAddr` 순. IPv6 루프백(`::1`, `0:0:0:0:0:0:0:1`)은 `127.0.0.1`로 정규화.

> 비 HTTP 컨텍스트(배치 등)에서는 `"unknown"`.

## 로그 관리

### 구성 파일

| 파일 | 역할 |
|---|---|
| `resources/logback-spring.xml` | 콘솔 + 날짜별 파일 롤링 설정 |
| `global/LoggingFilter.java` | HTTP 요청/응답 로그 (`OncePerRequestFilter`) |
| `global/LoggingAspect.java` | Service 계층 실행 로그 (AOP `@Around`) |
| `global/GlobalExceptionHandler.java` | 전역 예외 처리 + 에러 로그 (`@RestControllerAdvice`) |

### 레이어별 방식

| 레이어 | 구현 방식 | 기록 내용 |
|---|---|---|
| HTTP 요청/응답 | `OncePerRequestFilter` | 클라이언트 IP, 메서드, URI, 상태코드, 응답시간, userId |
| Service 실행 | AOP `@Around` | 클래스/메서드명, 실행시간, 예외 |
| 예외 처리 | `@RestControllerAdvice` | `@Valid` 실패→400 WARN, 비즈니스→400 WARN, 그 외→500 ERROR |

### 로그 파일 (운영 환경)

| 파일 | 내용 | 보관 |
|---|---|---|
| `logs/app.log` | 전체 로그 (날짜별 롤링, 50MB 분할) | 30일 / 500MB |
| `logs/error.log` | ERROR 레벨만 | 60일 / 200MB |

### 프로파일별 레벨

| 프로파일 | `com.infomind` | SQL | 출력 |
|---|---|---|---|
| `local` | DEBUG | DEBUG | 콘솔만 |
| 그 외 (운영) | INFO | WARN | 콘솔 + 파일 |

## User 도메인

### 테이블 구조

| 테이블 | 설명 |
|---|---|
| `INT_USER` | 사용자 계정. PK = `USER_ID` (String, 로그인 ID) |
| `INT_RF_TK` | Refresh Token 저장. UUID PK(`TK_ID`) |

### 핵심 설계 결정

- **PK 타입**: `Long id` → `String userId` (로그인 ID 그대로 PK)
- **권한**: `Role` enum 제거 → `USER_SE` 컬럼(String)으로 대체 (`ADMIN`, `USER`)
- **계정 비활성화**: `USER_SE = 'INVALID'` — `use_yn` 컬럼 미사용
  - 비활성화 시 원래 권한 덮어씌워짐 → 재활성화 시 기본 `'USER'`로 복원
  - `UserService.login()`에서 `INVALID` 차단 로직 적용
- **FCM 토큰**: `INT_USER`에 미포함 — 별도 테이블 여부 추후 결정
- **Refresh Token**: stateless → DB 저장으로 전환
  - 로그인 시 UUID로 `INT_RF_TK` INSERT
  - refresh 시 `RVK_YN='N'` 조건으로 유효성 검증
  - logout 시 해당 토큰 `RVK_YN='Y'` 업데이트 (즉시 무효화)

### 로그인 응답 필드 매핑

백엔드 `UserInfoResponse`의 필드명이 프론트 `User` 인터페이스와 다르다.  
`authApi.login`에서 저장 전에 변환하며, **이 매핑을 빠뜨리면 `user.role`이 항상 `undefined`가 되어 관리자 토글이 표시되지 않는다.**

| 백엔드 (`UserInfoResponse`) | 프론트 (`User` interface) |
|---|---|
| `userNm` | `name` |
| `userSe` | `role` (`'ADMIN'` \| `'USER'`) |
| `deptCd` | `department` |
| `jbgdCd` | `position` |
| `userId` | `userId` (동일) |

### JWT 정책

| 항목 | 값 |
|---|---|
| 알고리즘 | HS256 |
| subject | `String userId` (로그인 ID) |
| 커스텀 claim | `userSe` (권한, 구 `role` claim 대체) |
| principal 타입 | `String` — 전 Service/Controller 공통 |
| 액세스 토큰 유효기간 | 8시간 (application.yml `jwt.expiry-hours`) |

## Vehicle 도메인

차량 예약 시스템. 차량 목록 관리 + 날짜/시각 기반 예약·반납·연장.

### 테이블 구조

| 테이블 | 엔티티 | 키 | 비고 |
|---|---|---|---|
| `INT_VEH` | `Vehicle` | `VEH_ID` (String) | 차량 마스터. `USE_YN='Y'`만 조회 |
| `INT_VEH_RSV` | `VehicleReservation` | `(VEH_ID, RSV_SN)` 복합키 | 차량별 시퀀스 |

JPA 매핑: `@IdClass(VehicleReservationId)`로 복합키 처리. `RSV_SN`은 `COALESCE(MAX, 0)+1` 쿼리로 차량별 채번.

### 주요 컬럼 (`INT_VEH_RSV`)

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `RSV_ST_YMD` / `RSV_ST_HHMM` | `VARCHAR(8/4)` | 예약 시작 일자/시각 (`YYYYMMDD` / `HHMM`) |
| `RSV_END_YMD` / `RSV_END_HHMM` | `VARCHAR(8/4)` | 예약 종료 일자/시각 (반납 시 실제 반납 시각으로 갱신) |
| `RTN_YN` | `VARCHAR(1)` DEFAULT `'N'` | 반납 여부 |
| `RTN_YMD` / `RTN_HHMM` / `RTN_PLC` | VARCHAR | 반납 일시·장소 |
| `EXT_YN` | `VARCHAR(1)` DEFAULT `'N'` | 연장 이력 여부 |
| `EXT_YMD` / `EXT_HHMM` | VARCHAR | 마지막 연장 종료 일시 |

### 비즈니스 규칙

- **예약 가능 기간**: 오늘 ~ 오늘+7일
- **충돌 검사**: 같은 차량의 시간 겹침 여부 — `NOT (종료 < 신규시작 OR 시작 > 신규종료)` JPQL 패턴
- **반납**: `rtnYn='Y'` 설정 + `rsvEndYmd/Hhmm`을 실제 반납 시각으로 갱신 → 반납 후 연장·취소 불가
- **연장**: 횟수 제한 없음. `rsvEndYmd/Hhmm` 직접 수정 + `extYn='Y'` 기록. 자기 자신 제외 충돌 검사(`findConflictsExcluding`)

### API

| 경로 | 설명 |
|---|---|
| `GET /api/vehicles` | 활성 차량 목록 (`useYn='Y'`) |
| `GET /api/vehicles/reservations?date=YYYYMMDD` | 해당 날짜에 걸친 전체 예약 (`mine` 플래그 포함) |
| `POST /api/vehicles/{vehId}/reservations` | 예약 신청 (충돌·기간 검증) |
| `DELETE /api/vehicles/{vehId}/reservations/{rsvSn}` | 예약 취소 (본인만) |
| `PATCH /api/vehicles/{vehId}/reservations/{rsvSn}/return` | 반납 처리 |
| `PATCH /api/vehicles/{vehId}/reservations/{rsvSn}/extend` | 예약 연장 |

### 프론트엔드 연동

| 파일 | 역할 |
|---|---|
| `features/vehicle/api.ts` | HTTP 함수 + React Query 훅 (`useVehicles`, `useVehicleReservations`, `useReturnVehicle`, `useExtendReservation` 등) |
| `features/vehicle/screens/VehicleScreen.tsx` | 전체현황(세로 타임라인) / 내 예약 / 예약신청 3모드 |
| `features/vehicle/components/VehicleQuickPanel.tsx` | LeftPanel 퀵뷰 — 오늘 전체 예약, 내 예약 강조 |

## Board 도메인

다중 게시판 시스템. `Board`(게시판) ─ `Post`(글) ─ `PostComment`(댓글) 3계층.

### 테이블 구조

| 테이블 | 엔티티 | 키 | 비고 |
|---|---|---|---|
| `INT_BRD` | `Board` | `BRD_ID` (String) | 게시판. 관리자가 직접 코드 입력 (예: `NOTICE`, `FREE`) |
| `INT_PST` | `Post` | `(BRD_ID, PST_SN)` 복합키 | 게시판별 시퀀스 |
| `INT_PST_CMT` | `PostComment` | `(BRD_ID, PST_SN, CMT_SN)` 복합키 | 댓글/대댓글 (2단계까지) |

JPA 매핑: `@IdClass(PostId)`, `@IdClass(PostCommentId)`로 복합키 처리.

### 핵심 설계 결정

- **`BRD_ID`**: 관리자 입력 코드 (의미 있는 영문 대문자) — `userId`/`deptCd` 등 다른 PK와 동일 컨벤션
- **`BRD_SE`**: 공통코드 (`_SE` 규칙 — `useCodeList('BRD_SE')`로 옵션 조회)
- **`DEPT_CD`**: 부서 한정 게시판일 때 부서 코드 (`null`이면 전체 공개)
- **공지 핀**: `INT_PST.NTC_YN = 'Y'` — 백엔드가 `ntcYn DESC, pstSn DESC`로 정렬 반환 → 클라이언트 별도 정렬 불필요
- **소프트 삭제**: `INT_BRD.USE_YN = 'N'` (게시판 비활성화), `INT_PST.DEL_YN = 'Y'` / `INT_PST_CMT.DEL_YN = 'Y'` (글·댓글)
- **권한**: 글·댓글 수정은 작성자만, 삭제는 작성자 또는 admin

### API 분리

| 경로 | 대상 | 용도 |
|---|---|---|
| `GET /api/boards` | 인증 사용자 | 활성 게시판 목록 (`useYn='Y'`만) |
| `GET /api/boards/{brdId}/posts` | 인증 사용자 | 게시판 글 목록 (공지 핀 정렬 적용) |
| `POST /api/boards/{brdId}/posts` | 인증 사용자 | 글 작성 |
| `DELETE /api/boards/{brdId}/posts/{pstSn}` | 작성자 또는 admin | 글 소프트 삭제 |
| `GET /api/admin/boards` | ADMIN | 게시판 관리용 (활성+비활성) |
| `POST /api/admin/boards` | ADMIN | 게시판 생성 |
| `DELETE /api/admin/boards/{brdId}` | ADMIN | 게시판 비활성화 |
| `PUT /api/admin/boards/{brdId}/enable` | ADMIN | 게시판 활성화 복원 |

### LP 퀵뷰 규칙

게시판 LP(`BoardQuickPanel`)는 공지사항 게시판의 글을 보여준다.
- 상단: `NTC=Y` 글 2개 (📌)
- 하단: 일반 글 3개
- 총 최대 5개

LP 헤더 "열기" 버튼 → `setBoardLpHandoff({ brdId, pstSn? })` + `setActiveFullScreen('board')` → 풀뷰가 핸드오프 컨텍스트를 받아 해당 게시판(또는 글)으로 자동 진입.

## Attachment 도메인

첨부파일 공통 모듈. 게시판/결재/주간보고 등 어느 도메인에서도 사용. RAG 검색을 위한 임베딩 파이프라인 포함.

### 테이블 구조

| 테이블 | 엔티티 | 키 | 비고 |
|---|---|---|---|
| `INT_COM_FILE_GRP` | `AttachmentGroup` | `AFILE_ID` | 첨부 그룹. 도메인별 접두어(`BRD_/APV_/RPT_`) + 타임스탬프 |
| `INT_COM_FILE` | `Attachment` | `(AFILE_ID, AFILE_SN)` | 파일 메타. `FILE_PATH`가 `blob:/...`이면 BLOB 저장, 아니면 디스크 |
| `INT_COM_FILE_BLOB` | `AttachmentBlob` | `(AFILE_ID, AFILE_SN)` | 5MB 초과 파일 본체 (`FK_INT_COM_FILE_TO_INT_COM_FILE_BLOB`) |
| `INT_COM_FILE_EMB` | `AttachmentEmbedding` | `(AFILE_ID, AFILE_SN, EMB_ID)` | 청크별 임베딩 + 태그 |

### 저장 정책

| 파일 크기 | 저장 위치 | 메타의 `FILE_PATH` |
|---|---|---|
| ≤ 5MB | 디스크 (`./uploads/yyyy/MM/`) | 절대 경로 |
| > 5MB | BLOB (`INT_COM_FILE_BLOB.FILE_BLOB`) | `blob:/yyyy/MM/{filename}` 마커 |

작은 파일은 디스크로 빼서 DB 부담 감소, 큰 파일은 BLOB로 보관해 백업/이동 시 일관성 확보. 임계값은 `application.yml`의 `attachment.blob-threshold`.

### 권한 위임

도메인별 권한 판단은 `AttachmentAuthorizer` 인터페이스 구현체에 위임. 예: `BoardAttachmentAuthorizer`는 게시판/게시글 권한으로 첨부 접근 권한 판정. 첨부 자체에 권한 메타 없음 (부모 도메인 메타로 자연 해결).

### 임베딩 파이프라인

```
[Spring AttachmentService.upload]
  ├── 동기: int_com_file_grp + int_com_file [+ int_com_file_blob] INSERT
  ├── 동기: bytes[] 스냅샷 추출 (MultipartFile은 요청 컨텍스트 종료 후 사용 불가)
  └── 비동기 @Async: EmbeddingTriggerService.triggerEmbedding(bytes, fileName, ...)
        │
        ▼
[FastAPI POST /ai/files/process]  ← 시스템 JWT (SystemJwtIssuer)
  ├── 텍스트 추출 (pymupdf / docx / openpyxl / 평문 디코드)
  ├── 청킹 RecursiveCharacterTextSplitter(800/200)
  ├── 청크별 임베딩 (bge-m3, 1024차원)
  └── 문서 단위 LLM 1회 호출 (qwen3:8b) → doc_type/topics/keywords/summary
        │
        ▼
[Spring EmbeddingTriggerService]
  └── 모든 청크에 doc_tags 동일 복사 → INT_COM_FILE_EMB INSERT
```

핵심 설계 결정:
- **WebClient 16MB 한도**: 청크 N × vector(1024) JSON 기본 256KB 초과 → `ExchangeStrategies.maxInMemorySize` 확장
- **PGvector 매핑**: Hibernate가 `PGvector` 타입 직접 매핑 불가 → `PGvectorConverter`(PGvector ↔ String) + `@ColumnTransformer(write="?::vector")`로 명시 캐스팅
- **JWT 알고리즘**: 시크릿 49바이트 → `Keys.hmacShaKeyFor`가 HS384 선택 → FastAPI `verify_token`은 HS256/384/512 모두 허용
- **bytes 스냅샷**: `transferTo()`가 톰캣 임시파일을 이동시키므로 save 이전에 `mf.getBytes()` 캡쳐

### tag_rslt 스키마 (jsonb)

문서 단위 LLM 1회 호출 결과를 모든 청크에 동일 복사. 청크별 차별성은 현재 없음 (필요 시 추후 청크별 추가 추출).

```json
{
  "doc_type": "policy",
  "topics": ["연차", "휴가"],
  "keywords": ["연차 신청", "3일 전"],
  "summary": "..."
}
```

`tag_rslt`는 ERD 주석 그대로 **"TAG검색을 위한 결과값"** — 벡터(`emb_rslt`)로 잡히지 않는 어휘적·구조적 신호 보존용. 권한/부서/카테고리는 부모 테이블(`INT_BRD.DEPT_CD`, `INT_PST.USER_ID`)의 SoR로 해결하므로 박지 않음.

### API

| 경로 | 메서드 | 설명 |
|---|---|---|
| `POST /api/files/upload` | POST | 첨부 그룹 신규/추가. 멀티파트 |
| `GET /api/files/{afileId}/{sn}/download` | GET | 파일 다운로드 (디스크/BLOB 자동 분기) |
| `GET /api/files/{afileId}` | GET | 그룹 내 파일 목록 |
| `DELETE /api/files/{afileId}/{sn}` | DELETE | 소프트 삭제 (`del_yn='Y'`) |

## Menu 도메인

NavRail/모바일 메뉴 목록을 DB(`INT_MENU`)에서 관리한다. 하드코딩 없이 DB INSERT만으로 메뉴 추가·변경 가능.

### 테이블 구조

| 컬럼 | 타입 | 설명 |
|---|---|---|
| `MENU_ID` | VARCHAR(100) PK | 프론트엔드 `PanelId`와 동일 값 |
| `MENU_NM` | VARCHAR(100) | 메뉴 표시명 |
| `MENU_SN` | INTEGER | 정렬 순서 |
| `ADM_YN` | VARCHAR(1) | `'Y'` = 관리자 메뉴, `'N'` = 일반 메뉴 |
| `USE_YN` | VARCHAR(1) | `'Y'` = 활성, `'N'` = 비활성 |

### API

| 경로 | 인가 | 설명 |
|---|---|---|
| `GET /api/menus` | 인증 사용자 전체 | `USE_YN='Y'` 메뉴 전체 반환. `ADM_YN` 오름차순(N→Y), `MENU_SN` 오름차순 |

### 초기 데이터

`backend/src/main/resources/db/menu-init.sql` — 일반 메뉴 9개 + 관리자 메뉴 8개. `ON CONFLICT DO NOTHING` 으로 멱등 실행 가능.

### 프론트엔드 연동

| 파일 | 역할 |
|---|---|
| `shared/hooks/useMenuList.ts` | `useMenuList()` — DB 메뉴 → `MenuMeta[]` 변환. staleTime 10분 |
| `shared/hooks/useMenuList.ts` | `useMenusForMode(isAdminMode)` — `admYn` 기준 필터링 편의 훅 |
| `shared/constants/menus.ts` | `MENU_ICON_MAP`, `MENU_ICON_NAME` — panelId → 아이콘 매핑 (프론트 유지) |

### 관리자 메뉴 panelId 규칙

관리자 메뉴의 `MENU_ID`는 `admin-` 접두어 없이 기능명만 사용한다.

| panelId | 화면 |
|---|---|
| `users` | 사용자 관리 |
| `roles` | 권한 관리 |
| `boards` | 게시판 관리 |
| `approval-line` | 결재선 템플릿 |
| `common-code` | 공통코드 관리 |
| `job-grade` | 직급 관리 |
| `dept` | 부서 관리 |
| `system` | 시스템 설정 |

### 새 화면 구현 시 체크리스트

1. DB `INT_MENU`에 행 INSERT (또는 `menu-init.sql` 추가)
2. `App.tsx`의 `SCREEN_MAP`에 `panelId: <XxxScreen />` 한 줄 추가
3. `MobileFullScreenRouter.tsx`의 `SCREEN_MAP`에 동일 추가
4. (구현 전) 두 `SCREEN_MAP`에 없으면 `PlaceholderScreen`으로 자동 처리 — DB `MENU_NM`이 타이틀로 표시됨

---

## Admin 도메인

관리자 모드(`isAdminMode`)에서만 접근 가능한 메뉴들. 모든 API는 `/api/admin/**` 경로로 `ROLE_ADMIN` 필요.

| 메뉴 (panelId) | API 경로 | 엔티티 | 주요 특징 |
|---|---|---|---|
| `common-code` | `/api/admin/common-codes` | `CommonCode` | 상위코드 + 하위코드 2단계 복합키 |
| `job-grade` | `/api/admin/job-grades` | `JobGrade` | 단순 목록, 소프트 삭제 (`use_yn=N`) |
| `dept` | `/api/admin/departments` | `Department` | `UP_DEPT_CD` 자기 참조 계층 트리, 비활성화 시 하위 부서 cascade |
| `users` | `/api/admin/users` | `User` | CRUD + 계정 활성/비활성, 비밀번호 초기화 |
| `boards` | `/api/admin/boards` | `Board` | CRUD + `useYn` 활성/비활성 토글, 첨부/댓글 사용여부 플래그 |

### 부서 계층 구조

- `dept_lvl` : 서버에서 자동 계산 (최상위=1, 하위 생성 시 부모 lvl+1)
- 비활성화: 해당 부서 + 모든 하위 부서 재귀적으로 `use_yn=N` 처리
- 프론트엔드: 평면 리스트 → `buildTree()` 유틸로 트리 변환 후 렌더링

## 공통코드 (INT_COM_CODE)

### 구조

`INT_COM_CODE` 테이블은 상위코드(카테고리)와 하위코드를 같은 테이블에 저장한다.

| 구분 | 조건 | 예시 |
|---|---|---|
| 카테고리 행 | `UP_CD = CD` | `(USER_SE, USER_SE)` |
| 하위코드 행 | `UP_CD ≠ CD` | `(USER_SE, ADMIN)`, `(USER_SE, USER)` |

### `_SE` 컬럼 규칙

**`_SE`로 끝나는 컬럼은 항상 공통코드에서 목록을 가져온다.**

- 공통코드 관리 화면에서 관리자가 직접 등록/수정
- API: `GET /api/codes/{upCd}` — `USE_YN='Y'`인 활성 코드만 반환 (인증 사용자 전체 접근)
- Frontend 훅: `useCodeList(upCd)` → `{ value: string; label: string }[]`

```ts
// 사용 예
const roleOptions = useCodeList('USER_SE');
// → [{ value: 'ADMIN', label: '관리자' }, { value: 'USER', label: '일반' }]
```

### 현재 등록된 `_SE` 코드 그룹

| `UP_CD` | 참조 컬럼 | 설명 |
|---|---|---|
| `USER_SE` | `INT_USER.USER_SE` | 사용자 구분 (ADMIN/USER) |

> 추후 `_SE` 컬럼이 추가될 때마다 공통코드 관리 화면에서 해당 그룹을 등록한다.

### 공통코드 API 경로 구분

| 경로 | 대상 | 용도 |
|---|---|---|
| `GET /api/admin/common-codes` | ADMIN | 카테고리 목록 (관리 화면) |
| `GET /api/admin/common-codes/{upCd}` | ADMIN | 특정 그룹 전체 코드 — 비활성 포함 (관리 화면) |
| `GET /api/codes/{upCd}` | 인증 사용자 전체 | 활성(`USE_YN='Y'`) 코드만 — 폼 콤보박스용 |

## AI / LLM

### 로컬 / 개발기
- **사내 GPU 서버** Ollama(`http://192.168.0.248:11434`) 기본 사용
- 로컬 Ollama를 직접 띄우려면 `ollama pull qwen3:8b && ollama pull bona/bge-m3-korean` 후 `OLLAMA_URL` 변경
- Ollama 미접속 시 AI 채팅 / 첨부 임베딩만 동작 안 함 (다른 기능은 정상)

### 운영기 (추후)
- Docker Compose 안의 Ollama 컨테이너
- GPU 서버에서 실행

## 모델

| 용도 | 모델 | 차원 |
|---|---|---|
| 채팅 / 추론 / 첨부 태그 추출 | `qwen3:8b` | — |
| 텍스트 임베딩 (첨부 청크) | `bona/bge-m3-korean:latest` | 1024 |

> 모델 태그는 `ollama list` 결과의 실제 이름과 일치해야 함. `ai/.env.local`의 `LLM_MODEL` / `EMBEDDING_MODEL` 로 오버라이드 가능.
>
> **임베딩 모델 교체 시 주의**: 차원이 같아도 모델별 임베딩 공간이 달라 기존 벡터와 호환 불가. `int_com_file_emb` 클리어 후 재인덱싱 필요.

## 알림

| 상황 | 방식 |
|---|---|
| 모바일 백그라운드 | FCM (Firebase Admin SDK, Spring Boot) |
| 웹 실시간 | SSE (FastAPI 채팅 응답) |

> 로컬에서는 FCM 키 미설정 시 알림 발송이 비활성화됨 (정상 동작). 실 알림 테스트는 FCM 키 발급 + 운영기 배포 후.

## AI 자율도

| 액션 유형 | 동작 |
|---|---|
| 조회 (일정, 결재목록 등) | AI가 직접 응답 |
| 상신 / 신청 | AI가 초안 작성 → 사용자 확인 후 실행 |
| 승인 / 반려 | 항상 명시적 사용자 확인 필요 |

## 환경변수

각 생태계의 표준 패턴을 따른다.

### Backend (Spring Boot 표준)

**로컬**: `backend/src/main/resources/application-local.yml` 에 접속 정보 직접 입력.
```yaml
spring:
  datasource:
    url: jdbc:postgresql://{HOST}:{PORT}/{DB_NAME}
    username: {USER}
    password: {PASSWORD}
jwt:
  secret: local-dev-secret-key-must-be-at-least-32-characters
```
`application-local.yml`은 `.gitignore` 등록 필요 (민감 정보 포함).

**운영기** (추후): `application.yml` 의 `${ENV_VAR}` placeholder + 환경변수 주입.
```yaml
jwt:
  secret: ${JWT_SECRET}
```
Docker `-e JWT_SECRET=...`, K8s Secret, Vault 등으로 주입.

### Frontend (Expo 표준 — `.env.local`)

`frontend/.env.example` 을 `frontend/.env.local` 로 복사 후 사용. `.gitignore` 등록됨.

| 변수 | 예시 값 | 설명 |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `http://localhost:8080` | 백엔드 API URL |

`frontend/src/shared/api/client.ts` 가 읽음. 없으면 즉시 throw.

### AI / FastAPI (Python 표준 — `.env.local`)

`ai/.env.example` 을 `ai/.env.local` 로 복사 후 사용 (AI 서비스 띄울 때만). pydantic-settings 가 자동 로드.

| 변수 | 예시 값 | 설명 |
|---|---|---|
| `JWT_SECRET` | (Backend와 동일 값) | Spring Boot 와 공유. 토큰 검증용 |
| `OLLAMA_URL` | `http://192.168.0.248:11434` | 사내 GPU 서버. 로컬 Ollama 쓰면 `http://localhost:11434` |
| `LLM_MODEL` | `qwen3:8b` | 채팅 + 첨부 태그 추출 모델 (실제 `ollama list` 태그와 일치 필요) |
| `EMBEDDING_MODEL` | `bona/bge-m3-korean:latest` | 첨부 청크 임베딩 (한국어 특화. 실제 `ollama list` 태그와 일치 필요) |

**JWT_SECRET 일치 필수**: Backend가 발급한 토큰을 AI가 검증해야 하므로, `application-local.yml` 의 `jwt.secret` 과 `ai/.env.local` 의 `JWT_SECRET` 이 같은 값이어야 함.

### 운영기 (추후 정비 예정)

운영기에서는 모두 환경변수로 명시 주입 필요.

| 변수 | 필수 | 기본값 | 설명 |
|---|---|---|---|
| `JWT_SECRET` | ✅ | — | HS256 서명 키 (최소 32자). Spring Boot·FastAPI 공유 |
| `JWT_EXPIRY_HOURS` | | `8` | 액세스 토큰 유효 시간 (시간) |
| `DB_HOST` | ✅ | — | PostgreSQL 호스트 |
| `DB_PORT` | | `5432` | |
| `DB_NAME` | | `infomind` | |
| `DB_USERNAME` | ✅ | — | |
| `DB_PASSWORD` | ✅ | — | |
| `LLM_MODEL` | | `qwen3:8b` | Ollama 채팅 + 첨부 태그 추출 모델 |
| `EMBEDDING_MODEL` | | `bona/bge-m3-korean:latest` | Ollama 임베딩 모델 (첨부 청크, 한국어 특화) |
| `EMBEDDING_DIMENSIONS` | | `1024` | 임베딩 차원 |
| `ALLOWED_ORIGINS` | | `*` | CORS 허용 출처 |
| `FCM_SERVICE_ACCOUNT_KEY` | | _(빈값)_ | Firebase 서비스 계정 키 경로. 비어있으면 FCM 비활성 |

---

## 기술 선택 근거

| 결정 | 채택 | 근거 | 트레이드오프 |
|---|---|---|---|
| 프론트엔드 | Expo (React Native Web) | 단일 코드베이스로 웹+모바일, 푸시 알림 신뢰성 | 일부 SDK 웹 미지원 |
| 백엔드 분리 | Spring Boot + FastAPI | 결재 워크플로우는 Spring Boot, AI 스트리밍은 FastAPI 적합 | 서비스 2개 운영 |
| 클라이언트 상태 | Zustand | 가벼움, 학습 곡선 낮음, 작은 팀에 적합 | Redux 대비 표준화 약함 |
| 서버 상태 | React Query (TanStack Query) | 캐싱/refetch/invalidation 표준 | — |
| 로컬 DB | PostgreSQL (직접 설치) | 실 DB와 동일 환경, 데이터 영속 | 별도 설치 필요 |
| 운영 DB | PostgreSQL 16 | 표준, 풀텍스트 검색, JSON 지원 | — |
| 벡터 DB | Qdrant | 메타데이터 필터링, LangChain 어댑터 | 별도 서비스 운영 |
| Redis | 초기 미사용 | 35명 규모에서 불필요 | 즉시 로그아웃 무효화 불가 |
