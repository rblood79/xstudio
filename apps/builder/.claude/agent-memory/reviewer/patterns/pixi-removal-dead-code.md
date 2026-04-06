---
name: PixiJS 제거 후 getElementContainer dead code
description: Phase 9 PixiJS 제거 이후 elementRegistry가 항상 빈 Map이므로 getElementContainer 참조 분기는 모두 dead code
type: project
---

Phase 9 PixiJS 제거 이후 `elementRegistry`(module-level Map)는 어디서도 `registerElement()`가 호출되지 않아 항상 빈 Map 상태.

**영향 파일 (2026-04-06 기준)**:

- `cullingCache.ts` — `getCachedTopLevelCandidateIds`의 container getBounds/try-catch 분기 (122-147행) dead code
- `useViewportCulling.ts` — SPATIAL_INDEX 경로의 `!getElementContainer(el.id)` 조건이 항상 true → SpatialIndex culling 효과 무효화
- `selectionModel.ts` — `getContainer` / `getCameraLocalPosition` 분기 (136-149행) dead code, `BuilderCanvas.tsx`에서 `as any` 캐스트 유발

**Why**: Phase 9에서 PixiJS EventBoundary를 제거하면서 registerElement 호출부가 함께 제거됐으나 소비 측 코드가 잔존.

**How to apply**: getElementContainer를 참조하는 모든 조건 분기를 확인. 특히 SPATIAL_INDEX 경로의 filter 조건에서 `|| !getElementContainer(el.id)` 제거가 culling 성능 복원에 필수.
