# Debugger Agent Memory

## 해결된 주요 버그 패턴

### 테마 스위치 Skia body 미반영 (2026-04-24)

- **증상**: ThemesPanel에서 light→dark 토글 시 Skia page body 배경 미변경. 새로고침 후 정상.
- **근본 원인**: `getCachedCommandStream` 캐시가 `registryVersion`을 키로 사용하는데, `StoreRenderBridge.fullRebuild`는 `body` 요소의 SkiaNodeData를 매번 새 객체로 재생성함 → `registerSkiaNode`에서 `oldData !== data` → `registryVersion++` → 캐시 bust가 **정상 작동**하는 것처럼 보임. 그러나 `getCachedCommandStream`은 registryVersion을 캐시 무효화 키로만 쓰고, 실제로 Skia fill color를 결정하는 것은 `buildRenderCommandStream`의 `visitElement` → `getSkiaNode` → 노드의 fill/backgroundColor임. 즉 레지스트리 업데이트 자체는 되지만, ADR-902 이후 clearFrame이 투명 clear로 바뀌면서 구 body fill이 노출되던 문제가 드러남.
- **실제 끊어지는 위치**: ADR-902 이전에는 `clearFrame()`이 `this.backgroundColor`(불투명 배경색)으로 전체를 덮었으므로 body SkiaNodeData의 fill 색상이 틀려도 화면이 올바르게 보였음. ADR-902 이후 투명 clear로 전환되면서 실제 SkiaNodeData의 fill 색상이 노출됨.

## 자주 발생하는 근본 원인

- **layoutVersion 누락**: 레이아웃 영향 props 변경 시 `layoutVersion + 1` 미증가 → 캔버스 크기 미반영
- **stale closure**: setTimeout/queueMicrotask 내에서 외부 캡처된 상태 사용 → `get()`으로 최신 참조 필수
- **childrenMap staleness**: props 변경 시 갱신 안 됨 → `elementsMap`에서 최신 조회 필수
- **CanvasKit 큰 width 렌더링 실패**: `paragraph.layout(100000)` 이상 → 텍스트 미표시 (silent fail)
- **opaque clearFrame이 Skia fill 버그를 숨김**: clearFrame이 불투명 배경색으로 클리어하면 SkiaNodeData fill 색상 오류가 시각적으로 드러나지 않음 → ADR-902처럼 투명 clear로 바꾸면 숨겨진 버그가 드러남

## 디버깅 도구 경로

- Skia 렌더러: `apps/builder/src/builder/workspace/canvas/skia/nodeRenderers.ts`
- 레이아웃 엔진: `apps/builder/src/builder/workspace/canvas/skia/fullTreeLayout.ts`
- 상태 관리: `apps/builder/src/builder/stores/`
- 이벤트 핸들링: `apps/builder/src/builder/workspace/canvas/hooks/`
- body 테마 override: `apps/builder/src/builder/workspace/canvas/skia/buildBoxNodeData.ts:57-67`
- StoreRenderBridge sync/fullRebuild: `apps/builder/src/builder/workspace/canvas/skia/StoreRenderBridge.ts:159-391`
- registryVersion: `apps/builder/src/builder/workspace/canvas/skia/useSkiaNode.ts:31-40`
- commandStream 캐시: `apps/builder/src/builder/workspace/canvas/skia/renderCommands.ts:209-243`
