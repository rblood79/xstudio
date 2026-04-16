# ADR-069 Breakdown — 입력·프레임 Violation 완화 구현 상세

> ADR 본문: [069-input-frame-violation-mitigation.md](../adr/069-input-frame-violation-mitigation.md)
>
> 본 문서는 Phase 목록, 파일 변경표, 체크리스트를 담는다. 결정 근거/대안 비교는 ADR 본문 참조.

## 영향 파일 (현재 코드 기준)

| 경로                                                                                                     | 역할                                                                        | 변경 Phase |
| -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | :--------: |
| `apps/builder/src/builder/workspace/canvas/hooks/useCanvasElementSelectionHandlers.ts`                   | `handleElementClick` 진입점, 3-set 근원                                     |     1      |
| `apps/builder/src/builder/workspace/canvas/hooks/useCentralCanvasPointerHandlers.ts`                     | 중앙 native pointerdown, `computeBounds` 2회 호출                           |     1      |
| `apps/builder/src/builder/stores/elements.ts`                                                            | `setSelectedElement`/`setCurrentPageId`/`clearSelection` Phase1/Phase2 패턴 |     1      |
| `apps/builder/src/builder/workspace/canvas/BuilderCanvas.tsx`                                            | 광역 구독자, selector 세분화 대상                                           |     2      |
| `apps/builder/src/builder/workspace/canvas/skia/skiaFramePlan.ts`                                        | `buildFrameRenderPlan` — 분리 + 캐시                                        |     3      |
| `apps/builder/src/builder/workspace/canvas/skia/SkiaCanvas.tsx`                                          | `renderFrame` — 서브-시그니처 조립                                          |     3      |
| `apps/builder/src/builder/workspace/canvas/skia/invalidationPacket.ts` (가칭 — 실제 경로는 구현 시 확인) | `overlayVersion` → 서브-버전 세분화                                         |     3      |
| `apps/builder/src/builder/stores/scenePanels.ts` (인스펙터/레이어 패널 selector 정의)                    | id-only 구독 전환                                                           |     2      |

## Phase 0 — Baseline 측정 (대안 D 편입)

측정 없는 최적화 금지. 프로덕션 빌드에서 실측 후 Phase 1 착수.

### 체크리스트

- [ ] `pnpm build && pnpm preview`로 프로덕션 빌드 실행
- [ ] Chrome DevTools Performance 패널로 4개 시나리오 각각 10회씩 기록:
  - 같은 페이지 요소 클릭
  - 다른 페이지 요소 클릭
  - body 빈 영역 클릭
  - workflow overlay ON 상태 클릭
- [ ] 각 시나리오의 pointerdown Bottom-Up을 CSV로 저장:
  - `computeSelectionBoundsForHitTest` self-time
  - `hitTestPoint` (WASM) self-time
  - store action(`setSelectedElement`/`setCurrentPageId`/`clearSelection`) self-time
  - React commit 시간 + commit 횟수
- [ ] 직후 rAF 1~3 프레임의 `buildSkiaFrameContent` / `buildFrameRenderPlan` / `renderer.render` self-time 분리
- [ ] 측정 결과를 `docs/design/069-input-frame-violation-mitigation-baseline.md`(별도 파일)에 표로 기록

### Gate G0 통과 조건

- 4 시나리오 × 상위 3 hotspots 식별 완료
- dev vs prod 차이 비율 확인 (대안 D 기각 근거)

## Phase 1 — same-turn store write 병합 (대안 A)

### 1-1. store 액션 신설

`stores/elements.ts`에 페이지 전환 + 선택을 단일 mutation으로 처리하는 action 추가.

```ts
// 개념 스케치 — 실구현은 기존 setSelectedElement Phase1/Phase2 패턴 준수
selectElementWithPageTransition: (elementId, targetPageId, options?) => {
  const startTime = performance.now();
  cancelHydrateSelectedProps();

  // Phase 1 (즉시 set 1회): currentPageId + selected* 동시 갱신
  set((state) => ({
    currentPageId: targetPageId ?? state.currentPageId,
    selectedElementId: elementId,
    selectedElementIds: [elementId],
    selectedElementIdsSet: new Set([elementId]),
    multiSelectMode: false,
  }));

  // Phase 2 (scheduleNextFrame): selectedElementProps hydrate
  scheduleNextFrame(() => {
    /* 기존 패턴 동일 */
  });
  scheduleHydrateSelectedProps(elementId);
};
```

### 1-2. `useCanvasElementSelectionHandlers.ts` 호출부 교체

- `clearSelection()` + `setCurrentPageId()` + `setSelectedElement()` 순차 호출을 `selectElementWithPageTransition()` 1회로 치환
- `startTransition` 래핑 제거(Zustand에 대해 no-op이므로 제거로 코드 의도 명확화)

### 1-3. `useCentralCanvasPointerHandlers.ts` bounds 중복 제거

- L172 `computeSelectionBoundsForHitTest()` 결과를 `selectionBoundsRef.current`에 저장
- L242 fresh bounds 재계산은 "`handleElementClick`이 실제로 currentPageId 변경했거나 selectedIds 변경한 경우"에만 조건부 실행
- 그렇지 않으면 최초 계산 결과 재사용

### 체크리스트

- [ ] `selectElementWithPageTransition` action 추가 + 타입 갱신
- [ ] `useCanvasElementSelectionHandlers.ts` 3-set → 1-set 치환
- [ ] `startTransition` 래핑 제거(이유 주석 1줄만)
- [ ] `computeSelectionBoundsForHitTest` 조건부 재호출 구현
- [ ] `pnpm type-check` PASS
- [ ] Chrome MCP로 4 시나리오 회귀 (ADR-043 drag + ADR-027 inline edit 포함)
- [ ] **Drag 즉시 시작 회귀 테스트**: 다른 페이지 요소를 클릭 직후 threshold(3px) 초과 이동 시 `pendingDrag.bounds`가 새 selection 기준으로 정확한지 검증. batched action 후 `state.elementsMap.get(hitElementId)` 즉시 조회 가능성 확인 (Phase 1(즉시 set)이 stale을 만들지 않는지)
- [ ] **Preview iframe 페이지 표시 회귀**: 다른 페이지 요소 클릭 시 Preview iframe이 대상 페이지로 전환되는지 확인. `setCurrentPageId` 병합 후에도 postMessage 전파 타이밍이 변하지 않아야 함 (ADR-004 iframe isolation 계약)
- [ ] **Multi-selection 회귀**: shift/meta 연타 선택 유지 여부 확인 — `selectElementWithPageTransition`는 단일 선택 경로에만 적용, 다중 선택 경로는 기존 `setSelectedElements` 유지

### Gate G1 통과 조건

- 페이지 전환 경로 same-turn `set()` 호출 수 3 → 1 (console 계측)
- 프로덕션 빌드 pointerdown p95 < 50ms, 연속 20 클릭

## Phase 2 — 구독 fan-out 축소 (대안 A 연장)

### 2-1. selector 세분화 대상 식별

Phase 0 Performance 프로파일에서 commit 시간 상위 컴포넌트 선별. 예상 대상:

- `BuilderCanvas.tsx` — `useStore(...)` 광역 구독
- StylesPanel / InspectorPanel — selectedElementProps 전체 구독
- LayerPanel — childrenMap/elementsMap 구독

### 2-2. id-only 구독 전환

- `selectedElementId`만 구독 → 실제 props는 하위 컴포넌트에서 lazy `useStore(s => s.elementsMap.get(id))`
- `useShallow` 금지 규약(ESLint) 하에 primitive selector + `useMemo` 조립 패턴 적용 (ADR-067 선례)

### 체크리스트

- [ ] Phase 0 측정에서 commit 시간 상위 3 컴포넌트 선별
- [ ] 각 컴포넌트 selector를 primitive 단위로 분해
- [ ] `pnpm type-check` PASS
- [ ] React Profiler로 클릭 1회당 re-render 수 before/after 비교

## Phase 3 — FrameRenderPlan 부분 캐시 (대안 B)

### 3-1. `buildFrameRenderPlan` 분리

현재 단일 함수를 3개로 분해:

```
buildOverlayPlan(ctx, { selectionVersion, editingVersion, minimapVersion })
buildContentPlan(ctx, { registryVersion, pagePosVersion, viewportBounds })
buildWorkflowPlan(ctx, { workflowOverlaySignature, graphSignature, hoverEdgeId })
```

각 함수는 자체 캐시 키(weak ref 또는 Map)를 보유하고, 키 일치 시 이전 plan 객체를 그대로 반환한다.

### 3-2. `overlayVersion` 서브-시그니처 세분화

- 현재: 단일 `overlayVersionRef.current++`가 selection/editing/minimap/drag/AI/grid/workflow 전부를 포괄
- 변경: `overlayVersions = { selection, editing, minimap, drag, ai, grid, workflow }` 구조체로 분리
- `recordInvalidation("overlay", reason)` 호출부에서 reason별 해당 키만 bump

### 3-3. renderer.render 호출 최적화

- framePlan 객체 자체의 참조 동일성으로 `renderer.setOverlayNode`/`setContentNode` 스킵 판단
- dirty-plane 단위 draw (overlay-only 변경 시 content 레이어 미드로우)

### 체크리스트

- [ ] `skiaFramePlan.ts` 3-way 분리 + 타입 정의
- [ ] `overlayVersions` 구조체 도입 + invalidation 호출부 전수 수정
- [ ] `renderer.setOverlayNode` 참조 동일성 스킵 구현
- [ ] `/cross-check` skill 5 샘플 × 5-레이어 PASS
- [ ] `parallel-verify` 패밀리 1회 통과
- [ ] Chrome MCP: **AI 비활성 상태**에서 selection 연타 → content node 재사용률 100% 확인 (계측 로그 필요)
- [ ] **AI active 상태 예외 검증**: `aiState.generatingNodes`/`flashAnimations` 활성 중에는 overlay 매 프레임 bump가 정상 동작이므로 재사용률 100% 조건에서 제외됨을 코드 주석 + Gate 문구에 명시

### Gate G2 통과 조건

- rAF renderFrame p95 < 50ms(프로덕션)
- **AI 비활성 상태 전제**하에 selection-only 변경 시 contentNode 참조 동일 100%
- `/cross-check` PASS + `parallel-verify` PASS

## Phase 4 — 종합 검증 + 종결

### 체크리스트

- [ ] 4 시나리오 × 10 클릭 Violation 경고 0건 (Chrome DevTools)
- [ ] Canvas 60fps 유지 (PerformanceDashboard 스냅샷)
- [ ] ADR-043 drag / ADR-049 reparenting / ADR-027 inline edit 회귀 없음
- [ ] auto-memory `session-2026-MM-DD-violation-mitigation.md` 기록
- [ ] ADR-069 Status: Proposed → Implemented
- [ ] `docs/adr/README.md` 현황 요약 + 테이블 갱신

### Gate G3 통과 조건

- Violation 경고 0건/연속 10 클릭 × 4 시나리오 = 40 클릭 모두 클린
- 60fps 유지
- 회귀 없음

## 롤백 전략

- Phase 1: `selectElementWithPageTransition` revert + 기존 3-set 복구
- Phase 2: selector 단위 revert (PR 단위 분할 권장)
- Phase 3: `overlayVersions` 구조체 → 단일 `overlayVersion` 복구 + 분리 함수 재합성
- 각 Phase는 독립 PR로 제출하여 revert 단위를 격리

## 측정 방법 세부

### `performance.mark` 기반 INP 근사 계측

```ts
// 개념 스케치
const pointerDownStart = performance.now();
// ... handler body ...
performance.measure("input.pointerdown", { start: pointerDownStart });
```

- `performance.getEntriesByName("input.pointerdown")` 주기적 수집 → `stats/violations.jsonl` 기록 (선택)
- 프로덕션 빌드에서만 활성화하여 개발 오버헤드 제거

### Chrome DevTools Bottom-Up 템플릿

```
Performance 기록 → Main thread → 해당 pointerdown task 선택
→ Bottom-Up 탭 → Group by Function
→ 상위 10개 self-time 엔트리 캡처
```

Phase 0 baseline 문서에 이 절차를 표준화하여 Phase 1/2/3 각각 after 측정에서 동일 방법으로 비교.
