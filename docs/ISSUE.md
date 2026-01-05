# Style Panel - WebGL 컴포넌트 Computed Style 미반영 이슈

## 문제 설명

스타일 패널(Inspector)의 Typography 섹션 및 다른 섹션들이 WebGL 컴포넌트의 실제 렌더링 값과 일치하지 않음.

예: Button `size="sm"`일 때
- 실제 렌더링: `14px` (정상)
- 스타일 패널 표시: `16px` (잘못됨)

## 원인 분석

### 스타일 패널의 값 읽기 방식

```typescript
// apps/builder/src/builder/panels/styles/atoms/styleAtoms.ts:365-368
export const fontSizeAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.fontSize ?? element?.computedStyle?.fontSize ?? '16px'),
);
```

**우선순위:**
1. `element.style.fontSize` (inline 스타일)
2. `element.computedStyle.fontSize` (computed 스타일)
3. `'16px'` (fallback)

### WebGL 컴포넌트의 특성

WebGL 컴포넌트는 **실제 DOM 요소가 아님**:
- `element.style`: inline 스타일만 존재 (size prop에서 파생된 fontSize 없음)
- `element.computedStyle`: CSS computed style 없음 (DOM이 아니므로 브라우저가 계산하지 않음)
- 결과: fallback 값이 표시됨

### PixiJS 렌더링 방식

```typescript
// apps/builder/src/builder/workspace/canvas/ui/PixiButton.tsx
const sizePreset = getSizePreset(size) || DEFAULT_SIZE_PRESET;
const fontSize = parseCSSSize(style?.fontSize, undefined, sizePreset.fontSize);
```

PixiJS는 `getSizePreset()`을 통해 CSS 변수에서 정확한 값을 읽어옴:
- `size="sm"` → `getSizePreset('sm')` → `--text-sm` → `0.875rem` → `14px`

## 아키텍처 갭

```
┌─────────────────────────────────────────────────────────────┐
│ PixiJS 렌더링                                                │
│  → getSizePreset(size) → CSS 변수 → 14px ✅                 │
├─────────────────────────────────────────────────────────────┤
│ 스타일 패널                                                   │
│  → element.style.fontSize ?? computedStyle.fontSize ?? 16px │
│  → 없음 → 없음 → 16px ❌                                     │
└─────────────────────────────────────────────────────────────┘
```

## 영향받는 속성

Button, Input, Checkbox, Radio 등 **size/variant prop을 사용하는 모든 컴포넌트**의:
- `fontSize`
- `padding` (paddingX, paddingY)
- `borderRadius`
- `color` (variant에서 파생)
- `backgroundColor` (variant에서 파생)

## 해결 방안 (제안)

### 방안 1: computedStyle 자동 채우기

요소 선택 시 컴포넌트의 `size`, `variant` prop에서 파생되는 값들을 `computedStyle`에 자동으로 채움.

```typescript
// 예시: 요소 선택 시
function computeStyleFromProps(element: Element): Partial<CSSProperties> {
  const { size, variant } = element.props;
  const sizePreset = getSizePreset(size);
  const variantColors = getVariantColors(variant);

  return {
    fontSize: `${sizePreset.fontSize}px`,
    paddingTop: `${sizePreset.paddingY}px`,
    paddingRight: `${sizePreset.paddingX}px`,
    // ...
  };
}
```

**장점:** 기존 스타일 패널 로직 변경 최소화
**단점:** 모든 컴포넌트별 preset 매핑 필요

### 방안 2: 스타일 패널에서 preset 인식

스타일 패널이 컴포넌트의 `size`, `variant` prop을 인식하여 preset 값을 직접 표시.

```typescript
// 예시
const fontSize = useMemo(() => {
  if (element?.style?.fontSize) return element.style.fontSize;
  if (element?.props?.size) {
    const preset = getSizePreset(element.props.size);
    return `${preset.fontSize}px`;
  }
  return '16px';
}, [element]);
```

**장점:** 정확한 값 표시
**단점:** 스타일 패널 로직 복잡해짐

### 방안 3: CSS 변수 표시

값 대신 CSS 변수 참조를 표시 (예: `var(--text-sm)`)

**장점:** 간단
**단점:** 사용자가 실제 픽셀 값을 알기 어려움

## 관련 파일

- `apps/builder/src/builder/panels/styles/atoms/styleAtoms.ts`
- `apps/builder/src/builder/panels/styles/hooks/useTypographyValuesJotai.ts`
- `apps/builder/src/builder/panels/styles/sections/TypographySection.tsx`
- `apps/builder/src/builder/workspace/canvas/utils/cssVariableReader.ts`
- `apps/builder/src/builder/workspace/canvas/ui/PixiButton.tsx`

## 우선순위

중간 - UI 표시 문제이며 실제 렌더링에는 영향 없음

## 관련 이슈

- `@pixi/layout` 마이그레이션과는 별개의 이슈
