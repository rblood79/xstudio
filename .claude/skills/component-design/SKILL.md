---
name: component-design
description: Component design/implementation workflow using Skill docs. Covers React Aria/Spectrum reference lookup, XStudio pattern compliance, type checking, and visual verification. Use when building new UI components or modifying existing ones.
user-invocable: true
---

# Component Design Skill

Skill 문서를 활용하여 컴포넌트를 설계하고 구현하는 통합 워크플로우입니다.

## 워크플로우 개요

```
1. 리서치 (React Aria / Spectrum Skill 문서)
2. 구현 (Read/Write/Edit + xstudio-patterns)
3. 타입 검증 (pnpm type-check)
4. 시각적 검증 (Chrome MCP, 선택)
```

## Phase 1: React Aria 리서치

새 컴포넌트 구현 전 프로젝트 내 Skill 문서로 공식 API와 패턴을 조사한다.

### 1-1. 컴포넌트 문서 확인

```
Read .claude/skills/react-aria/references/components/{ComponentName}.md
```

대상 컴포넌트의 API, Props, 사용 예제, 접근성 패턴을 확인한다.

### 1-2. 가이드/훅 참조 (필요 시)

```
Read .claude/skills/react-aria/references/guides/collections.md    → 컬렉션 패턴
Read .claude/skills/react-aria/references/guides/selection.md      → 선택 패턴
Read .claude/skills/react-aria/references/guides/forms.md          → 폼 패턴
Read .claude/skills/react-aria/references/interactions/usePress.md → 인터랙션 훅
```

### 1-3. React Spectrum S2 참조 (디자인 시스템 비교 시)

```
Read .claude/skills/react-spectrum-s2/references/components/{ComponentName}.md
```

### 1-4. 조사 결과 정리

- 사용할 React Aria hooks/components 목록
- Props 인터페이스 설계 기준
- 키보드/접근성 요구사항
- XStudio 컨벤션과의 매핑 포인트

## Phase 2: 구현

xstudio-patterns 스킬의 규칙을 따르며 구현한다.

### 구현 순서 (XStudio 컴포넌트)

1. **타입 정의** — `unified.types.ts`에 Props 타입 추가, `defaultPropsMap` 등록
2. **Spec 작성** — `packages/specs/src/components/`에 Shape 기반 Spec 생성
   - 참조: [child-composition.md](../.claude/skills/xstudio-patterns/reference/child-composition.md)
3. **Factory 정의** — `factories/definitions/`에 생성 팩토리 등록
4. **Preview Renderer** — `preview/renderers/`에 렌더러 추가
5. **Canvas 연동** — `TAG_SPEC_MAP` 등록, `nodeRenderers.ts` 수정 (필요 시)
   - 참조: [component-registry.md](../.claude/skills/xstudio-patterns/reference/component-registry.md)
6. **Property Editor** — 스타일 패널 에디터 추가 (필요 시)

### Phase 2 필수 체크 규칙

- **CRITICAL**: `_hasChildren` 체크 패턴 — Spec shapes에 배치
- **CRITICAL**: `resolveToken()` — Spec shapes 내 숫자 연산 시 TokenRef 변환
- **CRITICAL**: `pnpm build:specs` — Spec 변경 후 빌드 동기화
- **HIGH**: `extractSpecTextStyle()` — 텍스트 측정 시 하드코딩 금지

### React Aria 내재화 원칙

- 외부 라이브러리 추가 설치 금지 (번들 500KB 제약)
- React Aria hooks/components는 이미 프로젝트 의존성 — 직접 import 가능
- React Aria 패턴을 XStudio 컨벤션에 맞게 변환:
  - 스타일링 → tv() + CSS
  - 상태 → Zustand 슬라이스
  - 렌더링 → Spec shapes + Skia

## Phase 3: 타입 검증

구현 완료 후 타입 검사를 실행한다. (Hooks가 Stop 시점에 자동 실행하지만, 중간 확인 시 수동 실행)

```bash
pnpm type-check
# 또는 builder만: cd apps/builder && pnpm exec tsc --noEmit
```

- 에러 0개 확인
- 경고 검토 및 필요 시 수정

## Phase 4: 시각적 검증 (선택)

Storybook이나 개발 서버로 실제 렌더링을 확인한다.

### 4-1. 탭 준비

```
mcp__claude-in-chrome__tabs_context_mcp(createIfEmpty: true)
mcp__claude-in-chrome__tabs_create_mcp()
```

### 4-2. Storybook/Dev 서버 이동

```
mcp__claude-in-chrome__navigate(url: "http://localhost:6006", tabId: {tabId})
# 또는
mcp__claude-in-chrome__navigate(url: "http://localhost:5173", tabId: {tabId})
```

### 4-3. 시각적 확인

```
mcp__claude-in-chrome__computer(action: "screenshot", tabId: {tabId})
```

- 레이아웃 정렬 확인
- 인터랙션 동작 확인
- 반응형 크기 확인

## Phase 생략 조건

| Phase                | 생략 가능 조건                                   |
| -------------------- | ------------------------------------------------ |
| Phase 1 (React Aria) | React Aria 미지원 컴포넌트, 단순 버그 수정       |
| Phase 3 (타입 검증)  | Hooks Stop이 자동 실행하므로 중간 확인 불필요 시 |
| Phase 4 (Chrome)     | 서버 미실행, 시각적 변화 없는 수정               |
