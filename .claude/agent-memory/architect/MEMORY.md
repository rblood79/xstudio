# Architect Memory

## ADR 작성 시 참조

- Risk-First 템플릿 (Step 1~6): docs/adr/README.md
- 완료 ADR 목록: docs/adr/completed/
- 성능 기준: Canvas 60fps, 초기 로드 <3초, 번들 <500KB
- Builder ↔ Preview iframe 격리 필수 (postMessage Delta 동기화)

## 아키텍처 제약

- Dual Renderer: CanvasKit/Skia(화면) + PixiJS(이벤트) — 둘 다 동기화 필수
- 단일 Taffy WASM 레이아웃 엔진 (Flex/Grid/Block)
- 상태 파이프라인 6단계 순서 필수 보존
