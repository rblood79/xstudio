# ADR (Architecture Decision Records) 관리 대시보드

> **최종 업데이트**: 2026-03-16 (ADR-036 구현 완료, 완료 26개, 미구현 8개)

## 현황 요약

| 구분                                   | 개수   |
| -------------------------------------- | ------ |
| 완료 (Accepted/Implemented/Superseded) | 26     |
| 부분 완료                              | 7      |
| 미구현 (Proposed/계획)                 | 8      |
| **합계**                               | **41** |

---

## 전체 ADR 상태

### 완료

| ADR                                                            | 제목                                     |    상태     | 완료일     | 비고                                                                                                  |
| -------------------------------------------------------------- | ---------------------------------------- | :---------: | ---------- | ----------------------------------------------------------------------------------------------------- |
| [001](completed/001-state-management.md)                       | Zustand State Management                 |  Accepted   | 2024-01    | 기반 아키텍처                                                                                         |
| [002](completed/002-styling-approach.md)                       | ITCSS + tailwind-variants                |  Accepted   | 2024-01    | 기반 아키텍처                                                                                         |
| [003](completed/003-canvas-rendering.md)                       | PixiJS Canvas Rendering                  | Superseded  | 2026-02-05 | CanvasKit/Skia 메인 렌더러 전환 완료, PixiJS 이벤트 전용                                              |
| [004](completed/004-preview-isolation.md)                      | iframe Preview Isolation                 |  Accepted   | 2024-01    | 기반 아키텍처                                                                                         |
| [005](completed/005-css-text-wrapping.md)                      | CSS Text Wrapping                        | Implemented | 2026-03-03 | Phase 1~3 전체 완료                                                                                   |
| [006](completed/006-child-composition-remaining.md)            | Child Composition Pattern                | Implemented | 2026-02-24 | 49/62 spec 완료, Table/Tree 2개 보류, Phase 5 Known Issues 잔존                                       |
| [007](completed/007-project-export.md)                         | Project Export/Import                    | Implemented | 2026-01-02 | 100% 완성                                                                                             |
| [008](completed/008-layout-engine.md)                          | 캔버스 레이아웃 엔진 전환 (전략 D)       | Implemented | 2026-02-17 | Taffy WASM 단일 엔진 전환 완료                                                                        |
| [014](completed/014-fonts.md)                                  | Fonts 실행 계획                          | Implemented | 2026-03-05 | Phase A+B+C+C2+D+E 전체 완료 (FontRegistryV2 + 멀티파일 Export)                                       |
| [017](completed/017-css-override-ssot.md)                      | React-Aria CSS Override SSOT             | Implemented | 2026-03-04 | M3 38개 제거, 107개 CSS 치환, Tint Color System 도입                                                  |
| [018](completed/018-component-css-restructure.md)              | 컴포넌트 CSS 구조 재작성                 |  Complete   | 2026-03-07 | Phase 1~3 완료 (utilities.css + button-base + inset -249줄), Phase 4 스킵                             |
| [022](completed/022-s2-color-token-migration.md)               | React Spectrum S2 색상 토큰 전환         |  Accepted   | 2026-03-05 | Phase 1~5 완료, M3→S2 토큰 rename + CSS↔Skia 불일치 해소                                              |
| [023](completed/023-s2-component-variant-props.md)             | 컴포넌트 Variant Props S2 전환           |  Accepted   | 2026-03-05 | Phase 1+2+3 완료, Badge 19 variants, ToggleButton S2, Button premium/genai                            |
| [025](completed/025-s2-named-color-palette.md)                 | S2 Named Color Palette 확장              |  Accepted   | 2026-03-08 | Phase 1~3 완료 (12색x2=24토큰, tokenResolver, Badge 19 variants), Phase 4 잔여                        |
| [028](completed/028-builder-css-scope-isolation.md)            | Builder CSS 스코프 격리                  | Implemented | 2026-03-07 | Phase 0+1 완료 (`[data-context="builder"]` 전환 + 변수 30→21 축소)                                    |
| [024](completed/024-s2-css-variable-migration.md)              | CSS 변수명 S2 체계 전환                  | Superseded  | 2026-03-09 | ADR-022/028/029에서 `--bg`/`--fg`/`--accent`/`--border` 4축 체계로 전환 완료                          |
| [029](completed/029-builder-css-dead-code-cleanup.md)          | Builder CSS Dead Code 정리               |  Complete   | 2026-03-07 | Phase 1-3 완료 (유령변수 138건 치환 + dead code 24건 + 모놀리식 CSS 분리)                             |
| [021](completed/021-theme-system-redesign.md)                  | 테마 시스템 개편 — Tint + Tailwind       |  Accepted   | 2026-03-09 | Phase A+B+C+D+E 전체 완료 (Radix accent 오버라이드 포함)                                              |
| [030](completed/030-s2-spectrum-only-components.md)            | S2 전용 컴포넌트 마이그레이션            | Implemented | 2026-03-09 | Phase 0~4 전체 완료 (22개 컴포넌트 + 23 Property Editor + metadata 통합)                              |
| [031](completed/031-card-s2-migration.md)                      | Card S2 마이그레이션                     | Implemented | 2026-03-09 | Phase 1~3 완료 (Variant 통일 + CardPreview/Footer + cardType 변형)                                    |
| [033](completed/033-css-property-ssot-consolidation.md)        | CSS 속성 SSOT 통합 — 구조 변수화         | Implemented | 2026-03-11 | Phase 0~3 완료 (M3 잔여 제거 + Input/Button/Label/FieldError 변수화)                                  |
| [037](completed/037-workspace-scene-runtime-rearchitecture.md) | Workspace Scene Runtime 재구성           | Implemented | 2026-03-13 | Phase 0~6 완료 (SceneSnapshot, SelectionModel, invalidation packet, store split)                      |
| [035](completed/035-workspace-canvas-refactor.md)              | Workspace Canvas Runtime 리팩토링        | Implemented | 2026-03-13 | Phase 0~8 완료 (baseline 수집, invalidation/panel runtime test gate, WASM 분리)                       |
| [039](completed/039-page-scoped-rendering.md)                  | Multi-page Canvas Page-Scoped Rendering  | Implemented | 2026-03-13 | Phase 0~6 완료 (document/page snapshot 분리, visible page Pixi/Skia 렌더링, page-scoped invalidation) |
| [040](completed/040-visible-page-delta-runtime.md)             | Visible Page + Delta Runtime 전환        | Implemented | 2026-03-14 | Phase 0~6 완료 (snapshot recovery 분리, atomic activation, delta-first store/preview 계약)            |
| [036](completed/036-spec-first-single-source.md)               | Spec-First Single Source — CSS 자동 생성 | Implemented | 2026-03-16 | Phase 1~4 완료 (CSSGenerator 확장 + SIZE_CONFIG 제거 + 단순/복합 컴포넌트 CSS 전환)                   |

### 부분 완료

| ADR                                               | 제목                                            | 완료 범위                                                                                                                        | 미완료 범위                                                                                                                            | 우선순위 |
| ------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | :------: |
| [009](009-full-tree-wasm-layout.md)               | Figma-Class Rendering & Layout                  | Foundation + Phase 0~4 구현 완료 (Phase 2 TypedArray, Phase 3 Flat Render List, Phase 4 R-tree) + Layout Worker(layoutWorker.ts) | Phase 2 SharedArrayBuffer + Phase 5 OffscreenCanvas Worker 미구현 (layoutWorker는 레이아웃 전용, OffscreenCanvas 렌더링 Worker와 별도) |    P4    |
| [010](010-events-panel.md)                        | Events Panel Smart Recommendations              | EventsPanel 기본 UI 완성 (Block WHEN→IF→THEN/ELSE) + P0/P1 완료 (추천 이벤트/액션 chips, 호환성 배지, 누락 경고, 18개 템플릿)    | P1.5 (UX 폴리싱) + P2 (AI 이벤트 생성) 미구현                                                                                          |    P5    |
| [011](011-ai-assistant-design.md)                 | AI Assistant 설계 (Groq Tool Calling)           | Phase A1~A4 전체 + A5a (styleAdapter 단위 정규화) + G.3 시각 피드백                                                              | Phase A5 잔여 (CanvasKit 스키마 변환, 멀티모달, 인스턴스/변수 도구)                                                                    |    P5    |
| [012](012-rendering-layout-pipeline-hardening.md) | 렌더링/레이아웃 파이프라인 하드닝               | P0~P2 전체 + P3-2(Viewport Culling) + P3-3(PersistentTaffyTree) 완료 (93%)                                                       | P3-1 부분 구현 (dirtyElementIds 인프라만, 핵심 DFS 최적화 미구현)                                                                      |    P5    |
| [026](026-responsive-constraint-ui.md)            | Responsive Constraint UI (Size Mode → CSS 매핑) | Phase 1-4 완료 (Size Mode + Min/Max + Aspect Ratio + Self-Alignment + Fill 비활성 힌트)                                          | 보류: 자동 CSS 재매핑, 다중 선택, Box Model 다이어그램                                                                                 |    P4    |
| [019](019-icon-system.md)                         | 아이콘 시스템 — Icon 선택/변경/추가             | Phase A+B+C+D 완료 (C2 simple element 경로, C4 SelectIcon+ComboBox 연동, C5 ComboBoxEditor IconPicker)                           | Phase E (추가 라이브러리)                                                                                                              |    P4    |
| [027](027-inline-text-editing.md)                 | Canvas Inline Text Editing                      | Phase A+B+C 완료 (TextEditOverlay + Quill + 멀티페이지 + Spec 컴포넌트 텍스트 편집)                                              | Phase D (리치 텍스트/툴바)                                                                                                             |    P4    |

> **참고**: ADR-029에 동일 번호의 [Text Edit Overlay UX 개선](completed/029-text-edit-overlay-improvements.md) 문서가 존재하며, ADR-027의 후속 개선으로 Phase 1-2 모두 구현 완료 (Accepted).

### 미구현

| ADR                                       | 제목                                  | 상태     | 규모                                                                                     | 우선순위 |
| ----------------------------------------- | ------------------------------------- | -------- | ---------------------------------------------------------------------------------------- | :------: |
| [013](013-quick-connect-data-binding.md)  | Quick Connect 데이터 바인딩           | Proposed | 5 Phase, 21파일 — 기반 Collection 렌더러 완성, 자동화 UI 미구현                          |  **P3**  |
| [020](020-design-kit-improvement.md)      | Design Kit 패널 분석 및 개선          | Proposed | 3 Phase — 기존 DesignKitPanel/Store 완성, Kit v2 스키마/Factory 연동/History 통합 미착수 |    P4    |
| [015](015-sitemap-layout.md)              | Sitemap Hierarchy 워크플로우 엣지     | Proposed | 변경 대상 8파일, 코드 미생성                                                             |    P5    |
| [016](016-photoshop-ui-ux.md)             | Photoshop 벤치마크 기반 UI/UX (v2)    | Proposed | P0~P2 3단계, Action Bar + Context Menu + AI Variations                                   |    P5    |
| [032](032-events-data-integration.md)     | Events Platform 재설계 + Data 통합    | Proposed | Trigger/Effect/Capability/Recipe 모델 + BindingRef + Condition DSL + Events Panel 연동   |  **P3**  |
| [034](034-events-panel-renovation.md)     | Events Panel Renovation               | Proposed | 패널 IA 전면 개편 + recipe 중심 UX + diagnostics/preview/handler workflow                |  **P3**  |
| [038](038-figma-import.md)                | Figma 디자인 임포트 시스템            | Proposed | 4 Phase — API 프록시 + 노드 변환 엔진 + 컴포넌트 매핑 + 이미지 파이프라인                |  **P3**  |
| [041](041-spec-driven-property-editor.md) | Spec-Driven Property Editor 자동 생성 | Proposed | 107개 에디터 → Spec 기반 자동 생성 (ADR-036 후속)                                        |    P4    |

## Events Panel 설계 문서군

- [ADR-032](032-events-data-integration.md): 이벤트 플랫폼 상위 아키텍처
- [ADR-034](034-events-panel-renovation.md): Events Panel 전면 UX 개편 결정
- [events-panel-wireframe.md](/Users/admin/work/xstudio/docs/design/events-panel-wireframe.md): 화면 구조 와이어프레임
- [events-panel-state-model.md](/Users/admin/work/xstudio/docs/design/events-panel-state-model.md): 패널 상태 모델
- [events-panel-recipe-system.md](/Users/admin/work/xstudio/docs/design/events-panel-recipe-system.md): recipe 시스템 상세 설계
- [events-panel-binding-diagnostics.md](/Users/admin/work/xstudio/docs/design/events-panel-binding-diagnostics.md): binding diagnostics 설계
- [events-panel-review-checklist.md](/Users/admin/work/xstudio/docs/design/events-panel-review-checklist.md): 설계 리뷰 체크리스트

## Workspace Runtime 설계 문서군

- [ADR-035](035-workspace-canvas-refactor.md): 1차 runtime 구조 정리
- [workspace-canvas-refactor-breakdown.md](/Users/admin/work/xstudio/docs/design/workspace-canvas-refactor-breakdown.md): ADR-035 작업 분해
- [ADR-037](037-workspace-scene-runtime-rearchitecture.md): Scene Snapshot/Interaction Model 후속 구조 재구성 완료
- [ADR-039](039-page-scoped-rendering.md): visible page 중심 page-scoped rendering 완료
- [ADR-040](completed/040-visible-page-delta-runtime.md): visible page + delta update 모델로 상태 동기화 계약 전환 완료
- [039-phase-0-baseline.md](039-phase-0-baseline.md): ADR-039 baseline 및 budget
- [037-phase-0-baseline.md](037-phase-0-baseline.md): ADR-037 phase gate 기준
- [workspace-scene-runtime-breakdown.md](/Users/admin/work/xstudio/docs/design/workspace-scene-runtime-breakdown.md): ADR-037 실행 분해
- [workspace-scene-phase-1-scenesnapshot.md](/Users/admin/work/xstudio/docs/design/workspace-scene-phase-1-scenesnapshot.md): Phase 1 상세 구현 설계

---

## 다음 진행 목표 (2026-03-16 기준)

| 순서 | 대상    | 내용                                                                                               | 규모 | 상태 |
| :--: | ------- | -------------------------------------------------------------------------------------------------- | :--: | :--: |
|  1   | ADR-032 | Events Platform 재설계 — Trigger/Effect/Capability/Recipe 모델 + BindingRef + Condition DSL        |  대  |      |
|  2   | ADR-034 | Events Panel Renovation — recipe 중심 UX + diagnostics/preview + handler workflow (ADR-032 선행)   |  중  |      |
|  3   | ADR-013 | Quick Connect 데이터 바인딩 — 1클릭 Collection 연결 자동화 (ADR-032/034 선행)                      |  대  |      |
|  4   | ADR-038 | Figma 디자인 임포트 — REST API 프록시 + 노드 변환 엔진 + 컴포넌트 매핑                             |  대  |      |
|  5   | ADR-036 | Spec-First Single Source — CSS 자동 생성 기반 이중 렌더링 통합 (CSSGenerator 확장, ~70개 컴포넌트) |  중  | 완료 |
|  6   | ADR-041 | Spec-Driven Property Editor — 107개 에디터 자동 생성 (ADR-036 선행)                                |  중  |      |

> 완료된 #1~#21은 변경 이력 참조

---

## 우선순위 근거

### P1: 완료

- ~~ADR-014 Fonts~~, ~~ADR-023 Variant Props~~, ~~ADR-017/018 CSS~~, ~~ADR-022 S2 토큰~~, ~~ADR-025 Named Color~~, ~~ADR-028/029 CSS 정리~~ 모두 완료

### P2: Workspace Runtime (ADR-035 + ADR-037 + ADR-039 + ADR-040)

- ~~**ADR-027**: Canvas Inline Text Editing — Phase A+B+C 완료~~
- ~~**ADR-019**: Icon 시스템 — Phase A+B+C+D 완료 (C2 simple element 확인, C4+C5 Spec 연동)~~
- ~~**ADR-030**: React Spectrum S2 전용 컴포넌트 마이그레이션~~ — Phase 0~4 전체 완료 (22개 컴포넌트, 23 Property Editor, metadata 통합)
- ~~**ADR-031**: Card S2 마이그레이션~~ — Phase 1~3 완료 (Variant 통일 + CardPreview/Footer + cardType 변형)
- ~~**ADR-035**: Workspace Canvas Runtime 리팩토링~~ — 2026-03-13 Phase 0~8 완료
- ~~**ADR-037**: Workspace Scene Runtime 재구성~~ — 2026-03-13 구현 완료. `SceneSnapshot`, `SelectionModel`, `PointerSession`, renderer input contract, `canvasSync` split 반영
- ~~**ADR-039**: Multi-page Canvas Page-Scoped Rendering~~ — 2026-03-13 Phase 0~6 완료. visible page 중심 Pixi/Skia 렌더링, document/page snapshot 분리, page-scoped invalidation 반영
- ~~**ADR-040**: Visible Page + Delta Runtime~~ — 2026-03-14 Phase 0~6 완료. snapshot recovery 분리, atomic activation, delta-first store/preview 계약 정착

### P3: ADR-036 + ADR-032 → ADR-034 → ADR-013 (스타일 통합 + 이벤트 + 데이터 바인딩)

- ~~**ADR-036**: Spec-First Single Source~~ — Spec `variants`/`sizes`/`states`를 Single Source로 승격, CSS 자동 생성. SIZE_CONFIG 제거 → CSSGenerator 확장 → 단순 컴포넌트 ~40개 전환 → 복합 컴포넌트 2-layer 분리. 2026-03-16 완료
- ~~**ADR-024**: CSS 변수명 S2 체계 전환~~ — Superseded (ADR-022/028/029에서 4축 체계로 전환 완료)

**의존 체인** (순서 필수):

```
ADR-032 (Events Platform 재설계)
  → ADR-034 (Events Panel Renovation)
    → ADR-013 (Quick Connect 데이터 바인딩)
```

1. **ADR-032**: 현재 이벤트 엔진(Trigger/Effect 단순 구조) → Capability/Recipe 모델 + BindingRef + Condition DSL 재설계. 데이터 바인딩이 이벤트 시스템 위에서 동작하므로 **선행 필수**
2. **ADR-034**: 재설계된 이벤트 모델을 조작할 패널 UX (recipe 중심 + diagnostics/preview). 이벤트 모델 없이 UI 구현 불가
3. **ADR-013**: 이벤트 플랫폼 + 패널 UI 위에 Collection 데이터 바인딩 1클릭 자동화 레이어 구축

**P3 실행 시 병행되는 Property Editor 구조 변경**:

- **Child Item Management 제거 (10개 에디터)**: Select, ComboBox, RadioGroup, Tabs, Tag, Table, ListBox, GridList, Breadcrumbs 등의 Property Editor에 개별 구현된 자식 아이템 관리 UI를 제거. React Aria Components의 `items` data-driven Collection 패턴으로 전환하면 프로퍼티 에디터 내 자식 추가/삭제/정렬 관리가 불필요해짐
- **이벤트 설정 제거 (108개 에디터)**: onClick, onChange, onPress 등 이벤트 바인딩이 각 Property Editor에 산재 → Events Panel(ADR-034)로 중앙 집중. 프로퍼티 패널은 시각적 속성만 담당, 동작/이벤트는 Events Panel이 전담

### P4: ADR-009 Phase 2 잔여 + ADR-020 + ADR-026 잔여

- ~~**ADR-021 Phase E**: 컴포넌트별 accent 오버라이드~~ — 완료
- **ADR-026 잔여**: 자동 CSS 재매핑 (부모 display 변경 시), 다중 선택, Box Model 다이어그램 — Phase 1-4 완료
- **ADR-009**: Phase 0~4 + Layout Worker 구현 완료로 대부분 성능 확보. SharedArrayBuffer + OffscreenCanvas Worker 잔여
- **ADR-020**: Design Kit 패널 — 기존 인프라(DesignKitPanel/Store) 완성, ADR 범위 개선(Kit v2/Factory/History) 미착수

### P5: ADR-010 + ADR-011 A5 + ADR-012 P3-1 + ADR-015 + ADR-016

- **근거**: 핵심 기능 완료, 부가 기능/장기 계획
- **ADR-010**: EventsPanel P0/P1 완료, P1.5 UX 폴리싱 + P2 AI 이벤트 생성 미구현
- **ADR-011 A5**: 캔버스 통합(CanvasKit 스키마 변환, 멀티모달, 인스턴스/변수 도구) — AI 인프라 성숙 후 실행
- **ADR-012 P3-1**: dirtyElementIds 인프라만 구현, 핵심 DFS 최적화(isLayoutAffecting, traversePostOrderDirty) 미구현
- ADR-015: Sitemap 계층 시각화 (있으면 좋지만 필수 아님)
- ADR-016: Photoshop UI/UX (Action Bar, Context Menu, Floating Panel)

---

## 보류 항목

| 출처       | 항목                      | 사유               | 재개 조건         |
| ---------- | ------------------------- | ------------------ | ----------------- |
| ADR-006    | Table/Tree 자식 조합 패턴 | 다단계 중첩 복잡도 | 별도 설계 필요    |
| ADR-010 P2 | AI 이벤트 생성            | 장기 계획          | AI 인프라 성숙 후 |

---

---

## ADR 작성 가이드라인 (Risk-First Design Loop)

새 ADR 작성 시 아래 순서를 **필수로** 따릅니다. 자세한 방법론은 `.claude/agents/architect.md` 참조.

```
[금지]  Context → Decision → Consequences/Risks (기록용)
[필수]  Context → Alternatives → Risk per Alternative → Threshold Check → Decision → Gates
```

### 템플릿

```markdown
# ADR-NNN: [Title]

## Status

Proposed | Accepted | Deprecated | Superseded

## Context

[문제 설명 + 제약 조건 (hard constraints 명시)]

## Alternatives Considered

### 대안 A: [이름]

- 설명: ...
- 위험: 기술(L/M/H/C) / 성능(L/M/H/C) / 유지보수(L/M/H/C) / 마이그레이션(L/M/H/C)

### 대안 B: [이름]

- 설명: ...
- 위험: 기술(L/M/H/C) / 성능(L/M/H/C) / 유지보수(L/M/H/C) / 마이그레이션(L/M/H/C)

## Decision

[선택된 대안 + 위험 수용 근거]

## Gates

[잔존 HIGH 위험에 대한 Gate 테이블. 없으면 "잔존 HIGH 위험 없음" 명시]

## Consequences

### Positive

### Negative
```

### Risk Threshold Check 규칙

- 모든 대안이 HIGH 1개 이상 → 위험을 회피하는 새 대안 추가
- 어떤 대안이든 CRITICAL 1개 이상 → 근본적으로 다른 접근 추가
- 최대 2회 루프 후에도 HIGH 이상이면 "위험 수용 근거" 명시

---

## 변경 이력

| 날짜       | 변경 내용                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-03-03 | 최초 작성 — 13개 ADR 전수 분석, 우선순위 결정                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-03-03 | ADR-011 추가 — AI_ASSISTANT_DESIGN.md → adr/011-ai-assistant-design.md 이동                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-03-03 | ADR-008 추가 — LAYOUT_ENGINE.md → adr/008-layout-engine.md 이동                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-03-03 | 코드 대조 검증 — ADR-009~016 전수 검증, ADR-012 Proposed→Partial 승격, ADR-009 Phase 3 Binary Protocol 부분 구현 확인, ADR-011 A5a 부분 완료 확인                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-03-03 | Risk-First ADR 템플릿 추가 — Alternatives→Risk→Decision→Gates 순서 필수화                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-03-04 | ADR-012 P1-2/P2-3 구현 완료 확인 — 코드 대조 결과 이미 구현됨 확인, 67%→80% 갱신. 잔여: P3 장기 최적화 3건                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-03-04 | ADR-014 Phase C2 완료 — Font Manager Panel + PropertyListItem 재사용 컴포넌트 + OS/2 메타데이터 추출. 우선순위 근거 갱신                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-03-04 | ADR-017 추가 — Input CSS Override SSOT 정리 (CSS Custom Properties SSOT + 셀렉터 정규화 + Dead Code 제거)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-03-04 | ADR-017 재작성 — M3 제거 + Tailwind 통합 방향으로 전면 개정. ADR-009 P3→P4 조정, ADR-017 P3 신설. 로드맵에 Phase 1~2 추가                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 2026-03-04 | ADR-018 추가 — 컴포넌트 CSS 구조 재작성 (react-aria-starter 패턴 기반, utilities.css 3대 유틸리티 도입, 15,652→~6,000줄 목표). P3에 017+018 통합                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-03-04 | ADR-017/018 갭 분석 12건 반영 — Gate 번호 수정, M3 실참조 64파일 정정, Publish 앱 영향 추가, Card.css 레거시 셀렉터 마이그레이션, AI Theme Generator 5파일 열거, :focus-visible 3파일 처리 추가, M3_COMPONENT_TEMPLATE.css 폐기 명시                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-03-04 | ADR-019 추가 — 아이콘 시스템 (Builder UI 아이콘 선택/변경/추가). Icon 독립 컴포넌트 + IconPicker UI + Preview/Publish 렌더링. 5 Phase (A~E), P2 우선순위                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| 2026-03-04 | ADR-017/018 코드베이스 재검증 — builder CSS M3 사용 7개→52개(총 107개) 정정, base.css Phase 1 대상 제외, Gate G0(자동화 dry-run) 추가 + Tier 4(builder 패널 45파일) 신설, Card.tsx data-variant 전달 확인됨                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-03-04 | ADR-017/018 최종 갭 해소 — ① Theme Studio 12파일 작업 경계 명시(ADR-017 단독 소유, ADR-018 제외 확인), ② builder-system.css 기존 버그 문서화(8토큰 누락: tertiary 6개 + error-hover/pressed 2개, Phase 2에서 자연 해소), ③ Phase 1+Tier 1 원자적 적용 필수 명시(G1 Gate 재정의)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-03-04 | **ADR-017 Implemented** — M3 38개 토큰 제거, 107개 CSS 시맨틱 치환, Tint Color System 도입, Spec 전환, Theme Studio 확인. **ADR-018 Partial** — Phase 1 (utilities.css) + Button/Card 완료. 로드맵 갱신, 현황 요약 카운트 조정                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-03-04 | ADR-020 추가 — Design Kit 패널 분석 및 개선 (10개 문제점 식별, 3 Phase 로드맵, Kit v2 스키마 + Factory 통합 설계). P4 우선순위                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-03-04 | ADR-021 추가 — 테마 시스템 개편 (Tint + Tailwind 인라인 패널). 업계 리서치 (Webflow/Framer/Figma/Squarespace/shadcn), ThemeStudio 새 창 → 인라인 패널 전환, CSS 변수 네이티브 테마. P2 우선순위                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 2026-03-04 | **ADR-018 Implemented** — Phase 2~5 전체 완료 (38파일 11,657→8,101줄, -30%). 로컬 CSS 변수 패턴 전환, 셀렉터 정규화(class→data-\*), M3 토큰 Spec/Builder/PerformanceDashboard/Group 전체 제거. ADR-018 완료→완료 섹션 이동, 로드맵/우선순위 갱신                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-03-04 | **ADR-017 Phase 3 패치** — SelectIcon Skia 색상 불일치 수정 (`field-background`→`surface-container`, `text-color`→`on-surface-variant`), `transparent` 토큰 추가 (ColorTokens+colors.ts+tokenResolver), specShapeConverter `colorValueToFloat32()` 안전 처리. Phase 3 실제 구현 내역으로 ADR 갱신                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 2026-03-05 | **ADR-022 Accepted** — Phase 1~5 구현 완료 (M3→S2 토큰 전환, CSS↔Skia 불일치 해소, Label 색상 상속). 완료 섹션 이동. **ADR-023/024/025 Proposed** — S2 후속 3건: 컴포넌트 Variant Props 전환(P2), CSS 변수명 전환(P3), Named Color Palette 확장(P3). 현황 카운트 갱신 (완료 11, 미구현 9, 합계 25)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 2026-03-05 | **코드 대조 재검증 4건 반영** — ① ADR-009: Phase 3(Flat Render List), Phase 4(R-tree), Phase 5(Worker) 구현 확인 → 완료 범위 Phase 0~2→Phase 0~5 확대 ② ADR-012: P3-2(Viewport Culling) + P3-3(PersistentTaffyTree) 구현 확인 → 80%→93% ③ ADR-018: Phase 2~5 미착수 확인(utility className 미적용, CSS 13,383줄) → Implemented→Partial 정정, 완료→부분완료 이동 ④ ADR-021: Phase D 부분 완료 확인(ThemeStudio 삭제, themeStore 축소, /theme 라우트 제거). 현황 카운트 갱신 (완료 10, 부분 7)                                                                                                                                                                                                                                                                                        |
| 2026-03-05 | **ADR-021 Phase A+B+C 완료** — 인라인 ThemesPanel(Tint 10색+Mode+Tone+Radius), MiniThemePreview, CSS Preview iframe 동기화, Skia/WebGL 3경로 동시 반영, Dark Mode Skia 적용(resolveSkiaTheme+BodyLayer base 전환), localStorage 영속화, Publish/Export themeCSS 통합. 8건 패치(필드명 불일치, merge 로직, hex 직접 전송, inline CSS 변수, iframe timing, SET_DARK_MODE, specShapesToSkia theme 전달, Body 배경 전환). Proposed→Partial 이동, 현황 카운트 갱신 (부분완료 6, 미구현 8)                                                                                                                                                                                                                                                                                                |
| 2026-03-05 | **ADR-023 Partial** — Phase 1 완료: componentVariants.types.ts S2 전환, 30+ 컴포넌트 TSX variant/isEmphasized 변경, 렌더러 S2 props 반영, 5개 에디터(Button/Badge/Card/Meter/Link) S2 옵션 전환. Proposed→Partial 이동. 로드맵/우선순위 재정리 (P2: ADR-023 Ph2→ADR-026→ADR-013→ADR-019, P3: ADR-018+024+025)                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 2026-03-05 | **ADR-023 Accepted** — Phase 2 완료: ToggleButton.spec.ts isEmphasized, Label.spec.ts 주석 S2 정리, NavigationComponents.ts Factory Pagination 버튼 S2 전환(variant: outline→secondary+fillStyle, default→accent). Partial→Accepted(완료) 이동. P2 우선순위 ADR-026→ADR-013→ADR-019으로 갱신                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-03-05 | **ADR-023 Phase 3 완료** — Button premium/genai variant 추가, ToggleButton S2 전환(variant 제거→isEmphasized/isQuiet boolean), ToggleButtonGroup default size S→M, Badge S2 named color 13종 추가(총 19 variants), Badge size padding S2 spacing 토큰 동기화, tokenResolver 13색 매핑, cssVariableReader S2 fallback 전환. ADR-025 Badge 부분 supersede 반영                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 2026-03-06 | **ADR-027 Proposed** — Canvas Inline Text Editing (WebGL 위 텍스트 직접 편집). Pencil 앱 분석 기반, DOM Overlay + contenteditable 방식 채택. 4 Phase (A: MVP Text/Heading, B: 줌/팬/멀티페이지, C: Spec 컴포넌트 내부 텍스트, D: 리치 텍스트). P2 우선순위. 현황 카운트 갱신 (미구현 9, 합계 27)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 2026-03-06 | **전수 코드베이스 대조 검증 (5개 병렬 에이전트)** — ① ADR-010: EventsPanel.tsx + getRecommendedActions() 발견 → 미구현→부분완료 재승격 ② ADR-027: TextEditOverlay.tsx + useTextEdit.ts 구현 확인 → 미구현→부분완료 승격 ③ ADR-012 P3-1: dirtyElementIds 인프라 구현 확인 (핵심 DFS 최적화 미구현) → "미구현"→"부분 구현" 정정 ④ ADR-009: layoutWorker.ts는 레이아웃 전용 Worker, OffscreenCanvas 렌더링 Worker와 별도 확인 ⑤ ADR-011: G.3 시각 피드백 구현 확인 ⑥ ADR-018: Phase 2 Button만 완료(14%, 1/7), CSS 총 13,718줄 확인 ⑦ ADR-021: Phase D UnifiedThemeStore/Service 잔존 확인, Phase E 미구현 ⑧ ADR-019: Skia 렌더링 인프라(lucideIcons, renderIconPath) 존재 비고 추가 ⑨ ADR-020: 기존 DesignKitPanel/Store 완성 비고 추가. 현황 카운트 갱신 (부분완료 5→7, 미구현 11→9) |
| 2026-03-07 | **ADR-030 Proposed** — React Spectrum S2 전용 컴포넌트 WebGL 마이그레이션. React Aria 78개 구현 완료 후 S2 고유 22개 추가 (Avatar, ActionButton, RangeSlider, CardView 등). 4 Phase 점진 구현 (난이도+활용도 기반). P3 우선순위. 현황 카운트 갱신 (미구현 8→9, 합계 29→30)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-03-08 | **전수 코드베이스 대조 검증 (4개 병렬 에이전트)** — ① ADR-018 Complete 확인 → 부분완료→완료 승격 ② ADR-025 Phase 1~3 구현 확인 (12색x24토큰+tokenResolver+Badge) → Proposed→Accepted 완료 승격 ③ ADR-027 Phase A+B 구현 확인 (TextEditOverlay+Quill+멀티페이지+subscribeBounds) → Proposed→Partial 승격 ④ ADR-028 Phase 0+1 완료 확인 → 부분완료→완료 승격 ⑤ ADR-029(CSS) Phase 1-3 완료 확인 → 부분완료→완료 승격 ⑥ ADR-029(text-edit) Phase 1-2 완료 확인 → Proposed→Accepted ⑦ ADR-006: ElementSprite.tsx COMPLEX_COMPONENT_TAGS 체크 누락(Phase 5 Known Issues) 확인 ⑧ ADR-010: 템플릿 18개 정합 확인. 현황 카운트 갱신 (완료 12→16, 부분완료 9→6, 미구현 9→8)                                                                                                                  |
| 2026-03-08 | **전수 코드베이스 재대조 (5개 병렬 에이전트, 30개 ADR 전수)** — ① ADR-019: Phase C 부분 미구현 발견 (C2 Icon Factory 미등록 — 캔버스 드래그 불가, C4 기존 Spec iconName prop 연동 6개 미구현) → "Phase A-D 완료"→"Phase A+B+D + C 부분" 정정 ② ADR-027: Phase C 70% 진행 중 확인 (TEXT_ELEMENT_TAGS에 Button/Badge/ToggleButton 등록 + extractFullSpecTextStyle 완성, extractSpecTextBounds 잔여) → 미완료 범위 갱신 ③ ADR-009/010/011/012: 문서-코드 일치 확인 ④ ADR-021/026: 문서-코드 일치 확인 ⑤ ADR-030/024/013: 미구현 0% 확인 ⑥ ADR-014/018/025/028/029/006: 완료 상태 재확인                                                                                                                                                                                                |
| 2026-03-08 | **ADR-019 버그 수정 2건** — ① Skia 렌더링 미표시: `IMAGE_TAGS`에 `Icon` 포함 → `spriteType=image` → Spec shapes 경로 진입 불가. `IMAGE_TAGS`에서 제거 + `UI_BADGE_TAGS`에 추가 ② Publish export 누락: `components/Icon.tsx` 존재했으나 `index.tsx`에 export 미등록 → ComponentRegistry import 에러. `export { Icon }` 추가. 색상 변경은 스타일 패널 `color` 속성으로 지원 (추가 UI 불필요)                                                                                                                                                                                                                                                                                                                                                                                          |
| 2026-03-09 | **ADR-024 Superseded** — 코드 대조 결과 ADR-022/028/029에서 구 변수(`--highlight-background` 등) → 새 4축 체계(`--bg`/`--fg`/`--accent`/`--border`) 전환 이미 완료 확인. `--s2-` 접두사 방식은 미채택. 잔존 구 변수 3건은 React Aria Checkbox 내부 로컬 변수(변경 불가). 미구현→완료 이동, 현황 카운트 갱신 (완료 17, 미구현 6). **ADR-030 Phase 0 완료** — G0-2(S2 Props 렌더러 전달) + G0-4(Factory `name` 기본값) + G0-5(Toast/Pagination 렌더러 추가) 구현. G0-3(이벤트) 스킵 (이벤트 엔진 미성숙으로 리스크 없음)                                                                                                                                                                                                                                                              |
| 2026-03-09 | **ADR 디렉토리 정리** — 완료된 ADR 19건(17건 완료 + audit report + text-edit overlay)을 `completed/` 하위 디렉토리로 이동. 루트에는 진행 중/미구현 ADR만 유지. README.md 링크 갱신. **컴포넌트 패널 카테고리 재구성** — React Aria/Spectrum 공식 분류 기준 + 실용적 병합으로 9개→7개 카테고리 (Content, Layout, Buttons, Forms, Collections, Date&Time, Overlays). metadata.ts 카테고리명 동기화. Div(division) 제거, Group은 Layout에 배치                                                                                                                                                                                                                                                                                                                                         |
| 2026-03-09 | **ADR-021 Phase E 완료** — Radix Themes `color` prop 패턴 도입. CSS `[data-accent]` 10개 규칙 + Preview 7개 컨테이너 렌더러 + Publish ElementRenderer `data-accent` 속성 + Skia `withAccentOverride()` 동기 mutation 패턴 + ElementSprite 부모 체인 accent 탐색 + PanelEditor/CardEditor "Accent Color" PropertySelect UI. ADR-021 부분완료→완료 승격 (완료 18, 부분완료 6)                                                                                                                                                                                                                                                                                                                                                                                                         |
| 2026-03-09 | **ADR-030 Phase 0~4 전체 완료 (Implemented)** — 22개 S2 전용 컴포넌트 구현 완료. 23개 Property Editor 생성, 23개 ComponentMeta(metadata.ts) 등록. Spec Props 보강 3건(SegmentedControl isJustified, CardView variant/selectionMode/selectionStyle, TableView selectionMode). SelectBoxGroup/SelectBoxItem 전체 통합 (Spec+Factory+Renderer+Publish+TAG_SPEC_MAP+COMPLEX_COMPONENT_TAGS). RangeCalendar Publish 누락 수정. 미구현→완료 이동 (완료 19, 미구현 5)                                                                                                                                                                                                                                                                                                                      |
| 2026-03-12 | **ADR-035 추가 + 부분 완료 확인** — Workspace Canvas Runtime 리팩토링 (9 Phase). 코드 대조 결과: Phase 0~2 부분 구현 (GPUMetrics, Workspace hooks 분리, ViewportController 단일 원천), Phase 4~5 부분 구현 (renderCommands.ts, skiaFrameHelpers.ts, boundsMap 재사용). Phase 3 InvalidationReason enum 미구현, Phase 5 nodeRenderers 도형별 분해 미완, Phase 6~8 미구현. ADR-031 링크 `completed/` 경로로 수정. 현황 카운트 갱신 (부분완료 6→7, 합계 33→34). 우선순위 P2로 배치 (핵심 런타임 구조 개선)                                                                                                                                                                                                                                                                             |
| 2026-03-12 | **ADR-035 Phase 2/4/5/6 완료 + 프로젝트 전체 ESLint 정리** — Phase 2: canvasSync deprecation, viewport 단일 원천 확립. Phase 4: SkiaOverlay → skiaOverlayBuilder.ts(426줄)/skiaFramePlan.ts/skiaFramePipeline.ts 추출, SharedSceneDerivedData/FrameRenderPlan 타입 정의, SkiaOverlay 1268→1026줄. Phase 5: nodeRenderers.ts → 8파일 barrel (extract-only). Phase 6: cssVariableReader.ts(7502줄) → 4모듈 barrel. ESLint: builder 27에러→5에러(React Compiler 한계), shared 7에러→0에러, publish 2에러→0에러. 수정 ~43건 (unused vars ~20, set-state-in-effect 8, refs-during-render 7, any→Record 2, rules-of-hooks 1 등). 잔존 5개 Compilation Skipped는 ElementSprite/TextSprite 수동 useMemo 정상 작동 확인, 리팩터링 불필요 판정                                                |
| 2026-03-13 | **ADR-035 Phase 6 key normalization + 상태 문서 정리** — `cssComponentPresets.ts`의 size preset getter에 `xs/sm/md/lg/xl` ↔ `XS/S/M/L/XL` 정규화 레이어 추가. `computedStyleService`가 읽는 Button/Input/Radio/ProgressBar/Badge/Card/TextField/TextArea 등 공용 preset 경로에서 lower/upper key 계약 불일치 제거. ADR-035/README 상태를 실제 코드 기준으로 갱신: Phase 3/7은 부분 구현, Phase 8은 격리 규칙 반영 후 gate 대기 상태로 정정.                                                                                                                                                                                                                                                                                                                                         |
| 2026-03-13 | **ADR-037 Implemented** — Workspace Scene Runtime 재구성 Phase 0~6 전체 완료. `SceneSnapshot`/`SceneIndex` 도입, `SelectionModel`/`PointerSession` 분리, `rendererInput`/`invalidationPacket`로 renderer 입력 단일화, `layoutCache`/`cullingCache`/`subtreeInvalidation` 연결, `canvasSync`를 viewport/lifecycle/metrics store로 분리, legacy helper 및 compatibility usage 정리. 완료 섹션 이동, 현황 카운트 갱신 (완료 22, 미구현 7)                                                                                                                                                                                                                                                                                                                                              |
| 2026-03-13 | **ADR-036 Proposed** — Spec-First Single Source: CSS 자동 생성 기반 이중 렌더링 통합. 3중 동기화 문제(CSS 13K줄 + Spec 19K줄 + SIZE_CONFIG) 해결 방안. 대안 C 채택: Spec `variants`/`sizes`/`states` 메타데이터를 Single Source로 승격, `CSSGenerator.ts`(기존 276줄 POC) 확장하여 CSS 자동 생성. 4 Phase 로드맵 (Phase 0: SIZE_CONFIG 제거, Phase 1: CSSGenerator 확장, Phase 2: 단순 ~40개 전환, Phase 3: 복합 ~30개 2-layer 분리). 현황 카운트 수정 (부분완료 7→8, 합계 36→37). P3 우선순위 배치, 다음 진행 목표 #21 추가                                                                                                                                                                                                                                                        |
| 2026-03-13 | **ADR-038 Proposed** — Figma 디자인 임포트 시스템. Figma REST API → XStudio Element 변환 엔진. 4 Phase: Core Structure(MVP ~60% 재현) → Visual Fidelity(~80%) → Component System(~90%) → Edge Cases(~95%). 하이브리드 아키텍처: Supabase Edge Function(API 프록시+이미지) + 클라이언트(변환 엔진). Auto Layout→flex 직접 매핑, Component/Instance→master/instance, Pencil(.pen) 호환 파이프라인 공유 가능. 미구현→8, 합계→38                                                                                                                                                                                                                                                                                                                                                        |
| 2026-03-11 | **ADR-033 Implemented** — Phase 0~3 전체 완료. Phase 0: M3 잔여 토큰 제거(Tree.css, GridList.css) + 순수 중복 제거(RadioGroup, CheckboxGroup, Slider FieldError/Label 블록). Phase 1: Input/TextArea 구조 변수화(`--input-padding/font-size/line-height/border`, 12개 필드 컴포넌트 부모 위임). Phase 2: Button 구조 변수화(`--btn-display/justify/gap/border/radius/padding/font-size/line-height/cursor/transition`, size variants 변수 전환, 7개 컴포넌트 부모 위임). Phase 3: Label(`--label-font-size/font-weight/color/margin`) + FieldError(`--error-font-size/margin`) 변수화, 13개 컴포넌트 부모 위임. 현황 카운트 갱신 (완료 21, 미구현 5)                                                                                                                                |
| 2026-03-14 | **ADR-035/037/039 `completed/` 이동** — Implemented 상태의 3건을 `completed/` 디렉토리로 이동, README 링크 갱신. **ADR-041 미구현 섹션 등록** — Spec-Driven Property Editor (107개 에디터 자동 생성, ADR-036 후속). 다음 진행 목표를 2026-03-14 기준으로 전면 갱신 — 완료 #1~#20 축약, 잔여 7건 우선순위 재배치 (ADR-040→032→034→013→038→036→041). 현황 카운트 갱신 (미구현 9→10, 합계 40→41)                                                                                                                                                                                                                                                                                                                                                                                       |
