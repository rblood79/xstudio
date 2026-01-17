# Builder Patterns

## Description
Builder 앱 전체(components, panels, inspector, stores, hooks, services, preview)의 일관된 개발 패턴을 정의합니다.
React 19 + TypeScript + React Aria Components + Zustand + Tailwind v4 + Supabase 기술 스택을 기반으로 합니다.

> **참고**: WebGL Canvas(workspace/) 관련 규칙은 `workspace/.claude/skills/` 하위 SKILL 파일 참조

---

## Negative Rules (절대 하지 말아야 할 것)

### 스타일/CSS
- **.tsx 파일에서 inline Tailwind 사용 금지** - semantic classes + CSS @apply 사용
- 새 CSS 파일 생성 지양 - `src/builder/components/components.css` 재사용
- CSS class 네이밍에서 `react-aria-*` prefix 누락 금지

### 타입/코드 품질
- **`any` 타입 사용 금지** - strict typing 필수, explicit return types
- 컴포넌트/훅에 로직 과다 포함 금지 - services/utilities로 위임

### Supabase/데이터
- **컴포넌트에서 직접 Supabase 호출 금지** - hooks 사용 필수
- 클라이언트 코드에 secrets 노출 금지
- RLS(Row Level Security) 미적용 금지

### PostMessage/Preview
- **event.origin 검증 없이 메시지 수신 금지**
- PREVIEW_READY 전에 메시지 전송 금지 (버퍼링 필수)

### Inspector (예외 영역)
- Inspector에서 CSS variables 사용 금지 - **inline styles(React style prop) 사용**
- History 통합 없이 스타일 변경 금지 - undo/redo 추적 필수
- JSON 비교 없이 중복 history entry 생성 금지

### 상태 관리
- Zustand 스토어에서 factory function 없이 직접 구현 금지
- 모듈화 없이 거대한 단일 스토어 파일 생성 금지

---

## Positive Rules (항상 해야 할 것)

### 스타일/CSS
- **tv() (tailwind-variants)** 사용하여 semantic class names 생성 (예: primary, outline, sm)
- CSS 클래스명은 **`react-aria-*` prefix** 사용 (예: react-aria-Button, react-aria-ComboBox)
- 기존 CSS 클래스 재사용 (combobox-container, control-label 등)
- CSS variables는 theming tokens용으로만 사용

### React Aria / 접근성
- **모든 UI 컴포넌트에 React Aria 사용** - 접근성 필수
- 적절한 ARIA attributes, roles, keyboard interactions 구현
- ToggleButtonGroup은 selectedKeys로 controlled state 사용
- Mutually exclusive groups는 opacity-based hiding 사용

### 타입/코드 품질
- **strict typing** - 명시적 return types, `any` 금지
- 타입 정의는 `src/types/`에 위치
- 절대 경로 import 사용 (tsconfig 설정)
- 컴포넌트/훅은 thin하게, 로직은 services/utilities로 위임

### Zustand 스토어 패턴
- **factory functions** 사용 - set/get을 StateCreator에서 수신
- SetState 타입 추출: `type SetState = Parameters<StateCreator<YourState>>[0]`
- 모듈화된 파일 구조 (예: elementCreation.ts, elementUpdate.ts, elementRemoval.ts)
- 테스트 가능하고 타입 추론이 올바른 코드 작성

### Supabase/데이터
- **항상 RLS(Row Level Security) 적용**
- **service modules (`src/services/api/*`)** 사용하여 DB 작업
- **hooks 사용**하여 reactive queries (컴포넌트에서 직접 호출 금지)
- mutation 후 `.select().single()`로 fresh row fetch
- toasts와 logging 분리, safe error serialization

### PostMessage/Preview
- 메시지 수신 시 **event.origin 검증** 필수
- **PREVIEW_READY까지 메시지 버퍼링** 후 flush
- 지원 메시지 타입: UPDATE_ELEMENTS, ELEMENT_SELECTED, UPDATE_ELEMENT_PROPS
- 선택 시 **getComputedStyle()** 사용하여 computed styles 수집
- computed styles를 postMessage로 Builder에 전송
- 수집 스타일: layout, flexbox, typography, colors, spacing, borders

### Inspector (예외 영역)
- **inline styles (React style prop)** 사용 - CSS variables 대신
- 스타일 우선순위: inline style > computed style > default value
- **useSyncWithBuilder**로 Inspector ↔ Builder 양방향 동기화
- **모든 스타일 변경은 history 통합** - undo/redo 추적
- alignment 버튼 사용 시 자동으로 display:flex 활성화
- Mutually exclusive groups: 3x3 grid vs spacing buttons
- flex-direction aware: row/column에 따라 grid mapping 변경
- history entry 생성 전 JSON 비교로 중복 방지

### 테스트/Storybook
- **새 컴포넌트는 .tsx + .stories.tsx + .test.tsx 함께 제공**
- Storybook CSF3 + Controls/Interactions 사용
- accessibility-oriented stories 포함 (role/label 테스트)

### TanStack 통합
- TanStack Table editors: input/validation/state 분리

---

## 디렉토리별 규칙 요약

| 디렉토리 | 핵심 규칙 |
|---------|----------|
| `components/` | React Aria, tv(), react-aria-* prefix, .stories.tsx |
| `panels/` | React Aria, No inline Tailwind, CSS 재사용 |
| `inspector/` | **inline styles (예외)**, useSyncWithBuilder, history 통합 |
| `stores/` | Zustand factory pattern, 모듈화, strict typing |
| `hooks/` | thin hooks, 로직은 services로 위임 |
| `services/` | Supabase service modules, RLS, safe error handling |
| `preview/` | origin 검증, PREVIEW_READY 버퍼링, getComputedStyle |

---

## 코드 예시

### Zustand 스토어 패턴

```typescript
// ✅ 올바른 방식: factory function
import { StateCreator } from 'zustand';

type SetState = Parameters<StateCreator<ElementsState>>[0];
type GetState = Parameters<StateCreator<ElementsState>>[1];

export const createElementCreation = (set: SetState, get: GetState) => ({
  createElement: (element: Element) => {
    set((state) => ({ elements: [...state.elements, element] }));
  },
});

// ❌ 잘못된 방식: 거대한 단일 파일
export const useStore = create<State>((set) => ({
  // 모든 로직이 한 파일에...
}));
```

### React Aria 컴포넌트

```typescript
// ✅ 올바른 방식
import { tv } from 'tailwind-variants';

const button = tv({
  base: 'react-aria-Button',
  variants: {
    variant: { primary: 'primary', outline: 'outline' },
    size: { sm: 'sm', md: 'md', lg: 'lg' },
  },
});

// CSS (components.css)
.react-aria-Button { /* base styles */ }
.react-aria-Button.primary { /* variant */ }

// ❌ 잘못된 방식: inline Tailwind
<Button className="bg-blue-500 px-4 py-2 rounded" />
```

### Inspector 스타일 (예외)

```typescript
// ✅ Inspector에서는 inline styles 사용
<div style={{
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
}}>
  {/* inspector controls */}
</div>

// ❌ Inspector에서 CSS variables 사용 금지
<div style={{ display: 'var(--display)' }} />
```

### PostMessage 패턴

```typescript
// ✅ 올바른 방식
window.addEventListener('message', (event) => {
  // origin 검증 필수
  if (event.origin !== expectedOrigin) return;

  // PREVIEW_READY 후에만 처리
  if (!isPreviewReady) {
    messageBuffer.push(event.data);
    return;
  }

  handleMessage(event.data);
});
```
