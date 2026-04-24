# ADR-001: 프론트엔드 — Expo (React Native Web)

## 결정
Expo (React Native Web)로 웹 + iOS + Android 단일 코드베이스 구성

## 이유
- 웹과 모바일 동급 UX 요구 → PWA 탈락, 순수 RN은 웹 미지원
- Flutter 대비 웹 DOM 기반 렌더링으로 그룹웨어 특성에 유리 (리치텍스트, 파일처리, 브라우저 동작)
- Expo Go로 초기 테스트 비용 $0

## 트레이드오프
- Flutter 대비 모바일 네이티브 완성도 약간 낮음
- 일부 Expo SDK 모듈의 웹 지원 제한 (카메라 등)
