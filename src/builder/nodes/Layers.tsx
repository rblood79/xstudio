import React from "react";
import { CopyMinus } from "lucide-react"; // CopyMinus 추가
import { ElementProps } from "../../types/integrations/supabase.types";
import { Element } from "../../types/core/store.types"; // 통합된 타입 사용
import { useStore } from "../stores"; // useStore import 추가
import { MessageService } from "../../utils/messaging"; // 메시징 서비스 추가
import type { ElementTreeItem } from "../../types/builder/stately.types";
import { buildTreeFromElements } from "../utils/treeUtils";
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
  collapseAllTreeItems?: () => void; // 새로운 props 추가
}

export function Layers({
  elements,
  selectedElementId,
  setSelectedElement,
  renderElementTree,
  sendElementSelectedMessage,
  collapseAllTreeItems,
}: LayersProps) {
  const { removeElement } = useStore(); // removeElement 함수 가져오기

  // Phase 3.2: flat Element[] → hierarchical ElementTreeItem[] 변환
  const elementTree = React.useMemo(() => {
    return buildTreeFromElements(elements);
  }, [elements]);

  return (
    <div className="sidebar_elements">
      <div className="panel-header">
        <h3 className="panel-title">Layers</h3>
        <div className="header-actions">
          <button
            className="iconButton"
            aria-label="collapseAll"
            onClick={() => {
              // collapseAllTreeItems 함수가 있으면 호출
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
        ) : (
          // Phase 3.2: hierarchical renderElementTree 사용
          renderElementTree(
            elementTree,
            (el) => {
              setSelectedElement(el.id, el.props as ElementProps);
              requestAnimationFrame(() =>
                sendElementSelectedMessage(el.id, el.props as ElementProps)
              );
            },
            async (el) => {
              // removeElement 함수 사용 (Tab/Panel 쌍 삭제 로직 포함)
              await removeElement(el.id);

              // 선택된 요소가 삭제된 경우 선택 해제
              if (el.id === selectedElementId) {
                setSelectedElement(null);
                MessageService.clearOverlay();
              }
            }
          )
        )}
      </div>
    </div>
  );
}
