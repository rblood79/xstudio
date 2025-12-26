import React, { useCallback, startTransition } from "react";
import { CopyMinus } from "lucide-react"; // CopyMinus 추가
import { iconProps } from "../../utils/ui/uiConstants";
import { ElementProps } from "../../types/integrations/supabase.types";
import { Element } from "../../types/core/store.types"; // 통합된 타입 사용
import { useStore } from "../stores"; // useStore import 추가
import { MessageService } from "../../utils/messaging"; // 메시징 서비스 추가
// 🚀 Phase 11: Feature Flags for WebGL-only mode
import { isWebGLCanvas, isCanvasCompareMode } from "../../utils/featureFlags";
import type { ElementTreeItem } from "../../types/builder/stately.types";
import { buildTreeFromElements } from "../utils/treeUtils";
import { LayerTree } from "../panels/nodes/tree/LayerTree";
import "./index.css";

interface LayersProps {
  elements: Element[];
  selectedElementId: string | null;
  setSelectedElement: (id: string | null, props?: ElementProps) => void;
  renderElementTree: (
    tree: ElementTreeItem[],
    onClick: (item: Element) => void,
    onDelete: (item: Element) => Promise<void>,
    depth?: number
  ) => React.ReactNode;
  sendElementSelectedMessage: (id: string, props: ElementProps) => void;
  collapseAllTreeItems?: () => void;
  expandedKeys?: Set<string | number>;
  onToggleExpand?: (key: string | number) => void;
  selectedTab?: { parentId: string; tabIndex: number } | null;
  onSelectTabElement?: (parentId: string, props: ElementProps, index: number) => void;
}

export function Layers({
  elements,
  selectedElementId,
  setSelectedElement,
  renderElementTree,
  sendElementSelectedMessage,
  collapseAllTreeItems,
  expandedKeys,
  onToggleExpand,
  selectedTab,
  onSelectTabElement,
}: LayersProps) {
  // 🚀 Phase 19: Zustand selector 패턴 적용 (불필요한 리렌더링 방지)
  const removeElement = useStore((state) => state.removeElement);

  // Phase 3.2: flat Element[] → hierarchical ElementTreeItem[] 변환
  const elementTree = React.useMemo(() => {
    return buildTreeFromElements(elements);
  }, [elements]);

  // LayerTree 사용 여부 (expandedKeys와 onToggleExpand가 있어야 함)
  const useLayerTree = Boolean(expandedKeys && onToggleExpand);

  const handleExpandedChange = useCallback(
    (keys: Set<string | number>) => {
      if (!expandedKeys || !onToggleExpand) return;
      const next = new Set(keys);
      expandedKeys.forEach((key) => {
        if (!next.has(key)) onToggleExpand(key);
      });
      next.forEach((key) => {
        if (!expandedKeys.has(key)) onToggleExpand(key);
      });
    },
    [expandedKeys, onToggleExpand]
  );

  // 아이템 클릭 핸들러 (memoized)
  // 🚀 Phase 19: startTransition으로 선택 업데이트를 비긴급 처리 (INP 개선)
  const handleItemClick = useCallback(
    (el: Element) => {
      startTransition(() => {
        setSelectedElement(el.id, el.props as ElementProps);
      });
      requestAnimationFrame(() =>
        sendElementSelectedMessage(el.id, el.props as ElementProps)
      );
    },
    [setSelectedElement, sendElementSelectedMessage]
  );

  // 🚀 Phase 11: WebGL-only 모드 체크
  const isWebGLOnly = isWebGLCanvas() && !isCanvasCompareMode();

  // 아이템 삭제 핸들러 (memoized)
  // 🚀 Phase 19: startTransition으로 선택 업데이트를 비긴급 처리 (INP 개선)
  const handleItemDelete = useCallback(
    async (el: Element) => {
      await removeElement(el.id);
      if (el.id === selectedElementId) {
        startTransition(() => {
          setSelectedElement(null);
        });
        // 🚀 Phase 11: WebGL-only 모드에서는 iframe clearOverlay 스킵
        if (!isWebGLOnly) {
          MessageService.clearOverlay();
        }
      }
    },
    [removeElement, selectedElementId, setSelectedElement, isWebGLOnly]
  );

  return (
    <div className="sidebar_elements">
      <div className="panel-header">
        <h3 className="panel-title">Layers</h3>
        <div className="header-actions">
          <button
            className="iconButton"
            aria-label="collapseAll"
            onClick={() => {
              if (collapseAllTreeItems) {
                collapseAllTreeItems();
              }
            }}
          >
            <CopyMinus color="#666" strokeWidth={1.5} size={iconProps.size} />
          </button>
        </div>
      </div>
      <div className="elements">
        {elements.length === 0 ? (
          <p className="no_element">No element available</p>
        ) : useLayerTree ? (
          <LayerTree
            elements={elements}
            selectedElementId={selectedElementId}
            selectedTab={selectedTab}
            expandedKeys={expandedKeys}
            onExpandedChange={handleExpandedChange}
            onItemClick={handleItemClick}
            onItemDelete={handleItemDelete}
            onSelectTabElement={onSelectTabElement}
          />
        ) : (
          // fallback: renderElementTree 사용
          renderElementTree(
            elementTree,
            handleItemClick,
            handleItemDelete
          )
        )}
      </div>
    </div>
  );
}
