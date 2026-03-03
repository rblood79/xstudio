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

## registryVersion 캐싱

- LayoutContainer 'layout' 이벤트에서 `notifyLayoutChange()` 무조건 호출
