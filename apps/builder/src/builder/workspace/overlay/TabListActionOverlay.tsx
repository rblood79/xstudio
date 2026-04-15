/**
 * TabList Action Overlay (ADR-066)
 *
 * Tabs 요소 선택 시 TabList 우측에 +/- 버튼을 표시하는 DOM 오버레이.
 * RAC 공식 레퍼런스(react-aria.adobe.com/Tabs)와 동일한 UX 제공.
 *
 * - Canvas(Skia) 위에 절대 위치로 렌더
 * - TabList bounds 구독 (scene 좌표 → screen 좌표 변환)
 * - +/- 클릭 → tabsItemActions helper 호출
 */

import { useEffect, useRef, useState, useCallback } from "react";
import { Plus, Minus } from "lucide-react";
import { getSceneBounds, subscribeBounds } from "../canvas/skia/renderCommands";
import { useStore } from "../../stores";
import type { TabItem } from "@composition/specs";
import {
  addTabItem,
  removeTabItem,
  resolvePageId,
} from "../../panels/properties/editors/tabsItemActions";

interface TabListActionOverlayProps {
  tabsElementId: string;
  zoom: number;
  panOffset: { x: number; y: number };
}

export function TabListActionOverlay({
  tabsElementId,
  zoom,
  panOffset,
}: TabListActionOverlayProps) {
  const elements = useStore((state) => state.elements);
  const addElement = useStore((state) => state.addElement);
  const removeElement = useStore((state) => state.removeElement);
  const updateElementProps = useStore((state) => state.updateElementProps);
  const currentPageId = useStore((state) => state.currentPageId);

  // Tabs 요소 + TabList 자식 조회
  const tabsElement = elements.find((el) => el.id === tabsElementId);
  const tabListElement = elements.find(
    (el) => el.parent_id === tabsElementId && el.tag === "TabList",
  );

  const [tabListBounds, setTabListBounds] = useState(() =>
    tabListElement ? getSceneBounds(tabListElement.id) : undefined,
  );
  const boundsRef = useRef(tabListBounds);
  boundsRef.current = tabListBounds;

  useEffect(() => {
    if (!tabListElement) return;
    const initial = getSceneBounds(tabListElement.id);
    if (initial) setTabListBounds(initial);
    const unsubscribe = subscribeBounds(tabListElement.id, (_id, next) => {
      setTabListBounds({ ...next });
    });
    return unsubscribe;
  }, [tabListElement]);

  const items = (tabsElement?.props?.items as TabItem[] | undefined) ?? [];
  const currentProps = (tabsElement?.props as Record<string, unknown>) ?? {};

  const onUpdate = useCallback(
    (props: Record<string, unknown>) => {
      updateElementProps(tabsElementId, props);
    },
    [tabsElementId, updateElementProps],
  );

  const handleAdd = useCallback(async () => {
    try {
      const pageIdToUse = await resolvePageId(currentPageId);
      if (!pageIdToUse) return;
      await addTabItem({
        tabsElementId,
        pageId: pageIdToUse,
        items,
        currentProps,
        onUpdate,
        addElement,
      });
    } catch (err) {
      console.error("TabListActionOverlay add error:", err);
    }
  }, [addElement, currentPageId, currentProps, items, onUpdate, tabsElementId]);

  const handleRemove = useCallback(async () => {
    if (items.length <= 1) return;
    const lastItem = items[items.length - 1];
    try {
      await removeTabItem({
        tabsElementId,
        itemId: lastItem.id,
        items,
        currentProps,
        onUpdate,
        removeElement,
      });
    } catch (err) {
      console.error("TabListActionOverlay remove error:", err);
    }
  }, [currentProps, items, onUpdate, removeElement, tabsElementId]);

  if (!tabsElement || !tabListElement || !tabListBounds) return null;

  // scene → screen 좌표 변환
  const screenLeft = tabListBounds.x * zoom + panOffset.x;
  const screenTop = tabListBounds.y * zoom + panOffset.y;
  const screenRight = screenLeft + tabListBounds.width * zoom;
  const screenCenterY = screenTop + (tabListBounds.height * zoom) / 2;

  const style: React.CSSProperties = {
    position: "absolute",
    left: screenRight + 8,
    top: screenCenterY,
    transform: "translateY(-50%)",
    display: "flex",
    gap: 4,
    zIndex: 10,
    pointerEvents: "auto",
  };

  return (
    <div className="tablist-action-overlay" style={style}>
      <button
        type="button"
        className="tablist-action-btn add"
        aria-label="Add tab"
        onClick={handleAdd}
      >
        <Plus size={14} strokeWidth={2} />
      </button>
      <button
        type="button"
        className="tablist-action-btn remove"
        aria-label="Remove last tab"
        disabled={items.length <= 1}
        onClick={handleRemove}
      >
        <Minus size={14} strokeWidth={2} />
      </button>
    </div>
  );
}
