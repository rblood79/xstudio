---
name: component-design
description: Skill 문서를 활용한 컴포넌트 설계/구현 워크플로우. React Aria/Spectrum 문서 참조, 타입 검증, 브라우저 검증을 단계별로 수행합니다.
TRIGGER when: user mentions "새 컴포넌트", "컴포넌트 만들어", "컴포넌트 구현", "컴포넌트 설계", "S2 전환", "S2 기능 추가", "컴포넌트 추가", "new component", "implement component", "design component", or asks to create, design, or implement a new UI component for composition.
user-invocable: true
scope: 새 컴포넌트 생성 또는 기존 컴포넌트의 구조적 변경 (단순 버그 수정, 스타일 변경은 제외)
---

# Component Design Skill

Skill 문서를 활용하여 컴포넌트를 설계하고 구현하는 통합 워크플로우입니다.

## 워크플로우 개요

```
1. 리서치 (React Aria / Spectrum Skill 문서)
2. 구현 (Read/Write/Edit + composition-patterns)
3. 타입 검증
4. 시각적 검증 (선택)
```

## Phase 1: React Aria 리서치

새 컴포넌트 구현 전 프로젝트 내 Skill 문서로 공식 API와 패턴을 조사한다.

### 1-1. 컴포넌트 문서 확인

```
Read ../react-aria/references/components/{ComponentName}.md
```

대상 컴포넌트의 API, Props, 사용 예제, 접근성 패턴을 확인한다.

### 1-2. 가이드/훅 참조 (필요 시)

```
Read ../react-aria/references/guides/collections.md    → 컬렉션 패턴
Read ../react-aria/references/guides/selection.md      → 선택 패턴
Read ../react-aria/references/guides/forms.md          → 폼 패턴
Read ../react-aria/references/interactions/usePress.md → 인터랙션 훅
```

### 1-3. React Spectrum S2 참조 (디자인 시스템 비교 시)

```
Read ../react-spectrum/references/components/{ComponentName}.md
```

Adobe의 Spectrum 2 디자인 시스템 구현을 참조하여 composition 컴포넌트와 비교한다.

### 1-4. 조사 결과 정리

- 사용할 React Aria hooks/components 목록
- Props 인터페이스 설계 기준
- 키보드/접근성 요구사항
- composition 컨벤션과의 매핑 포인트

## Phase 2: 구현

composition-patterns 스킬의 규칙을 따르며 구현한다.

### 구현 순서 (composition 컴포넌트)

1. **타입 정의** — `unified.types.ts`에 Props 타입 추가, `defaultPropsMap` 등록
2. **Spec 작성** — `packages/specs/src/components/`에 Shape 기반 Spec 생성
3. **Factory 정의** — `factories/definitions/`에 생성 팩토리 등록
4. **Preview Renderer** — `preview/renderers/`에 렌더러 추가
5. **Canvas 연동** — `TAG_SPEC_MAP` 등록, `nodeRenderers.ts` 수정 (필요 시)
6. **Property Editor** — 스타일 패널 에디터 추가 (필요 시)

### React Aria 내재화 원칙

- 외부 라이브러리 추가 설치 금지 (번들 500KB 제약)
- React Aria hooks/components는 이미 프로젝트 의존성 — 직접 import 가능
- React Aria 패턴을 composition 컨벤션에 맞게 변환:
  - 스타일링 → tv() + CSS
  - 상태 → Zustand 슬라이스
  - 렌더링 → Spec shapes + Skia

## Phase 3: 타입 검증

구현 완료 후 Codex 기본 검증은 `pnpm run type-check` 또는 변경 파일 기준
`pnpm run codex:typecheck`를 사용한다.
IDE 진단 도구가 연결된 세션이면 변경 파일 diagnostics를 추가로 확인한다.

- 에러 0개 확인
- 경고 검토 및 필요 시 수정

## Phase 4: 시각적 검증 (브라우저 도구, 선택)

Storybook이나 개발 서버로 실제 렌더링을 확인한다.

### 5-1. 탭 준비

- 브라우저/컴퓨터 사용 도구 또는 Playwright MCP가 있으면 새 탭을 연다
- 없으면 이 Phase는 생략하고 결과에 명시한다

### 5-2. Storybook/Dev 서버 이동

- `http://localhost:6006` 또는 `http://localhost:5173` 로 이동
- 변경된 컴포넌트가 렌더링되는 화면까지 진입

### 5-3. 시각적 확인

- 스크린샷 또는 브라우저 DOM 확인으로 시각 상태를 검증
- 레이아웃 정렬 확인
- 인터랙션 동작 확인
- 반응형 크기 확인

## Phase 생략 조건

| Phase                | 생략 가능 조건                             |
| -------------------- | ------------------------------------------ |
| Phase 1 (React Aria) | React Aria 미지원 컴포넌트, 단순 버그 수정 |
| Phase 3 (IDE)        | `pnpm run type-check`로 대체 가능          |
| Phase 4 (브라우저)   | 서버 미실행, 시각적 변화 없는 수정         |

## 산출물 템플릿

### Phase 1 리서치 산출물

| 항목             | 내용                                     |
| ---------------- | ---------------------------------------- |
| React Aria hooks | (사용할 hooks/components 목록)           |
| Props 인터페이스 | (핵심 props 설계)                        |
| 접근성 요구사항  | (키보드 네비게이션, ARIA 패턴)           |
| composition 매핑 | (tv() 스타일, Zustand 연동, Spec shapes) |

### Phase 2 구현 체크리스트

- [ ] 타입 정의 (`unified.types.ts` + `defaultPropsMap`)
- [ ] Spec 작성 (`packages/specs/src/components/`)
- [ ] Factory 정의 (`factories/definitions/`)
- [ ] Preview Renderer (`preview/renderers/`)
- [ ] Canvas 연동 (`TAG_SPEC_MAP` + `pnpm run build:specs`)
- [ ] Property Editor (선택)
- [ ] `/cross-check` 렌더링 정합성 검증

## Evals

### Positive (발동해야 하는 경우)

- "DateTimePicker 컴포넌트 새로 만들어줘" → ✅ 새 컴포넌트 생성 워크플로
- "Select에 S2 기능 추가하고 싶어" → ✅ S2 전환 워크플로
- "Tabs 컴포넌트 설계해줘" → ✅ 컴포넌트 설계
- "React Aria 기반으로 Dialog 구현" → ✅ React Aria 컴포넌트 구현

### Negative (발동하면 안 되는 경우)

- "Button 색상 버그 수정" → ❌ 버그 수정 → systematic-debugging
- "CSS만 변경해줘" → ❌ 스타일 수정, 컴포넌트 구조 변경 아님
- "Store 리팩토링" → ❌ 상태 관리 작업
- "기존 컴포넌트 삭제해줘" → ❌ 삭제 작업, 설계 워크플로 불필요
