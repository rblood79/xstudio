---
name: composition-patterns
description: Defines code patterns, rules, and best practices for composition Builder application. Covers layout engine, Canvas rendering, state management, styling, and component architecture. Use when writing, reviewing, refactoring, or debugging any composition code, or when making architectural decisions about the builder.
TRIGGER when: user mentions "코드 패턴", "규칙 확인", "컨벤션 체크", "아키텍처 규칙", "composition 규칙", "패턴 체크", "코드 리뷰 기준", "code patterns", "conventions", "architecture rules", or asks about composition coding standards, Spec rules, rendering conventions, or state management patterns.
user-invocable: true
scope: composition Builder codebase (apps/builder, packages/specs, packages/shared, packages/layout-flow)
---

# composition Patterns Skill

composition Builder의 코드 패턴, 규칙 및 모범 사례 통합 스킬.

> **상세 규칙은 `.Codex/rules/`에 glob-scoped로 자동 로드됩니다.**
> 이 파일은 규칙 인덱스 + 에이전트 프로토콜을 제공합니다.

## 규칙 카테고리

### CRITICAL (즉시 적용 필수)

#### Domain (domain-\*)

- **[domain-element-hierarchy](rules/domain-element-hierarchy.md)** - Element 계층 구조
- **[domain-o1-lookup](rules/domain-o1-lookup.md)** - O(1) 인덱스 기반 검색
- **[domain-history-integration](rules/domain-history-integration.md)** - 히스토리 기록 필수
- **[domain-async-pipeline](rules/domain-async-pipeline.md)** - 비동기 파이프라인 순서
- **[domain-layout-resolution](rules/domain-layout-resolution.md)** - Page/Layout 합성
- **[domain-delta-messaging](rules/domain-delta-messaging.md)** - Delta 메시징 패턴
- **[domain-component-lifecycle](rules/domain-component-lifecycle.md)** - 컴포넌트 생명주기
- **[domain-structure-change-audit](rules/domain-structure-change-audit.md)** - Element 트리 변경 시 소비자 감사
- **[domain-section-component](rules/domain-section-component.md)** - 패널 섹션은 `Section` 컴포넌트 사용

#### Zustand / Validation / Styling / TypeScript

- **[zustand-childrenmap-staleness](rules/zustand-childrenmap-staleness.md)** - childrenMap stale → elementsMap 최신 조회
- **[validation-input-boundary](rules/validation-input-boundary.md)** / **[validation-error-boundary](rules/validation-error-boundary.md)**
- **[style-no-inline-tailwind](rules/style-no-inline-tailwind.md)** / **[style-tv-variants](rules/style-tv-variants.md)** / **[style-react-aria-prefix](rules/style-react-aria-prefix.md)** / **[style-overlay-s2-pattern](rules/style-overlay-s2-pattern.md)**
- **style-action-icon-button** — `ActionIconButton` 사용 (`.button-base` 우회, tooltip 내장)
- **[type-no-any](rules/type-no-any.md)** / **[type-explicit-return](rules/type-explicit-return.md)**

#### PIXI / Security / Spec

- **[pixi-direct-container](rules/pixi-no-xy-props.md)** / **[pixi-hybrid-layout-engine](rules/pixi-hybrid-layout-engine.md)** / **[pixi-container-hit-rect](rules/pixi-container-hit-rect.md)**
- **[postmessage-origin-verify](rules/postmessage-origin-verify.md)** - origin 검증 필수
- **[spec-build-sync](rules/spec-build-sync.md)** / **[spec-value-sync](rules/spec-value-sync.md)**

> **layoutVersion, order_num, WASM 초기화, display 전환, Field Component, Spec↔CSS 경계** 등의 상세 CRITICAL 규칙은 `.Codex/rules/` (canvas-rendering.md, layout-engine.md, state-management.md)에 자동 로드됩니다.

### HIGH (강력 권장)

- **[arch-reference-impl](rules/arch-reference-impl.md)** / **[spec-single-source-truth](rules/spec-single-source-truth.md)** / **[spec-shape-rendering](rules/spec-shape-rendering.md)** / **[spec-token-usage](rules/spec-token-usage.md)**
- **spec-text-style** — `extractSpecTextStyle()` 사용, fontSize/fontWeight 하드코딩 금지
- **[spec-container-dimension-injection](rules/spec-container-dimension-injection.md)** — `_containerWidth`/`_containerHeight` props 주입
- **[style-css-reuse](rules/style-css-reuse.md)** / **[react-aria-hooks-required](rules/react-aria-hooks-required.md)** / **[react-aria-no-manual-aria](rules/react-aria-no-manual-aria.md)** / **[react-aria-stately-hooks](rules/react-aria-stately-hooks.md)**
- **[supabase-no-direct-calls](rules/supabase-no-direct-calls.md)** / **[supabase-service-modules](rules/supabase-service-modules.md)** / **[supabase-rls-required](rules/supabase-rls-required.md)**
- **[zustand-factory-pattern](rules/zustand-factory-pattern.md)** / **[zustand-modular-files](rules/zustand-modular-files.md)**
- **[postmessage-buffer-ready](rules/postmessage-buffer-ready.md)** / **[inspector-inline-styles](rules/inspector-inline-styles.md)** / **[inspector-history-sync](rules/inspector-history-sync.md)**
- **[pixi-border-box-model](rules/pixi-border-box-model.md)** / **[pixi-text-isleaf](rules/pixi-text-isleaf.md)** / **[pixi-hitarea-absolute](rules/pixi-hitarea-absolute.md)** / **[pixi-viewport-culling](rules/pixi-viewport-culling.md)**

### MEDIUM

- **[pixi-no-flex-height](rules/pixi-no-flex-height.md)** / **[perf-checklist](rules/perf-checklist.md)** / **[perf-map-set-lookups](rules/perf-map-set-lookups.md)** / **[test-stories-required](rules/test-stories-required.md)**

## 상세 레퍼런스

| 도메인                     | 파일                                                                               |
| -------------------------- | ---------------------------------------------------------------------------------- |
| Layout Engine              | [reference/layout-engine.md](reference/layout-engine.md)                           |
| Compositional Architecture | [reference/compositional-architecture.md](reference/compositional-architecture.md) |
| Child Composition & Spec   | [reference/child-composition.md](reference/child-composition.md)                   |
| Text Wrapping              | [reference/text-wrapping.md](reference/text-wrapping.md)                           |
| Style Panel                | [reference/style-panel.md](reference/style-panel.md)                               |
| Component Registry         | [reference/component-registry.md](reference/component-registry.md)                 |

## 서브에이전트 위임 가이드라인

### 수정 금지 패턴 (Protected Patterns)

```
1. _hasChildren 패턴 (삭제/이동/조건 변경 금지)
2. CHILD_COMPOSITION_EXCLUDE_TAGS 관련 로직
3. ElementSprite.tsx의 _hasChildren 주입 로직
4. rearrangeShapesForColumn / SPEC_RENDERS_ALL_TAGS_SET 가드
5. TAG_SPEC_MAP 등록 로직
```

### 위임 템플릿

```markdown
## 작업 범위

[구체적 수정 내용만 기술]

## 수정 대상 파일

[파일 목록]

## 수정 패턴

[Before → After 예시 코드]

## 수정 금지

- \_hasChildren, COMPLEX_COMPONENT_TAGS, shapes early return, 요청 범위 외 리팩토링
```

## 공통 세션 프로토콜

### 세션 시작

1. `Read .Codex/progress.md` — 현재 상태/알려진 이슈
2. `Read .Codex/agent-memory/{자신}/MEMORY.md` — 이전 세션 맥락
3. 중복 작업 방지, 막힌 지점 이어가기

### 세션 종료

1. progress.md 갱신 (완료/진행 중/이슈)
2. agent-memory 갱신 (발견사항 기록)
3. 빌드 통과, 커밋 가능한 상태 보장

### 에러 복구

- 같은 에러 3회 반복 금지 → 2회 실패 후 전략 전환
- `any`/`@ts-ignore` 우회 금지
- 불확실 시 질문, 해결 불가 시 에스컬레이션

### 출력 크기 제한

- 반환은 1,000~2,000 토큰 이내 구조화된 요약
- 상세 → 파일 저장 후 경로만 반환

## ADR

- **[ADR-001](../../../docs/adr/001-state-management.md)** Zustand | **[ADR-002](../../../docs/adr/002-styling-approach.md)** ITCSS+tv() | **[ADR-003](../../../docs/adr/003-canvas-rendering.md)** Canvas
- **[ADR-004](../../../docs/adr/004-preview-isolation.md)** iframe | **[ADR-005](../../../docs/adr/005-css-text-wrapping.md)** Text Wrap | **[ADR-008](../../../docs/adr/008-layout-engine.md)** Taffy
- **[Component Spec](../../../docs/COMPONENT_SPEC.md)** 단일 소스 아키텍처

## 규칙 효과 측정

규칙의 실제 효과를 추적하여 컨텍스트 예산을 최적화합니다.

### 측정 템플릿

리뷰어 에이전트가 `.Codex/agent-memory/reviewer/MEMORY.md`에 기록:

| 규칙     | 위반 수 | False Positive | 실효성          | 비고 |
| -------- | ------- | -------------- | --------------- | ---- |
| (규칙명) | N       | N              | HIGH/MEDIUM/LOW |      |

### 정리 기준

- **위반 0 + 3개월 이상**: Codex가 내재화했을 가능성 → 제거 후보 (컨텍스트 절약)
- **False Positive > 50%**: 규칙 조건이 너무 넓음 → 조건 좁히기
- **위반 빈번 + 실효성 LOW**: 규칙이 모호함 → Why 보강 또는 코드 레벨 방지로 전환

## Evals

### Positive (발동해야 하는 경우)

- "캔버스에서 텍스트가 잘려요" → ✅ 캔버스 렌더링 규칙 참조 필요
- "Zustand store에 슬라이스 추가하려면?" → ✅ 상태 관리 규칙 참조
- "이 코드가 composition 컨벤션에 맞나?" → ✅ 규칙 인덱스 조회
- "Spec 파일 새로 만들 때 주의사항?" → ✅ Spec 빌드/등록 규칙

### Negative (발동하면 안 되는 경우)

- "README 업데이트해줘" → ❌ 문서 작업, 코드 패턴 무관
- "git commit 해줘" → ❌ Git 작업
- "이 React 훅 설명해줘" (일반 React) → ❌ composition 특화 아님
- "TypeScript 타입 추론 원리가 뭐야?" → ❌ 일반 TS 지식
