# ADR-903 Phase 4 — editing semantics sub-breakdown

> 본 문서는 [ADR-903](../completed/903-ref-descendants-slot-composition-format-migration-plan.md) Phase 4 (G4 Gate) 의 **sub-phase 분할** 과 구현 계획이다. ADR 본문 §3.11 의 신규 UI/UX/semantics 요구사항 7건을 실행 단위로 분해.
>
> **상위 ADR**: ADR-903 (Status: Accepted — 2026-04-25)
> **진입 전 선결 조건**: P3 G3 통과 (G3 = 0, factory ownership 제거 + canonical resolver 단일화 완결)
> **P3 decisions.md 결정 5**: adapter shim 은 P4 완료 (G4 통과) 시점에 해체 — P4 기간 중 legacy fallback 으로 존속

---

## 1. Baseline 측정 (2026-04-25)

### 1.1 §3.11 요구사항 7건 구현 현황

| 항목                              | 설명                                                         | 현재 구현 | 근거 파일 / grep                                                                                                             |
| --------------------------------- | ------------------------------------------------------------ | :-------: | ---------------------------------------------------------------------------------------------------------------------------- |
| ① 원본 노드 시각 마커             | LayerTree / Canvas / DesignKit 에 `reusable: true` 고유 표시 |  **0건**  | `grep -rn "componentRole\|reusable.*marker" panels/nodes/ → 0`                                                               |
| ② 인스턴스 노드 시각 마커         | `type:"ref"` 노드 link 아이콘 + 원본 참조 표시               |  **0건**  | 同 grep 0                                                                                                                    |
| ③ override 노드 시각 마커         | `descendants[path]` override 자식 dot/색상 변화              |  **0건**  | `grep -rn "resetDescendants\|override.*marker" src/ → 0`                                                                     |
| ④ 양방향 탐색 액션                | "원본으로 이동" / "모든 인스턴스 보기"                       |  **0건**  | LayerTree context menu 없음 (grep 0)                                                                                         |
| ⑤ detachInstance semantics 재구현 | subtree materialize + path-based descendants + UI 연결       | **부분**  | `instanceActions.ts:80` props-only 구현 (134L). UI 연결 0건 (`lib/db/types.ts:35` history type 만 존재). subtree 복제 미구현 |
| ⑥ override reset/revert 액션      | `resetDescendantsOverride` 신규 + Properties 패널 버튼       |  **0건**  | `grep -rn "resetDescendantsOverride" src/ → 0`                                                                               |
| ⑦ 원본 편집 시 전파 미리보기      | "N개 인스턴스에 반영됨" 미리보기                             |  **0건**  | `grep -rn "propagat.*preview\|affectedInstances" src/ → 0`                                                                   |

**결론**: 7건 중 **6건 미구현**, 1건(⑤) 부분 구현 (props merge 만, subtree materialize + UI 0건).

### 1.2 핵심 파일 baseline

| 파일                                                 |  라인 수 | 역할                                                                                                                                     |
| ---------------------------------------------------- | -------: | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `stores/utils/instanceActions.ts`                    |  **134** | detachInstance + createInstance. detach = props merge 만, subtree 미구현                                                                 |
| `utils/component/instanceResolver.ts`                |  **212** | resolveInstanceProps (legacy) + resolveCanonicalRefProps/DescendantOverride (P1/P2 진행 중) + resolveDescendantOverrides (child ID 기반) |
| `resolvers/canonical/index.ts`                       |  **368** | resolveCanonicalDocument — path-based descendants mode A/B/C 분기 P2 구현 중                                                             |
| `resolvers/canonical/storeBridge.ts`                 |  **202** | legacy Element → CanonicalNode bridge                                                                                                    |
| `panels/nodes/tree/PageTree/PageTreeItemContent.tsx` |  **125** | PageTree 아이템 렌더 — 마커 추가 위치 후보                                                                                               |
| `panels/nodes/LayersSection.tsx`                     |  **219** | LayerTree 섹션 — element row 렌더 위치                                                                                                   |
| `panels/properties/PropertiesPanel.tsx`              | **1534** | Properties 패널 전체 — override reset 버튼 위치                                                                                          |

### 1.3 P3 foundation 과의 의존 관계

- **P3-A** (`slotAndLayoutAdapter.ts`, canonical types): P4 에서 직접 소비하지 않지만 `DescendantOverride` / `RefNode` 타입이 P4-A/B 의 기반
- **P3-D** (factory ownership 제거 + canonical resolver 단일화): P4-A 의 subtree materialize 가 canonical document tree 에 노드 추가하므로 **canonical tree mutation API** 가 P3-D 이후 확정되어야 함
- **P3-E** (IndexedDB canonical 전환): P4-A/C 의 detach/reset 이 `IndexedDB.put(element)` 경유 저장하므로 persistence 경로가 안정화되어야 함. **단, P4 착수는 P3-E 완료 전에도 가능** — P3 adapter shim 을 통해 legacy path 로 저장 유지 가능 (결정 5, 옵션 C)

---

## 2. Sub-phase 분할

7건 요구사항을 **의존 그래프** 기준으로 6 sub-phase 로 분할:

```
P4-A (detach subtree materialize — semantics 핵심)
   ↓
P4-B (path-based descendants 전환 — resolver 변경)
   ↓
P4-C (override reset/revert 액션) ← 병렬 가능: P4-D (시각 마커 UI)
   ↓                                              ↓
P4-E (양방향 탐색 액션)
   ↓
P4-F (전파 미리보기)
```

**P4-A + P4-B 가 다른 모든 sub-phase 의 선결**: detach 와 path-based descendants 가 안정화되어야 마커(P4-D) 와 탐색(P4-E) 의 semantics 가 확정됨. P4-C 는 P4-B 이후 진입하나 P4-D 와 병렬 가능.

---

### 2.1 P4-A: detach subtree materialize (~3 파일)

**선결 조건**: P3-D 완료 (canonical document tree mutation API 확정)

**대상 파일**:

- `apps/builder/src/builder/stores/utils/instanceActions.ts` (134L — 전면 재작성)
- `apps/builder/src/builder/stores/utils/elementCreation.ts` (P3-B 에서 수정됨 — canonical element 생성 API 경유)
- `apps/builder/src/builder/workspace/canvas/sprites/useResolvedElement.ts` (P2 D-C 기준 — detach 후 re-resolve 방지 로직)

**현재 detach 구현 한계** (`instanceActions.ts:80-134`):

```ts
// 현재: props 병합만 (라인 121 ADR-040 주석 "props 변환만 → 구조 불변")
const detachedElement = {
  ...instance,
  props: mergedProps,
  componentRole: undefined,
  masterId: undefined,
  overrides: undefined,
  descendants: undefined,
};
// 자식 subtree 는 여전히 master 의 자식을 참조 — 독립 element 가 아님
```

**신규 구현 요구사항** (ADR §3.11 항목 ⑤):

1. **subtree materialize**: `detachInstance` 호출 시 master 의 자식 subtree 전체를 재귀 복제 + 새 id 재발급. 복제된 자식들을 instance 하위에 실제 element 로 등록.
2. **path-based descendants 적용**: P4-B 완료 후 stable id path 기반 descendants override 를 materialized 자식에 스탬프. (P4-A 단계에서는 기존 child ID 기반 방식 유지, P4-B 이후 교체)
3. **undo-able**: detach 결과 전체 (instance root + 복제 자식 전부) 가 단일 history entry 로 묶임.
4. **경고 다이얼로그**: "원본 연결이 끊기며 이후 원본 변경이 반영되지 않음" — UI 는 P4-D/E 에 위임, P4-A 는 action store 시그니처만 확정.

**신규 시그니처** (설계 제안):

```ts
interface DetachInstanceResult {
  detachedElement: Element;           // root (props merged + role/masterId/overrides/descendants cleared)
  materializedChildren: Element[];    // 복제된 자식 subtree (새 id 재발급)
  previousState: {
    instance: Element;
    legacyChildren: string[];         // 기존 childrenMap 스냅샷 (undo 복원용)
  };
}

export function detachInstance(
  get: () => ElementsState,
  set: (partial: ...) => void,
  instanceId: string,
): DetachInstanceResult | null;
```

**Sub-Gate G4-A**:

- `detachInstance` 호출 후 instance 하위에 materialized children 이 실제 element 로 존재 (grep `childrenMap.get(detachedId).length > 0`)
- detach 후 master element 는 변경 없음 (다른 instance 에 영향 없음)
- undo 후 원래 instance + 빈 children (materials 제거) 복원
- type-check PASS

**Risk**: HIGH

- canonical tree mutation API 가 P3-D 에서 확정되지 않으면 subtree 등록 경로가 불안정
- subtree id 재발급 시 DescendantOverride 의 path key 가 깨질 수 있음 → P4-B 와 시퀀스 강제
- **mitigation**: P4-A 단계에서 child ID 기반 descendants 를 **지우지 않고** path-aware descendants 로 변환은 P4-B 에서 수행. P4-A 는 subtree 등록 + descendants clear 만.

**추정 시간**: ~8h

---

### 2.2 P4-B: path-based descendants 전환 (~3 파일)

**선결 조건**: P4-A 완료 (subtree materialized element 의 id 체계 확정)

**대상 파일**:

- `apps/builder/src/utils/component/instanceResolver.ts` (212L)
- `apps/builder/src/resolvers/canonical/index.ts` (368L — resolveCanonicalDocument 의 descendants 분기)
- `apps/builder/src/resolvers/canonical/storeBridge.ts` (202L — legacy element → canonical node 변환 시 descendants key 정규화)

**현재 descendants 구현 한계** (`instanceResolver.ts:197-212`):

```ts
// 현재: child ID (runtime UUID) 기반 조회
export function resolveDescendantOverrides(childElement, instanceDescendants) {
  const overrides = instanceDescendants[childElement.id]; // ← UUID 기반
  ...
}
```

- runtime UUID 는 copy/paste/duplicate 마다 재발급 → override 가 깨짐
- canonical resolver (`index.ts:169`) 는 이미 `path 는 slash 구분 stable id path` 로 설계됨 → legacy resolver 와 semantics 불일치

**신규 구현 요구사항** (ADR §3.11 항목 ⑤ 일부, R3 mitigation):

1. **stable id path 정의**: `"header/title"` 처럼 slash 구분. 루트 기준 상대 path (master tree 기준). master 노드의 `id` 필드를 path segment 로 사용 (UUIDv4 아닌 사용자 지정 stable id — 기존 master 생성 시 결정됨).
2. **legacy UUID 기반 descendants 정규화**: storeBridge 에서 legacy `descendants[uuid]` → `descendants[stablePath]` 변환. master 노드 index 로 uuid → path 역산.
3. **resolveDescendantOverrides 교체**: child element id 대신 master 상대 path 로 override 조회.
4. **copy/paste/duplicate semantics**: path 는 master 기준 고정 → 복사본에서도 동일 path 로 override 유지됨.

**Sub-Gate G4-B**:

```bash
# legacy child-ID based descendants 참조 0건
grep -rn "instanceDescendants\[.*\.id\]\|descendants\[childElement\b" \
  apps/builder/src/ --include='*.ts' --include='*.tsx' | wc -l
```

→ 0. canonical resolver 및 legacy resolver 모두 path-based.

- copy → paste 후 override 보존 E2E 테스트 PASS
- type-check PASS

**Risk**: HIGH

- 기존 저장된 descendants (UUID key) 를 path key 로 변환 시 매핑 누락 → override 소실
- **mitigation**: storeBridge 에서 변환 실패 시 (uuid → path 역산 불가) legacy key 그대로 보존 + console.warn. P3-E DB migration 시 일괄 재변환 (P5 G5 hard condition).

**추정 시간**: ~10h

---

### 2.3 P4-C: override reset/revert 액션 (~3 파일)

**선결 조건**: P4-B 완료 (path-based descendants 확정 — path 키로 개별 override 삭제 가능)

**병렬 가능**: P4-D (시각 마커, UI layer 만 변경)

**대상 파일**:

- `apps/builder/src/builder/stores/utils/instanceActions.ts` (P4-A 에서 수정됨)
- `apps/builder/src/builder/panels/properties/PropertiesPanel.tsx` (1534L — "원본으로 복원" 버튼 추가)
- `apps/builder/src/builder/panels/properties/` 하위 신규 파일: `OverrideResetButton.tsx` 또는 인라인

**구현 요구사항** (ADR §3.11 항목 ⑥, 현재 코드베이스 0건):

1. **`resetDescendantsOverride(instanceId, path)` 신규 action**: instance 의 `descendants[path]` 키를 제거. path = undefined 이면 `descendants` 전체 clear (전체 reset).
2. **undo-able**: 이전 `descendants` 상태를 history entry 로 보존.
3. **Properties 패널 UI**:
   - override 된 필드 옆 "원본으로 복원" 버튼 (dot indicator + click → reset 단일 필드)
   - 섹션 헤더 레벨에 "모두 원본으로 복원" 버튼
   - override 여부 판정: `instance.descendants[path][fieldKey] !== undefined`

**신규 시그니처**:

```ts
// instanceActions.ts 추가
export function resetDescendantsOverride(
  get: () => ElementsState,
  set: (...) => void,
  instanceId: string,
  path?: string,        // undefined = 전체 reset
  fieldKey?: string,    // 단일 필드 reset (path 내 특정 key)
): { previousDescendants: Record<string, DescendantOverride> } | null;
```

**Sub-Gate G4-C**:

```bash
# resetDescendantsOverride 구현 존재 확인
grep -rn "resetDescendantsOverride" \
  apps/builder/src/ --include='*.ts' --include='*.tsx' | wc -l
```

→ ≥ 3 (action 정의 + store wiring + Properties 패널 호출).

- reset 후 `instance.descendants[path]` 제거 확인 (unit test)
- undo 후 override 복원 확인 (unit test)
- Properties 패널에 reset 버튼 렌더링 확인 (snapshot test)

**Risk**: MEDIUM

- 단일 필드 reset 을 위해 `descendants[path]` 내부 특정 key 만 제거할 때 나머지 key 보존 로직 필요
- PropertiesPanel.tsx 1534L — override 여부 판정을 어디서 계산할지 위치 결정 필요 (선택된 element 기준)
- **mitigation**: 전체 reset 을 먼저 구현하고 (low-risk), 필드별 reset 은 후속 commit

**추정 시간**: ~6h

---

### 2.4 P4-D: 원본/인스턴스/override 시각 마커 (~5 파일)

**선결 조건**: P4-A 완료 (detach semantics 확정) — canonical node 의 role 구분 API 가 있어야 마커 표시 가능

**병렬 가능**: P4-C (서로 다른 UI layer)

**대상 파일**:

- `apps/builder/src/builder/panels/nodes/LayersSection.tsx` (219L)
- `apps/builder/src/builder/panels/nodes/tree/PageTree/PageTreeItemContent.tsx` (125L)
- `apps/builder/src/builder/panels/designKit/components/` (DesignKit 패널 — 파일 수 미확정, ~3파일)
- `apps/builder/src/builder/workspace/canvas/skia/` (Canvas 마커 — outline/badge overlay)
- 신규: `apps/builder/src/builder/panels/nodes/markers/` (마커 컴포넌트 모듈)

**구현 요구사항** (ADR §3.11 항목 ①②③):

1. **원본 노드 마커** (`reusable: true`):
   - LayerTree: 아이템 이름 앞/뒤에 `ComponentIcon` (예: puzzle icon) + accent 색상 라벨
   - Canvas: Skia outline 색상 변화 (예: accent border) + 툴팁 "원본 컴포넌트: {name}"
   - DesignKit 패널: 기존 kit item 표시 + canonical `reusable: true` 병행 표시

2. **인스턴스 노드 마커** (`type:"ref"`):
   - LayerTree: link 아이콘 + 원본 id/name 배지
   - Canvas: dashed outline + 툴팁 "인스턴스 ({originalName})"

3. **override 노드 마커** (`descendants[path]` 에 의해 변경됨):
   - LayerTree: 부모가 ref 인 경우 자식 중 override 된 항목에 dot indicator
   - 색상 규칙: `--accent-subtle` 배경 + `--accent` dot (기존 CSS token 사용 — D3 SSOT)

**마커 판정 helper 신규**:

```ts
// panels/nodes/markers/useNodeMarkers.ts (신규)
export function useNodeRole(elementId: string): {
  isReusable: boolean;
  isInstance: boolean;
  isOverridden: boolean;
  overriddenPaths: string[];
  originalId: string | undefined;
};
```

**Sub-Gate G4-B** (시각 검증):

- `parallel-verify` skill: LayerTree + Canvas + DesignKit 에서 reusable / ref / override 노드 시각 구분 확인
- snapshot test: `PageTreeItemContent` 에서 componentRole 별 icon 렌더링 확인

**Risk**: MEDIUM

- Canvas 마커 (Skia overlay) 는 ADR-100 Unified Skia Engine 경로 — StoreRenderBridge 에 outline 색상 변수 추가 시 FPS 영향 체크 필요
- DesignKit 패널은 현재 legacy kit 모델 (복사-적용 파이프라인, R7 범위 외) — canonical `reusable: true` 와 kit item 이 중첩 표시될 경우 UX 혼동 위험
- **mitigation**: Canvas 마커는 1px outline 변화만 (기존 selection outline 패턴 재사용). DesignKit 마커는 P4 에서 LayerTree + Canvas 만 필수, DesignKit 는 P4 후속 또는 PRD 결정.

**추정 시간**: ~12h (LayerTree + Canvas = 8h, DesignKit = 4h, DesignKit 는 선택적)

---

### 2.5 P4-E: 양방향 탐색 액션 (~4 파일)

**선결 조건**: P4-A + P4-D 완료 (detach semantics 확정 + 마커 UI 존재)

**대상 파일**:

- `apps/builder/src/builder/panels/nodes/tree/PageTree/PageTreeItemContent.tsx` (125L — context menu 추가)
- `apps/builder/src/builder/panels/nodes/LayersSection.tsx` (219L — context menu 또는 action button)
- `apps/builder/src/builder/workspace/canvas/` — canvas 우클릭 context menu (파일 미확정)
- 신규: `apps/builder/src/builder/panels/nodes/markers/InstanceNavigationActions.tsx`

**구현 요구사항** (ADR §3.11 항목 ④):

1. **"원본으로 이동"** (instance 컨텍스트):
   - instance element (`type:"ref"`) 선택 시 context menu / toolbar 에 "원본으로 이동" 노출
   - 클릭 시 master element 선택 + LayerTree 스크롤 + Canvas 포커스

2. **"모든 인스턴스 보기"** (master 컨텍스트):
   - `reusable: true` element 선택 시 "이 원본을 사용하는 인스턴스 보기" 노출
   - 클릭 시 해당 master 를 ref 하는 모든 element 를 LayerTree 에 하이라이트 + multi-select
   - 구현: `elementsMap` O(1) 순회 → `element.masterId === masterId` 필터

**Sub-Gate G4-E**:

- "원본으로 이동" 클릭 → master element 가 `selectedElementIds` 에 설정됨 (unit test)
- "모든 인스턴스 보기" 클릭 → 관련 instance id 전체가 selection 에 포함됨 (unit test)
- LayerTree 에서 context menu 트리거 e2e (Chrome MCP 검증)

**Risk**: LOW

- 탐색 액션은 순수 selector + selection 변경만 — 데이터 변형 없음
- 대규모 document 에서 "모든 인스턴스 보기" 순회 비용: `elementsMap` O(n) 단순 순회, 인스턴스 수가 수백 개 미만이면 문제 없음

**추정 시간**: ~6h

---

### 2.6 P4-F: 전파 미리보기 (~3 파일)

**선결 조건**: P4-E 완료 (인스턴스 목록 탐색 인프라 확보)

**대상 파일**:

- `apps/builder/src/builder/workspace/canvas/` — canvas overlay (인스턴스 수 badge)
- `apps/builder/src/builder/panels/properties/PropertiesPanel.tsx` (1534L — 원본 편집 중 알림 배너)
- 신규: `apps/builder/src/builder/workspace/canvas/overlays/PropagationPreviewOverlay.tsx`

**구현 요구사항** (ADR §3.11 항목 ⑦):

1. **"N개 인스턴스에 반영됨" 표시 trigger**: master element (`reusable: true`) 가 선택/편집 상태일 때 활성화.
2. **표시 위치**: Properties 패널 상단 또는 Canvas overlay badge
3. **내용**: "이 원본을 사용하는 인스턴스 N개에 변경사항이 반영됩니다. 개별 인스턴스의 override 는 보존됩니다."
4. **trigger 방식**: real-time (master 선택 시 즉시) vs commit-time (편집 확정 시). → **결정 필요 (§4.4 참조)**

**Sub-Gate G4-F**:

- master element 선택 시 인스턴스 수 N 이 올바르게 표시됨 (unit test: mock elementsMap)
- 인스턴스 없는 master 는 "인스턴스 없음" 또는 배지 미표시
- FPS 영향 0 (badge 는 React layer, Skia FPS 무관)

**Risk**: LOW

- real-time trigger 방식 선택 시 master 선택 → 매 render 마다 인스턴스 수 계산. 대규모 document 에서 O(n) elementsMap 순회 → 선택 당시 1회 메모이제이션으로 충분
- **mitigation**: `useMemo([masterId, elementsMap size])` 패턴으로 변경 없으면 재계산 스킵

**추정 시간**: ~4h

---

## 3. 의존 그래프 + 일정 추정

```
P4-A (~8h, HIGH)   ─────────────────────────────────────────
   │                                                        │
   ▼                                                        ▼
P4-B (~10h, HIGH)                                   [P4-D 는 P4-A 완료 후 병렬 시작 가능]
   │                                                        │
   ▼                                                        ▼
P4-C (~6h, MED) ←── 병렬 가능 ──────────────────── P4-D (~12h, MED)
   │                                                        │
   └────────────────────────┬───────────────────────────────┘
                            ▼
                     P4-E (~6h, LOW)
                            │
                            ▼
                     P4-F (~4h, LOW)
```

| Sub-phase | 의존        | 병렬 가능 with | 추정 시간 | 위험 |
| --------- | ----------- | -------------- | --------- | :--: |
| **P4-A**  | P3-D 완료   | —              | ~8h       | HIGH |
| **P4-B**  | P4-A        | —              | ~10h      | HIGH |
| **P4-C**  | P4-B        | P4-D           | ~6h       | MED  |
| **P4-D**  | P4-A        | P4-C           | ~12h      | MED  |
| **P4-E**  | P4-A + P4-D | —              | ~6h       | LOW  |
| **P4-F**  | P4-E        | —              | ~4h       | LOW  |
| **total** |             |                | **~46h**  |      |

**권장 PR 분할**:

- PR-1: P4-A (detach subtree materialize — 단독, HIGH)
- PR-2: P4-B (path-based descendants — 단독, HIGH)
- PR-3: P4-C + P4-D 병렬 worktree → 통합 merge (MED + MED)
- PR-4: P4-E + P4-F (LOW + LOW, 단일 PR 가능)

---

## 4. 결정 사항

### 4.1 detach 액션의 정확한 signature

**배경**: 현재 `detachInstance` 는 반환값이 `{ previousState: Element } | null` (root 1개). 신규 구현은 복제 자식 subtree 전체를 반환해야 한다.

**선택지**:

#### 옵션 A — 반환값 확장 (권고)

```ts
interface DetachInstanceResult {
  detachedElement: Element;
  materializedChildren: Element[]; // 복제 subtree 플랫 배열
  previousState: Element; // root undo 용
  previousChildrenSnapshot: string[]; // children id list undo 용
}
```

- 기존 호출자는 `result.detachedElement` + `result.previousState` 만 사용 — 하위 호환 유지
- 위험: LOW

#### 옵션 B — 별도 `detachWithMaterialize` 함수 추가

- 기존 `detachInstance` 는 props-only 구현 유지 (하위 호환)
- 새 함수가 전체 semantics 담당
- 위험: MED (두 함수의 의미 혼재)

**권고**: **옵션 A** — 반환값 확장. 기존 호출자 수 적음 (lib/db/types.ts history type 만), 하위 호환 유지.

**사용자 결정 필요 여부**: 낮음. 옵션 A 로 즉시 진행 가능.

---

### 4.2 override reset 의 granularity

**배경**: Properties 패널의 "원본으로 복원" 버튼을 어느 수준까지 세밀하게 제공할 것인가.

**선택지**:

| 수준            | 설명                                    | 구현 복잡도 | UX                |
| --------------- | --------------------------------------- | :---------: | ----------------- |
| 전체 reset      | `descendants` 전체 clear                |     LOW     | 단순, 세밀도 낮음 |
| path 단위 reset | `descendants[path]` 하나 clear          |     LOW     | section 단위 복원 |
| 필드 단위 reset | `descendants[path][fieldKey]` 하나 제거 |     MED     | 최세밀, 복잡한 UI |

**권고**: **path 단위 + 전체 reset 을 P4 에서 구현**, 필드 단위 reset 은 P4 후속으로 defer. 이유: 필드 단위는 `descendants` 내부 partial update 로직 추가 + Properties 패널의 per-field override indicator UI 가 필요하여 P4 scope 과중.

**사용자 결정 필요 여부**: 낮음. path + 전체 reset 으로 즉시 진행 가능.

---

### 4.3 시각 마커 위치 (LayerTree 만 vs 3곳 동시)

**배경**: ADR §3.11 은 "LayerTree / Canvas / DesignKit 패널" 3곳 모두 요구. P4 에서 3곳 동시 구현 vs 단계 구현.

**선택지**:

#### 옵션 A — LayerTree + Canvas 우선, DesignKit P4 후속

- P4 에서 LayerTree + Canvas 필수 구현 (~8h)
- DesignKit 는 R7 (DesignKit migration track 분리) 에 따라 별도 처리 가능
- 위험: LOW

#### 옵션 B — 3곳 동시 (ADR §3.11 문자 그대로)

- P4-D 시간 +4h (DesignKit 패널 마커 추가)
- DesignKit 는 legacy kit 복사-적용 파이프라인 → canonical `reusable: true` 와 overlap 구분 필요
- 위험: MED (DesignKit 복잡성 추가)

**권고**: **옵션 A** — G4 통과 조건에서 DesignKit 는 "LayerTree + Canvas 구현 후 DesignKit P4+1 sprint" 로 scope 조정. ADR R7 mitigation 과 정합.

**사용자 결정 필요**: **결정 필요** — G4 통과 조건에서 DesignKit 마커를 P4 필수로 볼지 여부. 필수라면 P4-D 추정 시간 +4h, PR-3 분량 증가.

---

### 4.4 전파 미리보기의 trigger 방식

**배경**: master element 편집 시 "N개 인스턴스에 반영됨" 표시를 언제 보여줄 것인가.

**선택지**:

| 방식                | 설명                               | UX                             | 구현 복잡도 |
| ------------------- | ---------------------------------- | ------------------------------ | :---------: |
| **real-time**       | master 가 선택될 때 즉시 표시      | 상시 가시성, 알림 피로 가능    |     LOW     |
| **commit-time**     | 편집 확정(blur/enter) 시점 표시    | 맥락 명확, 짧은 편집에 무반응  |     MED     |
| **hover-on-master** | master element hover 시 badge 표시 | 방해 최소, 클릭 없이 확인 가능 |     LOW     |

**권고**: **real-time** (master 선택 시 즉시). 이유:

1. Figma/Sketch 등 업계 표준이 "컴포넌트 선택 시 상단 배너" 방식
2. commit-time 은 "편집했는데 반영 안 됐나?" 혼동 가능
3. 구현이 가장 단순 — `useEffect([selectedElementId])` 트리거

**사용자 결정 필요 여부**: 낮음. real-time 으로 즉시 진행 가능. UX preference 가 있으면 명시.

---

## 5. Gates

### G4 (ADR 본문 인용)

ADR-903 §Gates G4 통과 조건 (전문):

> (a) copy/paste, duplicate, detach, delete, slot assign, undo/redo가 id/path + ref/slot semantics 기준으로 회귀 0건
> (b) 원본/인스턴스/override UI-UX 5요소 land 완료 — ① LayerTree/Canvas/DesignKit 에서 reusable/ref/override 각각 고유 시각 마커 ② 원본↔인스턴스 양방향 탐색 액션 ③ detachInstance UI 연결 + 경고 다이얼로그 ④ resetDescendantsOverride 신규 구현 + Properties 패널 "원본으로 복원" ⑤ 원본 편집 시 "N개 인스턴스 영향" 미리보기
> (c) detach/reset override 모두 undo 복구 가능
> (d) 관련 연산/UI 단위 테스트 추가

### P4 sub-phase 별 Gate

| Gate | 시점      | 통과 조건                                                                 | 측정 명령                                                   |
| ---- | --------- | ------------------------------------------------------------------------- | ----------------------------------------------------------- |
| G4-A | P4-A 완료 | detach 후 materializedChildren 존재 + master 불변 + undo PASS             | `childrenMap.get(detachedId).length > 0` unit test          |
| G4-B | P4-B 완료 | legacy child-ID descendants 참조 0건 + copy-paste override 보존 E2E       | `grep -rn "instanceDescendants\[.*\.id\]" src/ → 0`         |
| G4-C | P4-C 완료 | `resetDescendantsOverride` ≥ 3 호출 사이트 + Properties 패널 버튼 존재    | `grep -rn "resetDescendantsOverride" src/ → ≥3`             |
| G4-D | P4-D 완료 | LayerTree + Canvas 에서 reusable/ref/override 마커 `parallel-verify` PASS | Chrome MCP parallel-verify skill                            |
| G4-E | P4-E 완료 | 탐색 액션 unit test PASS + LayerTree context menu e2e                     | `grep -rn "navigateToOriginal\|showAllInstances" src/ → ≥3` |
| G4-F | P4-F 완료 | 전파 미리보기 N 표시 unit test PASS + FPS 무영향 확인                     | `usePropagationPreview` unit test                           |

**G4 최종 통과 (G4-A~F 전부 + ADR 본문 조건 a~d)**:

```bash
# (a) 회귀 검증
pnpm vitest run apps/builder/src/resolvers/canonical/__tests__/

# (c) undo 검증
pnpm vitest run apps/builder/src/builder/stores/__tests__/instanceActions.test.ts

# (d) 전체 type-check
pnpm type-check
```

---

## 6. 회귀 검증 매트릭스

| 검증 항목                                     | 위치                                                    | sub-phase |
| --------------------------------------------- | ------------------------------------------------------- | :-------: |
| detach subtree materialize + undo 복원        | `stores/__tests__/instanceActions.test.ts`              |   P4-A    |
| detach 후 master element 불변                 | 同                                                      |   P4-A    |
| path-based descendants copy-paste 보존        | `resolvers/canonical/__tests__/resolver.test.ts`        |   P4-B    |
| legacy UUID descendants → path 변환 등가성    | `resolvers/canonical/__tests__/storeBridge.test.ts`     |   P4-B    |
| resetDescendantsOverride 단위 (path / 전체)   | `stores/__tests__/instanceActions.test.ts`              |   P4-C    |
| Properties 패널 "원본으로 복원" 버튼 렌더링   | `panels/properties/__tests__/PropertiesPanel.test.tsx`  |   P4-C    |
| LayerTree reusable/ref/override 마커 snapshot | `panels/nodes/__tests__/LayerSection.test.tsx`          |   P4-D    |
| Canvas outline 색상 FPS 무영향                | manual verify (60fps target)                            |   P4-D    |
| "원본으로 이동" selection 변경                | `panels/nodes/__tests__/InstanceNavigation.test.ts`     |   P4-E    |
| "모든 인스턴스 보기" multi-select 포함        | 同                                                      |   P4-E    |
| 전파 미리보기 N 계산                          | `workspace/canvas/__tests__/PropagationPreview.test.ts` |   P4-F    |
| canonical resolver E2E PASS (G4-A 기준)       | `resolvers/canonical/__tests__/integration.test.ts`     |   전체    |

---

## 7. P5 와의 의존 관계

### P4 → P5 (Persistence 전환)

| P4 산출물                         | P5 의존 여부 | 근거                                                                                                                                                                |
| --------------------------------- | :----------: | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| detach subtree materialize (P4-A) |   **의존**   | 복제된 자식 element 들이 IndexedDB 에 canonical schema 로 저장되어야 함. P3 adapter shim 으로 임시 가능하나 P5 DB schema 전환 전까지는 legacy layout_id 컬럼이 혼재 |
| path-based descendants (P4-B)     |   **의존**   | `descendants[pathKey]` 가 DB 에 저장될 때 path key 가 stable 해야 함. P5 migration script 에서 기존 UUID-key descendants → path-key 일괄 변환 필요                  |
| override reset (P4-C)             |     낮음     | reset 은 기존 element 의 descendants 필드 변경 — P3 adapter shim 으로 충분                                                                                          |
| 시각 마커 (P4-D)                  |     없음     | UI layer 만, persistence 무관                                                                                                                                       |
| 탐색 액션 (P4-E)                  |     없음     | selection 변경만, persistence 무관                                                                                                                                  |
| 전파 미리보기 (P4-F)              |     없음     | read-only 계산, persistence 무관                                                                                                                                    |

**결론**: P4-A (subtree materialize) + P4-B (path-based descendants) 가 P5 의 DB migration script 에 직접 영향. P5 는 P4-B 완료 후 진입 권장 (path key 체계가 P5 migration target 이 됨).

### adapter shim lifecycle (P3 decisions.md 결정 5 연계)

```
P4-A~F 완료 (G4 통과)
   → adapter shim 제거 착수 (P3 decisions.md §결정5 옵션 C)
   → P5 IndexedDB canonical schema 전환 진입
   → G5: legacy layout API 최종 0건
```

---

## 8. 후속 Phase 와의 관계

- **P5 (Persistence)**: P4-B path-based descendants 완결 → P5 migration script 의 `descendants[uuid]` → `descendants[path]` 변환 batch 가능. P4-A subtree materialize 로 생성된 element 들의 DB 저장 경로 canonical 전환.
- **G5 측정**: P4-F 이후 시점에 `adapter shim 제거 → G5` 진입 순서.
- **ADR-063 D1/D2/D3 비침범**: P4 의 모든 작업은 D1 (RAC DOM), D2 (RSP Props), D3 (Spec 시각) 를 직접 수정하지 않음. 시각 마커 (P4-D) 는 D3 CSS token (`--accent-subtle`, `--accent`) 을 소비하나 신규 Spec 추가 없음 — D3 SSOT 준수.

---

## 9. 리스크 요약

| Sub-phase | 위험 | 주요 risk                                                                          | mitigation                                               |
| --------- | :--: | ---------------------------------------------------------------------------------- | -------------------------------------------------------- |
| P4-A      | HIGH | canonical tree mutation API P3-D 의존 + subtree id 재발급 시 descendants path 깨짐 | P4-A 완료 후 descendants clear, path 변환은 P4-B         |
| P4-B      | HIGH | 기존 UUID-key descendants 저장 데이터 override 소실                                | storeBridge 변환 실패 시 legacy key 보존 + P5 batch 변환 |
| P4-C      | MED  | PropertiesPanel.tsx 1534L 수정 위치 선정 + 단일 필드 partial update 복잡도         | 전체 reset 우선, 필드 단위 defer                         |
| P4-D      | MED  | Canvas Skia outline 추가 FPS 영향 + DesignKit 마커 legacy kit 혼재                 | outline 최소화, DesignKit 마커 scope 조정 (§4.3)         |
| P4-E      | LOW  | elementsMap O(n) 순회 (대규모 document)                                            | 선택 당시 1회 memo                                       |
| P4-F      | LOW  | real-time trigger O(n) 재계산                                                      | useMemo deps 최소화                                      |

**HIGH 위험 sub-phase: P4-A / P4-B** — 이 두 sub-phase 는 별도 worktree 에서 진행 권장 (P3-D 와 동일 패턴).

---

## 부록: G4 baseline 측정 명령

```bash
# (1) 시각 마커 구현 여부 (0 = 미구현)
grep -rn "componentRole.*marker\|reusable.*marker\|useNodeRole\|isReusableNode" \
  apps/builder/src/ --include='*.ts' --include='*.tsx' | wc -l

# (2) override reset 구현 여부 (0 = 미구현)
grep -rn "resetDescendantsOverride" \
  apps/builder/src/ --include='*.ts' --include='*.tsx' | wc -l

# (3) path-based descendants 참조 현황
grep -rn "instanceDescendants\[.*\.id\]" \
  apps/builder/src/ --include='*.ts' --include='*.tsx' | wc -l

# (4) detach UI 연결 (0 = 미구현)
grep -rn "detachInstance" \
  apps/builder/src/ --include='*.ts' --include='*.tsx' \
  | grep -v "instanceActions.ts" | wc -l

# (5) 전파 미리보기 (0 = 미구현)
grep -rn "PropagationPreview\|affectedInstances\|instanceCount" \
  apps/builder/src/ --include='*.ts' --include='*.tsx' | wc -l
```

2026-04-25 baseline 실측: ①=0 / ②=0 / ③=1 (instanceResolver.ts 내부) / ④=0 / ⑤=0
