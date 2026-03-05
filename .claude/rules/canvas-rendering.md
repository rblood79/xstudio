---
description: Canvas/Skia/PixiJS 렌더링 관련 파일 작업 시 적용
globs:
  - "apps/builder/src/builder/canvas/**"
  - "packages/specs/**"
  - "**/nodeRenderers*"
  - "**/ElementSprite*"
---

# Canvas 렌더링 규칙

## Dual Renderer (Skia + PixiJS)

- **Skia**: 실제 화면 렌더러 (nodeRenderers.ts)
- **PixiJS**: 이벤트 전용 (alpha=0), EventBoundary 히트 테스트
- PixiJS만 수정하면 시각적 변화 없음 → **Skia도 반드시 수정**
- CanvasKit `heightMultiplier`에 `halfLeading: true` 필수 (CSS line-height 상하 균등 분배)

## DirectContainer 패턴

- 엔진 계산 결과(x/y/w/h)를 직접 배치 — @pixi/layout 제거됨
- layout 속성이 아닌 엔진 결과값으로 위치 설정

## Component Spec

- Spec shapes 내 숫자 연산에 TokenRef 값을 직접 사용 금지 → `resolveToken()` 변환 필수
- `_hasChildren` 체크 패턴 필수: 배경/테두리 shapes 직후, standalone 콘텐츠 shapes 직전에 배치
- Child Spec 추가 시 `packages/specs/src/index.ts` + `components/index.ts` 양쪽에 export 후 `pnpm build:specs`
- `TAG_SPEC_MAP`에 해당 태그의 Spec 등록 필수

## TextMeasurer ↔ nodeRenderers 동기화 (필수)

ParagraphStyle 변경 시 **측정기 + 렌더러 양쪽 동시 업데이트** 필수 (3곳):

1. `canvaskitTextMeasurer.ts` — measureWidth() + measureWrapped()
2. `nodeRenderers.ts` — renderText()
3. `TextMeasureStyle` 인터페이스 — 필드 추가 시

### strutStyle (CSS line-height 정합성)

- `heightMultiplier > 0` (lineHeight 명시) 시 strutStyle 활성화
- `forceStrutHeight: true` — CSS처럼 line-height를 줄 높이로 강제
- 측정기와 렌더러에 **완전히 동일한 strutStyle** 적용 필수

### Paragraph API 사용 규칙

- 실제 콘텐츠 폭: `getLongestLine()` (fit-content/auto 계산용)
- max-content: `getMaxIntrinsicWidth()` (줄바꿈 없는 전체 폭)
- min-content: `getMinIntrinsicWidth()` (가장 긴 단어 폭)
- `getMaxWidth()` 사용 금지 — layout 제약 폭을 그대로 반환하므로 콘텐츠 폭과 무관

### 측정 결과 캐싱

- WASM Paragraph 객체 캐싱 금지 (GC 대상 아님 → 메모리 누수)
- 결과값 `{ width, height }` 만 LRU 캐싱 (canvaskitTextMeasurer.ts)
- FontMgr 교체 시 캐시 자동 clear
- 렌더러의 Paragraph LRU 캐시(nodeRenderers.ts)와 별도 — 목적이 다름 (렌더 vs 측정)

## registryVersion 캐싱

- LayoutContainer 'layout' 이벤트에서 `notifyLayoutChange()` 무조건 호출
