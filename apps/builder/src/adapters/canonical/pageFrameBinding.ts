import type {
  CanonicalNode,
  CompositionDocument,
  FrameNode,
  RefNode,
} from "@composition/shared";
import type { Element, Page } from "@/types/builder/unified.types";
import { getDB } from "../../lib/db";
import { useCanonicalDocumentStore } from "../../builder/stores/canonical/canonicalDocumentStore";
import { enqueuePagePersistence } from "../../builder/utils/pagePersistenceQueue";
import { mergeElementsCanonicalPrimary } from "./canonicalMutations";
import { loadFrameElements } from "./frameElementLoader";
import { LEGACY_LAYOUT_ID_FIELD } from "./legacyElementFields";
import {
  getPageFrameBindingId,
  getReusableFrameMirrorId,
  withPageFrameBinding,
} from "./frameMirror";

export { getPageFrameBindingId } from "./frameMirror";

interface ElementsStateForPageBinding {
  pages: Page[];
}

export interface ApplyPageFrameBindingInput {
  pageId: string;
  frameId: string | null;
  getElementsState: () => ElementsStateForPageBinding;
  setPages: (pages: Page[]) => void;
}

function isPageNode(node: CanonicalNode, pageId: string): boolean {
  const metadata = node.metadata as
    | { type?: unknown; pageId?: unknown }
    | undefined;
  return (
    node.id === pageId &&
    metadata?.type === "legacy-page" &&
    metadata.pageId === pageId
  );
}

function isReusableFrameNode(node: CanonicalNode): node is FrameNode {
  return node.type === "frame" && (node as FrameNode).reusable === true;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function reusableFrameMatchesBindingId(
  frame: FrameNode,
  frameId: string,
): boolean {
  if (frame.id === frameId) return true;
  if (getReusableFrameMirrorId(frame) === frameId) return true;
  if (frame.name === frameId) return true;

  const metadata = frame.metadata as
    | {
        componentName?: unknown;
        customId?: unknown;
        layoutId?: unknown;
      }
    | undefined;

  return (
    metadata?.layoutId === frameId ||
    (isNonEmptyString(metadata?.customId) && metadata.customId === frameId) ||
    (isNonEmptyString(metadata?.componentName) &&
      metadata.componentName === frameId)
  );
}

function toLegacyFrameRefId(frameId: string): string {
  return frameId.startsWith("layout-") ? frameId : `layout-${frameId}`;
}

function resolvePageFrameRefId(
  doc: CompositionDocument,
  frameId: string,
): string {
  const frame = doc.children.find(
    (node): node is FrameNode =>
      isReusableFrameNode(node) && reusableFrameMatchesBindingId(node, frameId),
  );

  return frame?.id ?? toLegacyFrameRefId(frameId);
}

function buildPageMetadata(
  updatedPage: Page,
  frameId: string | null,
  existingNode?: CanonicalNode,
): CanonicalNode["metadata"] {
  const existingMetadata = existingNode?.metadata ?? { type: "legacy-page" };
  const metadata = {
    ...existingMetadata,
    type: "legacy-page",
    pageId: updatedPage.id,
    slug: updatedPage.slug ?? null,
  };

  if (frameId) {
    return {
      ...metadata,
      layoutId: frameId,
    };
  }

  const withoutLayoutId = {
    ...metadata,
  } as typeof metadata & { layoutId?: unknown };
  delete withoutLayoutId.layoutId;
  return withoutLayoutId;
}

function getChildrenFromDescendants(refNode: RefNode): CanonicalNode[] {
  const children: CanonicalNode[] = [];
  const descendants = refNode.descendants ?? {};

  for (const override of Object.values(descendants)) {
    if (
      override &&
      typeof override === "object" &&
      "children" in override &&
      Array.isArray(override.children)
    ) {
      children.push(...override.children);
    } else if (
      override &&
      typeof override === "object" &&
      "type" in override &&
      typeof override.type === "string"
    ) {
      children.push(override as CanonicalNode);
    }
  }

  return children;
}

function buildPageNode(
  updatedPage: Page,
  frameId: string | null,
  frameRefId: string | null,
  existingNode?: CanonicalNode,
): CanonicalNode {
  if (frameId) {
    const descendants =
      existingNode?.type === "ref"
        ? (existingNode as RefNode).descendants
        : undefined;
    const directChildren =
      existingNode?.type === "frame" ? existingNode.children : undefined;
    const nextNode: RefNode = {
      id: updatedPage.id,
      type: "ref",
      ref: frameRefId ?? toLegacyFrameRefId(frameId),
      name: updatedPage.title,
      metadata: buildPageMetadata(updatedPage, frameId, existingNode),
      ...(descendants && Object.keys(descendants).length > 0
        ? { descendants }
        : directChildren && directChildren.length > 0
          ? { descendants: { content: { children: directChildren } } }
          : {}),
    };
    return nextNode;
  }

  const children =
    existingNode?.type === "ref"
      ? getChildrenFromDescendants(existingNode as RefNode)
      : (existingNode?.children ?? []);

  const nextNode: FrameNode = {
    id: updatedPage.id,
    type: "frame",
    name: updatedPage.title,
    metadata: buildPageMetadata(updatedPage, null, existingNode),
    ...(children.length > 0 ? { children } : {}),
  };
  return nextNode;
}

function setCanonicalDocumentFromPageBinding(
  updatedPage: Page,
): CompositionDocument {
  const canonical = useCanonicalDocumentStore.getState();
  const projectId =
    canonical.currentProjectId ?? updatedPage.project_id ?? null;
  const currentDoc = (projectId ? canonical.getDocument(projectId) : null) ??
    (canonical.currentProjectId
      ? canonical.getDocument(canonical.currentProjectId)
      : null) ?? { version: "composition-1.0", children: [] };
  const pageIndex = currentDoc.children.findIndex((node) =>
    isPageNode(node, updatedPage.id),
  );
  const existingPageNode =
    pageIndex >= 0 ? currentDoc.children[pageIndex] : undefined;
  const frameId = getPageFrameBindingId(updatedPage) || null;
  const nextPageNode = buildPageNode(
    updatedPage,
    frameId,
    frameId ? resolvePageFrameRefId(currentDoc, frameId) : null,
    existingPageNode,
  );
  const nextChildren = [...currentDoc.children];
  if (pageIndex >= 0) {
    nextChildren[pageIndex] = nextPageNode;
  } else {
    nextChildren.push(nextPageNode);
  }
  const doc: CompositionDocument = {
    ...currentDoc,
    children: nextChildren,
  };

  if (projectId) {
    if (canonical.currentProjectId !== projectId) {
      canonical.setCurrentProject(projectId);
    }
    canonical.setDocument(projectId, doc);
  }

  return doc;
}

async function persistPageFrameBindingMirror(
  pageId: string,
  frameId: string | null,
  updatedPage: Page,
): Promise<void> {
  await enqueuePagePersistence(async () => {
    const persistenceDb = await getDB();
    const existingPage = await persistenceDb.pages.getById(pageId);

    if (existingPage) {
      await persistenceDb.pages.update(pageId, {
        [LEGACY_LAYOUT_ID_FIELD]: frameId,
      });
      return;
    }

    await persistenceDb.pages.insert({
      ...withPageFrameBinding(updatedPage, frameId),
      updated_at: new Date().toISOString(),
    });
  });
}

export async function applyPageFrameBindingCanonicalPrimary({
  pageId,
  frameId,
  getElementsState,
  setPages,
}: ApplyPageFrameBindingInput): Promise<void> {
  if (frameId) {
    const db = await getDB();
    const frameElements = await loadFrameElements(db, frameId);
    mergeElementsCanonicalPrimary(frameElements as Element[]);
  }

  const state = getElementsState();
  const updatedPages = state.pages.map((page) =>
    page.id === pageId ? withPageFrameBinding(page, frameId) : page,
  );
  const updatedPage = updatedPages.find((page) => page.id === pageId);

  if (!updatedPage) {
    throw new Error(`Page not found: ${pageId}`);
  }

  setCanonicalDocumentFromPageBinding(updatedPage);
  setPages(updatedPages);
  await persistPageFrameBindingMirror(pageId, frameId, updatedPage);
}
