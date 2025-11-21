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
      // 1. Update pages state in store
      const { pages, setPages } = useStore.getState();
      const updatedPages = pages.map((p) =>
        p.id === pageId ? { ...p, layout_id: layoutId || null } : p
      );
      setPages(updatedPages);

      // 2. Save to IndexedDB
      const db = await getDB();
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
