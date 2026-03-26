# Tester Agent Memory

## 테스트 인프라 현황

(테스트 프레임워크 설정, 커버리지 현황 등을 기록)

## 테스트 작성 시 주의사항

- CanvasKit/Skia WASM: 특별 셋업 필요 (WASM 모듈 mock 또는 실제 로드)
- Zustand 슬라이스: 독립 테스트 시 store 초기화 필수
- postMessage: origin 검증 포함 mock 필수
- Taffy WASM: `mod.default()` 초기화 호출 필수

## 알려진 테스트 어려움

- Skia 렌더링 결과 시각적 검증 → snapshot 테스트 또는 evaluator 에이전트 위임
- iframe 통신: Builder ↔ Preview 통합 테스트 시 실제 iframe 필요
