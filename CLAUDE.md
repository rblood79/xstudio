# XStudio - Claude Code Context

XStudio는 **노코드 웹 빌더** 애플리케이션입니다 (pnpm monorepo).

> **⚠️ 필수**: 코드 작업 시작 전 반드시 `.claude/skills/xstudio-patterns/SKILL.md`를 읽으세요.

## Quick Start

```bash
pnpm dev          # 개발 서버
pnpm build        # 빌드
pnpm type-check   # 타입 체크
pnpm storybook    # Storybook
```

## 프로젝트 구조

```
xstudio/
├── apps/
│   ├── builder/          # 메인 빌더 앱 (에디터 + Canvas + Store)
│   │   └── src/
│   │       ├── builder/  # Builder UI (패널, 캔버스, 스토어)
│   │       ├── preview/  # Preview (iframe 내부)
│   │       └── services/ # Supabase, AI 서비스
│   └── publish/          # 프로젝트 배포 앱
├── packages/
│   ├── config/           # 공유 설정 (ESLint, TypeScript)
│   ├── layout-flow/      # Taffy WASM 레이아웃 엔진
│   ├── shared/           # 공유 유틸리티
│   └── specs/            # 컴포넌트 스펙 (Skia 렌더링용)
├── docs/
│   ├── adr/              # ADR (Risk-First 템플릿)
│   └── reference/        # 기술 문서
└── .claude/
    ├── hooks/            # 자동 품질 게이트 (type-check, protect, format)
    ├── rules/            # Glob-scoped 컨텍스트 규칙 (파일 패턴별 자동 로드)
    ├── agents/           # Agent 가이드 (architect, implementer, reviewer, evaluator 등)
    └── skills/           # Code Patterns & Rules (SKILL.md)
```

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

## Superpowers 워크플로 강제 (최우선)

모든 작업에서 **Superpowers**를 적극 활용합니다:

- 복잡한 작업(렌더링 수정, drag-and-drop, 대규모 리팩토링) 시작 시 **Structured Planning / Brainstorming** 스킬을 먼저 사용해 2~3개 접근 방식을 제안받고 선택한다.
- 버그 수정은 **Systematic Debugging (4단계 root-cause)** 스킬을 따른다.
- 구현은 **TDD (RED-GREEN-REFACTOR)** 사이클을 기본으로 한다.
- **렌더링 관련 모든 수정 후에는 반드시 `/cross-check` 스킬을 최종 검증 단계로 실행**한다.
- CRITICAL 또는 HIGH 이슈는 절대 스킵하지 않고 즉시 수정한다.

## CRITICAL 규칙 (10개) → `.claude/rules/` 자동 로드

위반 시 즉시 수정. 파일 편집 시 glob-scoped rule이 자동 주입됩니다.
전체 목록 및 상세: [SKILL.md](.claude/skills/xstudio-patterns/SKILL.md)

## 상태 변경 파이프라인 (순서 필수 보존)

```
1. Memory Update (즉시) → 2. Index Rebuild (즉시) → 3. History Record (즉시)
4. DB Persist (백그라운드) → 5. Preview Sync (백그라운드) → 6. Order Rebalance (백그라운드)
```

## 자동 품질 게이트 (Hooks)

| Hook            | 시점             | 동작                                                         |
| --------------- | ---------------- | ------------------------------------------------------------ |
| **Stop**        | 작업 완료 시     | `.ts/.tsx` 변경 있으면 `pnpm type-check` — 실패 시 작업 중단 |
| **PreToolUse**  | Edit/Write 전    | `.env`, credentials 등 민감 파일 편집 차단                   |
| **PostToolUse** | Edit/Write 후    | Prettier 자동 포맷                                           |
| **PreCompact**  | 컨텍스트 압축 시 | 핵심 규칙 재주입                                             |

## 참조 체계

| 용도           | 경로                                                                                                     | 설명                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| 코드 패턴/규칙 | [SKILL.md](.claude/skills/xstudio-patterns/SKILL.md)                                                     | 전체 규칙 인덱스 (CRITICAL/HIGH/MEDIUM)                                               |
| 도메인 규칙    | [.claude/rules/](.claude/rules/)                                                                         | Glob-scoped — 해당 파일 작업 시 자동 로드                                             |
| Agent 가이드   | [.claude/agents/](.claude/agents/)                                                                       | architect, implementer, evaluator, reviewer, debugger, documenter, refactorer, tester |
| ADR            | [docs/adr/README.md](docs/adr/README.md)                                                                 | 전체 ADR 현황 + Risk-First 템플릿                                                     |
| 렌더링 상세    | [RENDERING_ARCHITECTURE.md](docs/RENDERING_ARCHITECTURE.md)                                              | Dual Renderer, DirectContainer 패턴 상세                                              |
| 컴포넌트 스펙  | [COMPONENT_SPEC.md](docs/COMPONENT_SPEC.md)                                                              | Spec 단일 소스 아키텍처                                                               |
| CSS 상세       | [CSS_ARCHITECTURE.md](docs/reference/components/CSS_ARCHITECTURE.md)                                     | ITCSS + tv() 스타일링 상세                                                            |
| CSS 자동 생성  | [docs/adr/completed/036-spec-first-single-source.md](docs/adr/completed/036-spec-first-single-source.md) | Spec → CSS 자동 생성, Archetype, CompositionSpec                                      |
| Spec↔CSS 경계  | [SPEC_CSS_BOUNDARY.md](docs/reference/components/SPEC_CSS_BOUNDARY.md)                                   | Leaf(Spec CSS) vs Container(수동 CSS) 분류표, 결정 흐름도                             |

## 렌더링 버그 수정 규칙

이 프로젝트는 **3개 렌더링 타겟**: CSS(DOM Preview), WebGL(Skia Canvas), PixiJS(이벤트)를 가집니다.
컴포넌트는 **5개 레이어**: spec, factory, CSS renderer, WebGL/Canvas renderer, editor로 구성됩니다.

1. **모든 렌더링 경로 검증 필수**: 시각적/렌더링 버그 수정 시 CSS, WebGL/Skia, Canvas **모든 경로**에서 수정을 확인. 한 경로만 수정하고 다른 경로를 누락하지 않는다.
2. **전체 코드 경로 추적**: 수정 후 factory → spec → renderer → editor 전체 경로를 추적하여 하류 파손이 없는지 확인. 모든 관련 레이어를 체크하기 전까지 수정 완료로 간주하지 않는다.
3. **코드 리뷰 시 이슈 스킵 금지**: HIGH/MEDIUM 심각도 발견사항을 '범위 외'로 스킵하지 않는다. 명시적으로 지시받지 않는 한 발견 즉시 수정한다.
4. **교차 레이어 변경 확인**: 한 레이어의 변경이 다른 레이어에 영향을 미칠 수 있다. 변경 시 항상 확인할 파일: spec 파일, factory 파일, CSS renderer, WebGL/Canvas renderer, editor 파일.
5. **좌표계 검증 선행**: 드래그앤드롭 또는 좌표 기반 기능 구현 시 좌표계 가정(local vs global, canvas vs screen)을 코드 작성 전에 검증하고 주석으로 문서화한다.
6. **배치 스윕 우선**: 동일 패턴의 이슈를 발견하면 한 컴포넌트만 수정하지 말고, codebase 전체를 grep하여 같은 패턴을 가진 **모든 컴포넌트를 한 번에** 수정한다. 한 건씩 수정 → 같은 버그 반복 발견 사이클을 방지한다.
7. **과잉 변경 금지**: 요청된 범위를 넘는 리팩토링, 주석 추가, 코드 정리, 타입 개선을 하지 않는다. 버그 수정이면 버그만 수정하고, 기능 추가면 해당 기능만 구현한다.

---

**마지막 지침**:
항상 **Plan 먼저 → Execute → Verify (`/cross-check` + `type-check`)** 순서를 지킨다.
불확실한 부분은 질문을 먼저 하고, 가정하지 않는다.
