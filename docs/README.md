# XStudio 문서 (Documentation)

XStudio 프로젝트의 기술 문서를 [Diátaxis 프레임워크](https://diataxis.fr/)에 따라 구성했습니다.

---

## 디렉토리 구조

```
docs/
├── adr/             # Architecture Decision Records
├── tutorials/       # 학습 중심 실습 가이드
├── how-to/          # 문제 해결 단계별 가이드
├── reference/       # API, 스키마, 상태 참조
├── explanation/     # 아키텍처, 개념 설명
├── legacy/          # 완료/폐기된 과거 문서
├── pencil-extracted/# Pencil Desktop 역공학 분석
├── CHANGELOG.md     # 변경 이력
└── README.md        # 문서 인덱스
```

---

## 설계 문서 (Design Documents)

> 핵심 아키텍처 및 기능 설계 문서입니다.

- [AI 기능 설계](./AI.md) - AI Agent Loop + Tool Calling 설계
- [WASM 렌더링 아키텍처](./WASM.md) - CanvasKit/Skia WASM 전환
- [컴포넌트 스펙 아키텍처](./COMPONENT_SPEC_ARCHITECTURE.md) - 단일 소스 컴포넌트 스펙
- [React Aria 마이그레이션 전략](./REACT_ARIA.md) - WebGL 컴포넌트 마이그레이션
- [레이아웃 엔진 ADR](./ENGINE.md) - Taffy WASM + Dropflow Fork 전략
- [CSS 속성 지원 체크리스트](./ENGINE_CHECKLIST.md) - CSS 속성별 지원 상태
- [컬러 피커 + Fill 시스템](./COLOR_PICKER.md) - Color/Gradient/EyeDropper/BlendMode
- [Agent Teams 매뉴얼](./AGENTS_TEAMS.md) - Claude Code 에이전트 협업

### ADR (Architecture Decision Records)

| ADR | 제목 | 상태 |
|-----|------|------|
| [001](./adr/001-state-management.md) | 상태 관리 (Zustand) | Implemented |
| [002](./adr/002-styling-approach.md) | 스타일링 (ITCSS + Tailwind) | Implemented |
| [003](./adr/003-canvas-rendering.md) | Canvas 렌더링 (CanvasKit/Skia + PixiJS) | Implemented |
| [004](./adr/004-preview-isolation.md) | Preview 격리 (iframe + postMessage) | Implemented |
| [005](./adr/005-full-tree-wasm-layout.md) | Full-Tree WASM 레이아웃 | In Progress |
| [006](./adr/006-rendering-layout-pipeline-hardening.md) | 렌더링/레이아웃 파이프라인 강화 | Implemented |
| [007](./adr/007-quick-connect-data-binding.md) | Quick Connect 데이터 바인딩 | Implemented |
| [008](./adr/008-css-text-wrapping.md) | CSS 텍스트 래핑 에뮬레이션 | Implemented |
| [009](./adr/009-child-composition-remaining.md) | Child Composition 잔여 작업 | In Progress |
| [010](./adr/010-events-panel.md) | Events Panel | Implemented |
| [011](./adr/011-fonts.md) | 폰트 시스템 | Implemented |
| [012](./adr/012-project-export.md) | 프로젝트 내보내기 | Design |
| [013](./adr/013-sitemap-layout.md) | Sitemap 레이아웃 | Design |

---

## Tutorials (튜토리얼)

> 학습 중심의 실습 가이드입니다.

### Getting Started
- [Electron 설정 가이드](./tutorials/getting-started/ELECTRON_SETUP.md)

### Features
- [Tree 컴포넌트 가이드](./tutorials/features/TREE_COMPONENT.md)
- [이벤트 테스트 가이드](./tutorials/features/EVENT_TESTING.md)

---

## How-to Guides (가이드)

> 특정 문제를 해결하기 위한 단계별 가이드입니다.

### Migration (마이그레이션)
- [React Query 스타일 마이그레이션](./how-to/migration/REACT_QUERY_STYLE.md)

### Troubleshooting (문제 해결)
- [Rate Limit 해결](./how-to/troubleshooting/RATE_LIMIT.md)

### Development (개발)
- [기여 가이드](./how-to/development/CONTRIBUTING.md)
- [README 작성 가이드](./how-to/development/README_WRITING.md)
- [Skeleton 시스템 구현](./how-to/development/SKELETON_SYSTEM.md)
- [P7 구현 계획](./how-to/development/P7_IMPLEMENTATION.md)
- [패널 최적화](./how-to/development/PANEL_OPTIMIZATION.md)
- [성능 구현 가이드](./how-to/development/PERFORMANCE_IMPLEMENTATION.md)
- [Long Task 최적화](./how-to/development/LONG_TASK_OPTIMIZATION.md)
- [벤치마크 템플릿](./how-to/development/BENCHMARK_TEMPLATE.md)
- [컴포넌트 통합](./how-to/development/COMPONENT_CONSOLIDATION.md)

---

## Reference (참조)

> 기술적 상세 정보를 제공하는 참조 문서입니다.

### API
- [API 엔드포인트](./reference/api/ENDPOINTS.md)

### Schemas (스키마)
- [IndexedDB 스키마](./reference/schemas/INDEXDB.md)
- [Supabase 스키마](./reference/schemas/SUPABASE.md)

### Structure (구조)
- [Hooks 구조](./reference/STRUCTURE_HOOKS.md) - Builder hooks 구조 및 사용 패턴
- [Store 구조](./reference/STRUCTURE_STORE.md) - Zustand store 구조 및 슬라이스 패턴
- [Monorepo 구조](./reference/MONOREPO.md) - 모노레포 패키지 구조
- [Multi-Page 렌더링](./reference/MULTIPAGE.md) - 다중 페이지 캔버스 렌더링
- [Workflow 설계](./reference/WORKFLOW.md) - Workflow 시스템

### Components (컴포넌트)
- [패널 시스템](./reference/components/PANEL_SYSTEM.md)
- [CSS 아키텍처](./reference/components/CSS_ARCHITECTURE.md)
- [React Aria 라이브러리 통합](./reference/components/REACT_ARIA_LIBRARIES.md)
- [Transformer 보안](./reference/components/TRANSFORMER_SECURITY.md)
- [Custom ID 패턴](./reference/components/CUSTOM_ID_PATTERN.md)
- [Data Panel](./reference/components/DATA_PANEL.md)
- [Inspector 스타일](./reference/components/INSPECTOR_STYLE.md)
- [Inspector 리팩토링](./reference/components/INSPECTOR_REFACTORING.md)
- [Collection 데이터 바인딩](./reference/components/COLLECTION_DATA_BINDING.md)
- [Layout Presets](./reference/components/LAYOUT_PRESETS.md)
- [Layout Slots](./reference/components/LAYOUT_SLOTS.md)
- [SaveService](./reference/components/SAVESERVICE.md)
- [Canvas Interactions](./reference/components/CANVAS_INTERACTIONS.md)
- [Canvas Isolation](./reference/components/CANVAS_ISOLATION.md)
- [Canvas Scrollbar](./reference/components/CANVAS_SCROLLBAR.md)
- [DataTable Presets](./reference/components/DATATABLE_PRESETS.md)
- [중첩 라우팅](./reference/components/NESTED_ROUTES.md)
- [ToggleButtonGroup](./reference/components/TOGGLEBUTTONGROUP.md)
- [Workflow 동기화](./reference/components/WORKFLOW_SYNC.md)
- [Border Radius Handles](./reference/components/BORDER_RADIUS_HANDLES.md)
- [Drag & Drop Layer](./reference/components/DRAG_DROP_LAYER.md)
- [페이지 네비게이션](./reference/components/PAGE_NAVIGATION.md)
- [키보드 단축키](./reference/components/KEYBOARD_SHORTCUTS.md)
- [Panel Modal](./reference/components/PANEL_MODAL.md)
- [Events Panel](./reference/components/EVENTS_PANEL.md)
- [Properties Panel](./reference/components/PROPERTIES_PANEL.md)
- [Monitor Panel](./reference/components/MONITOR_PANEL.md)
- [Multi Select](./reference/components/MULTI_SELECT.md)
- [Project File Web](./reference/components/PROJECT_FILE_WEB.md)

### Status (상태)
- [완료된 기능](./reference/status/COMPLETED.md)
- [계획된 기능](./reference/status/PLANNED.md)
- [미구현 기능](./reference/status/UNIMPLEMENTED.md)
- [React Aria 1.13 업데이트](./reference/status/REACT_ARIA_1.13.md)
- [DB 호환성](./reference/status/DB_COMPATIBILITY.md)
- [스타일 시스템](./reference/status/STYLE_SYSTEM.md)

---

## Explanation (설명)

> 개념과 아키텍처를 설명하는 문서입니다.

### Architecture (아키텍처)
- [페이지 타입 분리](./explanation/architecture/PAGE_TYPES.md)
- [데이터 아키텍처](./explanation/architecture/DATA_ARCHITECTURE.md)
- [History Panel 설계](./explanation/architecture/HISTORY_PANEL.md)
- [Nodes Panel 설계](./explanation/architecture/NODES_PANEL_DESIGN.md)
- [Drag & Drop 설계](./explanation/architecture/DRAG_DROP_DESIGN.md)

### Research (리서치)
- [빌더 아키텍처 비교](./explanation/research/BUILDER_COMPARISON.md)
- [React Spectrum 비교](./explanation/research/REACT_SPECTRUM_COMPARISON.md)
- [스타일 파싱 최적화](./explanation/research/STYLE_PARSING.md)
- [Visual Builder 데이터](./explanation/research/VISUAL_BUILDER_DATA.md)
- [Claude Code UI 영감](./explanation/research/CLAUDECODE_UI.md)
- [PGlite vs SQLite](./explanation/research/PGLITE_VS_SQLITE.md)
- [Photoshop 벤치마크](./explanation/research/PHOTOSHOP_BENCHMARK.md)

### Pencil 분석
- [Pencil 역공학 추출물](./pencil-extracted/) - Pencil Desktop 소스 분석

---

## Legacy (레거시)

완료된 리팩토링/마이그레이션 기록 및 폐기된 문서가 보관되어 있습니다.

- [legacy/](./legacy/) - 과거 문서 (역사적 참조 목적)

---

## 문서 작성 가이드

새로운 문서를 추가할 때는 Diátaxis 프레임워크에 따라 적절한 폴더에 배치해주세요:

| 문서 유형 | 폴더 | 예시 |
|----------|------|------|
| 학습용 실습 가이드 | `tutorials/` | 시작하기, 첫 컴포넌트 만들기 |
| 문제 해결 가이드 | `how-to/` | 마이그레이션, 버그 수정 |
| 기술 참조 | `reference/` | API, 스키마, 상태 |
| 개념 설명 | `explanation/` | 아키텍처, 설계 결정 |

### 파일 명명 규칙

- 대문자와 언더스코어 사용: `FEATURE_NAME.md`
- 간결하고 명확한 이름
- 날짜 포함 불필요 (Git 히스토리 활용)

---

## 변경 이력

최신 변경사항은 [CHANGELOG.md](./CHANGELOG.md)를 참조하세요.
