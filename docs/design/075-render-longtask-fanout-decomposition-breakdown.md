# ADR-075 구현 상세: Render longtask fan-out 해체

> 본 문서는 [ADR-075](../adr/075-render-longtask-fanout-decomposition.md) 의 Phase 구성, 파일 변경 범위, Gate 측정 방법, 롤백 전략을 상세화한다. ADR 본문은 "무엇을/왜" 에 한정하고 "어떻게" 는 이 문서에 둔다.

---

## 0. Baseline 재측정 (Phase 진입 전 필수, prod 기반)

ADR-074 Addendum 2 실측은 **dev 빌드** 기준이며, scheduler.development.js 오버헤드가 대부분을 차지할 가능성이 크다 (ADR-069 종결 세션에서 실증된 패턴). 본 ADR 의 Gate 는 **prod 빌드 기준** 으로 정의된다.

### 측정 환경

- `pnpm build && pnpm preview`
- Chrome 정식 빌드 (stable)
- 5000+ elements 로드된 샘플 프로젝트 (ADR-069/074 동일 프로젝트)
- DevTools Performance panel CPU throttling **off**, Network **off**
- 브라우저 확장 **비활성화**
- 확실한 reload 후 실행

### 측정 시나리오

```
window.__composition_PERF__.reset()
# 50회 캔버스 요소 클릭 반복
window.__composition_PERF__.snapshot("input.pointerdown")
# 20회 페이지 전환 반복
window.__composition_PERF__.snapshot("input.page-transition")
# 전체 longtask 분류
JSON.stringify(window.__composition_PERF__.snapshotLongTasks(), null, 2)
```

### 기록 위치

`docs/design/075-prod-baseline.md` 신설. prod 수치 기준으로 Gate 목표 수치 확정 (dev 수치는 참고용).

### 판정 조건

- prod longtask.render p99 가 이미 < 500ms 라면 → **본 ADR scope 축소** (dev overhead 가 전부였다는 뜻, P1/P2 불필요 가능)
- prod 수치가 여전히 높다면 → **Phase 1~3 진입 확정**

---

## 1. Phase 구성

각 Phase 는 **독립 PR** 로 land. Phase 경계에서 type-check + Chrome MCP 회귀 + `snapshotLongTasks()` diff 확인.

### Phase 1 — SkiaCanvas rAF loop budget 도입

**목적**: 1 프레임당 `render.content.build` / `render.plan.build` / `render.skia.draw` 합산 work 가 8ms (60fps budget) 넘으면 다음 프레임으로 yield. `longtask.render` p99 의 극단값 (현재 19742ms) 을 상한으로 자른다.

**파일 변경**:

- `apps/builder/src/builder/workspace/canvas/skia/SkiaCanvas.tsx` RAF loop 구간 (line 390~700 근방)
  - 프레임 시작 시 `budgetStart = performance.now()` 기록
  - `buildFrameContent` 후 `budgetUsed > 8ms` 이면 `paintPlan`/`draw` 다음 프레임으로 deferral
  - deferral 큐: `nextFrameWorkRef: { content?, plan?, draw? }` ref 로 보류
- 계측: `render.frame.deferred` 라벨 신설 (몇 프레임이 yield 발생했는지 count)

**Gate**: Phase 1 land 후 `longtask.render` max < 500ms (극단값 제거).

**Rollback**: budget 조건을 `Infinity` 로 설정 (즉시 무효화 가능).

---

### Phase 2 — StoreRenderBridge subscriber 세분화

**목적**: 현재 `StoreRenderBridge.connect()` 의 `useStore.subscribe(() => {...})` 는 **store 전체 변화** 에 반응. `elementsMap !== prev || childrenMap !== prev` 체크는 있으나 subscribe 콜백 자체는 모든 action 에서 실행. 이를 `subscribeWithSelector` 로 전환하여 관련 필드 변화에만 반응.

**파일 변경**:

- `apps/builder/src/builder/workspace/canvas/skia/StoreRenderBridge.ts`
  - `subscribe` 구현을 `useStore.subscribe` → `useStore.subscribe(selector, cb, { equalityFn })` 로 전환
  - selector: `(s) => [s.elementsMap, s.childrenMap, themeVersion]`
  - equalityFn: shallow tuple 비교
- `apps/builder/src/builder/stores/index.ts` (또는 해당 store 선언부)
  - subscribeWithSelector 미들웨어 이미 설치되어 있는지 확인, 없으면 추가

**Gate**: Phase 2 land 후 selection 변화 시 `StoreRenderBridge.subscribe` 콜백 호출 횟수가 selection 변경당 0 이어야 함. React DevTools Profiler 또는 console 로그 계측.

**Rollback**: subscribe selector 제거 + 원래 broad subscribe 복원.

---

### Phase 3 — Workflow / Grid / AI subscriber 감사 + 정리

**목적**: `longtask.render` 에 기여하는 잔존 subscriber 를 감사. Workflow overlay / AI flash / grid 관련 useStore 구독이 render 경로에 fan-out 되는지 확인 후 필요시 세분화 또는 ref 기반 전환.

**파일 변경**:

- `apps/builder/src/builder/workspace/canvas/skia/SkiaCanvas.tsx` (ADR-074 Phase 4 에서 추가된 selection/ai 구독 7개)
- `apps/builder/src/builder/workspace/canvas/skia/workflowRenderer.ts`, `workflowMinimap.ts` 등 workflow 관련 store 접근
- Grid 관련 `showGrid`/`gridSize` 구독

**구체 작업**:

1. ADR-074 Phase 0 기법 재사용: observe → longtask 시간 중첩 수동 추적 (`performance.getEntriesByType("longtask")` + observe trace)
2. subscriber 중 render longtask 와 중첩되는 것 식별
3. 세분화 가능한 것은 subscribeWithSelector, 그렇지 않은 것은 ref + event 기반 전환 (ADR-067 Phase 5 Fill 패턴)

**Gate**: Phase 3 land 후 `longtask.render` p99 < 500ms, viol100 < 10%.

**Rollback**: subscriber 변경 개별 롤백 (각 subscriber 마다 독립 PR).

---

### Phase 4 — longtask attribution 개선

**목적**: 현재 `topAttributions` 가 `{name: "window"}` 만 반환 (PerformanceObserver attribution 기본값). observe trace 기반 시간 중첩 attribution 을 정확하게 수행하도록 `perfMarks.ts` classify 로직 개선. 이 개선 자체는 성능 영향 없으나 **Phase 3 의 감사 작업을 자동화** 가능.

**파일 변경**:

- `apps/builder/src/builder/utils/perfMarks.ts`
  - `classifyLongTask` 로직에 observe trace 기반 best-match 추가
  - `topAttributions` 에 observe label + overlap duration 포함

**Gate**: 측정 인프라 개선 — `snapshotLongTasks()` 결과의 `topAttributions` 가 유의미한 observe label 을 포함.

**Rollback**: classify 로직 원복 (기본 "window" attribution 복원).

---

### Phase 5 — Prod Gate 재검증

**목적**: Phase 1~4 land 후 prod 빌드에서 최종 측정. ADR-069 종결 패턴 동일.

**측정 방법**: Phase 0 과 동일 시나리오, `pnpm build && pnpm preview` 환경.

**Gate**:

- `longtask.render` p99 < 500ms (현재 dev 19742ms, prod 수치 미측정)
- `longtask.input` p95 < 100ms (현재 dev 621ms)
- viol100ms < 10% (input/render 각각)
- ADR-074 observe 본체 지표 퇴행 없음 (`input.pointerdown` p95 < 2ms, `input.page-transition` p95 < 2ms)

**결과 기록**: `docs/design/075-prod-gate.md` 신설. ADR Status → Implemented + Addendum 추가.

---

## 2. 측정 인프라 요약

| Gate | 라벨/도구                                    | 관찰 방법               | 목표 (prod)  |
| ---- | -------------------------------------------- | ----------------------- | ------------ |
| G1   | P0 baseline 측정 자체                        | prod 실측 + 문서 기록   | 완료         |
| G2   | `snapshotLongTasks()[longtask.render]`       | 요소 클릭 50회 후 p99   | < 500ms      |
| G3   | `snapshotLongTasks()[longtask.input]`        | 요소 클릭 50회 후 p95   | < 100ms      |
| G4   | `snapshotLongTasks()[longtask.*]` viol100ms  | count / totalCount 비율 | < 10%        |
| G5   | ADR-074 observe (`input.pointerdown` 등) p95 | 퇴행 감지용             | 유지 (< 2ms) |

---

## 3. 체크리스트 (Phase land 시)

각 Phase PR 머지 전:

- [ ] `pnpm type-check` 3 tasks PASS
- [ ] Chrome MCP 회귀: 렌더링 정합성 불변 (빈 영역 클릭 / 요소 선택 / 페이지 전환 / drag / workflow overlay)
- [ ] `snapshotLongTasks()` diff 기록 (`docs/design/075-prod-baseline.md` 업데이트)
- [ ] ADR-074 observe 본체 지표 비회귀 확인 (각 Phase 경계)
- [ ] `parallel-verify` skill 로 렌더링 관련 컴포넌트 패밀리 회귀 (Phase 3 이후)

---

## 4. 의존성 / 선후 관계

```
P0 ──→ P1 ──→ P2 ──→ P3 ──→ P4 ──→ P5
        ↓      ↓      ↓
        독립 land 가능 (Gate 측정도 각자)
```

- P0 prod baseline 결과에 따라 P1~P3 scope 조정 (dev overhead 가 전부였다면 축소).
- P4 는 P3 보조 도구 — P3 전에 land 하면 감사 자동화 지원. 단 P4 없이도 수동 추적 가능.
- P5 는 최종 단계. P1~P4 모두 land 후 실행.

---

## 5. 리스크 완화 노트

### R1. P1 rAF budget yield 시 1 프레임 stutter

- 완화: yield 발생 시 다음 프레임에서 deferred work 우선 처리. 시각적 stutter 최소화 위해 visible page 우선.
- 검증: Chrome MCP 로 드래그 중 budget yield 발생 시에도 시각 정합성 유지.

### R2. P2 subscribeWithSelector 전환 시 reactivity 누락

- 완화: selector 가 커버하지 못한 field 변화 시 render 갱신 안 됨. shallow tuple 로 elementsMap/childrenMap/themeVersion 3개 커버하되, 새 필드 추가 시 selector 업데이트 강제 (codegen 또는 주석).
- 검증: 다양한 store action (add/update/remove/theme change) 후 시각 갱신 확인.

### R3. P3 workflow/AI subscriber 감사 실수로 reactivity 제거

- 완화: Phase 3 는 감사 + 세분화만 수행, 완전 제거는 금지. 각 subscriber 수정은 개별 PR.
- Fallback: 영향받은 기능 (workflow overlay / AI flash / grid) 각 회귀 체크리스트 수행.

### R4. P5 prod 측정 시 dev overhead 없이도 목표 미달

- 완화: prod Gate 목표를 실측 후 조정. 현실적 목표가 p99 < 800ms 수준이라도 dev 19742ms 대비 큰 개선.
- Fallback: ADR-075 Addendum 으로 "prod 측정 기반 목표 재정의" (ADR-069 종결 선례 동일).

---

## 6. 종결 기준 (ADR-075 Implemented 전환)

- G1~G5 모두 PASS (또는 Addendum 으로 현실적 목표로 재정의)
- P1~P5 전부 main 머지 + Chrome MCP 회귀 PASS
- `docs/design/075-prod-gate.md` 에 before/after 수치 기록
- `docs/adr/README.md` 에서 Proposed → Implemented 상태 전이 + 완료 ADR 섹션 이동
