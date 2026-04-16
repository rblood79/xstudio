# ADR-069: 입력·프레임 Violation 완화 — same-turn store write 병합 + 프레임 플랜 부분 캐시

## Status

Proposed — 2026-04-16

## Context

Builder Canvas 상호작용 중 Chrome DevTools에서 반복적으로 관찰되는 Violation 두 종류가 사용자 체감 응답성(INP)을 저해하고 있다.

```
[Violation] 'pointerdown' handler took 150~170ms
[Violation] 'requestAnimationFrame' handler took 88ms   // SkiaCanvas.tsx:370
```

**증상 재현 경로**: 다른 페이지의 요소 클릭, workflow overlay ON 상태에서의 클릭, body 빈 영역 클릭.

### SSOT 3-domain 분할과의 관계

본 ADR은 [`.claude/rules/ssot-hierarchy.md`](../../.claude/rules/ssot-hierarchy.md) 3-domain(D1 DOM/접근성 / D2 Props / D3 시각 스타일) **경계 밖의 runtime 성능 최적화** 영역에 속한다. Spec/RAC/RSP의 권위 구조에는 개입하지 않으며, Builder 내부의 input→state→frame 파이프라인 비용만 다룬다.

### 근본 원인 (재분석 완료)

1. **`useCentralCanvasPointerHandlers.ts`** 한 턴에 수행되는 동기 작업:
   - `getBoundingClientRect()` (layout flush)
   - `computeSelectionBoundsForHitTest()` 2회 호출 (최초 + pending drag용 fresh bounds)
   - WASM `hitTestPoint` + elementsMap lookup
   - `handleElementClickRef.current()` 내부에서 **같은 턴에 최대 3회 store `set()`**:
     1. `clearSelection()` — `startTransition` 밖
     2. `setCurrentPageId()` — `startTransition` 밖 → `rendererInput` 재빌드 트리거
     3. `setSelectedElement()` — `startTransition` 안
2. **Zustand는 `startTransition`과 무관하게 즉시 notify**한다. `useSyncExternalStore` 구독자는 transition lane으로 분리되지 않으므로 `startTransition` 래핑의 체감 효과가 사실상 없다.
3. **`SkiaCanvas.tsx:370` renderFrame** 루프는 매 프레임 `buildSkiaFrameContent` + `buildFrameRenderPlan` + `renderer.render`를 진입한다. content 측은 `getCachedCommandStream` 캐시 보유이나, **`buildFrameRenderPlan`은 `overlayVersion` 변경 시 전면 재빌드**된다. selection 변경 → `overlayVersion++` → 다음 프레임 overlay/workflow/minimap plan 전체 재계산.
4. **입력→프레임 연쇄**: pointerdown 150ms Violation 직후 다음 rAF에서 88ms Violation이 이어져 하나의 사용자 액션에 long task 2연타가 발생한다.

### Hard Constraints

1. Chrome Violation 임계 50ms — pointerdown p95 < 50ms, rAF handler p95 < 50ms 목표
2. Canvas 60fps (frame budget 16.67ms) — [CLAUDE.md 성능 기준](../../CLAUDE.md#성능-기준)
3. 단일 React commit cycle 내 외부 Zustand store `set()` 호출 횟수 ≤ 1 (fan-out 제약)
4. 기존 드래그/더블클릭/Escape 취소 동작 회귀 금지 (ADR-043 Phase 0~6 계약 유지)

### Soft Constraints

- 실측 프로파일(프로덕션 빌드) 선행 필요 — dev-only React 오버헤드 분리
- ADR-037의 SelectionModel/PointerSession은 Implemented 상태이나 현재 selection 경로는 이를 우회하여 직접 store write 중
- 페이지 전환을 동반한 선택은 가장 큰 비용 분기로, fast path(`elements.ts:682`의 Phase1/Phase2)가 미적용

## Alternatives Considered

### 대안 A: same-turn store write 병합 + 구독 fan-out 축소

- 설명: `handleElementClick`의 `clearSelection + setCurrentPageId + setSelectedElement` 3회 `set()`을 단일 batched action(`selectElementWithPageTransition`)으로 결합. `elements.ts:682`의 Phase1/Phase2(즉시 하이라이트 + 다음 프레임 props hydrate) 패턴을 페이지 전환 경로로 확장. 광역 구독자(BuilderCanvas/인스펙터)의 selector를 id-only로 세분화하고 상세 props는 하위에서 lazy subscribe.
- 근거:
  - Zustand 공식 가이드: "merge multiple `set()` into one to avoid fan-out" (Redux batch의 Zustand 대응 패턴)
  - React Aria `useSelectionManager` 내부: 단일 mutation + Set 교체로 id-only 구독자만 재평가
  - Pencil/Figma 소스 관찰: selection 이벤트는 한 번의 batched command로 처리, page 전환은 동일 트랜잭션에 포함
- 위험:
  - 기술: LOW — 기존 store action 재조합. 외부 API 변경 없음
  - 성능: LOW — 실측 수치는 Gate로 통과 조건 명시
  - 유지보수: LOW — selection 경로 응집도 향상
  - 마이그레이션: LOW — 점진 적용, git revert 만으로 롤백 가능

### 대안 B: FrameRenderPlan 부분 캐시 — overlay/content/workflow 분리

- 설명: `buildFrameRenderPlan`을 `buildOverlayPlan` / `buildContentPlan` / `buildWorkflowPlan` 3개 서브-함수로 분리하고 각자 독립 캐시 키로 관리. `overlayVersion`을 `overlay.selectionVersion`, `overlay.editingVersion`, `overlay.minimapVersion` 등 세분화된 서브-시그니처로 치환. selection-only 변경 시 content node / edge geometry 재사용.
- 근거:
  - Chromium Blink의 PaintController는 PaintChunk 단위 invalidation — 전체 paint tree re-raster 금지
  - 현재 `skiaFramePipeline.ts`가 content build 내부에서 이미 LayoutMap/CommandStream 캐시 보유 → 동일 패턴을 상위 plan 단계로 확장
  - `recordInvalidation("overlay", "selection")` 로그로 overlay-only 변경 빈도가 가장 높음이 이미 관찰됨
- 위험:
  - 기술: MEDIUM — 캐시 키 설계 오류 시 stale plan 렌더링. 테스트 matrix(overlay ON/OFF × selection/drag/edit) 필요
  - 성능: LOW — 캐시 히트 경로는 명확
  - 유지보수: MEDIUM — `skiaFramePlan.ts` 모듈 복잡도 상승
  - 마이그레이션: MEDIUM — invalidation 조건 실수 시 육안 회귀 발생. `/cross-check` + `parallel-verify` 스위치 필수

### 대안 C: SelectionModel/PointerSession 전면 활용 (구조 개편)

- 설명: ADR-037에서 도입된 `SelectionModel`(`interaction/selectionModel.ts`)과 `PointerSession`(`interaction/pointerSession.ts`)을 `useCanvasElementSelectionHandlers` 경로로 확장. "직접 store write" 방식을 "SelectionModel intent → SelectionModel commit"으로 전환. **현재 `PointerSession`은 double-click detection만 담당**(drag threshold=3은 `useCentralCanvasPointerHandlers.ts:27` inline, Escape cancel은 `useKeyboardShortcutsRegistry`로 분산)이므로, 본 대안 채택 시 PointerSession을 확장하여 drag threshold + Escape cancel까지 흡수하도록 리팩토링해야 한다.
- 근거: ADR-037의 원래 의도(SelectionModel 단일 진입점). 현재 selection은 model이 아닌 직접 store write로 이원화 상태
- 위험:
  - 기술: HIGH — SelectionModel API 확장 + 기존 selection 경로 전면 수정. drag(ADR-043/049)/double-click/inline edit(ADR-027)와 얽힘
  - 성능: LOW — batch 보장
  - 유지보수: LOW(장기) / HIGH(단기) — PR 규모 방대
  - 마이그레이션: HIGH — Selection 관련 E2E 전면 회귀

### 대안 D: 현상 유지 + 프로덕션 빌드 검증만

- 설명: dev-only 오버헤드가 지배적이라면 코드 변경 없이 프로덕션에서 자연 감소 가능성 검증.
- 근거: Chrome DevTools Violation은 React `development.js` 오버헤드 포함. 프로덕션 빌드에서 30~50% 감소가 일반적 업계 관찰치
- 위험:
  - 기술: LOW
  - 성능: MEDIUM — 실사용자 INP 개선 미보장
  - 유지보수: LOW
  - 마이그레이션: N/A

### Risk Threshold Check

| 대안 | 기술 | 성능 |    유지보수     | 마이그레이션 | HIGH+ 개수 |
| :--: | :--: | :--: | :-------------: | :----------: | :--------: |
|  A   |  L   |  L   |        L        |      L       |     0      |
|  B   |  M   |  L   |        M        |      M       |     0      |
|  C   |  H   |  L   | L(장기)/H(단기) |      H       |    2~3     |
|  D   |  L   |  M   |        L        |     N/A      |     0      |

**루프 판정**: 대안 C만 HIGH 2건 이상. 나머지(A/B/D)는 수용 가능 범위. C는 장기 방향 ADR로 별도 검토 권장. A + B 결합으로 Violation 완화라는 좁은 목표를 달성, D는 Phase 0 검증으로 편입.

## Decision

**대안 A(1단계) + 대안 B(2단계) 결합**, 대안 D를 Phase 0 baseline 검증으로 편입한다.

선택 근거:

1. **위험 수용 근거 — A**: 4축 전부 LOW. 롤백 비용이 낮고(PR 단위 revert) 점진 적용이 가능하며, 근본 원인(3-set fan-out)을 직격한다.
2. **위험 수용 근거 — B**: `invalidateContent` 미호출 시에도 overlay-only 변경이 plan 전체 재계산을 유발하는 구조적 비효율을 캐시 계층으로 해결한다. MEDIUM 위험은 Gate(육안 회귀 검증)로 통제.
3. **Phase 0(D)**: 프로덕션 프로파일이 dev-only 오버헤드 영향을 분리하여 A/B의 실측 ROI를 정확히 산정하게 해준다. 측정 없는 최적화는 금지.

기각 사유:

- **대안 C 기각**: 위험 HIGH 2~3건. 장기적으로 바람직하나 Violation 완화라는 **좁은 목표**에 과대 투자. ADR-037 후속 "SelectionModel 확장 ADR"로 별도 분리해야 drag/edit/double-click 회귀 테스트 매트릭스를 독립적으로 관리할 수 있다.
- **대안 D 단독 기각**: dev-only 오버헤드로 전부 설명되지 않을 가능성 존재(예: WASM hitTest, `computeSelectionBoundsForHitTest` 중복 호출은 프로덕션에서도 동일 비용). 검증은 필요하나 변경 없이 끝낼 수 없다.

> 구현 상세: [069-input-frame-violation-mitigation-breakdown.md](../design/069-input-frame-violation-mitigation-breakdown.md)

## Gates

| Gate | 시점         | 통과 조건                                                                                                                                                                                                                            | 실패 시 대안                                                     |
| ---- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| G0   | Phase 0 완료 | 프로덕션 빌드 Performance 프로파일 수집: pointerdown Bottom-Up에서 hit test / store action / React commit 비중 분리                                                                                                                  | Chrome tracing category 확장 또는 `performance.mark` 수동 계측   |
| G1   | 대안 A 완료  | same-turn `set()` 호출 수 페이지 전환 경로 3→1, pointerdown p95 < 50ms(프로덕션 빌드, 연속 20 클릭)                                                                                                                                  | 구독 fan-out(BuilderCanvas/인스펙터 selector) 후속 최적화 추가   |
| G2   | 대안 B 완료  | rAF renderFrame p95 < 50ms, selection-only 변경 시 contentNode 재사용률 100% **(AI flash/generating 비활성 상태 전제 — `aiState.generatingNodes.size + aiState.flashAnimations.size === 0`)**, `/cross-check` 5 샘플 × 5-레이어 PASS | 캐시 invalidation 조건 재설계 또는 `parallel-verify` 패밀리 확장 |
| G3   | 전체 완료    | Violation 경고 0건/연속 10 클릭(빈 영역, 같은 페이지, 다른 페이지, workflow ON/OFF, **multi-selection shift/meta** 5 시나리오), Canvas 60fps 유지                                                                                    | 대안 C(SelectionModel 전면 활용) 착수 검토                       |

## Consequences

### Positive

- `useCanvasElementSelectionHandlers.ts` 선택 경로 응집도 향상 — 3-set → 단일 batched action
- `skiaFramePlan.ts`에 cache layer 정착 — 유사 Violation 재발 시 서브-시그니처 관찰로 원인 격리 용이
- ADR-037 SelectionModel 재방문 트리거 — 본 ADR 완료 후 대안 C 판단에 실측 데이터 축적
- `stats/` 로깅 체계와 독립적으로 `performance.mark` 기반 INP 관찰성 확보

### Negative

- `skiaFramePlan.ts` 모듈 복잡도 상승 (overlay/content/workflow plan 분리 + 각 캐시 키 관리)
- 캐시 invalidation 조건 버그 시 육안 회귀 가능성 — `/cross-check` 수동 검증 스위치 필수
- 영향 파일 추정 7~10개: `useCanvasElementSelectionHandlers.ts`, `useCentralCanvasPointerHandlers.ts`, `stores/elements.ts`, `BuilderCanvas.tsx`, `skiaFramePlan.ts`, `SkiaCanvas.tsx`, selection-관련 selector 파일 2~3개
- 구독 축소 과정에서 일부 패널이 "stale" 상태를 잠시 표시할 가능성 — Phase1/Phase2 순서 계약 유지 필수
