---
name: xstudio-patterns
description: Defines code patterns, rules, and best practices for XStudio Builder application. Covers layout engine, Canvas rendering, state management, styling, and component architecture. Automatically loaded as background knowledge for all XStudio development tasks.
user-invocable: false
---

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
- **[domain-structure-change-audit](rules/domain-structure-change-audit.md)** - Element 트리 구조 변경 시 소비자 감사 필수

#### Zustand (zustand-*) - 상태 관리
- **[zustand-childrenmap-staleness](rules/zustand-childrenmap-staleness.md)** - childrenMap은 props 변경 시 갱신 안 됨 → elementsMap 최신 조회, useRef 캐싱 필수

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

#### WASM (wasm-*)
- **CRITICAL**: wasm-pack `--target bundler` 출력은 `import()`만으로 내부 `wasm` 바인딩이 초기화되지 않음 → **반드시 default export(`__wbg_init`)를 명시적으로 호출** 필수
  ```typescript
  // ✅ 올바른 초기화 패턴 (rustWasm.ts)
  const mod = await import('./pkg/xstudio_wasm');
  if (typeof mod.default === 'function') {
    await mod.default(); // __wbg_init() → fetch .wasm → instantiate → finalize
  }

  // ❌ import만으로는 wasm 바인딩 미초기화
  const mod = await import('./pkg/xstudio_wasm');
  mod.ping(); // TypeError — wasm 전역 변수가 undefined
  ```

#### Order Num (order_num 재정렬)
- **CRITICAL**: order_num 재정렬 시 `batchUpdateElementOrders()` 사용 필수 (단일 set() + _rebuildIndexes()). 구 패턴 `updateElementOrder` N회 호출 금지
- **CRITICAL**: setTimeout/queueMicrotask 안에서 반드시 `get()`으로 최신 `elements` 참조 (stale closure 방지). 외부 캡처 금지
- **CRITICAL**: `calculateNextOrderNum` — 0-based (빈 부모 → 0). AI 도구 `createElement.ts`에서 `elements.length` 사용 금지
- 참조: `elementReorder.ts`의 `computeReorderUpdates()` (순수 함수) + `reorderElements()` (실행)

#### Security (postmessage-*)
- **[postmessage-origin-verify](rules/postmessage-origin-verify.md)** - origin 검증 필수

#### Component Spec (spec-*)
- **[spec-build-sync](rules/spec-build-sync.md)** - @xstudio/specs 빌드 동기화 필수
- **[spec-value-sync](rules/spec-value-sync.md)** - Spec ↔ Builder ↔ CSS 값 동기화
- **CRITICAL**: Spec shapes 내 숫자 연산에 TokenRef 값을 직접 사용 금지 → `resolveToken()` 변환 필수 (TokenRef 문자열을 수 연산에 사용하면 NaN 좌표 → 렌더링 실패)
- **CRITICAL**: Spec shapes() 내 `_hasChildren` 체크 패턴 필수 → `const hasChildren = !!(props as Record<string, unknown>)._hasChildren; if (hasChildren) return shapes;` (배경/테두리 shapes 정의 직후, standalone 콘텐츠 shapes 직전에 배치)
- **CRITICAL**: Child Spec 추가 시 반드시 `packages/specs/src/index.ts` (빌드 엔트리) + `packages/specs/src/components/index.ts` 양쪽에 export 추가 후 `pnpm build:specs` 실행 필수
- **CRITICAL**: 자식 Element가 독립 렌더링하려면 `ElementSprite.tsx`의 `TAG_SPEC_MAP`에 해당 태그의 Spec을 등록해야 함

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
- **[zustand-factory-pattern](rules/zustand-factory-pattern.md)** - StateCreator factory 패턴
- **[zustand-modular-files](rules/zustand-modular-files.md)** - 슬라이스 파일 분리

#### PostMessage (postmessage-*)
- **[postmessage-buffer-ready](rules/postmessage-buffer-ready.md)** - PREVIEW_READY 버퍼링

#### Inspector (inspector-*)
- **[inspector-inline-styles](rules/inspector-inline-styles.md)** - 오버레이 인라인 스타일
- **[inspector-history-sync](rules/inspector-history-sync.md)** - Inspector 히스토리 동기화

#### PIXI Layout (pixi-*)
- **[pixi-border-box-model](rules/pixi-border-box-model.md)** - border-box 크기 모델
- **[pixi-text-isleaf](rules/pixi-text-isleaf.md)** - Text isLeaf 설정
- **[pixi-hitarea-absolute](rules/pixi-hitarea-absolute.md)** - 히트 영역 절대 좌표
- **[pixi-viewport-culling](rules/pixi-viewport-culling.md)** - 뷰포트 컬링

### MEDIUM-HIGH

#### PIXI Layout (pixi-*)
- **[pixi-no-flex-height](rules/pixi-no-flex-height.md)** - flex + % height 금지

### MEDIUM (권장)

#### Performance (perf-*)
- **[perf-checklist](rules/perf-checklist.md)** - 성능 체크리스트
- **[perf-barrel-imports](rules/perf-barrel-imports.md)** - barrel import 회피
- **[perf-promise-all](rules/perf-promise-all.md)** - Promise.all 병렬 실행
- **[perf-dynamic-imports](rules/perf-dynamic-imports.md)** - 동적 임포트
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

## 상세 패턴 레퍼런스

아래 reference 파일들은 필요 시 참조하세요. 각 파일은 특정 도메인의 상세 구현 패턴을 포함합니다.

### Layout Engine
**[reference/layout-engine.md](reference/layout-engine.md)** — 엔진 선택, DirectContainer 패턴, LayoutComputedSizeContext, enrichWithIntrinsicSize, Card Nested Tree 레이아웃, Tabs 높이 계산, Compositional Component 전환 체크리스트, 레이아웃 엔진 개선 이력

### Compositional Architecture
**[reference/compositional-architecture.md](reference/compositional-architecture.md)** — ComboBox/Calendar/DatePicker Compositional 전환 패턴, CSS 값 일관성, Spec Shapes 배경색 규칙, Breadcrumbs/Card 높이 계산, convertToFillStyle, TextSprite 렌더링, Container Props 주입

### Child Composition & Spec
**[reference/child-composition.md](reference/child-composition.md)** — 자식 조합 패턴, Child Spec 등록, `_hasChildren` 2단계 로직, Spec shapes 카테고리, label 렌더링 패턴, Property Editor 자식 동기화, Canvas 2D↔CanvasKit 보정, TokenRef fontSize 해석, INLINE_FORM dimensions, Phantom Indicator, TextMeasurer 정합성

### Component Registry
**[reference/component-registry.md](reference/component-registry.md)** — 컴포넌트 등급 현황, COMPLEX_COMPONENT_TAGS, CHILD_COMPOSITION_EXCLUDE_TAGS, NON_CONTAINER_TAGS, SPEC_RENDERS_ALL_TAGS_SET

## 서브에이전트 위임 가이드라인

Spec 파일 일괄 수정 등 병렬 에이전트(Task tool)에 작업을 위임할 때, 아래 규칙을 프롬프트에 **반드시** 포함하세요.

### 수정 금지 패턴 (Protected Patterns)

서브에이전트 프롬프트에 다음을 명시:

```
⚠️ 수정 금지 패턴 — 아래 코드는 절대 변경/삭제/이동하지 마세요:

1. _hasChildren 패턴: 아래 코드 블록을 삭제, 이동, 조건 변경하지 마세요.
   const hasChildren = !!(props as Record<string, unknown>)._hasChildren;
   if (hasChildren) return shapes;

2. CHILD_COMPOSITION_EXCLUDE_TAGS 관련 로직

3. ElementSprite.tsx의 _hasChildren 주입 로직 (2단계 평가)

4. rearrangeShapesForColumn / SPEC_RENDERS_ALL_TAGS_SET 가드 로직

5. TAG_SPEC_MAP 등록 로직 (child spec 렌더링 경로)

요청된 수정 범위만 정확히 수행하고, 그 외 로직은 건드리지 마세요.
```

### 위임 프롬프트 템플릿

```markdown
## 작업 범위
[구체적 수정 내용만 기술]

## 수정 대상 파일
[파일 목록]

## 수정 패턴
[Before → After 예시 코드]

## ⚠️ 수정 금지
- `_hasChildren` 체크 코드 (삭제/이동/변경 금지)
- `COMPLEX_COMPONENT_TAGS` 관련 로직
- shapes 함수의 early return 구조
- 요청 범위 외 리팩토링
```

### 위임 시 체크리스트

| 항목 | 설명 |
|------|------|
| 범위 한정 | "fontSize만 수정", "import만 추가" 등 명시적 범위 |
| 금지 패턴 포함 | 위 수정 금지 패턴을 프롬프트에 복사 |
| Before/After 예시 | 정확한 변경 패턴을 코드로 제시 |
| 검증 지시 | `npx tsc --noEmit` 타입 체크 수행 지시 |

## 사용법

```bash
# 특정 규칙 적용 예시
# 1. rules/ 폴더에서 관련 규칙 확인
# 2. Incorrect 예시 패턴 검색
# 3. Correct 예시로 수정
```

## 규칙 파일 형식

모든 규칙 파일은 다음 형식을 따릅니다:

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
