# React Aria Components - WebGL 마이그레이션 대응 전략

> **작성일**: 2026-02-25 (검증 완료: 2026-02-25)
> **최종 업데이트**: 2026-02-25 — Phase 0 + Phase 1 구현 완료, **Compositional Architecture 전환 완료**
> **목적**: React Aria Components DOM 구조 분석 및 XStudio WebGL 컴포넌트 마이그레이션 전략
> **범위**: 71개 Spec 컴포넌트 vs React Aria Components 50개 공식 DOM 구조

---

## 목차

1. [개요](#1-개요)
2. [React Aria DOM 구조 레퍼런스](#2-react-aria-dom-구조-레퍼런스)
3. [현재 XStudio 지원 현황](#3-현재-xstudio-지원-현황)
   - 3.1~3.6: CSS / Property Editor / Style Panel / Spec shapes / Skia / 5축 매트릭스
   - [3.7 컴포넌트 합성 아키텍처](#37-컴포넌트-합성-아키텍처)
   - [3.8 Factory 구조 감사 결과](#38-factory-구조-감사-결과)
4. [실제 Gap 분석](#4-실제-gap-분석)
   - 4.1 Gap A: Canvas 실시간 상태 전파 — ✅ Phase 1 완료
   - 4.2 Gap B: Overlay 컴포넌트 Canvas 레이어 (High)
   - 4.3 Gap C: Compound Component 중첩 (Low)
   - 4.4 Gap D: Factory 구조 정합성 — ✅ Phase 0 완료
5. [마이그레이션 로드맵](#5-마이그레이션-로드맵) — Phase 0~1 완료, Phase 2~3 미착수
6. [공통 패턴 가이드](#6-공통-패턴-가이드)
7. [부록: ARIA Role 매핑 총표](#부록-react-aria-aria-role-매핑-총표)

---

## 1. 개요

### 1.1 삼중 레이어 아키텍처

XStudio는 React Aria Components를 WebGL로 마이그레이션하면서 **삼중 레이어 아키텍처**를 사용합니다:

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 1: Preview CSS (iframe)                    완성도: 100%  │
│  ─────────────────────────────────────                          │
│  88개 CSS 파일 + data-* 속성 + color-mix()                      │
│  React Aria 네이티브 DOM 렌더링 → 완벽한 시각적 피드백             │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Spec shapes (Canvas 정적)               완성도: ~90%  │
│  ─────────────────────────────────────                          │
│  shapes(props, variant, size, state) → Shape[] → SkiaNodeData   │
│  19/71개 state 완전 활용, 22개 명시적 무시, 30개 수신만            │
├─────────────────────────────────────────────────────────────────┤
│  Layer 3: Canvas 실시간 (인터랙션)                 완성도: ~60%  │
│  ─────────────────────────────────────                          │
│  previewComponentStateAtom → ElementSprite → shapes() 재호출     │
│  ⚠️ Canvas 마우스 이벤트 미연결, Overlay 레이어 미구현             │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 핵심 결론

**인프라는 완성되어 있고, 연결만 필요합니다.**

| 영역 | 상태 | 근거 |
|------|------|------|
| CSS 아키텍처 | ✅ 완성 | 88개 CSS 파일, data-* 완전 활용 |
| Property Editor | ✅ 완성 | 100+ Custom Editor, React Aria props 제어 |
| Style Panel | ✅ 완성 | 4개 섹션, Element.props.style override |
| Spec shapes 정적 | ✅ 대부분 완성 | 71개 spec, variant/size/props 반영 |
| Spec shapes 동적 | ⚠️ 부분 완성 | 19/71개만 state 파라미터 실제 활용 |
| Skia 파이프라인 | ✅ 완성 | ComponentState → shapes() → SkiaNodeData → renderFrame() |
| Canvas 이벤트 연결 | ✅ **완료 (Phase 1)** | selectAtom + pointerover/down/up/leave 핸들러 연결 |
| Overlay 레이어 | ❌ 미완성 | spec.overlay 정의됨, Canvas에서 미사용 |
| 합성 아키텍처 | ✅ **Compositional 전환 완료** | Monolithic Spec → Child Spec 독립 렌더링 (7개 child spec 추가) |
| Factory 구조 정합성 | ✅ **완료 (Phase 0)** | Tabs(TabList), Table(TableBody), NumberField(Group) 래퍼 추가 |

### 1.3 Skia 렌더링 파이프라인

```
사용자 인터랙션 (hover/press/select)
  │
  ▼
previewComponentStateAtom (Jotai atom)
  │  ⚠️ 현재: StylesPanel 드롭다운만 쓰기 가능
  │     필요: Canvas pointerover/down/up 이벤트 연결
  ▼
ElementSprite.tsx (L687: useAtomValue)
  │  componentState 결정:
  │    1. previewState (우선)
  │    2. isDisabled prop → 'disabled'
  │    3. 기본값 → 'default'
  ▼
spec.render.shapes(props, variant, size, componentState)
  │  → Shape[] 반환 (ContainerShape로 중첩 가능)
  ▼
specShapesToSkia(shapes, theme, width, height)
  │  2-pass 변환:
  │    Pass 1: geometry + targetless shadow/border
  │    Pass 2: deferred shadow/border (target reference)
  │  ContainerShape → 재귀 호출 (L579-590)
  ▼
SkiaNodeData (children?: SkiaNodeData[] → 트리 구조)
  │  타입: box, text, image, container, line, icon_path, partial_border
  ▼
useSkiaNode() → registerSkiaNode → registryVersion++
  ▼
renderFrame() (CanvasKit/Skia WASM)
  │  캐싱: idle <0.1ms, camera-only ~1ms, content ~5-20ms
```

---

## 2. React Aria DOM 구조 레퍼런스

### 2.1 Form/Input 컴포넌트

#### Button

```html
<button class="react-aria-Button"
  data-hovered data-pressed data-focused data-focus-visible data-disabled data-pending>
  {children}
</button>
```

| 속성 | data-* | Render Props |
|------|--------|-------------|
| 루트 | `<button>` | `isHovered, isPressed, isFocused, isFocusVisible, isDisabled, isPending` |

#### ToggleButton

```html
<button class="react-aria-ToggleButton"
  data-selected data-hovered data-pressed data-focused data-focus-visible data-disabled>
  {children}
</button>
```

| 속성 | data-* | Render Props |
|------|--------|-------------|
| 루트 | `<button>` | Button + `isSelected` (isPending 제외) |

#### TextField

```html
<div class="react-aria-TextField" data-disabled data-invalid data-readonly data-required>
  <label class="react-aria-Label">...</label>
  <input class="react-aria-Input" data-hovered data-focused data-focus-visible data-disabled data-invalid />
  <div slot="description">...</div>
  <div class="react-aria-FieldError">...</div>
</div>
```

| 하위 컴포넌트 | HTML | data-* 속성 |
|-------------|------|------------|
| TextField (root) | `<div>` | disabled, invalid, readonly, required |
| Label | `<label>` | - |
| Input | `<input>` | hovered, focused, focus-visible, disabled, invalid |
| Text (description) | `<div>` | - |
| FieldError | `<div>` | - |

#### NumberField

```html
<div class="react-aria-NumberField" data-disabled data-invalid data-required>
  <label class="react-aria-Label">...</label>
  <div class="react-aria-Group" role="group" data-hovered data-focus-within data-focus-visible data-disabled data-invalid>
    <button slot="decrement">-</button>
    <input class="react-aria-Input" />
    <button slot="increment">+</button>
  </div>
  <div class="react-aria-FieldError">...</div>
</div>
```

| 하위 컴포넌트 | HTML | 특징 |
|-------------|------|------|
| Group | `<div role="group">` | Input + 증감 Button을 감싸는 컨테이너 |
| Button (decrement) | `<button slot="decrement">` | 감소 버튼 |
| Button (increment) | `<button slot="increment">` | 증가 버튼 |

#### SearchField

```html
<div class="react-aria-SearchField" data-empty data-disabled data-invalid data-readonly data-required>
  <label class="react-aria-Label">...</label>
  <input class="react-aria-Input" type="search" />
  <button class="react-aria-Button">X (clear)</button>
  <div class="react-aria-FieldError">...</div>
</div>
```

| 고유 속성 | 설명 |
|----------|------|
| `data-empty` | 값이 비어있을 때 |
| Clear Button | 값이 있을 때 표시되는 초기화 버튼 |

#### Checkbox

```html
<label class="react-aria-Checkbox"
  data-selected data-indeterminate data-hovered data-pressed data-focused
  data-focus-visible data-disabled data-readonly data-invalid data-required>
  <input type="hidden" />
  <div class="indicator"><svg>...</svg></div>
  {children (label text)}
</label>
```

| 특징 | 설명 |
|------|------|
| 루트가 `<label>` | 클릭 영역 확대 |
| `data-indeterminate` | 불확정 상태 (3-state) |
| hidden input | 폼 제출용 |

#### CheckboxGroup

```html
<div class="react-aria-CheckboxGroup" data-disabled data-readonly data-required data-invalid>
  <label class="react-aria-Label">...</label>
  <label class="react-aria-Checkbox">...</label>
  <label class="react-aria-Checkbox">...</label>
  <div class="react-aria-FieldError">...</div>
</div>
```

#### RadioGroup + Radio

```html
<div class="react-aria-RadioGroup" data-orientation data-disabled data-readonly data-required data-invalid>
  <label class="react-aria-Label">...</label>
  <label class="react-aria-Radio"
    data-selected data-hovered data-pressed data-focused data-focus-visible
    data-disabled data-readonly data-invalid data-required>
    <input type="radio" hidden />
    <div class="indicator">...</div>
    {children}
  </label>
</div>
```

| 고유 속성 | 설명 |
|----------|------|
| `data-orientation` | "horizontal" 또는 "vertical" |
| Radio 루트가 `<label>` | Checkbox와 동일 패턴 |

#### Switch

```html
<label class="react-aria-Switch"
  data-selected data-hovered data-pressed data-focused data-focus-visible
  data-disabled data-readonly>
  <input type="hidden" />
  <div class="indicator">{track + thumb}</div>
  {children (label text)}
</label>
```

#### Slider

```html
<div class="react-aria-Slider" data-orientation data-disabled>
  <label class="react-aria-Label">...</label>
  <output class="react-aria-SliderOutput">50</output>
  <div class="react-aria-SliderTrack" data-hovered data-disabled data-orientation>
    <div class="react-aria-SliderThumb" data-dragging data-hovered data-focused data-focus-visible data-disabled>
      <input type="hidden" />
    </div>
  </div>
</div>
```

| 하위 컴포넌트 | HTML | data-* 속성 |
|-------------|------|------------|
| Label | `<label>` | - |
| SliderOutput | `<output>` | - |
| SliderTrack | `<div>` | hovered, disabled, orientation |
| SliderThumb | `<div>` | dragging, hovered, focused, focus-visible, disabled |

#### Form

```html
<form class="react-aria-Form">
  {children}
</form>
```

### 2.2 Selection/Collection 컴포넌트

#### Select

```html
<div class="react-aria-Select">
  <label>...</label>
  <button>
    <span class="react-aria-SelectValue" data-placeholder>선택된 값</span>
    <span aria-hidden="true">▼</span>
  </button>
  <!-- Popover (portal) -->
  <div class="react-aria-Popover" data-trigger="Select">
    <div role="listbox">
      <div role="option" data-selected data-focused data-disabled data-hovered data-focus-visible>항목</div>
      <section role="presentation">
        <div role="presentation">Header</div>
        <div role="option">항목</div>
      </section>
    </div>
  </div>
</div>
```

| 하위 컴포넌트 | HTML | 역할 |
|-------------|------|------|
| SelectValue | `<span>` | 선택된 값 표시 |
| Popover | `<div>` | 드롭다운 오버레이 |
| ListBox | `<div role="listbox">` | 옵션 목록 |
| ListBoxItem | `<div role="option">` | 개별 옵션 |
| ListBoxSection | `<section>` | 섹션 그룹 |

#### ComboBox

```html
<div class="react-aria-ComboBox" data-open data-disabled>
  <label>...</label>
  <div>
    <input role="combobox" aria-expanded aria-autocomplete aria-activedescendant />
    <button>▼</button>
  </div>
  <div class="react-aria-Popover" data-trigger="ComboBox">
    <div role="listbox">
      <div role="option">항목</div>
    </div>
  </div>
</div>
```

#### ListBox

```html
<div role="listbox" class="react-aria-ListBox" data-focus-visible data-empty data-layout data-orientation>
  <div role="option" data-selected data-focused data-focus-visible data-hovered data-pressed data-disabled data-dragging data-drop-target>
    <span slot="label">레이블</span>
    <span slot="description">설명</span>
  </div>
  <section role="presentation">
    <div role="presentation">섹션 헤더</div>
    <div role="option">항목</div>
  </section>
</div>
```

#### Menu

```html
<div role="menu" class="react-aria-Menu" data-empty>
  <div role="menuitem" data-focused data-hovered data-pressed data-disabled data-open data-selected data-selection-mode>
    <span slot="label">메뉴 항목</span>
    <kbd class="react-aria-Keyboard">⌘C</kbd>
  </div>
  <hr class="react-aria-Separator" />
  <section class="react-aria-MenuSection">
    <header>섹션 제목</header>
    <div role="menuitemcheckbox">체크 항목</div>
  </section>
</div>
```

| ARIA role 변형 | 조건 |
|--------------|------|
| `menuitem` | 기본 (선택 모드 없음) |
| `menuitemcheckbox` | selectionMode="multiple" |
| `menuitemradio` | selectionMode="single" |

#### Tabs

```html
<div class="react-aria-Tabs" data-orientation="horizontal">
  <div role="tablist" data-orientation="horizontal">
    <div role="tab" data-selected data-hovered data-focus-visible data-disabled>탭 1</div>
    <div role="tab">탭 2</div>
  </div>
  <div role="tabpanel" data-focus-visible data-entering data-exiting>
    탭 콘텐츠
  </div>
</div>
```

#### TagGroup

```html
<div class="react-aria-TagGroup">
  <label>태그</label>
  <div class="react-aria-TagList">
    <div class="react-aria-Tag" data-selected data-focused data-focus-visible data-hovered data-pressed data-disabled>
      태그 텍스트
      <button slot="remove">✕</button>
    </div>
  </div>
</div>
```

#### GridList

```html
<div role="grid" class="react-aria-GridList" data-layout data-focus-visible data-empty data-drop-target>
  <div role="row" data-selected data-focus-visible data-pressed data-disabled data-dragging data-drop-target>
    <div role="gridcell">
      <input type="checkbox" slot="selection" />
      항목 텍스트
    </div>
  </div>
</div>
```

#### Table

```html
<table class="react-aria-Table">
  <thead>
    <tr>
      <th data-pressed data-sort-direction data-focus-visible>
        컬럼명
        <div class="react-aria-ColumnResizer" data-resizable-direction data-resizing />
      </th>
    </tr>
  </thead>
  <tbody data-empty data-drop-target>
    <tr data-selected data-focus-visible data-pressed data-disabled data-dragging data-drop-target>
      <td data-focus-visible>셀 값</td>
    </tr>
  </tbody>
</table>
```

#### Tree

```html
<div role="treegrid" class="react-aria-Tree" data-focus-visible data-empty data-drop-target>
  <div role="row" data-expanded data-has-child-items data-selected data-focus-visible data-pressed data-disabled>
    <div role="gridcell">
      <button slot="chevron">▶</button>
      <input type="checkbox" slot="selection" />
      노드 이름
    </div>
  </div>
</div>
```

| 고유 속성 | 설명 |
|----------|------|
| `data-expanded` | 자식 펼침 상태 |
| `data-has-child-items` | 자식 노드 보유 |
| `--tree-item-level` | CSS custom property (중첩 깊이) |

#### Breadcrumbs

```html
<ol class="react-aria-Breadcrumbs">
  <li class="react-aria-Breadcrumb">
    <a class="react-aria-Link" data-current data-hovered data-focus-visible data-disabled>
      현재 페이지
    </a>
  </li>
</ol>
```

#### Toolbar

```html
<div role="toolbar" class="react-aria-Toolbar" data-orientation aria-label="도구모음">
  <div role="group">{controls}</div>
  <hr class="react-aria-Separator" />
</div>
```

### 2.3 Overlay 컴포넌트

#### Dialog

```html
<div role="dialog" class="react-aria-Dialog">
  <h2 slot="title">제목</h2>
  {content}
  <button slot="close">닫기</button>
</div>
```

| Render Props | `{close}` 함수 |
|-------------|---------------|

#### Popover

```html
<div class="react-aria-Popover" data-placement data-entering data-exiting data-trigger>
  <div class="react-aria-OverlayArrow"><svg /></div>
  {content}
</div>
```

| CSS Custom Properties | 설명 |
|----------------------|------|
| `--trigger-anchor-point` | 트리거 앵커 포인트 |
| `--trigger-width` | 트리거 너비 |

#### Tooltip

```html
<div class="react-aria-Tooltip" data-placement data-entering data-exiting>
  <div class="react-aria-OverlayArrow" />
  {content}
</div>
```

#### Modal / ModalOverlay

```html
<div class="react-aria-ModalOverlay" data-entering data-exiting>
  <div class="react-aria-Modal" data-entering data-exiting>
    {Dialog content}
  </div>
</div>
```

### 2.4 Date/Time 컴포넌트

#### DateField / TimeField

```html
<div class="react-aria-DateField">
  <label class="react-aria-Label">...</label>
  <div class="react-aria-DateInput" data-focus-within data-invalid>
    <div class="react-aria-DateSegment" data-type="year" data-placeholder data-readonly data-focused>2024</div>
    <div class="react-aria-DateSegment" data-type="literal">/</div>
    <div class="react-aria-DateSegment" data-type="month">01</div>
    <div class="react-aria-DateSegment" data-type="literal">/</div>
    <div class="react-aria-DateSegment" data-type="day">15</div>
  </div>
  <div class="react-aria-FieldError">...</div>
</div>
```

| DateSegment data-type | 값 |
|----------------------|---|
| `year`, `month`, `day` | 날짜 세그먼트 |
| `hour`, `minute`, `second` | 시간 세그먼트 |
| `dayPeriod` | AM/PM |
| `literal` | 구분자 (/, :, 등) |

#### DatePicker

```html
<div class="react-aria-DatePicker">
  <label />
  <div class="react-aria-Group">
    <div class="react-aria-DateInput">{segments}</div>
    <button>📅</button>
  </div>
  <div class="react-aria-Popover" data-trigger="DatePicker">
    <div class="react-aria-Dialog">
      <div class="react-aria-Calendar">
        <header>
          <button slot="previous" />
          <h2 class="react-aria-Heading" />
          <button slot="next" />
        </header>
        <table class="react-aria-CalendarGrid">
          <thead><tr><th>요일</th></tr></thead>
          <tbody><tr>
            <td class="react-aria-CalendarCell"
              data-selected data-outside-month data-pressed data-focus-visible
              data-disabled data-unavailable data-invalid>15</td>
          </tr></tbody>
        </table>
      </div>
    </div>
  </div>
</div>
```

#### DateRangePicker

```html
<div class="react-aria-DateRangePicker">
  <label />
  <div class="react-aria-Group">
    <div class="react-aria-DateInput" slot="start">{segments}</div>
    <span aria-hidden="true"> -- </span>
    <div class="react-aria-DateInput" slot="end">{segments}</div>
    <button />
  </div>
  <!-- RangeCalendar with data-selection-start, data-selection-end -->
</div>
```

#### Calendar / RangeCalendar

```html
<div class="react-aria-Calendar">
  <header>
    <button slot="previous">◀</button>
    <h2 class="react-aria-Heading">January 2024</h2>
    <button slot="next">▶</button>
  </header>
  <table class="react-aria-CalendarGrid" role="grid">
    <thead class="react-aria-CalendarGridHeader">
      <tr><th class="react-aria-CalendarHeaderCell">Sun</th>...</tr>
    </thead>
    <tbody class="react-aria-CalendarGridBody">
      <tr><td class="react-aria-CalendarCell" data-selected data-outside-month>1</td>...</tr>
    </tbody>
  </table>
</div>
```

| RangeCalendar 추가 data-* | 설명 |
|--------------------------|------|
| `data-selection-start` | 범위 시작 날짜 |
| `data-selection-end` | 범위 끝 날짜 |

### 2.5 Color 컴포넌트

#### ColorField

```html
<div class="react-aria-ColorField">
  <label />
  <input class="react-aria-Input" data-focused data-invalid data-disabled />
  <div class="react-aria-FieldError">...</div>
</div>
```

#### ColorPicker (Provider만, 자체 DOM 없음)

```tsx
<ColorPicker value={color} onChange={setColor}>
  <ColorArea /><ColorSlider /><ColorField />
</ColorPicker>
```

#### ColorArea

```html
<div class="react-aria-ColorArea" data-disabled>
  <!-- 2D 그래디언트 배경 -->
  <div class="react-aria-ColorThumb" data-dragging data-focused data-focus-visible data-disabled />
  <input type="hidden" /><input type="hidden" />
</div>
```

| ARIA | `aria-roledescription="2D Slider"`, `aria-valuetext` (색상 설명) |

#### ColorSlider

```html
<div class="react-aria-ColorSlider" data-orientation data-disabled>
  <label />
  <output class="react-aria-SliderOutput" />
  <div class="react-aria-SliderTrack">
    <div class="react-aria-ColorThumb" data-dragging data-focused data-focus-visible data-disabled />
  </div>
</div>
```

#### ColorWheel

```html
<div class="react-aria-ColorWheel" data-disabled>
  <div class="react-aria-ColorWheelTrack" />
  <div class="react-aria-ColorThumb" data-dragging data-focused data-focus-visible />
</div>
```

#### ColorSwatch

```html
<div class="react-aria-ColorSwatch" role="img" aria-roledescription="color swatch" aria-label="red" />
```

### 2.6 Utility 컴포넌트

#### Link

```html
<!-- href 있을 때 -->
<a class="react-aria-Link" data-hovered data-pressed data-focus-visible data-disabled data-current>
  Link text
</a>
<!-- href 없을 때 -->
<span class="react-aria-Link" role="link" tabindex="0">Link text</span>
```

#### ProgressBar

```html
<div class="react-aria-ProgressBar" role="progressbar"
  aria-valuenow="50" aria-valuemin="0" aria-valuemax="100" aria-valuetext="50%">
  <label>Loading...</label>
  <span class="value">50%</span>
  <div class="track"><div class="fill" style="width: 50%"></div></div>
</div>
```

| Render Props | `percentage`, `valueText`, `isIndeterminate` |

#### Meter

```html
<div class="react-aria-Meter" role="meter"
  aria-valuenow="75" aria-valuemin="0" aria-valuemax="100">
  <label>Storage</label>
  <div class="track"><div class="fill" style="width: 75%"></div></div>
</div>
```

#### Separator

```html
<div class="react-aria-Separator" role="separator" aria-orientation="horizontal" />
```

#### Group

```html
<div class="react-aria-Group" role="group"
  data-hovered data-focus-within data-focus-visible data-disabled data-invalid data-readonly>
  {children}
</div>
```

#### Disclosure

```html
<div class="react-aria-Disclosure" data-expanded data-disabled>
  <h3 class="react-aria-Heading">
    <button class="react-aria-Button" slot="trigger" aria-expanded aria-controls="[panel-id]">
      Section Title
    </button>
  </h3>
  <div class="react-aria-DisclosurePanel" id="[panel-id]" role="group">
    Panel content
  </div>
</div>
```

#### DisclosureGroup

```html
<div class="react-aria-DisclosureGroup" data-disabled>
  <div class="react-aria-Disclosure" id="section1" data-expanded>...</div>
  <div class="react-aria-Disclosure" id="section2">...</div>
</div>
```

| Props | `allowsMultipleExpanded`, `expandedKeys`, `defaultExpandedKeys`, `onExpandedChange` |

#### FileTrigger

```html
<input type="file" hidden accept=".png,.jpg" multiple />
<button class="react-aria-Button">Select a file</button>
```

#### DropZone

```html
<div class="react-aria-DropZone" role="button" tabindex="0"
  data-focus-visible data-drop-target data-hovered data-focused data-disabled>
  <span slot="label">Drop files here</span>
</div>
```

---

## 3. 현재 XStudio 지원 현황

### 3.1 CSS 아키텍처 (88개 @layer 파일)

**경로**: `packages/shared/src/components/styles/*.css`

88개 CSS 파일이 `@layer` 기반 ITCSS 7계층으로 구성되어 있으며, Preview iframe에서 100% 작동합니다.

#### data-* 속성 활용 패턴

```css
/* XStudio 커스텀 속성 */
.react-aria-Button[data-variant="primary"] {
  background: var(--primary);
  color: var(--on-primary);
}
.react-aria-Button[data-size="sm"] {
  padding: 4px 12px;
  font-size: 0.875rem;
}

/* React Aria 내장 속성 (자동 적용) */
.react-aria-Button[data-variant="primary"][data-hovered] {
  background: var(--primary-hover);
}
.react-aria-Button[data-variant="primary"][data-pressed] {
  background: var(--primary-pressed);
}
.react-aria-Button[data-focused][data-focus-visible] {
  outline: 2px solid var(--focus-ring);
}
.react-aria-Button[data-disabled] {
  opacity: 0.38;
}
```

#### color-mix() 패턴

```css
/* hover/pressed 색상 자동 생성 */
--primary-hover: color-mix(in srgb, var(--primary) 85%, white);
--primary-pressed: color-mix(in srgb, var(--primary) 70%, white);
```

### 3.2 Property Editor (100+ Custom Editor)

**경로**: `apps/builder/src/builder/panels/properties/editors/*.tsx`

각 컴포넌트마다 전용 Property Editor가 React Aria 고유 props를 제어합니다:

| Editor | 제어 props |
|--------|-----------|
| ButtonEditor | variant(7종), size(5종), type, isDisabled, isPending, href, target |
| TextFieldEditor | variant, size, label, placeholder, errorMessage, isInvalid, isRequired |
| NumberFieldEditor | variant, size, label, value, min, max, step, isInvalid |
| SelectEditor | variant, size, items, selectedIndex, isOpen, isInvalid, placeholder |
| CheckboxEditor | variant, size, label, isSelected, isIndeterminate, isInvalid |
| SwitchEditor | variant, size, label, isSelected |
| CardEditor | variant, size, orientation, isSelectable, isSelected |
| TabsEditor | variant, size, orientation, selectedKey |
| DisclosureEditor | variant, size, title, isExpanded |
| BadgeEditor | variant, size, isDot, isPulsing, isLoading |
| DialogEditor | variant, size, title |
| TooltipEditor | variant, size, text, placement, showArrow |
| ListBoxEditor | variant, size, items, selectionMode, selectedIndex |
| ComboBoxEditor | variant, size, items, inputValue, isOpen |

**공통 패턴**: `PropertyEditorWrapper` + `useCallback`/`useMemo` 최적화

```typescript
// Element.props에 저장 → Preview/Canvas 양쪽 전달
const handleVariantChange = useCallback((value: string) => {
  onUpdate({ ...currentProps, variant: value });
}, [currentProps, onUpdate]);
```

### 3.3 Style Panel (4개 섹션)

**경로**: `apps/builder/src/builder/panels/styles/sections/*.tsx`

| 섹션 | 제어 속성 |
|------|----------|
| **Transform** | width, height, top, left, position |
| **Layout** | display, flexDirection, alignItems, justifyContent, gap, padding, margin |
| **Appearance** | backgroundColor, borderWidth, borderColor, borderRadius, boxShadow, opacity |
| **Typography** | fontSize, fontWeight, fontFamily, lineHeight, letterSpacing, textAlign, color |

- `Element.props.style`에 저장 → CSS inline override로 Preview/Canvas에 반영
- Jotai fine-grained reactivity로 개별 속성 변경 시 최소 리렌더
- Spec shapes에서 `props.style?.backgroundColor` 등으로 override 적용

### 3.4 Spec shapes state 파라미터

**경로**: `packages/specs/src/components/*.spec.ts` (71개)

`shapes(props, variant, size, state)` 함수의 `state` 파라미터(4번째) 활용 현황:

#### 완전 활용 (19개) — state 조건 분기 실제 사용

```typescript
// 예: Button.spec.ts
const bgColor = props.style?.backgroundColor
  ?? (state === 'hover' ? variant.backgroundHover
  : state === 'pressed' ? variant.backgroundPressed
  : variant.background);
```

Button, ToggleButton, Card, TextField, NumberField, Select, ComboBox, Link, SearchField, TextArea, DateField, DatePicker, DateRangePicker, TimeField, ColorField, Input, DropZone, FileTrigger, Section

#### 명시적 무시 (26개) — `_state = 'default'`

```typescript
// 예: Checkbox.spec.ts
shapes: (props, variant, size, _state = 'default') => {
  // state 대신 isSelected/isIndeterminate props로 시각 제어
  const bgColor = isChecked ? checkedColors.bg : variant.background;
}
```

Checkbox, CheckboxGroup, Switch, RadioGroup, Breadcrumbs, ColorArea, ColorPicker, ColorSlider, ColorSwatch, ColorSwatchPicker, ColorWheel, Form, GridList, Group, MaskedFrame, Meter, Pagination, ProgressBar, Separator, Skeleton, Slot, Switcher, Table, Tabs, ToggleButtonGroup, Toolbar

#### 간접 사용 (17개) — `resolveStateColors()` 또는 파라미터 수신만

```typescript
// 예: Badge.spec.ts — resolveStateColors로 간접 활용
shapes: (props, variant, size, state = 'default') => {
  const colors = resolveStateColors(variant, state);
  // state를 직접 분기하진 않으나 색상 해석에 전달
}
```

Badge, Calendar, Dialog, Disclosure, DisclosureGroup, List, ListBox, Menu, Panel, Popover, Radio, ScrollBox, Slider, TagGroup, Toast, Tooltip, Tree

> **참고**: Nav는 shapes() 함수에 state 파라미터 자체가 없음 (1개)

### 3.5 Skia 렌더링 파이프라인

#### SkiaNodeData 구조

**경로**: `apps/builder/src/builder/workspace/canvas/skia/nodeRenderers.ts`

```typescript
interface SkiaNodeData {
  type: 'box' | 'text' | 'image' | 'container' | 'line' | 'icon_path' | 'partial_border';
  x: number; y: number; width: number; height: number;
  visible: boolean;
  effects?: EffectStyle[];
  box?: { fillColor: Float32Array; borderRadius: number; stroke*; outline* };
  text?: { content: string; fontFamilies: string[]; fontSize: number; fontWeight: number; ... };
  image?: { skImage: SkImage; contentX: number; ... };
  line?: { x1, y1, x2, y2, strokeColor, strokeWidth, strokeDasharray? };
  iconPath?: { paths, circles?, cx, cy, size, strokeColor, strokeWidth };
  partialBorder?: PartialBorderData;
  children?: SkiaNodeData[];  // ← 트리 구조 지원
}
```

#### specShapesToSkia 변환 과정

**경로**: `apps/builder/src/builder/workspace/canvas/skia/specShapeConverter.ts`

```
Shape[] 입력
  │
  ▼ Pass 1: geometry shapes + targetless shadow/border
  │  - 첫 번째 origin(0,0) full-size rect/roundRect → bgBox 추출
  │  - 나머지 → children[] 수집
  │  - shadow/border에 target 있으면 → deferredShapes에 보관
  │
  ▼ Pass 2: deferred shadow/border (target이 이제 등록됨)
  │  - nodeById에서 target 조회 → 해당 노드에 shadow/border 적용
  │
  ▼ ContainerShape 재귀 (L579-590)
  │  case 'container': specShapesToSkia(shape.children, ...) 재귀 호출
  │
  ▼ SkiaNodeData 반환 (bgBox + children 트리)
```

#### registryVersion 캐싱

| 프레임 분류 | 소요시간 | 조건 |
|-----------|---------|------|
| idle | <0.1ms | registryVersion 미변경 |
| camera-only | ~1ms | 카메라 변환만 |
| content | ~5-20ms | registryVersion 변경 (노드 추가/삭제/레이아웃) |
| full | ~20-50ms | 전체 리빌드 |

#### previewComponentStateAtom 경로

**경로**: `apps/builder/src/builder/panels/styles/atoms/componentStateAtom.ts`

```typescript
// 현재 타입: 전역 단일 (elementId 없음)
export const previewComponentStateAtom = atom<ComponentState | null>(null);

// 쓰기 위치 (2곳만):
// 1. ComponentStateSection.tsx L32,37,39 — StylesPanel 드롭다운
// 2. useZustandJotaiBridge.ts L69 — 선택 요소 변경 시 null 리셋

// 읽기 위치 (1곳):
// ElementSprite.tsx L687 — useAtomValue(previewComponentStateAtom)
```

### 3.6 컴포넌트별 5축 지원 매트릭스

5축 평가 기준:
1. **Preview CSS**: CSS 파일 존재 + data-* 속성 활용
2. **Spec static**: shapes()에서 variant/size/props 반영
3. **Spec state**: shapes()에서 state 파라미터 조건 분기 사용
4. **Canvas 실시간**: previewComponentStateAtom 연결로 호버/프레스 피드백
5. **Overlay**: Canvas에서 overlay 레이어로 팝오버/모달 렌더링

| 컴포넌트 | Preview CSS | Spec static | Spec state | Canvas 실시간 | Overlay | 등급 |
|---------|:-----------:|:-----------:|:----------:|:------------:|:-------:|:----:|
| **Button** | ✅ | ✅ | ✅ | ✅ Phase 1 완료 | N/A | **S** |
| **ToggleButton** | ✅ | ✅ | ✅ | ✅ Phase 1 완료 | N/A | **S** |
| **TextField** | ✅ | ✅ | ✅ | ✅ Phase 1 완료 | N/A | **S** |
| **NumberField** | ✅ | ✅ | ✅ | ✅ Phase 1 완료 | N/A | **S** |
| **Select** | ✅ | ✅ | ✅ | ✅ Phase 1 완료 | ❌ inline | A |
| **ComboBox** | ✅ | ✅ | ✅ | ✅ Phase 1 완료 | ❌ inline | A |
| **Card** | ✅ | ✅ | ✅ | ✅ Phase 1 완료 | N/A | **S** |
| **Link** | ✅ | ✅ | ✅ | ✅ Phase 1 완료 | N/A | **S** |
| **SearchField** | ✅ | ✅ | ✅ | ✅ Phase 1 완료 | N/A | **S** |
| **TextArea** | ✅ | ✅ | ✅ | ✅ Phase 1 완료 | N/A | **S** |
| **Checkbox** | ✅ | ✅ | ❌ `_state` | ✅ 연결됨 (state 분기 추가 필요) | N/A | A |
| **RadioGroup** | ✅ | ✅ | ❌ `_state` | ✅ 연결됨 | N/A | A |
| **Switch** | ✅ | ✅ | ❌ `_state` | ✅ 연결됨 | N/A | A |
| **Tab** | ✅ | ✅ | ❌ `_state` | ✅ 연결됨 | N/A | A |
| **Disclosure** | ✅ | ✅ | 간접 사용 | ✅ 연결됨 | N/A | A |
| **Badge** | ✅ | ✅ | 간접 사용 | ✅ 연결됨 | N/A | A |
| **ListBox** | ✅ | ✅ | 간접 사용 | ✅ 연결됨 | N/A | A |
| **Menu** | ✅ | ✅ | 간접 사용 | ✅ 연결됨 | ❌ 미구현 | A- |
| **Dialog** | ✅ | ✅ | 간접 사용 | ✅ 연결됨 | ❌ 미구현 | A- |
| **Tooltip** | ✅ | ✅ | 간접 사용 | ✅ 연결됨 | ❌ 미구현 | A- |
| **DatePicker** | ✅ | ✅ | ✅ | ✅ Phase 1 완료 | ❌ 미구현 | A- |
| **Popover** | ✅ | ✅ | 간접 사용 | ✅ 연결됨 | ❌ 미구현 | A- |
| **Table** | ✅ | ✅ | ❌ `_state` | ✅ 연결됨 | N/A | A |
| **Tree** | ✅ | ✅ | N/A | ✅ 연결됨 | N/A | A |

**등급 기준**:
- **S**: 모든 축 완전 (Canvas hover/pressed 즉시 작동) — Phase 1 완료
- **A**: Canvas 연결됨, Spec state 분기 추가 또는 Overlay 불필요
- **A-**: Canvas 연결됨, Overlay 미구현 (Phase 2 대상)
- **B**: Compound Component EXCLUDE (Phase 3 대상)

### 3.7 컴포넌트 합성 아키텍처

#### 설계 원칙: "화면에 보이는 것만 Element"

React Aria는 `Select = Label + Button + SelectValue + Popover + ListBox + ListBoxItem` 등 Compound 패턴을 사용합니다. XStudio에서 이를 적용하는 원칙:

> **보이는 것 = 실제 Element**, **보이지 않는 것 = renderer/props가 처리**

예시 — Select 컴포넌트:
- ✅ **Label, SelectTrigger, SelectValue, SelectIcon** → 화면에 항상 보임 → 각각 실제 Element (Layer Tree에 표시)
- ✅ **SelectItem** → 데이터 아이템 → `virtualChildType`으로 Layer Tree에 가상 노드 표시
- ⚠️ **Popover, ListBox** → 닫힌 상태에서 보이지 않음 → 개별 컴포넌트로 존재하되, Select의 자식이 아닌 독립 요소
- ❌ **hidden input** → Canvas에서 불필요 → 생략

#### 3가지 접근법 비교

| 기준 | A: Full Composition | **B: Hybrid (채택)** | C: Atomic + Slot |
|------|:-------------------:|:-------------------:|:----------------:|
| 개념 | React Aria 구조 100% 재현 | 보이는 것만 Element, 나머지 renderer | 원자 단위 + 슬롯 조합 |
| Layer Tree | 모든 내부 노드 노출 | 보이는 노드만 노출 | 슬롯 기반 트리 |
| 작업량 | 대 (모든 컴포넌트 분해) | **소 (기존 구조 확장)** | 대 (새 추상화 필요) |
| 기존 호환성 | 낮음 (전면 재구조화) | **높음 (점진적 적용)** | 중간 |
| Overlay 처리 | 자식으로 포함 | 독립 Element | 슬롯으로 연결 |

**선택 근거**: XStudio는 이미 ComponentFactory + rendererMap 패턴이 정착되어 있어, 기존 인프라를 확장하는 Hybrid가 가장 효율적입니다.

#### 현재 구현 상태

| 메커니즘 | 위치 | 역할 |
|---------|------|------|
| **ComponentFactory** | `apps/builder/src/builder/factories/definitions/*.ts` | 복합 컴포넌트를 자식 Element로 분해 |
| **rendererMap** | `packages/shared/src/renderers/` | Preview에서 단일 Element를 React Aria 합성 트리로 확장 |
| **virtualChildType** | `useLayerTreeData.ts` | 데이터 아이템을 Layer Tree 가상 노드로 표시 |
| **_hasChildren 주입** | `ElementSprite.tsx` L1099-1114 | Canvas에서 자식 보유 여부에 따라 렌더링 분기 |

### 3.8 Factory 구조 감사 결과

React Aria 공식 DOM 구조와 XStudio ComponentFactory 생성 구조를 비교 감사한 결과입니다.

#### Critical: 구조적 래퍼 누락

| 컴포넌트 | React Aria 구조 | 현재 Factory 구조 | 문제 |
|---------|----------------|------------------|------|
| **Tabs** | `Tabs > TabList > Tab*` + `TabPanel*` | `Tabs > Tab1, Panel1, Tab2, Panel2` (flat) | **TabList 래퍼 누락** — Tab들을 그룹핑하는 `tablist` role 컨테이너가 없어 접근성/스타일링 불일치 |
| **Table** | `Table > TableHeader + TableBody > Row > Cell` | `Table > TableHeader` (TableBody 누락) | **TableBody 래퍼 누락** — Row/Cell 호스팅 컨테이너가 없어 데이터 행 관리 불가 |

#### High: 그룹 래퍼 누락

| 컴포넌트 | React Aria 구조 | 현재 Factory 구조 | 문제 |
|---------|----------------|------------------|------|
| **NumberField** | `NumberField > Label + Group(Button + Input + Button) + FieldError` | `NumberField > Label, Button(-), Input, Button(+)` | **Group 래퍼 누락** — 입력부(Button + Input + Button)를 묶는 group이 없어 `data-focus-within` 등 그룹 상태 처리 불가 |

#### Warning: 네이밍/경미한 불일치

| 컴포넌트 | 불일치 | 영향 |
|---------|-------|------|
| **Disclosure** | `DisclosurePanel` vs React Aria의 `DisclosurePanel` (일치함) | 네이밍 확인만 — 현재 정상 |

#### 정상: React Aria 구조와 일치

다음 컴포넌트들은 Factory 생성 구조가 React Aria DOM 구조와 정합성을 확보한 상태입니다:

| 컴포넌트 | Factory 생성 자식 | 비고 |
|---------|-----------------|------|
| **Select** | Label, SelectTrigger>(SelectValue, SelectIcon), SelectItem | Popover/ListBox는 독립 컴포넌트 (의도적) |
| **ComboBox** | Label, ComboBoxInput, ComboBoxButton, ComboBoxItem | Popover/ListBox는 독립 컴포넌트 |
| **TextField** | Label, Input, FieldError | 표준 Field 패턴 |
| **SearchField** | Label, SearchInput, ClearButton, FieldError | 표준 Field 패턴 |
| **DatePicker** | Label, DateInput, DatePickerButton, FieldError | Calendar은 overlay |
| **DateRangePicker** | Label, StartDate, EndDate, DatePickerButton, FieldError | Calendar은 overlay |
| **CheckboxGroup** | Label, Checkbox×3, FieldError | 표준 Group 패턴 |
| **RadioGroup** | Label, Radio×3, FieldError | 표준 Group 패턴 |
| **Card** | 내부 영역(image, header, description, footer) | 자체 렌더링 컨테이너 |
| **Disclosure** | DisclosureButton, DisclosurePanel | 표준 구조 |
| **Breadcrumbs** | BreadcrumbItem×N | _crumbs synthetic prop |

---

## 4. 실제 Gap 분석

### 4.1 Gap A: Canvas 실시간 상태 전파 — ✅ Phase 1 완료

#### 구현 완료 (2026-02-25)

```
사용자 포인터 이벤트 (Canvas)
  pointerover → setPreviewState({ elementId, state: 'hover' })
  pointerdown → setPreviewState({ elementId, state: 'pressed' })
  pointerup   → setPreviewState({ elementId, state: 'hover' })
  pointerleave → setPreviewState(null)
  ↓
previewComponentStateAtom: { elementId: string; state: ComponentState } | null
  ↓
selectAtom(atom, s => s?.elementId === element.id ? s.state : null)  ← O(1) 리렌더
  ↓
componentState 결정:
  if (myPreviewState && myPreviewState !== 'default') → myPreviewState
  if (isDisabled) → 'disabled'
  else → 'default'
  ↓
shapes(props, variant, size, componentState) → specShapesToSkia() → renderFrame()
```

#### 구현 상세

| 변경 | 파일 | 상세 |
|------|------|------|
| atom 타입 확장 | `componentStateAtom.ts` | `PreviewComponentState { elementId, state }` 인터페이스 |
| selectAtom 파생 | `ElementSprite.tsx` L687-694 | `selectAtom`으로 자신의 elementId만 구독 → O(1) 리렌더 |
| pointerover → hover | `ElementSprite.tsx` L1407-1410 | `handlePointerOver` 콜백 |
| pointerdown → pressed | `ElementSprite.tsx` L1399-1400 | 기존 `handleContainerPointerDown`에 추가 |
| pointerup → hover 복귀 | `ElementSprite.tsx` L1412-1415 | 버튼 해제 후 여전히 hover 상태 |
| pointerleave → null | `ElementSprite.tsx` L1417-1420 | `pointerleave` 사용 (자식 이동 시 버블링 방지) |
| 드롭다운 호환 | `ComponentStateSection.tsx` | elementId 포함 쓰기 + elementId 일치 검증 |
| 선택 변경 리셋 | `useZustandJotaiBridge.ts` L69 | `setPreviewComponentState(null)` — 변경 없음 |

#### 성능 최적화

- **selectAtom**: 각 ElementSprite가 전체 atom이 아닌 자신의 elementId에 대한 파생 atom만 구독
- hover 시 리렌더 대상: **해당 요소 1개 + 이전 hover 요소 1개** = O(2), 기존 O(n) 대비 대폭 개선
- **pointerleave**: `pointerout`과 달리 자식 요소로 이동 시 버블링하지 않아 상태 깜빡임 방지

#### 효과

- **즉시 작동 (19개)**: state 완전 활용 컴포넌트 → Canvas hover/pressed 피드백 즉시 반영
- **간접 작동 (17개)**: `resolveStateColors()` 통해 간접 활용 → 색상 변화 반영
- **분기 추가 필요 (26개)**: `_state` 무시 컴포넌트 → shapes() 내 state 분기 점진적 추가 필요

### 4.2 Gap B: Overlay 컴포넌트 Canvas 레이어 (High, 작업량: 대)

#### 현재 상태

- `spec.types.ts` L42-66에 `overlay` 필드 타입 정의됨:
  ```typescript
  overlay?: {
    usePortal: boolean;
    type: 'modal' | 'popover' | 'tooltip' | 'drawer' | 'toast';
    pixiLayer?: 'content' | 'overlay' | 'modal' | 'toast';
    hasBackdrop?: boolean;
    closeOnBackdropClick?: boolean;
    closeOnEscape?: boolean;
    trapFocus?: boolean;
  }
  ```
- **Canvas에서 spec.overlay 참조 0건** (BuilderCanvas, SkiaOverlay, ElementSprite 모두 미사용)
- 8개 컴포넌트가 spec에 overlay 정의:

| 컴포넌트 | type | pixiLayer | 현재 Canvas 처리 |
|---------|------|-----------|----------------|
| DatePicker | popover | overlay | shapes() inline (부모 좌표계 내) |
| DateRangePicker | popover | overlay | shapes() inline |
| Menu | popover | overlay | shapes() inline |
| Popover | popover | overlay | shapes() inline |
| ColorPicker | popover | overlay | shapes() inline |
| Tooltip | tooltip | overlay | shapes() inline |
| Dialog | modal | modal | shapes() inline (backdrop 좌표 제한) |
| Toast | toast | toast | shapes() inline |

**참고**: Select/ComboBox는 spec에 overlay 필드 미정의 → shapes()에서 inline dropdown 렌더링.

#### 문제점

1. Inline shapes는 **부모 Element 좌표계 내**에만 존재 → overflow 클리핑 영향
2. Dialog backdrop이 element 좌표 기준 (viewport 전체 필요)
3. Z-index/Layer 관리 없음 → 다른 요소 뒤에 가려질 수 있음

#### 필요한 4가지 하위 시스템

| 시스템 | 역할 | 참고 |
|-------|------|------|
| **Layer 관리** | content → overlay → modal → toast 렌더링 순서 | SkiaOverlay.tsx 확장 |
| **Portal 메커니즘** | spec.overlay.usePortal=true → Canvas layer로 렌더링 분리 | ElementSprite에서 분기 |
| **Position 계산** | trigger element 기반 위치 결정 + viewport 클리핑 방지 | TextEditOverlay 좌표 변환 재사용 |
| **Event Handler** | ESC key, backdrop click, outside click | PixiJS EventBoundary 활용 |

#### 기존 패턴 재사용 가능

- `TextEditOverlay.tsx`: Canvas → 화면 좌표 변환 (`screenX = canvasX * zoom + panOffsetX`)
- `SkiaOverlay.tsx`: Selection/AI Effects 렌더링 레이어 패턴

### 4.3 Gap C: Compound Component 중첩 (Low, 작업량: 소)

#### 현재 상태

계층 구조 인프라는 이미 완성:
- `ContainerShape.children: Shape[]` → 중첩 가능 (`shape.types.ts` L249-260)
- `specShapesToSkia()` → ContainerShape에서 재귀 호출 (`specShapeConverter.ts` L579-590)
- `SkiaNodeData.children?: SkiaNodeData[]` → 트리 구조 지원
- `_hasChildren` 3단계 주입 패턴 작동 중 (`ElementSprite.tsx` L1099-1114)

#### _hasChildren 3단계 주입

```
단계 1: CHILD_COMPOSITION_EXCLUDE_TAGS 체크
  → Tabs, Breadcrumbs, TagGroup, Table, Tree (5개) → 제외

단계 2: COMPLEX_COMPONENT_TAGS 또는 자식 있음?
  → true면 _hasChildren: true 주입

단계 3: Spec에서 _hasChildren 검사
  → true면 자체 텍스트/라벨 렌더링 skip (shell만 유지)
```

#### 실제 Gap: EXCLUDE 5개 컴포넌트

| 컴포넌트 | 현재 방식 | 문제 |
|---------|---------|------|
| **Table** | EXCLUDE (3단계+ 중첩) | columns/rows synthetic props 확장 필요 |
| **Tree** | EXCLUDE (다단계 중첩) | 재귀 ContainerShape 활용 필요 |
| **Tabs** | `_tabLabels` synthetic prop | 기본 구현 있음, 완성도 향상 필요 |
| **Breadcrumbs** | `_crumbs` synthetic prop | 기본 구현 있음 |
| **TagGroup** | `_tagItems` synthetic prop | 기본 구현 있음 |

### 4.4 Gap D: Factory 구조 정합성 — ✅ Phase 0 완료

#### 구현 완료 (2026-02-25)

3개 컴포넌트의 Factory 구조를 React Aria DOM과 정렬했습니다.

| 컴포넌트 | 이전 | 이후 | 파일 |
|---------|------|------|------|
| **Tabs** | `Tabs > [Tab, Panel, Tab, Panel]` | `Tabs > [TabList > [Tab, Tab], Panel, Panel]` | `LayoutComponents.ts` |
| **Table** | `Table > [TableHeader]` | `Table > [TableHeader, TableBody]` | `TableComponents.ts` |
| **NumberField** | `NF > [Label, Btn, Input, Btn]` | `NF > [Label, Group > [Btn, Input, Btn], FieldError]` | `FormComponents.ts` |

#### 추가 구현

| 변경 | 파일 | 상세 |
|------|------|------|
| TabList 태그 등록 | `unified.types.ts`, `renderers/index.ts`, `useLayerTreeData.ts`, `App.tsx` | 전체 시스템에 TabList 인식 |
| Dual Lookup (Preview) | `LayoutRenderers.tsx` | renderTabs에서 기존 flat + 새 TabList 구조 모두 지원 |
| Dual Lookup (Canvas) | `ElementSprite.tsx` | _tabLabels 주입에서 기존 flat + 새 TabList 구조 모두 지원 |
| Preview fallback | `App.tsx` | resolveHtmlTag에 Group, FieldError 추가 |

#### 하위 호환성

- **이중 탐색(Dual Lookup)**: 기존 문서(flat 구조) + 새 문서(wrapper 구조) 모두 정상 작동
- **DB 마이그레이션 불필요**: Factory 변경은 새 컴포넌트 생성에만 영향
- **성능**: childrenMap O(1) 조회로 추가 비용 무시 가능

---

## 5. 마이그레이션 로드맵

### Phase 0: Factory 구조 정합성 확보 — ✅ 완료 (2026-02-25)

**목표**: React Aria DOM 구조와 Factory 생성 구조 일치 (Gap D 해결)

| 작업 | 파일 | 상태 |
|------|------|:----:|
| TabList 태그 등록 (4곳) | `unified.types.ts`, `renderers/index.ts`, `useLayerTreeData.ts`, `App.tsx` | ✅ |
| Tabs — TabList 래퍼 추가 | `LayoutComponents.ts` | ✅ |
| Table — TableBody 추가 | `TableComponents.ts` | ✅ |
| NumberField — Group + FieldError 래퍼 | `FormComponents.ts` | ✅ |
| Dual Lookup (Preview + Canvas) | `LayoutRenderers.tsx`, `ElementSprite.tsx` | ✅ |
| Preview fallback (Group, FieldError) | `App.tsx` | ✅ |

**하위 호환**: 이중 탐색(Dual Lookup) 패턴으로 기존 문서 100% 정상 동작, DB 마이그레이션 불필요.

### Phase 1: Canvas 실시간 상태 연결 — ✅ 완료 (2026-02-25)

**목표**: Canvas에서 hover/pressed 시각 피드백 즉시 작동

| 작업 | 파일 | 상태 |
|------|------|:----:|
| atom 타입 확장 (`PreviewComponentState`) | `componentStateAtom.ts` | ✅ |
| selectAtom 파생 (O(1) 리렌더) | `ElementSprite.tsx` L687-694 | ✅ |
| pointerover → hover | `ElementSprite.tsx` L1407 | ✅ |
| pointerdown → pressed | `ElementSprite.tsx` L1399 | ✅ |
| pointerup → hover 복귀 | `ElementSprite.tsx` L1412 | ✅ |
| pointerleave → null (버블링 방지) | `ElementSprite.tsx` L1417 | ✅ |
| ComponentStateSection 호환 + elementId 검증 | `ComponentStateSection.tsx` | ✅ |
| useZustandJotaiBridge 호환 | `useZustandJotaiBridge.ts` L69 | ✅ (변경 없음) |

**효과**: state 완전 활용 19개 + 간접 활용 17개 = **36개 컴포넌트**에서 Canvas hover/pressed 피드백 즉시 작동.

**후속 작업**: `_state` 무시 26개 컴포넌트에 shapes() state 분기 점진적 추가 필요.


### 5.X Phase 0.5: Compositional Architecture 전환 (2026-02-25 완료)

Phase 0~1 진행 중 발견된 **Monolithic Spec 버그**를 근본적으로 해결했습니다.

**문제**: `SPEC_RENDERS_ALL_TAGS`가 9개 compound 컴포넌트의 `childElements=[]` 강제 → 자식이 Ghost Element로 존재 → 삭제해도 시각적 변화 없음

**해결**:
- `SPEC_RENDERS_ALL_TAGS` 완전 제거
- 7개 child spec 추가 (Label, FieldError, Description, SliderTrack, SliderThumb, SliderOutput, DateSegment)
- 자식 Element가 독립 spec으로 렌더링
- `elementRemoval.ts` atomic state update

**검증**: TextField, SearchField, NumberField, Slider, DateField, TimeField — 독립 렌더링 + child 삭제 시 사라짐 확인

**후속 수정 (2026-02-26)**: Phantom indicator 레이아웃 정합성
- `calculateContentWidth` Section 2(Flex + childElements 경로)에 phantom indicator 공간 반영 → Checkbox/Radio/Switch 부모의 fit-content 너비 정확도 개선
- `enrichWithIntrinsicSize`에 `isFlexChild` 플래그 추가 → TEXT_LEAF_TAGS(Label, Description 등)가 Flex 자식일 때 intrinsic width 주입 (Block layout 영향 없음)
- 영향: Compositional Architecture 전환 후 Label 자식의 세로 출력 버그 해결

### Phase 2: Overlay 레이어 시스템 (3-4주)

**목표**: Canvas에서 Popover/Modal/Tooltip 별도 레이어로 렌더링

| 주차 | 작업 | 상세 |
|------|------|------|
| 1주 | Layer 관리 시스템 | SkiaOverlay에 content→overlay→modal→toast 렌더링 순서 추가 |
| 1-2주 | Portal 메커니즘 | spec.overlay.usePortal=true 시 Canvas layer로 분리 |
| 2-3주 | Position 계산 | trigger element 기반 위치 + viewport 클리핑 방지 |
| 3-4주 | Event Handler | ESC/backdrop click/outside click + isOpen 상태 관리 |

**대상 컴포넌트**: DatePicker, DateRangePicker, Menu, Popover, ColorPicker, Tooltip, Dialog, Toast (8개)

### Phase 3: Compound Component 확장 (1-2주)

**목표**: EXCLUDE 5개 컴포넌트의 Canvas 계층 구조 완성

| 작업 | 컴포넌트 | 상세 |
|------|---------|------|
| synthetic props 확장 | Table | columns/rows → ContainerShape 중첩 |
| 재귀 구조 | Tree | 노드 계층 → ContainerShape 재귀 |
| 완성도 향상 | Tabs | _tabLabels → 탭 패널 전환 |
| 완성도 향상 | Breadcrumbs | _crumbs → 경로 아이템 |
| 완성도 향상 | TagGroup | _tagItems → 태그 아이템 |

---

## 6. 공통 패턴 가이드

### 6.1 React Aria data-* 속성 전체 목록

| data-* 속성 | 설명 | 적용 대상 | XStudio 지원 |
|-------------|------|----------|-------------|
| `data-hovered` | 마우스 호버 | Button, Link, Input, Checkbox, Radio, Switch, ListBoxItem, MenuItem, Tag, SliderThumb, SliderTrack, Group, DropZone | ✅ CSS + ✅ Canvas(Phase 1 완료) |
| `data-pressed` | 눌림 상태 | Button, Checkbox, Radio, Switch, ListBoxItem, MenuItem, Tag, GridListItem, Row, CalendarCell | ✅ CSS + ✅ Canvas(Phase 1 완료) |
| `data-focused` | 포커스 (마우스/키보드) | Button, Input, Checkbox, Radio, Switch, ListBoxItem, MenuItem, DateSegment, SliderThumb, ColorThumb, DropZone | ✅ CSS + ✅ Canvas(Phase 1 완료) |
| `data-focus-visible` | 키보드 포커스만 | Button, Input, Checkbox, Radio, Switch, ListBoxItem, Tab, Tag, GridListItem, Row, Cell, Column, SliderThumb, ColorThumb, CalendarCell, Link, Group, Disclosure Button, DropZone | ✅ CSS + ✅ Spec(focusVisible outline) |
| `data-focus-within` | 내부 포커스 | Group, DateInput, NumberField Group | ✅ CSS |
| `data-disabled` | 비활성화 | 거의 모든 컴포넌트 | ✅ CSS + ✅ Spec(opacity 0.38) + ✅ Property Editor |
| `data-selected` | 선택됨 | ToggleButton, Checkbox, Radio, Switch, Tab, ListBoxItem, MenuItem, Tag, GridListItem, Row, CalendarCell, TreeItem | ✅ CSS + ✅ Spec(props 기반) + ✅ Property Editor |
| `data-indeterminate` | 불확정 (3-state) | Checkbox | ✅ CSS + ✅ Spec + ✅ Property Editor |
| `data-invalid` | 유효성 검증 실패 | TextField, NumberField, SearchField, Checkbox, CheckboxGroup, RadioGroup, Radio, Input, Group, CalendarCell, ColorField, DateField | ✅ CSS + ✅ Spec + ✅ Property Editor |
| `data-readonly` | 읽기 전용 | TextField, SearchField, Checkbox, CheckboxGroup, RadioGroup, Radio, Switch, Group, DateSegment | ✅ CSS |
| `data-required` | 필수 입력 | TextField, NumberField, SearchField, Checkbox, CheckboxGroup, RadioGroup, Radio | ✅ CSS |
| `data-pending` | 대기/로딩 | Button | ✅ CSS + ✅ Property Editor |
| `data-empty` | 값 비어있음 | SearchField, ListBox, Menu, GridList, TableBody, Tree | ✅ CSS |
| `data-orientation` | 방향 | RadioGroup, Slider, SliderTrack, Tabs, TabList, Toolbar, Separator, ColorSlider | ✅ CSS + ✅ Spec + ✅ Property Editor |
| `data-dragging` | 드래그 중 | ListBoxItem, GridListItem, Row, TreeItem, ColorThumb, SliderThumb | ✅ CSS |
| `data-drop-target` | 드롭 대상 | ListBox, ListBoxItem, GridList, GridListItem, TableBody, Row, Tree, TreeItem, DropZone | ✅ CSS |
| `data-expanded` | 펼침 상태 | Disclosure, TreeItem | ✅ CSS + ✅ Spec + ✅ Property Editor |
| `data-has-child-items` | 자식 보유 | TreeItem | ✅ CSS |
| `data-placeholder` | placeholder 표시 중 | SelectValue, DateSegment | ✅ CSS + ✅ Spec |
| `data-current` | 현재 페이지/위치 | Breadcrumb, Link | ✅ CSS |
| `data-open` | 팝오버 열림 | ComboBox, MenuItem (submenu) | ✅ CSS + ✅ Spec(isOpen prop) |
| `data-placement` | 오버레이 위치 | Popover, Tooltip | ✅ CSS + ❌ Canvas(Gap B) |
| `data-entering` | 진입 애니메이션 | Popover, Tooltip, Modal, ModalOverlay, TabPanel | ✅ CSS + ❌ Canvas(Gap B) |
| `data-exiting` | 퇴장 애니메이션 | Popover, Tooltip, Modal, ModalOverlay, TabPanel | ✅ CSS + ❌ Canvas(Gap B) |
| `data-trigger` | 트리거 출처 | Popover | ✅ CSS + ❌ Canvas(Gap B) |
| `data-type` | 세그먼트 타입 | DateSegment | ✅ CSS + ✅ Spec |
| `data-outside-month` | 현재 월 밖 | CalendarCell | ✅ CSS |
| `data-unavailable` | 이용 불가 | CalendarCell | ✅ CSS |
| `data-selection-start` | 범위 시작 | CalendarCell (RangeCalendar) | ✅ CSS |
| `data-selection-end` | 범위 끝 | CalendarCell (RangeCalendar) | ✅ CSS |
| `data-sort-direction` | 정렬 방향 | Table Column | ✅ CSS |
| `data-resizable-direction` | 리사이즈 방향 | ColumnResizer | ✅ CSS |
| `data-resizing` | 리사이즈 중 | ColumnResizer | ✅ CSS |
| `data-selection-mode` | 선택 모드 | MenuItem, Tree | ✅ CSS |
| `data-layout` | 레이아웃 | ListBox, GridList | ✅ CSS |
| `data-variant` | (XStudio 커스텀) | 모든 M3 컴포넌트 | ✅ CSS + ✅ Spec + ✅ Property Editor |
| `data-size` | (XStudio 커스텀) | 모든 M3 컴포넌트 | ✅ CSS + ✅ Spec + ✅ Property Editor |

### 6.2 React Aria Compound Component 패턴

#### Field 패턴 (TextField, NumberField, SearchField, DateField, TimeField, ColorField)

```
<FieldWrapper>          → bgBox (roundRect, border)
  <Label>               → text shape (y=0)
  <Input|Group>         → roundRect + text (y=labelHeight)
  <Text[description]>   → text shape (visible=!!description)
  <FieldError>          → text shape (visible=!!isInvalid, color=error)
</FieldWrapper>
```

#### Toggle 패턴 (Checkbox, Radio, Switch)

```
<label>                 → Container shape
  <hidden input>        → (생략 - Canvas에서 불필요)
  <indicator>           → roundRect/circle (isSelected 반영)
  {label text}          → text shape
</label>
```

#### Collection 패턴 (ListBox, Menu, GridList, Table, Tree, TagGroup)

```
<Container>             → bgBox + border
  <Item>                → roundRect (isSelected → 배경색)
    <Checkbox[selection]> → (visible=selectionMode)
    {content}           → text shape
    <Button[action]>    → (visible=!!onAction)
  </Item>
  <Section>             → ContainerShape
    <Header>            → text shape
    <Item>...</Item>
  </Section>
</Container>
```

#### Overlay 패턴 (DatePicker, Menu, Dialog, Tooltip, Popover)

```
<Wrapper>               → bgBox
  <Trigger>             → roundRect (data-pressed 반영)
    {value display}     → text shape
    {icon}              → iconPath shape
  </Trigger>
  <Popover>             → ⚠️ 현재 inline shapes (Gap B: Canvas Layer 필요)
    <Dialog|ListBox>    → 별도 레이어에서 렌더링 (Phase 2)
  </Popover>
</Wrapper>
```

### 6.3 CSS → Spec → Skia 일관성 체크리스트

새 컴포넌트 추가 또는 기존 컴포넌트 수정 시 3개 레이어 일관성 확인:

| 체크 | 항목 | 파일 |
|------|------|------|
| ☐ | CSS 파일에 data-variant/size/상태 속성 반영 | `packages/shared/src/components/styles/*.css` |
| ☐ | spec.ts shapes()에서 variant/size 토큰 사용 | `packages/specs/src/components/*.spec.ts` |
| ☐ | spec.ts shapes()에서 state 파라미터 분기 | 위와 동일 |
| ☐ | Property Editor에서 고유 props 제어 가능 | `apps/builder/src/builder/panels/properties/editors/*.tsx` |
| ☐ | Style Panel override가 shapes()에서 적용 | `props.style?.backgroundColor` 등 |
| ☐ | specShapesToSkia() 변환 후 시각적 일치 | `specShapeConverter.ts` |
| ☐ | _hasChildren 패턴 적용 (해당 시) | COMPLEX_COMPONENT_TAGS에 추가 |
| ☐ | overlay 필요 시 spec.overlay 필드 정의 | `spec.types.ts` overlay 타입 |

---

## 부록: React Aria ARIA Role 매핑 총표

| 컴포넌트 | Container Role | Item Role | 비고 |
|---------|---------------|-----------|-----|
| Button | - | `<button>` | 시맨틱 HTML |
| ToggleButton | - | `<button>` | `aria-pressed` |
| TextField | - | `<div>` wrapper | Label+Input 연결 |
| NumberField | `group` (Group) | `<div>` wrapper | spinbutton |
| SearchField | - | `<div>` wrapper | type="search" |
| Checkbox | - | `<label>` | `aria-checked` |
| CheckboxGroup | `group` | - | 그룹 래퍼 |
| RadioGroup | `radiogroup` | - | `aria-checked` |
| Switch | - | `<label>` | `role="switch"` |
| Slider | - | `<div>` | `role="slider"` (hidden input) |
| Select | - | `<div>` | ListBox는 `listbox` |
| ComboBox | - | `<div>` | Input은 `combobox` |
| ListBox | `listbox` | `option` | 표준 |
| Menu | `menu` | `menuitem` / `menuitemcheckbox` / `menuitemradio` | 선택 모드에 따라 |
| Tabs | `tablist` | `tab` + `tabpanel` | Tab-Panel 쌍 |
| TagGroup | `grid` | `row` > `gridcell` | 키보드 탐색 |
| GridList | `grid` | `row` > `gridcell` | 2단 중첩 |
| Table | (암시적) | `row` > `columnheader` / `gridcell` | 시맨틱 HTML |
| Tree | `treegrid` | `row` > `gridcell` | `aria-expanded`, `aria-level` |
| Breadcrumbs | `nav` | `<li>` > `<a>` | `aria-current` |
| Toolbar | `toolbar` | (다양) | roving tabindex |
| Dialog | `dialog` / `alertdialog` | - | 포커스 트랩 |
| Calendar | - | `grid` > `gridcell` | 표준 달력 |
| Disclosure | - | - | `aria-expanded` + `aria-controls` |
| ProgressBar | `progressbar` | - | `aria-valuenow` |
| Meter | `meter` | - | `aria-valuenow` |
| Separator | `separator` | - | `aria-orientation` |
| DropZone | `button` | - | 키보드 접근성 |

---

## 참고 자료

- [React Aria Components 공식 문서](https://react-aria.adobe.com)
- [Component Spec 아키텍처](./COMPONENT_SPEC_ARCHITECTURE.md)
- [CSS 아키텍처](./reference/components/CSS_ARCHITECTURE.md)
- [엔진 업그레이드](./ENGINE_UPGRADE.md)
- [WASM 아키텍처](./WASM.md)
- [Canvas 렌더링 ADR](./adr/003-canvas-rendering.md)
