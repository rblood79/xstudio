# PropertyCustomId Component Pattern Guide

**작성일**: 2025-11-15
**적용 범위**: All Property Editors
**상태**: ✅ Active

---

## 📋 개요

PropertyCustomId는 Inspector에서 요소의 `customId` (사용자 정의 ID)를 편집하는 컴포넌트입니다. 2025-11-15 리팩토링을 통해 **자체 상태 관리 패턴**으로 변경되었으며, `onChange` prop이 제거되었습니다.

---

## 🔄 변경 사항 (2025-11-15)

### Before (Old Pattern - ❌ Deprecated)

```typescript
export function MyComponentEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
  const element = useStore((state) => state.elements.find((el) => el.id === elementId));
  const customId = element?.customId || '';

  // ❌ 이 함수는 더 이상 필요하지 않음
  const updateCustomId = (newCustomId: string) => {
    const updateElement = useStore.getState().updateElement;
    if (updateElement && elementId) {
      updateElement(elementId, { customId: newCustomId });
    }
  };

  return (
    <div className="component-props">
      <PropertyCustomId
        label="ID"
        value={customId}
        elementId={elementId}
        onChange={updateCustomId}  // ❌ 이 prop은 제거됨
        placeholder="my_component_1"
      />
    </div>
  );
}
```

### After (New Pattern - ✅ Current)

```typescript
export function MyComponentEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
  // customId는 element에서 직접 가져옴
  const element = useStore((state) => state.elements.find((el) => el.id === elementId));
  const customId = element?.customId || '';

  // updateCustomId 함수 삭제됨 ✅

  return (
    <div className="component-props">
      <PropertyCustomId
        label="ID"
        value={customId}
        elementId={elementId}
        placeholder="my_component_1"
        // onChange prop 제거 - 컴포넌트가 내부적으로 처리 ✅
      />
    </div>
  );
}
```

---

## 🎯 핵심 원칙

### 1. PropertyCustomId는 자체 상태를 관리함

PropertyCustomId 컴포넌트는 내부적으로 `useInspectorState` hook을 사용하여 customId를 업데이트합니다. **부모 컴포넌트는 단순히 현재 값만 전달**하면 됩니다.

```typescript
// PropertyCustomId 내부 구현 (참고용)
export function PropertyCustomId({ value, elementId, label, placeholder }: Props) {
  const { selectedElement, updateElement } = useInspectorState();

  const handleChange = (newValue: string) => {
    if (elementId && updateElement) {
      updateElement(elementId, { customId: newValue });
    }
  };

  // ...
}
```

### 2. 부모는 읽기 전용으로 값을 전달

부모 컴포넌트(Property Editor)는:
- ✅ Store에서 현재 customId 값을 읽어옴
- ✅ PropertyCustomId에 값을 전달
- ❌ ~~onChange 핸들러를 제공하지 않음~~
- ❌ ~~updateElement를 직접 호출하지 않음~~

---

## 📝 표준 패턴

### 기본 템플릿

```typescript
import { PropertyCustomId } from '../../components';
import { useStore } from '../../../stores';
import type { PropertyEditorProps } from '../types/editorTypes';

export function MyComponentEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
  // 1. Store에서 element 가져오기
  const element = useStore((state) =>
    state.elements.find((el) => el.id === elementId)
  );

  // 2. customId 추출 (없으면 빈 문자열)
  const customId = element?.customId || '';

  return (
    <div className="component-props">
      {/* 3. PropertyCustomId 렌더링 */}
      <PropertyCustomId
        label="ID"
        value={customId}
        elementId={elementId}
        placeholder="my_component_1"
      />

      {/* 나머지 properties */}
    </div>
  );
}
```

### Props 설명

| Prop | 타입 | 필수 | 설명 |
|------|------|------|------|
| `label` | `string` | ✅ | 입력 필드 레이블 (일반적으로 "ID") |
| `value` | `string` | ✅ | 현재 customId 값 |
| `elementId` | `string` | ✅ | 편집 중인 요소 ID |
| `placeholder` | `string` | ❌ | 입력 필드 placeholder |
| ~~`onChange`~~ | ~~`function`~~ | ❌ | **제거됨 - 사용하지 말 것** |

---

## 🚫 안티패턴

### ❌ Anti-Pattern 1: onChange 핸들러 전달

```typescript
// ❌ WRONG - onChange는 더 이상 지원되지 않음
const updateCustomId = (newCustomId: string) => {
  updateElement(elementId, { customId: newCustomId });
};

<PropertyCustomId
  onChange={updateCustomId}  // ❌ TypeScript error
/>
```

**에러 메시지**:
```
Type '{ onChange: (newCustomId: string) => void; ... }' is not assignable to type 'PropertyCustomIdProps'.
Object literal may only specify known properties, and 'onChange' does not exist in type 'PropertyCustomIdProps'.
```

### ❌ Anti-Pattern 2: updateElement 직접 호출

```typescript
// ❌ WRONG - 부모가 직접 updateElement 호출
const handleCustomIdChange = (newId: string) => {
  const updateElement = useStore.getState().updateElement;
  updateElement(elementId, { customId: newId });
};
```

**이유**: PropertyCustomId가 이미 내부적으로 처리하므로 중복됨

### ❌ Anti-Pattern 3: Local State 사용

```typescript
// ❌ WRONG - customId를 local state로 관리
const [customId, setCustomId] = useState('');

const handleChange = (newId: string) => {
  setCustomId(newId);
  updateElement(elementId, { customId: newId });
};

<PropertyCustomId
  value={customId}
  onChange={handleChange}  // ❌ 불필요한 복잡성
/>
```

**이유**: Store가 이미 single source of truth이며, local state는 불필요

---

## ✅ 올바른 사용 예시

### Example 1: Button Component Editor

```typescript
// src/builder/inspector/properties/editors/ButtonEditor.tsx

import { PropertyCustomId, PropertyInput, PropertySelect } from '../../components';
import { useStore } from '../../../stores';
import type { PropertyEditorProps } from '../types/editorTypes';

export function ButtonEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
  const element = useStore((state) => state.elements.find((el) => el.id === elementId));
  const customId = element?.customId || '';

  const updateProp = (key: string, value: unknown) => {
    const updatedProps = { ...currentProps, [key]: value };
    onUpdate(updatedProps);
  };

  return (
    <div className="component-props">
      {/* ✅ CORRECT - 단순하게 값만 전달 */}
      <PropertyCustomId
        label="ID"
        value={customId}
        elementId={elementId}
        placeholder="button_1"
      />

      <PropertyInput
        label="Text"
        value={String(currentProps.children || '')}
        onChange={(value) => updateProp('children', value)}
      />

      <PropertySelect
        label="Variant"
        value={String(currentProps.variant || 'default')}
        onChange={(value) => updateProp('variant', value)}
        options={[
          { value: 'default', label: 'Default' },
          { value: 'primary', label: 'Primary' },
        ]}
      />
    </div>
  );
}
```

### Example 2: Tabs Component Editor

```typescript
// src/builder/inspector/properties/editors/TabsEditor.tsx

export function TabsEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
  const element = useStore((state) => state.elements.find((el) => el.id === elementId));
  const customId = element?.customId || '';

  return (
    <div className="component-props">
      {/* ✅ PropertyCustomId는 항상 첫 번째 필드로 배치 권장 */}
      <PropertyCustomId
        label="ID"
        value={customId}
        elementId={elementId}
        placeholder="tabs_1"
      />

      {/* 나머지 properties */}
    </div>
  );
}
```

---

## 🔧 Migration Guide

기존 Property Editor를 새 패턴으로 마이그레이션하는 방법:

### Step 1: updateCustomId 함수 제거

```diff
export function MyEditor({ elementId, currentProps, onUpdate }: PropertyEditorProps) {
  const element = useStore((state) => state.elements.find((el) => el.id === elementId));
  const customId = element?.customId || '';

- const updateCustomId = (newCustomId: string) => {
-   const updateElement = useStore.getState().updateElement;
-   if (updateElement && elementId) {
-     updateElement(elementId, { customId: newCustomId });
-   }
- };

  return (
    // ...
  );
}
```

### Step 2: onChange prop 제거

```diff
<PropertyCustomId
  label="ID"
  value={customId}
  elementId={elementId}
  placeholder="my_component_1"
- onChange={updateCustomId}
/>
```

### Step 3: TypeScript 에러 확인

```bash
npx tsc --noEmit
```

✅ 에러가 없어야 정상

---

## 📋 체크리스트

Property Editor 작성 시 다음 항목을 확인하세요:

- [ ] `useStore`에서 element 가져오기
- [ ] `customId = element?.customId || ''` 패턴 사용
- [ ] `PropertyCustomId` 컴포넌트에 `value`, `elementId` 전달
- [ ] ~~`onChange` prop 전달하지 않음~~ ❌
- [ ] ~~`updateCustomId` 함수 정의하지 않음~~ ❌
- [ ] Placeholder는 컴포넌트 이름 + "_1" 형식 권장
- [ ] PropertyCustomId는 첫 번째 필드로 배치 권장

---

## 🎓 내부 동작 원리 (참고)

PropertyCustomId가 어떻게 작동하는지 이해하면 올바르게 사용할 수 있습니다:

```typescript
// PropertyCustomId.tsx (simplified)
export function PropertyCustomId({ value, elementId, label, placeholder }: Props) {
  const { updateElement } = useInspectorState();  // 🔑 핵심: Inspector state에서 업데이트 함수 가져옴

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;

    if (updateElement && elementId) {
      // 🔑 내부적으로 Zustand store 업데이트
      updateElement(elementId, { customId: newValue });
    }
  };

  return (
    <div className="property-custom-id">
      <label>{label}</label>
      <input
        type="text"
        value={value}
        onChange={handleChange}  // 🔑 내부 핸들러 사용
        placeholder={placeholder}
      />
    </div>
  );
}
```

**핵심**:
1. `useInspectorState`에서 `updateElement` 가져옴
2. 내부 `handleChange`에서 Zustand store 업데이트
3. 부모는 단순히 현재 `value`만 전달

---

## 🔗 관련 문서

- **[TYPESCRIPT_ERROR_FIXES.md](../TYPESCRIPT_ERROR_FIXES.md)** - TypeScript 에러 수정 전체 내역
- **[CLAUDE.md](../../CLAUDE.md)** - TypeScript 코딩 규칙 (Common Error Patterns #1)
- **[PAGE_TYPE_SEPARATION.md](../architecture/PAGE_TYPE_SEPARATION.md)** - Page 타입 아키텍처

---

## 📞 문의

이 패턴에 대한 질문이나 개선 제안은:
- CLAUDE.md 업데이트
- 코드 리뷰 시 피드백

---

**최종 업데이트**: 2025-11-15
**작성자**: Claude Code
**적용 범위**: All Property Editors (13+ files)
