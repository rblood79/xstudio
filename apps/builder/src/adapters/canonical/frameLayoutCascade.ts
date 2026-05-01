import type { CompositionDocument, FrameNode } from "@composition/shared";
import type { Element, Page } from "@/types/builder/unified.types";
import { getDefaultProps } from "@/types/builder/unified.types";
import type { Layout } from "@/types/builder/layout.types";
import { getDB } from "@/lib/db";
import { useCanonicalDocumentStore } from "@/builder/stores/canonical/canonicalDocumentStore";
import { selectCanonicalDocument } from "@/builder/stores/elements";
import { exportLegacyDocument } from "./exportLegacyDocument";
import { mergeElementsCanonicalPrimary } from "./canonicalMutations";
import {
  getLegacyLayoutId,
  LEGACY_LAYOUT_ID_FIELD,
  matchesLegacyLayoutId,
  withLegacyLayoutId,
} from "./legacyElementFields";

type ElementsStateForCanonicalDocument = Parameters<
  typeof selectCanonicalDocument
>[0];

interface ApplyDeleteReusableFrameInput {
  frameId: string;
  layouts: Layout[];
  getElementsState: () => ElementsStateForCanonicalDocument;
  setPages: (pages: Page[]) => void;
  setElements: (elements: Element[]) => void;
}

export interface DeleteReusableFrameResult {
  clearedPageIds: string[];
  deletedElementIds: string[];
  frameExisted: boolean;
}

interface DuplicateReusableFrameElementsInput {
  sourceFrameId: string;
  targetFrameId: string;
}

function frameMatchesLayoutId(frame: FrameNode, frameId: string): boolean {
  const metadata = frame.metadata as { layoutId?: string } | undefined;
  return (
    frame.id === frameId ||
    frame.id === `layout-${frameId}` ||
    metadata?.layoutId === frameId
  );
}

function findReusableFrame(
  doc: CompositionDocument,
  frameId: string,
): FrameNode | null {
  return (
    doc.children.find(
      (node): node is FrameNode =>
        node.type === "frame" &&
        node.reusable === true &&
        frameMatchesLayoutId(node, frameId),
    ) ?? null
  );
}

function setCanonicalDocument(
  doc: CompositionDocument,
  pages: Page[],
  layouts: Layout[],
): void {
  const canonical = useCanonicalDocumentStore.getState();
  const projectId =
    canonical.currentProjectId ??
    pages.find((page) => page.project_id)?.project_id ??
    layouts.find((layout) => layout.project_id)?.project_id ??
    null;

  if (!projectId) return;

  if (canonical.currentProjectId !== projectId) {
    canonical.setCurrentProject(projectId);
  }
  canonical.setDocument(projectId, doc);
}

function clearFramePageBindings(
  pages: Page[],
  frameId: string,
): { pages: Page[]; clearedPageIds: string[] } {
  const clearedPageIds: string[] = [];
  const nextPages = pages.map((page) => {
    if (getLegacyLayoutId(page) !== frameId) {
      return page;
    }
    clearedPageIds.push(page.id);
    return withLegacyLayoutId(page, null);
  });

  return { pages: nextPages, clearedPageIds };
}

function collectRemovedElementIds(
  previousElements: Iterable<Element>,
  nextElements: Element[],
): string[] {
  const nextIds = new Set(nextElements.map((element) => element.id));
  const removedIds: string[] = [];

  for (const element of previousElements) {
    if (!nextIds.has(element.id)) {
      removedIds.push(element.id);
    }
  }

  return removedIds;
}

async function persistDeleteReusableFrameMirror(
  frameId: string,
  clearedPageIds: string[],
  deletedElementIds: string[],
): Promise<void> {
  const db = await getDB();
  const persistedPages = await db.pages.getAll();
  const pageIdsToClear = new Set(clearedPageIds);
  for (const page of persistedPages) {
    if (getLegacyLayoutId(page) === frameId) {
      pageIdsToClear.add(page.id);
    }
  }

  if (pageIdsToClear.size > 0) {
    await Promise.all(
      Array.from(pageIdsToClear).map((pageId) =>
        db.pages.update(pageId, { [LEGACY_LAYOUT_ID_FIELD]: null }),
      ),
    );
  }

  if (deletedElementIds.length > 0) {
    if ("deleteMany" in db.elements) {
      await db.elements.deleteMany(deletedElementIds);
    } else {
      await Promise.all(
        deletedElementIds.map((elementId) => db.elements.delete(elementId)),
      );
    }
  }
}

export function createFrameBodyElement(frameId: string): Element {
  return withLegacyLayoutId(
    {
      id: crypto.randomUUID(),
      type: "body",
      props: getDefaultProps("body") as Element["props"],
      parent_id: null,
      page_id: null,
      order_num: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    frameId,
  );
}

export async function applyDeleteReusableFrameCanonicalPrimary({
  frameId,
  layouts,
  getElementsState,
  setPages,
  setElements,
}: ApplyDeleteReusableFrameInput): Promise<DeleteReusableFrameResult> {
  const state = getElementsState();
  const { pages: nextPages, clearedPageIds } = clearFramePageBindings(
    state.pages,
    frameId,
  );
  const nextLayouts = layouts.filter((layout) => layout.id !== frameId);
  const currentDoc = selectCanonicalDocument(state, state.pages, layouts);
  const frameExisted = findReusableFrame(currentDoc, frameId) !== null;
  const nextDoc = selectCanonicalDocument(state, nextPages, nextLayouts);

  setCanonicalDocument(nextDoc, nextPages, nextLayouts);

  let deletedElementIds: string[] = [];
  if (frameExisted) {
    const legacyMirror = exportLegacyDocument(nextDoc);
    deletedElementIds = collectRemovedElementIds(
      state.elementsMap.values(),
      legacyMirror,
    );
    setElements(legacyMirror);
  }

  if (clearedPageIds.length > 0) {
    setPages(nextPages);
  }

  await persistDeleteReusableFrameMirror(
    frameId,
    clearedPageIds,
    deletedElementIds,
  );

  return {
    clearedPageIds,
    deletedElementIds,
    frameExisted,
  };
}

export async function duplicateReusableFrameElementsCanonicalPrimary({
  sourceFrameId,
  targetFrameId,
}: DuplicateReusableFrameElementsInput): Promise<Element[]> {
  const db = await getDB();
  const allElements = await db.elements.getAll();
  const originalElements = allElements.filter((element) =>
    matchesLegacyLayoutId(element, sourceFrameId),
  );

  if (originalElements.length === 0) {
    return [];
  }

  const idMap = new Map<string, string>();
  originalElements.forEach((element) => {
    idMap.set(element.id, crypto.randomUUID());
  });

  const newElements = originalElements.map((element) =>
    withLegacyLayoutId(
      {
        ...element,
        id: idMap.get(element.id)!,
        parent_id: element.parent_id
          ? (idMap.get(element.parent_id) ?? null)
          : null,
        page_id: null,
      },
      targetFrameId,
    ),
  );

  await db.elements.insertMany(newElements);
  mergeElementsCanonicalPrimary(newElements);

  return newElements;
}

export async function getPageIdsUsingFrameMirror(
  frameId: string,
): Promise<string[]> {
  const db = await getDB();
  const allPages = await db.pages.getAll();
  return allPages
    .filter((page) => getLegacyLayoutId(page) === frameId)
    .map((page) => page.id);
}
