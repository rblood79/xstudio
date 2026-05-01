import type { CompositionDocument } from "@composition/shared";
import type { Element, Page } from "@/types/builder/unified.types";
import type { Layout } from "@/types/builder/layout.types";
import { getDB } from "@/lib/db";
import { useCanonicalDocumentStore } from "@/builder/stores/canonical/canonicalDocumentStore";
import { selectCanonicalDocument } from "@/builder/stores/elements";
import { enqueuePagePersistence } from "@/builder/utils/pagePersistenceQueue";
import { mergeElementsCanonicalPrimary } from "./canonicalMutations";
import { loadFrameElements } from "./frameElementLoader";
import {
  getLegacyLayoutId,
  LEGACY_LAYOUT_ID_FIELD,
  withLegacyLayoutId,
} from "./legacyElementFields";

type ElementsStateForCanonicalDocument = Parameters<
  typeof selectCanonicalDocument
>[0];

export interface ApplyPageFrameBindingInput {
  pageId: string;
  frameId: string | null;
  layouts: Layout[];
  getElementsState: () => ElementsStateForCanonicalDocument;
  setPages: (pages: Page[]) => void;
}

export function getPageFrameBindingId(page: Page | undefined | null): string {
  return getLegacyLayoutId(page) ?? "";
}

function setCanonicalDocumentFromPageBinding(
  state: ElementsStateForCanonicalDocument,
  pages: Page[],
  layouts: Layout[],
  updatedPage: Page,
): CompositionDocument {
  const doc = selectCanonicalDocument(state, pages, layouts);
  const canonical = useCanonicalDocumentStore.getState();
  const projectId =
    canonical.currentProjectId ?? updatedPage.project_id ?? null;

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
      ...withLegacyLayoutId(updatedPage, frameId),
      updated_at: new Date().toISOString(),
    });
  });
}

export async function applyPageFrameBindingCanonicalPrimary({
  pageId,
  frameId,
  layouts,
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
    page.id === pageId ? withLegacyLayoutId(page, frameId) : page,
  );
  const updatedPage = updatedPages.find((page) => page.id === pageId);

  if (!updatedPage) {
    throw new Error(`Page not found: ${pageId}`);
  }

  setCanonicalDocumentFromPageBinding(
    getElementsState(),
    updatedPages,
    layouts,
    updatedPage,
  );
  setPages(updatedPages);
  await persistPageFrameBindingMirror(pageId, frameId, updatedPage);
}
