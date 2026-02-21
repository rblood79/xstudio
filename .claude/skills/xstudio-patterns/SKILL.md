# XStudio Patterns Skill

XStudio Builder 애플리케이션의 코드 패턴, 규칙 및 모범 사례를 정의하는 통합 스킬입니다.

## 목적

- 코드 일관성 및 품질 보장
- 팀 전체 표준화된 패턴 적용
- 보안, 성능, 접근성 요구사항 충족
- 유지보수성 향상

## 규칙 카테고리

### CRITICAL (즉시 적용 필수)

#### Domain (domain-*) - 비즈니스 로직
- **[domain-element-hierarchy](rules/domain-element-hierarchy.md)** - Element 계층 구조 규칙
- **[domain-o1-lookup](rules/domain-o1-lookup.md)** - O(1) 인덱스 기반 검색
- **[domain-history-integration](rules/domain-history-integration.md)** - 히스토리 기록 필수
- **[domain-async-pipeline](rules/domain-async-pipeline.md)** - 비동기 파이프라인 순서
- **[domain-layout-resolution](rules/domain-layout-resolution.md)** - Page/Layout 합성 규칙
- **[domain-delta-messaging](rules/domain-delta-messaging.md)** - Delta 메시징 패턴
- **[domain-component-lifecycle](rules/domain-component-lifecycle.md)** - 컴포넌트 생명주기

#### Validation (validation-*) - 입력 검증/에러 처리
- **[validation-input-boundary](rules/validation-input-boundary.md)** - 경계 입력 검증 (Zod)
- **[validation-error-boundary](rules/validation-error-boundary.md)** - Error Boundary 필수

#### Styling (style-*)
- **[style-no-inline-tailwind](rules/style-no-inline-tailwind.md)** - 인라인 Tailwind 클래스 금지
- **[style-tv-variants](rules/style-tv-variants.md)** - tv() 사용 필수
- **[style-react-aria-prefix](rules/style-react-aria-prefix.md)** - react-aria-* CSS 접두사

#### TypeScript (type-*)
- **[type-no-any](rules/type-no-any.md)** - any 타입 금지
- **[type-explicit-return](rules/type-explicit-return.md)** - 명시적 반환 타입

#### PIXI Layout (pixi-*)
- **[pixi-direct-container](rules/pixi-no-xy-props.md)** - DirectContainer 직접 배치 패턴 (엔진 결과 x/y 사용)
- **[pixi-hybrid-layout-engine](rules/pixi-hybrid-layout-engine.md)** - 하이브리드 레이아웃 엔진 display 선택
- **[pixi-container-hit-rect](rules/pixi-container-hit-rect.md)** - Non-layout 컨테이너 히트 영역 (padding offset 보정)

#### Security (postmessage-*)
- **[postmessage-origin-verify](rules/postmessage-origin-verify.md)** - origin 검증 필수

#### Component Spec (spec-*)
- **[spec-build-sync](rules/spec-build-sync.md)** - @xstudio/specs 빌드 동기화 필수
- **[spec-value-sync](rules/spec-value-sync.md)** - Spec ↔ Builder ↔ CSS 값 동기화

### HIGH (강력 권장)

#### Architecture (arch-*)
- **[arch-reference-impl](rules/arch-reference-impl.md)** - 참조 구현 모음

#### Component Spec (spec-*)
- **[spec-single-source-truth](rules/spec-single-source-truth.md)** - ComponentSpec 단일 소스 패턴
- **[spec-shape-rendering](rules/spec-shape-rendering.md)** - Shape 기반 렌더링
- **[spec-token-usage](rules/spec-token-usage.md)** - 토큰 참조 형식

#### Styling (style-*)
- **[style-css-reuse](rules/style-css-reuse.md)** - CSS 클래스 재사용

#### React-Aria (react-aria-*)
- **[react-aria-hooks-required](rules/react-aria-hooks-required.md)** - React-Aria 훅 사용
- **[react-aria-no-manual-aria](rules/react-aria-no-manual-aria.md)** - 수동 ARIA 속성 금지
- **[react-aria-stately-hooks](rules/react-aria-stately-hooks.md)** - React-Stately 상태 훅

#### Supabase (supabase-*)
- **[supabase-no-direct-calls](rules/supabase-no-direct-calls.md)** - 컴포넌트 직접 호출 금지
- **[supabase-service-modules](rules/supabase-service-modules.md)** - 서비스 모듈 사용
- **[supabase-rls-required](rules/supabase-rls-required.md)** - Row Level Security 필수

#### Zustand (zustand-*)
- **[zustand-factory-pattern](rules/zustand-factory-pattern.md)** - StateCreator 팩토리 패턴
- **[zustand-modular-files](rules/zustand-modular-files.md)** - 슬라이스별 파일 분리

#### PostMessage (postmessage-*)
- **[postmessage-buffer-ready](rules/postmessage-buffer-ready.md)** - PREVIEW_READY 버퍼링

#### Inspector (inspector-*)
- **[inspector-inline-styles](rules/inspector-inline-styles.md)** - 오버레이 인라인 스타일
- **[inspector-history-sync](rules/inspector-history-sync.md)** - 히스토리 동기화

#### PIXI Layout (pixi-*)
- **[pixi-border-box-model](rules/pixi-border-box-model.md)** - Border-Box 모델 크기 계산 필수
- **[pixi-text-isleaf](rules/pixi-text-isleaf.md)** - Text isLeaf 설정
- **[pixi-hitarea-absolute](rules/pixi-hitarea-absolute.md)** - 히트 영역 absolute 위치
- **[pixi-viewport-culling](rules/pixi-viewport-culling.md)** - Viewport Culling 좌표 시스템 및 부모 가시성 패턴

### MEDIUM-HIGH

#### PIXI Layout (pixi-*)
- **[pixi-no-flex-height](rules/pixi-no-flex-height.md)** - flex + % height 조합 금지

### MEDIUM (권장)

#### Performance (perf-*)
- **[perf-checklist](rules/perf-checklist.md)** - 성능 체크리스트
- **[perf-barrel-imports](rules/perf-barrel-imports.md)** - Barrel import 지양
- **[perf-promise-all](rules/perf-promise-all.md)** - Promise.all 병렬 처리
- **[perf-dynamic-imports](rules/perf-dynamic-imports.md)** - 동적 import 활용
- **[perf-map-set-lookups](rules/perf-map-set-lookups.md)** - Map/Set O(1) 검색

#### Testing (test-*)
- **[test-stories-required](rules/test-stories-required.md)** - Storybook 스토리 필수

## 기술 스택

| 영역 | 기술 |
|------|------|
| UI Framework | React 19, React-Aria Components |
| State | Zustand (메인), Jotai (스타일 패널), TanStack Query |
| Styling | Tailwind CSS v4, tailwind-variants |
| Canvas | **CanvasKit/Skia WASM** (메인 렌더러) + PixiJS 8 (이벤트 전용, DirectContainer 직접 배치), @pixi/react |
| Layout Engine | Taffy WASM (TaffyFlexEngine, TaffyGridEngine) + Dropflow Fork (DropflowBlockEngine) |
| Backend | Supabase (Auth, Database, RLS) |
| Build | Vite, TypeScript 5 |
| Testing | Storybook, Vitest |

## 레이아웃 엔진 핵심 패턴

> Wave 3-4 (2026-02-19) 이후 현행 아키텍처.

### 엔진 선택

| display 값 | 엔진 |
|------------|------|
| `block`, `inline-block`, `inline`, `flow-root` | DropflowBlockEngine (JS) |
| `flex`, `inline-flex` | TaffyFlexEngine (Taffy WASM) |
| `grid`, `inline-grid` | TaffyGridEngine (Taffy WASM) |

### DirectContainer 패턴

@pixi/layout 제거 후, 엔진 계산 결과(x/y/w/h)를 DirectContainer에서 직접 배치합니다:

```typescript
// ✅ 엔진 계산 결과를 DirectContainer x/y로 직접 주입
<DirectContainer x={layout.x} y={layout.y}>
  <ElementSprite element={element} width={layout.width} height={layout.height} />
</DirectContainer>

// ❌ 레이아웃 prop으로 재계산 요청 (구 @pixi/layout 패턴 — 제거됨)
<pixiContainer layout={{ display: 'flex', flexDirection: 'column' }}>
```

### LayoutComputedSizeContext 패턴

컴포넌트 내부 Sprite가 엔진이 계산한 border-box 크기를 읽어야 할 때 사용합니다.
퍼센트(`%`) 크기나 자동 크기(`auto`, `fit-content`) 요소의 최종 픽셀 크기를 엔진에서 전파합니다.

```typescript
// ✅ LayoutComputedSizeContext로 엔진 계산 크기 읽기
const computedSize = useContext(LayoutComputedSizeContext);
const width = (computedSize?.width && computedSize.width > 0)
  ? computedSize.width
  : fallbackWidth;

// ❌ props.style?.width를 직접 파싱 (% 값이 100px로 오해석됨)
const width = parseCSSSize(style?.width, undefined) ?? 0;
```

**Provider:** `BuilderCanvas.tsx` DirectContainer 래퍼
**Consumer:** `ElementSprite.tsx`, `BoxSprite.tsx`, 히트 영역 Graphics 컴포넌트

### enrichWithIntrinsicSize (텍스트 크기 주입)

Button, Badge 등 텍스트 기반 intrinsic 크기를 가진 컴포넌트는 `enrichWithIntrinsicSize()`로 엔진에 크기를 주입합니다.
구 `styleToLayout.ts` 방식의 수동 `layout.height` 계산은 삭제됐습니다 (W3-6 완료).

```typescript
// ✅ enrichWithIntrinsicSize — 엔진 layout 호출 전 intrinsic 크기 주입
enrichWithIntrinsicSize(element, availableWidth, cssContext);
// → element.intrinsicWidth / intrinsicHeight 설정
// → TaffyFlexEngine/DropflowBlockEngine이 측정값으로 노드 크기 결정

// ❌ styleToLayout.ts에서 layout.height 직접 설정 (삭제됨)
// layout.height = calculateContentHeight(element, availableWidth);
```

### 레이아웃 엔진 개선 이력 (2026-02-21)

#### fontBoundingBox line-height 통일

`measureWrappedTextHeight`, `measureTextWithWhiteSpace`, `estimateTextHeight` 모두 `measureFontMetrics().lineHeight` (Canvas 2D fontBoundingBox 기반) 사용.

- 기존 `fontSize * 1.2` 근사값 제거
- CSS `line-height: normal`과 동일한 결과 보장
- 세 측정 함수 사이의 line-height 불일치로 인한 텍스트 클리핑/여백 버그 해결

```typescript
// ✅ fontBoundingBox 기반 lineHeight 사용
const { lineHeight } = measureFontMetrics(fontSize, fontFamily);
// lineHeight = fontBoundingBoxAscent + fontBoundingBoxDescent (Canvas 2D 실측)

// ❌ 근사값 사용 — CSS normal line-height와 불일치
const lineHeight = fontSize * 1.2;
```

#### INLINE_BLOCK_TAGS border-box 수정

`enrichWithIntrinsicSize`가 `INLINE_BLOCK_TAGS`(button, badge, togglebutton, togglebuttongroup 등)에 항상 padding+border를 포함한 border-box 높이를 반환.

- `layoutInlineRun`이 `style.height`를 border-box 값으로 직접 사용하는 구조이므로 content-box 변환 불필요
- block 경로의 `treatAsBorderBox` 변환이 이중 계산을 방지
- 이전에 INLINE_BLOCK_TAGS에서 padding이 누락되어 높이가 축소되던 버그 수정

```typescript
// ✅ INLINE_BLOCK_TAGS: enrichWithIntrinsicSize가 border-box 높이 반환
// layoutInlineRun이 이 값을 그대로 style.height로 사용
const height = contentHeight + paddingY * 2 + borderWidth * 2; // border-box

// ❌ content-box 반환 후 layoutInlineRun이 재계산 → 이중 적용
const height = contentHeight; // content-box만 반환
// → layoutInlineRun에서 padding 재추가 → 실제 높이 = contentHeight + padding * 4
```

#### LayoutContext.getChildElements

`LayoutContext`에 `getChildElements?: (elementId: string) => Element[]` 선택적 메서드 추가.

- `BuilderCanvas.tsx`에서 `pageChildrenMap` 기반으로 context에 주입
- `enrichWithIntrinsicSize`에서 자식 Element 목록을 직접 조회 가능
- ToggleButtonGroup처럼 자식 수와 크기를 기반으로 intrinsic 너비/높이를 계산하는 컴포넌트에 필요

```typescript
// ✅ LayoutContext에 getChildElements 주입 (BuilderCanvas.tsx)
const layoutContext: LayoutContext = {
  // ...기존 필드...
  getChildElements: (elementId) => pageChildrenMap.get(elementId) ?? [],
};

// ✅ enrichWithIntrinsicSize에서 자식 기반 너비 계산
const children = context.getChildElements?.(element.id) ?? [];
const childWidths = children.map((child) => calculateChildWidth(child));
element.intrinsicWidth = childWidths.reduce((sum, w) => sum + w, 0);

// ❌ 자식 정보 없이 고정 fallback → ToggleButtonGroup 너비 부정확
element.intrinsicWidth = 100; // 실제 자식 크기와 무관한 값
```

#### border shorthand 레이아웃 지원

`parseBorder()`가 `border: "1px solid red"` shorthand에서 `borderWidth`를 추출.

- `parseBorderShorthand()` (`cssValueParser.ts`) 연동
- `border` shorthand 사용 시 레이아웃 엔진이 borderWidth를 인식하지 못하던 문제 해결
- `border-top`, `border-right` 등 개별 속성과 동일한 수준으로 지원

```typescript
// ✅ border shorthand 파싱 — parseBorder()가 shorthand 처리
// style = { border: "2px solid blue" }
const { borderWidth } = parseBorder(style);
// borderWidth = 2 (parseBorderShorthand() 연동으로 추출)

// ❌ shorthand 미지원 — borderWidth가 0으로 폴백
// style = { border: "2px solid blue" }
const borderWidth = style.borderWidth ?? 0;
// → 0 반환 (border 속성 무시)
```

### 컴포넌트 등급 현황 (Wave 4 완료, 2026-02-19)

모든 Pixi 컴포넌트가 A 또는 B+ 등급으로 전환 완료됐습니다.

| 등급 | 의미 | 예시 |
|------|------|------|
| A | Taffy/Dropflow 레이아웃 위임 + 자식 분리 | Button, Badge, ProgressBar, TagGroup |
| B+ | Context 우선 + fallback, 일부 자체 계산 | Checkbox, Radio, Switch, Input, Breadcrumbs |
| B | 엔진 위임하나 자체 텍스트 배치 | Card, Meter |
| D | 캔버스 상호작용 불필요 (프리뷰 전용) | Calendar, DatePicker, ColorPicker |

> C등급 (자체 렌더링 + 수동 배치)은 Wave 4에서 전부 제거됐습니다.
> `SELF_PADDING_TAGS`, `renderWithPixiLayout()` 등 구 패턴도 삭제 완료.

## 사용법

```bash
# 특정 규칙 적용 예시
# 1. rules/ 폴더에서 관련 규칙 확인
# 2. Incorrect 예시 패턴 검색
# 3. Correct 예시로 수정
```

## 규칙 파일 형식

모든 규칙 파일은 Vercel Agent Skills 패턴을 따릅니다:

```markdown
---
title: 규칙 제목
impact: CRITICAL | HIGH | MEDIUM-HIGH | MEDIUM | LOW
impactDescription: 영향 설명
tags: [tag1, tag2]
---

규칙 설명

## Incorrect
잘못된 코드 예시

## Correct
올바른 코드 예시
```

## Deprecated Rules (폐기된 규칙)

- ~~**[pixi-layout-import-first](rules/pixi-layout-import-first.md)**~~ - Phase 11에서 @pixi/layout 제거로 폐기

## 아키텍처 결정 기록 (ADR)

주요 기술 결정의 배경과 근거:
- **[ADR-001](../../../docs/adr/001-state-management.md)** - Zustand 선택 이유
- **[ADR-002](../../../docs/adr/002-styling-approach.md)** - ITCSS + tv() 선택 이유
- **[ADR-003](../../../docs/adr/003-canvas-rendering.md)** - Canvas 렌더링 (CanvasKit/Skia 이중 렌더러 + Taffy/Dropflow 레이아웃 엔진)
- **[ADR-004](../../../docs/adr/004-preview-isolation.md)** - iframe 격리 이유
- **[Component Spec Architecture](../../../docs/COMPONENT_SPEC_ARCHITECTURE.md)** - 단일 소스 컴포넌트 스펙 설계
- **[Engine Upgrade](../../../docs/ENGINE_UPGRADE.md)** - CSS 레이아웃 엔진 설계문서 (아키텍처, Phase별 구현, 이슈 내역)
- **[Engine Strategy D](../../../docs/ENGINE.md)** - 레이아웃 엔진 전환 전략 (Taffy WASM + Dropflow Fork)

## 기여

새 규칙 추가 시:
1. `rules/_template.md` 복사
2. 적절한 접두사 사용 (style-, type-, react-aria- 등)
3. SKILL.md에 규칙 링크 추가
4. impact 레벨 적절히 설정
