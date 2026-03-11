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

## BUTTON_SIZE_CONFIG ↔ CSS 높이 정합성

`BUTTON_SIZE_CONFIG` / `TOGGLEBUTTON_SIZE_CONFIG` (engines/utils.ts)는 `lineHeight` 필드를 필수로 포함해야 함.
CSS Button은 명시적 `line-height: var(--text-*--line-height)`를 사용하므로, `lineHeight` 누락 시
`estimateTextHeight()`가 font metrics 기반 `line-height: normal`로 계산 → CSS와 높이 불일치.

- CSS height = lineHeight + paddingY x 2 + borderWidth x 2
- `calculateContentHeight()`에서 inline lineHeight가 없으면 `sizeConfig.lineHeight` 사용
- 값 변경 시 반드시 `spec-value-sync.md` 레퍼런스 테이블과 대조

## TextMeasurer ↔ nodeRenderers 동기화 (필수)

ParagraphStyle 변경 시 **측정기 + 렌더러 양쪽 동시 업데이트** 필수 (3곳):

1. `canvaskitTextMeasurer.ts` — measureWidth() + measureWrapped()
2. `nodeRenderers.ts` — renderText()
3. `TextMeasureStyle` 인터페이스 — 필드 추가 시

### fontFamilies 정합성 (CRITICAL)

측정기와 렌더러가 **완전히 동일한 `fontFamilies` 배열**을 사용해야 함:

- **측정기**: `canvaskitTextMeasurer.ts`의 `buildFontFamilies()` — CSS 체인 전체를 split(",") → `resolveFamily()` 매핑
- **렌더러**: `specShapeConverter.ts` — `shape.fontFamily.split(",")` → `resolveFamily()` 매핑
- **금지 패턴**: CSS fontFamily 문자열을 단일 배열 요소로 전달 (CanvasKit이 매칭 실패 → fallback 폰트 → 폭 차이)
- **금지 패턴**: 측정기에서 첫 번째 폰트만 추출 (`split(",")[0]`) — fallback chain이 다르면 동일 텍스트도 shaping 결과 다름
- 참조: `docs/bug/skia-button-text-linebreak.md`

### Spec-Driven Text Style (specTextStyle.ts)

Spec 기반 컴포넌트(Button, Badge 등)의 텍스트 폭 측정 시 `extractSpecTextStyle(tag, props)`로 Spec에서 fontSize/fontWeight/fontFamily를 추출하여 사용. 하드코딩된 `BUTTON_SIZE_CONFIG.fontSize`/`fontWeight` 의존 금지.

**extractSpecTextStyle 호출 시 텍스트 props 필수 (CRITICAL)**:

- `extractSpecTextStyle(tag, props)`는 내부에서 `spec.render.shapes(props, ...)` 호출 → TextShape를 찾아 font 속성 반환
- Spec이 TextShape를 생성하려면 `props.children` / `props.text` / `props.label` 중 하나가 truthy여야 함
- **텍스트 props 없이 호출 → TextShape 미생성 → `null` 반환 → fontWeight 등 fallback 값 사용 → 측정 불일치**
- 그룹 컴포넌트에서 자식 폭 합산 시 반드시 더미 텍스트(`children: "x"`)를 전달하여 올바른 font 속성 추출

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

## Skia color-mix 정합성

- CSS `color-mix(in srgb)` → Skia에서 srgb 채널별 선형 혼합으로 재현
- `tintToSkiaColors.ts`의 `mixWithBlackSrgb()` 사용 (oklch lightness 근사 금지)
- light/dark 모드 무관하게 동일 연산 (CSS `color-mix`는 모드별 분기 없음)

## Arc Shape 렌더링 (ProgressCircle 등)

- Spec `arc` shape → specShapeConverter에서 `type: "box"` + `arc` 데이터로 변환
  - 별도 `type: "arc"` 사용 금지 — `React.lazy()` import 체인으로 `renderNodeInternal` switch 미도달 (HMR 이슈)
- `renderBox`에서 `node.arc` 감지 시 `CanvasKit.Path.addArc()` 로 부분 원호 렌더링
- **트랙/인디케이터 정렬 (CRITICAL)**: 트랙 링에 `circle` + stroke 사용 금지
  - `renderSolidBorder`는 `inset = sw/2` 적용 → 스트로크 중심 반지름이 `sw/2` 만큼 안쪽으로 밀림
  - `addArc`는 정확한 반지름에 그림 → 트랙과 인디케이터 `sw/2` 만큼 어긋남
  - **해결**: 트랙도 `arc`(sweepAngle=360°)로 동일 렌더링 경로 사용
- Spec text 중앙 배치: `x: 0, y: 0` + `align: "center"` + `baseline: "middle"` 사용
  - `x: cx, y: cy` 사용 시 specShapeConverter가 paddingLeft/maxWidth를 오계산하여 텍스트 치우침

## Compositional Component Size Delegation (Skia 경로)

- Select/ComboBox 등 합성 컴포넌트에서 **부모의 size prop을 자식이 직접 참조** 필수
- Store에는 부모(Select/ComboBox)에만 `size` 저장 → 자식(SelectTrigger, ComboBoxWrapper 등)은 size 없음
- **ElementSprite.tsx `parentDelegatedSize` selector**: 부모/조부모 2단계 탐색으로 size 읽기
  - `PARENT_SIZE_DELEGATION_TAGS`: SelectTrigger, ComboBoxWrapper, SelectValue, SelectIcon, ComboBoxInput, ComboBoxTrigger
  - `SIZE_DELEGATION_PARENT_TAGS`: Select, ComboBox
- **useMemo deps에 `parentDelegatedSize` 포함 필수** — 누락 시 size 변경이 Skia 트리에 전파 안 됨
- size 우선순위: `props.size || parentDelegatedSize || tagGroupAncestorSize || "md"`
- Layout 경로(`fullTreeLayout.ts`)의 `effectiveGetChildElements`도 동일하게 size 주입 (L894-912)

## registryVersion 캐싱

- LayoutContainer 'layout' 이벤트에서 `notifyLayoutChange()` 무조건 호출
