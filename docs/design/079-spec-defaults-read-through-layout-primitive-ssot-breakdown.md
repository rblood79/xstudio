# ADR-079 Breakdown — Spec defaults read-through + Layout primitive SSOT 완전화

> ADR: [079-spec-defaults-read-through-layout-primitive-ssot.md](../adr/079-spec-defaults-read-through-layout-primitive-ssot.md)

본 문서는 Phase 별 구현 상세를 담는다. ADR 본문은 Context/Alternatives/Decision/Gates 의 의사결정 축만 보유.

## Phase 0 — 착수 전 감사 (G0)

### 0.1 `containerStyles` 보유 Spec 목록 감사

```bash
grep -l "containerStyles:" packages/specs/src/components/*.spec.ts
```

현재 예상 대상:

- `ListBoxSpec` (ADR-078 도입)
- `MenuSpec` (ADR-071)
- `SelectSpec` / `ComboBoxSpec` (확인 필요)

P1/P2 적용 범위를 확정하고, containerStyles 미보유 Spec 은 이번 ADR scope 밖.

### 0.2 `rearrangeShapesForColumn` 사용 Spec 확증

```bash
grep -l "isColumn\|rearrangeShapesForColumn" apps/builder/src/builder/workspace/canvas/skia/
```

현재 호출 위치: `buildSpecNodeData.ts:572-580` 의 `isColumn` 판정.

사용 의도 확증 대상:

- Checkbox (indicator ↔ label 수직 배치)
- Radio (동일 패턴)
- Switch (indicator ↔ label 수직 배치)

각 Spec 의 `render.shapes` 에서 column 레이아웃을 **자체 처리하지 않고** `rearrange` 후처리에 의존하는지 확인. 만약 자체 column 배치를 이미 수행하면 화이트리스트에서도 제외.

## Phase 1 — `ContainerStylesSchema.alignItems` 필드 (G1)

### 1.1 타입 확장

`packages/specs/src/types/spec.types.ts:59-82`

```ts
export interface ContainerStylesSchema {
  // ... 기존 필드
  display?: "flex" | "inline-flex" | "grid" | "block" | "inline-block";
  flexDirection?: "row" | "column" | "row-reverse" | "column-reverse";
  /** ADR-079: flex 교차축 정렬 — archetype base alignItems 를 Spec 이 override. */
  alignItems?: "stretch" | "flex-start" | "flex-end" | "center" | "baseline";
  // ...
}
```

### 1.2 CSSGenerator emit

`packages/specs/src/renderers/CSSGenerator.ts:emitContainerStyles` — 기존 `display/flexDirection` emit 블록 직후.

```ts
if (c.alignItems) lines.push(`  align-items: ${c.alignItems};`);
```

### 1.3 Spec 선언

`packages/specs/src/components/ListBox.spec.ts:containerStyles`:

```ts
containerStyles: {
  // ...
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start", // ADR-079: 수동 CSS override 해체
  // ...
},
```

### 1.4 수동 CSS 해체

`packages/shared/src/components/styles/ListBox.css` 의 `.react-aria-ListBoxItem` 수동 블록에서 `align-items: flex-start;` 줄 삭제. 관련 주석(`Generator archetype="simple" 이 emit 한 align-items: center 를 override`) 도 제거.

### 1.5 검증

- `pnpm build:specs` → `generated/ListBox.css` 에 `align-items: flex-start;` emit 확인
- `pnpm vitest --run --update` → snapshot 1 updated (ListBox 의 `align-items` 라인 추가)
- `pnpm type-check` 3/3 PASS

## Phase 2 — Style Panel hook Spec read-through (G2)

### 2.1 공통 resolver 신설

`apps/builder/src/builder/panels/styles/hooks/useLayoutAuxiliary.ts` 에 `resolveContainerStyleDefault` 헬퍼 추가.

```ts
import { TAG_SPEC_MAP } from "@composition/specs/runtime/tagToElement";

function resolveContainerStyleDefault(
  tag: string | undefined,
  property: "display" | "flexDirection" | "alignItems" | "gap" | "padding",
): string {
  if (!tag) return "";
  const spec = TAG_SPEC_MAP[tag];
  const value = spec?.containerStyles?.[property];
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  return "";
}
```

### 2.2 훅 fallback 체인

기존:

```ts
function useDisplay(id: string | null): string {
  const inline = useStyleProp(id, "display");
  return inline || "block";
}
```

신규:

```ts
function useDisplay(id: string | null): string {
  const inline = useStyleProp(id, "display");
  const element = useStore((s) => (id ? s.elementsMap.get(id) : undefined));
  return (
    inline || resolveContainerStyleDefault(element?.tag, "display") || "block"
  );
}
```

`useFlexDirection` 동일 패턴. 다른 layout 훅(`useFlexAlignmentKeys`/`useFlexWrapKeys` 등) 도 필요 시 확장.

### 2.3 검증

- 기존 ListBox instance (store 에 display 미저장) 의 Style Panel 에서 Direction 토글이 `column` 으로 표시 — MCP 실측
- 신규 ListBox (factory store 에 display 있음) 도 동일 표시 — 편집 경로 불변
- Preview DOM 경로 영향 없음

## Phase 3 — Factory 중복 주입 제거 (G3)

### 3.1 `createListBoxDefinition` 정리

`apps/builder/src/builder/factories/definitions/SelectionComponents.ts:createListBoxDefinition`

```ts
props: {
  orientation: "vertical",
  selectionMode: "single",
  items,
  style: {
    width: "100%", // 유일한 사용자 커스터마이징 기본 — 나머지는 Spec SSOT
  },
},
```

제거:

- `display: "flex"`
- `flexDirection: "column"`
- `gap: 2`
- `padding: 4`

이들은 P2 의 read-through 가 Spec 에서 fallback 공급.

### 3.2 `implicitStyles.ts` ListBox 분기 검토

`apps/builder/src/builder/workspace/canvas/layout/engines/implicitStyles.ts:662-678` 에서 display/flexDirection/gap/padding fallback 이 Spec containerStyles 와 중복. P2 가 Panel 경로, implicitStyles 는 layout engine 경로로 각각 fallback 이 필요하므로 **유지 (scope 분리)**.

단 각 값이 `ListBoxSpec.containerStyles` 와 정합한지 확인하고 drift 시 경보.

### 3.3 검증

- 신규 ListBox 생성 시 store.props.style = `{ width: "100%" }` 만 — devtools 확인
- Style Panel 에서 Direction/Gap/Padding 모두 정상 표시 (P2 read-through)
- Canvas Skia / Preview CSS 시각 불변

## Phase 4 — `rearrangeShapesForColumn` 화이트리스트 (G4)

### 4.1 블랙리스트 → 화이트리스트 전환

`apps/builder/src/builder/workspace/canvas/skia/buildSpecNodeData.ts:572-580`

기존:

```ts
const COLUMN_REARRANGE_EXCLUDE_TAGS = new Set(["ListBox", "GridList"]);
const isColumn =
  !COLUMN_REARRANGE_EXCLUDE_TAGS.has(element.tag) &&
  (flexDir === "column" || flexDir === "column-reverse");
```

신규:

```ts
// ADR-079: rearrangeShapesForColumn 은 Checkbox/Radio/Switch 전용 indicator↔label 재배치.
//   다른 column-based 컴포넌트가 render.shapes 에서 자체 배치를 수행하면 rearrange 가 파손 유발.
//   화이트리스트로 실제 사용 태그만 명시.
const COLUMN_REARRANGE_TAGS = new Set(["Checkbox", "Radio", "Switch"]);
const isColumn =
  COLUMN_REARRANGE_TAGS.has(element.tag) &&
  (flexDir === "column" || flexDir === "column-reverse");
```

### 4.2 검증

- Checkbox/Radio/Switch flex column 모드 snapshot 회귀 0
- MCP 시각 확인: indicator 가 상단 가운데 + label 이 하단 가운데 (기존 동작 유지)
- ListBox/GridList rearrange 미적용 유지 (ADR-078 회귀 방지)

## Phase 5 — 종결 검증 (G5)

### 5.1 Cross-check

```
/cross-check ListBox ListBoxItem Checkbox Radio Switch
```

5-레이어 (Spec/Factory/CSS/WebGL/Preview) 정합성 확인.

### 5.2 Parallel-verify

```
/sweep ListBox GridList Menu Select ComboBox Tabs Checkbox Radio Switch
```

Collection family + column-rearrange family 일괄 snapshot + 시각 회귀 0.

### 5.3 최종 게이트

- `pnpm type-check` 3/3 PASS
- `pnpm vitest --run` 149+/149+ PASS
- `pnpm build:specs` 109+ files PASS
- MCP 시각 회귀: ListBox/ListBoxItem/Checkbox/Radio/Switch 각 컴포넌트에서 padding/gap/direction 편집 → 3경로(Preview/Canvas/Panel) 동일 반영

## 회귀 리스크 매트릭스

| 축            | P1                                            | P2                                        | P3                       | P4                                                       |
| ------------- | --------------------------------------------- | ----------------------------------------- | ------------------------ | -------------------------------------------------------- |
| Preview DOM   | 없음                                          | 없음                                      | 없음                     | 없음                                                     |
| Canvas Skia   | 미미 (수동 CSS 해체로 Generator emit 만 남음) | 없음                                      | 없음                     | 높음 (Checkbox/Radio/Switch 회귀 감시)                   |
| Style Panel   | 없음                                          | 높음 (hook 리팩토링 — 모든 컴포넌트 파급) | 중간 (신규 ListBox 경로) | 없음                                                     |
| Snapshot test | 1 updated (ListBox)                           | 0                                         | 0                        | 최대 3 updated (Checkbox/Radio/Switch 분기 조건 변경 시) |

## 후속 과제 (본 ADR scope 밖)

- `useLayoutAuxiliary` 의 다른 훅(`useFlexAlignmentKeys`/`useJustifyContentSpacingKeys` 등) 도 필요 시 read-through 확장
- Menu/Select/ComboBox 의 `containerStyles` 확장 (display/flexDirection/alignItems)
- `rearrangeShapesForColumn` 자체를 `render.shapes` 내부로 이관하여 별도 후처리 제거 (장기)
