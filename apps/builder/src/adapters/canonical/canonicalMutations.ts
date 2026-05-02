/**
 * @fileoverview ADR-916 Phase 3 G4 — Canonical mutation wrapper (mutation reverse 진정 진입점).
 *
 * caller 가 legacy `setElements` / `mergeElements` 직접 호출 대신 본 wrapper 를
 * 경유. design §8.6 grep gate 의 단일 SSOT 격리 (D18=A) 정합.
 *
 * **2026-05-02 direct cutover**:
 *
 * in-memory wrapper (merge/set) 가 항상 canonical primary 로 동작한다.
 * (1) active canonical document 또는 snapshot shell 에 입력 elements upsert →
 * (2) canonical store `setDocument` push → (3) `exportLegacyDocument()` 결과를
 * legacy mirror 로 `setElements()` 호출.
 *   DB wrapper (create/update/createMultiple) 는 reverse 영향 없음 — DB persist
 *   자체는 elementsApi 그대로 사용 (D17=A 채택, schema 미변경).
 *
 * **무한 루프 방지**: `canonicalDocumentSync` 는 direct cutover 이후 legacy
 * store subscribe/projection 을 수행하지 않는다. wrapper 가 canonical store 와
 * legacy mirror 를 같은 호출에서 갱신하므로 재호출 루프가 없다.
 *
 * **파일 위치 의도**: `apps/builder/src/adapters/canonical/` 안에 둠 → design
 * §8.6 grep gate 의 `apps/builder/src/adapters/**` exclude 패턴 안에 들어가서
 * grep gate 의 violation 카운트에서 자동 제외. caller 변환 1개당 baseline 1
 * 감소.
 *
 * **Circular dependency 해소 (DI pattern)**:
 * elements.ts → canonicalMutations.ts → stores/index → elements.ts 의 ESM
 * circular import chain 을 callback registration 으로 차단. BuilderCore mount
 * 시점에 `registerCanonicalMutationStoreActions` 로 store action 주입.
 * 테스트 환경에서는 `vi.mock` 또는 `registerCanonicalMutationStoreActions` 로
 * mock action 주입 가능.
 */

import type { Element } from "@/types/builder/unified.types";
import type { Page, Layout } from "@/types/builder/unified.types";
import type {
  CanonicalNode,
  CompositionDocument,
  CompositionExtension,
  FrameNode,
  RefNode,
  SerializedDataBinding,
  SerializedEventHandler,
} from "@composition/shared";
import { elementsApi } from "@/adapters/canonical/legacyElementsApiService";
import { exportLegacyDocument } from "./exportLegacyDocument";
import { useCanonicalDocumentStore } from "@/builder/stores/canonical/canonicalDocumentStore";
import { buildLegacyElementMetadata } from "./legacyMetadata";
import { getCanonicalSlotDeclaration } from "./slotDeclaration";
import { isLegacySlotTag, tagToType } from "./tagRename";
import { getPageFrameBindingId } from "./frameMirror";

// ─────────────────────────────────────────────
// Callback registration (DI pattern)
// ─────────────────────────────────────────────

/**
 * canonical primary reverse path 에 필요한 legacy snapshot 형태.
 */
export type LegacySnapshot = {
  elements: Element[];
  pages: Page[];
  layouts: Layout[];
};

/**
 * store action 타입 — wrapper 가 호출하는 최소 action 집합.
 * useStore 전체 타입 의존을 피해 circular import chain 차단.
 *
 * **2026-05-02 §8.7 확장**: canonical primary reverse path 용 3 callback 추가
 * (`getCurrentLegacySnapshot` / `getCurrentProjectId`).
 */
export type CanonicalMutationStoreActions = {
  mergeElements: (els: Element[]) => void;
  setElements: (els: Element[]) => void;
  /** canonical primary path: 현재 legacy state 전체 snapshot 조회 */
  getCurrentLegacySnapshot: () => LegacySnapshot;
  /** canonical primary path: 활성 projectId (canonical store setDocument target) */
  getCurrentProjectId: () => string | null;
};

let _registeredActions: CanonicalMutationStoreActions | null = null;

/**
 * BuilderCore (또는 테스트 setup) 에서 store action 을 주입한다.
 * mount useEffect 에서 1회 호출.
 *
 * @example
 * // BuilderCore.tsx
 * useEffect(() => {
 *   registerCanonicalMutationStoreActions({
 *     mergeElements: useStore.getState().mergeElements,
 *     setElements: useStore.getState().setElements,
 *     getCurrentLegacySnapshot: () => ({
 *       elements: Array.from(useStore.getState().elementsMap.values()),
 *       pages: useStore.getState().pages,
 *       layouts: useLayoutsStore.getState().layouts,
 *     }),
 *     getCurrentProjectId: () => projectId ?? null,
 *   });
 * }, [projectId]);
 */
export function registerCanonicalMutationStoreActions(
  actions: CanonicalMutationStoreActions,
): void {
  _registeredActions = actions;
}

/**
 * 테스트 / 모듈 재로드 후 등록된 action 을 초기화한다.
 * afterEach 에서 호출 가능 (선택적).
 */
export function resetCanonicalMutationStoreActions(): void {
  _registeredActions = null;
}

function getActions(): CanonicalMutationStoreActions {
  if (!_registeredActions) {
    throw new Error(
      "[canonicalMutations] store actions not registered. " +
        "Call registerCanonicalMutationStoreActions() before using mutation wrappers.",
    );
  }
  return _registeredActions;
}

function getCurrentDocument(projectId: string | null): CompositionDocument {
  return (
    (projectId
      ? useCanonicalDocumentStore.getState().getDocument(projectId)
      : null) ?? {
      version: "composition-1.0",
      children: [],
    }
  );
}

function sortElementsForUpsert(elements: Element[]): Element[] {
  const byId = new Map(elements.map((element) => [element.id, element]));
  const depthCache = new Map<string, number>();

  const getDepth = (element: Element): number => {
    const cached = depthCache.get(element.id);
    if (cached !== undefined) return cached;
    const parent =
      element.parent_id !== null && element.parent_id !== undefined
        ? byId.get(element.parent_id)
        : undefined;
    const depth = parent ? getDepth(parent) + 1 : 0;
    depthCache.set(element.id, depth);
    return depth;
  };

  return [...elements].sort((a, b) => {
    const ownerPriority = (element: Element): number => {
      if (element.layout_id) return 0;
      if (element.page_id) return 1;
      return 2;
    };
    const ownerDiff = ownerPriority(a) - ownerPriority(b);
    if (ownerDiff !== 0) return ownerDiff;
    const depthDiff = getDepth(a) - getDepth(b);
    if (depthDiff !== 0) return depthDiff;
    return (a.order_num ?? 0) - (b.order_num ?? 0);
  });
}

function getLegacyNodeId(node: CanonicalNode): string | null {
  const legacyProps = node.metadata?.legacyProps;
  if (
    legacyProps &&
    typeof legacyProps === "object" &&
    "id" in legacyProps &&
    typeof legacyProps.id === "string"
  ) {
    return legacyProps.id;
  }
  return null;
}

function nodeMatchesLegacyId(node: CanonicalNode, legacyId: string): boolean {
  return node.id === legacyId || getLegacyNodeId(node) === legacyId;
}

function findNodeByLegacyId(
  nodes: CanonicalNode[],
  legacyId: string | null | undefined,
): CanonicalNode | null {
  if (!legacyId) return null;
  for (const node of nodes) {
    if (nodeMatchesLegacyId(node, legacyId)) return node;
    const child = findNodeByLegacyId(node.children ?? [], legacyId);
    if (child) return child;
    if (node.type === "ref") {
      for (const children of getDescendantChildrenArrays(node as RefNode)) {
        const descendantChild = findNodeByLegacyId(children, legacyId);
        if (descendantChild) return descendantChild;
      }
    }
  }
  return null;
}

function getNodeOrder(node: CanonicalNode): number {
  const legacyProps = node.metadata?.legacyProps;
  if (
    legacyProps &&
    typeof legacyProps === "object" &&
    "order_num" in legacyProps &&
    typeof legacyProps.order_num === "number"
  ) {
    return legacyProps.order_num;
  }
  return 0;
}

function sortCanonicalChildren(children: CanonicalNode[]): CanonicalNode[] {
  return [...children].sort((a, b) => getNodeOrder(a) - getNodeOrder(b));
}

function removeNodeByLegacyId(
  nodes: CanonicalNode[],
  legacyId: string,
): { nodes: CanonicalNode[]; removed: CanonicalNode | null } {
  let removed: CanonicalNode | null = null;
  const nextNodes: CanonicalNode[] = [];

  for (const node of nodes) {
    if (nodeMatchesLegacyId(node, legacyId)) {
      removed = node;
      continue;
    }

    let nextNode = node;
    const childResult = removeNodeByLegacyId(node.children ?? [], legacyId);
    if (childResult.removed) {
      removed = childResult.removed;
      nextNode = { ...nextNode, children: childResult.nodes };
    }

    if (nextNode.type === "ref") {
      const descendantResult = removeNodeFromDescendants(
        nextNode as RefNode,
        legacyId,
      );
      if (descendantResult.removed) {
        removed = descendantResult.removed;
        nextNode = descendantResult.node;
      }
    }

    if (nextNode !== node) {
      nextNodes.push(nextNode);
      continue;
    }
    nextNodes.push(node);
  }

  return { nodes: nextNodes, removed };
}

function getDescendantChildrenArrays(refNode: RefNode): CanonicalNode[][] {
  const descendants = refNode.descendants ?? {};
  const children: CanonicalNode[][] = [];
  for (const override of Object.values(descendants)) {
    if (
      override &&
      typeof override === "object" &&
      "children" in override &&
      Array.isArray(override.children)
    ) {
      children.push(override.children);
    }
  }
  return children;
}

function removeNodeFromDescendants(
  refNode: RefNode,
  legacyId: string,
): { node: RefNode; removed: CanonicalNode | null } {
  const descendants = refNode.descendants ?? {};
  let removed: CanonicalNode | null = null;
  let changed = false;
  const nextDescendants: RefNode["descendants"] = {};

  for (const [path, override] of Object.entries(descendants)) {
    if (
      override &&
      typeof override === "object" &&
      "children" in override &&
      Array.isArray(override.children)
    ) {
      const result = removeNodeByLegacyId(override.children, legacyId);
      if (result.removed) {
        removed = result.removed;
        changed = true;
      }
      nextDescendants[path] = {
        ...override,
        children: result.nodes,
      };
      continue;
    }
    nextDescendants[path] = override;
  }

  return changed
    ? { node: { ...refNode, descendants: nextDescendants }, removed }
    : { node: refNode, removed: null };
}

function upsertChild(
  children: CanonicalNode[] | undefined,
  child: CanonicalNode,
): CanonicalNode[] {
  const withoutExisting = (children ?? []).filter((node) => {
    const legacyId = getLegacyNodeId(child);
    return legacyId
      ? !nodeMatchesLegacyId(node, legacyId)
      : node.id !== child.id;
  });
  return sortCanonicalChildren([...withoutExisting, child]);
}

function appendChildToNode(
  nodes: CanonicalNode[],
  parentLegacyId: string,
  child: CanonicalNode,
): { nodes: CanonicalNode[]; inserted: boolean } {
  let inserted = false;
  const nextNodes = nodes.map((node) => {
    if (nodeMatchesLegacyId(node, parentLegacyId)) {
      inserted = true;
      return {
        ...node,
        children: upsertChild(node.children, child),
      };
    }

    let nextNode = node;
    const childResult = appendChildToNode(
      node.children ?? [],
      parentLegacyId,
      child,
    );
    if (childResult.inserted) {
      inserted = true;
      nextNode = { ...nextNode, children: childResult.nodes };
    }

    if (nextNode.type === "ref") {
      const descendantResult = appendChildToDescendants(
        nextNode as RefNode,
        parentLegacyId,
        child,
      );
      if (descendantResult.inserted) {
        inserted = true;
        nextNode = descendantResult.node;
      }
    }

    return nextNode;
  });

  return { nodes: nextNodes, inserted };
}

function appendChildToDescendants(
  refNode: RefNode,
  parentLegacyId: string,
  child: CanonicalNode,
): { node: RefNode; inserted: boolean } {
  const descendants = refNode.descendants ?? {};
  let inserted = false;
  const nextDescendants: RefNode["descendants"] = {};

  for (const [path, override] of Object.entries(descendants)) {
    if (
      override &&
      typeof override === "object" &&
      "children" in override &&
      Array.isArray(override.children)
    ) {
      const result = appendChildToNode(
        override.children,
        parentLegacyId,
        child,
      );
      if (result.inserted) {
        inserted = true;
        nextDescendants[path] = {
          ...override,
          children: result.nodes,
        };
        continue;
      }
    }
    nextDescendants[path] = override;
  }

  return inserted
    ? { node: { ...refNode, descendants: nextDescendants }, inserted }
    : { node: refNode, inserted: false };
}

function buildCompositionExtensionField(element: Element): {
  "x-composition"?: CompositionExtension;
} {
  const ext: CompositionExtension = {};
  if (Array.isArray(element.events) && element.events.length > 0) {
    ext.events = element.events as SerializedEventHandler[];
  }
  if (element.dataBinding !== undefined && element.dataBinding !== null) {
    ext.dataBinding = element.dataBinding as SerializedDataBinding;
  }
  return ext.events === undefined && ext.dataBinding === undefined
    ? {}
    : { "x-composition": ext };
}

function remapLegacyDescendants(
  element: Element,
  doc: CompositionDocument,
): RefNode["descendants"] | undefined {
  if (!element.descendants || Object.keys(element.descendants).length === 0) {
    return undefined;
  }

  const remapped: RefNode["descendants"] = {};
  for (const [legacyChildId, override] of Object.entries(element.descendants)) {
    const childNode = findNodeByLegacyId(doc.children, legacyChildId);
    remapped[childNode?.id ?? legacyChildId] = override;
  }
  return remapped;
}

function legacyElementToCanonicalNode(
  element: Element,
  doc: CompositionDocument,
  previousNode: CanonicalNode | null,
): CanonicalNode {
  if (isLegacySlotTag(element.type)) {
    const slotName =
      (element.props.name as string | undefined) ?? element.slot_name ?? null;
    if (element.layout_id) {
      return {
        id: previousNode?.id ?? slotName ?? element.id,
        type: "frame",
        placeholder: true,
        slot: [],
        name: slotName ?? "content",
        metadata: {
          type: "legacy-slot-hoisted",
          slotName: slotName ?? "content",
        },
        children: [],
      };
    }

    return {
      id: previousNode?.id ?? element.id,
      type: "frame",
      name: element.componentName,
      ...(previousNode?.children ? { children: previousNode.children } : {}),
      metadata: {
        type: "legacy-slot",
        slot_name: element.slot_name,
        ...(slotName ? { slotName } : {}),
      },
    };
  }

  const baseNode: CanonicalNode = {
    id: previousNode?.id ?? element.id,
    type: tagToType(element.type),
    name: element.componentName,
    props: element.props as Record<string, unknown>,
    ...(previousNode?.children ? { children: previousNode.children } : {}),
    ...getCanonicalSlotDeclaration(element),
    metadata: buildLegacyElementMetadata(element),
    ...buildCompositionExtensionField(element),
  };

  if (element.componentRole === "master") {
    return {
      ...baseNode,
      reusable: true,
    };
  }

  if (element.componentRole === "instance" && element.masterId) {
    const masterNode = findNodeByLegacyId(doc.children, element.masterId);
    const refNode: RefNode = {
      ...baseNode,
      type: "ref",
      ref: masterNode?.id ?? element.masterId,
      ...(element.overrides ? { props: element.overrides } : {}),
      ...(remapLegacyDescendants(element, doc)
        ? { descendants: remapLegacyDescendants(element, doc) }
        : {}),
    };
    return refNode;
  }

  return baseNode;
}

function findReusableFrame(
  doc: CompositionDocument,
  layoutId: string,
): FrameNode | null {
  return (
    doc.children.find((node): node is FrameNode => {
      const metadata = node.metadata as { layoutId?: unknown } | undefined;
      return (
        node.type === "frame" &&
        node.reusable === true &&
        (node.id === layoutId ||
          node.id === `layout-${layoutId}` ||
          metadata?.layoutId === layoutId)
      );
    }) ?? null
  );
}

function ensureReusableFrame(
  doc: CompositionDocument,
  layoutId: string,
  snapshot: LegacySnapshot,
): { doc: CompositionDocument; frame: FrameNode } {
  const existingFrame = findReusableFrame(doc, layoutId);
  if (existingFrame) return { doc, frame: existingFrame };

  const layout = snapshot.layouts.find(
    (candidate) => candidate.id === layoutId,
  );
  const frame: FrameNode = {
    id: `layout-${layoutId}`,
    type: "frame",
    reusable: true,
    name: layout?.name ?? layoutId,
    metadata: {
      type: "legacy-layout",
      layoutId,
    },
    children: [],
  };
  return {
    doc: { ...doc, children: [...doc.children, frame] },
    frame,
  };
}

function findPageNode(
  doc: CompositionDocument,
  pageId: string,
): CanonicalNode | null {
  return (
    doc.children.find((node) => {
      const metadata = node.metadata as { type?: unknown; pageId?: unknown };
      return (
        node.id === pageId &&
        metadata?.type === "legacy-page" &&
        metadata.pageId === pageId
      );
    }) ?? null
  );
}

function ensurePageNode(
  doc: CompositionDocument,
  pageId: string,
  snapshot: LegacySnapshot,
): { doc: CompositionDocument; pageNode: CanonicalNode } {
  const existingPage = findPageNode(doc, pageId);
  if (existingPage) return { doc, pageNode: existingPage };

  const page = snapshot.pages.find((candidate) => candidate.id === pageId);
  const pageNode: FrameNode = {
    id: pageId,
    type: "frame",
    name: page?.title ?? pageId,
    metadata: {
      type: "legacy-page",
      pageId,
      slug: page?.slug ?? null,
    },
    children: [],
  };
  return {
    doc: { ...doc, children: [...doc.children, pageNode] },
    pageNode,
  };
}

function buildFrameShell(
  layout: Layout,
  currentDoc: CompositionDocument,
): FrameNode {
  const existingFrame = findReusableFrame(currentDoc, layout.id);
  return {
    id: existingFrame?.id ?? `layout-${layout.id}`,
    type: "frame",
    reusable: true,
    name: layout.name,
    metadata: {
      ...(existingFrame?.metadata ?? {}),
      type: "legacy-layout",
      layoutId: layout.id,
    },
    slot: existingFrame?.slot,
    children: [],
  };
}

function buildPageShell(
  page: Page,
  currentDoc: CompositionDocument,
): CanonicalNode {
  const existingPage = findPageNode(currentDoc, page.id);
  const frameId = getPageFrameBindingId(page);
  const metadata = {
    ...(existingPage?.metadata ?? {}),
    type: "legacy-page",
    pageId: page.id,
    slug: page.slug ?? null,
  };

  if (frameId) {
    return {
      id: existingPage?.id ?? page.id,
      type: "ref",
      ref: `layout-${frameId}`,
      name: page.title,
      metadata: {
        ...metadata,
        layoutId: frameId,
      },
      descendants: {},
    } satisfies RefNode;
  }

  const frameMetadata = {
    ...metadata,
  } as typeof metadata & { layoutId?: unknown };
  delete frameMetadata.layoutId;

  return {
    id: existingPage?.id ?? page.id,
    type: "frame",
    name: page.title,
    metadata: frameMetadata,
    children: [],
  } satisfies FrameNode;
}

function buildDocumentShellFromSnapshot(
  currentDoc: CompositionDocument,
  snapshot: LegacySnapshot,
): CompositionDocument {
  return {
    ...currentDoc,
    children: [
      ...snapshot.layouts.map((layout) => buildFrameShell(layout, currentDoc)),
      ...snapshot.pages.map((page) => buildPageShell(page, currentDoc)),
    ],
  };
}

function attachChildToFrame(
  doc: CompositionDocument,
  frame: FrameNode,
  child: CanonicalNode,
): CompositionDocument {
  const result = appendChildToNode(doc.children, frame.id, child);
  return result.inserted ? { ...doc, children: result.nodes } : doc;
}

function attachChildToPage(
  doc: CompositionDocument,
  pageNode: CanonicalNode,
  child: CanonicalNode,
  slotName: string | null | undefined,
): CompositionDocument {
  if (pageNode.type === "ref") {
    const descendants = { ...((pageNode as RefNode).descendants ?? {}) };
    const slotPath =
      findSlotPathForPageRef(doc, pageNode as RefNode, slotName ?? "content") ??
      slotName ??
      "content";
    const existingOverride = descendants[slotPath];
    const existingChildren =
      existingOverride &&
      typeof existingOverride === "object" &&
      "children" in existingOverride &&
      Array.isArray(existingOverride.children)
        ? existingOverride.children
        : [];
    descendants[slotPath] = {
      children: upsertChild(existingChildren, child),
    };
    const updatedPageNode: RefNode = {
      ...(pageNode as RefNode),
      descendants,
    };
    const withoutPage = doc.children.filter((node) => node.id !== pageNode.id);
    return {
      ...doc,
      children: sortCanonicalChildren([...withoutPage, updatedPageNode]),
    };
  }

  const result = appendChildToNode(doc.children, pageNode.id, child);
  return result.inserted ? { ...doc, children: result.nodes } : doc;
}

function findSlotPathForPageRef(
  doc: CompositionDocument,
  pageRef: RefNode,
  slotName: string,
): string | null {
  const frame = doc.children.find(
    (node): node is FrameNode =>
      node.type === "frame" &&
      node.reusable === true &&
      node.id === pageRef.ref,
  );
  if (!frame) return null;
  return findSlotPathInNode(frame.children ?? [], slotName, "");
}

function findSlotPathInNode(
  nodes: CanonicalNode[],
  slotName: string,
  parentPath: string,
): string | null {
  for (const node of nodes) {
    const currentPath = parentPath ? `${parentPath}/${node.id}` : node.id;
    const metadata = node.metadata as
      | { type?: unknown; slotName?: unknown }
      | undefined;
    if (
      metadata?.type === "legacy-slot-hoisted" &&
      metadata.slotName === slotName
    ) {
      return currentPath;
    }
    const childPath = findSlotPathInNode(
      node.children ?? [],
      slotName,
      currentPath,
    );
    if (childPath) return childPath;
  }
  return null;
}

function upsertElementIntoDocument(
  doc: CompositionDocument,
  element: Element,
  snapshot: LegacySnapshot,
): CompositionDocument {
  const previousNode = findNodeByLegacyId(doc.children, element.id);
  const removed = removeNodeByLegacyId(doc.children, element.id);
  const docWithoutExisting: CompositionDocument = {
    ...doc,
    children: removed.nodes,
  };
  const node = legacyElementToCanonicalNode(
    element,
    docWithoutExisting,
    previousNode,
  );

  if (element.componentRole === "master") {
    return {
      ...docWithoutExisting,
      children: upsertChild(docWithoutExisting.children, node),
    };
  }

  if (element.parent_id) {
    const result = appendChildToNode(
      docWithoutExisting.children,
      element.parent_id,
      node,
    );
    if (result.inserted) {
      return { ...docWithoutExisting, children: result.nodes };
    }
  }

  if (element.layout_id) {
    const ensured = ensureReusableFrame(
      docWithoutExisting,
      element.layout_id,
      snapshot,
    );
    return attachChildToFrame(ensured.doc, ensured.frame, node);
  }

  if (element.page_id) {
    const ensured = ensurePageNode(
      docWithoutExisting,
      element.page_id,
      snapshot,
    );
    return attachChildToPage(
      ensured.doc,
      ensured.pageNode,
      node,
      element.slot_name,
    );
  }

  return {
    ...docWithoutExisting,
    children: upsertChild(docWithoutExisting.children, node),
  };
}

function upsertElementsIntoDocument(
  doc: CompositionDocument,
  elements: Element[],
  snapshot: LegacySnapshot,
): CompositionDocument {
  return elements.reduce(
    (currentDoc, element) =>
      upsertElementIntoDocument(currentDoc, element, snapshot),
    doc,
  );
}

// ─────────────────────────────────────────────
// Canonical primary reverse path (§8.7)
// ─────────────────────────────────────────────

/**
 * mergeElements 의 canonical primary 변형.
 *
 * 1. active canonical document 에 incoming elements 를 legacy id 기준 upsert
 * 2. canonical store `setDocument` push
 * 3. `exportLegacyDocument(doc)` → legacy `setElements` mirror
 */
function applyCanonicalPrimaryMerge(elements: Element[]): void {
  const actions = getActions();
  const snapshot = actions.getCurrentLegacySnapshot();
  const projectId = actions.getCurrentProjectId();
  const currentDoc = getCurrentDocument(projectId);
  const doc = upsertElementsIntoDocument(
    currentDoc,
    sortElementsForUpsert(elements),
    snapshot,
  );

  if (projectId) {
    useCanonicalDocumentStore.getState().setDocument(projectId, doc);
  }

  // legacy mirror — exportLegacyDocument round-trip 결과
  const legacyMirror = exportLegacyDocument(doc);
  actions.setElements(legacyMirror);
}

/**
 * setElements 의 canonical primary 변형.
 *
 * 1. 기존 pages/layouts snapshot 으로 canonical document shell 구성
 * 2. 입력 elements 를 shell 에 legacy id 기준 upsert
 * 2. canonical store `setDocument` push
 * 3. `exportLegacyDocument(doc)` → legacy `setElements` mirror
 */
function applyCanonicalPrimarySet(elements: Element[]): void {
  const actions = getActions();
  const snapshot = actions.getCurrentLegacySnapshot();
  const projectId = actions.getCurrentProjectId();
  const currentDoc = getCurrentDocument(projectId);
  const shellDoc = buildDocumentShellFromSnapshot(currentDoc, snapshot);
  const doc = upsertElementsIntoDocument(
    shellDoc,
    sortElementsForUpsert(elements),
    snapshot,
  );
  if (projectId) {
    useCanonicalDocumentStore.getState().setDocument(projectId, doc);
  }

  const legacyMirror = exportLegacyDocument(doc);
  actions.setElements(legacyMirror);
}

// ─────────────────────────────────────────────
// In-memory store wrapper API
// ─────────────────────────────────────────────

/**
 * legacy `mergeElements` 의 canonical-aware wrapper.
 *
 * canonical store mutation 우선 + legacy mirror 자동.
 *
 * @param elements - 추가/병합할 legacy element 배열
 */
export function mergeElementsCanonicalPrimary(elements: Element[]): void {
  applyCanonicalPrimaryMerge(elements);
}

/**
 * legacy `setElements` 의 canonical-aware wrapper.
 *
 * canonical store mutation 우선 + legacy mirror 자동.
 *
 * @param elements - 전체 element 배열 (replace)
 */
export function setElementsCanonicalPrimary(elements: Element[]): void {
  applyCanonicalPrimarySet(elements);
}

// ─────────────────────────────────────────────
// DB persistence wrapper API
// ─────────────────────────────────────────────
//
// DB wrapper 3개는 §8.7 reverse 영향 없음 — D17=A 채택 (schema 미변경, DB row =
// legacy export 결과). DB persist 후 caller 가 반환 Element 받아서 in-memory
// wrapper (merge/set) 호출 → 그 시점에 canonical primary path 가동.

/**
 * legacy `elementsApi.createElement` 의 canonical-aware wrapper.
 *
 * @param element - 신규 legacy element (Partial 허용)
 * @returns 저장된 Element (DB id 포함)
 */
export function createElementCanonicalPrimary(
  element: Partial<Element>,
): Promise<Element> {
  return elementsApi.createElement(element);
}

/**
 * legacy `elementsApi.updateElement` 의 canonical-aware wrapper.
 *
 * @param id - 대상 element id
 * @param patch - 부분 업데이트 patch
 * @returns 업데이트된 Element
 */
export function updateElementCanonicalPrimary(
  id: string,
  patch: Partial<Element>,
): Promise<Element> {
  return elementsApi.updateElement(id, patch);
}

/**
 * legacy `elementsApi.createMultipleElements` 의 canonical-aware wrapper.
 *
 * @param elements - 신규 legacy element 배열 (Partial 허용)
 * @returns 저장된 Element 배열 (DB id 포함)
 */
export function createMultipleElementsCanonicalPrimary(
  elements: Partial<Element>[],
): Promise<Element[]> {
  return elementsApi.createMultipleElements(elements);
}
