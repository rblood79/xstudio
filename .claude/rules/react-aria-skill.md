---
description: UI 컴포넌트 구현/수정 시 React Aria Skill 문서 참조 규칙
globs:
  - "apps/builder/src/builder/**/*.tsx"
  - "apps/builder/src/preview/renderers/**/*.tsx"
  - "packages/specs/src/components/**/*.ts"
  - "**/factories/definitions/**"
  - "**/editors/**/*.tsx"
---

# React Aria 문서 참조 규칙

## 컴포넌트 구현 시 React Aria 문서 참조 (Skill)

새 UI 컴포넌트를 구현하거나 기존 컴포넌트를 수정할 때, **프로젝트 내 React Aria Skill 문서**를 참조하여 공식 API와 접근성 패턴을 확인한다.

### 필수 참조 시점

1. **새 컴포넌트 생성** — 해당 컴포넌트의 React Aria 문서를 먼저 조회
2. **Props/API 설계** — React Aria의 공식 API 컨벤션 확인
3. **접근성(ARIA) 패턴** — 수동 ARIA 작성 전 React Aria 문서 기준 확인
4. **키보드 인터랙션** — React Aria의 키보드 네비게이션 패턴 참조
5. **상태 관리 훅** — React Stately 훅 존재 여부 확인

### Skill 문서 참조 방법

```
1. .claude/skills/react-aria/references/components/{ComponentName}.md  → 컴포넌트 API/예제
2. .claude/skills/react-aria/references/guides/                        → 가이드 (styling, forms, collections 등)
3. .claude/skills/react-aria/references/interactions/                   → 훅 (usePress, useFocus 등)
4. .claude/skills/react-aria/references/testing/                       → 테스팅 패턴
```

Read 도구로 해당 파일을 직접 읽어 참조한다.

### 참조 후 적용 원칙

- React Aria 패턴을 **그대로 복사하지 않고**, XStudio 컨벤션(tv(), Zustand, Spec 패턴)에 맞게 내재화
- React Aria hooks 사용 우선 (useButton, useTextField, useCalendar 등)
- 수동 ARIA 속성 작성 금지 — React Aria가 제공하는 hook 사용
- React Stately hooks로 상태 관리 (useListState, useTreeState 등)

### 참조 생략 조건

- 단순 스타일 변경, 버그 수정 등 API 설계와 무관한 작업
- 이미 XStudio에 확립된 패턴의 반복 적용 (예: 기존 Spec과 동일 구조)
- React Aria가 지원하지 않는 커스텀 컴포넌트 (Canvas 전용 등)
