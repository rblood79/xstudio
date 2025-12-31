# Visual Feedback Usage Guide

## Phase 6: Visual Feedback for Modified Values

이 가이드는 Property 컴포넌트에서 수정된 값을 시각적으로 표시하는 방법을 설명합니다.

## 개요

수정된 속성은 파란색 도트로 표시되어 사용자가 어떤 스타일이 변경되었는지 쉽게 파악할 수 있습니다.

## 사용 방법

### 1. isPropertyModified 헬퍼 사용

```tsx
import { isPropertyModified } from '../hooks/useStyleSource';

export function MyPropertyEditor({ element }: Props) {
  const isModified = isPropertyModified(element, 'width');

  return (
    <PropertyUnitInput
      label="Width"
      className={isModified ? 'property-modified' : ''}
      // ... other props
    />
  );
}
```

### 2. fieldset-legend에 적용

```tsx
<fieldset className="properties-aria">
  <legend className={`fieldset-legend ${isModified ? 'property-modified' : ''}`}>
    Width
  </legend>
  {/* ... */}
</fieldset>
```

### 3. PropertySection에서 일괄 적용

```tsx
import { getModifiedProperties } from '../hooks/useStyleSource';

export function TransformSection({ selectedElement }: Props) {
  const modifiedProps = getModifiedProperties(selectedElement);
  const sectionHasModifications = modifiedProps.some(prop =>
    ['width', 'height', 'top', 'left', 'alignItems', 'justifyContent'].includes(prop)
  );

  return (
    <PropertySection
      id="transform"
      title={sectionHasModifications ? '● Transform' : 'Transform'}
      // ...
    >
      {/* ... */}
    </PropertySection>
  );
}
```

## CSS Classes

### .property-modified

수정된 속성 라벨 앞에 파란색 도트를 표시합니다.

```css
.property-modified::before {
  content: '';
  display: inline-block;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--action-primary-bg);
  margin-right: var(--spacing-sm);
  vertical-align: middle;
}
```

### .source-dot

스타일 출처를 나타내는 컬러 도트입니다.

```css
.source-dot.inline {
  background: var(--action-primary-bg); /* 파란색 - 사용자 설정 */
}
.source-dot.computed {
  background: var(--color-success-500); /* 초록색 - CSS 클래스 */
}
.source-dot.inherited {
  background: var(--color-warning-500); /* 주황색 - 상속 */
}
.source-dot.default {
  background: var(--builder-inspector-text-tertiary); /* 회색 - 기본값 */
}
```

## 예시 구현

### PropertyUnitInput에 적용

```tsx
import { isPropertyModified } from '../hooks/useStyleSource';

<PropertyUnitInput
  icon={RulerDimensionLine}
  label="Width"
  value={getStyleValue(selectedElement, 'width', 'auto')}
  className={isPropertyModified(selectedElement, 'width') ? 'property-modified' : ''}
  units={['px', '%', 'rem', 'em', 'vh', 'vw', 'auto']}
  onChange={(value) => updateStyle('width', value)}
  min={0}
  max={9999}
/>
```

### PropertyColor에 적용

```tsx
<PropertyColor
  icon={Square}
  label="Background Color"
  className={isPropertyModified(selectedElement, 'backgroundColor') ? 'property-modified' : ''}
  value={getStyleValue(selectedElement, 'backgroundColor', '#FFFFFF')}
  onChange={(value) => updateStyle('backgroundColor', value)}
  placeholder="#FFFFFF"
/>
```

### PropertySelect에 적용

```tsx
<PropertySelect
  icon={Type}
  label="Font Family"
  className={isPropertyModified(selectedElement, 'fontFamily') ? 'property-modified' : ''}
  value={getStyleValue(selectedElement, 'fontFamily', 'Arial')}
  options={FONT_FAMILIES}
  onChange={(value) => updateStyle('fontFamily', value)}
/>
```

## 섹션 타이틀에 표시

섹션 타이틀에 수정 여부를 표시하려면:

```tsx
const modifiedProps = getModifiedProperties(selectedElement);
const hasLayoutModifications = modifiedProps.some(prop =>
  ['display', 'flexDirection', 'gap', 'padding', 'margin'].includes(prop)
);

<PropertySection
  id="layout"
  title={hasLayoutModifications ? '● Layout' : 'Layout'}
  onReset={handleReset}
>
  {/* ... */}
</PropertySection>
```

## 통합 권장사항

1. **점진적 적용**: 모든 Property 컴포넌트에 한 번에 적용하지 말고, 자주 사용되는 속성부터 적용
2. **성능 고려**: useMemo를 사용하여 불필요한 재계산 방지
3. **일관성**: 모든 섹션에 동일한 패턴 적용

## 헬퍼 함수 API

### isPropertyModified

특정 속성이 수정되었는지 확인합니다.

```tsx
function isPropertyModified(
  element: SelectedElement | null,
  property: keyof React.CSSProperties
): boolean
```

### getModifiedProperties

수정된 모든 속성 목록을 반환합니다.

```tsx
function getModifiedProperties(
  element: SelectedElement | null
): string[]
```

### getStyleSource

속성의 출처 정보를 반환합니다.

```tsx
function getStyleSource(
  element: SelectedElement | null,
  property: keyof React.CSSProperties
): StyleSource

type StyleSource =
  | { type: 'inline'; location: 'user-set' }
  | { type: 'computed'; location: string }
  | { type: 'inherited'; location: string }
  | { type: 'default'; location: 'component-default' }
```

## 참고 파일

- CSS: `src/builder/panels/common/index.css` (648-717줄)
- Hooks: `src/builder/panels/styles/hooks/useStyleSource.ts`
- Types: `src/builder/panels/styles/types/styleTypes.ts`
