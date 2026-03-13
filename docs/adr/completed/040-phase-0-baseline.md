# ADR-040 Phase 0 Baseline

## Date

2026-03-13

## Scenario

- 대상 URL: `http://localhost:5173/builder/2eb9fbea-5904-44c5-98ac-6636e1edbdfd`
- 시나리오 A: `Add Page`를 연속 실행하며 새 페이지를 활성화
- 시나리오 B: 현재 페이지와 비활성 페이지를 섞어 삭제
- 시나리오 C: 하위 컴포넌트 추가로 현재 페이지의 element count가 점진적으로 증가하는 상태에서 page select/add/delete 수행
- 관측 위치: Chrome DevTools console long task 경고 + builder `perf` 로그

## Baseline

현재 로그 기준 baseline:

- `pages.add-click`: 대체로 `150ms ~ 350ms`, 큰 경우 `489.5ms`
- `pages.add.activate-next-frame`: 대체로 `130ms ~ 326ms`, 누적 시 `497.3ms`
- `panel.layers.render`: 대체로 `60ms ~ 130ms`, 큰 경우 `212ms ~ 228ms`
- `panel.nodes.render`: 대체로 `80ms ~ 170ms`, 큰 경우 `221ms ~ 256ms`
- page delete 후 현재 페이지가 바뀌면 `panel.layers.render`와 `panel.nodes.render`가 함께 재상승

## Contract Audit

interactive 전체 교체 경로:

- `2026-03-13 기준 제거됨`
  - interactive `setElements(...)` 직접 호출은 runtime 코드에서 제거

delta 또는 page-local 경로:

- `apps/builder/src/builder/stores/elementLoader.ts:173`
  - `lazyLoadPageElements()`는 page-local append 방식
- `apps/builder/src/builder/stores/elements.ts:709`
  - `appendPageShell()`은 page shell + body만 증분 반영
- `apps/builder/src/builder/stores/elements.ts:776`
  - `removePageLocal()`은 page-local 제거
- `apps/builder/src/builder/stores/elements.ts:531`
  - `replaceElementId()`는 temp-id -> persisted id 치환을 전체 교체 없이 처리
- `apps/builder/src/preview/messaging/messageHandler.ts:342`
  - preview는 `DELTA_BATCH_UPDATE` 수신을 이미 지원

snapshot 허용 경계:

- `apps/builder/src/builder/hooks/usePageManager.ts:549`
  - `hydrateProjectSnapshot(...)` 기반 프로젝트 bootstrap hydrate
- `apps/builder/src/builder/hooks/useIframeMessenger.ts:603`
  - `recoverElementsSnapshot(...)` 기반 recovery / hard-resync 전용 full snapshot 수신

delta 우선 송신 경계:

- `apps/builder/src/builder/main/BuilderCore.tsx`
  - 동일 visible scope 내 변경은 `DELTA_ELEMENT_*` / `DELTA_BATCH_UPDATE` 우선, scope 전환만 full snapshot
- `apps/builder/src/builder/hooks/useElementCreator.ts`
  - 요소 생성 직후 직접 `UPDATE_ELEMENTS`를 보내지 않고 store 구독 기반 delta/full sync에 위임

## Problem Signature

- visible page 렌더링은 이미 page-scoped로 줄였지만, panel/state 계층은 전체 교체와 전역 인덱스 재평가를 여전히 소비한다.
- 같은 `currentPageId` 안에서도 element count가 `1 -> 8 -> 17 -> 31 -> 48`처럼 단계적으로 증가하며 `LayersSection`과 `NodesPanel`이 반복 렌더된다.
- page add/delete에서 실제 병목은 store mutation보다 `panel.layers.render`와 `panel.nodes.render`의 연쇄 커밋이다.

## Target Budget

- interactive page add/delete에서 비활성 페이지 변경은 현재 page layers snapshot 참조를 유지
- `UPDATE_ELEMENTS`는 bootstrap/recovery 전용으로 축소
- page activation은 페이지 스냅샷 1회 commit으로 끝나야 함
- 동일 `currentPageId`에서 element hydration burst는 1회 또는 bounded batch로 제한

## Verification Gate

1. `pnpm -F @xstudio/builder type-check`
2. `TMPDIR=/tmp pnpm -F @xstudio/builder exec vitest run src/builder/stores/__tests__/pageShellActions.test.ts`
3. page add 시 비활성 페이지 변경으로 `panel.layers.render`가 재발하지 않는지 확인
4. page delete 시 현재 페이지가 유지되는 경우 layers snapshot 참조가 유지되는지 확인

---

## Phase 1 Progress (2026-03-14)

### 완료: Interactive `state.elements` 전체 배열 구독 → O(1) delta 패턴 전환

29개 파일에서 `state.elements` 전체 배열을 구독하던 패턴을 `elementsMap`/`childrenMap`/`pageElementsSnapshot` O(1) 패턴으로 전환.

#### 전환 패턴

| 기존 패턴                                         | 전환 후                               |
| ------------------------------------------------- | ------------------------------------- |
| `elements.find(el => el.id === id)`               | `elementsMap.get(id)`                 |
| `elements.filter(el => el.parent_id === id)`      | `childrenMap.get(id) ?? []`           |
| `useStore(state => state.elements)` (현재 페이지) | `pageElementsSnapshot[currentPageId]` |
| `state.elements.length`                           | `state.elementsMap.size`              |
| `elements.map(el => el.id === id ? updated : el)` | `elements.indexOf()` + `Array.with()` |
| `postMessage("*")`                                | `postMessage(window.location.origin)` |

#### 전환 완료 파일 (29개)

**Property Editors (17개)**: ColumnEditor, CellEditor, FieldEditor, RowEditor, ElementSlotSelector, TableHeaderEditor, TableBodyEditor, BreadcrumbsEditor, TreeItemEditor, TagEditor, RadioGroupEditor, CheckboxGroupEditor, ToggleButtonGroupEditor, ListBoxItemEditor, GridListEditor, TableEditor, ToggleButtonEditor

**Store/Hooks (7개)**: canvasStore, useTextEdit, useCollectionItemManager, usePresetApply, useComponentMemory, useDeltaMessenger, TabsEditor

**Canvas UI (2개)**: PixiListBox, PixiToggleButtonGroup

**Panels (2개)**: AIPanel, LayoutsTab

**Store Actions (1개)**: instanceActions (detachInstance 증분 패치)

**보안 (1개)**: historyActions (postMessage origin 3곳)

#### 의도적 스킵

- `BuilderCanvas.tsx`: 멀티페이지 렌더러 — `buildSceneSnapshot()`, `computeWorkflowEdges()` 등이 구조적으로 전체 elements 필요. `visiblePageIds` culling이 이미 적용됨. Phase 3+ 대상.
- `historyActions.ts` undo/redo 내부: 스냅샷 복원 로직으로 `set({ elements })` + `_rebuildIndexes()` 패턴 정당

#### Verification

- `pnpm exec tsc --noEmit` 통과 (2026-03-14)

---

## Phase 2 Progress (2026-03-14)

### 완료: Atomic Page Activation — render burst 축소

Page activation 시 다중 set() commit → 단일/최소 commit으로 전환하여 패널 render burst를 축소.

#### 변경 내역 (4개 파일)

| 파일                                        | 변경                                                              | 효과                                 |
| ------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------ |
| `elements.ts` `activatePage()`              | 동일 페이지+동일 요소 중복 activation early return                | 불필요한 commit 1회 제거             |
| `PagesSection.tsx` `handlePageSelect()`     | `await loadPageIfNeeded` 대기 → 즉시 activation + 백그라운드 로드 | activation 지연 제거 (I/O 대기 분리) |
| `PagesSection.tsx` `handlePageDelete()`     | `elements.filter(page_id)` → `pageElementsSnapshot` O(1)          | 전체 배열 순회 제거                  |
| `elementLoader.ts` `lazyLoadPageElements()` | elements set() + loadedPages set() → 단일 set() 병합              | render burst 1회 축소                |

#### 기대 효과

- 페이지 선택 시: Set 3~4회 → 1~2회 (activation 즉시 + 백그라운드 로드 분리)
- 페이지 삭제 시: O(N) 배열 순회 → O(1) snapshot 조회
- `lazyLoadPageElements` 완료 시: 2회 commit → 1회 commit

#### Verification

- `pnpm exec tsc --noEmit` 통과 (2026-03-14)

---

## Phase 3 Progress (2026-03-14)

### 완료: Delta-Aware Store API 정착

Interactive store 액션에서 `elements.filter/map/findIndex` O(N) 순회 → `childrenMap`/`elementsMap`/`indexOf+with()` O(1) 패턴으로 전환.

#### 변경 내역 (4개 파일)

| 파일                              | 변경                                                   | 효과           |
| --------------------------------- | ------------------------------------------------------ | -------------- |
| `elementCreation.ts`              | `elements.filter(parent_id)` → `childrenMap.get()`     | O(1) 형제 조회 |
| `elementCreation.ts` 재정렬       | `elements.filter(layout_id)` → `elementsMap.forEach()` | 배열 순회 제거 |
| `inspectorActions.ts` preview 2곳 | `findIndex(id)` → `indexOf + with()`                   | O(1) 증분 패치 |
| `elementUpdate.ts` update 2곳     | `map(id)` → `indexOf + with()`                         | O(1) 증분 패치 |

#### Verification

- `pnpm exec tsc --noEmit` 통과 (2026-03-14)
