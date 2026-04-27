/**
 * @fileoverview Store-Level Canonical Resolver Bridge — ADR-903 P2 D-B
 *
 * P1 adapter (`legacyToCanonical`) + P2 resolver (`resolveCanonicalDocument`) 를
 * **store snapshot 진입점** 으로 묶고, consumer 측에서 사용할 lookup helper 와
 * Element 재구성 helper 를 제공한다.
 *
 * 본 모듈의 의도:
 * - **shared `ResolverCache` singleton 활용**: Preview / Skia 양쪽이 동일 cache
 *   인스턴스를 공유 (Gate G2 (a) 전제) — sprite consumer wiring 시 즉시 활용
 * - **per-instance mini-doc 옵션**: 개별 instance hook (예: `useResolvedElement`)
 *   이 doc 전체 build 비용 없이 단일 (master, ref) pair 단위로 cache hit 활용
 * - **full tree 옵션**: future sprite-tree consumer 가 한 번에 doc 전체를 받아
 *   id → ResolvedNode index 로 lookup
 *
 * production render path 변경 없음 — 본 모듈은 helper 만 제공하고, 실제 consumer
 * 전환은 `useResolvedElement` 변경 (D-B) + sprite wiring (후속) 단계에서 진행.
 *
 * @see docs/adr/903-ref-descendants-slot-composition-format-migration-plan.md
 * @see resolvers/canonical/index.ts (P2 S1 본체)
 * @see adapters/canonical/index.ts (P1 adapter)
 */

import type {
  CanonicalNode,
  CompositionDocument,
  ComponentTag,
  RefNode,
  ResolvedNode,
  ResolverCache,
} from "@composition/shared";

import type { Element } from "@/types/builder/unified.types";
import { isInstanceElement } from "@/types/builder/unified.types";
import type { Page } from "@/types/builder/unified.types";
import type { Layout } from "@/types/builder/layout.types";
import type { ElementsState } from "@/builder/stores/elements";

import { selectCanonicalDocument } from "@/builder/stores/elements";
import { resolveCanonicalDocument } from "./index";
import { getSharedResolverCache } from "./cache";

// ─────────────────────────────────────────────────────────────────────────────
// 1) Store-snapshot → ResolvedNode[] selector (full tree)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * store snapshot + pages + layouts 를 받아 P1 adapter → P2 resolver 를 통과시킨
 * 결과 ResolvedNode[] 를 반환한다.
 *
 * - cache 는 기본적으로 `getSharedResolverCache()` 의 singleton 사용 — Preview /
 *   Skia 양쪽이 동일 인스턴스를 공유한다는 ADR-903 P0 Gate G2 (a) 계약 충족
 * - caller 가 격리된 cache (테스트 등) 가 필요하면 4번째 인자로 명시 주입
 *
 * 매 호출 시 `legacyToCanonical` 은 재실행 — adapter 자체는 ResolverCache 적용
 * 대상 아님 (P0 read-through 결정). cache 효과는 `resolveCanonicalDocument`
 * 단계에서 ref subtree hit 으로 발휘됨.
 */
export function selectResolvedTree(
  state: ElementsState,
  pages: Page[],
  layouts: Layout[],
  cache: ResolverCache = getSharedResolverCache(),
): ResolvedNode[] {
  const doc: CompositionDocument = selectCanonicalDocument(
    state,
    pages,
    layouts,
  );
  return resolveCanonicalDocument(doc, cache);
}

// ─────────────────────────────────────────────────────────────────────────────
// 2) ResolvedNode[] → Map<id, ResolvedNode> flatten
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ResolvedNode 트리를 DFS 로 순회하여 모든 노드를 `id → ResolvedNode` Map 으로
 * 평탄화한다. consumer (sprite, hook) 가 element.id 로 O(1) lookup 할 수 있도록.
 *
 * 동일 id 가 여러 번 나타나면 (예: 같은 ref 가 여러 page 에서 인스턴스화)
 * 마지막 occurrence 가 우선 — DFS 순서 보장.
 */
export function buildResolvedNodeIndex(
  tree: ResolvedNode[],
): Map<string, ResolvedNode> {
  const index = new Map<string, ResolvedNode>();
  for (const node of tree) {
    visit(node, index);
  }
  return index;
}

function visit(node: ResolvedNode, index: Map<string, ResolvedNode>): void {
  index.set(node.id, node);
  if (node.children) {
    for (const child of node.children) {
      visit(child, index);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2.5) ResolvedNode 트리 → child id → parent id Map 빌드 (P3-B)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * resolved tree 를 DFS 순회하여 child id → parent id Map 을 빌드한다.
 *
 * ADR-903 P3-D-2 (`elementCreation.ts` 히스토리 조건) / P3-D-5 (`BuilderCore`
 * 필터링 경로) 가 `el.layout_id === id` 패턴을 canonical parent context 기반으로
 * 교체할 때 사용한다.
 *
 * - root 노드는 부모가 없으므로 Map 에 등록되지 않는다 (`index.has(rootId) === false`)
 * - DFS pre-order 로 traverse — 동일 id 가 트리 내 여러 곳에 등장하면 마지막
 *   occurrence 의 부모가 우선
 * - 단방향 (child → parent). parent → children 은 ResolvedNode.children 으로 직접 접근
 *
 * 설계 문서: `docs/adr/design/903-phase3d-runtime-breakdown.md` §4.5
 */
export function buildParentIndex(tree: ResolvedNode[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const node of tree) {
    visitParent(node, undefined, index);
  }
  return index;
}

function visitParent(
  node: ResolvedNode,
  parentId: string | undefined,
  index: Map<string, string>,
): void {
  if (parentId !== undefined) {
    index.set(node.id, parentId);
  }
  if (node.children) {
    for (const child of node.children) {
      visitParent(child, node.id, index);
    }
  }
}

/**
 * `buildParentIndex` 결과에서 element id 의 canonical parent id 를 조회한다.
 *
 * - root 노드 → `null` (Map 에 등록 안 됨)
 * - 존재하지 않는 id → `null`
 * - 그 외 → 직속 부모 id (조상 아님)
 *
 * 사용 사이트는 정렬된 `Map` 을 받아 O(1) 조회를 보장. 매 호출마다 tree 를
 * 재순회하지 않도록 caller 에서 index 를 한 번만 빌드해 재사용해야 한다.
 */
export function getCanonicalParentId(
  index: Map<string, string>,
  elementId: string,
): string | null {
  return index.get(elementId) ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3) ResolvedNode → legacy props 추출 (두 metadata 패턴 대응)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * resolved 노드의 `metadata` 에서 legacy props 를 추출한다.
 *
 * P2 resolver 는 두 metadata 패턴을 사용한다:
 * 1. **ref-resolve** (`_resolveRefNodeUncached`): `metadata = { ...resolvedProps, type }`
 *    — `type` 외 모든 키가 props
 * 2. **descendants mode A** / **adapter 원본** (`resolveCanonicalDescendantOverride`):
 *    `metadata = { type, legacyProps: {...} }` — `legacyProps` 필드에 props 가 보존됨
 *
 * 본 helper 는 두 패턴 모두 대응한다.
 *
 * 우선순위:
 * - `metadata.legacyProps` 가 있으면 그 값 사용
 * - 없으면 `type` 키만 제외한 나머지 metadata 전체를 props 로 사용
 */
export function extractLegacyPropsFromResolved(
  resolved: ResolvedNode,
): Record<string, unknown> {
  const meta = resolved.metadata as Record<string, unknown> | undefined;
  if (!meta) return {};

  if (meta.legacyProps !== undefined) {
    return (meta.legacyProps as Record<string, unknown>) ?? {};
  }

  const { type: _type, ...rest } = meta;
  return rest;
}

// ─────────────────────────────────────────────────────────────────────────────
// 4) per-instance shared-cache resolve (mini-doc)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 단일 (instance, master) pair 를 P2 resolver 의 mini CompositionDocument 로
 * 묶어서 `resolveCanonicalDocument` 를 통과시킨 후 결과 Element 를 재구성한다.
 *
 * `useResolvedElement` 등 per-instance hook 이 doc 전체 build 없이 canonical
 * 경로로 진입하면서도 shared cache hit 효과를 누리도록 설계.
 *
 * - master / instance 둘 다 P1 adapter 의 metadata 계약 (`type: "legacy-element-props"`,
 *   `legacyProps: ...`) 을 그대로 모사 — P2 resolver 의 `resolveCanonicalRefProps`
 *   가 동일 머지 결과 산출
 * - cache hit 단위는 `(refNode.id, descendantsFingerprint, slotBindingFingerprint)`
 *   조합. 같은 instance / master pair 의 반복 호출은 cache hit
 * - master 가 없으면 `null` 반환 — caller 는 legacy fallback 또는 element 그대로 처리
 *
 * @param instance - componentRole === "instance" Element
 * @param master   - instance.masterId 로 조회한 master Element
 * @param cache    - shared ResolverCache (default: singleton)
 * @returns        canonical 경로로 resolve 된 Element (type = master.type, props = merged)
 */
export function resolveInstanceWithSharedCache(
  instance: Element,
  master: Element | undefined,
  cache: ResolverCache = getSharedResolverCache(),
): Element | null {
  if (!isInstanceElement(instance)) return null;
  if (!master) return null;

  const masterNode: CanonicalNode = {
    id: master.id,
    type: master.type as ComponentTag,
    reusable: true,
    metadata: {
      type: "legacy-element-props",
      legacyProps: master.props,
    },
  };

  const refNode: RefNode = {
    id: instance.id,
    type: "ref",
    ref: master.id,
    metadata: {
      type: "legacy-instance-overrides",
      legacyProps: instance.overrides ?? {},
    },
  };

  const miniDoc: CompositionDocument = {
    version: "composition-1.0",
    children: [masterNode, refNode],
  };

  const [, resolvedRef] = resolveCanonicalDocument(miniDoc, cache);
  if (!resolvedRef) return null;

  const props = extractLegacyPropsFromResolved(resolvedRef);

  return {
    ...instance,
    type: master.type,
    props,
  };
}
