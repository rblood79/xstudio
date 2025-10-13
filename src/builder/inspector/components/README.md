# Inspector Components

`inspector/components` 디렉토리는 Inspector 내의 모든 영역(`properties`, `data`, `events` 등)에서 공통으로 사용할 수 있는 재사용 가능한 컴포넌트들을 제공합니다.

## 📦 사용 가능한 컴포넌트

### PropertyInput
텍스트/숫자 입력 필드

```tsx
import { PropertyInput } from '../components';

<PropertyInput
  icon={Settings}
  label="Row Height"
  value={props.rowHeight || 50}
  onChange={(value) => updateProps({ rowHeight: parseInt(value) })}
  type="number"
/>
```

### PropertySelect
드롭다운 선택 필드 (아이콘이 Select 버튼 내부에 위치)

```tsx
import { PropertySelect } from '../components';

<PropertySelect
  icon={Grid}
  label="Selection Mode"
  value={props.selectionMode || 'none'}
  options={[
    { value: 'none', label: '선택 없음' },
    { value: 'single', label: '단일 선택' },
    { value: 'multiple', label: '다중 선택' },
  ]}
  onChange={(value) => updateProps({ selectionMode: value })}
/>
```

### PropertyCheckbox
체크박스

```tsx
import { PropertyCheckbox } from '../components';

<PropertyCheckbox
  icon={Table}
  label="Enable sorting"
  isSelected={props.allowsSorting || false}
  onChange={(value) => updateProps({ allowsSorting: value })}
/>
```

### PropertySwitch
토글 스위치

```tsx
import { PropertySwitch } from '../components';

<PropertySwitch
  icon={Table}
  label="헤더 고정"
  isSelected={props.stickyHeader || false}
  onChange={(value) => updateProps({ stickyHeader: value })}
/>
```

### PropertyFieldset
커스텀 필드셋 (다른 Property 컴포넌트들의 기본 래퍼)

```tsx
import { PropertyFieldset } from '../components';

<PropertyFieldset legend="Custom Field" icon={Settings}>
  {/* 커스텀 내용 */}
</PropertyFieldset>
```

## 🗂️ Import 경로

### `properties/editors`에서 사용 시:
```tsx
import { PropertyInput, PropertySelect, PropertySwitch } from '../../components';
```

### `data`에서 사용 시:
```tsx
import { PropertyInput, PropertySelect, PropertySwitch } from '../components';
```

### `events`에서 사용 시:
```tsx
import { PropertyInput, PropertySelect } from '../components';
```

## 🎨 스타일링

모든 컴포넌트는 일관된 스타일을 위해 다음 CSS 클래스를 사용합니다:
- `.properties-aria`: 필드셋 래퍼
- `.fieldset-legend`: 범례 (제목)
- `.react-aria-control`: 컨트롤 컨테이너
- `.control-label`: 아이콘 라벨

## 💡 사용 예제

### Data 폴더에서 사용하기

```tsx
// APICollectionEditor.tsx
import { PropertyInput, PropertySelect } from '../components';

export function APICollectionEditor({ config, onChange }) {
  return (
    <div>
      <PropertySelect
        icon={Globe}
        label="Base URL"
        value={config.baseUrl}
        options={[
          { value: 'MOCK_DATA', label: 'Mock Data' },
          { value: 'CUSTOM', label: 'Custom URL' },
        ]}
        onChange={(baseUrl) => onChange({ ...config, baseUrl })}
      />

      {config.baseUrl === 'CUSTOM' && (
        <PropertyInput
          icon={Link}
          label="Custom URL"
          value={config.customUrl || ''}
          onChange={(customUrl) => onChange({ ...config, customUrl })}
        />
      )}
    </div>
  );
}
```

### Properties 폴더에서 사용하기

```tsx
// TableEditor.tsx
import { PropertyInput, PropertySelect, PropertySwitch } from '../../components';

export function TableEditor({ currentProps, onUpdate }) {
  return (
    <fieldset>
      <PropertySwitch
        icon={Table}
        label="헤더 고정"
        isSelected={currentProps.stickyHeader || false}
        onChange={(stickyHeader) => onUpdate({ stickyHeader })}
      />
    </fieldset>
  );
}
```

## 🔧 커스터마이징

모든 컴포넌트는 `className` prop을 지원하여 추가 스타일을 적용할 수 있습니다:

```tsx
<PropertyInput
  label="Custom"
  value={value}
  onChange={handleChange}
  className="custom-input-class"
/>
```

## 📝 타입

모든 컴포넌트는 TypeScript로 작성되어 완전한 타입 안전성을 제공합니다.

```tsx
interface PropertyInputProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: 'text' | 'number' | 'color';
  icon?: React.ComponentType<IconProps>;
  className?: string;
  min?: number;
  max?: number;
  step?: number;
}
```
