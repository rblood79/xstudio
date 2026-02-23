# Child Composition Pattern — 미적용 컴포넌트 분류 (38개)

> **작성일**: 2026-02-24
> **상태**: 분류 완료, 전환 미착수
> **관련**: `docs/COMPONENT_SPEC_ARCHITECTURE.md` §9.13

---

## 배경

자식 조합 패턴(Child Composition Pattern) 전환 작업에서 20개 컴포넌트가 전환 완료되었다.
전체 61개 spec 중 23개에 `_hasChildren` / `_hasLabelChild` 패턴이 적용되어 있으며,
나머지 38개는 미적용 상태이다. 이 문서는 38개 컴포넌트의 전환 필요성을 분류한다.

---

## 분류 기준

| 분류 | 설명 | 전환 필요 |
|------|------|----------|
| A. 이미 다른 메커니즘으로 처리 | CONTAINER_TAGS + 자체 주입 패턴 사용 | ❌ |
| B. Leaf 컴포넌트 | 자식 없는 단일 요소, 자체 텍스트 렌더링 | ❌ |
| C. Inline Form | indicator + label 구조, `_hasLabelChild` 등록 가능 | ⚠️ 검토 |
| D. Sub-component | 다른 컴포넌트의 자식 요소 | ❌ |
| E. 잠재적 전환 대상 | 자식 구조 가능성 있음, 개별 검토 필요 | ⚠️ 검토 |

---

## A. 이미 다른 메커니즘으로 처리 (4개) — 전환 불필요

CONTAINER_TAGS에 등록되어 자체 자식 렌더링 메커니즘이 존재한다.
`_hasChildren` spec 패턴과는 다른 방식으로 동일한 목표를 달성하고 있다.

| 컴포넌트 | 현재 메커니즘 | 비고 |
|---------|-------------|------|
| **Card** | CONTAINER_TAGS + Heading/Description 자식 주입 | `createContainerChildRenderer`에서 heading→Heading, description→Description props sync |
| **Tabs** | CONTAINER_TAGS + `_tabLabels` 주입 | Tab bar는 spec shapes, Panel은 container child rendering |
| **Breadcrumbs** | CONTAINER_TAGS + `_crumbs` 배열 주입 | 자식 Breadcrumb 텍스트를 spec shapes가 직접 렌더링 |
| **TagGroup** | CONTAINER_TAGS + Label/TagList 자식 배치 | BoxSprite 기반 컨테이너, spec shapes는 배경만 |

---

## B. Leaf 컴포넌트 (10개) — 전환 불필요

자식 Element가 없는 단일 렌더링 요소. 자체 텍스트/시각 요소를 spec shapes로 완결한다.
DOM 구조상 자식 분리가 불필요하거나 의미가 없다.

| 컴포넌트 | 이유 |
|---------|------|
| **Button** | 단일 텍스트 + 배경. 자식 분리 불필요 |
| **Badge** | 단일 텍스트 + 배경. 라벨만 표시 |
| **Link** | 단일 텍스트. 인라인 요소 |
| **ToggleButton** | Button과 동일 구조, 토글 상태만 추가 |
| **Input** | TextField의 자식 요소. 자체가 leaf |
| **Separator** | 텍스트 없음. 선 하나만 렌더링 |
| **Skeleton** | placeholder 시각 요소. 텍스트 없음 |
| **Slot** | 구조적 플레이스홀더. 시각 요소 없음 |
| **ProgressBar** | 시각 인디케이터. 텍스트 없음 (라벨은 외부) |
| **Meter** | 시각 인디케이터. ProgressBar와 유사 |

---

## C. Inline Form 컴포넌트 (3개) — 검토 필요

indicator + label 구조를 가지며, `_hasLabelChild` 패턴으로 부분 스킵이 가능하다.
현재 Select/ComboBox/Slider에만 적용된 `_hasLabelChild`를 확장할 수 있다.

| 컴포넌트 | 현재 상태 | 전환 시 구조 | 우선순위 |
|---------|----------|------------|---------|
| **Checkbox** | spec shapes가 indicator + label 전체 렌더링 | Checkbox > CheckIndicator + Label | 낮음 — 단순 구조, 현재 동작 안정 |
| **Radio** | 동일 | Radio > RadioIndicator + Label | 낮음 |
| **Switch** | 동일 (track + thumb + label) | Switch > SwitchTrack + Label | 낮음 |

**판단**: Checkbox/Radio/Switch는 indicator가 spec shapes로 그려지는 것이 자연스럽다.
Label만 분리하면 `_hasLabelChild` 패턴 적용 가능하나, 현재 안정적으로 동작하므로 우선순위 낮음.

---

## D. Sub-component (5개) — 전환 불필요

다른 복합 컴포넌트의 자식 요소로 사용되며, 독립적으로 자식 조합 패턴이 필요하지 않다.

| 컴포넌트 | 부모 컴포넌트 | 비고 |
|---------|-------------|------|
| **ColorArea** | ColorPicker | 2D 그래디언트 영역 |
| **ColorSlider** | ColorPicker | 색상 슬라이더 |
| **ColorSwatch** | ColorSwatchPicker | 단일 색상 칩 |
| **ColorWheel** | ColorPicker | 색상 휠 |
| **Panel** | Tabs, Disclosure | 콘텐츠 패널 영역 |

---

## E. 잠재적 전환 대상 (16개) — 개별 검토 필요

자식 구조를 가질 수 있으며, 전환 시 Layer 트리 편집성이 향상될 수 있다.
우선순위와 복잡도를 기준으로 3단계로 분류한다.

### E-1. 높은 우선순위 (4개)

구조가 명확하고 기존 패턴과 유사하여 즉시 전환 가능.

| 컴포넌트 | 예상 자식 구조 | 유사 패턴 |
|---------|-------------|----------|
| **TextArea** | Label + TextArea + FieldError | TextField와 동일 |
| **Form** | Label + FieldGroup(자식 필드들) | 컨테이너, Dialog와 유사 |
| **ToggleButtonGroup** | ToggleButton × N | CheckboxGroup/RadioGroup과 동일 |
| **Switcher** | ToggleButton × N (탭형 전환) | ToggleButtonGroup과 유사 |

### E-2. 중간 우선순위 (6개)

자식 구조가 존재하나 반복 아이템 렌더링이 필요하여 추가 설계가 필요.

| 컴포넌트 | 예상 자식 구조 | 복잡도 | 비고 |
|---------|-------------|-------|------|
| **Table** | TableHeader + TableBody > TableRow > TableCell | 높음 | 3단계 중첩, 행/열 반복 |
| **List** | ListItem × N | 중간 | 동적 아이템 수 |
| **ListBox** | ListBoxItem × N | 중간 | 선택 상태 관리 |
| **GridList** | GridListItem × N | 중간 | 그리드 배치 |
| **Pagination** | PageButton × N + Prev/Next | 중간 | 동적 페이지 수 |
| **ColorSwatchPicker** | ColorSwatch × N | 낮음 | 단순 그리드 |

### E-3. 낮은 우선순위 (6개)

컨테이너 역할이 주이며 자체 시각 요소가 적어 전환 효과가 제한적.

| 컴포넌트 | 이유 |
|---------|------|
| **Group** | 범용 컨테이너, 배경/테두리만. 자식은 임의 요소 |
| **Section** | 구조적 컨테이너. Group과 유사 |
| **ScrollBox** | 스크롤 영역 컨테이너. 시각 요소 최소 |
| **DropZone** | 드래그 앤 드롭 타겟. 상태 기반 시각 변경 |
| **FileTrigger** | 파일 선택 트리거 버튼. Button과 유사 |
| **MaskedFrame** | 마스킹 컨테이너. 시각 프레임만 |

---

## 요약

| 분류 | 개수 | 전환 필요 |
|------|------|----------|
| A. 이미 다른 메커니즘 | 4 | ❌ |
| B. Leaf 컴포넌트 | 10 | ❌ |
| C. Inline Form | 3 | ⚠️ 낮음 |
| D. Sub-component | 5 | ❌ |
| E-1. 높은 우선순위 | 4 | ✅ 즉시 가능 |
| E-2. 중간 우선순위 | 6 | ⚠️ 추가 설계 |
| E-3. 낮은 우선순위 | 6 | ⚠️ 효과 제한적 |
| **합계** | **38** | |

**전환 불필요**: 19개 (A+B+D)
**검토 필요**: 19개 (C+E)
**즉시 전환 가능**: 4개 (E-1: TextArea, Form, ToggleButtonGroup, Switcher)

---

## 다음 단계

1. **E-1 (4개)** 즉시 전환 — TextArea, Form, ToggleButtonGroup, Switcher
2. **C (3개)** `_hasLabelChild` 패턴 적용 검토 — Checkbox, Radio, Switch
3. **E-2 (6개)** 반복 아이템 패턴 설계 후 전환
4. **E-3 (6개)** 필요 시 전환
