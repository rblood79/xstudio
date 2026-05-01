/**
 * @fileoverview ADR-916 Phase 5 G7 Extension Boundary — packages/shared 영역
 * legacy `Element.events` / `Element.dataBinding` read-through helper.
 *
 * canonical primary 저장 위치 = `CompositionNode.extension['x-composition']`
 * (apps/builder canonical store mutation 시 `updateNodeExtension` API 사용,
 * Phase 5 G7 preflight land). legacy `Element.events` / `Element.dataBinding`
 * 는 transition bridge — read-through fallback only.
 *
 * **본 helper 는 packages/shared 영역 (renderers 등) caller 가 legacy field 를
 * 직접 read 하는 site 를 단일 진입점으로 단일화**. apps/builder 영역의
 * `apps/builder/src/adapters/canonical/legacyExtensionFields.ts` 와 별 helper
 * (monorepo dependency 정합 — packages/shared 가 apps/builder import 불가).
 *
 * **priority 차이 framing note** (design §10.2.4 후속 결정):
 * - apps/builder 영역 (canvasDeltaMessenger / workflowEdges): default `'props-first'`
 *   — UI workflow editor 가 inline 수정한 `props.<field>` 가 canonical primary.
 * - packages/shared 영역 (renderers): default `'legacy-first'` — renderers 기존 패턴
 *   `element.<field> || element.props.<field>` 보존 (legacy persistent storage 우선).
 *
 * 두 영역의 priority 차이는 framing 의문이며, Phase 5 G7 closure 시점의
 * canonical primary 저장 진입과 함께 통일 결정 사항. 본 helper 는 priority
 * option 으로 양쪽 caller 를 동일 API 로 수용.
 *
 * @see docs/adr/916-canonical-document-ssot-transition.md §G7 Extension Boundary
 * @see docs/adr/design/916-canonical-document-ssot-transition-breakdown.md §10.2 G6-1
 */

export type ExtensionReadPriority = "legacy-first" | "props-first";

/**
 * Generic legacy element shape — packages/shared 의 다양한 caller (TableRenderer
 * `element` / SelectionRenderers `element` / DataTableComponent `element`) 양쪽
 * 호환. helper 가 schema dependency 없이 read-through 만 수행.
 */
interface LegacyElementWithExtension {
  props?: Record<string, unknown> | unknown;
  events?: unknown;
  dataBinding?: unknown;
}

/**
 * legacy `Element.events` 영역 — read-through priority.
 *
 * default priority = `'legacy-first'` (packages/shared 영역 renderers 기존 패턴 보존).
 * Phase 5 G7 closure 시 helper 내부 reverse — `node.extension['x-composition'].events`
 * 우선 read 후 props/legacy fallback 으로 변경.
 */
export function getElementEvents(
  element: LegacyElementWithExtension,
  priority: ExtensionReadPriority = "legacy-first",
): unknown[] {
  const props = element.props as Record<string, unknown> | undefined;
  const propsEvents = props?.events;
  if (priority === "legacy-first") {
    if (Array.isArray(element.events)) return element.events;
    if (Array.isArray(propsEvents)) return propsEvents;
    return [];
  }
  // props-first
  if (Array.isArray(propsEvents)) return propsEvents;
  if (Array.isArray(element.events)) return element.events;
  return [];
}

/**
 * legacy `Element.dataBinding` 영역 — read-through priority.
 *
 * default priority = `'legacy-first'` (packages/shared 영역 renderers 기존 패턴 보존).
 * Phase 5 G7 closure 시 helper 내부 reverse —
 * `node.extension['x-composition'].dataBinding` 우선 read.
 */
export function getElementDataBinding(
  element: LegacyElementWithExtension,
  priority: ExtensionReadPriority = "legacy-first",
): unknown {
  const props = element.props as Record<string, unknown> | undefined;
  const propsBinding = props?.dataBinding;
  if (priority === "legacy-first") {
    if (element.dataBinding !== undefined) return element.dataBinding;
    if (propsBinding !== undefined) return propsBinding;
    return undefined;
  }
  // props-first
  if (propsBinding !== undefined) return propsBinding;
  if (element.dataBinding !== undefined) return element.dataBinding;
  return undefined;
}
