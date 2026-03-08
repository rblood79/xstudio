# ADR-023 S2 Props 전수 조사 비교표 (2026-03-05)

> XStudio Spec 현재 상태 vs React Spectrum S2 공식 API 비교

## 범례

- **일치**: XStudio가 S2와 동일
- **M3 잔존**: variant에 primary/secondary/tertiary/error 등 M3 네이밍 사용 중
- **미반영**: S2에 존재하는 prop이 XStudio에 없음
- **XS 전용**: XStudio 자체 확장 (S2에 없음)
- **N/A**: S2에 해당 컴포넌트 없거나 해당 prop 없음

---

## 1. variant 비교표

| 컴포넌트              | XStudio 현재 variant                                                                                        | S2 공식 variant                                                                                             | 상태                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| **Button**            | accent, primary, secondary, negative, premium, genai + fillStyle(fill,outline,subtle)                       | accent, primary, secondary, negative, premium, genai + fillStyle(fill,outline)                              | 일치                                                                                       |
| **Badge**             | accent, informative, neutral, positive, notice, negative + 13 named colors + fillStyle(bold,subtle,outline) | accent, informative, neutral, positive, notice, negative + 19 named colors + fillStyle(bold,subtle,outline) | **부분 일치** (named color 6종 미반영: gray, chartreuse, celery, seafoam, brown, cinnamon) |
| **ToggleButton**      | isEmphasized, isQuiet (boolean)                                                                             | isEmphasized, isQuiet (boolean)                                                                             | 일치                                                                                       |
| **Card**              | default, elevated, outlined                                                                                 | primary, secondary, tertiary, quiet                                                                         | **불일치** (XStudio 자체 네이밍)                                                           |
| **Checkbox**          | default, emphasized                                                                                         | isEmphasized (boolean)                                                                                      | **부분 일치** (variant 대신 boolean이어야 함)                                              |
| **Switch**            | default, emphasized                                                                                         | isEmphasized (boolean)                                                                                      | **부분 일치** (variant 대신 boolean이어야 함)                                              |
| **Link**              | primary, secondary                                                                                          | primary, secondary                                                                                          | 일치                                                                                       |
| **Meter**             | informative, positive, notice, negative                                                                     | informative, positive, notice, negative                                                                     | 일치                                                                                       |
| **Label**             | default, accent, neutral, purple, negative                                                                  | N/A (S2에 독립 variant 없음)                                                                                | XS 전용                                                                                    |
| **Dialog**            | primary, error                                                                                              | error, confirmation, information, destructive, warning + fullscreen, fullscreenTakeover                     | **M3 잔존** (primary) + 대폭 미반영                                                        |
| **Tooltip**           | primary, surface                                                                                            | N/A (S2에 variant 없음)                                                                                     | XS 전용                                                                                    |
| **Popover**           | primary, secondary, surface                                                                                 | N/A (S2에 variant 없음)                                                                                     | XS 전용                                                                                    |
| **Toast**             | default, primary, error, success                                                                            | N/A (S2 Toast에 variant 없음)                                                                               | **M3 잔존** (primary, error)                                                               |
| **TextField**         | default, primary, secondary, tertiary, error, success                                                       | N/A (S2에 variant 없음)                                                                                     | **M3 잔존** (6종 모두 레거시)                                                              |
| **TextArea**          | default, primary, error                                                                                     | N/A (S2에 variant 없음)                                                                                     | **M3 잔존**                                                                                |
| **Input**             | default, primary, error                                                                                     | N/A (S2에 독립 variant 없음)                                                                                | **M3 잔존**                                                                                |
| **ComboBox**          | default, primary, error                                                                                     | N/A (S2에 variant 없음)                                                                                     | **M3 잔존**                                                                                |
| **Select**            | default, primary, error                                                                                     | N/A (S2에 variant 없음, Picker로 대체)                                                                      | **M3 잔존**                                                                                |
| **SelectTrigger**     | default, primary, error                                                                                     | N/A                                                                                                         | **M3 잔존**                                                                                |
| **NumberField**       | default, primary, error                                                                                     | N/A (S2에 variant 없음)                                                                                     | **M3 잔존**                                                                                |
| **SearchField**       | default, primary                                                                                            | N/A (S2에 variant 없음)                                                                                     | **M3 잔존**                                                                                |
| **DateField**         | default, primary, error                                                                                     | N/A (S2에 variant 없음)                                                                                     | **M3 잔존**                                                                                |
| **DatePicker**        | default, primary, error                                                                                     | N/A (S2에 variant 없음)                                                                                     | **M3 잔존**                                                                                |
| **DateRangePicker**   | default, primary, error                                                                                     | N/A (S2에 variant 없음)                                                                                     | **M3 잔존**                                                                                |
| **TimeField**         | default, primary, error                                                                                     | N/A (S2에 variant 없음)                                                                                     | **M3 잔존**                                                                                |
| **ColorField**        | default, primary, error                                                                                     | N/A (S2에 variant 없음)                                                                                     | **M3 잔존**                                                                                |
| **Radio**             | default, primary, secondary, error                                                                          | N/A (S2 Radio에 variant 없음, RadioGroup에 isEmphasized)                                                    | **M3 잔존**                                                                                |
| **RadioGroup**        | default, primary                                                                                            | isEmphasized (boolean)                                                                                      | **M3 잔존** + 패턴 불일치                                                                  |
| **CheckboxGroup**     | default, primary                                                                                            | isEmphasized (boolean)                                                                                      | **M3 잔존** + 패턴 불일치                                                                  |
| **Slider**            | default, primary, secondary                                                                                 | isEmphasized (boolean)                                                                                      | **M3 잔존** + 패턴 불일치                                                                  |
| **SliderTrack**       | default, primary, secondary                                                                                 | N/A (S2에 없음)                                                                                             | **M3 잔존**                                                                                |
| **SliderThumb**       | default, primary, secondary                                                                                 | N/A (S2에 없음)                                                                                             | **M3 잔존**                                                                                |
| **SliderOutput**      | default, primary, secondary                                                                                 | N/A (S2에 없음)                                                                                             | **M3 잔존**                                                                                |
| **TagGroup**          | default, primary, secondary, error                                                                          | isEmphasized (boolean)                                                                                      | **M3 잔존** + 패턴 불일치                                                                  |
| **Tabs**              | default                                                                                                     | N/A (S2에 variant 없음, density만 있음)                                                                     | -                                                                                          |
| **Breadcrumbs**       | default, primary                                                                                            | N/A (S2에 variant 없음)                                                                                     | **M3 잔존**                                                                                |
| **Menu**              | default, primary                                                                                            | N/A (S2에 variant 없음)                                                                                     | **M3 잔존**                                                                                |
| **Form**              | default, outlined                                                                                           | isEmphasized (boolean)                                                                                      | 패턴 불일치                                                                                |
| **ProgressBar**       | default                                                                                                     | N/A (S2에 variant 없음)                                                                                     | -                                                                                          |
| **Disclosure**        | default, primary, surface                                                                                   | isQuiet (boolean)                                                                                           | **M3 잔존** + 패턴 불일치                                                                  |
| **DisclosureGroup**   | default, primary                                                                                            | N/A                                                                                                         | **M3 잔존**                                                                                |
| **Section**           | default, primary, secondary, tertiary, surface, outlined                                                    | N/A (S2에 없음)                                                                                             | **M3 잔존**                                                                                |
| **Separator**         | default, solid, dashed, dotted, primary, secondary, surface                                                 | N/A (S2 Divider에 variant 없음)                                                                             | **M3 잔존**                                                                                |
| **Panel**             | default, primary, surface                                                                                   | N/A (S2에 없음)                                                                                             | **M3 잔존**                                                                                |
| **Table**             | default, striped, bordered                                                                                  | N/A (S2 TableView에 variant 없음, isQuiet만)                                                                | XS 전용                                                                                    |
| **Calendar**          | default, primary                                                                                            | N/A                                                                                                         | **M3 잔존**                                                                                |
| **CalendarGrid**      | default, primary                                                                                            | N/A                                                                                                         | **M3 잔존**                                                                                |
| **CalendarHeader**    | default, primary                                                                                            | N/A                                                                                                         | **M3 잔존**                                                                                |
| **ColorArea**         | default, primary                                                                                            | N/A                                                                                                         | **M3 잔존**                                                                                |
| **ColorSlider**       | default, primary                                                                                            | N/A                                                                                                         | **M3 잔존**                                                                                |
| **ColorWheel**        | default, primary                                                                                            | N/A                                                                                                         | **M3 잔존**                                                                                |
| **ColorSwatchPicker** | default, primary                                                                                            | N/A                                                                                                         | **M3 잔존**                                                                                |
| **ColorSwatch**       | default, selected                                                                                           | N/A                                                                                                         | -                                                                                          |
| **ColorPicker**       | default, compact, expanded                                                                                  | N/A                                                                                                         | XS 전용                                                                                    |
| **DropZone**          | default, primary                                                                                            | N/A (S2에 variant 없음)                                                                                     | **M3 잔존**                                                                                |
| **FileTrigger**       | default, primary                                                                                            | N/A                                                                                                         | **M3 잔존**                                                                                |
| **GridList**          | default, primary                                                                                            | N/A                                                                                                         | **M3 잔존**                                                                                |
| **List**              | default, primary                                                                                            | N/A                                                                                                         | **M3 잔존**                                                                                |
| **ListBox**           | default, primary                                                                                            | N/A                                                                                                         | **M3 잔존**                                                                                |
| **Nav**               | default, primary                                                                                            | N/A                                                                                                         | **M3 잔존**                                                                                |
| **Pagination**        | default, primary                                                                                            | N/A                                                                                                         | **M3 잔존**                                                                                |
| **ScrollBox**         | default, primary                                                                                            | N/A                                                                                                         | **M3 잔존**                                                                                |
| **Skeleton**          | default, primary                                                                                            | N/A (S2에 variant 없음)                                                                                     | **M3 잔존**                                                                                |
| **Switcher**          | default, primary                                                                                            | N/A                                                                                                         | **M3 잔존**                                                                                |
| **Tree**              | default, primary                                                                                            | N/A                                                                                                         | **M3 잔존**                                                                                |
| **Toolbar**           | default, primary                                                                                            | N/A                                                                                                         | **M3 잔존**                                                                                |
| **MaskedFrame**       | default, primary                                                                                            | N/A                                                                                                         | **M3 잔존**                                                                                |
| **Group**             | default, primary                                                                                            | N/A                                                                                                         | **M3 잔존**                                                                                |
| **Slot**              | default                                                                                                     | N/A                                                                                                         | -                                                                                          |
| **SelectIcon**        | default                                                                                                     | N/A                                                                                                         | -                                                                                          |
| **SelectValue**       | default                                                                                                     | N/A                                                                                                         | -                                                                                          |
| **DateSegment**       | default, primary, error                                                                                     | N/A                                                                                                         | **M3 잔존**                                                                                |

---

## 2. size 비교표

| 컴포넌트              | XStudio sizes 키 | S2 공식 size                    | 상태                                        |
| --------------------- | ---------------- | ------------------------------- | ------------------------------------------- |
| **Button**            | xs, sm, md, lg   | S, M, L, XL                     | **네이밍 불일치** (xs/sm/md/lg vs S/M/L/XL) |
| **Badge**             | xs, sm, md, lg   | S, M, L, XL                     | **네이밍 불일치**                           |
| **TextField**         | sm, md, lg       | S, M, L, XL                     | **네이밍 불일치** + XL 미반영               |
| **TextArea**          | sm, md, lg       | N/A (S2에 size 없음)            | XS 전용                                     |
| **Checkbox**          | sm, md, lg       | S, M, L, XL                     | **네이밍 불일치** + XL 미반영               |
| **CheckboxGroup**     | sm, md, lg       | S, M, L, XL                     | **네이밍 불일치** + XL 미반영               |
| **Switch**            | sm, md, lg       | S, M, L, XL                     | **네이밍 불일치** + XL 미반영               |
| **Radio**             | sm, md, lg       | N/A (RadioGroup에서 제어)       | XS 전용                                     |
| **RadioGroup**        | sm, md, lg       | S, M, L, XL                     | **네이밍 불일치** + XL 미반영               |
| **Slider**            | sm, md, lg       | S, M, L, XL                     | **네이밍 불일치** + XL 미반영               |
| **Link**              | xs, sm, md, lg   | N/A (S2에 size 없음)            | XS 전용                                     |
| **Card**              | sm, md, lg       | S, M, L, XL, XS                 | **네이밍 불일치** + XS/XL 미반영            |
| **Dialog**            | sm, md, lg       | S, M, L, XL                     | **네이밍 불일치** + XL 미반영               |
| **Meter**             | sm, md, lg       | S, M, L, XL                     | **네이밍 불일치** + XL 미반영               |
| **ToggleButton**      | xs, sm, md, lg   | S, M, L, XL, XS                 | **네이밍 불일치**                           |
| **ToggleButtonGroup** | sm, md, lg       | S, M, L, XL, XS                 | **네이밍 불일치** + XS/XL 미반영            |
| **ComboBox**          | sm, md, lg       | S, M, L, XL                     | **네이밍 불일치** + XL 미반영               |
| **NumberField**       | sm, md, lg       | S, M, L, XL                     | **네이밍 불일치** + XL 미반영               |
| **SearchField**       | sm, md, lg       | S, M, L, XL                     | **네이밍 불일치** + XL 미반영               |
| **DateField**         | sm, md, lg       | S, M, L, XL                     | **네이밍 불일치** + XL 미반영               |
| **DatePicker**        | sm, md, lg       | S, M, L, XL                     | **네이밍 불일치** + XL 미반영               |
| **DateRangePicker**   | sm, md, lg       | S, M, L, XL                     | **네이밍 불일치** + XL 미반영               |
| **TimeField**         | sm, md, lg       | S, M, L, XL                     | **네이밍 불일치** + XL 미반영               |
| **ColorField**        | sm, md, lg       | S, M, L, XL                     | **네이밍 불일치** + XL 미반영               |
| **TagGroup**          | sm, md, lg       | S, M, L                         | **네이밍 불일치**                           |
| **Tabs**              | sm, md, lg       | N/A (S2에 size 없음, density만) | XS 전용                                     |
| **Breadcrumbs**       | sm, md, lg       | M, L                            | **네이밍 불일치** + S 불필요                |
| **Menu**              | sm, md, lg       | S, M, L, XL                     | **네이밍 불일치** + XL 미반영               |
| **Popover**           | sm, md, lg       | S, M, L                         | **네이밍 불일치**                           |
| **Form**              | sm, md, lg       | S, M, L, XL                     | **네이밍 불일치** + XL 미반영               |
| **ProgressBar**       | sm, md, lg       | S, M, L, XL                     | **네이밍 불일치** + XL 미반영               |
| **Disclosure**        | sm, md, lg       | S, M, L, XL                     | **네이밍 불일치** + XL 미반영               |
| **DropZone**          | sm, md, lg       | S, M, L                         | **네이밍 불일치**                           |
| **ColorSwatchPicker** | sm, md, lg       | S, M, L, XS                     | **네이밍 불일치** + XS 미반영               |
| **ColorSwatch**       | sm, md, lg       | S, M, L, XS                     | **네이밍 불일치** + XS 미반영               |

> **모든** XStudio 컴포넌트가 `sm/md/lg` 체계 — S2의 `S/M/L/XL` 체계와 100% 불일치

---

## 3. isEmphasized / isQuiet 패턴 비교

| 컴포넌트              | XStudio 현재                                              | S2 공식                         | 상태                                          |
| --------------------- | --------------------------------------------------------- | ------------------------------- | --------------------------------------------- |
| **Checkbox**          | variant: "default" \| "emphasized"                        | isEmphasized: boolean           | **패턴 불일치** (variant → boolean 전환 필요) |
| **Switch**            | variant: "default" \| "emphasized"                        | isEmphasized: boolean           | **패턴 불일치**                               |
| **ToggleButton**      | isEmphasized, isQuiet (boolean)                           | isEmphasized, isQuiet (boolean) | 일치                                          |
| **ToggleButtonGroup** | isEmphasized, isQuiet (boolean)                           | isEmphasized, isQuiet (boolean) | 일치                                          |
| **Slider**            | variant: "default" \| "primary" \| "secondary"            | isEmphasized: boolean           | **패턴 불일치**                               |
| **RadioGroup**        | variant: "default" \| "primary"                           | isEmphasized: boolean           | **패턴 불일치**                               |
| **CheckboxGroup**     | variant: "default" \| "primary"                           | isEmphasized: boolean           | **패턴 불일치**                               |
| **TagGroup**          | variant: "default" \| "primary" \| "secondary" \| "error" | isEmphasized: boolean           | **패턴 불일치**                               |
| **Disclosure**        | variant: "default" \| "primary" \| "surface"              | isQuiet: boolean                | **패턴 불일치**                               |
| **Form**              | variant: "default" \| "outlined"                          | isEmphasized: boolean           | **패턴 불일치**                               |

---

## 4. S2에만 존재하는 prop (XStudio 미반영)

| S2 prop                                  | 적용 컴포넌트                                                | 설명                            |
| ---------------------------------------- | ------------------------------------------------------------ | ------------------------------- |
| `staticColor`                            | Button, Link, ToggleButton, ActionButton, Meter, ProgressBar | auto/black/white 배경 대비 색상 |
| `density`                                | Tabs (compact/regular)                                       | 탭 밀도                         |
| `isQuiet`                                | Picker, TableView, ActionButton, Disclosure                  | 조용한 스타일                   |
| `fillStyle` (border/subtleFill/boldFill) | InlineAlert                                                  | S2에만 있는 InlineAlert 전용    |

---

## 5. 통계 요약

### variant 상태

| 상태                | 개수   | 비율 |
| ------------------- | ------ | ---- |
| 일치                | 5      | 7%   |
| 부분 일치           | 3      | 4%   |
| M3 잔존             | 42     | 58%  |
| XS 전용 (S2에 없음) | 7      | 10%  |
| 해당 없음           | 15     | 21%  |
| **합계**            | **72** |      |

### size 상태

| 상태                                      | 개수            |
| ----------------------------------------- | --------------- |
| 네이밍 100% 불일치 (sm/md/lg vs S/M/L/XL) | **전체** (72개) |
| XL 미반영                                 | 25개            |
| XS 미반영                                 | 4개             |

### isEmphasized/isQuiet 패턴

| 상태                        | 개수                                  |
| --------------------------- | ------------------------------------- |
| variant → boolean 전환 필요 | 8개                                   |
| 이미 boolean 패턴           | 2개 (ToggleButton, ToggleButtonGroup) |

---

## 6. ADR-023 실제 완료 판정

| Phase                           | ADR 기록 | 코드 실사 결과                                                                         |
| ------------------------------- | -------- | -------------------------------------------------------------------------------------- |
| Phase 1: variant rename         | 완료     | **미완료** — 42개 Spec에 M3 variant 잔존                                               |
| Phase 2: fillStyle/isEmphasized | 완료     | **부분 완료** — Button/Badge/ToggleButton만 적용, Checkbox/Switch/Slider 등 8개 미전환 |
| Phase 3: Badge named colors     | 완료     | **부분 완료** — 6종 누락 (gray, chartreuse, celery, seafoam, brown, cinnamon)          |
| size 네이밍 전환                | 범위 외  | **전체 미반영** — sm/md/lg → S/M/L/XL 전환 필요                                        |
| XL size 추가                    | 범위 외  | **25개 컴포넌트 미반영**                                                               |

---

## 7. Inspector Editor / Factory / Synthetic Style 노출 현황

### Inspector에서 variant/size 편집 가능한 컴포넌트

| 컴포넌트         | Editor 파일            | variant 편집          | size 편집                  | fillStyle 편집              |
| ---------------- | ---------------------- | --------------------- | -------------------------- | --------------------------- |
| **Button**       | ButtonEditor.tsx       | PropertySelect (6개)  | PropertySizeToggle (5단계) | PropertySelect (2개)        |
| **Card**         | CardEditor.tsx         | PropertySelect (3개)  | PropertySizeToggle         | -                           |
| **Badge**        | BadgeEditor.tsx        | PropertySelect (17개) | PropertySizeToggle (5단계) | PropertySelect (3개)        |
| **ToggleButton** | ToggleButtonEditor.tsx | -                     | PropertySizeToggle         | isEmphasized/isQuiet toggle |
| **Meter**        | MeterEditor.tsx        | PropertySelect (4개)  | -                          | -                           |
| **Link**         | LinkEditor.tsx         | PropertySelect (2개)  | -                          | -                           |

> **65+ 컴포넌트에 variant/size 편집 UI 없음** — TextField, TextArea, Select, ComboBox, NumberField, SearchField, Checkbox, Radio, Switch, Slider, Dialog, Popover, Tooltip, Disclosure, Form 등

### Factory 기본값 (생성 시)

| 컴포넌트                 | variant 기본값       | size 기본값 | 비고                    |
| ------------------------ | -------------------- | ----------- | ----------------------- |
| Button (NumberField 내)  | "default"            | "sm"        |                         |
| Card                     | "default"            | "md"        | orientation: "vertical" |
| Dialog                   | "primary"            | "md"        | M3 잔존                 |
| Pagination (내부 Button) | "accent"/"secondary" | "sm"        | fillStyle: "outline"    |
| ToggleButtonGroup        | -                    | "md"        | selectionMode: "single" |
| Calendar                 | "default"            | "md"        |                         |

> 대부분 Factory에서 **variant/size를 아예 지정하지 않음** (Spec defaultVariant/defaultSize에 의존)

### computedStyleService Synthetic Style 매핑

| 매핑 수준     | 컴포넌트                                                                                                  | 반환 속성                                           |
| ------------- | --------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| **완전 매핑** | Button, ToggleButton, TextField, TextArea, Select, ComboBox, NumberField, SearchField, Badge, Card, Input | fontSize, fontWeight, padding (4방향), borderRadius |
| **최소 매핑** | Checkbox, Radio, Switch, Slider, Link, Breadcrumbs                                                        | fontSize만                                          |
| **부분 매핑** | ProgressBar, Meter                                                                                        | fontSize, borderRadius                              |
| **매핑 없음** | List, ListBox, GridList, Tree, Tabs, Menu, Dialog, Popover, Tooltip, Toast, Disclosure, Form 등           | -                                                   |

---

## 8. 결론

**ADR-023은 사실상 미완료**. Button/Badge/ToggleButton/Meter/Link 5개만 S2 전환되었고, 나머지 60+ 컴포넌트에 M3 네이밍이 잔존. size 체계(sm→S)는 전혀 착수되지 않음. ADR 문서의 "Phase 1+2+3 완료" 기록은 코드 실사와 불일치하며 정정이 필요.

### 필요 작업 규모 추정

| 작업                                        | 대상          | 파일 수                                     |
| ------------------------------------------- | ------------- | ------------------------------------------- |
| variant M3→S2 rename (Spec)                 | 42개 컴포넌트 | ~42 spec.ts                                 |
| variant→boolean 전환 (isEmphasized/isQuiet) | 8개 컴포넌트  | ~8 spec.ts + Factory + Editor               |
| size 네이밍 전환 (sm→S, md→M, lg→L)         | 전체 72개     | ~72 spec.ts + computedStyleService + Editor |
| XL size 추가                                | 25개 컴포넌트 | ~25 spec.ts                                 |
| Inspector Editor 추가                       | 65+ 컴포넌트  | ~30 신규 Editor 파일                        |
| Synthetic Style 확장                        | 20+ 컴포넌트  | computedStyleService.ts                     |
| Badge named color 추가                      | 6종           | Badge.spec.ts + tokenResolver               |
