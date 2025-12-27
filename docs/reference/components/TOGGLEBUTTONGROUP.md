# ToggleButtonGroup Indicator Enhancement

## 개요

ToggleButtonGroup 컴포넌트의 indicator가 선택되지 않은 상태일 때 자동으로 사라지도록 개선하여, mutually exclusive button groups에서 올바르게 동작하도록 수정했습니다.

## 문제

### 증상

Inspector의 Flexbox 컨트롤에서 다음과 같은 문제가 발생:

1. **3x3 Grid Alignment** 버튼 클릭 → `justifyContent: center, alignItems: center` 설정
2. **Spacing** 버튼(`space-evenly`) 클릭 → `justifyContent: space-evenly` 설정
3. **문제**: 3x3 Grid의 indicator가 여전히 표시됨 ❌

### 원인

`selectedKeys`가 빈 배열 `[]`이 되어도 indicator의 CSS가 마지막 위치에 그대로 남아있었습니다:

```typescript
// ToggleButtonGroup.tsx (기존 코드)
if (selectedButton) {
  // indicator 위치 설정
  group.style.setProperty('--indicator-left', `${left}px`);
  group.style.setProperty('--indicator-width', `${width}px`);
} else {
  console.log('No selected button found');
  // ❌ 아무 처리도 하지 않음 → indicator가 마지막 위치에 남음
}
```

## 해결 방법

### 1. opacity 기반 숨김 처리

선택된 버튼이 없을 때 `--indicator-opacity: 0`으로 설정:

**파일**: `src/builder/components/ToggleButtonGroup.tsx`

```typescript
const selectedButton = group.querySelector('[data-selected]') as HTMLElement;

if (selectedButton) {
  // 선택된 버튼이 있을 때: indicator 표시
  const groupRect = group.getBoundingClientRect();
  const buttonRect = selectedButton.getBoundingClientRect();

  const left = buttonRect.left - groupRect.left;
  const top = buttonRect.top - groupRect.top;
  const width = buttonRect.width;
  const height = buttonRect.height;

  group.style.setProperty('--indicator-left', `${left}px`);
  group.style.setProperty('--indicator-top', `${top}px`);
  group.style.setProperty('--indicator-width', `${width}px`);
  group.style.setProperty('--indicator-height', `${height}px`);
  group.style.setProperty('--indicator-opacity', '1'); // ✅ 표시
} else {
  // 선택된 버튼이 없을 때: indicator 숨김
  console.log('No selected button found - hiding indicator');
  group.style.setProperty('--indicator-opacity', '0'); // ✅ 숨김
}
```

### 2. CSS 업데이트

indicator에 opacity transition 추가:

**파일**: `src/builder/components/components.css`

```css
.react-aria-ToggleButtonGroup[data-indicator="true"] {
  --indicator-left: 0px;
  --indicator-width: 0px;
  --indicator-height: 0px;
  --indicator-top: 0px;
  --indicator-opacity: 0; /* ✅ 기본값: 숨김 */

  &::before {
    content: "";
    position: absolute;
    width: var(--indicator-width);
    height: var(--indicator-height);
    transform: translateX(var(--indicator-left)) translateY(var(--indicator-top));
    background: var(--color-primary-600);
    opacity: var(--indicator-opacity); /* ✅ opacity 적용 */
    transition: transform 200ms ease-out,
                width 200ms ease-out,
                height 200ms ease-out,
                opacity 200ms ease-out; /* ✅ opacity transition 추가 */
  }
}
```

## 동작 원리

### MutationObserver

ToggleButtonGroup은 MutationObserver를 사용하여 `data-selected` 속성 변경을 감지:

```typescript
useEffect(() => {
  if (!indicator) return;

  const group = groupRef.current;
  if (!group) return;

  const updateIndicator = () => {
    const selectedButton = group.querySelector('[data-selected]');

    if (selectedButton) {
      // 위치 계산 및 opacity: 1
    } else {
      // opacity: 0
    }
  };

  // 초기 업데이트
  updateIndicator();

  // MutationObserver로 변경 감지
  const observer = new MutationObserver(updateIndicator);
  observer.observe(group, {
    attributes: true,
    subtree: true,
    attributeFilter: ['data-selected']
  });

  return () => observer.disconnect();
}, [indicator, selectedKeys]);
```

### Transition 타이밍

```
Button Click
  ↓
React Aria updates data-selected attribute
  ↓
MutationObserver triggers updateIndicator()
  ↓
CSS custom property --indicator-opacity updated
  ↓
CSS transition (200ms ease-out)
  ↓
Smooth fade in/out
```

## 사용 사례: Mutually Exclusive Groups

### Inspector Flexbox Controls

**3x3 Grid vs Spacing Buttons**

```typescript
// 3x3 Grid Alignment
<ToggleButtonGroup
  indicator
  selectionMode="single"
  selectedKeys={getFlexAlignmentKeys(element)} // 배열 or []
  onSelectionChange={(keys) => {
    // justifyContent: flex-start/center/flex-end
    // alignItems: flex-start/center/flex-end
  }}
>

// Spacing Buttons
<ToggleButtonGroup
  indicator
  selectionMode="single"
  selectedKeys={getJustifyContentSpacingKeys(element)} // 배열 or []
  onSelectionChange={(keys) => {
    // justifyContent: space-around/space-between/space-evenly
  }}
>
```

**Helper Functions**

```typescript
// 3x3 Grid: spacing 값일 때 빈 배열 반환
function getFlexAlignmentKeys(element: SelectedElement): string[] {
  const justifyContent = getStyleValue(element, "justifyContent", "");

  const spacingValues = ["space-around", "space-between", "space-evenly"];
  if (spacingValues.includes(justifyContent)) {
    return []; // ✅ indicator 숨김
  }

  // flex-start, center, flex-end 조합 반환
  // ...
}

// Spacing: flex-start/center/flex-end일 때 빈 배열 반환
function getJustifyContentSpacingKeys(element: SelectedElement): string[] {
  const justifyContent = getStyleValue(element, "justifyContent", "");

  if (justifyContent === "space-around") return ["space-around"];
  if (justifyContent === "space-between") return ["space-between"];
  if (justifyContent === "space-evenly") return ["space-evenly"];

  return []; // ✅ indicator 숨김
}
```

## 동작 시나리오

### 시나리오 1: 3x3 Grid → Spacing

```
1. User clicks "centerCenter" button (3x3 grid)
   → selectedKeys: ["centerCenter"]
   → indicator opacity: 1 (표시)
   → justifyContent: center, alignItems: center

2. User clicks "space-evenly" button (spacing)
   → justifyContent: space-evenly
   → getFlexAlignmentKeys() returns [] (spacing 값 감지)
   → selectedKeys: []
   → indicator opacity: 0 (숨김) ✅

3. Spacing button group
   → getJustifyContentSpacingKeys() returns ["space-evenly"]
   → selectedKeys: ["space-evenly"]
   → indicator opacity: 1 (표시) ✅
```

### 시나리오 2: Spacing → 3x3 Grid

```
1. User clicks "space-between" button (spacing)
   → selectedKeys: ["space-between"]
   → indicator opacity: 1 (표시)
   → justifyContent: space-between

2. User clicks "leftTop" button (3x3 grid)
   → justifyContent: flex-start, alignItems: flex-start
   → getJustifyContentSpacingKeys() returns [] (spacing 아님)
   → selectedKeys: []
   → indicator opacity: 0 (숨김) ✅

3. 3x3 Grid button group
   → getFlexAlignmentKeys() returns ["leftTop"]
   → selectedKeys: ["leftTop"]
   → indicator opacity: 1 (표시) ✅
```

## 결과

### ✅ 수정 완료

1. **Opacity-based hiding**
   - `selectedKeys: []`일 때 indicator 자동 숨김
   - CSS transition으로 부드러운 fade out

2. **Mutually exclusive groups 지원**
   - 3x3 Grid ↔ Spacing buttons 완벽 전환
   - 각 그룹의 indicator 독립적으로 표시/숨김

3. **일관된 사용자 경험**
   - 시각적 피드백 명확
   - 어떤 그룹이 활성화되었는지 직관적으로 표시

### 📊 성능

- **MutationObserver**: DOM 변경 감지 (효율적)
- **CSS transitions**: GPU 가속 (부드러운 애니메이션)
- **Minimal re-renders**: selectedKeys 변경 시에만 업데이트

## 관련 파일

- `src/builder/components/ToggleButtonGroup.tsx` - Indicator 로직 (line 47-68)
- `src/builder/components/components.css` - Indicator CSS (line 390-411)
- `src/builder/inspector/sections/StyleSection.tsx` - Flexbox controls 사용 예시

## 참고 자료

- [CLAUDE.md - ToggleButtonGroup with Indicator](../../CLAUDE.md#togglebuttongroup-with-indicator)
- [React Aria: ToggleButton](https://react-spectrum.adobe.com/react-aria/ToggleButton.html)
- [MDN: MutationObserver](https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver)
- [CSS Transitions](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Transitions/Using_CSS_transitions)
