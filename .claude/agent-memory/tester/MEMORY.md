# Tester Memory

## 테스트 인프라

- Framework: Vitest + React Testing Library
- Stories: Storybook (localhost:6006)
- E2E: Playwright (설정 필요 시 npx playwright install)

## WASM/Canvas 테스트 주의

- WASM mock: mod.default() 초기화 호출 필수
- Zustand: 테스트마다 store 초기화 (useStore.setState)
- CanvasKit: Skia 렌더링 결과는 snapshot 또는 evaluator 위임
- postMessage: origin 검증 포함 mock 필수
- iframe 통신: Builder ↔ Preview 통합 테스트 시 실제 iframe 필요
