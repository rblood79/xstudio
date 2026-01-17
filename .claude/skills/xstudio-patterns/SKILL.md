# XStudio Patterns Skill

XStudio Builder 애플리케이션의 코드 패턴, 규칙 및 모범 사례를 정의하는 통합 스킬입니다.

## 목적

- 코드 일관성 및 품질 보장
- 팀 전체 표준화된 패턴 적용
- 보안, 성능, 접근성 요구사항 충족
- 유지보수성 향상

## 규칙 카테고리

### CRITICAL (즉시 적용 필수)

#### Styling (style-*)
- **[style-no-inline-tailwind](rules/style-no-inline-tailwind.md)** - 인라인 Tailwind 클래스 금지
- **[style-tv-variants](rules/style-tv-variants.md)** - tv() 사용 필수
- **[style-react-aria-prefix](rules/style-react-aria-prefix.md)** - react-aria-* CSS 접두사

#### TypeScript (type-*)
- **[type-no-any](rules/type-no-any.md)** - any 타입 금지
- **[type-explicit-return](rules/type-explicit-return.md)** - 명시적 반환 타입

#### PIXI Layout (pixi-*)
- **[pixi-no-xy-props](rules/pixi-no-xy-props.md)** - x/y props 금지
- **[pixi-layout-import-first](rules/pixi-layout-import-first.md)** - @pixi/layout 최우선 import

#### Security (postmessage-*)
- **[postmessage-origin-verify](rules/postmessage-origin-verify.md)** - origin 검증 필수

### HIGH (강력 권장)

#### Styling (style-*)
- **[style-css-reuse](rules/style-css-reuse.md)** - CSS 클래스 재사용

#### React-Aria (react-aria-*)
- **[react-aria-hooks-required](rules/react-aria-hooks-required.md)** - React-Aria 훅 사용
- **[react-aria-no-manual-aria](rules/react-aria-no-manual-aria.md)** - 수동 ARIA 속성 금지
- **[react-aria-stately-hooks](rules/react-aria-stately-hooks.md)** - React-Stately 상태 훅

#### Supabase (supabase-*)
- **[supabase-no-direct-calls](rules/supabase-no-direct-calls.md)** - 컴포넌트 직접 호출 금지
- **[supabase-service-modules](rules/supabase-service-modules.md)** - 서비스 모듈 사용
- **[supabase-rls-required](rules/supabase-rls-required.md)** - Row Level Security 필수

#### Zustand (zustand-*)
- **[zustand-factory-pattern](rules/zustand-factory-pattern.md)** - StateCreator 팩토리 패턴
- **[zustand-modular-files](rules/zustand-modular-files.md)** - 슬라이스별 파일 분리

#### PostMessage (postmessage-*)
- **[postmessage-buffer-ready](rules/postmessage-buffer-ready.md)** - PREVIEW_READY 버퍼링

#### Inspector (inspector-*)
- **[inspector-inline-styles](rules/inspector-inline-styles.md)** - 오버레이 인라인 스타일
- **[inspector-history-sync](rules/inspector-history-sync.md)** - 히스토리 동기화

#### PIXI Layout (pixi-*)
- **[pixi-text-isleaf](rules/pixi-text-isleaf.md)** - Text isLeaf 설정
- **[pixi-hitarea-absolute](rules/pixi-hitarea-absolute.md)** - 히트 영역 absolute 위치

### MEDIUM-HIGH

#### PIXI Layout (pixi-*)
- **[pixi-no-flex-height](rules/pixi-no-flex-height.md)** - flex + % height 조합 금지

### MEDIUM (권장)

#### Performance (perf-*)
- **[perf-barrel-imports](rules/perf-barrel-imports.md)** - Barrel import 지양
- **[perf-promise-all](rules/perf-promise-all.md)** - Promise.all 병렬 처리
- **[perf-dynamic-imports](rules/perf-dynamic-imports.md)** - 동적 import 활용
- **[perf-map-set-lookups](rules/perf-map-set-lookups.md)** - Map/Set O(1) 검색

#### Testing (test-*)
- **[test-stories-required](rules/test-stories-required.md)** - Storybook 스토리 필수

## 기술 스택

| 영역 | 기술 |
|------|------|
| UI Framework | React 18, React-Aria Components |
| State | Zustand, TanStack Query |
| Styling | Tailwind CSS, tailwind-variants |
| Canvas | PixiJS 8, @pixi/layout, @pixi/react |
| Backend | Supabase (Auth, Database, RLS) |
| Build | Vite, TypeScript 5 |
| Testing | Storybook, Vitest |

## 사용법

```bash
# 특정 규칙 적용 예시
# 1. rules/ 폴더에서 관련 규칙 확인
# 2. Incorrect 예시 패턴 검색
# 3. Correct 예시로 수정
```

## 규칙 파일 형식

모든 규칙 파일은 Vercel Agent Skills 패턴을 따릅니다:

```markdown
---
title: 규칙 제목
impact: CRITICAL | HIGH | MEDIUM-HIGH | MEDIUM | LOW
impactDescription: 영향 설명
tags: [tag1, tag2]
---

규칙 설명

## Incorrect
잘못된 코드 예시

## Correct
올바른 코드 예시
```

## 기여

새 규칙 추가 시:
1. `rules/_template.md` 복사
2. 적절한 접두사 사용 (style-, type-, react-aria- 등)
3. SKILL.md에 규칙 링크 추가
4. impact 레벨 적절히 설정
