# Child Composition Pattern — 미적용 컴포넌트 분류 (38개)

> **작성일**: 2026-02-24
> **상태**: E-1 ✅ 완료, C ✅ 완료, E-2 진행 중
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

## C. Inline Form 컴포넌트 (3개) — ✅ 완료

`_hasLabelChild` 패턴 적용 완료. indicator는 spec shapes 유지, label만 자식 Element로 분리.

| 컴포넌트 | 적용 패턴 | 커밋 |
|---------|----------|------|
| **Checkbox** | `_hasLabelChild` → label text 스킵, indicator 유지 | `dfae0947` |
| **Radio** | 동일 | `dfae0947` |
| **Switch** | `_hasLabelChild` → label text 스킵, track+thumb 유지 | `dfae0947` |

**구현 세부**: Factory에 Label 자식 정의 추가, CONTAINER_TAGS 등록, props sync (children/label → Label.children).

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

### E-1. 높은 우선순위 (4개) — ✅ 완료

| 컴포넌트 | 적용 패턴 | 커밋 |
|---------|----------|------|
| **TextArea** | TRANSPARENT — Label + Input(h:80) + FieldError | `ea23d5fa` |
| **Form** | NON-TRANSPARENT — bg+border 유지, Heading + Description 자식 추가 | `ea23d5fa` |
| **ToggleButtonGroup** | NON-TRANSPARENT — bg+border 유지, container shape 스킵 | `ea23d5fa` |
| **Switcher** | NON-TRANSPARENT — track+border+active indicator 유지, tab text 스킵 | `ea23d5fa` |

### E-2. 중간 우선순위 (6개) — 5개 ✅ 완료, 1개 보류

| 컴포넌트 | 적용 패턴 | 상태 |
|---------|----------|------|
| **List** | NON-TRANSPARENT — bg+container 유지, ListItem(TEXT_TAGS) 자식 | ✅ 완료 |
| **ListBox** | NON-TRANSPARENT — bg+border 유지, ListBoxItem(TEXT_TAGS 추가) 자식 | ✅ 완료 |
| **GridList** | NON-TRANSPARENT — bg+border 유지, GridListItem(TEXT_TAGS 추가) 자식 | ✅ 완료 |
| **Pagination** | NON-TRANSPARENT — container 유지, Button 자식 | ✅ 완료 |
| **ColorSwatchPicker** | NON-TRANSPARENT — bg 유지, ColorSwatch(spec 있음) 자식 | ✅ 완료 |
| **Table** | 3단계 중첩 + 특수 렌더 파이프라인, 별도 작업 필요 | ⏳ 보류 |

**구현 세부**: ListBoxItem/GridListItem → TEXT_TAGS 추가로 텍스트 렌더링.
SPEC_SHAPES_ONLY_TAGS에서 ListBox/GridList 제거 → CONTAINER_TAGS로 이동.

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
| C. Inline Form | 3 | ✅ 완료 |
| D. Sub-component | 5 | ❌ |
| E-1. 높은 우선순위 | 4 | ✅ 완료 |
| E-2. 중간 우선순위 | 6 | ✅ 5개 완료, Table 보류 |
| E-3. 낮은 우선순위 | 6 | ⚠️ 효과 제한적 |
| **합계** | **38** | |

**전환 불필요**: 19개 (A+B+D)
**전환 완료**: 12개 (E-1: 4개 + C: 3개 + E-2: 5개)
**보류**: 1개 (Table — 3단계 중첩 별도 작업)
**검토 필요**: 6개 (E-3)

---

## 다음 단계

1. ~~**E-1 (4개)** 즉시 전환~~ ✅ `ea23d5fa`
2. ~~**C (3개)** `_hasLabelChild` 패턴 적용~~ ✅ `dfae0947`
3. ~~**E-2 (5개)** 반복 아이템 패턴 전환~~ ✅ List, ListBox, GridList, Pagination, ColorSwatchPicker
4. **Table** 별도 작업 — 3단계 중첩(Table→TableRow→TableCell) + 특수 PixiTable 렌더 파이프라인
5. **E-3 (6개)** 필요 시 전환
