import { useMemo, useCallback, memo } from "react";
import { AppWindow, Plus } from "lucide-react";
import { PropertySelect, PropertySection } from "../../../components";
import { GenericPropertyEditor } from "../generic";
import { PropertyEditorProps } from "../types/editorTypes";
import { iconProps } from "../../../../utils/ui/uiConstants";
import { PROPERTY_LABELS } from "../../../../utils/ui/labels";
import { getDB } from "../../../../lib/db";
import { useStore } from "../../../stores";
import type { Element } from "../../../../types/core/store.types";
import { ElementUtils } from "../../../../utils/element/elementUtils";
import { generateCustomId } from "../../../utils/idGeneration";
import { TabsSpec } from "@composition/specs";

const EMPTY_CHILDREN: Element[] = [];

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const TabsHybridAfterSections = memo(function TabsHybridAfterSections({
  elementId,
  currentProps,
  onUpdate,
}: PropertyEditorProps) {
  const addElement = useStore((state) => state.addElement);
  const currentPageId = useStore((state) => state.currentPageId);
  const rawChildren =
    useStore((state) => state.childrenMap.get(elementId)) ?? EMPTY_CHILDREN;
  const childrenMap = useStore((state) => state.childrenMap);

  const tabChildren = useMemo(() => {
    const directTabs = rawChildren
      .filter((child) => child.tag === "Tab")
      .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    if (directTabs.length > 0) return directTabs;

    const tabListEl = rawChildren.find((child) => child.tag === "TabList");
    if (tabListEl) {
      return (childrenMap.get(tabListEl.id) ?? [])
        .filter((child) => child.tag === "Tab")
        .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
    }
    return [];
  }, [rawChildren, childrenMap]);

  const defaultTabOptions = useMemo(() => {
    return tabChildren.map((tab) => {
      const tabKey = (tab.props.tabId as string) || tab.id;
      return {
        value: tabKey,
        label: ("title" in tab.props
          ? tab.props.title
          : "Untitled Tab") as string,
      };
    });
  }, [tabChildren]);

  const handleDefaultSelectedKeyChange = useCallback(
    (value: string) => {
      onUpdate({ defaultSelectedKey: value || undefined });
    },
    [onUpdate],
  );

  const addNewTab = useCallback(async () => {
    try {
      const pageIdToUse = await resolvePageId(currentPageId);
      if (!pageIdToUse) {
        alert("페이지 ID를 찾을 수 없습니다. 페이지를 새로고침해주세요.");
        return;
      }

      await createNewTab(
        tabChildren,
        currentProps,
        elementId,
        pageIdToUse,
        onUpdate,
        addElement,
      );
    } catch (err) {
      console.error("Add tab error:", err);
      alert("탭 추가 중 오류가 발생했습니다. 다시 시도해주세요.");
    }
  }, [
    addElement,
    currentPageId,
    currentProps,
    elementId,
    onUpdate,
    tabChildren,
  ]);

  return (
    <>
      <PropertySection title="State">
        <PropertySelect
          label={PROPERTY_LABELS.DEFAULT_TAB}
          value={String(currentProps.defaultSelectedKey || "")}
          onChange={handleDefaultSelectedKeyChange}
          options={defaultTabOptions}
          icon={AppWindow}
        />
      </PropertySection>

      <PropertySection title={PROPERTY_LABELS.TAB_MANAGEMENT}>
        <div className="tab-overview">
          <p className="tab-overview-text">
            Total tabs: {tabChildren.length || 0}
          </p>
          <p className="section-overview-help">
            Select individual tabs from layer tree to edit their properties
          </p>
        </div>

        <div className="tab-actions">
          <button className="control-button add" onClick={addNewTab}>
            <Plus
              color={iconProps.color}
              strokeWidth={iconProps.strokeWidth}
              size={iconProps.size}
            />
            {PROPERTY_LABELS.ADD_TAB}
          </button>
        </div>
      </PropertySection>
    </>
  );
});

export const TabsEditor = memo(function TabsEditor(props: PropertyEditorProps) {
  return (
    <GenericPropertyEditor
      {...props}
      spec={TabsSpec}
      renderAfterSections={(sectionProps) => (
        <TabsHybridAfterSections {...sectionProps} />
      )}
    />
  );
});

async function createNewTab(
  tabChildren: Element[],
  currentProps: Record<string, unknown>,
  elementId: string,
  pageId: string,
  onUpdate: (props: Record<string, unknown>) => void,
  addElement: (element: Element) => void,
) {
  const newTabIndex = tabChildren.length || 0;
  const tabId = ElementUtils.generateId();
  const { elements } = useStore.getState();

  const tabListEl = elements.find(
    (el) => el.parent_id === elementId && el.tag === "TabList",
  );
  const tabPanelsEl = elements.find(
    (el) => el.parent_id === elementId && el.tag === "TabPanels",
  );

  const tabParentId = tabListEl?.id || elementId;
  const panelParentId = tabPanelsEl?.id || elementId;

  const tabSiblings = elements.filter((el) => el.parent_id === tabParentId);
  const panelSiblings = elements.filter((el) => el.parent_id === panelParentId);
  const maxTabOrder = Math.max(
    0,
    ...tabSiblings.map((el) => el.order_num || 0),
  );
  const maxPanelOrder = Math.max(
    0,
    ...panelSiblings.map((el) => el.order_num || 0),
  );

  const newTabElement = {
    id: ElementUtils.generateId(),
    customId: generateCustomId("Tab", elements),
    page_id: pageId,
    tag: "Tab",
    props: {
      title: `Tab ${newTabIndex + 1}`,
      variant: "default",
      appearance: "light",
      style: {},
      className: "",
      tabId,
    },
    parent_id: tabParentId,
    order_num: maxTabOrder + 1,
  };

  const newPanelElement = {
    id: ElementUtils.generateId(),
    customId: generateCustomId("TabPanel", elements),
    page_id: pageId,
    tag: "TabPanel",
    props: {
      title: newTabElement.props.title,
      tabIndex: newTabIndex,
      style: {},
      className: "",
      tabId,
    },
    parent_id: panelParentId,
    order_num: maxPanelOrder + 1,
  };

  try {
    const db = await getDB();
    const insertedTab = await db.elements.insert(newTabElement);
    const insertedPanel = await db.elements.insert(newPanelElement);

    const updatedProps = {
      defaultSelectedKey: (tabChildren.length === 0
        ? tabId
        : currentProps.defaultSelectedKey) as string | undefined,
    };

    const tabsElement = useStore.getState().elementsMap.get(elementId);
    if (tabsElement) {
      try {
        await db.elements.update(elementId, { props: updatedProps });
      } catch (updateErr) {
        console.warn(
          `⚠️ [IndexedDB] Failed to update Tabs element ${elementId}:`,
          updateErr,
        );
      }
    }

    onUpdate(updatedProps);
    addElement(insertedTab);
    addElement(insertedPanel);
  } catch (err) {
    console.error("❌ [IndexedDB] createNewTab error:", err);
    try {
      const db = await getDB();
      await db.elements.delete(newTabElement.id);
      await db.elements.delete(newPanelElement.id);
    } catch (rollbackErr) {
      console.error("❌ [IndexedDB] Rollback failed:", rollbackErr);
    }
    throw err;
  }
}

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
