/**
 * Page Layout Selector
 *
 * ADR-903 P3-C: page 의 layout 연결 → page 노드의 reusable frame ref 선택 UI.
 *
 * P3-C 변경:
 * - frame 목록: `useLayouts()` hook (P3-B canonical surface)
 * - `layout_id` read: page.layout_id (legacy field — P3-D 에서 canonical ref로 전환)
 * - `useLayoutsStore` 직접 접근 제거: `useLayouts` + `useFetchLayouts` hook 사용
 *
 * @deprecated-path `useLayoutsStore` direct access → `useLayouts` / `useFetchLayouts`
 */

import { memo, useMemo, useCallback, useEffect } from "react";
import { Layout, X } from "lucide-react";
import { PropertySelect, PropertySection } from "../../../components";
import { useLayouts } from "../../../stores/layouts";
import { useStore } from "../../../stores";
import { getDB } from "../../../../lib/db";
import { iconEditProps } from "../../../../utils/ui/uiConstants";
import { useLayoutsStore } from "../../../stores/layouts";

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

  // P3-C: page.layout_id는 legacy field — P3-D에서 canonical ref로 전환 예정
  const currentLayoutId = page?.layout_id || "";
  const currentLayout = useMemo(
    () => layouts.find((l) => l.id === currentLayoutId),
    [layouts, currentLayoutId],
  );

  const layoutOptions = useMemo(() => {
    const options = [{ value: "", label: "No Frame" }];
    layouts.forEach((layout) => {
      options.push({ value: layout.id, label: layout.name });
    });
    return options;
  }, [layouts]);

  const handleLayoutChange = useCallback(
    async (layoutId: string) => {
      try {
        const { pages, setPages, mergeElements } = useStore.getState();
        const db = await getDB();

        if (layoutId) {
          // ADR-903 P3-D 진입 전: getByLayout bridge 유지
          const layoutElements = await db.elements.getByLayout(layoutId);
          mergeElements(layoutElements);
        }

        const updatedPages = pages.map((p) =>
          p.id === pageId ? { ...p, layout_id: layoutId || null } : p,
        );
        setPages(updatedPages);

        await db.pages.update(pageId, { layout_id: layoutId || null });
      } catch (error) {
        console.error(
          "[PageLayoutSelector] Failed to update page layout:",
          error,
        );
      }
    },
    [pageId],
  );

  if (layouts.length === 0) return null;

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
