/**
 * Page Parent Selector
 *
 * ADR-903 P3-C: useLayoutsStore 직접 구독 → useLayouts() hook으로 전환.
 *
 * P3-C 변경:
 * - `useLayoutsStore((state) => state.layouts)` → `useLayouts()` hook
 * - `page.layout_id` field 참조는 URL 생성 유틸 전달용 — P3-D에서 canonical ref로 전환 예정
 *
 * @deprecated-path `useLayoutsStore` direct access → `useLayouts`
 */

import { memo, useMemo, useCallback, useState } from "react";
import { FolderTree, AlertCircle } from "lucide-react";
import {
  PropertySelect,
  PropertySection,
  PropertyInput,
} from "../../../components";
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
import { useLayouts } from "../../../stores/layouts";
import { iconSmall } from "../../../../utils/ui/uiConstants";

interface PageParentSelectorProps {
  pageId: string;
}

const MAX_NESTING_DEPTH = 5;

export const PageParentSelector = memo(function PageParentSelector({
  pageId,
}: PageParentSelectorProps) {
  const page = useStore((state) => state.pages.find((p) => p.id === pageId));
  const pages = useStore((state) => state.pages);

  // P3-C: useLayouts() hook (P3-B canonical surface)
  const layouts = useLayouts();

  const [slugError, setSlugError] = useState<string | null>(null);

  const currentParentId = page?.parent_id || "";
  const currentParent = useMemo(
    () => pages.find((p) => p.id === currentParentId),
    [pages, currentParentId],
  );

  const currentSlug = page?.slug || "";

  const previewUrl = useMemo(() => {
    if (!page) return "/";

    // P3-C: page.layout_id는 URL 생성 유틸 전달용 — legacy field 유지
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
        ? {
            id: layout.id,
            name: layout.name,
            project_id: layout.project_id,
            slug: layout.slug || undefined,
          }
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

  const parentOptions = useMemo(() => {
    const options = [{ value: "", label: "No Parent (Root)" }];

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
      if (p.id === pageId) return;
      if (descendants.includes(p.id)) return;

      const depthIfSelected =
        getNestingDepth(
          p.id,
          pages.map((pg) => ({
            id: pg.id,
            title: pg.title,
            slug: pg.slug,
            project_id: pg.project_id,
            parent_id: pg.parent_id,
            layout_id: pg.layout_id,
            order_num: pg.order_num,
          })),
        ) + 1;

      if (depthIfSelected >= MAX_NESTING_DEPTH) return;

      const depth = getNestingDepth(
        p.id,
        pages.map((pg) => ({
          id: pg.id,
          title: pg.title,
          slug: pg.slug,
          project_id: pg.project_id,
          parent_id: pg.parent_id,
          layout_id: pg.layout_id,
          order_num: pg.order_num,
        })),
      );
      const indent = "  ".repeat(depth);

      options.push({ value: p.id, label: `${indent}${p.title}` });
    });

    return options;
  }, [pages, pageId]);

  const handleParentChange = useCallback(
    async (newParentId: string) => {
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
          })),
        )
      ) {
        console.error("[PageParentSelector] Circular reference detected");
        return;
      }

      try {
        const { pages: currentPages, setPages } = useStore.getState();
        const db = await getDB();

        const updatedPages = currentPages.map((p) =>
          p.id === pageId ? { ...p, parent_id: newParentId || null } : p,
        );
        setPages(updatedPages);

        await db.pages.update(pageId, { parent_id: newParentId || null });
      } catch (error) {
        console.error(
          "[PageParentSelector] Failed to update page parent:",
          error,
        );
      }
    },
    [pageId, pages],
  );

  const handleSlugChange = useCallback(
    async (newSlug: string) => {
      const validation = validateSlug(newSlug);
      if (!validation.valid) {
        setSlugError(validation.error || "Invalid slug");
        return;
      }
      setSlugError(null);

      try {
        const { pages: currentPages, setPages } = useStore.getState();
        const db = await getDB();

        const updatedPages = currentPages.map((p) =>
          p.id === pageId ? { ...p, slug: newSlug || "" } : p,
        );
        setPages(updatedPages);

        await db.pages.update(pageId, { slug: newSlug || "" });
      } catch (error) {
        console.error(
          "[PageParentSelector] Failed to update page slug:",
          error,
        );
      }
    },
    [pageId],
  );

  const handleGenerateSlug = useCallback(() => {
    if (!page) return;
    const generatedSlug = generateSlugFromTitle(page.title);
    handleSlugChange(generatedSlug);
  }, [page, handleSlugChange]);

  if (!page) return null;

  return (
    <PropertySection title="Nested Routes" icon={FolderTree}>
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

      <div className="page-url-preview">
        <span className="page-url-label">Preview URL:</span>
        <code className="page-url-value">{previewUrl}</code>
      </div>
    </PropertySection>
  );
});

export default PageParentSelector;
