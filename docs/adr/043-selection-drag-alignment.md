# ADR-043: Selection Drag Alignment - Pencil 패턴 기반 선택 이동 정렬

## Status

Proposed

## Date

2026-03-24

## Decision Makers

XStudio Team

## Related ADRs

- [ADR-003](completed/003-canvas-rendering.md): PixiJS Canvas Rendering
- [ADR-035](completed/035-workspace-canvas-refactor.md): Workspace Canvas Runtime Refactor
- [ADR-037](completed/037-workspace-scene-runtime-rearchitecture.md): Workspace Scene Runtime Rearchitecture
- [ADR-039](completed/039-page-scoped-rendering.md): Multi-page Canvas Page-Scoped Rendering
- [ADR-040](completed/040-visible-page-delta-runtime.md): Visible Page + Delta Runtime
- [Workspace Selection Drag Breakdown](/Users/admin/work/xstudio/docs/design/workspace-selection-drag-breakdown.md): 실행 설계

## Context

XStudio의 selection drag는 이미 구현되어 있지만, Pencil의 동작 패턴과 완전히 일치하지는 않는다.

핵심 차이는 다음과 같다.

- 드래그 중에는 아이템이 원래 자리에서 빠져나간 것처럼 보인다.
- 인접 요소 사이에서는 부드러운 insertion이 일어난다.
- 비인접 위치에서는 guide line이 drop 위치를 유도한다.
- 렌더된 요소의 실제 위치는 PixiJS가 아니라 Skia-derived bounds가 기준이다.
- Pixi-only hit test로는 렌더 좌표와 이벤트 영역이 어긋날 수 있다.

## Decision

선택 이동은 `deferred commit`으로 처리한다.

- drag 중에는 visual state만 갱신한다.
- drop 시점에만 store commit을 수행한다.
- drop target 탐색과 insertion 판단은 Skia-derived bounds를 기준으로 한다.
- adjacent insertion과 guide line 규칙은 구현 설계 문서에서 관리한다.

## Consequences

- 선택 이동과 tree reorder/reparent의 책임 경계가 명확해진다.
- PixiJS와 Skia의 좌표 차이를 명시적으로 다룰 수 있다.
- 구현 세부가 자주 바뀔 수 있으므로, phase 단위 설계 문서와 함께 유지해야 한다.

## Gates

구현 phase에 들어가기 전 다음이 확인되어야 한다.

- drag start, drag move, drop commit이 분리되어 있다.
- drop target 판정이 Skia bounds 기준이다.
- guide line과 insertion preview의 우선순위가 설계 문서에 정의되어 있다.

## Reference

세부 구현 phase, 파일 경계, 검증 시나리오는 [Workspace Selection Drag Breakdown](/Users/admin/work/xstudio/docs/design/workspace-selection-drag-breakdown.md)를 따른다.

