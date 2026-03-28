# ADR-046 S2 계약 확장 + ADR-045 잔여 통합 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 5개 컴포넌트(Tabs, Breadcrumbs, Tooltip, Popover, Menu)의 S2 계약 props를 Spec → Shared → Preview 전 경로에 걸쳐 E2E 구현하고, ADR-045/046 문서를 업데이트한다.

**Architecture:** 컴포넌트 단위 순차 구현. 각 컴포넌트마다 (1) Spec props 인터페이스 + properties 필드 추가 (2) Shared component에서 props 수용 (3) LayoutRenderers.tsx 렌더 함수에서 props 전달 (4) 타입 체크 검증의 사이클을 완료한다.

**Tech Stack:** TypeScript, React Aria Components, ComponentSpec (packages/specs), LayoutRenderers (packages/shared)

---

## 파일 구조

| 컴포넌트    | Spec                                                                                                                               | Shared Component                                 | Renderer                                                      | CSS                                                     |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------- | ------------------------------------------------------- |
| Tabs        | `packages/specs/src/components/Tabs.spec.ts`                                                                                       | `packages/shared/src/components/Tabs.tsx`        | `packages/shared/src/renderers/LayoutRenderers.tsx:103-227`   | (이미 구현)                                             |
| Breadcrumbs | `packages/specs/src/components/Breadcrumbs.spec.ts`                                                                                | `packages/shared/src/components/Breadcrumbs.tsx` | `packages/shared/src/renderers/LayoutRenderers.tsx:1025-1072` | `packages/shared/src/components/styles/Breadcrumbs.css` |
| Tooltip     | `packages/specs/src/components/Tooltip.spec.ts`                                                                                    | `packages/shared/src/components/Tooltip.tsx`     | `packages/shared/src/renderers/LayoutRenderers.tsx:694-733`   | (이미 구현)                                             |
| Popover     | `packages/specs/src/components/Popover.spec.ts`                                                                                    | `packages/shared/src/components/Popover.tsx`     | `packages/shared/src/renderers/LayoutRenderers.tsx:768-802`   | (이미 구현)                                             |
| Menu        | `packages/specs/src/components/Menu.spec.ts`                                                                                       | `packages/shared/src/components/Menu.tsx`        | `packages/shared/src/renderers/LayoutRenderers.tsx:1583-1607` | (이미 구현)                                             |
| 문서        | `docs/adr/045-s2-property-editor-alignment.md`, `docs/adr/046-s2-contract-expansion-form-colorfield-tabs.md`, `docs/adr/README.md` |                                                  |                                                               |                                                         |

---

### Task 1: Tabs — density E2E 검증

**Files:**

- Verify: `packages/specs/src/components/Tabs.spec.ts:54-61` (density field)
- Verify: `packages/shared/src/components/Tabs.tsx:38,142` (density prop, data-density)
- Verify: `packages/shared/src/renderers/LayoutRenderers.tsx:166-169` (density 전달)

Tabs의 density는 탐색 결과 Spec → Shared → Renderer 전 경로에 이미 구현되어 있다. 검증만 수행한다.

- [ ] **Step 1: Spec properties에 density field 존재 확인**

`packages/specs/src/components/Tabs.spec.ts`의 properties.sections에서 Appearance 섹션 내 density field가 있는지 확인. 라인 54-61에 다음이 있어야 함:

```typescript
{
  key: "density",
  type: "enum",
  label: "Density",
  icon: Ratio,
  options: [
    { value: "compact", label: "Compact" },
    { value: "regular", label: "Regular" },
  ],
},
```

- [ ] **Step 2: Shared component에서 data-density 전달 확인**

`packages/shared/src/components/Tabs.tsx` 라인 142 부근에서 `data-density={density}` 설정 확인.

- [ ] **Step 3: LayoutRenderers에서 density 전달 확인**

`packages/shared/src/renderers/LayoutRenderers.tsx` 라인 166-169에서 `density` prop이 Tabs 컴포넌트에 전달되는지 확인.

- [ ] **Step 4: 타입 체크**

```bash
cd apps/builder && pnpm exec tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 5: 검증 완료 노트**

Tabs density는 E2E 완전 구현 확인됨. 추가 코드 변경 불필요.

---

### Task 2: Breadcrumbs — size E2E 검증 및 렌더러 보강

**Files:**

- Verify: `packages/specs/src/components/Breadcrumbs.spec.ts` (size in properties)
- Verify: `packages/shared/src/components/Breadcrumbs.tsx:109-110` (data-size)
- Verify: `packages/shared/src/components/styles/Breadcrumbs.css:84-114` ([data-size] 스타일)
- Modify: `packages/shared/src/renderers/LayoutRenderers.tsx:1049-1071` (size prop 전달)

- [ ] **Step 1: Spec에 size field가 properties에 있는지 확인**

`packages/specs/src/components/Breadcrumbs.spec.ts`의 properties.sections 확인. Appearance 섹션에 `{ type: "size" }` 필드가 있어야 한다. 없으면 추가:

```typescript
{
  title: "Appearance",
  fields: [
    { type: "size" },
  ],
},
```

- [ ] **Step 2: Shared component에서 data-size 전달 확인**

`packages/shared/src/components/Breadcrumbs.tsx` 라인 109-110에서 `data-size={size}` 설정 확인.

- [ ] **Step 3: CSS [data-size] 스타일 확인**

`packages/shared/src/components/styles/Breadcrumbs.css` 라인 84-114에서 `[data-size="sm"]`, `[data-size="md"]`, `[data-size="lg"]` 스타일 확인.

- [ ] **Step 4: LayoutRenderers renderBreadcrumbs에서 size 전달**

`packages/shared/src/renderers/LayoutRenderers.tsx`의 `renderBreadcrumbs` 함수 (라인 1025-1072)에서 Breadcrumbs 컴포넌트에 `size` prop을 전달하는지 확인. 전달하지 않으면 추가:

```typescript
<Breadcrumbs
  // ... existing props
  size={element.props.size as ComponentSize | undefined}
>
```

- [ ] **Step 5: 타입 체크**

```bash
cd apps/builder && pnpm exec tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add packages/shared/src/renderers/LayoutRenderers.tsx packages/specs/src/components/Breadcrumbs.spec.ts
git commit -m "feat(breadcrumbs): complete size E2E — renderer prop 전달 추가"
```

---

### Task 3: Tooltip — overlay positioning props 추가

**Files:**

- Modify: `packages/specs/src/components/Tooltip.spec.ts` (Props 인터페이스 + properties fields)
- Modify: `packages/shared/src/renderers/LayoutRenderers.tsx:694-733` (renderTooltip에서 props 전달)

Tooltip shared component (`Tooltip.tsx`)는 React Aria `TooltipProps`를 상속하므로 `containerPadding`, `crossOffset`, `shouldFlip`은 이미 타입에 포함된다. 하지만 이 props는 `<TooltipTrigger>`에 속하므로, 렌더러에서 trigger에 전달해야 한다.

- [ ] **Step 1: Tooltip.spec.ts Props 인터페이스에 props 추가**

`packages/specs/src/components/Tooltip.spec.ts`의 `TooltipProps` 인터페이스 (라인 18-35)에 추가:

```typescript
export interface TooltipProps {
  // ... existing props
  containerPadding?: number;
  crossOffset?: number;
  shouldFlip?: boolean;
}
```

- [ ] **Step 2: Tooltip.spec.ts properties에 fields 추가**

State 섹션이 없으면 생성, 있으면 fields에 추가. lucide-react 아이콘도 import:

```typescript
import { ..., Maximize, MoveHorizontal, FlipVertical } from "lucide-react";

// properties.sections에 추가:
{
  title: "State",
  fields: [
    { key: "containerPadding", type: "number", label: "Container Padding", icon: Maximize, min: 0, step: 1 },
    { key: "crossOffset", type: "number", label: "Cross Offset", icon: MoveHorizontal, step: 1 },
    { key: "shouldFlip", type: "boolean", label: "Should Flip", icon: FlipVertical },
  ],
},
```

- [ ] **Step 3: LayoutRenderers renderTooltip에서 props 전달**

`packages/shared/src/renderers/LayoutRenderers.tsx`의 `renderTooltip` 함수 (라인 694-733)에서 overlay props를 전달. React Aria에서 `containerPadding`, `crossOffset`, `shouldFlip`은 `<TooltipTrigger>` props이므로, 렌더러 구조를 확인하고 적절한 위치에 전달:

```typescript
// TooltipTrigger에 전달되어야 할 props
containerPadding={element.props.containerPadding != null ? Number(element.props.containerPadding) : undefined}
crossOffset={element.props.crossOffset != null ? Number(element.props.crossOffset) : undefined}
shouldFlip={element.props.shouldFlip != null ? Boolean(element.props.shouldFlip) : undefined}
```

**주의**: 렌더러 구조가 `<TooltipTrigger>` + `<Tooltip>` 분리인지, `<Tooltip>` 하나로 래핑하는지 실제 코드를 읽고 결정할 것.

- [ ] **Step 4: 타입 체크**

```bash
cd apps/builder && pnpm exec tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add packages/specs/src/components/Tooltip.spec.ts packages/shared/src/renderers/LayoutRenderers.tsx
git commit -m "feat(tooltip): add overlay positioning props — containerPadding, crossOffset, shouldFlip"
```

---

### Task 4: Popover — overlay positioning props + properties 섹션 생성

**Files:**

- Modify: `packages/specs/src/components/Popover.spec.ts` (Props 인터페이스 + properties 섹션 생성)
- Modify: `packages/shared/src/renderers/LayoutRenderers.tsx:768-802` (renderPopover에서 props 전달)

Popover shared component (`Popover.tsx`)에는 `size`, `showArrow` 등이 이미 있다. React Aria `PopoverProps`를 상속하므로 `crossOffset`, `shouldFlip`, `containerPadding`은 타입에 포함된다.

- [ ] **Step 1: Popover.spec.ts Props 인터페이스에 props 추가**

`packages/specs/src/components/Popover.spec.ts`의 `PopoverProps` 인터페이스 (라인 17-31)에 추가:

```typescript
export interface PopoverProps {
  // ... existing props
  crossOffset?: number;
  shouldFlip?: boolean;
  containerPadding?: number;
}
```

- [ ] **Step 2: Popover.spec.ts에 properties 섹션 생성**

현재 Popover.spec.ts에는 properties 섹션이 Content(children)과 Position(placement)만 있다 (라인 48-82). Appearance와 State 섹션을 추가:

```typescript
// 기존 sections에 추가:
{
  title: "Appearance",
  fields: [
    { type: "size" },
  ],
},
{
  title: "State",
  fields: [
    { key: "crossOffset", type: "number", label: "Cross Offset", icon: MoveHorizontal, step: 1 },
    { key: "shouldFlip", type: "boolean", label: "Should Flip", icon: FlipVertical },
    { key: "containerPadding", type: "number", label: "Container Padding", icon: Maximize, min: 0, step: 1 },
  ],
},
```

lucide-react import 추가:

```typescript
import { ..., MoveHorizontal, FlipVertical, Maximize } from "lucide-react";
```

- [ ] **Step 3: LayoutRenderers renderPopover에서 props 전달**

`packages/shared/src/renderers/LayoutRenderers.tsx`의 `renderPopover` 함수 (라인 768-802)에서 Popover 컴포넌트에 overlay props 전달:

```typescript
<Popover
  // ... existing props (placement)
  size={element.props.size as ComponentSize | undefined}
  crossOffset={element.props.crossOffset != null ? Number(element.props.crossOffset) : undefined}
  shouldFlip={element.props.shouldFlip != null ? Boolean(element.props.shouldFlip) : undefined}
  containerPadding={element.props.containerPadding != null ? Number(element.props.containerPadding) : undefined}
>
```

- [ ] **Step 4: 타입 체크**

```bash
cd apps/builder && pnpm exec tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 5: 커밋**

```bash
git add packages/specs/src/components/Popover.spec.ts packages/shared/src/renderers/LayoutRenderers.tsx
git commit -m "feat(popover): add overlay props + size — crossOffset, shouldFlip, containerPadding, size editor"
```

---

### Task 5: Menu — trigger positioning props 추가

**Files:**

- Modify: `packages/specs/src/components/Menu.spec.ts` (Props 인터페이스 + properties fields)
- Modify: `packages/shared/src/components/Menu.tsx` (MenuButton에서 MenuTrigger로 props 전달)
- Modify: `packages/shared/src/renderers/LayoutRenderers.tsx:1583-1607` (renderActionMenu에서 props 전달)

Menu는 XStudio에서 `MenuButton` 컴포넌트로 구현되며, 내부에서 `<MenuTrigger>` + `<Button>` + `<Popover>` + `<Menu>` 구조를 사용한다. `align`, `direction`, `shouldFlip`은 `<MenuTrigger>` props.

- [ ] **Step 1: Menu.spec.ts Props 인터페이스에 props 추가**

`packages/specs/src/components/Menu.spec.ts`의 `MenuProps` 인터페이스 (라인 19-23)에 추가:

```typescript
export interface MenuProps {
  // ... existing props
  align?: "start" | "end";
  direction?: "bottom" | "top" | "left" | "right";
  shouldFlip?: boolean;
}
```

- [ ] **Step 2: Menu.spec.ts properties에 fields 추가**

Appearance 섹션에 align, direction을 추가하고 State 섹션에 shouldFlip 추가. lucide-react 아이콘 import:

```typescript
import { ..., AlignHorizontalJustifyStart, ArrowUpDown, FlipVertical } from "lucide-react";

// properties.sections에서 Appearance 섹션(없으면 생성)에 추가:
{
  key: "align",
  type: "enum",
  label: "Align",
  icon: AlignHorizontalJustifyStart,
  options: [
    { value: "start", label: "Start" },
    { value: "end", label: "End" },
  ],
},
{
  key: "direction",
  type: "enum",
  label: "Direction",
  icon: ArrowUpDown,
  options: [
    { value: "bottom", label: "Bottom" },
    { value: "top", label: "Top" },
    { value: "left", label: "Left" },
    { value: "right", label: "Right" },
  ],
},

// State 섹션에 추가:
{ key: "shouldFlip", type: "boolean", label: "Should Flip", icon: FlipVertical },
```

- [ ] **Step 3: MenuButton component에서 trigger props 수용**

`packages/shared/src/components/Menu.tsx`의 `MenuButtonProps` (라인 39-47)에 props 추가:

```typescript
export interface MenuButtonProps {
  // ... existing props
  align?: "start" | "end";
  direction?: "bottom" | "top" | "left" | "right";
  shouldFlip?: boolean;
}
```

`MenuButton` 컴포넌트 내부에서 `<MenuTrigger>`에 전달:

```typescript
<MenuTrigger
  align={align}
  direction={direction}
  shouldFlip={shouldFlip}
>
```

- [ ] **Step 4: LayoutRenderers renderActionMenu에서 props 전달**

`packages/shared/src/renderers/LayoutRenderers.tsx`의 `renderActionMenu` 함수 (라인 1583-1607)에서 MenuButton에 trigger props 전달:

```typescript
<MenuButton
  // ... existing props
  align={element.props.align as "start" | "end" | undefined}
  direction={element.props.direction as "bottom" | "top" | "left" | "right" | undefined}
  shouldFlip={element.props.shouldFlip != null ? Boolean(element.props.shouldFlip) : undefined}
>
```

- [ ] **Step 5: 타입 체크**

```bash
cd apps/builder && pnpm exec tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 6: 커밋**

```bash
git add packages/specs/src/components/Menu.spec.ts packages/shared/src/components/Menu.tsx packages/shared/src/renderers/LayoutRenderers.tsx
git commit -m "feat(menu): add trigger positioning props — align, direction, shouldFlip"
```

---

### Task 6: 전체 타입 체크 + Spec 빌드 검증

**Files:**

- Verify: 전체 프로젝트

- [ ] **Step 1: Spec 빌드**

```bash
cd /Users/admin/work/xstudio && pnpm build:specs
```

Expected: 에러 없음

- [ ] **Step 2: Builder 타입 체크**

```bash
cd apps/builder && pnpm exec tsc --noEmit
```

Expected: 에러 없음

- [ ] **Step 3: 구 섹션명 잔존 확인**

```bash
grep -r '"Basic"\|"Design"\|"Behavior"\|"Form Integration"\|"Internationalization"' packages/specs/src/components/
```

Expected: 0건

---

### Task 7: ADR 문서 업데이트

**Files:**

- Modify: `docs/adr/045-s2-property-editor-alignment.md` (Status 변경)
- Modify: `docs/adr/046-s2-contract-expansion-form-colorfield-tabs.md` (Decision Snapshot 확장)
- Modify: `docs/adr/README.md` (상태 업데이트)

- [ ] **Step 1: ADR-045 Status 변경**

`docs/adr/045-s2-property-editor-alignment.md` 라인 5:

```markdown
Implemented (2026-03-29, ADR-046에 통합)
```

- [ ] **Step 2: ADR-046 Decision Snapshot 확장**

`docs/adr/046-s2-contract-expansion-form-colorfield-tabs.md`의 Decision Snapshot (라인 87-108) 하단에 추가:

```markdown
- 채택 (ADR-045 잔여 통합, 2026-03-29)
  - `Tooltip.containerPadding`
  - `Tooltip.crossOffset`
  - `Tooltip.shouldFlip`
  - `Popover.crossOffset`
  - `Popover.shouldFlip`
  - `Popover.containerPadding`
  - `Menu.align`
  - `Menu.direction`
  - `Menu.shouldFlip`
```

ADR-046 Status도 업데이트:

```markdown
Implemented (2026-03-29)
```

- [ ] **Step 3: ADR README 업데이트**

`docs/adr/README.md`:

- 최종 업데이트 날짜 변경
- ADR-045를 부분 완료 → 완료 섹션으로 이동
- ADR-046 상태를 Implemented로 변경

- [ ] **Step 4: 커밋**

```bash
git add docs/adr/045-s2-property-editor-alignment.md docs/adr/046-s2-contract-expansion-form-colorfield-tabs.md docs/adr/README.md
git commit -m "docs: update ADR-045/046 — Implemented, Tooltip/Popover/Menu overlay props 통합"
```
