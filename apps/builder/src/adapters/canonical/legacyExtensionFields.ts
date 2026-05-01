/**
 * @fileoverview ADR-916 Phase 5 G7 Extension Boundary — legacy `Element.events`
 * / `Element.dataBinding` / `Element.actions` read-through helper.
 *
 * canonical primary 저장 위치 = `CompositionNode.extension['x-composition']`
 * (canonical store mutation 시 `updateNodeExtension` API 사용, Phase 5 G7
 * preflight land). legacy `Element.events` / `Element.dataBinding` /
 * `Element.actions` 는 transition bridge — read-through fallback only.
 *
 * 본 helper 는 caller 가 legacy field 를 직접 read 하는 site 를 단일 진입점으로
 * 단일화하여, Phase 5 G7 closure 시점에 helper 내부 logic 만 reverse 하면 모든
 * caller 가 자동 canonical primary 로 전환되도록 한다.
 *
 * @see docs/adr/916-canonical-document-ssot-transition.md §G7 Extension Boundary
 * @see docs/adr/design/916-canonical-document-ssot-transition-breakdown.md §10.2 G6-1
 */

/**
 * Generic legacy element shape — `Element` (apps/builder unified.types) 와
 * 다른 local input interface (예: workflowEdges 의 `WorkflowElementInput`) 양쪽
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
 * 1. `props.events` — UI canonical primary 저장 (workflow editor 가 inline 수정).
 * 2. `element.events` — legacy fallback (ADR-913 P5 schema 영역, ADR-916 G7 cleanup target).
 * 3. `[]` — 미지정 default.
 *
 * Phase 5 G7 closure 시 helper 내부 reverse — `node.extension['x-composition'].events`
 * 우선 read 후 props/legacy fallback 으로 변경.
 */
export function getElementEvents(
  element: LegacyElementWithExtension,
): unknown[] {
  const props = element.props as Record<string, unknown> | undefined;
  const propsEvents = props?.events;
  if (Array.isArray(propsEvents)) return propsEvents;
  if (Array.isArray(element.events)) return element.events;
  return [];
}

/**
 * legacy `Element.dataBinding` 영역 — read-through priority.
 *
 * 1. `props.dataBinding` — UI canonical primary 저장.
 * 2. `element.dataBinding` — legacy fallback (ADR-916 G7 cleanup target).
 * 3. `undefined` — 미지정 default.
 *
 * Phase 5 G7 closure 시 helper 내부 reverse —
 * `node.extension['x-composition'].dataBinding` 우선 read.
 */
export function getElementDataBinding(
  element: LegacyElementWithExtension,
): unknown {
  const props = element.props as Record<string, unknown> | undefined;
  const propsBinding = props?.dataBinding;
  if (propsBinding !== undefined) return propsBinding;
  if (element.dataBinding !== undefined) return element.dataBinding;
  return undefined;
}
