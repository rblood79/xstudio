import React, { useCallback } from "react";
import { CopyMinus } from "lucide-react"; // CopyMinus 추가
import { ElementProps } from "../../types/integrations/supabase.types";
import { Element } from "../../types/core/store.types"; // 통합된 타입 사용
import { useStore } from "../stores"; // useStore import 추가
import { MessageService } from "../../utils/messaging"; // 메시징 서비스 추가
// 🚀 Phase 11: Feature Flags for WebGL-only mode
import { useWebGLCanvas, useCanvasCompareMode } from "../../utils/featureFlags";
import type { ElementTreeItem } from "../../types/builder/stately.types";
import { buildTreeFromElements } from "../utils/treeUtils";
import { VirtualizedLayerTree } from "../sidebar/VirtualizedLayerTree";
import "./index.css";

// 🚀 Performance: Virtual Scrolling 임계값 (이 수 이상이면 가상화 적용)
const VIRTUALIZATION_THRESHOLD = 50;

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
  /** 🚀 Performance: Virtual Scrolling용 props */
  expandedKeys?: Set<string | number>;
  onToggleExpand?: (key: string) => void;
  selectedTab?: { parentId: string; tabIndex: number } | null;
  onSelectTabElement?: (parentId: string, props: ElementProps, index: number) => void;
  /** 가상 스크롤링 강제 사용 여부 */
  forceVirtualization?: boolean;
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
  forceVirtualization = false,
}: LayersProps) {
  const { removeElement } = useStore(); // removeElement 함수 가져오기

  // Phase 3.2: flat Element[] → hierarchical ElementTreeItem[] 변환
  const elementTree = React.useMemo(() => {
    return buildTreeFromElements(elements);
  }, [elements]);

  // 🚀 Performance: 가상 스크롤링 사용 여부 결정
  const useVirtualization = forceVirtualization || elements.length >= VIRTUALIZATION_THRESHOLD;
  const hasVirtualizationProps = expandedKeys && onToggleExpand;

  // 아이템 클릭 핸들러 (memoized)
  const handleItemClick = useCallback(
    (el: Element) => {
      setSelectedElement(el.id, el.props as ElementProps);
      requestAnimationFrame(() =>
        sendElementSelectedMessage(el.id, el.props as ElementProps)
      );
    },
    [setSelectedElement, sendElementSelectedMessage]
  );

  // 🚀 Phase 11: WebGL-only 모드 체크
  const isWebGLOnly = useWebGLCanvas() && !useCanvasCompareMode();

  // 아이템 삭제 핸들러 (memoized)
  const handleItemDelete = useCallback(
    async (el: Element) => {
      await removeElement(el.id);
      if (el.id === selectedElementId) {
        setSelectedElement(null);
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
            <CopyMinus color="#666" strokeWidth={1.5} size={16} />
          </button>
        </div>
      </div>
      <div className="elements">
        {elements.length === 0 ? (
          <p className="no_element">No element available</p>
        ) : useVirtualization && hasVirtualizationProps ? (
          // 🚀 Performance: Virtual Scrolling 사용
          <VirtualizedLayerTree
            tree={elementTree}
            expandedKeys={expandedKeys}
            selectedElementId={selectedElementId}
            selectedTab={selectedTab}
            onItemClick={handleItemClick}
            onItemDelete={handleItemDelete}
            onToggleExpand={onToggleExpand}
            onSelectTabElement={onSelectTabElement}
            elements={elements}
            containerHeight={400}
          />
        ) : (
          // 기존 renderElementTree 사용 (적은 요소 또는 가상화 props 없음)
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
