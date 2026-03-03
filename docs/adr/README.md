# ADR (Architecture Decision Records) 관리 대시보드

> **최종 업데이트**: 2026-03-03 (코드 대조 검증 반영)

## 현황 요약

| 구분 | 개수 |
|------|------|
| 완료 (Accepted/Implemented/Superseded) | 8 |
| 부분 완료 | 4 |
| 미구현 (Proposed/계획) | 4 |
| **합계** | **16** |

---

## 전체 ADR 상태

### 완료

| ADR | 제목 | 상태 | 완료일 | 비고 |
|-----|------|:----:|--------|------|
| [001](001-state-management.md) | Zustand State Management | Accepted | 2024-01 | 기반 아키텍처 |
| [002](002-styling-approach.md) | ITCSS + tailwind-variants | Accepted | 2024-01 | 기반 아키텍처 |
| [003](003-canvas-rendering.md) | PixiJS Canvas Rendering | Superseded | 2026-02-05 | CanvasKit/Skia 메인 렌더러 전환 완료, PixiJS 이벤트 전용 |
| [004](004-preview-isolation.md) | iframe Preview Isolation | Accepted | 2024-01 | 기반 아키텍처 |
| [005](005-css-text-wrapping.md) | CSS Text Wrapping | Implemented | 2026-03-03 | Phase 1~3 전체 완료 |
| [006](006-child-composition-remaining.md) | Child Composition Pattern | Implemented | 2026-02-24 | 49/62 spec 완료, Table/Tree 2개 보류 |
| [007](007-project-export.md) | Project Export/Import | Implemented | 2026-01-02 | 100% 완성 |
| [008](008-layout-engine.md) | 캔버스 레이아웃 엔진 전환 (전략 D) | Implemented | 2026-02-17 | Taffy WASM 단일 엔진 전환 완료 |

### 부분 완료

| ADR | 제목 | 완료 범위 | 미완료 범위 | 우선순위 |
|-----|------|-----------|-------------|:--------:|
| [009](009-full-tree-wasm-layout.md) | Figma-Class Rendering & Layout | Foundation + Phase 0~2 + Phase 3 Binary Protocol 부분 | Phase 3 SharedArrayBuffer, Phase 4 (Flat Render List + R-tree), Phase 5 (OffscreenCanvas Worker) | P4 |
| [010](010-events-panel.md) | Events Panel Smart Recommendations | P0 + P1 전체 (추천 이벤트/액션, 배지, 경고, 25개 액션 타입) | P1.5 (UX 폴리싱), P2 (AI 생성 + 고급) | P5 |
| [011](011-ai-assistant-design.md) | AI Assistant 설계 (Groq Tool Calling) | Phase A1~A4 전체 + A5a (styleAdapter 단위 정규화) | Phase A5 잔여 (CanvasKit 스키마 변환, 멀티모달, 인스턴스 도구) | P5 |
| [012](012-rendering-layout-pipeline-hardening.md) | 렌더링/레이아웃 파이프라인 하드닝 | P0 전체 + P1 3/4 + P2 3/4 (67% 완료) | P1-2 WASM 타임아웃, P2-4 Grid repeat(), P3 전체 | **P1** |

### 미구현

| ADR | 제목 | 상태 | 규모 | 우선순위 |
|-----|------|------|------|:--------:|
| [013](013-quick-connect-data-binding.md) | Quick Connect 데이터 바인딩 | Proposed | 5 Phase, 21파일 | **P3** |
| [014](014-fonts.md) | Fonts 실행 계획 | Proposed | Phase A~E, 프로젝트 레벨 폰트 시스템 | **P2** |
| [015](015-sitemap-layout.md) | Sitemap Hierarchy 워크플로우 엣지 | Proposed | 변경 대상 8파일, 코드 미생성 | P5 |
| [016](016-photoshop-ui-ux.md) | Photoshop 벤치마크 기반 UI/UX (v2) | Proposed | P0~P2 3단계, Action Bar + Context Menu + AI Variations | P5 |

---

## 우선순위 근거

### P1: ADR-012 파이프라인 하드닝

- **근거**: 데이터 무결성 + 런타임 안정성 직결
- **진행률**: 67% 완료 (P0 전체, P1 3/4, P2 3/4 구현됨)
- **잔여 이슈**: WASM 지수 백오프/재시도 (P1-2), Grid repeat() Rust 브릿지 (P2-4), ErrorBoundary/Telemetry (P3)
- **전제 조건**: ADR-009 Foundation 완료 (충족)
- **영향 범위**: 1,500+ 요소 시나리오 안정성

### P2: ADR-014 Fonts

- **근거**: 프로젝트 레벨 폰트 관리 부재 → 협업/배포 제약
- **진행률**: Phase A~E 전체 미착수
- **핵심 이슈**: localStorage만 사용 → 프로젝트 공유 시 폰트 유실, Skia 커스텀 폰트 미구현
- **전제 조건**: 없음 (독립 실행 가능)
- **영향 범위**: Builder/Preview/Publish 폰트 일관성

### P3: ADR-013 Quick Connect

- **근거**: Collection 컴포넌트 데이터 바인딩 3단계 수동 → 1클릭 자동화
- **진행률**: 전체 미착수 (Factory 6종, useCollectionData 등 기반 인프라는 존재)
- **핵심 이슈**: ListBox/Select/ComboBox/GridList/Menu/Table 대상, 초보자 학습 곡선 완화
- **전제 조건**: 없음 (독립 실행 가능)
- **영향 범위**: 데이터 바인딩 UX

### P4: ADR-009 Phase 3~5

- **근거**: Foundation~Phase 2 + Binary Protocol 부분 완료로 기본 성능 확보, 추가 최적화는 사용자 규모 증가 시
- **핵심 항목**: SharedArrayBuffer 제로카피, Flat Render List, OffscreenCanvas Worker
- **전제 조건**: Phase 2 Binary Protocol TypedArray 완료 (충족)
- **영향 범위**: 5,000+ 요소 대규모 프로젝트 성능

### P5: ADR-010 P1.5/P2 + ADR-011 A5 + ADR-015 + ADR-016

- **근거**: 핵심 기능 완료, 부가 기능/장기 계획
- ADR-010 P1.5: UX 폴리싱 (제안 단계)
- ADR-010 P2: AI 기반 이벤트 생성 (장기)
- **ADR-011 A5**: 캔버스 통합(CanvasKit 스키마 변환, 멀티모달, 인스턴스 도구) — AI 인프라 성숙 후 실행
- ADR-015: Sitemap 계층 시각화 (있으면 좋지만 필수 아님)
- ADR-016: Photoshop UI/UX (Action Bar, Context Menu, Floating Panel)

---

## 보류 항목

| 출처 | 항목 | 사유 | 재개 조건 |
|------|------|------|-----------|
| ADR-006 | Table/Tree 자식 조합 패턴 | 다단계 중첩 복잡도 | 별도 설계 필요 |
| ADR-010 P2 | AI 이벤트 생성 | 장기 계획 | AI 인프라 성숙 후 |

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|-----------|
| 2026-03-03 | 최초 작성 — 13개 ADR 전수 분석, 우선순위 결정 |
| 2026-03-03 | ADR-011 추가 — AI_ASSISTANT_DESIGN.md → adr/011-ai-assistant-design.md 이동 |
| 2026-03-03 | ADR-008 추가 — LAYOUT_ENGINE.md → adr/008-layout-engine.md 이동 |
| 2026-03-03 | 코드 대조 검증 — ADR-009~016 전수 검증, ADR-012 Proposed→Partial 승격, ADR-009 Phase 3 Binary Protocol 부분 구현 확인, ADR-011 A5a 부분 완료 확인 |
