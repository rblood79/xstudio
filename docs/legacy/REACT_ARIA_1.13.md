# React Aria Components 1.13.0 업데이트 계획

> **레거시 사유**: 현재 설치 버전 `react-aria-components: ^1.15.1` (pnpm-workspace.yaml catalog 기준). 이 문서는 1.13.0 기준 업데이트 계획이며, 이후 두 버전 이상 앞선 상태. 1.14 마이그레이션은 `REACT_ARIA_MIGRATION_1_14.md` 참조.

## 개요

- **현재 버전**: 1.13.0 (이미 설치됨)
- **대상 폴더**: `src/shared/components/`
- **기준**: Stable 기능만 적용 (Alpha/RC 제외)
- **총 Phase**: 5단계

---

## Phase 1: Low-Risk CSS 개선 (난이도: 낮음)

### 목표

기존 동작에 영향 없이 CSS만 추가하여 UX 개선

### 1.1 Disclosure Animation CSS Variables

**파일**: `src/shared/components/styles/Disclosure.css`

**작업 내용**:

- `--disclosure-panel-height` CSS 변수 활용한 애니메이션 추가
- `prefers-reduced-motion` 미디어 쿼리 적용
- `hidden="until-found"` 지원 (브라우저 자동 적용)

**예상 변경**:

```css
/* 추가할 CSS */
.react-aria-DisclosurePanel {
  overflow: hidden;
  height: var(--disclosure-panel-height);
  transition: height 250ms ease-out;
}

.react-aria-DisclosurePanel[data-entering],
.react-aria-DisclosurePanel[data-exiting] {
  height: var(--disclosure-panel-height);
}

@media (prefers-reduced-motion: reduce) {
  .react-aria-DisclosurePanel {
    transition: none;
  }
}
```

### 1.2 Popover Origin-Aware Animation

**파일**: `src/shared/components/styles/Popover.css`

**작업 내용**:

- transform-origin을 trigger 기준으로 설정하는 CSS 추가
- 스케일 트랜지션 효과

**예상 변경**:

```css
.react-aria-Popover {
  --origin-x: var(--trigger-x, 50%);
  --origin-y: var(--trigger-y, 0);
  transform-origin: var(--origin-x) var(--origin-y);
}

.react-aria-Popover[data-entering] {
  animation: popover-enter 200ms ease-out;
}

@keyframes popover-enter {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
}
```

### 1.3 Tooltip Origin-Aware Animation

**파일**: `src/shared/components/styles/Tooltip.css`

**작업 내용**:

- Popover와 동일한 origin-aware 애니메이션 패턴 적용

### 검증 체크리스트

- [ ] Disclosure 확장/축소 애니메이션 동작 확인
- [ ] Popover 열림 애니메이션 동작 확인
- [ ] Tooltip 표시 애니메이션 동작 확인
- [ ] `prefers-reduced-motion` 설정 시 애니메이션 비활성화 확인
- [ ] 기존 기능 regression 없음 확인

---

## Phase 2: Props 확장 (난이도: 낮음)

### 목표

새로운 props 추가로 기능 확장 (하위 호환성 유지)

### 2.1 Calendar selectionAlignment Prop

**파일**: `src/shared/components/Calendar.tsx`

**작업 내용**:

- `selectionAlignment` prop 추가
- 타입 정의 확장

**예상 변경**:

```tsx
// CalendarProps 확장
export interface CalendarProps<T extends DateValue> extends AriaCalendarProps<T> {
  // ... 기존 props
  /**
   * 선택된 날짜의 정렬 방식
   * @default 'center'
   */
  selectionAlignment?: 'start' | 'center' | 'end';
}

// 컴포넌트에 prop 전달
<AriaCalendar
  {...props}
  selectionAlignment={selectionAlignment}
  // ... 기존 props
>
```

### 2.2 DatePicker/DateRangePicker firstDayOfWeek Prop

**파일**:

- `src/shared/components/DatePicker.tsx`
- `src/shared/components/DateRangePicker.tsx`

**작업 내용**:

- `firstDayOfWeek` prop 추가 (0=Sunday ~ 6=Saturday)

**예상 변경**:

```tsx
export interface DatePickerProps {
  // ... 기존 props
  /**
   * 주의 첫 번째 요일 (0: 일요일, 1: 월요일, ...)
   * @default locale 기반 자동 설정
   */
  firstDayOfWeek?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
}
```

### 2.3 ComboBoxItem onAction Prop

**파일**: `src/shared/components/ComboBox.tsx`

**작업 내용**:

- ComboBoxItem에 `onAction` prop 지원
- "Create new item" 패턴 지원

**예상 변경**:

```tsx
// ComboBoxItem props 확장
export interface ComboBoxItemProps extends ListBoxItemProps {
  /**
   * 아이템 클릭 시 실행되는 액션
   * "Create" 옵션 구현에 유용
   */
  onAction?: () => void;
}

export function ComboBoxItem({ onAction, ...props }: ComboBoxItemProps) {
  return <ListBoxItem {...props} onAction={onAction} />;
}
```

### 검증 체크리스트

- [ ] Calendar selectionAlignment 동작 확인
- [ ] DatePicker firstDayOfWeek 동작 확인 (월요일 시작 등)
- [ ] ComboBoxItem onAction 동작 확인
- [ ] 기존 props와 충돌 없음 확인
- [ ] TypeScript 타입 정확성 확인

---

## Phase 3: Select Multi-Selection (난이도: 중간)

### 목표

Select 컴포넌트에 다중 선택 기능 추가

### 3.1 Select 타입 및 Props 확장

**파일**: `src/shared/components/Select.tsx`

**작업 내용**:

1. Props 인터페이스 확장
2. 다중 선택 로직 구현
3. SelectValue 커스터마이징

**예상 변경**:

```tsx
// 1. Props 확장
export interface SelectProps<T extends object>
  extends Omit<AriaSelectProps<T>, "children"> {
  // ... 기존 props

  /**
   * 선택 모드
   * @default 'single'
   */
  selectionMode?: "single" | "multiple";

  /**
   * 선택된 값 (단일: Key, 다중: Key[])
   */
  value?: Key | Key[];

  /**
   * 기본 선택 값
   */
  defaultValue?: Key | Key[];

  /**
   * 선택 변경 핸들러
   */
  onValueChange?: (value: Key | Key[]) => void;

  /**
   * 다중 선택 시 표시 형식
   * @default 'count' - "3 items selected"
   */
  multipleDisplayMode?: "count" | "list" | "custom";

  /**
   * 다중 선택 시 커스텀 렌더러
   */
  renderMultipleValue?: (selectedItems: T[]) => React.ReactNode;
}
```

```tsx
// 2. SelectValue 커스터마이징
const renderSelectValue = () => {
  if (selectionMode === "multiple" && selectedItems.length > 0) {
    switch (multipleDisplayMode) {
      case "count":
        return `${selectedItems.length}개 선택됨`;
      case "list":
        return selectedItems.map((item) => item.label).join(", ");
      case "custom":
        return renderMultipleValue?.(selectedItems);
      default:
        return `${selectedItems.length}개 선택됨`;
    }
  }
  return <SelectValue />;
};
```

```tsx
// 3. ListBox selectionMode 전달
<ListBox
  items={selectItems}
  className="react-aria-ListBox"
  selectionMode={selectionMode}
  selectedKeys={normalizedValue}
  onSelectionChange={handleSelectionChange}
>
```

### 3.2 Select CSS 업데이트

**파일**: `src/shared/components/styles/Select.css`

**작업 내용**:

- 다중 선택 시 체크박스 표시 스타일
- 다중 선택 badge 스타일

**예상 변경**:

```css
/* 다중 선택 모드 스타일 */
.react-aria-Select[data-selection-mode="multiple"] .react-aria-ListBoxItem {
  padding-left: var(--spacing-lg);
}

.react-aria-Select[data-selection-mode="multiple"]
  .react-aria-ListBoxItem::before {
  content: "";
  position: absolute;
  left: var(--spacing-sm);
  width: 16px;
  height: 16px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.react-aria-Select[data-selection-mode="multiple"]
  .react-aria-ListBoxItem[data-selected]::before {
  background: var(--color-primary-600);
  border-color: var(--color-primary-600);
}
```

### 3.3 SelectEditor Props 업데이트

**파일**: `src/builder/inspector/properties/editors/SelectEditor.tsx`

**작업 내용**:

- selectionMode 선택 UI 추가
- multipleDisplayMode 설정 UI 추가

### 검증 체크리스트

- [ ] 단일 선택 모드 기존 동작 유지
- [ ] 다중 선택 모드 동작 확인
- [ ] 선택된 항목 표시 (count/list) 확인
- [ ] onValueChange 콜백 정상 동작
- [ ] Builder Inspector에서 설정 가능
- [ ] DataBinding과 함께 동작 확인

---

## Phase 4: SelectionIndicator 적용 (난이도: 중간)

### 목표

Tabs와 ToggleButtonGroup에 React Aria SelectionIndicator 적용

### 4.1 Tabs SelectionIndicator 추가

**파일**: `src/shared/components/Tabs.tsx`

**작업 내용**:

1. SelectionIndicator import 및 적용
2. 애니메이션 CSS 추가

**예상 변경**:

```tsx
import {
  // ... 기존 imports
  SelectionIndicator,
} from "react-aria-components";

export interface TabsExtendedProps extends TabsProps {
  // ... 기존 props
  /**
   * 선택 인디케이터 표시
   * @default false
   */
  showIndicator?: boolean;
}

// TabList 내부에 SelectionIndicator 추가
export function TabList<T extends object>({
  variant = "primary",
  size = "md",
  showIndicator = false,
  ...props
}: TabListExtendedProps<T>) {
  return (
    <RACTabList {...props} className={tabListClassName}>
      {showIndicator && <SelectionIndicator />}
      {props.children}
    </RACTabList>
  );
}
```

**CSS 추가** (`src/shared/components/styles/Tabs.css`):

```css
.react-aria-TabList .react-aria-SelectionIndicator {
  position: absolute;
  bottom: 0;
  height: 2px;
  background: var(--color-primary-600);
  border-radius: var(--radius-full);
  transition: transform 200ms ease, width 200ms ease;
}
```

### 4.2 ToggleButtonGroup SelectionIndicator 마이그레이션 (상세)

**파일**:

- `src/shared/components/ToggleButtonGroup.tsx`
- `src/shared/components/styles/ToggleButtonGroup.css`

**현재 자체 구현 분석**:

| 구성요소     | 현재 구현                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| **JS 로직**  | `useEffect` + `MutationObserver`로 `[data-selected]` 변경 감지                                          |
| **CSS 변수** | `--indicator-left`, `--indicator-top`, `--indicator-width`, `--indicator-height`, `--indicator-opacity` |
| **CSS 구현** | `::before` pseudo-element로 indicator 렌더링                                                            |
| **활성화**   | `data-indicator="true"` 속성                                                                            |
| **Variants** | primary, secondary, tertiary, error, surface (5개 색상)                                                 |
| **방향**     | horizontal, vertical 지원                                                                               |

**마이그레이션 작업 상세**:

#### Step 1: TSX 파일 수정 (`ToggleButtonGroup.tsx`)

```tsx
// 1. Import 추가
import {
  ToggleButtonGroup as RACToggleButtonGroup,
  ToggleButtonGroupProps,
  SelectionIndicator, // 새로 추가
  composeRenderProps,
} from "react-aria-components";

// 2. 기존 useEffect + MutationObserver 코드 제거 (라인 86-128)
// 제거할 코드:
// useEffect(() => {
//   if (!memoizedIndicator) return;
//   const group = groupRef.current;
//   if (!group) return;
//   const updateIndicator = () => { ... };
//   ...
// }, [memoizedIndicator, props.selectedKeys, props.defaultSelectedKeys]);

// 3. ref 불필요 시 제거
// const groupRef = useRef<HTMLDivElement>(null);

// 4. SelectionIndicator 컴포넌트 추가
export function ToggleButtonGroup({
  indicator = false,
  variant = "default",
  size = "sm",
}: // ...
 ToggleButtonGroupExtendedProps) {
  // MutationObserver useEffect 제거됨

  return (
    <RACToggleButtonGroup
      {...props}
      data-indicator={indicator ? "true" : "false"}
      data-togglebutton-variant={variant}
      data-togglebutton-size={size}
      className={toggleButtonGroupClassName}
    >
      {/* SelectionIndicator는 그룹 내 첫 번째 자식으로 배치 */}
      {indicator && <SelectionIndicator />}
      {children}
    </RACToggleButtonGroup>
  );
}
```

#### Step 2: CSS 파일 수정 (`ToggleButtonGroup.css`)

```css
/* 제거할 CSS (기존 ::before 기반 indicator) */
/* 라인 31-141의 &[data-indicator="true"] 블록 전체 */

/* 새로 추가할 CSS (SelectionIndicator 기반) */
@layer components {
  .react-aria-ToggleButtonGroup {
    /* 기존 base 스타일 유지 */
    display: flex;
    position: relative; /* SelectionIndicator 절대 위치용 */

    /* SelectionIndicator 기본 스타일 */
    .react-aria-SelectionIndicator {
      position: absolute;
      z-index: -1;
      border-radius: var(--border-radius);
      background: var(--primary);
      box-shadow: var(--shadow-sm);
      transition: transform 200ms ease-out, width 200ms ease-out,
        height 200ms ease-out;
      pointer-events: none;

      @media (prefers-reduced-motion: reduce) {
        transition: none;
      }
    }

    /* indicator 활성화 시 그룹 스타일 */
    &[data-indicator="true"] {
      background: var(--surface-container);
      width: fit-content;
      padding: 0px;
      border-radius: var(--border-radius);
      box-shadow: var(--inset-shadow-sm);
      outline: 1px solid var(--border-color);
      outline-offset: -1px;

      .react-aria-ToggleButton {
        background-color: transparent;
        border-color: transparent;

        &[data-selected] {
          background: transparent;
          border-color: transparent;
        }
      }
    }
  }
}
```

#### 마이그레이션 이점

| 항목              | 기존 (자체 구현)                        | 신규 (SelectionIndicator)         |
| ----------------- | --------------------------------------- | --------------------------------- |
| **JS 코드**       | ~50 라인 (useEffect + MutationObserver) | 1 라인 (`<SelectionIndicator />`) |
| **CSS 변수**      | 5개 수동 관리                           | React Aria 자동 관리              |
| **DOM 변경 감지** | MutationObserver                        | React Aria 내부 처리              |
| **번들 크기**     | 커스텀 로직 포함                        | 라이브러리 공유                   |
| **유지보수**      | 직접 관리                               | 라이브러리 업데이트 자동 반영     |

### 4.3 3x3 Grid (Flex Alignment) SelectionIndicator 지원

**파일**: `src/builder/panels/common/index.css`

React Aria의 SelectionIndicator는 선택된 요소의 `getBoundingClientRect()`를 기반으로 위치를 계산하므로, **CSS 커스터마이징만으로 X, Y 양축 이동을 지원**합니다.

**CSS 추가** (`src/builder/panels/common/index.css`):

```css
/* 3x3 Grid용 SelectionIndicator 커스터마이징 */
.flex-alignment .react-aria-ToggleButtonGroup {
  display: grid;
  grid-template-columns: repeat(3, var(--spacing-xl));
  grid-template-rows: repeat(3, var(--spacing-xl));
  gap: 4px;
  position: relative; /* SelectionIndicator 절대 위치 기준 */
}

.flex-alignment .react-aria-SelectionIndicator {
  position: absolute;
  z-index: 0;
  border-radius: var(--radius-sm);
  background: var(--primary);
  pointer-events: none;

  /* X, Y 양축 transition - 대각선 이동도 자연스럽게 */
  transition: transform 200ms ease-out, width 200ms ease-out,
    height 200ms ease-out;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
}
```

**결론**: React Aria SelectionIndicator는 **2D Grid를 기본 지원**하며, CSS transition 설정만으로 양축 이동 애니메이션을 구현할 수 있습니다. 별도의 커스텀 구현 불필요.

### 검증 체크리스트

- [ ] Tabs 인디케이터 슬라이딩 애니메이션 동작
- [ ] ToggleButtonGroup 인디케이터 동작 (horizontal)
- [ ] ToggleButtonGroup 인디케이터 동작 (vertical)
- [ ] **3x3 Grid (flex-alignment) 인디케이터 X, Y 양축 이동**
- [ ] **3x3 Grid 대각선 이동 애니메이션**
- [ ] 선택 없을 때 인디케이터 숨김 처리
- [ ] orientation (horizontal/vertical) 대응
- [ ] 기존 동작과 시각적 일관성 유지

---

## Phase 5: Filtering 기능 (난이도: 중간)

### 목표

GridList, TagGroup에 필터링 기능 추가

### 5.1 GridList Filtering

**파일**: `src/shared/components/GridList.tsx`

**작업 내용**:

1. filter prop 추가
2. 필터링 로직 구현

**예상 변경**:

```tsx
interface ExtendedGridListProps<T extends object> extends GridListProps<T> {
  // ... 기존 props
  /**
   * 필터 함수
   */
  filter?: (item: T) => boolean;

  /**
   * 필터 텍스트 (기본 필터링)
   */
  filterText?: string;

  /**
   * 필터 적용 필드
   * @default ['label', 'name', 'title']
   */
  filterFields?: (keyof T)[];
}

// 필터링 로직
const filteredItems = useMemo(() => {
  if (!items) return items;

  let result = [...items];

  // 커스텀 필터
  if (filter) {
    result = result.filter(filter);
  }

  // 텍스트 필터
  if (filterText) {
    const searchText = filterText.toLowerCase();
    result = result.filter((item) =>
      filterFields.some((field) =>
        String(item[field]).toLowerCase().includes(searchText)
      )
    );
  }

  return result;
}, [items, filter, filterText, filterFields]);
```

### 5.2 TagGroup Filtering

**파일**: `src/shared/components/TagGroup.tsx`

**작업 내용**:

- GridList와 동일한 필터링 패턴 적용

### 검증 체크리스트

- [ ] GridList 필터링 동작 확인
- [ ] TagGroup 필터링 동작 확인
- [ ] filterText 변경 시 실시간 필터링
- [ ] 커스텀 filter 함수 동작
- [ ] DataBinding 데이터와 필터링 조합 동작
- [ ] 빈 결과 시 UI 처리

---

## 제외 항목 (Alpha/RC)

| 기능             | 상태               | 제외 사유              |
| ---------------- | ------------------ | ---------------------- |
| Autocomplete     | RC                 | 아직 Stable 아님       |
| Toast            | Alpha              | 프로덕션 사용 부적합   |
| GridList Section | Alpha              | API 변경 가능성        |
| Table Filtering  | Stable but complex | 별도 Phase로 분리 권장 |

---

## 일정 추정

| Phase   | 예상 작업량   | 의존성             |
| ------- | ------------- | ------------------ |
| Phase 1 | CSS만 추가    | 없음               |
| Phase 2 | Props 추가    | Phase 1 완료       |
| Phase 3 | 로직 변경     | Phase 2 완료       |
| Phase 4 | 컴포넌트 교체 | Phase 1 완료       |
| Phase 5 | 기능 추가     | Phase 2 완료       |
| Phase 6 | Props 추가    | Phase 1, 2, 3 완료 |

**권장 순서**: Phase 1 → Phase 2 → Phase 4 → Phase 3 → Phase 5 → Phase 6

---

## 수정 대상 파일 요약 (총 28개: shared 18 + panels/common 3 + Editor 7)

### Phase 1 (CSS 애니메이션)

| 파일                                          | 작업 내용                   |
| --------------------------------------------- | --------------------------- |
| `src/shared/components/styles/Disclosure.css` | CSS 변수 애니메이션 추가    |
| `src/shared/components/styles/Popover.css`    | Origin-aware animation 추가 |
| `src/shared/components/styles/Tooltip.css`    | Origin-aware animation 추가 |

### Phase 2 (Props 확장)

| 파일                                                                  | 작업 내용                       |
| --------------------------------------------------------------------- | ------------------------------- |
| `src/shared/components/Calendar.tsx`                                  | `selectionAlignment` prop 추가  |
| `src/shared/components/DatePicker.tsx`                                | `firstDayOfWeek` prop 추가      |
| `src/shared/components/DateRangePicker.tsx`                           | `firstDayOfWeek` prop 추가      |
| `src/shared/components/ComboBox.tsx`                                  | `onAction` on ComboBoxItem 지원 |
| **`src/builder/panels/properties/editors/DatePickerEditor.tsx`**      | `firstDayOfWeek` 선택 UI 추가   |
| **`src/builder/panels/properties/editors/DateRangePickerEditor.tsx`** | `firstDayOfWeek` 선택 UI 추가   |
| **`src/builder/panels/properties/editors/ComboBoxItemEditor.tsx`**    | `onAction` 설정 UI 추가         |

> CalendarEditor는 이미 `firstDayOfWeek`, `selectionAlignment` 구현되어 있음

### Phase 3 (Select Multi-Selection)

| 파일                                                         | 작업 내용                                      |
| ------------------------------------------------------------ | ---------------------------------------------- |
| `src/shared/components/Select.tsx`                           | `selectionMode="multiple"` 지원                |
| `src/shared/components/styles/Select.css`                    | 다중 선택 체크박스 스타일                      |
| **`src/builder/panels/properties/editors/SelectEditor.tsx`** | `selectionMode`, `multipleDisplayMode` UI 추가 |

### Phase 4 (SelectionIndicator)

| 파일                                                       | 작업 내용                                           |
| ---------------------------------------------------------- | --------------------------------------------------- |
| `src/shared/components/Tabs.tsx`                           | SelectionIndicator 적용                             |
| `src/shared/components/styles/Tabs.css`                    | indicator 스타일 추가                               |
| **`src/builder/panels/properties/editors/TabsEditor.tsx`** | `showIndicator` 스위치 추가                         |
| `src/shared/components/ToggleButtonGroup.tsx`              | **자체 구현 → SelectionIndicator 교체**             |
| `src/shared/components/styles/ToggleButtonGroup.css`       | **::before 제거, SelectionIndicator 스타일로 교체** |
| `src/builder/panels/common/index.css`                      | **3x3 Grid용 SelectionIndicator 2D 커스터마이징**   |

> ToggleButtonGroupEditor는 이미 `indicator` 스위치 구현되어 있음 (라인 203-210)

### Phase 5 (Filtering)

| 파일                                                           | 작업 내용                                 |
| -------------------------------------------------------------- | ----------------------------------------- |
| `src/shared/components/GridList.tsx`                           | `filter`, `filterText` props 추가         |
| `src/shared/components/TagGroup.tsx`                           | `filter`, `filterText` props 추가         |
| **`src/builder/panels/properties/editors/GridListEditor.tsx`** | `filterText` 입력, `filterFields` 설정 UI |
| **`src/builder/panels/properties/editors/TagGroupEditor.tsx`** | `filterText` 입력, `filterFields` 설정 UI |

### Phase 6 (Builder Property 컴포넌트)

| 파일                                              | 작업 내용                                                |
| ------------------------------------------------- | -------------------------------------------------------- |
| `src/builder/panels/common/PropertySelect.tsx`    | `multiple`, `selectedKeys`, `onMultiChange` props 추가   |
| `src/builder/panels/common/PropertyUnitInput.tsx` | `onAddCustomUnit`, `customUnits` props + `onAction` 지원 |

---

## 이미 구현된 항목

- `CalendarEditor`: `firstDayOfWeek`, `selectionAlignment` UI
- `ToggleButtonGroupEditor`: `indicator` 스위치 UI
