/**
 * Layout Slug Editor
 *
 * Layout Inspector에서 Layout의 slug를 편집하는 컴포넌트.
 * Layout에 slug를 설정하면 해당 Layout을 사용하는 모든 Page의 URL이
 * slug로 시작하게 됨.
 *
 * ⭐ Nested Routes & Slug System: Layout에 URL prefix 설정
 * 예: slug="/products" → /products/shoes, /products/shirts
 */

import { memo, useState, useCallback } from "react";
import { Link, AlertCircle, RefreshCw } from "lucide-react";
import { PropertyInput, PropertySection } from "../../common";
import { useLayoutsStore } from "../../../stores/layouts";
import { getDB } from "../../../../lib/db";
import {
  validateSlug,
  generateSlugFromTitle,
  toAbsoluteSlug,
} from "../../../../utils/slugValidator";
import { iconSmall } from "../../../../utils/ui/uiConstants";

interface LayoutSlugEditorProps {
  layoutId: string;
}

export const LayoutSlugEditor = memo(function LayoutSlugEditor({
  layoutId,
}: LayoutSlugEditorProps) {
  // Get current layout
  const layout = useLayoutsStore((state) =>
    state.layouts.find((l) => l.id === layoutId)
  );
  const updateLayout = useLayoutsStore((state) => state.updateLayout);

  // Slug validation state
  const [slugError, setSlugError] = useState<string | null>(null);

  // Current slug
  const currentSlug = layout?.slug || "";

  // Handle slug change
  const handleSlugChange = useCallback(
    async (newSlug: string) => {
      // Normalize slug (add leading slash if not empty)
      const normalizedSlug = newSlug
        ? toAbsoluteSlug(newSlug)
        : "";

      // Validate slug (empty is allowed)
      if (normalizedSlug) {
        const validation = validateSlug(normalizedSlug);
        if (!validation.isValid) {
          setSlugError(validation.error || "Invalid slug");
          return;
        }
      }
      setSlugError(null);

      console.log("📝 Layout Slug changed:", {
        layoutId,
        oldSlug: currentSlug,
        newSlug: normalizedSlug || null,
      });

      try {
        const db = await getDB();

        // Update in store (triggers useEffect in useIframeMessenger → sendLayoutsToIframe)
        updateLayout(layoutId, { slug: normalizedSlug || null });

        // Save to IndexedDB
        await db.layouts.update(layoutId, { slug: normalizedSlug || null });

        console.log("✅ Layout slug updated successfully");
      } catch (error) {
        console.error("❌ Failed to update layout slug:", error);
      }
    },
    [layoutId, currentSlug, updateLayout]
  );

  // Generate slug from layout name
  const handleGenerateSlug = useCallback(() => {
    if (!layout) return;
    const generatedSlug = toAbsoluteSlug(generateSlugFromTitle(layout.name));
    handleSlugChange(generatedSlug);
  }, [layout, handleSlugChange]);

  // Clear slug
  const handleClearSlug = useCallback(() => {
    handleSlugChange("");
  }, [handleSlugChange]);

  if (!layout) return null;

  return (
    <PropertySection title="URL Prefix" icon={Link}>
      <div className="layout-slug-editor">
        <PropertyInput
          label="Slug"
          value={currentSlug}
          onChange={handleSlugChange}
          placeholder={`/${generateSlugFromTitle(layout.name)}`}
          description="URL prefix for pages using this layout"
          icon={Link}
        />

        {slugError && (
          <div className="page-slug-error">
            <AlertCircle size={iconSmall.size} />
            <span>{slugError}</span>
          </div>
        )}

        <div className="layout-slug-actions">
          <button
            type="button"
            className="page-slug-generate"
            onClick={handleGenerateSlug}
            title="Generate slug from layout name"
          >
            <RefreshCw size={iconSmall.size} />
            Generate
          </button>

          {currentSlug && (
            <button
              type="button"
              className="page-layout-clear"
              onClick={handleClearSlug}
              title="Remove slug"
            >
              Clear
            </button>
          )}
        </div>

        {currentSlug && (
          <div className="page-url-preview">
            <span className="page-url-label">Pages with this layout will have URLs like:</span>
            <code className="page-url-value">{currentSlug}/page-slug</code>
          </div>
        )}
      </div>
    </PropertySection>
  );
});

export default LayoutSlugEditor;
