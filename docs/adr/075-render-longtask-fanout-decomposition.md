# ADR-075: Render longtask fan-out 해체 — SkiaCanvas rAF / StoreRenderBridge subscriber 축소

> **SSOT domain**: D3 (시각 스타일) 경계 불변. 본 ADR 은 **렌더 consumer 내부 subscription + rAF work 스케줄링 최적화**. Spec/Skia/CSS 3-domain 모델 무관. 정본: [ssot-hierarchy.md](../../.claude/rules/ssot-hierarchy.md). 직접 선례: [ADR-074](completed/074-canvas-input-pipeline-decomposition.md) (함수 본체 최적화 완료, 본 ADR 은 Addendum 2 에서 이관된 체감 경로), [ADR-069](completed/069-input-frame-violation-mitigation.md) (prod gate 방식), [ADR-067](067-style-panel-skia-native-read-path.md) (Zustand-native 세분화 선례).

## Status

Proposed — 2026-04-18

## Context

ADR-074 P1~P5 land 후 `observe()` 본체 측정 지표는 완전 충족되었으나 (p50 1.1ms / 0.8ms), **사용자 체감 지연은 해소되지 않았다**. ADR-074 Addendum 2 의 longtask 실측이 그 원인을 결정적으로 확증했다:

| 라벨                    | count |   mean    |  p50  |  p95  |     p99     |     max     | viol100  |
| ----------------------- | :---: | :-------: | :---: | :---: | :---------: | :---------: | :------: |
| `longtask.input`        |  52   | 463.79ms  | 467ms | 621ms |   1016ms    |   1016ms    | **100%** |
| `longtask.render`       |  21   | 1219.95ms | 393ms | 578ms | **19742ms** | **19742ms** |   57%    |
| `longtask.unclassified` |  105  |  172.5ms  | 119ms | 411ms |    447ms    |   2942ms    |   65%    |

**핵심 관찰**:

1. `input.pointerdown` 함수 본체 1.1ms vs `longtask.input` p50 467ms → **99.76% 가 React commit + subscriber fan-out**. ADR-074 가 BuilderCanvas 루트에서 selection/editing/ai 구독 6개를 제거했으나, 하위 consumer (`StoreRenderBridge`, `SkiaCanvas` rAF loop, 1168 개 잔존 subscriber) 는 그대로 유지.
2. `longtask.render` p99 19742ms — **한 번의 20초 stall 발생**. 사용자 세션 내 한 번이라도 발생하면 응답 불가 수준. SkiaCanvas rAF loop 의 budget 제한 부재 + StoreRenderBridge broad subscribe 결합 폭주로 추정.
3. `longtask.unclassified` count 105 — observe 경로와 시간 중첩 안 된 task. dev scheduler.development.js / React dev build overhead. ADR-069 종결 패턴대로 prod 빌드 시 큰 폭 감소 예상.

ADR-074 는 함수 본체 축을 완수했고, 본 ADR 은 **render longtask 축 (subscriber fan-out + rAF 폭주)** 을 해체하여 실제 체감 개선을 달성한다.

### Hard Constraints

1. **Gate G2 (prod)**: `longtask.render` p99 < **500ms** (현재 dev 19742ms, prod 미측정).
2. **Gate G3 (prod)**: `longtask.input` p95 < **100ms** (현재 dev 621ms).
3. **Gate G4 (prod)**: `longtask.*` viol100ms < **10%** (현재 longtask.input 100%).
4. **ADR-074 비회귀**: `input.pointerdown` / `input.page-transition` observe 본체 p95 < 2ms 유지.
5. `pnpm type-check` 3 tasks 통과.
6. Chrome MCP 회귀: 렌더링 정합성 시각 불변 (요소 선택 / 드래그 / workflow overlay / AI flash / grid / 페이지 전환).
7. **ADR-069 prod gate 방식 정합**: dev 측정은 참고용, 공식 Gate 는 prod 기준.

### Soft Constraints

- 점진 land (P1~P5 각 독립 PR, 중간 rollback 안전).
- 외부 의존성 추가 금지 (Zustand/Skia/RAC 버전 불변).
- StoreRenderBridge 의 `themeVersion` 동기화 경계 유지.

## Alternatives Considered

### 대안 A: rAF budget + subscribeWithSelector 세분화 + subscriber 감사

Phase 1 SkiaCanvas rAF loop 에 frame budget 도입 (>8ms 시 yield) / Phase 2 StoreRenderBridge 를 `subscribeWithSelector` 로 세분화 (elementsMap/childrenMap/themeVersion 3 필드만 구독) / Phase 3 workflow/AI/grid subscriber 감사 후 필요시 세분화 또는 ref 기반 전환 / Phase 4 longtask attribution 개선 (observe trace 기반) / Phase 5 prod 실측 Gate 재검증.

- 근거: [ADR-067](067-style-panel-skia-native-read-path.md) Phase 1~6 Zustand-native 세분화로 G1/G2/G3 전부 PASS (median 40.1ms vs 119.1ms baseline, -66%). StoreRenderBridge 는 구조상 ADR-067 style panel 과 유사한 broad subscription pattern.
- 위험:
  - 기술: **MEDIUM** — rAF budget 은 단순하나 subscriber 세분화는 Store API 이해 필요. subscribeWithSelector 미들웨어가 프로젝트에 이미 설치되어 있는지 확인 필요.
  - 성능: **LOW** — 목표 경로 직접 공략. 선례 (ADR-067) 실증 존재.
  - 유지보수: **MEDIUM** — subscription 경계 새로 그림. 새 store field 추가 시 selector 업데이트 필요 (codegen 또는 주석 강제).
  - 마이그레이션: **LOW** — Phase 단위 독립 PR. 각 Phase 롤백 안전.

### 대안 B: OffscreenCanvas + Worker thread 이전

SkiaCanvas 렌더링을 Web Worker 에서 수행 → main thread longtask 자체를 제거.

- 근거: Figma/Pixi 는 WebWorker 기반 렌더링을 일부 채택. Chrome OffscreenCanvas API 안정화.
- 위험:
  - 기술: **CRITICAL** — CanvasKit WASM 을 Worker 에서 재초기화 필요. 기존 Skia 리소스 (font / image atlas) 공유 메커니즘 부재. DOM 이벤트 ↔ Worker proxy 레이어 구축 필수. 프로젝트 내 WASM font loading 인프라 (font-registry-v2) 와 충돌 가능.
  - 성능: **MEDIUM** — main thread 부담은 해소되나 Worker ↔ main 통신 레이턴시 추가. postMessage serialization 비용.
  - 유지보수: **HIGH** — 대규모 구조 변경. 디버깅 툴링 제약 (Worker DevTools 제한적).
  - 마이그레이션: **CRITICAL** — 기존 DOM 이벤트 / selection / drag 전체 재설계. 중간 rollback 사실상 불가.

### 대안 C: React 19 `useTransition` 전면 적용

selection / page 변화 action 을 `startTransition` 으로 래핑. React scheduler 가 priority 조정으로 interrupt 허용.

- 근거: React 19 concurrent features (ADR-067 는 Zustand-native 이라 React concurrent 와 독립).
- 위험:
  - 기술: **MEDIUM** — startTransition 은 state update 를 low priority 로 마킹. Zustand action 은 React scheduler 밖 실행이라 직접 효과 없을 수 있음. useSyncExternalStore 브릿지 필요.
  - 성능: **MEDIUM** — priority 만 조정, 총 work 량 불변. yield 지점 제공은 유용하나 fan-out 양 자체는 동일.
  - 유지보수: **MEDIUM** — React 패러다임 전환. Zustand subscribe 와의 궁합이 실증되지 않음.
  - 마이그레이션: **MEDIUM** — action 전체를 선별 래핑 필요.

### 대안 D: Prod 측정만 수행 (dev overhead 가 전부였다면 무작업)

Phase 0 prod baseline 측정 후, 목표가 이미 충족되면 추가 작업 없이 종결.

- 근거: ADR-069 선례 — dev longtask.input p95 645ms 가 prod 에서 88ms (-86%) 로 자동 감소. scheduler.development.js 242ms 오버헤드 확증.
- 위험:
  - 기술: **LOW** — 단순 측정.
  - 성능: **LOW** — 현상 파악만, 근본 해결 아님.
  - 유지보수: **LOW** — 변경 없음.
  - 마이그레이션: **LOW** — 변경 없음.

### Risk Threshold Check

| 대안                               | 기술  | 성능 | 유지보수 | 마이그레이션 | HIGH+ 개수 |
| ---------------------------------- | :---: | :--: | :------: | :----------: | :--------: |
| A (rAF budget + subscriber 세분화) |   M   |  L   |    M     |      L       |     0      |
| B (OffscreenCanvas / Worker)       | **C** |  M   |  **H**   |    **C**     |   **3**    |
| C (React 19 useTransition)         |   M   |  M   |    M     |      M       |     0      |
| D (prod 측정만)                    |   L   |  L   |    L     |      L       |     0      |

**판정**:

- B 는 CRITICAL 2 + HIGH 1 → 기각.
- A/C/D 는 HIGH+ 0, threshold 통과. 단 C 는 "총 work 량 불변" 이라 Hard Constraint G2/G3/G4 충족 여부 불확실.
- D 는 "작업 안 함" 이라 낮은 리스크지만 prod 측정 결과 목표 미달 시 대안 필요.
- 루프 판정: **D 를 Phase 0 으로 내장 + A 를 Phase 1~5 로 채택** — 두 접근 결합이 가장 안전.

## Decision

**대안 A 를 Phase 1~5 로 채택하되, Phase 0 에 prod baseline 측정 (대안 D 내장)** 을 선행한다. Phase 0 결과가 Gate G2/G3/G4 를 이미 충족하면 Phase 1~5 를 선택적으로 skip 하거나 scope 축소.

선택 근거:

1. **ADR-067 실증**: Zustand-native 세분화 + subscribeWithSelector 패턴이 Style Panel 에서 G1/G2/G3 전부 PASS (median -66%). StoreRenderBridge 도 동일 패턴 적용 가능.
2. **ADR-069 선례**: prod 빌드는 dev 대비 p95 -86% 감소. Phase 0 에 prod 측정 내장 시 workload 낭비 방지.
3. **Phase 독립 land**: P1 rAF budget / P2 subscribeWithSelector / P3 subscriber 감사 각각 독립 PR. 중간 rollback 안전.
4. **ADR-074 비회귀 보호**: 각 Phase 경계에서 observe 본체 지표 확인. 대안 B 와 달리 기존 SkiaCanvas 구조 유지.

기각 사유:

- **대안 B 기각**: CRITICAL 2 + HIGH 1. OffscreenCanvas/Worker 는 장기적으로 검토 가치 있으나 본 ADR scope 초과. 별도 ADR (예: ADR-100 Phase N+) 에서 다룸.
- **대안 C 기각**: 총 work 량 불변으로 Hard Constraint G2 (longtask.render p99 < 500ms) 충족 불확실. Zustand + React scheduler 궁합도 미실증. 보조 수단으로 향후 재검토 가능.
- **대안 D 단독 기각**: prod 측정만으로 Gate 충족 안 될 경우 대안 부재. A 와 결합하여 Phase 0 로 내장.

> 구현 상세: [075-render-longtask-fanout-decomposition-breakdown.md](../design/075-render-longtask-fanout-decomposition-breakdown.md)

## Gates

| Gate | 시점          | 통과 조건                                                         | 실패 시 대안                                                 |
| ---- | ------------- | ----------------------------------------------------------------- | ------------------------------------------------------------ |
| G1   | P0 land 후    | prod baseline 측정 완료 + `docs/design/075-prod-baseline.md` 기록 | N/A (측정 자체)                                              |
| G2   | P3 land 후    | prod `longtask.render` p99 < 500ms                                | Addendum 으로 목표 조정 (ADR-069 선례) 또는 대안 C 일부 채택 |
| G3   | P3 land 후    | prod `longtask.input` p95 < 100ms                                 | Phase 2 subscribeWithSelector 재조정                         |
| G4   | P3~P5 land 후 | prod `longtask.*` viol100ms < 10%                                 | Phase 3 subscriber 감사 범위 확장                            |
| G5   | 전 Phase 경계 | ADR-074 observe 본체 지표 비회귀 (`input.pointerdown` p95 < 2ms)  | 해당 Phase 롤백                                              |

**잔존 HIGH 위험 없음** — 대안 A 가 HIGH+ 0 으로 통과. Gate 실패 시 Phase 단위 롤백 또는 Addendum 목표 조정으로 흡수.

## Consequences

### Positive

- `apps/builder/src/builder/workspace/canvas/skia/SkiaCanvas.tsx` rAF budget 으로 `longtask.render` 극단값 (19742ms) 상한 제한.
- `apps/builder/src/builder/workspace/canvas/skia/StoreRenderBridge.ts` subscribeWithSelector 세분화로 store 변화당 subscriber 호출 빈도 대폭 감소. ADR-067 선례 기준 -60~90% 감소 가능.
- `apps/builder/src/builder/utils/perfMarks.ts` longtask attribution 개선으로 향후 Phase 3 유사 감사 작업 자동화.
- prod Gate 기준 지표 확립 → 향후 성능 ADR 도 동일 Gate 사용 가능.
- ADR-074 Addendum 2 에서 이관된 체감 경로 해소 → 사용자 체감 지연 실질 감소 (Phase 5 실측 기준).

### Negative

- StoreRenderBridge subscribeWithSelector selector 업데이트 부담 — 신규 store field 추가 시 selector 에 반영 필요. 주석으로 강제하거나 codegen 필요.
- rAF budget yield 시 1 프레임 stutter 가능성 — 드래그/panning 중 시각적 영향 있을 수 있음 (Chrome MCP 로 회귀 체크 필수).
- Phase 4 longtask attribution 개선은 계측 인프라 변경 — `snapshotLongTasks()` 의 `topAttributions` 출력 shape 가 변경될 수 있음 (외부 consumer 없음 확인 필요).
- Phase 0 prod 측정 결과 목표 이미 충족 시 P1~P3 scope 축소 → 대안 D 처럼 "무작업" 종결 가능성. ADR 작업 overhead 과대 평가 위험 (단, 측정 인프라 확립은 향후 가치).
