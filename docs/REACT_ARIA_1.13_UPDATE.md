# React Aria Components 1.13.0 업데이트 계획

## 개요

- **현재 버전**: 1.13.0 (이미 설치됨)
- **대상 폴더**: `src/shared/components/`
- **기준**: Stable 기능만 적용 (Alpha/RC 제외)
- **총 Phase**: 5단계

---

## Phase 1: Low-Risk CSS 개선 (난이도: 🟢 낮음)

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

## Phase 2: Props 확장 (난이도: 🟢 낮음)

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

## Phase 3: Select Multi-Selection (난이도: 🟡 중간)

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

## Phase 4: SelectionIndicator 적용 (난이도: 🟡 중간)

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

    /* Variant별 SelectionIndicator 색상 */
    &[data-togglebutton-variant="primary"] .react-aria-SelectionIndicator {
      background: var(--primary);
    }
    &[data-togglebutton-variant="primary"]
      .react-aria-ToggleButton[data-selected] {
      color: var(--on-primary);
    }

    &[data-togglebutton-variant="secondary"] .react-aria-SelectionIndicator {
      background: var(--secondary);
    }
    &[data-togglebutton-variant="secondary"]
      .react-aria-ToggleButton[data-selected] {
      color: var(--on-secondary);
    }

    &[data-togglebutton-variant="tertiary"] .react-aria-SelectionIndicator {
      background: var(--tertiary);
    }
    &[data-togglebutton-variant="tertiary"]
      .react-aria-ToggleButton[data-selected] {
      color: var(--on-tertiary);
    }

    &[data-togglebutton-variant="error"] .react-aria-SelectionIndicator {
      background: var(--error);
    }
    &[data-togglebutton-variant="error"]
      .react-aria-ToggleButton[data-selected] {
      color: var(--on-error);
    }

    &[data-togglebutton-variant="surface"] .react-aria-SelectionIndicator {
      background: var(--surface-container-highest);
    }
    &[data-togglebutton-variant="surface"]
      .react-aria-ToggleButton[data-selected] {
      color: var(--on-surface);
    }
  }
}
```

#### Step 3: 테스트 케이스

| 테스트 항목    | 확인 사항                              |
| -------------- | -------------------------------------- |
| 기본 동작      | indicator 없이 기존처럼 동작           |
| indicator=true | SelectionIndicator 표시                |
| 선택 변경      | 인디케이터 슬라이딩 애니메이션         |
| 선택 해제      | 인디케이터 숨김 (opacity: 0 또는 제거) |
| Variants       | 5개 variant 색상 정상 적용             |
| Orientation    | horizontal/vertical 방향 전환          |
| DataBinding    | 동적 데이터와 함께 동작                |
| Reduced motion | 애니메이션 비활성화                    |

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

**현재 구현**:

- `.flex-alignment` 클래스에서 3x3 grid 레이아웃 사용
- `LayoutSection.tsx`에서 9개 ToggleButton으로 flex alignment 선택
- 현재 custom indicator 사용 중

**SelectionIndicator 2D Grid 지원**:

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

**동작 원리**:

| 선택 변경     | SelectionIndicator 동작      |
| ------------- | ---------------------------- |
| (0,0) → (2,0) | X축만 이동 (기존 horizontal) |
| (0,0) → (0,2) | Y축만 이동 (vertical 지원)   |
| (0,0) → (2,2) | X, Y 동시 이동 (대각선)      |
| (1,1) → (0,2) | 대각선 반대 방향 이동        |

**React Aria SelectionIndicator 내부 동작**:

```
1. 선택된 버튼의 getBoundingClientRect() 계산
2. 부모 컨테이너 기준 상대 위치 계산
3. CSS transform으로 위치 이동
4. transition 속성으로 애니메이션 적용
```

**3x3 Grid 테스트 케이스**:

| 테스트 항목    | 확인 사항                                          |
| -------------- | -------------------------------------------------- |
| 수평 이동      | leftTop → rightTop 이동 시 X축 애니메이션          |
| 수직 이동      | leftTop → leftBottom 이동 시 Y축 애니메이션        |
| 대각선 이동    | leftTop → rightBottom 이동 시 X, Y 동시 애니메이션 |
| 중앙 선택      | centerCenter 선택 시 정확한 위치                   |
| Reduced motion | 애니메이션 즉시 이동                               |

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

## Phase 5: Filtering 기능 (난이도: 🟡 중간)

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

### 5.3 GridListEditor / TagGroupEditor 업데이트

**파일**:

- `src/builder/inspector/properties/editors/GridListEditor.tsx`
- `src/builder/inspector/properties/editors/TagGroupEditor.tsx`

**작업 내용**:

- 필터링 관련 props 설정 UI 추가

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

### Phase 1 (CSS 애니메이션) - Editor 변경 없음

| 파일                                          | 작업 내용                   |
| --------------------------------------------- | --------------------------- |
| `src/shared/components/styles/Disclosure.css` | CSS 변수 애니메이션 추가    |
| `src/shared/components/styles/Popover.css`    | Origin-aware animation 추가 |
| `src/shared/components/styles/Tooltip.css`    | Origin-aware animation 추가 |

### Phase 2 (Props 확장) - Editor 2개 수정

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

### Phase 3 (Select Multi-Selection) - Editor 1개 수정

| 파일                                                         | 작업 내용                                      |
| ------------------------------------------------------------ | ---------------------------------------------- |
| `src/shared/components/Select.tsx`                           | `selectionMode="multiple"` 지원                |
| `src/shared/components/styles/Select.css`                    | 다중 선택 체크박스 스타일                      |
| **`src/builder/panels/properties/editors/SelectEditor.tsx`** | `selectionMode`, `multipleDisplayMode` UI 추가 |

### Phase 4 (SelectionIndicator) - 핵심 - Editor 1개 수정

| 파일                                                       | 작업 내용                                           |
| ---------------------------------------------------------- | --------------------------------------------------- |
| `src/shared/components/Tabs.tsx`                           | SelectionIndicator 적용                             |
| `src/shared/components/styles/Tabs.css`                    | indicator 스타일 추가                               |
| **`src/builder/panels/properties/editors/TabsEditor.tsx`** | `showIndicator` 스위치 추가                         |
| `src/shared/components/ToggleButtonGroup.tsx`              | **자체 구현 → SelectionIndicator 교체**             |
| `src/shared/components/styles/ToggleButtonGroup.css`       | **::before 제거, SelectionIndicator 스타일로 교체** |
| `src/builder/panels/common/index.css`                      | **3x3 Grid용 SelectionIndicator 2D 커스터마이징**   |

> ToggleButtonGroupEditor는 이미 `indicator` 스위치 구현되어 있음 (라인 203-210)
> 3x3 Grid (flex-alignment)는 CSS 커스터마이징만으로 X, Y 양축 이동 지원

### Phase 5 (Filtering) - Editor 2개 수정

| 파일                                                           | 작업 내용                                 |
| -------------------------------------------------------------- | ----------------------------------------- |
| `src/shared/components/GridList.tsx`                           | `filter`, `filterText` props 추가         |
| `src/shared/components/TagGroup.tsx`                           | `filter`, `filterText` props 추가         |
| **`src/builder/panels/properties/editors/GridListEditor.tsx`** | `filterText` 입력, `filterFields` 설정 UI |
| **`src/builder/panels/properties/editors/TagGroupEditor.tsx`** | `filterText` 입력, `filterFields` 설정 UI |

### Phase 6 (Builder Property 컴포넌트) - panels/common 2개 수정

| 파일                                              | 작업 내용                                                |
| ------------------------------------------------- | -------------------------------------------------------- |
| `src/builder/panels/common/PropertySelect.tsx`    | `multiple`, `selectedKeys`, `onMultiChange` props 추가   |
| `src/builder/panels/common/PropertyUnitInput.tsx` | `onAddCustomUnit`, `customUnits` props + `onAction` 지원 |

> Phase 1 Popover.css 적용 시 PropertySelect, PropertyDataBinding, PropertyUnitInput에 애니메이션 자동 적용

---

## Editor 변경 상세

### Phase 2: DatePickerEditor / DateRangePickerEditor

**추가할 UI** (CalendarEditor 패턴 참고):

```tsx
<PropertySelect
  label={PROPERTY_LABELS.FIRST_DAY_OF_WEEK}
  value={String(currentProps.firstDayOfWeek || "")}
  onChange={(value) => updateProp("firstDayOfWeek", value || undefined)}
  options={[
    { value: "", label: "Default (Locale)" },
    { value: "sun", label: "Sunday" },
    { value: "mon", label: "Monday" },
    { value: "tue", label: "Tuesday" },
    { value: "wed", label: "Wednesday" },
    { value: "thu", label: "Thursday" },
    { value: "fri", label: "Friday" },
    { value: "sat", label: "Saturday" },
  ]}
  icon={Calendar}
/>
```

### Phase 2: ComboBoxItemEditor

**추가할 UI**:

```tsx
<PropertySection title="Actions">
  <PropertyInput
    label="On Action"
    value={String(currentProps.onAction || "")}
    onChange={(value) => updateProp("onAction", value || undefined)}
    placeholder="handleCreateItem"
    icon={Play}
  />
  <p className="property-help">
    "Create" 옵션 구현 시 사용 (예: 검색 결과 없을 때 새 항목 생성)
  </p>
</PropertySection>
```

### Phase 3: SelectEditor

**추가할 UI**:

```tsx
<PropertySection title="Selection">
  <PropertySelect
    label={PROPERTY_LABELS.SELECTION_MODE}
    value={String(currentProps.selectionMode || "single")}
    onChange={(value) => updateProp("selectionMode", value)}
    options={[
      { value: "single", label: "Single" },
      { value: "multiple", label: "Multiple" },
    ]}
    icon={CheckSquare}
  />

  {/* 다중 선택 모드일 때만 표시 */}
  {currentProps.selectionMode === "multiple" && (
    <PropertySelect
      label="Display Mode"
      value={String(currentProps.multipleDisplayMode || "count")}
      onChange={(value) => updateProp("multipleDisplayMode", value)}
      options={[
        { value: "count", label: 'Count (e.g., "3 selected")' },
        { value: "list", label: 'List (e.g., "A, B, C")' },
        { value: "custom", label: "Custom" },
      ]}
      icon={Layout}
    />
  )}
</PropertySection>
```

### Phase 4: TabsEditor

**추가할 UI** (Design 섹션에):

```tsx
<PropertySwitch
  label="Show Indicator"
  isSelected={Boolean(currentProps.showIndicator)}
  onChange={(checked) => updateProp("showIndicator", checked)}
  icon={Target}
/>
```

### Phase 5: GridListEditor / TagGroupEditor

**추가할 UI**:

```tsx
<PropertySection title="Filtering">
  <PropertyInput
    label="Filter Text"
    value={String(currentProps.filterText || "")}
    onChange={(value) => updateProp("filterText", value || undefined)}
    placeholder="Search..."
    icon={Search}
  />

  <PropertyInput
    label="Filter Fields"
    value={String((currentProps.filterFields || []).join(", "))}
    onChange={(value) => {
      const fields = value
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);
      updateProp("filterFields", fields.length > 0 ? fields : undefined);
    }}
    placeholder="label, name, title"
    icon={FileText}
  />
  <p className="property-help">
    쉼표로 구분하여 검색할 필드 지정 (기본: label, name, title)
  </p>
</PropertySection>
```

---

## Phase 6: Builder Property 컴포넌트 (난이도: 🟢 낮음)

### 목표

`src/builder/panels/common` 파생 컴포넌트에 React Aria 1.13.0 기능 적용

### 대상 컴포넌트 분석

| 파일                        | 사용 React Aria                  | 업데이트 영향                                           |
| --------------------------- | -------------------------------- | ------------------------------------------------------- |
| **PropertySelect.tsx**      | Select, Popover, ListBox         | Phase 1 (Popover 애니메이션), Phase 3 (Multi-Selection) |
| **PropertyDataBinding.tsx** | Select, Popover, ListBox         | Phase 1 (Popover 애니메이션)                            |
| **PropertyUnitInput.tsx**   | ComboBox, Popover, ListBox       | Phase 1 (Popover 애니메이션), Phase 2 (onAction)        |
| **PropertySlider.tsx**      | Slider, SliderTrack, SliderThumb | 변경 없음                                               |
| **PropertySwitch.tsx**      | Switch                           | 변경 없음                                               |
| **PropertyCheckbox.tsx**    | Checkbox (shared)                | 변경 없음                                               |
| **SelectionFilter.tsx**     | PropertySelect 사용              | 간접 영향                                               |

### 6.1 PropertySelect Multi-Selection 지원

**파일**: `src/builder/panels/common/PropertySelect.tsx`

**현재 상태**:

```tsx
// 단일 선택만 지원
<AriaSelect
  selectedKey={value}
  onSelectionChange={handleChange}
>
```

**작업 내용**:

1. `multiple` prop 추가
2. 다중 선택 시 체크박스 표시
3. 선택 카운트 표시

**예상 변경**:

```tsx
interface PropertySelectProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  icon?: React.ComponentType<{...}>;
  className?: string;
  /**
   * 다중 선택 모드
   * @default false
   */
  multiple?: boolean;
  /**
   * 다중 선택 시 값 배열
   */
  selectedKeys?: string[];
  /**
   * 다중 선택 변경 핸들러
   */
  onMultiChange?: (values: string[]) => void;
}

// 다중 선택 시 표시
{multiple ? (
  <SelectValue>
    {selectedKeys?.length || 0}개 선택됨
  </SelectValue>
) : (
  <SelectValue />
)}

// ListBox selectionMode 조건부 적용
<ListBox
  className="react-aria-ListBox"
  selectionMode={multiple ? "multiple" : "single"}
>
```

**활용 시나리오**:

- 여러 variant 동시 적용
- 다중 태그 선택
- 복수 옵션 필터

### 6.2 PropertyUnitInput ComboBox onAction

**파일**: `src/builder/panels/common/PropertyUnitInput.tsx`

**현재 상태**: 고정된 단위 목록만 지원 (`px`, `%`, `rem`, `em`, `vh`, `vw`, `reset`)

**작업 내용**:

1. `onAddCustomUnit` prop 추가
2. "커스텀 단위 추가" 옵션에 `onAction` 적용

**예상 변경**:

```tsx
interface PropertyUnitInputProps {
  // ... 기존 props
  /**
   * 커스텀 단위 추가 액션
   */
  onAddCustomUnit?: (unit: string) => void;
  /**
   * 커스텀 단위 목록
   */
  customUnits?: string[];
}

// 단위 목록에 커스텀 단위 추가 옵션
<ListBox className="react-aria-ListBox">
  {units.map((u) => (
    <ListBoxItem key={u} id={u} className="react-aria-ListBoxItem">
      {u}
    </ListBoxItem>
  ))}
  {onAddCustomUnit && (
    <ListBoxItem
      key="add-custom"
      id="add-custom"
      className="react-aria-ListBoxItem add-custom"
      onAction={() => {
        // 커스텀 단위 추가 UI 표시
        onAddCustomUnit(inputValue);
      }}
    >
      + 커스텀 단위 추가
    </ListBoxItem>
  )}
</ListBox>;
```

**활용 시나리오**:

- CSS 변수 단위 (`var(--spacing)`)
- calc() 표현식 (`calc(100% - 20px)`)
- 프로젝트별 커스텀 단위

### 6.3 Popover 애니메이션 자동 적용

**파일**: Phase 1 CSS 적용 시 자동 적용

**영향 받는 컴포넌트**:

- `PropertySelect.tsx`
- `PropertyDataBinding.tsx`
- `PropertyUnitInput.tsx`

**동작 원리**:

```css
/* src/shared/components/styles/Popover.css에 추가하면 */
.react-aria-Popover {
  transform-origin: var(--origin-x) var(--origin-y);
}

.react-aria-Popover[data-entering] {
  animation: popover-enter 200ms ease-out;
}

/* 모든 .react-aria-Popover 클래스 사용 컴포넌트에 자동 적용 */
```

**효과**:

- 별도 수정 없이 Phase 1 CSS만 적용하면 자동으로 모든 Popover에 origin-aware 애니메이션 적용
- PropertySelect, PropertyDataBinding, PropertyUnitInput 드롭다운 열릴 때 부드러운 애니메이션

### 검증 체크리스트

- [ ] PropertySelect 다중 선택 모드 동작 확인
- [ ] PropertySelect 다중 선택 시 카운트 표시 확인
- [ ] PropertyUnitInput 커스텀 단위 추가 onAction 동작 확인
- [ ] Phase 1 적용 후 모든 Popover 애니메이션 동작 확인
- [ ] 기존 단일 선택 동작 regression 없음 확인

---

## 최종 요약

### 총 수정 파일: 28개 (shared 18 + panels/common 3 + Editor 7)

| Phase       | 난이도 | shared | panels/common | Editor | 핵심 변경                                     |
| ----------- | ------ | ------ | ------------- | ------ | --------------------------------------------- |
| Phase 1     | 낮음   | 3      | (자동 적용)   | 0      | CSS only                                      |
| Phase 2     | 낮음   | 4      | 0             | 3      | Props 추가 + Editor UI                        |
| Phase 3     | 중간   | 3      | 0             | 1      | Select Multi-Selection + Editor               |
| Phase 4     | 중간   | 4      | **1**         | 1      | Indicator 마이그레이션 + **3x3 Grid 2D 지원** |
| Phase 5     | 중간   | 4      | 0             | 2      | Filtering + Editor UI                         |
| **Phase 6** | 낮음   | 0      | **2**         | 0      | Property 컴포넌트 기능 확장                   |

### 권장 실행 순서

```
Phase 1 → Phase 2 → Phase 4 → Phase 3 → Phase 5 → Phase 6
```

> Phase 6는 Phase 1, 2, 3 완료 후 진행 권장 (의존성: Popover CSS, onAction, Multi-Selection)

### 이미 구현된 항목

- `CalendarEditor`: `firstDayOfWeek`, `selectionAlignment` UI
- `ToggleButtonGroupEditor`: `indicator` 스위치 UI

### Editor 추가 작업 요약

| Editor                | 추가 UI                                               |
| --------------------- | ----------------------------------------------------- |
| DatePickerEditor      | `firstDayOfWeek` PropertySelect                       |
| DateRangePickerEditor | `firstDayOfWeek` PropertySelect                       |
| ComboBoxItemEditor    | `onAction` PropertyInput                              |
| SelectEditor          | `selectionMode`, `multipleDisplayMode` PropertySelect |
| TabsEditor            | `showIndicator` PropertySwitch                        |
| GridListEditor        | `filterText`, `filterFields` PropertyInput            |
| TagGroupEditor        | `filterText`, `filterFields` PropertyInput            |

### ToggleButtonGroup Indicator 마이그레이션 핵심

**제거할 코드**:

- `useEffect` + `MutationObserver` (~50 라인)
- `groupRef`
- CSS `::before` pseudo-element
- 5개 CSS 변수 수동 관리

**추가할 코드**:

- `<SelectionIndicator />` (1 라인)
- `.react-aria-SelectionIndicator` CSS 스타일

**결과**: JS 코드 98% 감소, React Aria 라이브러리 통합

### 3x3 Grid (Flex Alignment) SelectionIndicator 지원

**핵심**: React Aria SelectionIndicator는 `getBoundingClientRect()` 기반으로 위치 계산 → **CSS transition만으로 X, Y 양축 이동 자동 지원**

```css
.flex-alignment .react-aria-SelectionIndicator {
  transition: transform 200ms ease-out, width 200ms ease-out,
    height 200ms ease-out;
}
```

| 이동 방향         | 지원 여부               |
| ----------------- | ----------------------- |
| X축 (horizontal)  | ✅ 기본 지원            |
| Y축 (vertical)    | ✅ CSS transition 적용  |
| 대각선 (diagonal) | ✅ X, Y 동시 transition |

**결론**: 별도 커스텀 구현 불필요, CSS 커스터마이징만으로 2D Grid 완전 지원

### Phase 6 수정 대상 파일

| 파일                                              | 작업 내용                                              |
| ------------------------------------------------- | ------------------------------------------------------ |
| `src/builder/panels/common/PropertySelect.tsx`    | `multiple`, `selectedKeys`, `onMultiChange` props 추가 |
| `src/builder/panels/common/PropertyUnitInput.tsx` | `onAddCustomUnit`, `customUnits` props + onAction 지원 |

> Phase 1 CSS (Popover.css) 적용 시 PropertySelect, PropertyDataBinding, PropertyUnitInput에 애니메이션 자동 적용

### Phase 6 기대효과

| 컴포넌트                  | Before           | After                                   |
| ------------------------- | ---------------- | --------------------------------------- |
| **PropertySelect**        | 단일 선택만 가능 | 다중 선택 지원 → Editor UI 유연성 향상  |
| **PropertyUnitInput**     | 고정 단위 목록   | 커스텀 단위 추가 → CSS 변수/calc() 지원 |
| **모든 Property Popover** | 즉시 표시        | 부드러운 애니메이션 → Builder UX 개선   |

---

## 추가 발견: src/builder/ 직접 RAC 사용 파일

### 자동 적용 (Phase 1 CSS)

Phase 1에서 `Popover.css` 업데이트 시 `.react-aria-Popover` 클래스를 사용하는 모든 컴포넌트에 자동 적용:

| 파일                                                  | 사용 컴포넌트            | Phase 1 영향 |
| ----------------------------------------------------- | ------------------------ | ------------ |
| `src/builder/events/pickers/ActionTypePicker.tsx`     | Select, Popover, ListBox | ✅ 자동 적용 |
| `src/builder/events/pickers/EventTypePicker.tsx`      | Select, Popover, ListBox | ✅ 자동 적용 |
| `src/builder/events/components/ComponentSelector.tsx` | Select, Popover, ListBox | ✅ 자동 적용 |

### 선택적 업데이트 (Phase 4)

| 파일                                                    | 현재 상태          | 권장 조치                                                                                    |
| ------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------- |
| `src/builder/panels/themes/components/ThemePreview.tsx` | RAC Tabs 직접 사용 | **옵션 1**: shared/components/Tabs로 교체 (권장)<br>**옵션 2**: SelectionIndicator 직접 추가 |

**ThemePreview.tsx 권장 조치**:

```tsx
// Before: RAC 직접 사용
import { Tabs, TabList, Tab, TabPanel } from "react-aria-components";

// After: shared 래퍼 사용 (권장)
import {
  Tabs,
  TabList,
  Tab,
  TabPanel,
} from "../../../../shared/components/Tabs";
```

### 영향 없음 (변경 불필요)

| 파일                                                             | 사용 컴포넌트         | 사유               |
| ---------------------------------------------------------------- | --------------------- | ------------------ |
| `src/builder/panels/dataset/presets/DataTablePresetSelector.tsx` | Dialog, Modal, Button | 업데이트 대상 아님 |
| `src/builder/panels/dataset/editors/DataTableCreator.tsx`        | Button                | 업데이트 대상 아님 |
| `src/builder/panels/monitor/*.tsx`                               | Button                | 업데이트 대상 아님 |
| `src/builder/panels/settings/SettingsPanel.tsx`                  | Button                | 업데이트 대상 아님 |
| `src/canvas/renderers/FormRenderers.tsx`                         | parseColor (유틸)     | 업데이트 대상 아님 |

### 최종 수정 파일 요약 (업데이트)

**총 28개 (변경 없음)**:

- shared: 18개
- panels/common: 3개 (index.css 포함)
- Editor: 7개

**자동 적용 (추가 작업 불필요)**: 3개

- ActionTypePicker.tsx, EventTypePicker.tsx, ComponentSelector.tsx

**선택적 리팩토링 권장**: 1개

- ThemePreview.tsx → shared/components/Tabs 사용으로 변경
