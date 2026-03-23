# Workspace Selection Drag Breakdown

## Purpose

이 문서는 [ADR-043](../adr/043-selection-drag-alignment.md)을 실행 가능한 작업 단위로 분해한 상세 플랜이다.
이 문서가 실제 구현 기준 문서이며, ADR은 결정과 제약만 유지한다.

목표는 다음과 같다.

- Pencil 스타일 selection drag lifecycle을 XStudio에 이식
- PixiJS 인터랙션과 Skia 렌더 좌표를 분리
- drag start vacate, adjacent insertion, guide line fallback을 명시적 규칙으로 고정
- 기존 요소 트리 이동 기능과 충돌하지 않게 구현 경계를 분리

---

## 핵심 전제

### Source of Truth

이 기능에서 **드롭 타겟 탐색과 삽입 위치 계산의 기준은 Skia-derived bounds**다.

- PixiJS는 pointer event와 hit shell 역할만 한다.
- Skia는 실제 렌더된 요소의 위치와 크기를 제공한다.
- selection box는 Pixi로 이벤트를 받고, 실제 판단은 Skia bounds로 한다.

### 주요 동작

Pencil과 동일하게 아래 3가지를 지원해야 한다.

1. 드래그 시작 시 아이템이 원래 위치에서 즉시 빠져나간 것처럼 보인다.
2. 인접 요소 사이에 가까워지면 부드럽게 그 사이로 삽입된다.
3. 인접하지 않은 위치에서는 guide line이 나타나 drop 위치를 유도한다.

---

## Phase별 현황

| Phase | 설명 | 위험 | 주요 목표 |
| :---: | ---- | :--: | -------- |
| 0 | Baseline & Interaction Contract | L | 좌표/히트/렌더 경계 정의 |
| 1 | Drag Session & Vacate | M | drag start vacate, deferred commit |
| 2 | Skia Bounds Hit Test | M | Skia-derived drop target 탐색 |
| 3 | Adjacent Insertion & Guide Line | H | insertion index + guide rendering |
| 4 | Commit Path & Tree Interop | M | move/reorder/reparent commit |
| 5 | Verification & Regression Gates | L | 시나리오 검증, 회귀 방지 |

---

## Execution Strategy

### 의존 관계

```text
Phase 0
  ├─→ Phase 1 (drag lifecycle)
  ├─→ Phase 2 (Skia bounds hit test)
  │         └─→ Phase 3 (adjacent insertion / guide line)
  └─→ Phase 4 (commit path)
                     └─→ Phase 5 (verification)
```

### 실행 원칙

1. **Phase 0 먼저**
   - 좌표계와 hit-test 기준을 문서화하지 않으면, Pixi/Skia mismatch를 다시 만들 가능성이 높다.
2. **visual state와 store commit 분리**
   - drag 중 store mutation 금지
   - drop 시점에만 commit
3. **Skia bounds 우선**
   - 드롭 타겟, insertion index, guide line 모두 Skia geometry 기반
4. **tree interop 분리**
   - selection drag는 tree reorder/reparent의 한 경로일 뿐, 기존 tree move를 대체하지 않는다.
5. **phase당 1커밋**
   - 문제 발생 시 해당 phase만 rollback 가능해야 한다.

---

## Phase 0. Baseline & Interaction Contract

### 목표

- drag / drop / guide line의 책임 경계 확정
- 좌표 변환 체계와 geometry source of truth 문서화

### 확인 대상

- `SelectionLayer` / `SelectionBox`
- `BuilderCanvas` central pointer handlers
- `elementRegistry` / `Skia selection renderer`
- `dropIndicatorRenderer`

### 계약 정의

| 항목 | 책임 |
| ---- | ---- |
| pointer start | PixiJS selection shell |
| pointer delta | canvas scene-local delta |
| geometry lookup | Skia-derived bounds |
| visual offset | transient render state |
| commit | store action / history |

### 검증 포인트

- Pixi-only bounds를 쓰지 않는다는 사실이 문서로 명시됨
- drag start와 commit 시점이 분리됨
- guide line은 insertion candidate가 없을 때만 fallback으로 표시됨

---

## Phase 1. Drag Session & Vacate

### 목표

- selection drag 시작 시 아이템이 원래 위치에서 빠져나간 것처럼 보이는 상태를 만든다.

### 구현 포인트

1. pointerdown에서 drag session snapshot 생성
2. 선택 항목의 visual offset을 transient하게 적용
3. store mutation 없이 selection shell만 이동
4. pointerup/cancel에서 snapshot 정리

### 예상 작업 파일

- `apps/builder/src/builder/workspace/canvas/selection/SelectionBox.tsx`
- `apps/builder/src/builder/workspace/canvas/skia/nodeRendererTree.ts`
- `apps/builder/src/builder/workspace/canvas/skia/renderCommands.ts`
- `apps/builder/src/builder/workspace/canvas/skia/selectionRenderer.ts`

### 검증 포인트

- drag 시작 시 item이 즉시 빠져나간 것처럼 보임
- cancel 시 원위치 복귀
- single selection과 multi selection 모두 drag session을 공유

---

## Phase 2. Skia Bounds Hit Test

### 목표

- drop target 탐색을 Pixi display object가 아니라 Skia bounds로 수행한다.

### 구현 포인트

1. rendered bounds를 기준으로 hover/drop candidate 수집
2. candidate의 parent/children 관계를 사용해 insertion index 계산
3. Skia bounds가 없으면 fallback하지 말고 안전하게 no-target 처리

### 예상 작업 파일

- `apps/builder/src/builder/workspace/canvas/elementRegistry.ts`
- `apps/builder/src/builder/workspace/canvas/hooks/useCanvasDragDropHelpers.ts`
- `apps/builder/src/builder/workspace/canvas/skia/dropIndicatorRenderer.ts`
- `apps/builder/src/builder/workspace/canvas/skia/renderCommands.ts`

### 검증 포인트

- 렌더된 위치와 drop candidate가 일치
- Pixi display object bounds와 달라도 잘못된 drop target을 만들지 않음
- page offset / zoom / pan이 반영된 scene-local 기준이 유지됨

---

## Phase 3. Adjacent Insertion & Guide Line

### 목표

- 인접 요소 사이로 들어가면 부드러운 insertion, 비인접이면 guide line을 보여준다.

### 구현 포인트

1. candidate가 인접 범위인지 판정
2. 인접이면 insertion index를 갱신
3. 인접하지 않으면 guide line state를 활성화
4. guide line은 tree insertion candidate가 없음에도 drop 가능 영역을 설명해야 한다

### 설계 규칙

| 상황 | UI 반응 | 상태 |
| ---- | ------- | ---- |
| 인접 요소 사이 | item이 slot으로 흘러들어감 | insertion candidate active |
| 비인접 위치 | guide line만 표시 | guide-only |
| 유효 target 없음 | 아무 삽입도 하지 않음 | inactive |

### 검증 포인트

- adjacent insertion 시 시각적으로 끊기지 않음
- guide line은 drop 가능 위치를 오해 없이 보여줌
- tree reorder와 guide line의 상태가 충돌하지 않음

---

## Phase 4. Commit Path & Tree Interop

### 목표

- drop 시점에만 실제 store mutation을 수행하고, tree reorder/reparent와 selection move를 정리한다.

### 커밋 규칙

1. move commit은 선택된 element에만 적용
2. absolute/relative/auto 등 layout contract가 다른 요소는 별도 처리
3. reparent/reorder가 필요하면 insertion index를 함께 commit
4. guide line fallback 상태는 commit 전에 해제

### 예상 작업 파일

- `apps/builder/src/builder/workspace/canvas/selection/SelectionBox.tsx`
- `apps/builder/src/builder/stores/utils/elementUpdate.ts`
- `apps/builder/src/builder/workspace/canvas/hooks/useCanvasDragDropHelpers.ts`
- `apps/builder/src/builder/workspace/canvas/hooks/useCentralCanvasPointerHandlers.ts`

### 검증 포인트

- store는 drop 시점에만 갱신됨
- history entry는 단일 commit으로 남음
- tree move와 selection move가 중복 commit되지 않음

---

## Phase 5. Verification & Regression Gates

### 수동 검증 시나리오

1. 단일 요소를 드래그하면 원래 위치에서 즉시 빠져나가는지 확인
2. 인접 요소 사이로 들어갈 때 insertion preview가 자연스럽게 바뀌는지 확인
3. 비인접 위치에서는 guide line이 나타나는지 확인
4. drop 후 실제 store 위치가 Skia 렌더 위치와 일치하는지 확인
5. cancel 시 원복되는지 확인
6. multi selection에서 상대 위치가 유지되는지 확인

### 회귀 게이트

- Pixi-only hit test 복귀 금지
- Skia bounds 없는 drop target 계산 금지
- drag 중 store mutation 금지
- guide line과 insertion preview가 동시에 active일 때 우선순위 명시

---

## Open Design Questions

1. multi selection에서 insertion preview를 group-wide로 할지, 대표 anchor 중심으로 할지
2. absolute positioned element와 flow/layout element의 drop semantics를 동일하게 볼지
3. guide line의 스타일을 selection renderer와 완전히 분리할지
4. parent insertion과 sibling reorder를 같은 resolver로 다룰지
