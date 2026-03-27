import { useMemo, useCallback, memo } from "react";
import { Plus } from "lucide-react";
import { PropertySection } from "../../../components";
import { GenericPropertyEditor } from "../generic";
import { PropertyEditorProps } from "../types/editorTypes";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { useStore } from "../../../stores";
import { getDB } from "../../../../lib/db";
import { iconProps } from "../../../../utils/ui/uiConstants";
import { ElementUtils } from "../../../../utils/element/elementUtils";
import { generateCustomId } from "../../../utils/idGeneration";
import { TreeSpec } from "@xstudio/specs";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const TreeHybridAfterSections = memo(function TreeHybridAfterSections({
  elementId,
}: PropertyEditorProps) {
  const addElement = useStore((state) => state.addElement);
  const currentPageId = useStore((state) => state.currentPageId);

  const treeItemChildren = useMemo(() => {
    const { elements } = useStore.getState();
    return elements
      .filter(
        (child) => child.parent_id === elementId && child.tag === "TreeItem",
      )
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
  }, [elementId]);

  const addNewTreeItem = useCallback(async () => {
    try {
      const pageId = await resolvePageId(currentPageId);
      if (!pageId) {
        alert("페이지 ID를 찾을 수 없습니다. 페이지를 새로고침해주세요.");
        return;
      }

      const { elements } = useStore.getState();
      const newTreeItemIndex = treeItemChildren.length || 0;
      const newTreeItemElement = {
        id: ElementUtils.generateId(),
        customId: generateCustomId("TreeItem", elements),
        page_id: pageId,
        tag: "TreeItem",
        props: {
          title: `Item ${newTreeItemIndex + 1}`,
          value: `Item ${newTreeItemIndex + 1}`,
          children: `Item ${newTreeItemIndex + 1}`,
          isDisabled: false,
          style: {},
          className: "",
        },
        parent_id: elementId,
        order_num: newTreeItemIndex,
      };

      const db = await getDB();
      const insertedTreeItem = await db.elements.insert(newTreeItemElement);
      addElement(insertedTreeItem);
    } catch (err) {
      console.error("Add TreeItem error:", err);
      alert("TreeItem 추가 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
  }, [addElement, currentPageId, elementId, treeItemChildren.length]);

  return (
    <>
      <PropertySection title={PROPERTY_LABELS.TREE_ITEMS}>
        <div className="tree-overview">
          <p className="tree-overview-text">
            Total tree items: {treeItemChildren.length || 0}
          </p>
          <p className="tree-overview-help">
            Select individual tree items from layer tree to edit their
            properties
          </p>
        </div>

        <div className="tree-actions">
          <button className="control-button add" onClick={addNewTreeItem}>
            <Plus
              color={iconProps.color}
              strokeWidth={iconProps.strokeWidth}
              size={iconProps.size}
            />
            Add TreeItem
          </button>
        </div>
      </PropertySection>
    </>
  );
});

export const TreeEditor = memo(function TreeEditor(props: PropertyEditorProps) {
  return (
    <GenericPropertyEditor
      {...props}
      spec={TreeSpec}
      renderAfterSections={(sectionProps) => (
        <TreeHybridAfterSections {...sectionProps} />
      )}
    />
  );
});

async function resolvePageId(
  currentPageId: string | null,
): Promise<string | null> {
  if (currentPageId) return currentPageId;

  const pathParts = window.location.pathname.split("/");
  const urlPageId = pathParts[pathParts.length - 1];
  if (urlPageId && UUID_REGEX.test(urlPageId)) {
    return urlPageId;
  }

  const projectId = pathParts[pathParts.length - 2];
  if (!projectId) return null;

  try {
    const db = await getDB();
    const pages = await db.pages.getByProject(projectId);
    if (!pages || pages.length === 0) return null;

    const sortedPages = pages.sort((a, b) => {
      const dateA = new Date(a.created_at || 0).getTime();
      const dateB = new Date(b.created_at || 0).getTime();
      return dateB - dateA;
    });
    return sortedPages[0].id;
  } catch (err) {
    console.error("❌ [IndexedDB] Failed to resolve page ID:", err);
    return null;
  }
}
