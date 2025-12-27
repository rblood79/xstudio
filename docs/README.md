# XStudio 문서 (Documentation)

XStudio 프로젝트의 기술 문서를 [Diátaxis 프레임워크](https://diataxis.fr/)에 따라 구성했습니다.

---

## 디렉토리 구조

```
docs/
├── tutorials/        # 학습 중심 실습 가이드
├── how-to/          # 문제 해결 단계별 가이드
├── reference/       # API, 스키마, 상태 참조
├── explanation/     # 아키텍처, 개념 설명
├── archive/         # 완료된 과거 문서
├── CHANGELOG.md     # 변경 이력
└── README.md        # 문서 인덱스
```

---

## Tutorials (튜토리얼)

> 학습 중심의 실습 가이드입니다. 처음부터 끝까지 따라하며 배울 수 있습니다.

### Getting Started
- [Electron 설정 가이드](./tutorials/getting-started/ELECTRON_SETUP.md) - Electron 데스크톱 앱 설정

### Features
- [Tree 컴포넌트 가이드](./tutorials/features/TREE_COMPONENT.md) - Tree 컴포넌트 사용법
- [이벤트 테스트 가이드](./tutorials/features/EVENT_TESTING.md) - 이벤트 시스템 테스트

---

## How-to Guides (가이드)

> 특정 문제를 해결하기 위한 단계별 가이드입니다.

### Migration (마이그레이션)
- [React Query 스타일 마이그레이션](./how-to/migration/REACT_QUERY_STYLE.md)
- [M3 마이그레이션 체크리스트](./how-to/migration/M3_CHECKLIST.md)
- [React Aria 마이그레이션](./how-to/migration/REACT_ARIA.md)
- [WebGL 마이그레이션](./how-to/migration/WEBGL.md)
- [ESM Import 마이그레이션](./how-to/migration/ESM_IMPORTS.md)
- [Dataset 이름 변경](./how-to/migration/DATASET_RENAME.md)

### Troubleshooting (문제 해결)
- [TypeScript 에러 해결](./how-to/troubleshooting/TYPESCRIPT_ERRORS.md)
- [빌드 에러 해결](./how-to/troubleshooting/BUILD_ERRORS.md)
- [Rate Limit 해결](./how-to/troubleshooting/RATE_LIMIT.md)

### Development (개발)
- [기여 가이드](./how-to/development/CONTRIBUTING.md)
- [README 작성 가이드](./how-to/development/README_WRITING.md)
- [PGlite 퀵스타트](./how-to/development/PGLITE_QUICK_START.md)
- [PGlite 구현](./how-to/development/PGLITE_IMPLEMENTATION.md)
- [PGlite 검증](./how-to/development/PGLITE_VALIDATION.md)
- [Inspector 테스트](./how-to/development/INSPECTOR_TESTING.md)
- [Canvas Border Box 구현](./how-to/development/CANVAS_BORDER_BOX.md)
- [Skeleton 시스템 구현](./how-to/development/SKELETON_SYSTEM.md)
- [PIXI 리팩토링](./how-to/development/PIXI_REFACTORING.md)
- [P7 구현 계획](./how-to/development/P7_IMPLEMENTATION.md)
- [패널 최적화](./how-to/development/PANEL_OPTIMIZATION.md)
- [성능 구현 가이드](./how-to/development/PERFORMANCE_IMPLEMENTATION.md)
- [Long Task 최적화](./how-to/development/LONG_TASK_OPTIMIZATION.md)
- [벤치마크 템플릿](./how-to/development/BENCHMARK_TEMPLATE.md)
- [src 구조 개선](./how-to/development/SRC_STRUCTURE.md)
- [컴포넌트 통합](./how-to/development/COMPONENT_CONSOLIDATION.md)

---

## Reference (참조)

> 기술적 상세 정보를 제공하는 참조 문서입니다.

### API
- [API 엔드포인트](./reference/api/ENDPOINTS.md)

### Schemas (스키마)
- [IndexedDB 스키마](./reference/schemas/INDEXDB.md)
- [Supabase 스키마](./reference/schemas/SUPABASE.md)
- [M3 Palette 매핑](./reference/schemas/M3_PALETTE.md)
- [M3 컴포넌트 템플릿](./reference/schemas/M3_COMPONENT_TEMPLATE.css)
- [M3 Storybook 템플릿](./reference/schemas/M3_STORYBOOK_TEMPLATE.tsx)

### Components (컴포넌트)
- [패널 시스템](./reference/components/PANEL_SYSTEM.md)
- [CSS 아키텍처](./reference/components/CSS_ARCHITECTURE.md)
- [React Aria 통합](./reference/components/REACT_ARIA.md)
- [PIXI WebGL 통합](./reference/components/PIXI_WEBGL.md)
- [Transformer 보안](./reference/components/TRANSFORMER_SECURITY.md)
- [Custom ID 패턴](./reference/components/CUSTOM_ID_PATTERN.md)
- [Data Panel](./reference/components/DATA_PANEL.md)
- [Inspector 스타일](./reference/components/INSPECTOR_STYLE.md)
- [Inspector 리팩토링](./reference/components/INSPECTOR_REFACTORING.md)
- [Collection 데이터 바인딩](./reference/components/COLLECTION_DATA_BINDING.md)
- [Layout Presets](./reference/components/LAYOUT_PRESETS.md)
- [저장 모드](./reference/components/SAVE_MODE.md)
- [실시간 저장](./reference/components/REALTIME_SAVE.md)
- [SaveService](./reference/components/SAVESERVICE.md)
- [Canvas Interactions](./reference/components/CANVAS_INTERACTIONS.md)
- [Canvas Isolation](./reference/components/CANVAS_ISOLATION.md)
- [DataTable Presets](./reference/components/DATATABLE_PRESETS.md)
- [중첩 라우팅](./reference/components/NESTED_ROUTES.md)
- [Preview Checkbox](./reference/components/PREVIEW_CHECKBOX.md)
- [Preview 상태 리셋](./reference/components/PREVIEW_STATE_RESET.md)
- [실시간 저장 버그 수정](./reference/components/REALTIME_SAVE_FIX.md)
- [ToggleButtonGroup](./reference/components/TOGGLEBUTTONGROUP.md)
- [Workflow 동기화](./reference/components/WORKFLOW_SYNC.md)
- [Border Radius Handles](./reference/components/BORDER_RADIUS_HANDLES.md)
- [Drag & Drop Layer](./reference/components/DRAG_DROP_LAYER.md)
- [페이지 네비게이션](./reference/components/PAGE_NAVIGATION.md)
- [Events Panel](./reference/components/EVENTS_PANEL.md)
- [Properties Panel](./reference/components/PROPERTIES_PANEL.md)
- [Monitor Panel](./reference/components/MONITOR_PANEL.md)
- [Multi Select](./reference/components/MULTI_SELECT.md)
- [Layout Slots](./reference/components/LAYOUT_SLOTS.md)
- [Project File Web](./reference/components/PROJECT_FILE_WEB.md)

### Status (상태)
- [완료된 기능](./reference/status/COMPLETED.md)
- [계획된 기능](./reference/status/PLANNED.md)
- [미구현 기능](./reference/status/UNIMPLEMENTED.md)
- [WebGL 마이그레이션 상태](./reference/status/WEBGL_MIGRATION.md)
- [M3 Phase 0 완료](./reference/status/M3_PHASE_0.md)
- [M3 인덱스](./reference/status/M3_INDEX.md)
- [M3 브라우저 호환성](./reference/status/M3_BROWSER.md)
- [TypeScript 에러 목록](./reference/status/TYPESCRIPT_ERRORS.md)
- [React Aria 1.13 업데이트](./reference/status/REACT_ARIA_1.13.md)
- [성능 벤치마크](./reference/status/PERFORMANCE_BENCHMARK.md)
- [성능 리포트](./reference/status/PERFORMANCE_REPORT.md)
- [성능 인덱스](./reference/status/PERFORMANCE_INDEX.md)
- [성능 태스크](./reference/status/PERFORMANCE_TASKS.md)
- [성능 Phase 1-4](./reference/status/PERF_PHASE_1_4.md)
- [성능 Phase 5-8](./reference/status/PERF_PHASE_5_8.md)
- [성능 보충](./reference/status/PERF_SUPPLEMENT.md)
- [성능 결정사항](./reference/status/PERF_DECISIONS.md)
- [성능 아이디어](./reference/status/PERF_IDEAS.md)
- [Canvas Resize 최적화](./reference/status/CANVAS_RESIZE.md)
- [WebGL Canvas 최종](./reference/status/WEBGL_CANVAS_FINAL.md)
- [성능 최적화 계획](./reference/status/PERFORMANCE_PLAN.md)
- [DB 호환성](./reference/status/DB_COMPATIBILITY.md)
- [스타일 시스템](./reference/status/STYLE_SYSTEM.md)

---

## Explanation (설명)

> 개념과 아키텍처를 설명하는 문서입니다.

### Architecture (아키텍처)
- [페이지 타입 분리](./explanation/architecture/PAGE_TYPES.md)
- [데이터 아키텍처](./explanation/architecture/DATA_ARCHITECTURE.md)
- [파일 동기화](./explanation/architecture/FILE_SYNC.md)
- [데이터 동기화](./explanation/architecture/DATA_SYNC.md)
- [History Panel 설계](./explanation/architecture/HISTORY_PANEL.md)
- [Nodes Panel 설계](./explanation/architecture/NODES_PANEL_DESIGN.md)
- [Drag & Drop 설계](./explanation/architecture/DRAG_DROP_DESIGN.md)
- [성능 문제 분석](./explanation/architecture/PERF_PROBLEM.md)
- [성능 아키텍처](./explanation/architecture/PERF_ARCHITECTURE.md)
- [WebGL Builder 아키텍처](./explanation/architecture/WEBGL_BUILDER.md)

### Research (리서치)
- [빌더 아키텍처 비교](./explanation/research/BUILDER_COMPARISON.md)
- [React Spectrum 비교](./explanation/research/REACT_SPECTRUM_COMPARISON.md)
- [스타일 파싱 최적화](./explanation/research/STYLE_PARSING.md)
- [Visual Builder 데이터](./explanation/research/VISUAL_BUILDER_DATA.md)
- [리디자인 계획](./explanation/research/REDESIGN_PLAN.md)
- [Claude Code UI 영감](./explanation/research/CLAUDECODE_UI.md)
- [PGlite vs SQLite](./explanation/research/PGLITE_VS_SQLITE.md)
- [Photoshop 벤치마크](./explanation/research/PHOTOSHOP_BENCHMARK.md)

---

## Archive (아카이브)

완료된 리팩토링 문서 및 과거 문서가 보관되어 있습니다.

- [archive/](./archive/) - 완료된 과거 문서

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
