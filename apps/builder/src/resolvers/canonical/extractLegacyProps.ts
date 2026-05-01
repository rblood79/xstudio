/**
 * @fileoverview ResolvedNode → legacy props 추출 helper — ADR-916 G6-2 split
 *
 * **storeBridge.ts 에서 분리 사유 (2026-05-01)**: `storeBridge.ts` 가
 * `@/builder/stores/elements` (zustand store) 를 import 하면서 vitest mock
 * path resolution 함정 (`createElementsSlice is not a function` setup fail)
 * 영역에 갇힘. `extractLegacyPropsFromResolved` 는 store 무관 helper 이므로
 * 별 file 로 분리하여 isolated unit test 가능하게 함. memory 패턴: "test 를
 * source 와 같은 __tests__/ 디렉토리 + 명시 mock 우회".
 *
 * `storeBridge.ts` 는 backward compat re-export 만 유지.
 */

import type { ResolvedNode } from "@composition/shared";

/**
 * resolved 노드의 `metadata` 에서 legacy props 를 추출한다.
 *
 * **세 metadata/props 패턴 대응** (ADR-916 G6-2 land):
 * 1. **legacy adapter 패턴** (`resolveCanonicalDescendantOverride` / slot override
 *    mode A): `metadata = { type, legacyProps: {...} }` — `legacyProps` 필드에
 *    props 가 보존됨
 * 2. **ref-resolve 패턴** (`_resolveRefNodeUncached`):
 *    `metadata = { ...resolvedProps, type }` — `type` 외 모든 키가 props
 * 3. **canonical primary 패턴** (ADR-916 G6-1 second work fallback): metadata 가
 *    legacyProps / spread props 둘 다 없을 때 `resolved.props` (CanonicalNode.props)
 *    직접 사용. Phase 1 이후 신규 canonical write 의 SSOT.
 *
 * 우선순위:
 * - `metadata.legacyProps` 있음 → 그 값 (legacy adapter)
 * - `metadata` 에 type 외 키 존재 → type 제외 나머지 (ref-resolve)
 * - `resolved.props` 있음 → 그 값 (canonical primary fallback)
 * - 모두 없음 → `{}`
 */
export function extractLegacyPropsFromResolved(
  resolved: ResolvedNode,
): Record<string, unknown> {
  const meta = resolved.metadata as Record<string, unknown> | undefined;

  // Case 1: legacy adapter 패턴 (metadata.legacyProps)
  if (meta?.legacyProps !== undefined) {
    return (meta.legacyProps as Record<string, unknown>) ?? {};
  }

  // Case 2: ref-resolve 패턴 (metadata 에 type + spread props)
  if (meta) {
    const { type: _type, ...rest } = meta;
    if (Object.keys(rest).length > 0) return rest;
  }

  // Case 3: ADR-916 G6-2 — canonical primary fallback.
  // CanonicalNode.props 는 Phase 1 이후 신규 canonical write 의 SSOT (G6-1
  // second work fallback 정합). metadata.legacyProps / metadata spread 둘 다
  // 없을 때만 진입 — backward compat 유지.
  if (resolved.props) {
    return { ...resolved.props };
  }

  return {};
}
