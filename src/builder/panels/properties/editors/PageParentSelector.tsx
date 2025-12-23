/**
 * Page Parent Selector
 *
 * Page Inspector에서 Parent Page를 선택하는 컴포넌트.
 * Nested Routes를 위한 계층 구조 설정.
 *
 * ⭐ Nested Routes & Slug System: Page에 Parent를 할당하여 중첩 URL 생성
 * 예: /products (부모) → /products/shoes (자식)
 */

import { memo, useMemo, useCallback, useState } from "react";
import { FolderTree, AlertCircle } from "lucide-react";
import { PropertySelect, PropertySection, PropertyInput } from "../../common";
import { useStore } from "../../../stores";
import { getDB } from "../../../../lib/db";
import {
  hasCircularReference,
  getNestingDepth,
  generatePageUrl,
} from "../../../../utils/urlGenerator";
import {
  validateSlug,
  generateSlugFromTitle,
} from "../../../../utils/slugValidator";
import { useLayoutsStore } from "../../../stores/layouts";
import { iconSmall } from "../../../../utils/ui/uiConstants";

interface PageParentSelectorProps {
  pageId: string;
}

const MAX_NESTING_DEPTH = 5; // 최대 중첩 깊이

export const PageParentSelector = memo(function PageParentSelector({
  pageId,
}: PageParentSelectorProps) {
  // Get current page and all pages
  const page = useStore((state) => state.pages.find((p) => p.id === pageId));
  const pages = useStore((state) => state.pages);
  const layouts = useLayoutsStore((state) => state.layouts);

  // Slug validation state
  const [slugError, setSlugError] = useState<string | null>(null);

  // Current parent
  const currentParentId = page?.parent_id || "";
  const currentParent = useMemo(
    () => pages.find((p) => p.id === currentParentId),
    [pages, currentParentId]
  );

  // Current slug
  const currentSlug = page?.slug || "";

  // Generate preview URL
  const previewUrl = useMemo(() => {
    if (!page) return "/";

    const layout = page.layout_id
      ? layouts.find((l) => l.id === page.layout_id)
      : null;

    return generatePageUrl({
      page: {
        id: page.id,
        title: page.title,
        slug: page.slug,
        project_id: page.project_id,
        parent_id: page.parent_id,
        layout_id: page.layout_id,
        order_num: page.order_num,
      },
      layout: layout
        ? { id: layout.id, name: layout.name, project_id: layout.project_id, slug: layout.slug || undefined }
        : null,
      allPages: pages.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        project_id: p.project_id,
        parent_id: p.parent_id,
        layout_id: p.layout_id,
        order_num: p.order_num,
      })),
    });
  }, [page, pages, layouts]);

  // Parent options (exclude self and descendants to prevent circular reference)
  const parentOptions = useMemo(() => {
    const options = [{ value: "", label: "No Parent (Root)" }];

    // Get all descendants of current page (to exclude from options)
    const getDescendants = (parentId: string): string[] => {
      const children = pages.filter((p) => p.parent_id === parentId);
      const descendants: string[] = children.map((c) => c.id);
      children.forEach((child) => {
        descendants.push(...getDescendants(child.id));
      });
      return descendants;
    };

    const descendants = getDescendants(pageId);

    pages.forEach((p) => {
      // Skip self
      if (p.id === pageId) return;

      // Skip descendants (would create circular reference)
      if (descendants.includes(p.id)) return;

      // Check nesting depth (prevent too deep nesting)
      const depthIfSelected = getNestingDepth(p.id, pages.map((pg) => ({
        id: pg.id,
        title: pg.title,
        slug: pg.slug,
        project_id: pg.project_id,
        parent_id: pg.parent_id,
        layout_id: pg.layout_id,
        order_num: pg.order_num,
      }))) + 1;

      if (depthIfSelected >= MAX_NESTING_DEPTH) return;

      // Add indentation based on depth
      const depth = getNestingDepth(p.id, pages.map((pg) => ({
        id: pg.id,
        title: pg.title,
        slug: pg.slug,
        project_id: pg.project_id,
        parent_id: pg.parent_id,
        layout_id: pg.layout_id,
        order_num: pg.order_num,
      })));
      const indent = "  ".repeat(depth);

      options.push({
        value: p.id,
        label: `${indent}${p.title}`,
      });
    });

    return options;
  }, [pages, pageId]);

  // Handle parent change
  const handleParentChange = useCallback(
    async (newParentId: string) => {
      // Check for circular reference
      if (
        newParentId &&
        hasCircularReference(
          pageId,
          newParentId,
          pages.map((p) => ({
            id: p.id,
            title: p.title,
            slug: p.slug,
            project_id: p.project_id,
            parent_id: p.parent_id,
            layout_id: p.layout_id,
            order_num: p.order_num,
          }))
        )
      ) {
        console.error("❌ Circular reference detected");
        return;
      }

      console.log("🔗 Page Parent changed:", {
        pageId,
        oldParentId: currentParentId,
        newParentId: newParentId || null,
      });

      try {
        const { pages: currentPages, setPages } = useStore.getState();
        const db = await getDB();

        // Update pages in memory
        const updatedPages = currentPages.map((p) =>
          p.id === pageId ? { ...p, parent_id: newParentId || null } : p
        );
        setPages(updatedPages);

        // Save to IndexedDB
        await db.pages.update(pageId, { parent_id: newParentId || null });

        console.log("✅ Page parent updated successfully");
      } catch (error) {
        console.error("❌ Failed to update page parent:", error);
      }
    },
    [pageId, currentParentId, pages]
  );

  // Handle slug change
  const handleSlugChange = useCallback(
    async (newSlug: string) => {
      // Validate slug
      const validation = validateSlug(newSlug);
      if (!validation.valid) {
        setSlugError(validation.error || "Invalid slug");
        return;
      }
      setSlugError(null);

      console.log("📝 Page Slug changed:", {
        pageId,
        oldSlug: currentSlug,
        newSlug: newSlug || null,
      });

      try {
        const { pages: currentPages, setPages } = useStore.getState();
        const db = await getDB();

        // Update pages in memory
        const updatedPages = currentPages.map((p) =>
          p.id === pageId ? { ...p, slug: newSlug || '' } : p
        );
        setPages(updatedPages);

        // Save to IndexedDB
        await db.pages.update(pageId, { slug: newSlug || '' });

        console.log("✅ Page slug updated successfully");
      } catch (error) {
        console.error("❌ Failed to update page slug:", error);
      }
    },
    [pageId, currentSlug]
  );

  // Generate slug from title
  const handleGenerateSlug = useCallback(() => {
    if (!page) return;
    const generatedSlug = generateSlugFromTitle(page.title);
    handleSlugChange(generatedSlug);
  }, [page, handleSlugChange]);

  if (!page) return null;

  return (
    <PropertySection title="Nested Routes" icon={FolderTree}>
      {/* Parent Page Selection */}
      <PropertySelect
        label="Parent Page"
        value={currentParentId}
        onChange={handleParentChange}
        options={parentOptions}
        icon={FolderTree}
        description={
          currentParent
            ? `Child of "${currentParent.title}"`
            : "This page is at root level"
        }
      />

      {/* Slug Input */}
      <div className="page-slug-input">
        <PropertyInput
          label="Slug"
          value={currentSlug}
          onChange={handleSlugChange}
          placeholder={generateSlugFromTitle(page.title)}
          description="URL path segment for this page"
        />
        {slugError && (
          <div className="page-slug-error">
            <AlertCircle size={iconSmall.size} />
            <span>{slugError}</span>
          </div>
        )}
        <button
          type="button"
          className="page-slug-generate"
          onClick={handleGenerateSlug}
          title="Generate slug from title"
        >
          Generate from Title
        </button>
      </div>

      {/* URL Preview */}
      <div className="page-url-preview">
        <span className="page-url-label">Preview URL:</span>
        <code className="page-url-value">{previewUrl}</code>
      </div>
    </PropertySection>
  );
});

export default PageParentSelector;
