/**
 * @fileoverview Canonical Node Renderer — ADR-903 P2 옵션 C
 *
 * `resolveCanonicalDocument` 가 반환하는 `ResolvedNode` 트리를
 * DOM/CSS 요소로 렌더링하는 React 컴포넌트.
 *
 * 역할:
 * - ResolvedNode → legacyProps 추출 (extractLegacyPropsFromResolved)
 * - legacyProps 에서 type + props 복원 → 기존 rendererMap 위임
 * - 재귀 children 렌더링
 * - DOM 마커: data-canonical-id (stable path) + data-legacy-uuid (원본 UUID)
 *
 * feature flag `?canonical=1` 시에만 활성화됨.
 * legacy 경로(App.tsx hybrid 분기)는 feature flag 기본 false 상태에서 무변경 보존.
 *
 * @see docs/adr/903-ref-descendants-slot-composition-format-migration-plan.md
 */

import React from "react";
import { rendererMap } from "@composition/shared/renderers";
import { adaptElementFillStyle } from "@composition/shared";
import type { ResolvedNode } from "@composition/shared";
import type { SharedRenderContext } from "@composition/shared/types";
import { extractLegacyPropsFromResolved } from "../../resolvers/canonical/storeBridge";
import type { RenderContext } from "../types/index";
import type { PreviewElement } from "../types/index";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface CanonicalNodeRendererProps {
  /** resolve 완료된 단일 노드 */
  node: ResolvedNode;
  /** Preview RenderContext — rendererMap 위임 시 전달 */
  renderContext: RenderContext;
  /** 부모 경로 (디버그 + DOM 마커용) */
  parentPath?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CanonicalNodeRenderer
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 단일 `ResolvedNode` 를 DOM 요소로 렌더링한다.
 *
 * 렌더링 순서:
 * 1. `extractLegacyPropsFromResolved` 로 legacy props 추출
 * 2. props 에서 `type` 복원 (metadata.type → node.type fallback)
 * 3. rendererMap 위임 (기존 shared renderer 재사용)
 * 4. rendererMap 미등록 시 generic div 렌더링 + children 재귀
 * 5. DOM 마커: `data-canonical-id` + `data-legacy-uuid`
 */
export function CanonicalNodeRenderer({
  node,
  renderContext,
  parentPath = "",
}: CanonicalNodeRendererProps): React.ReactElement | null {
  const currentPath = parentPath ? `${parentPath}/${node.id}` : node.id;

  // ── legacyProps 추출 ──────────────────────────────────────────────────────
  const legacyProps = extractLegacyPropsFromResolved(node);

  // ── type 복원 ─────────────────────────────────────────────────────────────
  // node.type 이 ComponentTag (예: "button", "text", "frame") 이므로
  // legacy type 는 legacyProps._tag → metadata.originalTag → node.type 순으로 fallback
  const type =
    (legacyProps._tag as string | undefined) ??
    (legacyProps.type as string | undefined) ??
    ((node.metadata as Record<string, unknown> | undefined)?.originalTag as
      | string
      | undefined) ??
    String(node.type);

  // ── PreviewElement 재구성 (rendererMap 시그니처 맞춤) ────────────────────
  // node.id 는 stable path (idPath.ts segId 결과) 이지만
  // legacy DOM 마커는 원본 UUID 가 필요하므로 legacyProps.id 를 우선.
  const legacyUuid = (legacyProps.id as string | undefined) ?? node.id;

  const previewEl: PreviewElement = {
    id: legacyUuid,
    type,
    props: legacyProps as PreviewElement["props"],
    parent_id: (legacyProps.parent_id as string | undefined) ?? null,
    page_id: (legacyProps.page_id as string | undefined) ?? null,
    layout_id: (legacyProps.layout_id as string | undefined) ?? null,
    order_num: (legacyProps.order_num as number | undefined) ?? 0,
    fills: (legacyProps.fills as unknown[] | undefined) ?? [],
  };

  // fills + style 변환 (adaptElementFillStyle)
  const adaptedEl = adaptElementFillStyle(previewEl);

  // DOM 마커 props (canonical-id = stable path, legacy-uuid = 원본 UUID)
  const markerProps = {
    "data-canonical-id": node.id,
    "data-legacy-uuid": legacyUuid,
  };

  // ── rendererMap 위임 ──────────────────────────────────────────────────────
  const renderer = rendererMap[adaptedEl.type];
  if (renderer) {
    // shared renderer 는 RenderContext.renderElement 를 통해 자식을 렌더링하므로
    // 여기서는 rendererMap 에 그대로 위임. DOM 마커는 wrapper div 로 감쌈.
    return (
      <div key={node.id} {...markerProps} style={{ display: "contents" }}>
        {renderer(adaptedEl, renderContext as unknown as SharedRenderContext)}
      </div>
    );
  }

  // ── generic 렌더링 (rendererMap 미등록 태그) ─────────────────────────────
  const children = node.children ?? [];

  return React.createElement(
    resolveGenericHtmlTag(adaptedEl.type),
    {
      key: node.id,
      ...markerProps,
      "data-element-id": legacyUuid,
      style: adaptedEl.props?.style as React.CSSProperties | undefined,
      className: adaptedEl.props?.className as string | undefined,
    },
    children.length > 0
      ? children.map((child) => (
          <CanonicalNodeRenderer
            key={child.id}
            node={child}
            renderContext={renderContext}
            parentPath={currentPath}
          />
        ))
      : (adaptedEl.props?.children as React.ReactNode),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 커스텀 태그를 표준 HTML 태그로 변환한다.
 * rendererMap 미등록 태그에 대한 최소 fallback 경로.
 */
function resolveGenericHtmlTag(type: string): string {
  const KNOWN_HTML: Record<string, string> = {
    body: "div",
    Slot: "div",
    Section: "section",
    Heading: "h2",
    Text: "p",
    Description: "p",
    Icon: "span",
    Group: "div",
    FormField: "div",
    FieldError: "span",
    frame: "div",
    ref: "div",
  };
  return KNOWN_HTML[type] ?? type.toLowerCase();
}
