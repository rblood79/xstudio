# Tabs/Breadcrumbs 감사 이슈 수정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tabs/Breadcrumbs 컴포넌트 감사에서 발견된 HIGH/MEDIUM 이슈 8건 수정 — ancestor lookup 통합, TabPanelsSpec 신규, indicator 두께 size별 분기, separator 패딩 정합성, 죽은 코드 제거

**Architecture:** Spec-First(ADR-036) 원칙에 따라 Spec을 SSOT로 두고, 레이아웃 엔진(implicitStyles/utils)과 Skia(buildSpecNodeData)가 Spec에서 값을 읽도록 통합. ancestor lookup 헬퍼를 추출하여 중복 제거.

**Tech Stack:** TypeScript, Vitest, @composition/specs, Taffy layout engine

---

## File Structure

| 파일 | 역할 | 변경 유형 |
|------|------|-----------|
| `apps/builder/src/builder/workspace/canvas/skia/ancestorLookup.ts` | **신규** — `findAncestorByTag()` 공용 헬퍼 | Create |
| `apps/builder/src/builder/workspace/canvas/skia/ancestorLookup.test.ts` | **신규** — 헬퍼 테스트 | Create |
| `apps/builder/src/builder/workspace/canvas/skia/buildSpecNodeData.ts` | resolveTabIsSelected/resolveTabOrientation → 헬퍼 사용 | Modify |
| `apps/builder/src/builder/workspace/canvas/layout/engines/implicitStyles.ts` | tabs/tabpanels/tablist 블록 → 헬퍼 사용 | Modify |
| `packages/specs/src/components/TabPanels.spec.ts` | **신규** — ADR-036 준수 TabPanels Spec | Create |
| `packages/specs/src/components/Tab.spec.ts` | indicator thickness size별 분기 | Modify |
| `packages/specs/src/components/Breadcrumb.spec.ts` | separator 뒤 패딩 추가 (양쪽 패딩) | Modify |
| `packages/specs/src/index.ts` | TabPanelsSpec export 추가 | Modify |
| `apps/builder/src/builder/workspace/canvas/layout/engines/utils.ts` | TABS_BAR_HEIGHT → Spec 참조, 죽은 코드 제거 | Modify |

---

### Task 1: findAncestorByTag 공용 헬퍼 추출

**Files:**
- Create: `apps/builder/src/builder/workspace/canvas/skia/ancestorLookup.ts`
- Create: `apps/builder/src/builder/workspace/canvas/skia/ancestorLookup.test.ts`

- [ ] **Step 1: 테스트 작성**

```typescript
// ancestorLookup.test.ts
import { describe, expect, it } from "vitest";
import { findAncestorByTag } from "./ancestorLookup";
import type { Element } from "../../../../types/core/store.types";

function el(id: string, tag: string, parentId: string | null, props: Record<string, unknown> = {}): Element {
  return { id, tag, props, parent_id: parentId, page_id: "p1", order_num: 0 } as Element;
}

describe("findAncestorByTag", () => {
  it("finds direct parent matching tag", () => {
    const tabs = el("tabs1", "Tabs", null, { size: "lg" });
    const tabList = el("tl1", "TabList", "tabs1");
    const map = new Map([["tabs1", tabs], ["tl1", tabList]]);

    const result = findAncestorByTag(tabList, "Tabs", map, 3);
    expect(result).toBe(tabs);
  });

  it("finds grandparent (depth 2)", () => {
    const tabs = el("tabs1", "Tabs", null, { selectedKey: "t1" });
    const tabList = el("tl1", "TabList", "tabs1");
    const tab = el("tab1", "Tab", "tl1");
    const map = new Map([["tabs1", tabs], ["tl1", tabList], ["tab1", tab]]);

    const result = findAncestorByTag(tab, "Tabs", map, 3);
    expect(result).toBe(tabs);
  });

  it("returns undefined when not found within maxDepth", () => {
    const root = el("root", "Box", null);
    const child = el("c1", "Tab", "root");
    const map = new Map([["root", root], ["c1", child]]);

    expect(findAncestorByTag(child, "Tabs", map, 3)).toBeUndefined();
  });

  it("returns undefined for element without parent", () => {
    const orphan = el("o1", "Tab", null);
    const map = new Map([["o1", orphan]]);
    expect(findAncestorByTag(orphan, "Tabs", map, 3)).toBeUndefined();
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `cd /Users/admin/work/composition && pnpm vitest run apps/builder/src/builder/workspace/canvas/skia/ancestorLookup.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: 헬퍼 구현**

```typescript
// ancestorLookup.ts
import type { Element } from "../../../../types/core/store.types";

/**
 * 주어진 element에서 위로 올라가며 특정 tag를 가진 조상을 찾는다.
 * implicitStyles(1-depth)와 buildSpecNodeData(3-depth)의 중복 패턴 통합.
 *
 * @param element 시작 요소
 * @param tag 찾으려는 조상 태그
 * @param elementsMap 전체 요소 맵
 * @param maxDepth 최대 탐색 깊이 (기본 3)
 */
export function findAncestorByTag(
  element: Element,
  tag: string,
  elementsMap: Map<string, Element>,
  maxDepth = 3,
): Element | undefined {
  let currentId: string | null | undefined = element.parent_id;
  for (let depth = 0; depth < maxDepth && currentId; depth++) {
    const ancestor = elementsMap.get(currentId);
    if (!ancestor) break;
    if (ancestor.tag === tag) return ancestor;
    currentId = ancestor.parent_id;
  }
  return undefined;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `cd /Users/admin/work/composition && pnpm vitest run apps/builder/src/builder/workspace/canvas/skia/ancestorLookup.test.ts`
Expected: 4 tests PASS

- [ ] **Step 5: 커밋**

```bash
git add apps/builder/src/builder/workspace/canvas/skia/ancestorLookup.ts apps/builder/src/builder/workspace/canvas/skia/ancestorLookup.test.ts
git commit -m "refactor: extract findAncestorByTag helper from duplicated ancestor lookup patterns"
```

---

### Task 2: buildSpecNodeData에서 헬퍼 사용으로 전환

**Files:**
- Modify: `apps/builder/src/builder/workspace/canvas/skia/buildSpecNodeData.ts:415-464`

- [ ] **Step 1: resolveTabIsSelected 리팩토링**

`buildSpecNodeData.ts` 상단에 import 추가:
```typescript
import { findAncestorByTag } from "./ancestorLookup";
```

lines 415-444의 `resolveTabIsSelected` 함수를 다음으로 교체:

```typescript
/** Tab → ancestor Tabs selectedKey 비교 → _isSelected 주입 */
function resolveTabIsSelected(
  element: Element,
  elementsMap: Map<string, Element>,
): boolean | null {
  if (element.tag !== "Tab" || !element.parent_id) return null;

  const tabId = getProps(element).tabId as string | undefined;
  if (!tabId) return null;

  const tabs = findAncestorByTag(element, "Tabs", elementsMap, 3);
  if (!tabs) return null;

  const ap = getProps(tabs);
  const selectedKey =
    (ap.selectedKey as string | undefined) ??
    (ap.defaultSelectedKey as string | undefined);
  if (selectedKey != null) return selectedKey === tabId;
  return false;
}
```

- [ ] **Step 2: resolveTabOrientation 리팩토링**

lines 446-464의 `resolveTabOrientation` 함수를 다음으로 교체:

```typescript
/** Tab/TabList → ancestor Tabs orientation 위임 */
function resolveTabOrientation(
  element: Element,
  elementsMap: Map<string, Element>,
): string | null {
  if (element.tag !== "Tab" && element.tag !== "TabList") return null;
  if (!element.parent_id) return null;

  const tabs = findAncestorByTag(element, "Tabs", elementsMap, 3);
  if (!tabs) return null;
  return (getProps(tabs).orientation as string) ?? "horizontal";
}
```

- [ ] **Step 3: 빌드 확인**

Run: `cd /Users/admin/work/composition && pnpm -F @composition/builder exec tsc --noEmit 2>&1 | head -30`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add apps/builder/src/builder/workspace/canvas/skia/buildSpecNodeData.ts
git commit -m "refactor: use findAncestorByTag in resolveTabIsSelected/resolveTabOrientation"
```

---

### Task 3: implicitStyles에서 헬퍼 사용으로 전환

**Files:**
- Modify: `apps/builder/src/builder/workspace/canvas/layout/engines/implicitStyles.ts:966-1031`

- [ ] **Step 1: import 추가 + tabpanels 블록 리팩토링**

import 추가:
```typescript
import { findAncestorByTag } from "../../skia/ancestorLookup";
```

lines 969-997의 tabpanels 블록에서 수동 1-depth 조회를 헬퍼로 교체:

```typescript
  if (containerTag === "tabpanels") {
    const tabs = findAncestorByTag(containerEl, "Tabs", elementById, 3);
    const tabsProps = tabs?.props as Record<string, unknown> | undefined;
    const sizeName = (tabsProps?.size as string) ?? "md";
    // ... 나머지 동일
```

- [ ] **Step 2: tablist 블록 리팩토링**

lines 999-1031의 tablist 블록에서 동일하게 교체:

```typescript
  if (containerTag === "tablist") {
    const tabs = findAncestorByTag(containerEl, "Tabs", elementById, 3);
    const tabsProps = tabs?.props as Record<string, unknown> | undefined;
    const sizeName = (tabsProps?.size as string) ?? "md";
    // ... 나머지 동일
```

- [ ] **Step 3: 빌드 확인**

Run: `cd /Users/admin/work/composition && pnpm -F @composition/builder exec tsc --noEmit 2>&1 | head -30`
Expected: 에러 없음

- [ ] **Step 4: 커밋**

```bash
git add apps/builder/src/builder/workspace/canvas/layout/engines/implicitStyles.ts
git commit -m "refactor: use findAncestorByTag in implicitStyles tabs/tabpanels/tablist blocks"
```

---

### Task 4: TabPanelsSpec 신규 생성 (ADR-036)

**Files:**
- Create: `packages/specs/src/components/TabPanels.spec.ts`
- Modify: `packages/specs/src/index.ts`

- [ ] **Step 1: TabPanelsSpec 작성**

```typescript
// TabPanels.spec.ts
/**
 * TabPanels Component Spec
 *
 * Tabs 내부의 Panel 컨테이너. 활성 Panel 하나만 렌더링.
 * CSS: .react-aria-TabPanels { flex-grow: 1 }
 * 레이아웃: implicitStyles에서 selectedKey 기반 활성 Panel 필터링.
 *
 * @packageDocumentation
 */

import type { ComponentSpec, Shape, TokenRef } from "../types";

export interface TabPanelsProps {
  style?: Record<string, string | number | undefined>;
}

export const TabPanelsSpec: ComponentSpec<TabPanelsProps> = {
  name: "TabPanels",
  description: "Tabs 내 Panel 컨테이너 — 활성 Panel만 표시",
  element: "div",
  skipCSSGeneration: true,

  defaultVariant: "default",
  defaultSize: "md",

  properties: { sections: [] },

  variants: {
    default: {
      background: "{color.transparent}" as TokenRef,
      backgroundHover: "{color.transparent}" as TokenRef,
      backgroundPressed: "{color.transparent}" as TokenRef,
      text: "{color.neutral}" as TokenRef,
    },
  },

  sizes: {
    sm: {
      height: 0,
      paddingX: 8,
      paddingY: 8,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
    },
    md: {
      height: 0,
      paddingX: 12,
      paddingY: 12,
      fontSize: "{typography.text-sm}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
    },
    lg: {
      height: 0,
      paddingX: 16,
      paddingY: 16,
      fontSize: "{typography.text-base}" as TokenRef,
      borderRadius: "{radius.none}" as TokenRef,
    },
  },

  states: {},

  render: {
    shapes: (): Shape[] => [],
  },
};
```

- [ ] **Step 2: index.ts에 export 추가**

`packages/specs/src/index.ts`의 Tab 관련 export 블록(약 lines 272-277) 뒤에 추가:

```typescript
export { TabPanelsSpec } from "./components/TabPanels.spec";
export type { TabPanelsProps } from "./components/TabPanels.spec";
```

- [ ] **Step 3: 빌드 확인**

Run: `cd /Users/admin/work/composition && pnpm -F @composition/specs build 2>&1 | tail -5`
Expected: 성공

- [ ] **Step 4: 커밋**

```bash
git add packages/specs/src/components/TabPanels.spec.ts packages/specs/src/index.ts
git commit -m "feat(specs): add TabPanelsSpec — ADR-036 Spec-First compliance"
```

---

### Task 5: Tab indicator 두께 size별 분기

**Files:**
- Modify: `packages/specs/src/components/Tab.spec.ts:126-137`

- [ ] **Step 1: indicator thickness를 size별 상수로 변경**

Tab.spec.ts의 render.shapes 내부(line 126-137)를 다음으로 교체:

```typescript
      // 선택된 탭: accent 인디케이터 (full-width)
      // CSS 정합: sm=2px, md=3px, lg=4px
      if (isSelected) {
        const indicatorThickness: Record<number, number> = {
          21: 2, // sm height
          29: 3, // md height
          41: 4, // lg height
        };
        const thickness = indicatorThickness[h] ?? 3;
        shapes.push({
          type: "rect" as const,
          x: isVertical ? w - thickness : 0,
          y: isVertical ? 0 : h - thickness,
          width: isVertical ? thickness : w,
          height: isVertical ? h : thickness,
          fill: "{color.accent}" as TokenRef,
        });
      }
```

- [ ] **Step 2: 빌드 확인**

Run: `cd /Users/admin/work/composition && pnpm -F @composition/specs build 2>&1 | tail -5`
Expected: 성공

- [ ] **Step 3: 커밋**

```bash
git add packages/specs/src/components/Tab.spec.ts
git commit -m "fix(specs): Tab indicator thickness size-specific (sm:2, md:3, lg:4) matching CSS"
```

---

### Task 6: Breadcrumb separator 패딩 정합성 수정

**Files:**
- Modify: `packages/specs/src/components/Breadcrumb.spec.ts:168-184`

- [ ] **Step 1: separator 뒤 afterPadX 추가**

Breadcrumb.spec.ts의 render.shapes에서 separator 렌더링 부분(lines 169-184)을 수정.
현재 `x += afterPadX` 후 separator 텍스트만 push하고 끝남 — separator 뒤에도 afterPadX를 추가해야 Taffy 폭(separatorPadding * 2)과 일치:

```typescript
      if (!isLast) {
        x += afterPadX;
        shapes.push({
          type: "text" as const,
          x,
          y: height / 2,
          text: separator,
          fontSize: resolvedFontSize,
          fontFamily: ff,
          fontWeight: 400,
          fill: "{color.neutral-subdued}" as TokenRef,
          align: "left" as const,
          baseline: "middle" as const,
          maxWidth: sepMeasuredWidth + resolvedFontSize,
        });
        x += sepMeasuredWidth + afterPadX;
      }
```

핵심 변경: 마지막 줄 `x += sepMeasuredWidth + afterPadX;` 추가 (기존에는 x 업데이트 없었음).

- [ ] **Step 2: 빌드 확인**

Run: `cd /Users/admin/work/composition && pnpm -F @composition/specs build 2>&1 | tail -5`
Expected: 성공

- [ ] **Step 3: 커밋**

```bash
git add packages/specs/src/components/Breadcrumb.spec.ts
git commit -m "fix(specs): Breadcrumb separator padding both sides — match Taffy separatorPadding*2"
```

---

### Task 7: utils.ts calculateContentWidth 죽은 코드 제거

**Files:**
- Modify: `apps/builder/src/builder/workspace/canvas/layout/engines/utils.ts:938-953`

- [ ] **Step 1: 중복 specX 계산 제거**

utils.ts의 calculateContentWidth breadcrumbs 블록에서 섹션 2(specX 계산, lines 938-953)를 제거하고 measuredWidth만 반환:

기존 코드(lines 921-953)를 다음으로 교체:

```typescript
    const separatorPadding = breadcrumbSeparatorAfterPaddingXPx(rspSize);

    let measuredWidth = 0;
    for (let i = 0; i < crumbs.length; i++) {
      const isLast = i === crumbs.length - 1;
      const crumbWeight = isLast ? 600 : fontWeight;
      measuredWidth += measureTextWidth(
        crumbs[i],
        fontSize,
        ffamily,
        crumbWeight,
      );
      if (!isLast) {
        const sepWidth = measureTextWidth(separator, fontSize, ffamily, 400);
        measuredWidth += separatorPadding + sepWidth + separatorPadding;
      }
    }

    return Math.ceil(measuredWidth);
```

- [ ] **Step 2: 빌드 확인**

Run: `cd /Users/admin/work/composition && pnpm -F @composition/builder exec tsc --noEmit 2>&1 | head -30`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add apps/builder/src/builder/workspace/canvas/layout/engines/utils.ts
git commit -m "refactor: remove dead duplicate specX calculation in Breadcrumbs calculateContentWidth"
```

---

### Task 8: TABS_BAR_HEIGHT를 Spec에서 파생하도록 전환

**Files:**
- Modify: `apps/builder/src/builder/workspace/canvas/layout/engines/utils.ts:1389-1398`

- [ ] **Step 1: TABS_BAR_HEIGHT → TabsSpec.sizes에서 파생**

utils.ts 상단 import에 `TabsSpec` 추가 (이미 `TabSpec`이 import되어 있으므로 같은 줄에):

```typescript
import {
  // ... existing imports ...
  TabsSpec,
} from "@composition/specs";
```

lines 1389-1393의 TABS_BAR_HEIGHT를 다음으로 교체:

```typescript
/** @sync TabsSpec.sizes — Spec이 SSOT */
export const TABS_BAR_HEIGHT: Record<string, number> = Object.fromEntries(
  Object.entries(TabsSpec.sizes).map(([k, v]) => [k, v.height]),
);
```

TABS_PANEL_PADDING은 TabPanelsSpec.sizes에서 파생:

```typescript
import { TabPanelsSpec } from "@composition/specs";
```

```typescript
export const TABS_PANEL_PADDING: Record<string, number> = Object.fromEntries(
  Object.entries(TabPanelsSpec.sizes).map(([k, v]) => [k, v.paddingX]),
);
```

- [ ] **Step 2: 빌드 확인**

Run: `cd /Users/admin/work/composition && pnpm -F @composition/builder exec tsc --noEmit 2>&1 | head -30`
Expected: 에러 없음

- [ ] **Step 3: 커밋**

```bash
git add apps/builder/src/builder/workspace/canvas/layout/engines/utils.ts
git commit -m "refactor: derive TABS_BAR_HEIGHT/TABS_PANEL_PADDING from Spec SSOT"
```

---

## 우선순위 외 (후속 작업)

이 플랜에서 제외된 LOW 이슈 (별도 플랜 또는 점진적 수정):

- Tab fontWeight CSS 500 vs Spec 400/600 — CSS 쪽 확인 후 결정
- generated/Breadcrumbs.css display inline-flex vs flex — CSSGenerator 로직 확인 필요
- Tabs propagation 미등록 — ADR-048 확장 시 함께 처리
- calculateContentHeight selectedKey 무시 — 멀티 Panel 높이 테스트 필요
- Breadcrumb labelFill 삼항 단순화 — 코드 정리 시 함께 처리
