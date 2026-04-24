# ADR-001: Frontend — Expo (React Native Web)

**Status**: Accepted

## Decision

Use Expo (React Native Web) to deliver web, iOS, and Android from a single codebase.

## Context

The product is a groupware application where the primary interface is a desktop web browser. Mobile parity (not just notifications) is required. Two alternatives were evaluated: Flutter and Expo.

## Rationale

- **Web DOM rendering**: Expo renders natively in the browser DOM, while Flutter web uses CanvasKit (canvas-based). DOM rendering is essential for groupware features: rich text editors (Tiptap/Quill), file drag-and-drop, browser clipboard, and native scrolling behavior.
- **Unified codebase**: Single codebase for web + iOS + Android eliminates divergent maintenance.
- **Development cost**: Expo Go enables zero-cost device testing without native build toolchains.
- **Team capability**: JavaScript/React skills transfer directly.

## Trade-offs

| Factor | Impact |
|---|---|
| Mobile native fidelity | Marginally lower than Flutter for complex native animations |
| Expo SDK web support | Some modules have partial web support (e.g., camera). Evaluate per feature. |

## Rejected Alternatives

- **PWA**: Does not meet the mobile-equivalent UX requirement.
- **Flutter**: CanvasKit rendering causes non-native browser behavior (scrolling, text selection, form inputs). Unsuitable for desk-heavy groupware.
- **Separate web + native apps**: Higher maintenance cost; rejected.
