# Infomind 사내 업무포탈

AI 허브 중심 그룹웨어. 자연어로 결재·게시판·주간보고 등 업무에 접근한다.

## 기술 스택

| 레이어 | 기술 |
|---|---|
| 프론트엔드 + 모바일 | Expo (React Native Web) + Zustand + React Query |
| 백엔드 (업무로직) | Spring Boot 3.5 (Java 21) |
| 백엔드 (AI/RAG) | FastAPI (Python 3.11) |
| LLM | Ollama — Qwen 2.5 8B |
| 관계형 DB | PostgreSQL 16 (개발기/운영기) / H2 (로컬) |
| 벡터 DB | Qdrant |
| 알림 | FCM (모바일) + SSE (웹) |

## 프로젝트 구조

```
infomind-ai-intranet/
├── frontend/    # Expo 앱
├── backend/     # Spring Boot
├── ai/          # FastAPI
├── infra/       # Docker Compose, Nginx (추후 정비)
├── docs/        # 아키텍처, 개발계획
├── mockups/     # HTML UI 목업 (단계별 디자인 검증)
└── sample/      # 초기 React 와이어프레임 (참고용)
```

## 로컬 실행

각 서비스를 따로 띄워서 개발/테스트한다. PostgreSQL 없이 백엔드는 H2 인메모리 DB(`local` 프로파일)로 동작한다.

### 필요한 것

| 서비스 | 필요 |
|---|---|
| Frontend | Node.js 20+ |
| Backend | JDK 21 |
| AI (선택) | Python 3.11+, Ollama (`qwen2.5:8b`, `bge-m3`) |

### 0. 환경변수 설정

**Frontend** (필수):
```bash
cp frontend/.env.example frontend/.env.local
```

**AI** (선택 — AI 서비스 띄울 때만):
```bash
cp ai/.env.example ai/.env.local
```

**Backend는 별도 설정 불필요.** 로컬용 더미 시크릿이 `application-local.yml`에 박혀 있습니다 (Spring Boot 표준 패턴). 운영기 시크릿은 환경변수로 주입.

> `.env.local`은 `.gitignore`에 등록되어 커밋되지 않습니다.

### 1. Backend (Spring Boot + H2)

PowerShell:
```powershell
$env:JAVA_HOME="C:\Users\<사용자>\.jdks\openjdk-22.0.1"
cd backend
.\gradlew bootRun --args='--spring.profiles.active=local'
```

bash/zsh:
```bash
cd backend
JAVA_HOME=~/.jdks/openjdk-22.0.1 ./gradlew bootRun --args='--spring.profiles.active=local'
```

기동 후:
- API: http://localhost:8080
- H2 콘솔: http://localhost:8080/h2-console
  - JDBC URL: `jdbc:h2:mem:infomind`
  - User: `sa` / Password: (빈칸)

기동 시 자동 생성되는 테스트 계정:

| 계정 | 비밀번호 | 권한 |
|---|---|---|
| `admin` | `admin1234` | ADMIN |
| `user1` | `user1234` | USER |

H2는 인메모리라 재시작 시 데이터 초기화. 매 기동 시 위 계정은 자동 재생성됨.

### 2. Frontend (Expo Web)

```bash
cd frontend
npm install
npx expo start --web
```

→ http://localhost:8081

`.env.local` 파일에 백엔드 URL 지정 (`.env.example` 참고, 위의 0단계에서 이미 복사됨):
```
EXPO_PUBLIC_API_URL=http://localhost:8080
```

### 3. AI (FastAPI) — 선택

Ollama를 로컬에 설치한 경우만 실행 가능. AI 채팅 기능을 안 쓸 거면 생략 가능 (프론트는 채팅 외 모든 기능 동작).

```bash
cd ai
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

→ http://localhost:8000

Ollama 모델 준비 (최초 1회):
```bash
ollama pull qwen2.5:8b
ollama pull bona/bge-m3
```

## 로컬 Docker

전체 스택을 컨테이너로 한 번에 띄울 때:

```bash
cd infra
docker compose up -d
```

> Docker Compose 설정은 GPU 서버 배포용으로 작성됐기 때문에 로컬에서 그대로 쓰기엔 다듬을 부분이 있음. 위 직접 실행 방식이 권장.

## 추후 정비 예정

- **GPU 개발기 배포** — PostgreSQL + Ollama + Qdrant 운영 환경
- **운영기 배포** — Nginx 리버스 프록시, SSL, FCM 키
- **CI/CD 파이프라인**
- **푸시 알림 실 동작 테스트** (FCM 키 발급 후)

## 문서

| 문서 | 내용 |
|---|---|
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | 서비스 구조, 라우팅, 인증 흐름, 환경변수 |
| [PLAN.md](docs/PLAN.md) | 개발 페이즈 및 기능 체크리스트 |
| [CLAUDE.md](CLAUDE.md) | 에이전트 작업 지침, 코드 컨벤션 |
