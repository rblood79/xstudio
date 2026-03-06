---
name: xstudio-patterns
description: Defines code patterns, rules, and best practices for XStudio Builder application. Covers layout engine, Canvas rendering, state management, styling, and component architecture. Use when writing, reviewing, refactoring, or debugging any XStudio code, or when making architectural decisions about the builder.
user-invocable: false
---

# XStudio Patterns Skill

XStudio Builder의 코드 패턴, 규칙 및 모범 사례를 정의하는 통합 스킬입니다.

## 규칙 카테고리

### CRITICAL (즉시 적용 필수)

#### Domain (domain-\*)

- **[domain-element-hierarchy](rules/domain-element-hierarchy.md)** - Element 계층 구조 규칙
- **[domain-o1-lookup](rules/domain-o1-lookup.md)** - O(1) 인덱스 기반 검색
- **[domain-history-integration](rules/domain-history-integration.md)** - 히스토리 기록 필수
- **[domain-async-pipeline](rules/domain-async-pipeline.md)** - 비동기 파이프라인 순서
- **[domain-layout-resolution](rules/domain-layout-resolution.md)** - Page/Layout 합성 규칙
- **[domain-delta-messaging](rules/domain-delta-messaging.md)** - Delta 메시징 패턴
- **[domain-component-lifecycle](rules/domain-component-lifecycle.md)** - 컴포넌트 생명주기
- **[domain-structure-change-audit](rules/domain-structure-change-audit.md)** - 트리 구조 변경 시 소비자 감사 필수

#### Zustand (zustand-\*)

- **[zustand-childrenmap-staleness](rules/zustand-childrenmap-staleness.md)** - childrenMap staleness → elementsMap 최신 조회 필수

#### Validation (validation-\*)

- **[validation-input-boundary](rules/validation-input-boundary.md)** - 경계 입력 검증 (Zod)
- **[validation-error-boundary](rules/validation-error-boundary.md)** - Error Boundary 필수

#### Styling (style-\*)

- **[style-no-inline-tailwind](rules/style-no-inline-tailwind.md)** - 인라인 Tailwind 금지
- **[style-tv-variants](rules/style-tv-variants.md)** - tv() 사용 필수
- **[style-react-aria-prefix](rules/style-react-aria-prefix.md)** - react-aria-\* CSS 접두사
- **[style-action-icon-button](rules/style-action-icon-button.md)** - Builder 아이콘 버튼은 ActionIconButton 사용

#### TypeScript (type-\*)

- **[type-no-any](rules/type-no-any.md)** - any 타입 금지
- **[type-explicit-return](rules/type-explicit-return.md)** - 명시적 반환 타입

#### Canvas/PIXI (pixi-\*)

- **[pixi-direct-container](rules/pixi-no-xy-props.md)** - DirectContainer 직접 배치 패턴
- **[pixi-hybrid-layout-engine](rules/pixi-hybrid-layout-engine.md)** - 하이브리드 레이아웃 엔진 display 선택
- **[pixi-container-hit-rect](rules/pixi-container-hit-rect.md)** - Non-layout 컨테이너 히트 영역

#### WASM — `import()`만으로 wasm 바인딩 미초기화 → `await mod.default()` 명시적 호출 필수

#### layoutVersion — 레이아웃 영향 코드 경로에서 `layoutVersion + 1` 증가 필수. 상세: `.claude/rules/layout-engine.md`

#### order_num — `batchUpdateElementOrders()` 단일 set() 사용 필수, setTimeout 내 `get()` 최신 참조 필수

#### Security (postmessage-\*)

- **[postmessage-origin-verify](rules/postmessage-origin-verify.md)** - origin 검증 필수

#### Component Spec (spec-\*)

- **[spec-build-sync](rules/spec-build-sync.md)** - @xstudio/specs 빌드 동기화 필수
- **[spec-value-sync](rules/spec-value-sync.md)** - Spec ↔ Builder ↔ CSS 값 동기화
- Spec shapes 내 숫자 연산에 TokenRef 직접 사용 금지 → `resolveToken()` 필수
- `_hasChildren` 체크 패턴: 배경/테두리 shapes 직후, standalone 콘텐츠 shapes 직전 배치
- Child Spec: `specs/src/index.ts` + `components/index.ts` 양쪽 export → `pnpm build:specs`
- `TAG_SPEC_MAP`에 child tag Spec 등록 필수

### HIGH (강력 권장)

- **[arch-reference-impl](rules/arch-reference-impl.md)** - 참조 구현 모음
- **[spec-single-source-truth](rules/spec-single-source-truth.md)** - ComponentSpec 단일 소스
- **[spec-shape-rendering](rules/spec-shape-rendering.md)** - Shape 기반 렌더링
- **[spec-token-usage](rules/spec-token-usage.md)** - 토큰 참조 형식
- **spec-text-style** — `extractSpecTextStyle()` 사용, fontSize/fontWeight 하드코딩 금지
- **[style-css-reuse](rules/style-css-reuse.md)** - CSS 클래스 재사용
- **[react-aria-hooks-required](rules/react-aria-hooks-required.md)** - React-Aria 훅 사용
- **[react-aria-no-manual-aria](rules/react-aria-no-manual-aria.md)** - 수동 ARIA 속성 금지
- **[react-aria-stately-hooks](rules/react-aria-stately-hooks.md)** - React-Stately 상태 훅
- **[supabase-no-direct-calls](rules/supabase-no-direct-calls.md)** - 컴포넌트 직접 호출 금지
- **[supabase-service-modules](rules/supabase-service-modules.md)** - 서비스 모듈 사용
- **[supabase-rls-required](rules/supabase-rls-required.md)** - RLS 필수
- **[zustand-factory-pattern](rules/zustand-factory-pattern.md)** - StateCreator factory 패턴
- **[zustand-modular-files](rules/zustand-modular-files.md)** - 슬라이스 파일 분리
- **[postmessage-buffer-ready](rules/postmessage-buffer-ready.md)** - PREVIEW_READY 버퍼링
- **[inspector-inline-styles](rules/inspector-inline-styles.md)** - 오버레이 인라인 스타일
- **[inspector-history-sync](rules/inspector-history-sync.md)** - Inspector 히스토리 동기화
- **[pixi-border-box-model](rules/pixi-border-box-model.md)** - border-box 크기 모델
- **[pixi-text-isleaf](rules/pixi-text-isleaf.md)** - Text isLeaf 설정
- **[pixi-hitarea-absolute](rules/pixi-hitarea-absolute.md)** - 히트 영역 절대 좌표
- **[pixi-viewport-culling](rules/pixi-viewport-culling.md)** - 뷰포트 컬링

### MEDIUM-HIGH

- **[pixi-no-flex-height](rules/pixi-no-flex-height.md)** - flex + % height 금지

### MEDIUM (권장)

- **[perf-checklist](rules/perf-checklist.md)** - 성능 체크리스트
- **[perf-barrel-imports](rules/perf-barrel-imports.md)** - barrel import 회피
- **[perf-promise-all](rules/perf-promise-all.md)** - Promise.all 병렬 실행
- **[perf-dynamic-imports](rules/perf-dynamic-imports.md)** - 동적 임포트
- **[perf-map-set-lookups](rules/perf-map-set-lookups.md)** - Map/Set O(1) 검색
- **[test-stories-required](rules/test-stories-required.md)** - Storybook 스토리 필수

## 상세 레퍼런스

필요 시 참조. 각 파일은 특정 도메인의 상세 구현 패턴을 포함합니다.

| 도메인             | 파일                                                                               | 주요 내용                                                                  |
| ------------------ | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Layout Engine      | [reference/layout-engine.md](reference/layout-engine.md)                           | 엔진 선택, enrichWithIntrinsicSize, Card/Tabs 레이아웃, CSS min-width:auto |
| Compositional      | [reference/compositional-architecture.md](reference/compositional-architecture.md) | ComboBox/Calendar 전환, Spec Shapes 배경색, TextSprite                     |
| Child Composition  | [reference/child-composition.md](reference/child-composition.md)                   | Child Spec 등록, `_hasChildren` 2단계 로직, label 렌더링                   |
| Text Wrapping      | [reference/text-wrapping.md](reference/text-wrapping.md)                           | CSS 텍스트 래핑 에뮬레이션, textWrapUtils.ts, isEllipsis 조건              |
| Style Panel        | [reference/style-panel.md](reference/style-panel.md)                               | PropertyUnitInput 보호, SyntheticComputedStyle, Jotai Bridge               |
| Component Registry | [reference/component-registry.md](reference/component-registry.md)                 | COMPLEX_COMPONENT_TAGS, NON_CONTAINER_TAGS, 등급 현황                      |
| Subagent Guide     | [reference/subagent-guide.md](reference/subagent-guide.md)                         | 위임 프롬프트 템플릿, 수정 금지 패턴, 체크리스트                           |

## 에러 복구 프로토콜

1. **3회 반복 금지** — 2회 실패 후 접근 방식 전환
2. **금지 우회 패턴** — `any`, `@ts-ignore`, `@ts-expect-error` 사용 금지
3. **불확실성 시 질문** — 컨텍스트 부족 시 추측 대신 사용자에게 질문
4. **에스컬레이션** — 시도 + 실패 이유 + 남은 가설 보고

## ADR 참조

- **[ADR-001](../../../docs/adr/001-state-management.md)** - Zustand
- **[ADR-002](../../../docs/adr/002-styling-approach.md)** - ITCSS + tv()
- **[ADR-003](../../../docs/adr/003-canvas-rendering.md)** - CanvasKit/Skia + Taffy WASM
- **[ADR-004](../../../docs/adr/004-preview-isolation.md)** - iframe 격리
- **[ADR-005](../../../docs/adr/005-css-text-wrapping.md)** - CSS 텍스트 래핑 에뮬레이션
- **[ADR-008](../../../docs/adr/008-layout-engine.md)** - Taffy WASM 단일 엔진
- **[Component Spec](../../../docs/COMPONENT_SPEC.md)** - 단일 소스 스펙 설계

## 기여

1. `rules/_template.md` 복사 → 적절한 접두사 사용
2. SKILL.md 인덱스에 링크 추가
3. impact 레벨 설정 (CRITICAL/HIGH/MEDIUM-HIGH/MEDIUM)
