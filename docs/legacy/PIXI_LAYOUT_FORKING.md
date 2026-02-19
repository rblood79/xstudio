> **⚠️ DEPRECATED (2026-02-19)**: 이 문서는 `@pixi/layout` 포크 검토 기준으로 작성되었습니다.
> Phase 11에서 `@pixi/layout` 완전 제거됨. Pixi Layout 포크 대신 Taffy WASM + Dropflow Fork 채택.
> 최신 아키텍처: [`docs/WASM.md`](../WASM.md), [`docs/ENGINE.md`](../ENGINE.md)

# Pixi Layout 포크 검토 가이드

이 문서는 WebGL 캔버스에서 HTML과 유사한 레이아웃(`display: block/inline/flex/grid` 등)을 구현할 때,
`@pixi/layout` 포크를 검토하는 기준과 단계별 대안을 정리합니다.

## 1) 핵심 요약

- `@pixi/layout`은 **Yoga 기반 Flexbox 레이아웃**입니다.
- HTML과 동일한 레이아웃 엔진을 목표로 하지 않으므로, 모든 CSS 동작을 1:1로 맞추기 어렵습니다.
- **포크는 최후의 수단**으로 두고, 먼저 어댑터/보완 레이어로 해결 가능한지 검토합니다.

## 2) 포크 고려 전에 점검할 항목

### A. 요구사항 구체화

- 필요한 동작을 기능 단위로 분해합니다.
  - 예: `inline` 줄바꿈, `grid` 자동 배치, `block` 기본 너비 등

### B. Flexbox 기반 근사 가능성 평가

- `block`, `inline`, `inline-block`의 일부 동작은 Flexbox 조합으로 근사할 수 있습니다.
- `grid`는 별도 계산 로직(간단한 grid 배치기)을 두고 Pixi Container에 결과를 적용할 수 있습니다.

### C. 성능/유지보수 비용 검토

- 포크 후 업스트림 추적 비용
- 내부 버그 수정 및 API 변화 대응 비용

## 3) 포크가 합리적인 경우

- Yoga 또는 `@pixi/layout` 내부 동작이 **구조적으로** 목표 동작을 막는 경우
- 어댑터/보완 레이어로 해결 불가한 핵심 요구사항이 다수인 경우

## 4) 권장 접근 순서

1. **요구 동작 목록화**: 필요한 레이아웃 동작을 구체화
2. **어댑터 레이어 설계**: `display`를 Flexbox/수동 계산으로 매핑
3. **소규모 실험**: 대표 컴포넌트에서 성능/정확성 검증
4. **포크 결정**: 위 방법으로 해결 불가할 때만 포크 진행

## 5) 체크리스트

- [ ] `block/inline/grid`에서 필요한 동작을 기능 단위로 분해했는가?
- [ ] Flexbox 조합으로 근사 가능한 범위를 확인했는가?
- [ ] Grid 전용 계산 로직을 별도 모듈로 분리했는가?
- [ ] 포크 시 유지보수 비용을 산정했는가?

## 6) 참고

- `@pixi/layout`은 Flexbox 기반 레이아웃 시스템입니다.
- PixiJS + `@pixi/layout` + `@pixi/react` 조합이 현재 WebGL 캔버스 렌더링의 기준입니다.

