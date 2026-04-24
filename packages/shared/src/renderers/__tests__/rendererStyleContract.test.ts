/**
 * Renderer style contract test — ADR-907 Phase 2 Layer C
 *
 * 목적: collection/self-render 11 주대상 컴포넌트 renderer 가 root JSX 에
 * `style={element.props.style}` 를 전달하는지 runtime 검증.
 *
 * 방법:
 *   1. fake PreviewElement (props.style = { padding: 99 }) 생성
 *   2. minimal RenderContext 주입
 *   3. renderer 호출 → 반환 React element 의 root props.style.padding 확인
 *
 * Phase 0 실측 기반 초기 결과:
 *   - PASS 대상 (8): ListBox, Menu, ComboBox, Select, Tree, Tabs, Toolbar, Breadcrumbs
 *   - allowlist (3): GridList, TagGroup, Table — Phase 3/4/5 에서 순차 제거
 *
 * allowlist 에 있는 컴포넌트는 style 미전달을 **허용**한다 (Phase 3+ 에서 contract
 * 충족 후 allowlist 에서 제거). allowlist 외 컴포넌트가 regression 하면 test 실패.
 */

import { describe, it, expect } from "vitest";
import { isValidElement } from "react";
import type { PreviewElement, RenderContext } from "../../types/renderer.types";
import {
  renderListBox,
  renderGridList,
  renderSelect,
  renderComboBox,
} from "../SelectionRenderers";
import {
  renderTree,
  renderTagGroup,
  renderMenu,
  renderToolbar,
} from "../CollectionRenderers";
import { renderTabs, renderBreadcrumbs } from "../LayoutRenderers";
import { renderTable } from "../TableRenderer";
import { rendererStyleContractAllowlist } from "./rendererStyleContract.allowlist";

type RenderFn = (element: PreviewElement, context: RenderContext) => unknown;

const RENDERERS: Array<{ tag: string; render: RenderFn }> = [
  { tag: "ListBox", render: renderListBox as RenderFn },
  { tag: "GridList", render: renderGridList as RenderFn },
  { tag: "Select", render: renderSelect as RenderFn },
  { tag: "ComboBox", render: renderComboBox as RenderFn },
  { tag: "Tree", render: renderTree as RenderFn },
  { tag: "TagGroup", render: renderTagGroup as RenderFn },
  { tag: "Menu", render: renderMenu as RenderFn },
  { tag: "Toolbar", render: renderToolbar as RenderFn },
  { tag: "Tabs", render: renderTabs as RenderFn },
  { tag: "Breadcrumbs", render: renderBreadcrumbs as RenderFn },
  { tag: "Table", render: renderTable as RenderFn },
];

function makeContext(el: PreviewElement): RenderContext {
  return {
    elements: [el],
    elementsMap: new Map([[el.id, el]]),
    childrenMap: new Map(),
    updateElementProps: () => {},
    batchUpdateElementProps: () => {},
    setElements: () => {},
    renderElement: () => null,
  };
}

function makeElement(tag: string): PreviewElement {
  return {
    id: `test-${tag}`,
    tag,
    props: {
      style: { padding: 99 },
      items: [],
    },
  };
}

/**
 * 반환 React element 의 root props.style.padding 를 뽑아낸다.
 * React.Fragment 는 style 을 받지 못하므로 undefined 반환.
 * 배열/null 등도 undefined.
 */
function extractRootStylePadding(node: unknown): unknown {
  if (!node || typeof node !== "object") return undefined;
  if (!isValidElement(node)) return undefined;
  const style = (node.props as { style?: { padding?: unknown } } | null)?.style;
  return style?.padding;
}

describe("ADR-907 Phase 2 Layer C — renderer style contract", () => {
  describe.each(RENDERERS)("$tag renderer", ({ tag, render }) => {
    const inAllowlist = rendererStyleContractAllowlist.has(tag);

    it(
      inAllowlist
        ? "allowlist 등록: style 미전달 일시 허용 (Phase 3+ 에서 contract 충족 후 제거)"
        : "root JSX 에 element.props.style 전달 (style.padding === 99)",
      () => {
        const element = makeElement(tag);
        const context = makeContext(element);
        let result: unknown;
        let threw: unknown;
        try {
          result = render(element, context);
        } catch (err) {
          threw = err;
        }

        if (inAllowlist) {
          // allowlist: 예외든 통과든 무관 — Phase 3+ 에서 Gate 통과 시 제거
          expect(true).toBe(true);
          return;
        }

        // allowlist 외 renderer 는 반드시 예외 없이 React element 반환하고
        // root 에 style.padding === 99 전달해야 한다
        if (threw) {
          throw new Error(
            `${tag} renderer threw under fake element (allowlist 에 없음): ${String(threw)}`,
          );
        }
        const padding = extractRootStylePadding(result);
        expect(padding).toBe(99);
      },
    );
  });

  it("allowlist 내용이 ADR-907 Phase 0 실측과 일치", () => {
    // allowlist 는 GridList / TagGroup / Table (3건 — (a) X)
    // Phase 3/4/5 에서 점진 제거
    expect(Array.from(rendererStyleContractAllowlist).sort()).toEqual([
      "Table",
      "TagGroup",
    ]);
  });
});
