# WebGL Canvas Component Migration Status

> **Last Updated**: 2026-02-19
> **Branch**: claude/migrate-panel-components-webgl-96QYI

## Overview

This document tracks the migration progress of React Aria Components from the iframe preview system (`src/canvas/`) to the WebGL-based canvas system (`apps/builder/src/builder/workspace/canvas/ui/`).

⚠️ **검증 현황**: 실제 WebGL 캔버스에서 확인된 항목은 `Button`, `Checkbox`, `CheckboxGroup`, `RadioGroup`, `TextField`입니다. 아래 표의 나머지 항목들은 구현 여부가 미확인 상태이며, 화면 렌더링·동작 검증이 필요합니다.

### 최근 안정화 패치 (2026-02-06)

마이그레이션 자체와 별도로 런타임 안정화를 위한 패치가 반영되었습니다.

- Section `display:block/flex` 동작 분리 및 auto-height/padding 정합성 보정
- Selection 영역/라쏘 드래그 선택 좌표계(글로벌 vs 로컬) 불일치 수정
- `Cmd/Ctrl+V` 붙여넣기 중복 실행(2개 생성) 제거 — PropertiesPanel scope 정리
- Card/Box `width:100% + padding` overflow 수정 — BlockEngine border-box 해석 추가

### Architecture Comparison

| Aspect | iframe Preview | WebGL Canvas |
|--------|----------------|--------------|
| Location | `src/canvas/renderers/` | `apps/builder/src/builder/workspace/canvas/ui/` |
| Base | React Aria Components | @pixi/ui + Custom PixiJS |
| Rendering | DOM-based | WebGL Graphics |
| Component Prefix | None (direct RAC) | `Pixi*` |

---

## Migration Progress Summary

### Verified Stats (WebGL에서 렌더링 확인 완료)

| Category | Total | Verified | Pending | Progress |
|----------|-------|----------|---------|----------|
| **Basic UI** | 8 | 3 | 5 | 37.5% |
| **Form Controls** | 10 | 4 | 6 | 40.0% |
| **Selection/Collection** | 12 | 3 | 9 | 25.0% |
| **Layout Components** | 6 | 0 | 6 | 0.0% |
| **Date/Time** | 5 | 0 | 5 | 0.0% |
| **Navigation** | 4 | 0 | 4 | 0.0% |
| **Overlay/Modal** | 4 | 0 | 4 | 0.0% |
| **Data Display** | 5 | 1 | 4 | 20.0% |
| **Primitives** | 3 | 0 | 3 | 0.0% |
| **Total** | **57** | **11** | **46** | **19.3%** |

---

## Detailed Migration Status

### ✅ WebGL에서 확인 완료된 컴포넌트 (11)

| Category | React Aria | WebGL Implementation | Verification |
|----------|------------|---------------------|--------------|
| Basic UI | Button | `PixiButton.tsx` | 렌더링 및 동작 확인 완료 |
| Basic UI | Badge | `PixiBadge.tsx` | 렌더링, hitArea 클릭 확인 완료 (2025-12-18) |
| Basic UI | Switch | `PixiSwitch.tsx` | 렌더링, hitArea 클릭 확인 완료 (2025-12-18) |
| Form Controls | Checkbox | `PixiCheckbox.tsx` | 렌더링 및 동작 확인 완료 |
| Form Controls | TextField | `PixiTextField.tsx` | 렌더링, hitArea 클릭, 크기 동기화 확인 완료 (2025-12-18) |
| Form Controls | Input | `PixiInput.tsx` | 렌더링, hitArea 클릭 확인 완료 (2025-12-18) |
| Form Controls | ComboBox | `PixiComboBox.tsx` | 렌더링, hitArea 클릭, 드롭다운 확인 완료 (2025-12-18) |
| Selection/Collection | CheckboxGroup | `PixiCheckboxGroup.tsx` | 렌더링, hitArea 그룹 선택, orientation 확인 완료 (2025-12-18) |
| Selection/Collection | RadioGroup | `PixiRadio.tsx` | 렌더링, hitArea 그룹 선택, orientation 확인 완료 (2025-12-18) |
| Data Display | Card | `PixiCard.tsx` | 렌더링, hitArea 클릭 확인 완료 (2025-12-18) |

### ❔ 미확인 상태 (검증 필요)

#### 이전에 "완료"로 표기되었으나 실제 확인이 필요함
| Category | React Aria | WebGL Implementation(기록) | Status | Notes |
|----------|------------|----------------------------|--------|-------|
| Primitives | Box/Container | `BoxSprite.tsx` | 미확인 | 렌더링/기능 검증 필요 |
| Primitives | Text | `TextSprite.tsx` | 미확인 | 렌더링/기능 검증 필요 |
| Primitives | Image | `ImageSprite.tsx` | 미확인 | 렌더링/기능 검증 필요 |
| Basic UI | FancyButton | `PixiFancyButton.tsx` | 미확인 | Wrapper 동작 검증 필요 |
| Basic UI | ProgressBar | `PixiProgressBar.tsx` | 미확인 | 시각/상태 연동 검증 필요 |
| Basic UI | Slider | `PixiSlider.tsx` | 미확인 | 입력·핸들 이동 검증 필요 |
| Form Controls | Select | `PixiSelect.tsx` | 미확인 | 드롭다운 렌더 검증 필요 |
| Selection/Collection | CheckboxItem | `PixiCheckboxItem.tsx` | 미확인 | 그룹 내 히트 영역 검증 필요 |
| Selection/Collection | RadioItem | `PixiRadioItem.tsx` | 미확인 | 그룹 내 히트 영역 검증 필요 |
| Selection/Collection | List | `PixiList.tsx` | 미확인 | 가상 스크롤/선택 검증 필요 |
| Data Display | MaskedFrame | `PixiMaskedFrame.tsx` | 미확인 | 클리핑 렌더 검증 필요 |
| Containers | ScrollBox | `PixiScrollBox.tsx` | 미확인 | 스크롤 동작 검증 필요 |

### 🔄 Pending Migration or Verification (53 components)

#### Basic UI Components (1 remaining)
| Component | Priority | Complexity | Notes |
|-----------|----------|------------|-------|
| ToggleButton | ~~High~~ | ~~Medium~~ | ✅ 렌더링, 선택, 크기 동기화 확인 완료 (2026-02-04) |
| ToggleButtonGroup | ~~High~~ | ~~Medium~~ | ✅ container-only 패턴, 선택, width/height 스타일 적용 확인 완료 (2026-02-04). ⚠️ `indicator` prop 캔버스 미구현 — [구현 계획](../components/TOGGLEBUTTONGROUP.md#캔버스-selectionindicator-구현-계획) 참조 |
| Badge | Low | Low | Text with background |

#### Form Controls (7 remaining)
| Component | Priority | Complexity | Notes |
|-----------|----------|------------|-------|
| NumberField | High | Medium | Numeric input + stepper |
| SearchField | Medium | Medium | Input + clear button |
| ColorField | Low | High | Color picker integration |
| ColorPicker | Low | High | Complex color selection |
| ColorArea | Low | High | 2D color selection |
| ColorSlider | Low | High | Color channel slider |
| ColorWheel | Low | High | Circular color picker |

#### Selection/Collection (7 remaining)
| Component | Priority | Complexity | Notes |
|-----------|----------|------------|-------|
| ListBox | High | High | Item rendering, selection |
| ListBoxItem | High | Medium | Item template |
| GridList | High | High | Grid layout |
| GridListItem | High | Medium | Grid item |
| ComboBox | Medium | High | Input + dropdown |
| ComboBoxItem | Medium | Medium | Item template |
| Menu | Medium | High | Context menu |

#### Layout Components (6 remaining)
| Component | Priority | Complexity | Notes |
|-----------|----------|------------|-------|
| Tabs | High | High | Tab + Panel coordination |
| Tab | High | Medium | Tab button |
| Panel | High | Medium | Content panel |
| Tree | Medium | High | Hierarchical structure |
| TreeItem | Medium | High | Expandable node |
| Table | Low | Very High | Complex grid system |

#### Date/Time Components (5 remaining)
| Component | Priority | Complexity | Notes |
|-----------|----------|------------|-------|
| Calendar | Low | Very High | Grid + navigation |
| DatePicker | Low | Very High | Calendar + input |
| DateRangePicker | Low | Very High | Dual calendar |
| DateField | Low | High | Segmented date input |
| TimeField | Low | High | Segmented time input |

#### Navigation Components (4 remaining)
| Component | Priority | Complexity | Notes |
|-----------|----------|------------|-------|
| Breadcrumbs | Medium | Medium | Link chain |
| Breadcrumb | Medium | Low | Single item |
| Link | Low | Low | Clickable text |
| Toolbar | Low | Medium | Action bar |

#### Overlay/Modal Components (4 remaining)
| Component | Priority | Complexity | Notes |
|-----------|----------|------------|-------|
| Dialog | Low | High | Modal dialog |
| Modal | Low | High | Modal container |
| Popover | Low | High | Positioned overlay |
| Tooltip | Low | Medium | Hover info |

#### Data Display Components (4 remaining)
| Component | Priority | Complexity | Notes |
|-----------|----------|------------|-------|
| Meter | Medium | Medium | Value indicator |
| Card | Low | Low | Container with style |
| Separator | Low | Low | Line divider |
| TagGroup/Tag | Low | Medium | Tag collection |

---

## Migration Priority Roadmap

### Phase 1: Core Collection Components (Priority: High)
**Goal**: Enable data-driven lists and selection

1. `PixiListBox` + `PixiListBoxItem`
2. `PixiGridList` + `PixiGridListItem`
3. `PixiToggleButton` + `PixiToggleButtonGroup`
4. `PixiComboBox` + `PixiComboBoxItem`

### Phase 2: Layout Components (Priority: High)
**Goal**: Enable complex layouts

1. `PixiTabs` + `PixiTab` + `PixiPanel`
2. `PixiTree` + `PixiTreeItem`
3. `PixiMenu` + `PixiMenuItem`

### Phase 3: Form Enhancements (Priority: Medium)
**Goal**: Complete form control set

1. `PixiNumberField`
2. `PixiSearchField`
3. `PixiMeter`

### Phase 4: Navigation (Priority: Medium)
**Goal**: Enable page navigation UI

1. `PixiBreadcrumbs` + `PixiBreadcrumb`
2. `PixiLink`
3. `PixiToolbar`

### Phase 5: Advanced Components (Priority: Low)
**Goal**: Full feature parity

1. Date/Time components
2. Color components
3. Overlay components

---

## Implementation Patterns

> 아래 예시는 기존 기록을 유지한 것이며, 실제 적용 여부는 각 컴포넌트 검증 이후 재확인해야 합니다.

### Standard Component Structure

```tsx
// apps/builder/src/builder/workspace/canvas/ui/PixiComponent.tsx

import { memo, useRef, useEffect, useCallback } from 'react';
import { Container } from 'pixi.js';
import type { Element } from '../../../../types/core/store.types';
import { useExtend, extend } from '@pixi/react';
import { PIXI_COMPONENTS } from '../pixiSetup';
import { parseStyleValue } from '../sprites/styleConverter';

export interface PixiComponentProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
  onChange?: (elementId: string, value: unknown) => void;
}

export const PixiComponent = memo(function PixiComponent({
  element,
  isSelected,
  onClick,
  onChange,
}: PixiComponentProps) {
  useExtend(PIXI_COMPONENTS);
  const containerRef = useRef<Container>(null);

  // Extract styles
  const style = (element.props?.style || {}) as Record<string, unknown>;
  const width = parseStyleValue(style.width, 200);
  const height = parseStyleValue(style.height, 40);

  // Event handlers
  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  // Render using @pixi/ui or custom Graphics
  return (
    <pixiContainer
      ref={containerRef}
      x={x}
      y={y}
      eventMode="static"
      onPointerDown={handleClick}
    >
      {/* Component-specific rendering */}
    </pixiContainer>
  );
});
```

### Key Considerations

1. **Use Imperative API for @pixi/ui**: Components like FancyButton, Slider require imperative instantiation
2. **Style Conversion**: Use `styleConverter.ts` for CSS → PixiJS value mapping
3. **Event Handling**: Use `eventMode="static"` and `onPointerDown`/`onPointerUp`
4. **State Sync**: Consider Zustand integration for complex state

### Phase 19: hitArea Pattern (CRITICAL)

**Problem**: `pixiContainer` alone doesn't receive click events. Components must have explicit hitArea for selection.

**Solution**: Add transparent `pixiGraphics` with `alpha: 0` as hitArea, rendered LAST in container.

```tsx
// 🚀 Phase 19: 전체 크기 계산 (hitArea용)
const totalWidth = sizePreset.inputWidth;
const totalHeight = labelHeight + inputHeight;

// 🚀 Phase 19: 투명 히트 영역
const drawHitArea = useCallback(
  (g: PixiGraphics) => {
    g.clear();
    g.rect(0, 0, totalWidth, totalHeight);
    g.fill({ color: 0xffffff, alpha: 0 });
  },
  [totalWidth, totalHeight]
);

return (
  <pixiContainer x={posX} y={posY}>
    {/* Visible content rendered FIRST */}
    <pixiGraphics draw={drawBackground} />
    <pixiText text={label} style={labelStyle} x={0} y={0} />

    {/* 🚀 Phase 19: hitArea - 마지막에 렌더링하여 최상단 배치 */}
    <pixiGraphics
      draw={drawHitArea}
      eventMode="static"
      cursor="pointer"
      onPointerDown={handleClick}
    />
  </pixiContainer>
);
```

**Key Rules:**
1. **hitArea must be rendered LAST** - PixiJS z-order: later children render on top
2. **Use `alpha: 0`** - Invisible but still captures events
3. **Cover entire clickable area** - Calculate totalWidth/totalHeight including all child elements
4. **Remove events from other elements** - Only hitArea should handle clicks to avoid conflicts

**Components with hitArea Pattern (9):**
- `PixiInput.tsx`, `PixiTextField.tsx` - Form inputs
- `PixiRadio.tsx`, `PixiCheckboxGroup.tsx` - Group selection
- `PixiSwitch.tsx` - Toggle switch
- `PixiBadge.tsx`, `PixiCard.tsx`, `PixiComboBox.tsx` - Data display
- `PixiToggleButtonGroup.tsx` - Container-only 패턴 (pixiGraphics 직접 반환, LayoutComputedSizeContext 사용)

**React Key Pattern:**
```tsx
// ❌ WRONG - Duplicate keys when values repeat
{options.map((option) => (
  <RadioItem key={option.value} ... />
))}

// ✅ CORRECT - Always unique with index
{options.map((option, index) => (
  <RadioItem key={`${option.value}-${index}`} ... />
))}
```

---

## Files Reference

> 아래 목록은 기록된 구현 경로이며, 실제 사용 여부는 "검증 필요" 섹션을 참고하세요.

### Recorded WebGL Components
```
apps/builder/src/builder/workspace/canvas/ui/
├── index.ts                # Module exports
├── PixiButton.tsx          # Basic button
├── PixiFancyButton.tsx     # Enhanced button
├── PixiCheckbox.tsx        # Standalone checkbox
├── PixiCheckboxGroup.tsx   # Checkbox container
├── PixiCheckboxItem.tsx    # Checkbox in group
├── PixiRadio.tsx           # RadioGroup
├── PixiRadioItem.tsx       # Radio in group
├── PixiSlider.tsx          # Range slider
├── PixiInput.tsx           # Text input
├── PixiTextField.tsx       # Text field with label/description ✅
├── PixiSelect.tsx          # Dropdown select
├── PixiProgressBar.tsx     # Progress indicator
├── PixiSwitcher.tsx        # Toggle switch
├── PixiScrollBox.tsx       # Scroll container
├── PixiList.tsx            # Virtual list
└── PixiMaskedFrame.tsx     # Clipped image
```

### Core Sprites
```
apps/builder/src/builder/workspace/canvas/sprites/
├── ElementSprite.tsx       # Type router/dispatcher
├── BoxSprite.tsx           # Container rendering
├── TextSprite.tsx          # Text rendering
├── ImageSprite.tsx         # Image rendering
├── styleConverter.ts       # CSS → PixiJS conversion
└── paddingUtils.ts         # Padding utilities
```

### Layout System
```
apps/builder/src/builder/workspace/canvas/layout/
├── LayoutEngine.ts         # Yoga v3 Flexbox
└── GridLayout.tsx          # CSS Grid manual
```

---

## Component Indicator 캔버스 구현 현황

> **작성일**: 2026-02-19

일부 컴포넌트는 `indicator` (SelectionIndicator, 토글 dot 등) 시각 피드백을 포함한다. CSS 웹과 캔버스 간 구현 정합성 추적.

| 컴포넌트 | Indicator 타입 | CSS 웹 | 캔버스 | 비고 |
|----------|---------------|--------|--------|------|
| **Tabs** | 선택 bar (2-4px) | ✅ `SelectionIndicator` | ✅ `PixiTabs.tsx` `drawIndicator()` | 구현 완료 |
| **Switch** | 토글 dot + 트랙 | ✅ `.indicator` + `:before` | ✅ Spec shapes | 구현 완료 |
| **Checkbox** | 체크마크 | ✅ `::before` pseudo | ✅ Spec line shapes | 구현 완료 |
| **Radio** | 내부 dot | ✅ `::after` pseudo | ✅ Spec circle shapes | 구현 완료 |
| **Badge** | Dot 모드 | ✅ `[data-dot]` | ✅ Spec shapes | 구현 완료 |
| **ToggleButtonGroup** | 배경 하이라이트 슬라이드 | ✅ `SelectionIndicator` | ❌ **미구현** | [구현 계획](../components/TOGGLEBUTTONGROUP.md#캔버스-selectionindicator-구현-계획) |

### 공통 제약

- **애니메이션 미지원**: 캔버스는 정적 렌더링 (`ENGINE_CHECKLIST.md` §13: Transitions/Animations ❌)
- CSS `transition` 기반 슬라이드/페이드 효과는 캔버스에서 재현하지 않음
- 디자인 도구 특성상 정적 indicator 위치 표시로 충분

---

## CSS 웹 ↔ 캔버스 정합성 분석 (2026-02-19)

> 전체 정합성: **62%** (66개 컴포넌트 가중 평균)
> 목표: **~92%** (렌더링 정밀도 Quick Win + Medium 개선 포함)
> 상세 로드맵: [ENGINE_CHECKLIST.md § 컴포넌트 수준 정합성 로드맵](../../ENGINE_CHECKLIST.md#컴포넌트-수준-정합성-로드맵-css-웹--캔버스)

### 주요 결정사항

| # | 결정 | 근거 |
|---|------|------|
| 1 | **애니메이션은 최후순위** (Phase Z) | CSS transition/keyframe 인프라 부재. 정적 디자인 도구 특성상 우선순위 낮음 |
| 2 | **상태 표현은 CSS 웹 방식 준수** | Spec에 `state: ComponentState` 파라미터 이미 존재. ElementSprite `'default'` 하드코딩만 해제하면 됨 |
| 3 | **아이콘은 Icon Font 방식 도입** (Pencil 참조) | CanvasKit ParagraphBuilder로 codepoint 렌더링. SVG 변환 불필요, 추가 번들 최소화 |
| 4 | **FancyButton 제거** | Button의 엄밀한 부분집합 (variants 4/8, sizes 3/5). 참조 0건. gradient 필요 시 Button variant 추가 |
| 5 | **ScrollBox는 CSS overflow 문제** | 별도 컴포넌트 불필요. 클리핑+오프셋+store 인프라 존재, 스크롤바 UI + 이벤트만 추가 |

### 정합성 갭 원인

| 원인 | 영향도 | 해결 Phase |
|------|--------|-----------|
| 컬렉션 아이템 미렌더링 | -8.2% | Phase C |
| 상태 시각화 부재 (hover/focus/pressed) | -6.8% | Phase A |
| 아이콘 미렌더링 | -5.5% | Phase B |
| 애니메이션 인프라 부재 | -4.0% | Phase Z (최후) |
| 그라디언트/복합 렌더링 (Color 계열) | -3.5% | Phase G |
| 오버레이 아키텍처 부재 | -3.0% | Phase F |

### 렌더링 정밀도 추가 개선 (Quick Win + Medium)

> 상세: [ENGINE_CHECKLIST.md §15 렌더링 정밀도 개선](../../ENGINE_CHECKLIST.md)

specShapeConverter / nodeRenderers 레벨 수정으로 **전 66개 컴포넌트**에 일괄 적용.

| 구분 | 항목 | 예상 효과 | 난이도 |
|------|------|-----------|--------|
| **QW-1** | border-style 패스스루 (dashed/dotted/double) | +1-2% | ~1시간 |
| **QW-2** | disabled 상태 opacity 일괄 적용 | +2-4% | ~2시간 |
| **QW-3** | focus ring (outline) 렌더링 | +3-5% | ~4시간 |
| **M-1** | 다중 레이어 box-shadow (M3 elevation) | +5-8% | 1-2일 |
| **M-2** | box-shadow spread 파라미터 | +2-3% | 4-8시간 |
| **M-3** | image shape 렌더링 (aspectRatio, objectFit) | +3-5% | 1-2일 |
| **M-4** | CSS 변수 캐시 레이어 (theme 전환 정합성) | +2-3% | 1일 |
| **M-5** | 상태별 스타일 일관성 (hover/active/focus 전환) | +2% | 4-8시간 |
| **M-6** | partial border (border-top/right/bottom/left) | +1% | 4-8시간 |

**예상 도달 시나리오**:
- 현재: **62%** → QW 완료: **~70%** → Phase A~G: **~88%** → M 완료: **~92%**

---

## Notes

- Migration uses `@pixi/ui` v2.3.2 components where applicable
- Yoga v3.2.1 handles Flexbox layout calculations
- Focus on high-priority components that enable basic builder functionality first
- Complex components (Date/Time, Color) can be deferred as they're less commonly used in initial builds
