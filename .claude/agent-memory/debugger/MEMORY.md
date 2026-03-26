# Debugger Agent Memory

## 해결된 주요 버그 패턴

(디버깅 세션에서 발견한 근본 원인 패턴을 기록)

## 자주 발생하는 근본 원인

- **layoutVersion 누락**: 레이아웃 영향 props 변경 시 `layoutVersion + 1` 미증가 → 캔버스 크기 미반영
- **stale closure**: setTimeout/queueMicrotask 내에서 외부 캡처된 상태 사용 → `get()`으로 최신 참조 필수
- **childrenMap staleness**: props 변경 시 갱신 안 됨 → `elementsMap`에서 최신 조회 필수
- **CanvasKit 큰 width 렌더링 실패**: `paragraph.layout(100000)` 이상 → 텍스트 미표시 (silent fail)

## 디버깅 도구 경로

- Skia 렌더러: `apps/builder/src/builder/workspace/canvas/skia/nodeRenderers.ts`
- 레이아웃 엔진: `apps/builder/src/builder/workspace/canvas/skia/fullTreeLayout.ts`
- 상태 관리: `apps/builder/src/builder/stores/`
- 이벤트 핸들링: `apps/builder/src/builder/workspace/canvas/hooks/`
