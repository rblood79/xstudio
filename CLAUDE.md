# composition - Claude Code Context

composition는 **노코드 웹 빌더** 애플리케이션입니다 (pnpm monorepo).

> **⚠️ 필수**: 코드 작업 시작 전 반드시 `.claude/skills/composition-patterns/SKILL.md`를 읽으세요.

## Quick Start

```bash
pnpm dev          # 개발 서버
pnpm build        # 빌드
pnpm type-check   # 타입 체크
pnpm storybook    # Storybook
```

## 프로젝트 구조

composition/
├── apps/
│ ├── builder/ # 메인 빌더 앱 (에디터 + Canvas + Store)
│ │ └── src/
│ │ ├── builder/ # Builder UI (패널, 캔버스, 스토어)
│ │ ├── preview/ # Preview (iframe 내부)
│ │ └── services/ # Supabase, AI 서비스
│ └── publish/ # 프로젝트 배포 앱
├── packages/
│ ├── config/ # 공유 설정 (ESLint, TypeScript)
│ ├── layout-flow/ # Taffy WASM 레이아웃 엔진
│ ├── shared/ # 공유 유틸리티
│ └── specs/ # 컴포넌트 스펙 (Skia 렌더링용)
├── docs/
│ ├── adr/ # ADR (Risk-First 템플릿)
│ └── reference/ # 기술 문서
└── .claude/
├── hooks/ # 자동 품질 게이트 (type-check, protect, format)
├── rules/ # Glob-scoped 컨텍스트 규칙 (파일 패턴별 자동 로드)
├── agents/ # Agent 가이드 (architect, implementer, reviewer, evaluator 등)
└── skills/ # Code Patterns & Rules (SKILL.md)

```

## SSOT 체인 정본 — 3-Domain 분할 (CRITICAL)

composition은 3개 독립 domain으로 구성된다. 모든 코드/문서 작업은 이 분할을 준수:

| Domain | 권위 | 내용 | Spec 관여 |
| --- | --- | --- | --- |
| **D1. DOM/접근성** | Adobe RAC (절대) | HTML 구조/ARIA/키보드/포커스 | ❌ 금지 |
| **D2. Props/API** | RSP 참조 + custom | 사용자 편의 props | ✅ 타입만 |
| **D3. 시각 스타일** | Spec (SSOT) | 색상/크기/폰트/레이아웃/형태 | ✅ 100% |

**원칙**:
- **Builder(Skia)와 Preview/Publish(DOM+CSS)는 D3의 대등 symmetric consumer**. 한쪽이 기준 아님
- 대칭 = **시각 결과의 동일성** (구현 방법 자유)
- RAC 선택 이유 = 스타일 자유도 (unstyled primitive) — 디자인은 D3에서 composition이 결정
- RSP props는 RAC + custom 구현으로 달성 가능한 범위에서 선별 채택

**정본 규칙**: [.claude/rules/ssot-hierarchy.md](.claude/rules/ssot-hierarchy.md) (3-domain 정의/용어 사전/경계 판정/집행 메커니즘)
**공식 결정 기록**: [ADR-063](docs/adr/063-ssot-chain-charter.md)

## 핵심 아키텍처

| 영역      | 기술                                                    | 비고                                                     |
| --------- | ------------------------------------------------------- | -------------------------------------------------------- |
| UI        | React 19, React-Aria Components                         | Builder ↔ Preview iframe 격리, postMessage 통신          |
| State     | Zustand 슬라이스 + Jotai (스타일 패널) + TanStack Query | elementsMap(O(1)), childrenMap, pageIndex                |
| Styling   | Tailwind CSS v4, tailwind-variants (`tv()`)             | 인라인 Tailwind 금지                                     |
| Rendering | **CanvasKit/Skia WASM** (렌더링) + PixiJS 8 (이벤트)    | Dual Renderer — Skia=화면, PixiJS=EventBoundary(alpha=0) |
| Layout    | Taffy WASM (Flex/Grid/Block)                            | 단일 엔진, DirectContainer 직접 배치                     |
| AI        | Groq SDK (llama-3.3-70b-versatile)                      | Tool Calling + Agent Loop                                |
| Backend   | Supabase (Auth, Database, RLS)                          |                                                          |
| Build     | Vite, TypeScript 5, pnpm                                | monorepo                                                 |

### 성능 기준

| Canvas FPS | 초기 로드 | 번들 (초기) |
| :--------: | :-------: | :---------: |
|   60fps    |   < 3초   |   < 500KB   |

## Superpowers 워크플로

- **복잡한 작업** (렌더링, drag-and-drop, 대규모 리팩토링): Brainstorming 스킬로 접근 방식 탐색 후 선택
- **버그 수정**: Systematic Debugging 4단계 root-cause 스킬
- **구현**: TDD (RED-GREEN-REFACTOR) 사이클 기본
- **렌더링 수정 후**: `/cross-check` 스킬 최종 검증
- **ADR 생성**: "ADR 생성" 자연어 → `/create-adr` 스킬 (번호 자동 할당 + Risk-First 템플릿)
- **단순 작업** (한 줄 수정, 설정 변경): 스킬 스킵 가능
- CRITICAL/HIGH 이슈: 즉시 수정, 스킵 금지

## CRITICAL 규칙 (10개) → `.claude/rules/` 자동 로드

위반 시 즉시 수정. 파일 편집 시 glob-scoped rule이 자동 주입됩니다.
전체 목록 및 상세: [SKILL.md](.claude/skills/composition-patterns/SKILL.md)

## 상태 변경 파이프라인

`Memory → Index → History (즉시) → DB → Preview → Rebalance (백그라운드)` — 순서 필수 보존. 상세: `.claude/rules/state-management.md`

## 자동 품질 게이트 (Hooks)

| Hook            | 시점             | 동작                                                         |
| --------------- | ---------------- | ------------------------------------------------------------ |
| **Stop**        | 작업 완료 시     | `.ts/.tsx` 변경 있으면 `pnpm type-check` — 실패 시 작업 중단 |
| **PreToolUse**  | Edit/Write 전    | `.env`, credentials 등 민감 파일 편집 차단                   |
| **PostToolUse** | Edit/Write 후    | Prettier 자동 포맷                                           |
| **PreCompact**  | 컨텍스트 압축 시 | 핵심 규칙 재주입                                             |

## 참조 체계

| 용도                 | 경로                                                                                                     | 설명                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 코드 패턴/규칙       | [SKILL.md](.claude/skills/composition-patterns/SKILL.md)                                                 | 전체 규칙 인덱스 (CRITICAL/HIGH/MEDIUM)                                               |
| 도메인 규칙          | [.claude/rules/](.claude/rules/)                                                                         | Glob-scoped — 해당 파일 작업 시 자동 로드                                             |
| Agent 가이드         | [.claude/agents/](.claude/agents/)                                                                       | architect, implementer, evaluator, reviewer, debugger, documenter, refactorer, tester |
| ADR 현황             | [docs/adr/README.md](docs/adr/README.md)                                                                 | 전체 ADR 현황 대시보드                                                                |
| ADR 규칙             | [.claude/rules/adr-writing.md](.claude/rules/adr-writing.md)                                             | Risk-First 템플릿, 위험 평가, 금지 패턴 (`docs/adr/**` 자동 로드)                     |
| 렌더링 아키텍처 결정 | [ADR-100](docs/adr/100-unified-skia-rendering-engine.md)                                                 | Unified Skia Engine — PixiJS 제거, 대안/결정/Gate                                     |
| 렌더링 구현 상세     | [ADR-100 breakdown](docs/design/100-unified-skia-engine-breakdown.md)                                    | SceneGraph, Rust Layout, CSS3 렌더링 Phase 상세                                       |
| 컴포넌트 스펙        | [COMPONENT_SPEC.md](docs/COMPONENT_SPEC.md)                                                              | Spec 단일 소스 아키텍처                                                               |
| CSS 상세             | [CSS_ARCHITECTURE.md](docs/reference/components/CSS_ARCHITECTURE.md)                                     | ITCSS + tv() 스타일링 상세                                                            |
| CSS 자동 생성        | [docs/adr/completed/036-spec-first-single-source.md](docs/adr/completed/036-spec-first-single-source.md) | Spec → CSS 자동 생성, Archetype, CompositionSpec                                      |
| Spec↔CSS 경계        | [SPEC_CSS_BOUNDARY.md](docs/reference/components/SPEC_CSS_BOUNDARY.md)                                   | Leaf(Spec CSS) vs Container(수동 CSS) 분류표, 결정 흐름도                             |

## 렌더링 버그 수정 원칙

2개 렌더링 타겟(CSS/Skia) × 5개 레이어(spec/factory/CSS renderer/Skia renderer/editor). — PixiJS 제거 완료 (ADR-100 Phase 8-9)

- **모든 경로 검증**: 한 경로만 수정하고 다른 경로 누락 금지 → `/cross-check` 스킬로 검증
- **전체 경로 추적**: factory → spec → renderer → editor 하류 파손 확인
- **배치 스윕**: 동일 패턴 이슈 → codebase grep → 한 번에 수정
- **과잉 변경 금지**: 요청 범위만 수정
- 상세: `.claude/rules/canvas-rendering.md` (파일 편집 시 자동 로드)

## 병렬 워크플로 (Boris 패턴)

- 대규모 리팩토링: `isolation: "worktree"`로 격리된 에이전트 실행
- 독립 작업 2+ 개: `/dispatch` 스킬로 병렬 에이전트 실행
- reviewer + implementer 분리: 구현 에이전트 완료 후 reviewer 에이전트로 검증
- `/loop` 활용: 렌더링 파리티 반복 검증에 적합

---

**마지막 지침**:
항상 **Plan 먼저 → Execute → Verify (`/cross-check` + `type-check`)** 순서를 지킨다.
불확실한 부분은 질문을 먼저 하고, 가정하지 않는다.
```
