# Reviewer Agent Memory

## 빈출 이슈 패턴

- [LayoutRenderers N+1 탐색](patterns/layout-renderers-n1.md) — 신규 렌더러마다 elements.filter() 반복, childrenMap 미사용
- [Spec shapes TokenRef 캐스팅](patterns/spec-token-cast.md) — `as unknown as number`로 TokenRef를 숫자로 캐스팅, resolveToken() 미호출
- PixiJS 제거 시 인라인 타입 재선언 — Container stub(`selectionModel.ts:1-7`)이 `elementRegistry.ts`의 `unknown` 반환 타입과 불일치 → `as any` 캐스트 유발. cullingCache.ts에서 동일 형상 인라인 캐스트 중복. 해결: Container 타입을 shared export 후 registry 반환 타입에 적용
- [PixiJS 제거 후 getElementContainer dead code](patterns/pixi-removal-dead-code.md) — elementRegistry는 Phase 9+ 이후 항상 빈 Map. getElementContainer 참조하는 분기(cullingCache/useViewportCulling/selectionModel)는 실행 불가, SpatialIndex culling 무력화 포함

## False Positive 기록

없음

## 프로젝트 컨벤션 예외

없음
