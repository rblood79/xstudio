# Properties Panel 최적화 및 Suspense 리팩토링

## 목표

1. 즉시 수정: memo 비교 함수 버그 수정 (style, dataBinding, events 변경 감지)
2. 성능 개선: 불필요한 useMemo 제거
3. 아키텍처 개선: Suspense 기반 에디터 로딩으로 전환
4. 에러 처리: Error Boundary 통합

## Phase 1: Immediate Fixes (High Priority)

### 목표

현재 PropertyEditorWrapper의 버그 수정 및 성능 개선

### 1.1 memo 비교 함수 수정

**파일**: `src/builder/panels/properties/PropertiesPanel.tsx` (123-130줄)

**문제점**:

- properties만 비교하여 style, dataBinding, events, customId 변경을 감지하지 못함
- StylesPanel에서 style 수정해도 Editor가 리렌더되지 않음

**수정 내용**:

```typescript
// Before (123-130줄)
}, (prevProps, nextProps) => {
  return (
    prevProps.selectedElement.id === nextProps.selectedElement.id &&
    prevProps.selectedElement.type === nextProps.selectedElement.type &&
    JSON.stringify(prevProps.selectedElement.properties) === JSON.stringify(nextProps.selectedElement.properties)
  );
});

// After
}, (prevProps, nextProps) => {
  const prev = prevProps.selectedElement;
  const next = nextProps.selectedElement;
  
  return (
    prev.id === next.id &&
    prev.type === next.type &&
    prev.customId === next.customId &&
    JSON.stringify(prev.properties) === JSON.stringify(next.properties) &&
    JSON.stringify(prev.style) === JSON.stringify(next.style) &&
    JSON.stringify(prev.dataBinding) === JSON.stringify(next.dataBinding) &&
    JSON.stringify(prev.events) === JSON.stringify(next.events)
  );
});
```

### 1.2 불필요한 useMemo 제거

**파일**: `src/builder/panels/properties/PropertiesPanel.tsx` (237-240줄)

**문제점**:

- selectedElement 변경 시마다 재계산되는 useMemo (의존성이 너무 광범위)
- useMemo 오버헤드 > 실제 계산 비용

**수정 내용**:

```typescript
// Before (237-240줄)
const multiSelectMode = useMemo(() => useStore.getState().multiSelectMode || false, [selectedElement]);
const selectedElementIds = useMemo(() => useStore.getState().selectedElementIds || [], [selectedElement]);
const currentPageId = useMemo(() => useStore.getState().currentPageId, [selectedElement]);
const elements = useMemo(() => useStore.getState().elements, [selectedElement]);

// After (직접 호출 - JSX 렌더링 시점에 계산)
const multiSelectMode = useStore.getState().multiSelectMode || false;
const selectedElementIds = useStore.getState().selectedElementIds || [];
const currentPageId = useStore.getState().currentPageId;
const elements = useStore.getState().elements;
```

**예상 효과**:

- style, dataBinding, events 변경 즉시 감지
- 불필요한 메모이제이션 제거로 미세한 성능 향상

---

## Phase 2: Suspense Infrastructure

### 목표

Suspense와 호환되는 에디터 로딩 훅 생성

### 2.1 useEditor Hook 생성

**파일 생성**: `src/builder/hooks/useEditor.ts`

**구현 내용**:

```typescript
import { use } from 'react';
import type { ComponentType } from 'react';
import { getEditor } from '../inspector/editors/registry';
import type { ComponentEditorProps } from '../inspector/types';

/**
 * Promise를 Suspense와 호환되도록 캐싱
 * 같은 타입의 에디터는 같은 Promise를 재사용
 */
const editorPromises = new Map<string, Promise<ComponentType<ComponentEditorProps> | null>>();

/**
 * Suspense 호환 에디터 로딩 훅
 * React 19의 use() hook을 활용하여 Promise를 처리
 */
export function useEditor(type: string): ComponentType<ComponentEditorProps> | null {
  if (!type) return null;
  
  // Promise 캐싱 (같은 타입은 같은 Promise 재사용)
  if (!editorPromises.has(type)) {
    editorPromises.set(type, getEditor(type));
  }
  
  // use() hook으로 Promise resolve 대기
  const editor = use(editorPromises.get(type)!);
  return editor;
}

/**
 * 에디터 prefetch (선택적 사용)
 */
export function prefetchEditor(type: string): void {
  if (!editorPromises.has(type)) {
    editorPromises.set(type, getEditor(type));
  }
}

/**
 * 에디터 캐시 초기화
 */
export function clearEditorPromiseCache(): void {
  editorPromises.clear();
}
```

**특징**:

- React 19의 `use()` hook 사용
- getEditor() Promise를 캐싱하여 중복 로딩 방지
- 기존 registry.ts의 캐시와 별도로 Promise 레벨 캐싱

---

## Phase 3: PropertyEditorWrapper Suspense 리팩토링

### 목표

수동 로딩 상태 제거하고 Suspense 사용

### 3.1 PropertyEditorWrapper 단순화

**파일 수정**: `src/builder/panels/properties/PropertiesPanel.tsx` (39-130줄)

**변경 내용**:

```typescript
// Before (39-130줄, 92줄)
const PropertyEditorWrapper = memo(function PropertyEditorWrapper({
  selectedElement,
}: { selectedElement: SelectedElement }) {
  const [Editor, setEditor] = useState<ComponentType<ComponentEditorProps> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ... 48줄의 복잡한 로딩 로직
  }, [selectedElement.type]);

  const handleUpdate = useCallback((updatedProps: Record<string, unknown>) => {
    useInspectorState.getState().updateProperties(updatedProps);
  }, []);

  if (loading) {
    return <LoadingSpinner ... />;
  }

  if (!Editor) {
    return <EmptyState ... />;
  }

  return <Editor ... />;
}, (prevProps, nextProps) => { ... });

// After (30줄 감소)
import { useEditor } from '../../hooks/useEditor';

const PropertyEditorWrapper = memo(function PropertyEditorWrapper({
  selectedElement,
}: { selectedElement: SelectedElement }) {
  // Suspense가 로딩 처리 (useState, useEffect 불필요)
  const Editor = useEditor(selectedElement.type);

  const handleUpdate = useCallback((updatedProps: Record<string, unknown>) => {
    useInspectorState.getState().updateProperties(updatedProps);
  }, []);

  if (!Editor) {
    return (
      <EmptyState
        message="사용 가능한 속성 에디터가 없습니다"
        description={`'${selectedElement.type}' 컴포넌트의 에디터를 찾을 수 없습니다.`}
      />
    );
  }

  return (
    <Editor
      elementId={selectedElement.id}
      currentProps={selectedElement.properties}
      onUpdate={handleUpdate}
    />
  );
});

// memo 비교 함수는 Phase 1에서 수정된 버전 유지
```

### 3.2 Suspense 래핑

**파일 수정**: `src/builder/panels/properties/PropertiesPanel.tsx` (1010줄)

**변경 내용**:

```typescript
// Before (1010줄)
<PropertyEditorWrapper selectedElement={selectedElement} />

// After
<Suspense fallback={
  <LoadingSpinner
    message="에디터를 불러오는 중..."
    description={`${selectedElement.type} 속성 에디터 로드`}
  />
}>
  <PropertyEditorWrapper selectedElement={selectedElement} />
</Suspense>
```

**import 추가**:

```typescript
import { Suspense } from 'react'; // 10줄에 추가
```

**제거할 코드**:

- useState (44-45줄)
- useEffect (48-91줄)
- loading 상태 체크 (98-105줄)

**예상 효과**:

- 코드 약 50줄 감소
- 선언적 로딩 처리
- React의 내장 최적화 활용

---

## Phase 4: Error Boundary 추가

### 목표

에디터 로딩 실패 시 사용자 친화적 에러 처리

### 4.1 EditorErrorBoundary 생성

**파일 생성**: `src/builder/panels/properties/EditorErrorBoundary.tsx`

**구현 내용**:

```typescript
import React, { Component, type ReactNode } from 'react';
import { EmptyState } from '../common';

interface Props {
  children: ReactNode;
  elementType?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * 에디터 로딩 에러를 캐치하는 Error Boundary
 */
export class EditorErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('[EditorErrorBoundary] Error loading editor:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <EmptyState
          message="에디터를 불러올 수 없습니다"
          description={
            this.props.elementType
              ? `'${this.props.elementType}' 에디터 로드 실패`
              : '에디터 로드 중 오류 발생'
          }
        />
      );
    }

    return this.props.children;
  }
}
```

### 4.2 Error Boundary 적용

**파일 수정**: `src/builder/panels/properties/PropertiesPanel.tsx` (1010줄)

**변경 내용**:

```typescript
// Before
<Suspense fallback={...}>
  <PropertyEditorWrapper selectedElement={selectedElement} />
</Suspense>

// After
import { EditorErrorBoundary } from './EditorErrorBoundary';

<EditorErrorBoundary elementType={selectedElement.type}>
  <Suspense fallback={
    <LoadingSpinner
      message="에디터를 불러오는 중..."
      description={`${selectedElement.type} 속성 에디터 로드`}
    />
  }>
    <PropertyEditorWrapper selectedElement={selectedElement} />
  </Suspense>
</EditorErrorBoundary>
```

**예상 효과**:

- 에디터 로딩 실패 시 앱 크래시 방지
- 사용자 친화적 에러 메시지 표시
- 에러 로깅 (개발 모드)

---

## Phase 5: Prefetching 최적화 (선택적)

### 목표

다음에 사용할 에디터를 미리 로드하여 UX 개선

### 5.1 컴포넌트 목록 호버 시 Prefetch

**파일 수정**: `src/builder/panels/components/ComponentsPanel.tsx`

**변경 내용**:

```typescript
import { prefetchEditor } from '../../hooks/useEditor';

// 컴포넌트 리스트 아이템에 onMouseEnter 추가
<div
  onMouseEnter={() => {
    // 호버 시 에디터 prefetch
    prefetchEditor(component.type);
  }}
>
  {component.label}
</div>
```

### 5.2 자주 사용되는 에디터 초기 로드

**파일 수정**: `src/builder/panels/properties/PropertiesPanel.tsx`

**변경 내용**:

```typescript
import { prefetchEditor } from '../../hooks/useEditor';

// PropertiesPanel 마운트 시 자주 사용되는 에디터 prefetch
useEffect(() => {
  // 자주 사용되는 에디터 미리 로드
  const commonEditors = ['Button', 'Card', 'TextField', 'Select', 'Checkbox'];
  commonEditors.forEach(type => prefetchEditor(type));
}, []);
```

**예상 효과**:

- 첫 에디터 로딩 시간 단축
- 사용자 경험 개선

---

## 파일 변경 요약

### 생성

- `src/builder/hooks/useEditor.ts` - Suspense 호환 에디터 로딩 훅
- `src/builder/panels/properties/EditorErrorBoundary.tsx` - 에러 바운더리

### 수정

- `src/builder/panels/properties/PropertiesPanel.tsx`
  - Phase 1: memo 비교 함수 수정 (123-130줄)
  - Phase 1: useMemo 제거 (237-240줄)
  - Phase 3: PropertyEditorWrapper 단순화 (39-130줄)
  - Phase 3: Suspense 래핑 (1010줄)
  - Phase 4: Error Boundary 적용 (1010줄)
  - Phase 5: Prefetch 추가 (선택적)

### 선택적 수정

- `src/builder/panels/components/ComponentsPanel.tsx` - Prefetch on hover (Phase 5)

---

## 예상 효과

### Phase 1 (즉시)

- style, dataBinding, events 변경 즉시 감지
- 불필요한 재계산 제거

### Phase 2-4 (아키텍처 개선)

- 코드 약 50줄 감소
- 선언적 로딩 처리
- 에러 처리 개선
- 유지보수성 향상

### Phase 5 (선택적)

- 에디터 로딩 시간 단축
- UX 개선

---

## 주의사항

1. React 19.0.0 사용 확인 (use() hook 필요)
2. Phase 1 완료 후 테스트하여 버그 수정 확인
3. Phase 3에서 기존 에디터 캐시(registry.ts)와 Promise 캐시(useEditor.ts) 이중 캐싱 구조
4. Error Boundary는 클래스 컴포넌트 필요
5. Phase 5는 선택적이며 성능 프로파일링 후 결정

---

## 테스트 체크리스트

- [ ] Phase 1: StylesPanel에서 style 수정 시 Editor 업데이트 확인
- [ ] Phase 1: DataBinding 변경 시 Editor 업데이트 확인
- [ ] Phase 1: Events 변경 시 Editor 업데이트 확인
- [ ] Phase 3: 에디터 로딩 시 Suspense fallback 표시 확인
- [ ] Phase 4: 존재하지 않는 에디터 로드 시 에러 처리 확인
- [ ] Phase 5: 호버 시 prefetch 동작 확인 (선택적)

