/**
 * Page Layout Selector
 *
 * ADR-903 P3-C: page 의 layout 연결 → page 노드의 reusable frame ref 선택 UI.
 * ADR-911 P2 PR-E1: read path dual-mode (`isFramesTabCanonical()` flag 분기).
 *
 * - **legacy path** (default false): `useLayouts()` hook (P3-B canonical surface)
 * - **canonical path** (true): `selectCanonicalDocument` 의 reusable FrameNode 추출
 *   (PR-C FramesTab 과 동일한 패턴 — selector cache 함정 회피용 useMemo + getState)
 *
 * id 정규화: canonical FrameNode.id 는 `"layout-<legacyId>"` 접두사 → `metadata.layoutId`
 * 우선 사용. legacy `page.layout_id` 와 정합 유지.
 *
 * write (`handleLayoutChange`) 는 legacy 그대로 — `pages.update(layout_id)` 직접 호출.
 * P3-D 이후 canonical document mutation (page RefNode.ref 변경) 으로 전환.
 *
 * @deprecated-path `useLayoutsStore` direct access → `useLayouts` / dual-mode reusableFrames
 */

import { memo, useMemo, useCallback, useEffect } from "react";
import { Layout, X } from "lucide-react";
import { PropertySelect, PropertySection } from "../../../components";
import { useLayouts, useLayoutsStore } from "../../../stores/layouts";
import { useStore } from "../../../stores";
import { selectCanonicalDocument } from "../../../stores/elements";
import { getDB } from "../../../../lib/db";
import { iconEditProps } from "../../../../utils/ui/uiConstants";
import { isFramesTabCanonical } from "../../../../utils/featureFlags";
import { enqueuePagePersistence } from "../../../utils/pagePersistenceQueue";
import type { FrameNode } from "@composition/shared";

interface PageLayoutSelectorProps {
  pageId: string;
}

export const PageLayoutSelector = memo(function PageLayoutSelector({
  pageId,
}: PageLayoutSelectorProps) {
  const page = useStore((state) => state.pages.find((p) => p.id === pageId));

  // P3-C: useLayouts() hook (P3-B canonical surface)
  const layouts = useLayouts();

  // fetchLayouts: layouts.length === 0 일 때 자동 로드
  const fetchLayouts = useLayoutsStore((state) => state.fetchLayouts);

  useEffect(() => {
    if (layouts.length === 0 && page?.project_id) {
      fetchLayouts(page.project_id);
    }
  }, [layouts.length, fetchLayouts, page?.project_id]);

  // ADR-911 P2 PR-E1: dual-mode read path (PR-C FramesTab 패턴 동일).
  // selector cache 함정 회피 — useMemo 안에서 useStore.getState() 호출.
  const elementsMap = useStore((state) => state.elementsMap);
  const pages = useStore((state) => state.pages);
  const reusableFrames = useMemo<
    ReadonlyArray<{ id: string; name: string; description?: string }>
  >(() => {
    if (!isFramesTabCanonical()) {
      return layouts.map((l) => ({
        id: l.id,
        name: l.name,
        description: l.description,
      }));
    }
    const state = useStore.getState();
    const doc = selectCanonicalDocument(state, pages, layouts);
    return doc.children
      .filter(
        (n): n is FrameNode =>
          n.type === "frame" && (n as FrameNode).reusable === true,
      )
      .map((f) => {
        const meta = f.metadata as
          | { layoutId?: string; description?: string }
          | undefined;
        return {
          id: meta?.layoutId ?? f.id,
          name: f.name ?? "",
          description: meta?.description,
        };
      });
    // elementsMap 변경 시 canonical projection 도 갱신 (selectCanonicalDocument 가 elements 소비)
  }, [layouts, pages, elementsMap]);

  // P3-C: page.layout_id는 legacy field — P3-D에서 canonical ref로 전환 예정
  const currentLayoutId = page?.layout_id || "";
  const currentLayout = useMemo(
    () => reusableFrames.find((f) => f.id === currentLayoutId),
    [reusableFrames, currentLayoutId],
  );

  const layoutOptions = useMemo(() => {
    const options = [{ value: "", label: "No Frame" }];
    reusableFrames.forEach((frame) => {
      options.push({ value: frame.id, label: frame.name });
    });
    return options;
  }, [reusableFrames]);

  const handleLayoutChange = useCallback(
    async (layoutId: string) => {
      try {
        const { pages, setPages, mergeElements } = useStore.getState();
        const db = await getDB();
        const nextLayoutId = layoutId || null;

        if (layoutId) {
          // ADR-903 P3-E follow-up: canonical parent 기반 조회
          const layoutElements = await db.elements.getDescendants(layoutId);
          mergeElements(layoutElements);
        }

        const updatedPages = pages.map((p) =>
          p.id === pageId ? { ...p, layout_id: nextLayoutId } : p,
        );
        const updatedPage = updatedPages.find((p) => p.id === pageId);
        setPages(updatedPages);

        await enqueuePagePersistence(async () => {
          const persistenceDb = await getDB();
          const existingPage = await persistenceDb.pages.getById(pageId);

          if (existingPage) {
            await persistenceDb.pages.update(pageId, {
              layout_id: nextLayoutId,
            });
            return;
          }

          if (updatedPage) {
            await persistenceDb.pages.insert({
              ...updatedPage,
              layout_id: nextLayoutId,
              updated_at: new Date().toISOString(),
            });
          }
        });
      } catch (error) {
        console.error(
          "[PageLayoutSelector] Failed to update page layout:",
          error,
        );
      }
    },
    [pageId],
  );

  if (reusableFrames.length === 0) return null;

  return (
    <PropertySection title="Frame" icon={Layout}>
      <PropertySelect
        label="Apply Frame"
        value={currentLayoutId}
        onChange={handleLayoutChange}
        options={layoutOptions}
        icon={Layout}
        description={
          currentLayout
            ? `Using "${currentLayout.name}" frame`
            : "Select a reusable frame for this page"
        }
      />

      {currentLayout && (
        <div className="page-layout-info">
          {currentLayout.description && (
            <p className="page-layout-description">
              {currentLayout.description}
            </p>
          )}
          <button
            className="page-layout-clear"
            onClick={() => handleLayoutChange("")}
            title="Remove frame from this page"
          >
            <X size={iconEditProps.size} />
            <span>Remove Frame</span>
          </button>
        </div>
      )}
    </PropertySection>
  );
});

export default PageLayoutSelector;
