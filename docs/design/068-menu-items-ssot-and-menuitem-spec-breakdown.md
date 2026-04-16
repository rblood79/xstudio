# ADR-068 구현 상세 — Menu items SSOT + MenuItem Spec 신설

> **본 문서는 ADR-068의 구현 상세**. 결정 근거는 [068-menu-items-ssot-and-menuitem-spec.md](../adr/068-menu-items-ssot-and-menuitem-spec.md) 참조.

## Phase 구성

| Phase | 목표                                                        | 의존성     | Gate                                                   |
| ----- | ----------------------------------------------------------- | ---------- | ------------------------------------------------------ |
| P0    | 사전 조사 — 현재 코드 위치 정밀 매핑                        | -          | 변경 대상 파일 목록 확정                               |
| P1    | MenuItem Spec 신설 + CSS 자동 생성                          | P0         | `pnpm build:specs` MenuItem.css 신규 생성, type-check  |
| P2    | Menu Spec items prop 신설 + propagation 정리                | P1         | type-check, MenuSpec props에 items 추가                |
| P3    | Store 데이터 모델 — items reducer + 가상 MenuItem 인덱스    | P2         | items mutation reducer 단위 테스트                     |
| P4    | NavigationComponents factory — MenuItem element 생성 제거   | P3         | `createMenuDefinition` items=[3개] 기본값으로 생성     |
| P5    | Skia 가상 MenuItem 렌더 경로 (TabList 가상 Tab 패턴 재사용) | P3         | Builder Canvas Menu trigger 정상 height + popover 닫힘 |
| P6    | Inspector children-manager UI — items 편집                  | P3, P4     | 인스펙터 add/remove/edit 동작                          |
| P7    | 검증 — type-check + build:specs + Skia 시각 + Preview 시각  | P1~P6 전체 | ADR Gate 표 7항목 PASS                                 |

## P0. 사전 조사

### 변경 대상 파일

| 영역          | 파일                                                                          | 변경 유형                                  |
| ------------- | ----------------------------------------------------------------------------- | ------------------------------------------ |
| Spec          | `packages/specs/src/components/Menu.spec.ts`                                  | items prop 추가, propagation 재정의        |
| Spec (신설)   | `packages/specs/src/components/MenuItem.spec.ts`                              | 신규 파일                                  |
| Spec index    | `packages/specs/src/components/index.ts`                                      | MenuItem export 추가                       |
| Spec types    | `packages/specs/src/types/spec.types.ts` (필요시)                             | items prop 타입 helper 확인                |
| Specs root    | `packages/specs/src/index.ts`                                                 | MenuItemSpec re-export                     |
| Tag map       | `apps/builder/src/builder/workspace/canvas/skia/elements/tagSpecMap.ts`       | MenuItem: MenuItemSpec 등록                |
| Text-bearing  | `apps/builder/src/builder/workspace/canvas/skia/utils/specTextStyle.ts`       | MenuItem TEXT_BEARING_SPECS 등록           |
| Factory       | `apps/builder/src/builder/factories/definitions/NavigationComponents.ts`      | createMenuDefinition children 제거         |
| Store reducer | `apps/builder/src/builder/stores/elements/...` (items reducer 진입점)         | addMenuItem/removeMenuItem/updateMenuItem  |
| Skia 렌더     | `apps/builder/src/builder/workspace/canvas/skia/.../buildSpecNodeData.ts`     | 가상 MenuItem 자식 생성 (TabList 패턴)     |
| Skia hit test | `apps/builder/src/builder/workspace/canvas/skia/.../spatialIndex.ts` (필요시) | 가상 MenuItem id → Menu element 매핑       |
| Inspector UI  | `apps/builder/src/builder/properties/.../children-manager.tsx`                | Menu items 진입점 추가                     |
| Layer panel   | `apps/builder/src/builder/layers/...`                                         | MenuItem element 비표시 (가상 노드 미표시) |
| Preview       | `apps/builder/src/preview/specs/runtime/MenuRuntime.tsx` (또는 동등 위치)     | items prop 전달 + render function          |
| 마이그레이션  | (없음)                                                                        | 개발 단계 — 기존 저장 broken 수용          |

### 호출 지점 매핑

- `buildSpecNodeData.ts:736` — `spec.render.shapes(specProps, sizeSpec, componentState)` (Spec render 진입)
- `NavigationComponents.ts:14-65` — `createMenuDefinition` (factory)
- Menu.spec.ts:199-211 — `Item Management` field (children-manager)
- Menu.spec.ts:127 — propagation rule (`size → MenuItem`)

## P1. MenuItem Spec 신설

### 1-1. MenuItem.spec.ts 작성

```ts
// packages/specs/src/components/MenuItem.spec.ts
import type { ComponentSpec, Shape, TokenRef } from "../types";
// ... shape 정의 (Button-like roundRect + text + optional icon)
//
// Spec props:
//   id?: string
//   children?: string
//   textValue?: string  (Q1=a 결정으로 보류 — 후속 ADR)
//   isDisabled?: boolean (보류)
//
// sizes: Menu.sizes 매핑 (sm/md/lg/xl)
// states: hover/focusVisible/disabled
// render.shapes: roundRect bg + text (Button shape pattern 단순화)
```

핵심 결정:

- variants 미정의 (Menu가 단일 시각 스타일)
- defaultSize: "md"
- skipCSSGeneration: false (CSS 자동 생성)

### 1-2. CSS 생성 검증

`pnpm build:specs` → `packages/shared/src/components/styles/generated/MenuItem.css` 신규 생성. data-size 4종 셀렉터 (sm/md/lg/xl).

### 1-3. types/index export

```ts
// packages/specs/src/components/index.ts
export { MenuItemSpec } from "./MenuItem.spec";
export type { MenuItemProps } from "./MenuItem.spec";
```

## P2. Menu Spec items prop 신설

### 2-1. items 타입 정의

```ts
// Menu.spec.ts MenuProps 확장
export interface MenuItem {
  id: string;
  children: string;
}

export interface MenuProps {
  // ... 기존 props
  items?: MenuItem[]; // Q1=a 최소 props
}
```

### 2-2. defaultProps + properties 변경

- properties.sections "Item Management" 필드 → `type: "items-manager"` (또는 기존 children-manager 재활용 + items 모드)
- `defaultChildProps`/`childTag` 필드 폐기 (element tree 미사용)

### 2-3. propagation 정리

- 기존 `{ parentProp: "size", childPath: "MenuItem", override: true }` 제거 (MenuItem element 미존재)
- 가상 MenuItem 렌더 시 size는 Menu props에서 직접 주입

## P3. Store 데이터 모델

### 3-1. items reducer

```ts
// stores/elements 슬라이스
function addMenuItem(menuId: string, item?: Partial<MenuItem>) {
  const menu = elementsMap.get(menuId);
  if (!menu || menu.tag !== "Menu") return;
  const items = menu.props.items ?? [];
  const newItem: MenuItem = {
    id: item?.id ?? crypto.randomUUID(),
    children: item?.children ?? "Menu Item",
  };
  updateElementProps(menuId, { items: [...items, newItem] });
  // 자동: layoutVersion bump (items 변화 → Menu trigger 재렌더, popover 컨텐츠 재계산)
}

function removeMenuItem(menuId: string, itemId: string) {
  const menu = elementsMap.get(menuId);
  const items = (menu?.props.items ?? []).filter((i) => i.id !== itemId);
  updateElementProps(menuId, { items });
}

function updateMenuItem(
  menuId: string,
  itemId: string,
  patch: Partial<MenuItem>,
) {
  const menu = elementsMap.get(menuId);
  const items = (menu?.props.items ?? []).map((i) =>
    i.id === itemId ? { ...i, ...patch } : i,
  );
  updateElementProps(menuId, { items });
}
```

### 3-2. 가상 MenuItem 인덱스 (옵션)

가상 MenuItem이 spatialIndex에서 hit test 필요 시:

- 식별자: `${menuId}:virtualMenuItem:${itemId}` (ADR-066 Tab 패턴)
- popover 닫힘이 기본이므로 Builder Canvas hit test 미발생 → 인덱스 불요

## P4. NavigationComponents factory

### 4-1. createMenuDefinition 변경

```ts
// Before: children: [MenuItem×3]
// After:
export function createMenuDefinition(...) {
  return {
    tag: "Menu",
    props: {
      size: "md",
      items: [
        { id: crypto.randomUUID(), children: "Menu Item 1" },
        { id: crypto.randomUUID(), children: "Menu Item 2" },
        { id: crypto.randomUUID(), children: "Menu Item 3" },
      ],
    },
    // children 필드 제거
  };
}
```

### 4-2. element 삭제 시 cascade 미필요

items은 Menu element props에 포함 → Menu 삭제 시 items도 함께 삭제 (별도 cascade 불요).

## P5. Skia 가상 MenuItem 렌더 경로

### 5-1. 결정 사항

Q5=(i) — popover 항상 닫힘. Builder Canvas에는 Menu trigger만 표시.

→ **Skia 렌더 경로에서 가상 MenuItem 자식 생성 미필요**. Menu trigger만 자체 shapes로 렌더 (현 Menu.spec.ts:215 render 그대로).

### 5-2. Menu height 정상화

현재: 자식 0 합산 → height 0
적용 후: items이 props라 자식 element 부재 → Menu Spec의 `paddingY * 2 + fontSize` 기반 자체 height 계산 → 정상

→ `_hasChildren` 분기 미발생 → spec render의 trigger 텍스트 + bg가 layout intrinsic size 결정 → 정상 height.

### 5-3. (보류) Builder popover preview

Q5=(i) 채택으로 본 ADR 범위 외. 후속 UX ADR 가능.

## P6. Inspector children-manager UI

### 6-1. 기존 children-manager 분기 추가

```ts
// inspector field type "children-manager" 처리
// 기존: store에 자식 element add/remove
// 신규 분기 ("items-manager" 또는 mode): items 배열 mutation reducer 호출
```

### 6-2. Menu inspector "Item Management" section

- Add Item 버튼 → `addMenuItem(menuId)` dispatch
- Remove → `removeMenuItem(menuId, itemId)` dispatch
- Edit children → `updateMenuItem(menuId, itemId, { children })` dispatch
- 빈 메뉴 허용 (Q3) → minimum guard 미적용

## P7. 검증 (Gate)

| #   | 검증 항목                 | 통과 조건                                                       |
| --- | ------------------------- | --------------------------------------------------------------- |
| 1   | `pnpm build:specs`        | 107 → **108** CSS 생성 (MenuItem.css 신규 추가)                 |
| 2   | `pnpm type-check`         | 3/3 successful                                                  |
| 3   | 신규 Menu 요소 삽입       | items=[3개] 기본 + Menu trigger Skia 정상 height (CSS와 동일)   |
| 4   | Inspector Item Management | items add/remove/edit → Skia/Preview 동기 반영                  |
| 5   | Preview 동작              | Menu 클릭 → popover 열림 → MenuItem 3개 정상 표시 (RAC 동작)    |
| 6   | Skia 시각                 | Menu trigger 정상 (popover 닫힘 상태) — 0-height 버그 해소 확인 |
| 7   | 마이그레이션 미수행 확인  | 기존 저장된 Menu element 자식 broken 수용 (개발 단계 명시 결정) |

## Risk Threshold Check (재확인)

| 대안     | HIGH+ | 잔존 위험                                           |
| -------- | ----- | --------------------------------------------------- |
| E (선택) | 0     | MenuItem Spec 신설 + 가상 렌더 경로 학습 비용 (LOW) |

## Phase별 commit 분할

- C1 (P0~P1): MenuItem Spec 신설 + CSS 생성
- C2 (P2~P3): Menu items prop + Store reducer
- C3 (P4): factory 변경
- C4 (P5): Skia trigger height 검증
- C5 (P6): Inspector UI
- C6 (P7): 검증 + 문서

## 잠재적 회귀

- 기존 저장된 Menu element 자식(MenuItem) — 개발 단계 broken 수용
- propagation rule `size → MenuItem` 제거로 인한 MenuItem element가 잔존하는 페이지 영향 — broken 수용 범위
- Layer panel에서 Menu element는 자식 0 표시 (정상)

## 후속 작업 (별도 ADR)

- Select/ComboBox/SelectItem/ComboBoxItem 동일 패턴 적용 (Q4=별도 ADR)
- MenuItem 풀 props (`textValue`, `isDisabled`, `icon`) (Q1=a 결정으로 보류)
- Builder popover preview UX (Q5=(iii) 옵션) — 후속 UX ADR
