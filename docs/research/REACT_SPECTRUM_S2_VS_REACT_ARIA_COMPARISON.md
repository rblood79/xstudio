# React Spectrum S2 vs React Aria Components 비교 분석

> 작성일: 2025-12-20
> 목적: React Spectrum S2 전용 컴포넌트의 React Aria Components 조합 제작 가능 여부 분석

---

## 1. 개요

| 항목 | React Aria Components | React Spectrum S2 |
|------|----------------------|-------------------|
| **버전** | v1.14.0 | v1.0.0 |
| **패키지** | `react-aria-components` | `@react-spectrum/s2` |
| **목적** | 스타일 없는 접근성 컴포넌트 | Adobe 디자인 시스템 구현체 |
| **스타일링** | 완전한 커스텀 (CSS, Tailwind 등) | Style Macro 기반 |
| **컴포넌트 수** | 50+ | 70+ |

### 범례

- ✅ React Aria 제공
- ❌ React Aria 미제공 (S2 전용)
- 🔧 React Aria 조합으로 제작 가능
- 🚫 React Aria로 제작 불가 (디자인/CSS 전용)
- ⭐ xstudio 구현 완료

---

## 2. 컴포넌트 비교 테이블

### 2.1 Buttons & Actions

| S2 컴포넌트 | React Aria | xstudio | 제작 가능 | 조합 방법 |
|------------|------------|---------|----------|----------|
| Button | ✅ Button | ⭐ | - | - |
| ActionButton | ❌ | ⭐ Button | 🔧 | `Button` + variant 스타일링 |
| ToggleButton | ✅ ToggleButton | ⭐ | - | - |
| ToggleButtonGroup | ✅ ToggleButtonGroup | ⭐ | - | - |
| LinkButton | ❌ | ⭐ Link | 🔧 | `Link` + Button 스타일링 |
| ButtonGroup | ❌ | - | 🔧 | `Group` + Button 조합 |
| ActionGroup | ❌ | - | 🔧 | `Group` + ActionButton 조합 |
| ActionBar | ❌ | - | 🔧 | `Toolbar` + ActionButton 조합 |

---

### 2.2 Forms & Inputs

| S2 컴포넌트 | React Aria | xstudio | 제작 가능 | 조합 방법 |
|------------|------------|---------|----------|----------|
| TextField | ✅ TextField | ⭐ | - | - |
| TextArea | ✅ TextArea | ⭐ TextField | 🔧 | `TextField` + `<textarea>` |
| NumberField | ✅ NumberField | ⭐ | - | - |
| SearchField | ✅ SearchField | ⭐ | - | - |
| Checkbox | ✅ Checkbox | ⭐ | - | - |
| CheckboxGroup | ✅ CheckboxGroup | ⭐ | - | - |
| RadioGroup | ✅ RadioGroup | ⭐ | - | - |
| Switch | ✅ Switch | ⭐ | - | - |
| Slider | ✅ Slider | ⭐ | - | - |
| Form | ✅ Form | ⭐ | - | - |
| FieldGroup | ❌ | ⭐ Group | 🔧 | `Group` + Label 조합 |
| Picker | ❌ | ⭐ Select | 🔧 | `Select` 컴포넌트 (동일 기능) |
| PickerSection | ❌ | - | 🔧 | `ListBox` + Section |

---

### 2.3 Color Components

| S2 컴포넌트 | React Aria | xstudio | 제작 가능 | 조합 방법 |
|------------|------------|---------|----------|----------|
| ColorPicker | ✅ ColorPicker | ⭐ | - | - |
| ColorField | ✅ ColorField | ⭐ | - | - |
| ColorArea | ✅ ColorArea | ⭐ | - | - |
| ColorSlider | ✅ ColorSlider | ⭐ | - | - |
| ColorWheel | ✅ ColorWheel | ⭐ | - | - |
| ColorSwatch | ✅ ColorSwatch | ⭐ | - | - |
| ColorSwatchPicker | ✅ ColorSwatchPicker | ⭐ | - | - |

---

### 2.4 Date & Time

| S2 컴포넌트 | React Aria | xstudio | 제작 가능 | 조합 방법 |
|------------|------------|---------|----------|----------|
| Calendar | ✅ Calendar | ⭐ | - | - |
| RangeCalendar | ✅ RangeCalendar | ⭐ | - | - |
| DateField | ✅ DateField | ⭐ | - | - |
| TimeField | ✅ TimeField | ⭐ | - | - |
| DatePicker | ✅ DatePicker | ⭐ | - | - |
| DateRangePicker | ✅ DateRangePicker | ⭐ | - | - |

---

### 2.5 Collections

| S2 컴포넌트 | React Aria | xstudio | 제작 가능 | 조합 방법 |
|------------|------------|---------|----------|----------|
| Menu | ✅ Menu | ⭐ | - | - |
| ListBox | ✅ ListBox | ⭐ | - | - |
| GridList | ✅ GridList | ⭐ | - | - |
| Select | ✅ Select | ⭐ | - | - |
| ComboBox | ✅ ComboBox | ⭐ | - | - |
| Tabs | ✅ Tabs | ⭐ | - | - |
| TagGroup | ✅ TagGroup | ⭐ | - | - |
| Table | ✅ Table | ⭐ | - | - |
| TableView | ❌ | ⭐ Table | 🔧 | `Table` + 인라인 편집 확장 |
| Tree | ✅ Tree | ⭐ | - | - |
| TreeView | ❌ | ⭐ Tree | 🔧 | `Tree` (동일 기능) |
| Autocomplete | ✅ Autocomplete | ⭐ | - | - |
| SelectBoxGroup | ❌ | - | 🔧 | `ToggleButtonGroup` + Checkbox 스타일 |
| Card | ❌ | ⭐ | 🔧 | `<article>` + Heading + Content |
| CardView | ❌ | - | 🔧 | `GridList` + Card 조합 |

---

### 2.6 Overlays

| S2 컴포넌트 | React Aria | xstudio | 제작 가능 | 조합 방법 |
|------------|------------|---------|----------|----------|
| Dialog | ✅ Dialog | ⭐ | - | - |
| FullscreenDialog | ❌ | - | 🔧 | `Dialog` + fullscreen 스타일 |
| CustomDialog | ❌ | - | 🔧 | `Modal` + custom content |
| AlertDialog | ❌ | - | 🔧 | `Dialog` + 경고 스타일 variant |
| Modal | ✅ Modal | ⭐ | - | - |
| Popover | ✅ Popover | ⭐ | - | - |
| Tooltip | ✅ Tooltip | ⭐ | - | - |
| Toast | ✅ Toast | ⭐ | - | - |
| ContextualHelp | ❌ | - | 🔧 | `Popover` + 도움말 아이콘 트리거 |

---

### 2.7 Navigation & Layout

| S2 컴포넌트 | React Aria | xstudio | 제작 가능 | 조합 방법 |
|------------|------------|---------|----------|----------|
| Breadcrumbs | ✅ Breadcrumbs | ⭐ | - | - |
| Link | ✅ Link | ⭐ | - | - |
| Disclosure | ✅ Disclosure | ⭐ | - | - |
| DisclosureGroup | ✅ DisclosureGroup | ⭐ | - | - |
| Accordion | ❌ | ⭐ DisclosureGroup | 🔧 | `DisclosureGroup` (동일 기능) |
| Toolbar | ✅ Toolbar | ⭐ | - | - |

---

### 2.8 Status & Feedback

| S2 컴포넌트 | React Aria | xstudio | 제작 가능 | 조합 방법 |
|------------|------------|---------|----------|----------|
| ProgressBar | ✅ ProgressBar | ⭐ | - | - |
| Meter | ✅ Meter | ⭐ | - | - |
| Badge | ❌ | ⭐ | 🔧 | `<span>` + 스타일링 |
| Avatar | ❌ | - | 🔧 | `<div>` + 이미지/이니셜 스타일링 |
| StatusLight | ❌ | - | 🔧 | 커스텀 컴포넌트 (span + 색상) |
| InlineAlert | ❌ | - | 🔧 | 커스텀 컴포넌트 (div + 스타일) |
| NotificationBadge | ❌ | - | 🔧 | Badge + 위치 지정 스타일 |

---

### 2.9 Layout Utilities (S2 전용)

| S2 컴포넌트 | React Aria | xstudio | 제작 가능 | 조합 방법 |
|------------|------------|---------|----------|----------|
| Flex | ❌ | - | 🚫 | CSS `display: flex` 직접 사용 |
| Grid | ❌ | - | 🚫 | CSS `display: grid` 직접 사용 |
| View | ❌ | - | 🚫 | `<div>` wrapper 직접 사용 |
| Text | ❌ | - | 🚫 | `<span>`, `<p>` 직접 사용 |
| Heading | ✅ Heading | - | - | - |
| Content | ❌ | ⭐ | 🔧 | `<div>` 시맨틱 컨테이너 |
| Header | ❌ | - | 🔧 | `<header>` + Heading 조합 |
| Footer | ❌ | - | 🔧 | `<footer>` 시맨틱 요소 |
| Divider | ✅ Separator | ⭐ | - | React Aria `Separator` 사용 |
| Well | ❌ | - | 🔧 | 커스텀 컴포넌트 (div + 배경) |
| Provider | ❌ | - | 🚫 | S2 테마 전용 |
| Illustration | ❌ | - | 🚫 | SVG 일러스트 (디자인 에셋) |
| IllustratedMessage | ❌ | - | 🔧 | 커스텀 레이아웃 컴포넌트 |

---

## 3. 요약 통계

| 카테고리 | S2 컴포넌트 | React Aria 제공 | 조합 제작 가능 | 제작 불가 |
|---------|------------|----------------|--------------|----------|
| Buttons & Actions | 8 | 3 | 5 | 0 |
| Forms & Inputs | 13 | 10 | 3 | 0 |
| Color | 7 | 7 | 0 | 0 |
| Date & Time | 6 | 6 | 0 | 0 |
| Collections | 15 | 10 | 5 | 0 |
| Overlays | 9 | 5 | 4 | 0 |
| Navigation & Layout | 6 | 5 | 1 | 0 |
| Status & Feedback | 7 | 2 | 5 | 0 |
| Layout Utilities | 12 | 2 | 5 | 5 |
| **합계** | **83** | **50** | **28** | **5** |

### 비율 분석

- **React Aria 직접 제공**: 60% (50/83)
- **React Aria 조합 제작 가능**: 34% (28/83)
- **제작 불가 (CSS/디자인 전용)**: 6% (5/83)

---

## 4. 제작 불가 컴포넌트 (CSS/유틸리티 전용)

| 컴포넌트 | 이유 | 대안 |
|---------|-----|-----|
| Flex | CSS 유틸리티 | `display: flex` 직접 사용 |
| Grid | CSS 유틸리티 | `display: grid` 직접 사용 |
| View | div wrapper | `<div>` 직접 사용 |
| Text | 텍스트 wrapper | `<span>`, `<p>` 직접 사용 |
| Provider | S2 테마 전용 | xstudio 자체 ThemeProvider |
| Illustration | SVG 에셋 | 직접 SVG 아이콘 사용 |

---

## 5. Card 컴포넌트 제작 예시

Card/CardView는 React Aria에 직접 제공되지 않지만, GridList와 커스텀 컴포넌트 조합으로 구현 가능합니다.

```tsx
// CardView 대체 구현
import { GridList, GridListItem, Heading } from 'react-aria-components';

interface CardItem {
  id: string;
  title: string;
  description: string;
  image?: string;
}

function CardView({ items }: { items: CardItem[] }) {
  return (
    <GridList
      aria-label="Cards"
      selectionMode="multiple"
      className="card-grid"
    >
      {items.map(item => (
        <GridListItem key={item.id} className="card">
          <article aria-labelledby={`heading-${item.id}`}>
            {item.image && (
              <img src={item.image} alt="" className="card-image" />
            )}
            <Heading id={`heading-${item.id}`} slot="title">
              {item.title}
            </Heading>
            <p className="card-description">{item.description}</p>
          </article>
        </GridListItem>
      ))}
    </GridList>
  );
}
```

```css
/* Card 레이아웃 스타일 */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.card {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
```

---

## 6. 결론

### xstudio 프로젝트 권장 사항

1. **현재 React Aria Components 유지 권장**
   - 완전한 스타일링 자유도 (Material Design 3 적용 가능)
   - 작은 번들 크기
   - data-* 패턴으로 이미 Phase 4 전환 완료
   - SelectionIndicator 등 최신 기능 활용 중

2. **S2 전용 컴포넌트 대응**
   - 기능적 컴포넌트: **100% React Aria 조합으로 제작 가능**
   - 제작 불가 항목: CSS 유틸리티 또는 디자인 에셋뿐 (대안 존재)

3. **추가 구현 권장 컴포넌트**
   - Avatar (프로필 이미지/이니셜)
   - StatusLight (상태 표시)
   - InlineAlert (인라인 알림)
   - ContextualHelp (도움말 팝오버)

---

## 7. 참고 자료

- [React Aria Components v1.14.0](https://react-aria.adobe.com/releases/v1-14-0)
- [React Spectrum S2 v1.0.0](https://react-spectrum.adobe.com/releases/v1-0-0)
- [React Aria 공식 문서](https://react-aria.adobe.com/)
- [@react-spectrum/s2 npm](https://www.npmjs.com/package/@react-spectrum/s2)
- [CardView Issue #2083](https://github.com/adobe/react-spectrum/issues/2083)
- [Standard Card Issue #2080](https://github.com/adobe/react-spectrum/issues/2080)
