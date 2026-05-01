/**
 * Page Layout Selector
 *
 * ADR-903 P3-C: page 의 layout 연결 → page 노드의 reusable frame ref 선택 UI.
 * ADR-911 direct cutover: canonical reusable FrameNode read path.
 *
 * - `selectCanonicalDocument` 의 reusable FrameNode 추출
 *   (FramesTab 과 동일한 패턴 — selector cache 함정 회피용 useMemo + getState)
 *
 * id 정규화: canonical FrameNode.id 는 `"layout-<legacyId>"` 접두사 → `metadata.layoutId`
 * 우선 사용. legacy page layout binding 과 정합 유지.
 *
 * @deprecated-path `useLayoutsStore` direct access → canonical reusableFrames
 */

import { memo, useMemo, useCallback, useEffect } from "react";
import { Layout, X } from "lucide-react";
import { PropertySelect, PropertySection } from "../../../components";
import { useLayouts, useLayoutsStore } from "../../../stores/layouts";
import { useStore } from "../../../stores";
import { selectCanonicalDocument } from "../../../stores/elements";
import { iconEditProps } from "../../../../utils/ui/uiConstants";
import {
  applyPageFrameBindingCanonicalPrimary,
  getPageFrameBindingId,
} from "../../../../adapters/canonical/pageFrameBinding";
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

  // ADR-911 direct cutover: FramesTab 패턴과 동일한 canonical read path.
  // selector cache 함정 회피 — useMemo 안에서 useStore.getState() 호출.
  const elementsMap = useStore((state) => state.elementsMap);
  const pages = useStore((state) => state.pages);
  const reusableFrames = useMemo<
    ReadonlyArray<{ id: string; name: string; description?: string }>
  >(() => {
    void elementsMap;
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

  const selectedFrameId = getPageFrameBindingId(page);
  const currentLayout = useMemo(
    () => reusableFrames.find((f) => f.id === selectedFrameId),
    [reusableFrames, selectedFrameId],
  );

  const layoutOptions = useMemo(() => {
    const options = [{ value: "", label: "No Frame" }];
    reusableFrames.forEach((frame) => {
      options.push({ value: frame.id, label: frame.name });
    });
    return options;
  }, [reusableFrames]);

  const handleLayoutChange = useCallback(
    async (frameId: string) => {
      try {
        const state = useStore.getState();
        await applyPageFrameBindingCanonicalPrimary({
          pageId,
          frameId: frameId || null,
          layouts,
          getElementsState: () => useStore.getState(),
          setPages: state.setPages,
        });
      } catch (error) {
        console.error(
          "[PageLayoutSelector] Failed to update page layout:",
          error,
        );
      }
    },
    [layouts, pageId],
  );

  if (reusableFrames.length === 0) return null;

  return (
    <PropertySection title="Frame" icon={Layout}>
      <PropertySelect
        label="Apply Frame"
        value={selectedFrameId}
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
