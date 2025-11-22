/**
 * Page Layout Selector
 *
 * Page Inspector에서 Layout을 선택하는 컴포넌트.
 * Page에 Layout을 적용하거나 해제할 수 있음.
 *
 * ⭐ Layout/Slot System: Page에 Layout을 할당하여 템플릿 적용
 */

import { memo, useMemo, useCallback } from "react";
import { Layout, X } from "lucide-react";
import { PropertySelect, PropertySection } from "../../common";
import { useLayoutsStore } from "../../../stores/layouts";
import { useStore } from "../../../stores";
import { getDB } from "../../../../lib/db";

interface PageLayoutSelectorProps {
  pageId: string;
}

export const PageLayoutSelector = memo(function PageLayoutSelector({
  pageId,
}: PageLayoutSelectorProps) {
  // Get current page
  const page = useStore((state) => state.pages.find((p) => p.id === pageId));
  const layouts = useLayoutsStore((state) => state.layouts);

  // Current layout
  const currentLayoutId = page?.layout_id || "";
  const currentLayout = useMemo(
    () => layouts.find((l) => l.id === currentLayoutId),
    [layouts, currentLayoutId]
  );

  // Layout options
  const layoutOptions = useMemo(() => {
    const options = [{ value: "", label: "No Layout" }];
    layouts.forEach((layout) => {
      options.push({
        value: layout.id,
        label: layout.name,
      });
    });
    return options;
  }, [layouts]);

  // Handle layout change
  const handleLayoutChange = useCallback(async (layoutId: string) => {
    console.log("📐 Page Layout changed:", {
      pageId,
      oldLayoutId: currentLayoutId,
      newLayoutId: layoutId || null,
    });

    try {
      const { pages, setPages, elements, setElements } = useStore.getState();
      const db = await getDB();

      // 1. ⭐ Layout 요소들을 먼저 로드 (UPDATE_PAGE_INFO 전에 요소가 준비되어야 함)
      let mergedElements = [...elements];
      if (layoutId) {
        const layoutElements = await db.elements.getByLayout(layoutId);
        console.log(`📥 [PageLayoutSelector] Layout ${layoutId.slice(0, 8)} 요소 ${layoutElements.length}개 선 로드`);

        // 기존 요소들 중 해당 레이아웃 요소가 아닌 것들 유지 + 새 레이아웃 요소 추가
        const otherElements = elements.filter((el) => el.layout_id !== layoutId);
        mergedElements = [...otherElements, ...layoutElements];
        setElements(mergedElements, { skipHistory: true });
      }

      // 2. 요소 로드 완료 후 pages 업데이트 (이때 UPDATE_PAGE_INFO 전송됨)
      const updatedPages = pages.map((p) =>
        p.id === pageId ? { ...p, layout_id: layoutId || null } : p
      );
      setPages(updatedPages);

      // 3. Save to IndexedDB
      await db.pages.update(pageId, { layout_id: layoutId || null });

      console.log("✅ Page layout updated successfully");
    } catch (error) {
      console.error("❌ Failed to update page layout:", error);
    }
  }, [pageId, currentLayoutId]);

  // Don't render if no layouts exist
  if (layouts.length === 0) {
    return null;
  }

  return (
    <PropertySection title="Layout" icon={Layout}>
      <PropertySelect
        label="Apply Layout"
        value={currentLayoutId}
        onChange={handleLayoutChange}
        options={layoutOptions}
        icon={Layout}
        description={
          currentLayout
            ? `Using "${currentLayout.name}" layout`
            : "Select a layout template for this page"
        }
      />

      {currentLayout && (
        <div className="page-layout-info">
          {currentLayout.description && (
            <p className="page-layout-description">{currentLayout.description}</p>
          )}
          <button
            className="page-layout-clear"
            onClick={() => handleLayoutChange("")}
            title="Remove layout from this page"
          >
            <X size={14} />
            <span>Remove Layout</span>
          </button>
        </div>
      )}
    </PropertySection>
  );
});

export default PageLayoutSelector;
