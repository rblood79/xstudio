# XStudio - Claude Code Context

> **⚠️ 필수**: 코드 작업 시작 전 반드시 `.claude/skills/xstudio-patterns/SKILL.md`를 읽으세요.

XStudio는 **노코드 웹 빌더** 애플리케이션입니다.

## 프로젝트 구조

```
xstudio/
├── apps/
│   └── builder/          # 메인 빌더 앱
│       └── src/
│           ├── builder/  # Builder UI (에디터)
│           ├── preview/  # Preview (iframe 내부)
│           └── services/ # Supabase 서비스
├── packages/
│   └── shared/           # 공유 유틸리티
├── docs/
│   ├── adr/              # 아키텍처 결정 기록
│   └── reference/        # 기술 문서
└── .claude/
    └── skills/           # Claude Code Skills
        └── xstudio-patterns/
```

## 핵심 아키텍처

### Builder ↔ Preview 분리
- **Builder**: 에디터 UI (React-Aria, Zustand)
- **Preview**: 사용자 컴포넌트 렌더링 (iframe 격리)
- **통신**: postMessage (Delta 동기화)

### Canvas 렌더링
- **CanvasKit/Skia WASM**: 메인 렌더러 (디자인 노드 + AI 이펙트 + Selection 오버레이)
- **PixiJS 8**: 씬 그래프 + EventBoundary 이벤트 처리 전용 (Camera 하위 alpha=0)
- **@pixi/layout**: Yoga Flexbox 레이아웃
- **규칙**: x/y props 금지, style 기반 레이아웃

### 상태 관리
- **Zustand**: 슬라이스 패턴
- **인덱스**: elementsMap (O(1)), childrenMap, pageIndex
- **히스토리**: 상태 변경 전 기록 필수

## 기술 스택

| 영역 | 기술 |
|------|------|
| UI | React 19, React-Aria Components |
| State | Zustand, TanStack Query |
| Styling | Tailwind CSS v4, tailwind-variants |
| Canvas | **CanvasKit/Skia WASM** (메인 렌더러) + PixiJS 8 (이벤트 전용), @pixi/layout, @pixi/react |
| Backend | Supabase (Auth, Database, RLS) |
| Build | Vite, TypeScript 5, pnpm |

## 성능 기준

| 영역 | 목표 |
|------|------|
| Canvas FPS | 60fps |
| 초기 로드 | < 3초 |
| 번들 (초기) | < 500KB |

## 개발 규칙

### 필수 참조
- **Skill**: `.claude/skills/xstudio-patterns/SKILL.md`
- **ADR**: `docs/adr/` (아키텍처 결정 배경)

### CRITICAL 규칙 요약
1. **인라인 Tailwind 금지** → tv() + CSS 파일
2. **any 타입 금지** → 명시적 타입
3. **PIXI x/y props 금지** → style 기반
4. **postMessage origin 검증** → 보안
5. **히스토리 기록 필수** → Undo/Redo
6. **O(1) 검색** → elementsMap 사용

### 파이프라인 순서
```
요소 변경 시:
1. Memory Update (즉시)
2. Index Rebuild (즉시)
3. History Record (즉시)
4. DB Persist (백그라운드)
5. Preview Sync (백그라운드)
```

## 명령어

```bash
# 개발 서버
pnpm dev

# 빌드
pnpm build

# 타입 체크
pnpm typecheck

# Storybook
pnpm storybook
```

## 참조 문서

- [CSS Architecture](docs/reference/components/CSS_ARCHITECTURE.md)
- [Skill Rules](.claude/skills/xstudio-patterns/SKILL.md)
- [ADR: State Management](docs/adr/001-state-management.md)
- [ADR: Styling](docs/adr/002-styling-approach.md)
- [ADR: Canvas](docs/adr/003-canvas-rendering.md)
- [ADR: Preview](docs/adr/004-preview-isolation.md)
