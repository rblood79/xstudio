# ADR-039 Phase 0 Baseline

## Date

2026-03-13

## Scenario

- 대상 URL: `http://localhost:5173/builder/2eb9fbea-5904-44c5-98ac-6636e1edbdfd`
- 시나리오: multi-page canvas에서 `Add Page`를 연속 실행
- 관측 위치: Chrome DevTools console long task 경고

## Baseline

사용자 재현 로그 기준 baseline:

- `pointerdown` handler: `251ms ~ 482ms`
- IndexedDB success handler: `151ms ~ 314ms`
- `requestAnimationFrame` handler: `58ms ~ 92ms`
- 페이지 추가가 누적될수록 `requestAnimationFrame` long task가 반복 노출

## Target Budget

- 페이지 추가 시 invisible page는 content build 대상에서 제외
- visible page set이 변하지 않는 page add/move는 기존 visible content cache를 유지
- page switch는 content invalidate가 아니라 overlay 갱신으로 처리

## Verification Gate

1. `pnpm -F @xstudio/builder type-check`
2. `vitest`로 scene snapshot / renderer input / visible-page root 추출 계약 검증
3. visible page 기준 command stream cache key 분리 확인
4. document overlay와 page overlay 입력 분리 확인
