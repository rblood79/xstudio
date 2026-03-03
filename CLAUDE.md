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
    ├── agents/           # Agent 가이드 (architect, implementer, reviewer 등)
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

## CRITICAL 규칙 (위반 시 즉시 수정)

1. **인라인 Tailwind 금지** → `tv()` + CSS 파일
2. **`any` 타입 금지** → 명시적 타입
3. **DirectContainer 패턴** → 엔진 계산 결과(x/y/w/h) 직접 배치
4. **postMessage origin 검증** → 보안 필수
5. **히스토리 기록 필수** → 상태 변경 전 기록 (Undo/Redo)
6. **O(1) 검색** → `elementsMap` 사용, 배열 순회 금지
7. **layoutVersion 증가 필수** → 레이아웃 영향 props 변경 시 `layoutVersion + 1` (누락 시 크기 고정 버그)
8. **order_num 재정렬** → `batchUpdateElementOrders()` 단일 set() 사용, 개별 N회 호출 금지
9. **Spec TokenRef 변환 필수** → shapes 내 숫자 연산에 TokenRef 직접 사용 금지, `resolveToken()` 필수

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

| 용도           | 경로                                                                 | 설명                                                                       |
| -------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| 코드 패턴/규칙 | [SKILL.md](.claude/skills/xstudio-patterns/SKILL.md)                 | 전체 규칙 인덱스 (CRITICAL/HIGH/MEDIUM)                                    |
| 도메인 규칙    | [.claude/rules/](.claude/rules/)                                     | Glob-scoped — 해당 파일 작업 시 자동 로드                                  |
| Agent 가이드   | [.claude/agents/](.claude/agents/)                                   | architect, implementer, reviewer, debugger, documenter, refactorer, tester |
| ADR            | [docs/adr/README.md](docs/adr/README.md)                             | 전체 ADR 현황 + Risk-First 템플릿                                          |
| 렌더링 상세    | [RENDERING_ARCHITECTURE.md](docs/RENDERING_ARCHITECTURE.md)          | Dual Renderer, DirectContainer 패턴 상세                                   |
| 컴포넌트 스펙  | [COMPONENT_SPEC.md](docs/COMPONENT_SPEC.md)                          | Spec 단일 소스 아키텍처                                                    |
| CSS 상세       | [CSS_ARCHITECTURE.md](docs/reference/components/CSS_ARCHITECTURE.md) | ITCSS + tv() 스타일링 상세                                                 |
