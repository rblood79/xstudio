# ADR (Architecture Decision Records) 관리 대시보드

> **최종 업데이트**: 2026-03-08 (ADR-019 버그 수정 — Skia 렌더링 + Publish export 누락 해결)

## 현황 요약

| 구분                                   | 개수   |
| -------------------------------------- | ------ |
| 완료 (Accepted/Implemented/Superseded) | 16     |
| 부분 완료                              | 7      |
| 미구현 (Proposed/계획)                 | 7      |
| **합계**                               | **30** |

---

## 전체 ADR 상태

### 완료

| ADR                                         | 제목                               |    상태     | 완료일     | 비고                                                                           |
| ------------------------------------------- | ---------------------------------- | :---------: | ---------- | ------------------------------------------------------------------------------ |
| [001](001-state-management.md)              | Zustand State Management           |  Accepted   | 2024-01    | 기반 아키텍처                                                                  |
| [002](002-styling-approach.md)              | ITCSS + tailwind-variants          |  Accepted   | 2024-01    | 기반 아키텍처                                                                  |
| [003](003-canvas-rendering.md)              | PixiJS Canvas Rendering            | Superseded  | 2026-02-05 | CanvasKit/Skia 메인 렌더러 전환 완료, PixiJS 이벤트 전용                       |
| [004](004-preview-isolation.md)             | iframe Preview Isolation           |  Accepted   | 2024-01    | 기반 아키텍처                                                                  |
| [005](005-css-text-wrapping.md)             | CSS Text Wrapping                  | Implemented | 2026-03-03 | Phase 1~3 전체 완료                                                            |
| [006](006-child-composition-remaining.md)   | Child Composition Pattern          | Implemented | 2026-02-24 | 49/62 spec 완료, Table/Tree 2개 보류, Phase 5 Known Issues 잔존                |
| [007](007-project-export.md)                | Project Export/Import              | Implemented | 2026-01-02 | 100% 완성                                                                      |
| [008](008-layout-engine.md)                 | 캔버스 레이아웃 엔진 전환 (전략 D) | Implemented | 2026-02-17 | Taffy WASM 단일 엔진 전환 완료                                                 |
| [014](014-fonts.md)                         | Fonts 실행 계획                    | Implemented | 2026-03-05 | Phase A+B+C+C2+D+E 전체 완료 (FontRegistryV2 + 멀티파일 Export)                |
| [017](017-css-override-ssot.md)             | React-Aria CSS Override SSOT       | Implemented | 2026-03-04 | M3 38개 제거, 107개 CSS 치환, Tint Color System 도입                           |
| [018](018-component-css-restructure.md)     | 컴포넌트 CSS 구조 재작성           |  Complete   | 2026-03-07 | Phase 1~3 완료 (utilities.css + button-base + inset -249줄), Phase 4 스킵      |
| [022](022-s2-color-token-migration.md)      | React Spectrum S2 색상 토큰 전환   |  Accepted   | 2026-03-05 | Phase 1~5 완료, M3→S2 토큰 rename + CSS↔Skia 불일치 해소                       |
| [023](023-s2-component-variant-props.md)    | 컴포넌트 Variant Props S2 전환     |  Accepted   | 2026-03-05 | Phase 1+2+3 완료, Badge 19 variants, ToggleButton S2, Button premium/genai     |
| [025](025-s2-named-color-palette.md)        | S2 Named Color Palette 확장        |  Accepted   | 2026-03-08 | Phase 1~3 완료 (12색x2=24토큰, tokenResolver, Badge 19 variants), Phase 4 잔여 |
| [028](028-builder-css-scope-isolation.md)   | Builder CSS 스코프 격리            | Implemented | 2026-03-07 | Phase 0+1 완료 (`[data-context="builder"]` 전환 + 변수 30→21 축소)             |
| [029](029-builder-css-dead-code-cleanup.md) | Builder CSS Dead Code 정리         |  Complete   | 2026-03-07 | Phase 1-3 완료 (유령변수 138건 치환 + dead code 24건 + 모놀리식 CSS 분리)      |

### 부분 완료

| ADR                                               | 제목                                            | 완료 범위                                                                                                                        | 미완료 범위                                                                                                                            | 우선순위 |
| ------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | :------: |
| [009](009-full-tree-wasm-layout.md)               | Figma-Class Rendering & Layout                  | Foundation + Phase 0~4 구현 완료 (Phase 2 TypedArray, Phase 3 Flat Render List, Phase 4 R-tree) + Layout Worker(layoutWorker.ts) | Phase 2 SharedArrayBuffer + Phase 5 OffscreenCanvas Worker 미구현 (layoutWorker는 레이아웃 전용, OffscreenCanvas 렌더링 Worker와 별도) |    P4    |
| [010](010-events-panel.md)                        | Events Panel Smart Recommendations              | EventsPanel 기본 UI 완성 (Block WHEN→IF→THEN/ELSE) + P0/P1 완료 (추천 이벤트/액션 chips, 호환성 배지, 누락 경고, 18개 템플릿)    | P1.5 (UX 폴리싱) + P2 (AI 이벤트 생성) 미구현                                                                                          |    P5    |
| [011](011-ai-assistant-design.md)                 | AI Assistant 설계 (Groq Tool Calling)           | Phase A1~A4 전체 + A5a (styleAdapter 단위 정규화) + G.3 시각 피드백                                                              | Phase A5 잔여 (CanvasKit 스키마 변환, 멀티모달, 인스턴스/변수 도구)                                                                    |    P5    |
| [012](012-rendering-layout-pipeline-hardening.md) | 렌더링/레이아웃 파이프라인 하드닝               | P0~P2 전체 + P3-2(Viewport Culling) + P3-3(PersistentTaffyTree) 완료 (93%)                                                       | P3-1 부분 구현 (dirtyElementIds 인프라만, 핵심 DFS 최적화 미구현)                                                                      |    P5    |
| [021](021-theme-system-redesign.md)               | 테마 시스템 개편 — Tint + Tailwind 인라인 패널  | Phase A+B+C+D 완료 (ThemeStudio 삭제, Service 슬림화, useThemeManager 인라인)                                                    | Phase E (컴포넌트별 accent 오버라이드)                                                                                                 |    P4    |
| [026](026-responsive-constraint-ui.md)            | Responsive Constraint UI (Size Mode → CSS 매핑) | Phase 1-4 완료 (Size Mode + Min/Max + Aspect Ratio + Self-Alignment + Fill 비활성 힌트)                                          | 보류: 자동 CSS 재매핑, 다중 선택, Box Model 다이어그램                                                                                 |    P4    |
| [019](019-icon-system.md)                         | 아이콘 시스템 — Icon 선택/변경/추가             | Phase A+B+C+D 완료 (C2 simple element 경로, C4 SelectIcon+ComboBox 연동, C5 ComboBoxEditor IconPicker)                           | Phase E (추가 라이브러리)                                                                                                              |    P4    |
| [027](027-inline-text-editing.md)                 | Canvas Inline Text Editing                      | Phase A+B+C 완료 (TextEditOverlay + Quill + 멀티페이지 + Spec 컴포넌트 텍스트 편집)                                              | Phase D (리치 텍스트/툴바)                                                                                                             |    P4    |

> **참고**: ADR-029에 동일 번호의 [Text Edit Overlay UX 개선](029-text-edit-overlay-improvements.md) 문서가 존재하며, ADR-027의 후속 개선으로 Phase 1-2 모두 구현 완료 (Accepted).

### 미구현

| ADR                                       | 제목                                               | 상태     | 규모                                                                                                | 우선순위 |
| ----------------------------------------- | -------------------------------------------------- | -------- | --------------------------------------------------------------------------------------------------- | :------: |
| [013](013-quick-connect-data-binding.md)  | Quick Connect 데이터 바인딩                        | Proposed | 5 Phase, 21파일 — 기반 Collection 렌더러 완성, 자동화 UI 미구현                                     |  **P2**  |
| [015](015-sitemap-layout.md)              | Sitemap Hierarchy 워크플로우 엣지                  | Proposed | 변경 대상 8파일, 코드 미생성                                                                        |    P5    |
| [016](016-photoshop-ui-ux.md)             | Photoshop 벤치마크 기반 UI/UX (v2)                 | Proposed | P0~P2 3단계, Action Bar + Context Menu + AI Variations                                              |    P5    |
| [020](020-design-kit-improvement.md)      | Design Kit 패널 분석 및 개선                       | Proposed | 3 Phase — 기존 DesignKitPanel/Store 완성, Kit v2 스키마/Factory 연동/History 통합 미착수            |    P4    |
| [024](024-s2-css-variable-migration.md)   | CSS 변수명 S2 체계 전환                            | Proposed | 4 Phase, alias 점진 전환 → 60+ CSS 파일 변경                                                        |    P3    |
| [030](030-s2-spectrum-only-components.md) | React Spectrum S2 전용 컴포넌트 WebGL 마이그레이션 | Proposed | 4 Phase, 22개 컴포넌트 — Phase 0 선행 조건 감사 진행 중 (Factory 13개 누락, S2 Props ~50% 커버리지) |    P3    |

---

## 다음 진행 목표 (2026-03-08 기준)

|  순서  | 대상                    | 내용                                                                                                    | 규모 |   상태   |
| :----: | ----------------------- | ------------------------------------------------------------------------------------------------------- | :--: | :------: |
| ~~1~~  | ~~ADR-017~~             | ~~M3 토큰 제거 + Tint Color System + Spec 전환 + Theme Studio~~                                         |  중  | **완료** |
| ~~2~~  | ~~ADR-018 Phase 1~~     | ~~utilities.css 생성 + Button/Card 마이그레이션~~                                                       |  소  | **완료** |
| ~~3~~  | ~~ADR-014 Phase D~~     | ~~Publish 앱 레지스트리 전환~~                                                                          |  소  | **완료** |
| ~~4~~  | ~~ADR-014 Phase E~~     | ~~정적 Export 멀티파일~~                                                                                |  중  | **완료** |
| ~~5~~  | ~~ADR-022~~             | ~~S2 색상 토큰 전환 (M3→S2 rename + CSS↔Skia 일치)~~                                                    |  중  | **완료** |
| ~~6~~  | ~~ADR-023 Phase 1~~     | ~~S2 variant props (타입/컴포넌트/렌더러/에디터)~~                                                      |  중  | **완료** |
| ~~7~~  | ~~ADR-023 Phase 2~~     | ~~S2 variant Spec blocks rename, Factory 기본값, CSS 잔여 정리~~                                        |  중  | **완료** |
| ~~8~~  | ~~ADR-023 Phase 3~~     | ~~Button premium/genai, ToggleButton S2, Badge 19 variants, size padding 동기화~~                       |  중  | **완료** |
| ~~9~~  | ~~ADR-025~~             | ~~S2 Named Color Palette Phase 1~3 (12색x2 토큰 + tokenResolver + Badge)~~                              |  중  | **완료** |
| ~~10~~ | ~~ADR-018 Phase 2~3~~   | ~~컴포넌트 CSS 구조 재작성 — button-base + inset 적용~~                                                 |  중  | **완료** |
| ~~11~~ | ~~ADR-028/029~~         | ~~Builder CSS 스코프 격리 + Dead Code 정리~~                                                            |  중  | **완료** |
| ~~12~~ | ~~ADR-026~~             | ~~Responsive Constraint UI — Phase 1-4 완료~~                                                           |  대  | **완료** |
| ~~13~~ | ~~ADR-027 Phase C~~     | ~~Canvas Inline Text Editing — Spec 컴포넌트 텍스트 편집 (코드 대조 결과 이미 완료)~~                   |  소  | **완료** |
| ~~14~~ | ~~ADR-019 Phase C2+C4~~ | ~~아이콘 시스템 — C2 simple element 확인 + C4 SelectIcon/ComboBox 연동 + C5 ComboBoxEditor IconPicker~~ |  소  | **완료** |
| ~~15~~ | ~~ADR-030 Phase 0-1~~   | ~~Factory 누락 13개 컴포넌트 — 중앙 defaultPropsMap 통합 + ComponentList 등록~~                         |  소  | **완료** |
|   16   | ADR-013                 | Quick Connect 데이터 바인딩 — Collection 컴포넌트 1클릭 자동화 (5 Phase, 21파일)                        |  대  |          |
|   17   | ADR-021 Phase E         | 테마 시스템 — 컴포넌트별 accent 오버라이드 (Phase D 완료, E만 잔여)                                     |  소  |    P4    |

---

## 우선순위 근거

### P1: 완료

- ~~ADR-014 Fonts~~, ~~ADR-023 Variant Props~~, ~~ADR-017/018 CSS~~, ~~ADR-022 S2 토큰~~, ~~ADR-025 Named Color~~, ~~ADR-028/029 CSS 정리~~ 모두 완료

### P2: ADR-013

- ~~**ADR-027**: Canvas Inline Text Editing — Phase A+B+C 완료~~
- ~~**ADR-019**: Icon 시스템 — Phase A+B+C+D 완료 (C2 simple element 확인, C4+C5 Spec 연동)~~
- **ADR-013**: Collection 컴포넌트 데이터 바인딩 1클릭 자동화 — 초보자 학습 곡선 완화 (대규모)

### P3: ADR-024 + ADR-030 CSS/컴포넌트 체계

- **ADR-024**: CSS 변수명 S2 체계 전환 (alias 점진 전환)
- **ADR-030**: React Spectrum S2 전용 컴포넌트 마이그레이션 — Phase 0 선행 작업 진행 중

### P4: ADR-021 Phase E + ADR-009 Phase 2 잔여 + ADR-020 + ADR-026 잔여

- **ADR-021 Phase E**: 컴포넌트별 accent 오버라이드 (`data-accent` 속성) — Phase A-D 완료
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
