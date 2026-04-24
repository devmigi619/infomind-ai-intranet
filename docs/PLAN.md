# Development Plan

## Status

Last updated: 2026-04-24

### Completed (Pre-Phase 1)

- [x] Technology stack finalized
- [x] Architecture designed — JWT Delegation Pattern
- [x] Monorepo structure created
- [x] Docker Compose configuration (base + dev)
- [x] Nginx configuration (SSE streaming support)
- [x] Documentation (ARCHITECTURE, ADR, SETUP, CONVENTIONS)
- [x] Frontend initialized — Expo + web support
- [x] Backend initialized — Spring Boot 3.5 + JWT + FCM dependencies
- [x] AI backend initialized — FastAPI + Ollama + Qdrant skeleton
- [x] `.env.dev` created
- [x] Git repository initialized and pushed to GitHub

---

## Phase 1 — Core Features + AI Hub

### Backend (Spring Boot)

**Authentication**
- [ ] JWT issuance / validation filter
- [ ] Login API — `POST /api/auth/login`
- [ ] Refresh token

**User**
- [ ] `User` entity + repository
- [ ] Get current user API — `GET /api/users/me`

**Bulletin Board**
- [ ] Post CRUD APIs
- [ ] File attachment upload

**Electronic Approval**
- [ ] Submit approval — `POST /api/approvals`
- [ ] Approve / reject — `POST /api/approvals/{id}/approve`, `/reject`
- [ ] Approval line configuration
- [ ] FCM notification on status change

**Weekly Report**
- [ ] Create / retrieve weekly report APIs

### Frontend (Expo)

**Common**
- [ ] React Navigation setup (web + mobile)
- [ ] JWT storage and refresh (expo-secure-store + axios interceptor)
- [ ] Shared layout components (NavRail, TabBar, side panel)

**Screens**
- [ ] Login screen
- [ ] AI chat main screen (WelcomeScreen + chat)
- [ ] Bulletin board — list, detail, create
- [ ] Electronic approval — list, detail, submit form
- [ ] Weekly report — create, view
- [ ] Push notification reception (expo-notifications)

### AI (FastAPI)

- [ ] Ollama streaming integration — functional verification
- [ ] Chat API — `POST /ai/chat` with SSE streaming
- [ ] Intent classification (approval / board / weekly report / general)
- [ ] Intent-based response + shortcut action payload

---

## Phase 2

- [ ] Calendar and schedule management
- [ ] Meeting room reservation (with visualization)
- [ ] Vehicle reservation (with visualization)

## Phase 3

- [ ] Certificate printing
- [ ] Role and permission management
- [ ] Admin screen
- [ ] RAG — internal document search

---

## AI Autonomy Policy

| Action Type | Behavior |
|---|---|
| Read (schedules, approval lists, etc.) | AI responds directly |
| Submit / Apply | AI drafts payload; user confirms before execution |
| Approve / Reject | Explicit user confirmation always required |
