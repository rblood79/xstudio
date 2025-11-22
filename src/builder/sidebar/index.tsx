import "./index.css";
import React, { useCallback } from "react";
import {
  Settings2,
  Trash,
  ChevronRight,
  Box,
  Folder,
  File,
} from "lucide-react";
import { useStore } from "../stores";
import { ElementProps } from "../../types/integrations/supabase.types";
import { Element, Page } from "../../types/core/store.types"; // Page 타입도 추가
import type { DataBinding } from "../../types/builder/unified.types";
import { NodesPanel as NodesPanelWithTabs } from "../nodes";
import Components from "../components";
import { ThemesPanel } from "../panels/themes/ThemesPanel";
import { AIPanel } from "../panels/ai/AIPanel";
import { SettingsPanel } from "../panels/settings/SettingsPanel";
//import { MessageService } from '../../utils/messaging';
import { useIframeMessenger } from "../hooks/useIframeMessenger";
import { useTreeExpandState } from "../hooks/useTreeExpandState";
import { useSidebarTabs } from "../hooks/useSidebarTabs";
import type { ElementTreeItem } from "../../types/builder/stately.types";

interface SidebarProps {
  pages: Page[];
  pageList: { remove: (...keys: string[]) => void };
  handleAddPage: () => Promise<void>;
  handleAddElement: (
    tag: string,
    parentId?: string,
    position?: number
  ) => Promise<void>; // 시그니처 수정
  fetchElements: (pageId: string) => Promise<void>;
  selectedPageId: string | null;
  children?: React.ReactNode;
  forcedActiveTabs?: Set<string>; // 외부에서 강제로 활성화할 탭 지정
  projectId?: string; // Layout/Slot System용 projectId
}

export default function Sidebar({
  pages,
  pageList,
  handleAddPage,
  handleAddElement,
  fetchElements,
  selectedPageId,
  children,
  forcedActiveTabs,
  projectId,
}: SidebarProps) {
  // 메모이제이션 추가
  const elements = useStore((state) => state.elements);
  const currentPageId = useStore((state) => state.currentPageId);
  const selectedElementId = useStore(
    useCallback((state) => state.selectedElementId, [])
  );
  const selectedTab = useStore((state) => state.selectedTab);
  // storeSetElements는 현재 사용되지 않음 (Nodes 컴포넌트에서 setElements prop 제거됨)
  const setSelectedElement = useStore((state) => state.setSelectedElement);
  const selectTabElement = useStore((state) => state.selectTabElement);
  // 활성 탭 상태 관리 (localStorage 연동) - forcedActiveTabs가 있으면 그것을 사용
  const { activeTabs: storedActiveTabs } = useSidebarTabs();
  const activeTabs = forcedActiveTabs || storedActiveTabs;

  // 현재 페이지의 요소만 필터링
  const currentPageElements = React.useMemo(() => {
    if (!currentPageId) return [];
    return elements.filter((el) => el.page_id === currentPageId);
  }, [elements, currentPageId]);
  const [iconEditProps] = React.useState({
    color: "#171717",
    stroke: 1,
    size: 16,
  });

  // React Stately 기반 트리 펼치기/접기 상태 관리
  const { expandedKeys, toggleKey, collapseAll } = useTreeExpandState({
    selectedElementId,
    elements: currentPageElements,
  });

  // setElements는 Nodes 컴포넌트에서 더 이상 사용되지 않으므로 제거됨
  // 필요시 storeSetElements를 직접 사용하거나, 다른 방식으로 관리

  // toggleTab은 useSidebarTabs에서 제공

  const hasChildren = <T extends { id: string; parent_id?: string | null }>(
    items: T[],
    itemId: string
  ): boolean => {
    return items.some((item) => item.parent_id === itemId);
  };

  // toggleExpand 함수를 useTreeExpandState의 toggleKey로 교체
  const toggleExpand = toggleKey;

  type ButtonItem = { id: string; title: string; isSelected?: boolean };
  type CheckboxItem = { id: string; label: string; isSelected?: boolean };
  type RadioItem = { id: string; label: string; value: string };
  type ListItem = {
    id: string;
    label: string;
    value?: string;
    isDisabled?: boolean;
  };
  type TreeItem = {
    id: string;
    title: string;
    type: "folder" | "file";
    parent_id: string | null;
    originalIndex: number;
    children: TreeItem[];
  };

  type WithTag = { tag: string };
  type WithProps = { props: ElementProps };

  const hasTag = (x: unknown): x is WithTag =>
    typeof x === "object" &&
    x !== null &&
    "tag" in x &&
    typeof (x as Record<string, unknown>)["tag"] === "string";

  const hasProps = (x: unknown): x is WithProps => {
    if (typeof x !== "object" || x === null || !("props" in x)) return false;
    const p = (x as { props?: unknown }).props;
    return typeof p === "object" && p !== null;
  };

  const childrenAs = <C,>(v: unknown): C[] =>
    Array.isArray(v) ? (v as C[]) : [];

  // Table 구조를 특별히 렌더링하는 함수
  // Phase 2.4 최적화: 단일 패스로 5회 순회 → 1회 순회
  const renderTableStructure = <
    T extends {
      id: string;
      parent_id?: string | null;
      order_num?: number;
      tag?: string;
      props?: ElementProps;
    }
  >(
    items: T[],
    _getLabel: (item: T) => string,
    onClick: (item: T) => void,
    onDelete: (item: T) => Promise<void>,
    tableId: string,
    depth: number,
    _isExpanded: boolean,
    toggleExpand: (id: string) => void,
    expandedKeys: Set<string>
  ): React.ReactNode => {
    // 단일 패스로 TableHeader, ColumnGroups, Columns 수집
    const result = items.reduce(
      (acc, child) => {
        if (child.parent_id === tableId && child.tag === "TableHeader") {
          acc.tableHeader = child;
        } else if (acc.tableHeader && child.parent_id === acc.tableHeader.id) {
          if (child.tag === "ColumnGroup") {
            acc.columnGroups.push(child);
          } else if (child.tag === "Column") {
            acc.columns.push(child);
          }
        }
        return acc;
      },
      {
        tableHeader: null as T | null,
        columnGroups: [] as T[],
        columns: [] as T[],
      }
    );

    const tableHeader = result.tableHeader;
    if (!tableHeader) return null;

    // 정렬 (이미 수집된 배열만)
    const columnGroups = result.columnGroups.sort(
      (a, b) => (a.order_num || 0) - (b.order_num || 0)
    );
    const columns = result.columns.sort(
      (a, b) => (a.order_num || 0) - (b.order_num || 0)
    );

    return (
      <>
        {/* TableHeader */}
        <div
          key={tableHeader.id}
          data-depth={depth + 1}
          data-has-children={columnGroups.length > 0 || columns.length > 0}
          className="element"
          onClick={(e) => {
            e.stopPropagation();
            onClick(tableHeader);
          }}
        >
          <div
            className={`elementItem ${
              selectedElementId === tableHeader.id ? "active" : ""
            }`}
          >
            <div
              className="elementItemIndent"
              style={{ width: `${(depth + 1) * 8}px` }}
            ></div>
            <div
              className="elementItemIcon"
              onClick={(e) => {
                e.stopPropagation();
                if (columnGroups.length > 0 || columns.length > 0) {
                  toggleExpand(tableHeader.id);
                }
              }}
            >
              {columnGroups.length > 0 || columns.length > 0 ? (
                <ChevronRight
                  color={iconEditProps.color}
                  strokeWidth={iconEditProps.stroke}
                  size={iconEditProps.size}
                  style={{
                    transform: expandedKeys.has(tableHeader.id)
                      ? "rotate(90deg)"
                      : "rotate(0deg)",
                  }}
                />
              ) : (
                <Box
                  color={iconEditProps.color}
                  strokeWidth={iconEditProps.stroke}
                  size={iconEditProps.size}
                  style={{ padding: "2px" }}
                />
              )}
            </div>
            <div className="elementItemLabel">thead</div>
            <div className="elementItemActions">
              <button className="iconButton" aria-label="Settings">
                <Settings2
                  color={iconEditProps.color}
                  strokeWidth={iconEditProps.stroke}
                  size={iconEditProps.size}
                />
              </button>
              <button
                className="iconButton"
                aria-label="Delete thead"
                onClick={async (e) => {
                  e.stopPropagation();
                  await onDelete(tableHeader);
                }}
              >
                <Trash
                  color={iconEditProps.color}
                  strokeWidth={iconEditProps.stroke}
                  size={iconEditProps.size}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Column Groups 행 */}
        {columnGroups.length > 0 && expandedKeys.has(tableHeader.id) && (
          <div
            data-depth={depth + 2}
            data-has-children={true}
            className="element"
          >
            <div className="elementItem">
              <div
                className="elementItemIndent"
                style={{ width: `${(depth + 2) * 8}px` }}
              ></div>
              <div
                className="elementItemIcon"
                onClick={(e) => {
                  e.stopPropagation();
                  if (columnGroups.length > 0) {
                    // Column Groups 행의 펼치기/닫기 로직
                    const groupRowId = `column-groups-${tableHeader.id}`;
                    toggleExpand(groupRowId);
                  }
                }}
              >
                {columnGroups.length > 0 ? (
                  <ChevronRight
                    color={iconEditProps.color}
                    strokeWidth={iconEditProps.stroke}
                    size={iconEditProps.size}
                    style={{
                      transform: expandedKeys.has(
                        `column-groups-${tableHeader.id}`
                      )
                        ? "rotate(90deg)"
                        : "rotate(0deg)",
                    }}
                  />
                ) : (
                  <Box
                    color={iconEditProps.color}
                    strokeWidth={iconEditProps.stroke}
                    size={iconEditProps.size}
                    style={{ padding: "2px" }}
                  />
                )}
              </div>
              <div className="elementItemLabel">tr (Column Groups)</div>
            </div>
          </div>
        )}

        {/* Column Groups */}
        {expandedKeys.has(`column-groups-${tableHeader.id}`) &&
          columnGroups.map((group) => (
            <div
              key={group.id}
              data-depth={depth + 3}
              data-has-children={false}
              className="element"
              onClick={(e) => {
                e.stopPropagation();
                onClick(group);
              }}
            >
              <div
                className={`elementItem ${
                  selectedElementId === group.id ? "active" : ""
                }`}
              >
                <div
                  className="elementItemIndent"
                  style={{ width: `${(depth + 3) * 8}px` }}
                ></div>
                <div className="elementItemIcon">
                  <Box
                    color={iconEditProps.color}
                    strokeWidth={iconEditProps.stroke}
                    size={iconEditProps.size}
                    style={{ padding: "2px" }}
                  />
                </div>
                <div className="elementItemLabel">
                  ColumnGroup:{" "}
                  {((group.props as ElementProps)?.label as string) ||
                    "Untitled"}
                </div>
                <div className="elementItemActions">
                  <button className="iconButton" aria-label="Settings">
                    <Settings2
                      color={iconEditProps.color}
                      strokeWidth={iconEditProps.stroke}
                      size={iconEditProps.size}
                    />
                  </button>
                  <button
                    className="iconButton"
                    aria-label="Delete ColumnGroup"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await onDelete(group);
                    }}
                  >
                    <Trash
                      color={iconEditProps.color}
                      strokeWidth={iconEditProps.stroke}
                      size={iconEditProps.size}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}

        {/* Individual Columns 행 */}
        {columns.length > 0 && expandedKeys.has(tableHeader.id) && (
          <div
            data-depth={depth + 2}
            data-has-children={true}
            className="element"
          >
            <div className="elementItem">
              <div
                className="elementItemIndent"
                style={{ width: `${(depth + 2) * 8}px` }}
              ></div>
              <div
                className="elementItemIcon"
                onClick={(e) => {
                  e.stopPropagation();
                  if (columns.length > 0) {
                    // Individual Columns 행의 펼치기/닫기 로직
                    const columnRowId = `individual-columns-${tableHeader.id}`;
                    toggleExpand(columnRowId);
                  }
                }}
              >
                {columns.length > 0 ? (
                  <ChevronRight
                    color={iconEditProps.color}
                    strokeWidth={iconEditProps.stroke}
                    size={iconEditProps.size}
                    style={{
                      transform: expandedKeys.has(
                        `individual-columns-${tableHeader.id}`
                      )
                        ? "rotate(90deg)"
                        : "rotate(0deg)",
                    }}
                  />
                ) : (
                  <Box
                    color={iconEditProps.color}
                    strokeWidth={iconEditProps.stroke}
                    size={iconEditProps.size}
                    style={{ padding: "2px" }}
                  />
                )}
              </div>
              <div className="elementItemLabel">tr (Individual Columns)</div>
            </div>
          </div>
        )}

        {/* Individual Columns */}
        {expandedKeys.has(`individual-columns-${tableHeader.id}`) &&
          columns.map((column) => (
            <div
              key={column.id}
              data-depth={depth + 3}
              data-has-children={false}
              className="element"
              onClick={(e) => {
                e.stopPropagation();
                onClick(column);
              }}
            >
              <div
                className={`elementItem ${
                  selectedElementId === column.id ? "active" : ""
                }`}
              >
                <div
                  className="elementItemIndent"
                  style={{ width: `${(depth + 3) * 8}px` }}
                ></div>
                <div className="elementItemIcon">
                  <Box
                    color={iconEditProps.color}
                    strokeWidth={iconEditProps.stroke}
                    size={iconEditProps.size}
                    style={{ padding: "2px" }}
                  />
                </div>
                <div className="elementItemLabel">
                  th:{" "}
                  {((column.props as ElementProps)?.children as string) ||
                    "Column"}
                </div>
                <div className="elementItemActions">
                  <button className="iconButton" aria-label="Settings">
                    <Settings2
                      color={iconEditProps.color}
                      strokeWidth={iconEditProps.stroke}
                      size={iconEditProps.size}
                    />
                  </button>
                  <button
                    className="iconButton"
                    aria-label="Delete Column"
                    onClick={async (e) => {
                      e.stopPropagation();
                      await onDelete(column);
                    }}
                  >
                    <Trash
                      color={iconEditProps.color}
                      strokeWidth={iconEditProps.stroke}
                      size={iconEditProps.size}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
      </>
    );
  };

  const renderTree = <
    T extends {
      id: string;
      parent_id?: string | null;
      order_num?: number;
      deleted?: boolean;
    }
  >(
    items: T[],
    getLabel: (item: T) => string,
    onClick: (item: T) => void,
    onDelete: (item: T) => Promise<void>,
    parentId: string | null = null,
    depth: number = 0
  ): React.ReactNode => {
    let filteredItems = items.filter((item) => {
      // 삭제된 요소 제외 ⭐
      if (item.deleted === true) return false;

      // 기본 parent_id 필터링
      const matchesParent =
        item.parent_id === parentId ||
        (parentId === null && item.parent_id === undefined);
      if (!matchesParent) return false;

      return true;
    });

    // Tabs 하위의 Tab과 Panel을 쌍으로 그룹화, Table 하위의 구조 정렬
    if (parentId) {
      const parentItem = items.find((p) => p.id === parentId);
      if (parentItem && hasTag(parentItem) && parentItem.tag === "Tabs") {
        const tabs = filteredItems
          .filter((item) => hasTag(item) && item.tag === "Tab")
          .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));
        const panels = filteredItems
          .filter((item) => hasTag(item) && item.tag === "Panel")
          .sort((a, b) => (a.order_num || 0) - (b.order_num || 0));

        // tabId 기반으로 Tab과 Panel 쌍을 정확하게 매칭
        const pairedItems: T[] = [];
        const usedPanelIds = new Set<string>();

        tabs.forEach((tab) => {
          pairedItems.push(tab);

          // Tab의 tabId와 일치하는 Panel 찾기
          const tabProps = hasProps(tab) ? tab.props : {};
          const tabId = (tabProps as Record<string, unknown>)?.tabId;

          if (tabId) {
            const matchingPanel = panels.find((panel) => {
              const panelProps = hasProps(panel) ? panel.props : {};
              return (panelProps as Record<string, unknown>)?.tabId === tabId;
            });

            if (matchingPanel && !usedPanelIds.has(matchingPanel.id)) {
              pairedItems.push(matchingPanel);
              usedPanelIds.add(matchingPanel.id);
            }
          } else {
            // tabId가 없는 경우 fallback: order_num 기반 매칭 (레거시)
            console.warn(
              "⚠️ Tab에 tabId가 없음, order_num 기반 fallback 사용:",
              tab.id
            );
            const fallbackPanel = panels.find(
              (panel) =>
                !usedPanelIds.has(panel.id) &&
                Math.abs((panel.order_num || 0) - (tab.order_num || 0)) <= 1
            );

            if (fallbackPanel) {
              pairedItems.push(fallbackPanel);
              usedPanelIds.add(fallbackPanel.id);
            }
          }
        });

        // 매칭되지 않은 Panel들 추가 (orphaned panels)
        panels.forEach((panel) => {
          if (!usedPanelIds.has(panel.id)) {
            console.warn("⚠️ 매칭되지 않은 Panel:", panel.id);
            pairedItems.push(panel);
          }
        });

        filteredItems = pairedItems;
      } else if (
        parentItem &&
        hasTag(parentItem) &&
        parentItem.tag === "Table"
      ) {
        // Table 하위의 TableHeader, TableBody, Column, ColumnGroup, Row, Cell 정렬
        const tableHeaders = filteredItems.filter(
          (item) => hasTag(item) && item.tag === "TableHeader"
        );
        const tableBodies = filteredItems.filter(
          (item) => hasTag(item) && item.tag === "TableBody"
        );
        const columns = filteredItems.filter(
          (item) => hasTag(item) && item.tag === "Column"
        );
        const columnGroups = filteredItems.filter(
          (item) => hasTag(item) && item.tag === "ColumnGroup"
        );
        const rows = filteredItems.filter(
          (item) => hasTag(item) && item.tag === "Row"
        );
        const cells = filteredItems.filter(
          (item) => hasTag(item) && item.tag === "Cell"
        );

        // TableHeader → TableBody → ColumnGroup → Column → Row → Cell 순서로 정렬
        const sortedItems: T[] = [
          ...tableHeaders.sort(
            (a, b) => (a.order_num || 0) - (b.order_num || 0)
          ),
          ...tableBodies.sort(
            (a, b) => (a.order_num || 0) - (b.order_num || 0)
          ),
          ...columnGroups.sort(
            (a, b) => (a.order_num || 0) - (b.order_num || 0)
          ),
          ...columns.sort((a, b) => (a.order_num || 0) - (b.order_num || 0)),
          ...rows.sort((a, b) => (a.order_num || 0) - (b.order_num || 0)),
          ...cells.sort((a, b) => (a.order_num || 0) - (b.order_num || 0)),
        ];

        filteredItems = sortedItems;
      } else {
        // 일반적인 정렬
        filteredItems = filteredItems.sort(
          (a, b) => (a.order_num || 0) - (b.order_num || 0)
        );
      }
    } else {
      // 일반적인 정렬
      filteredItems = filteredItems.sort(
        (a, b) => (a.order_num || 0) - (b.order_num || 0)
      );
    }

    // 디버깅 로그 (필요시 주석 해제)
    /*if (parentId) {
            const parentItem = items.find(p => p.id === parentId);
            if (parentItem && hasTag(parentItem) && (parentItem.tag === 'Tabs' || parentItem.tag === 'Table')) {
                console.log(`🔍 ${parentItem.tag} 하위 아이템들:`, {
                    parentId,
                    parentTag: parentItem.tag,
                    filteredItems: filteredItems.map(item => ({ 
                        id: item.id, 
                        tag: hasTag(item) ? item.tag : 'unknown', 
                        title: hasProps(item) ? item.props.title : 'N/A',
                        parent_id: 'parent_id' in item ? item.parent_id : 'N/A'
                    })),
                    allItems: items.filter(item => item.parent_id === parentId).map(item => ({ 
                        id: item.id, 
                        tag: hasTag(item) ? item.tag : 'unknown', 
                        title: hasProps(item) ? item.props.title : 'N/A',
                        parent_id: 'parent_id' in item ? item.parent_id : 'N/A'
                    }))
                });
            }
        }*/

    if (filteredItems.length === 0) return null;

    return (
      <>
        {filteredItems.map((item) => {
          const hasChildNodes = hasChildren(items, item.id);
          const isExpanded = expandedKeys.has(item.id);

          // Tabs 컴포넌트의 경우 실제 Tab과 Panel 자식 노드만 확인 (가상 자식 제거)
          const hasTabsChildren =
            hasTag(item) && item.tag === "Tabs" && hasChildNodes;

          // 다른 컴포넌트들의 가상 자식 노드들 (기존 구조 유지)
          const hasToggleChildren =
            hasTag(item) &&
            item.tag === "ToggleButtonGroup" &&
            hasProps(item) &&
            Array.isArray(item.props.children) &&
            item.props.children.length > 0;
          const hasCheckboxChildren =
            hasTag(item) &&
            item.tag === "CheckboxGroup" &&
            hasProps(item) &&
            Array.isArray(item.props.children) &&
            item.props.children.length > 0;
          const hasRadioChildren =
            hasTag(item) &&
            item.tag === "RadioGroup" &&
            hasProps(item) &&
            Array.isArray(item.props.children) &&
            item.props.children.length > 0;
          const hasListBoxChildren =
            hasTag(item) &&
            item.tag === "ListBox" &&
            hasProps(item) &&
            Array.isArray(item.props.children) &&
            item.props.children.length > 0;
          const hasGridListChildren =
            hasTag(item) &&
            item.tag === "GridList" &&
            hasProps(item) &&
            Array.isArray(item.props.children) &&
            item.props.children.length > 0;
          const hasSelectChildren =
            hasTag(item) &&
            item.tag === "Select" &&
            hasProps(item) &&
            Array.isArray(item.props.children) &&
            item.props.children.length > 0;
          const hasComboBoxChildren =
            hasTag(item) &&
            item.tag === "ComboBox" &&
            hasProps(item) &&
            Array.isArray(item.props.children) &&
            item.props.children.length > 0;
          const hasTreeChildren =
            hasTag(item) &&
            item.tag === "Tree" &&
            hasProps(item) &&
            Array.isArray(item.props.children) &&
            item.props.children.length > 0;

          // Table 컴포넌트의 실제 자식 노드 확인
          const hasTableChildren =
            hasTag(item) && item.tag === "Table" && hasChildNodes;

          // Table 디버깅 (필요시 주석 해제)
          /*if (hasTag(item) && item.tag === 'Table') {
                        console.log('🔍 Table 자식 노드 확인:', {
                            tableId: item.id,
                            hasChildNodes,
                            hasTableChildren,
                            allChildren: items.filter(child => child.parent_id === item.id).map(child => ({
                                id: child.id,
                                tag: hasTag(child) ? child.tag : 'unknown',
                                parent_id: child.parent_id
                            }))
                        });
                    }*/

          const hasAnyChildren =
            hasChildNodes ||
            hasTabsChildren ||
            hasToggleChildren ||
            hasCheckboxChildren ||
            hasRadioChildren ||
            hasListBoxChildren ||
            hasGridListChildren ||
            hasSelectChildren ||
            hasComboBoxChildren ||
            hasTreeChildren ||
            hasTableChildren;

          return (
            <div
              key={item.id}
              data-depth={depth}
              data-has-children={hasAnyChildren}
              onClick={(e) => {
                e.stopPropagation();
                onClick(item);
              }}
              className="element"
            >
              <div
                className={`elementItem ${
                  ("title" in item && selectedPageId === item.id) ||
                  ("tag" in item && selectedElementId === item.id)
                    ? "active"
                    : ""
                }`}
              >
                <div
                  className="elementItemIndent"
                  style={{ width: depth > 0 ? `${depth * 8 + 0}px` : "0px" }}
                ></div>
                <div
                  className="elementItemIcon"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasAnyChildren) {
                      toggleExpand(item.id);
                    }
                  }}
                >
                  {hasAnyChildren ? (
                    <ChevronRight
                      color={iconEditProps.color}
                      strokeWidth={iconEditProps.stroke}
                      size={iconEditProps.size}
                      style={{
                        transform: isExpanded
                          ? "rotate(90deg)"
                          : "rotate(0deg)",
                      }}
                    />
                  ) : (
                    <Box
                      color={iconEditProps.color}
                      strokeWidth={iconEditProps.stroke}
                      size={iconEditProps.size}
                      style={{ padding: "2px" }}
                    />
                  )}
                </div>
                <div className="elementItemLabel">
                  {/* Tab과 Panel, Table 관련 컴포넌트들의 경우 더 명확한 라벨 표시 */}
                  {hasTag(item) && item.tag === "Tab" && hasProps(item)
                    ? `Tab: ${item.props.title || "Untitled"}`
                    : hasTag(item) && item.tag === "Panel" && hasProps(item)
                    ? `Panel: ${item.props.title || "Untitled"}`
                    : hasTag(item) && item.tag === "TableHeader"
                    ? "thead"
                    : hasTag(item) && item.tag === "TableBody"
                    ? "tbody"
                    : hasTag(item) && item.tag === "Column" && hasProps(item)
                    ? `th: ${item.props.children || "Column"}`
                    : hasTag(item) && item.tag === "Row"
                    ? "tr"
                    : hasTag(item) && item.tag === "Cell" && hasProps(item)
                    ? `td: ${item.props.children || "Cell"}`
                    : getLabel(item)}
                </div>
                <div className="elementItemActions">
                  <button className="iconButton" aria-label="Settings">
                    <Settings2
                      color={iconEditProps.color}
                      strokeWidth={iconEditProps.stroke}
                      size={iconEditProps.size}
                    />
                  </button>
                  {/* body 요소 또는 루트 Home 페이지가 아닐 때만 삭제 버튼 표시 */}
                  {!(
                    (hasTag(item) && item.tag === "body") ||
                    (item.order_num === 0 && item.parent_id === null)
                  ) && (
                    <button
                      className="iconButton"
                      aria-label={`Delete ${getLabel(item)}`}
                      onClick={async (e) => {
                        e.stopPropagation();
                        await onDelete(item);
                      }}
                    >
                      <Trash
                        color={iconEditProps.color}
                        strokeWidth={iconEditProps.stroke}
                        size={iconEditProps.size}
                      />
                    </button>
                  )}
                </div>
              </div>
              {isExpanded && (
                <>
                  {/* Table 컴포넌트의 경우 특별한 구조로 렌더링 */}
                  {hasTableChildren
                    ? renderTableStructure(
                        items,
                        getLabel,
                        onClick,
                        onDelete,
                        item.id,
                        depth,
                        isExpanded,
                        toggleExpand,
                        expandedKeys as Set<string>
                      )
                    : /* 일반 자식 노드들 렌더링 (Table 제외) */
                      hasChildNodes &&
                      renderTree(
                        items,
                        getLabel,
                        onClick,
                        onDelete,
                        item.id,
                        depth + 1
                      )}

                  {/* Tabs 컴포넌트의 경우 가상 자식 노드 제거 - 실제 Tab과 Panel이 위에서 렌더링됨 */}

                  {/* 다른 컴포넌트들의 가상 자식 노드들 (기존 구조 유지) */}
                  {hasToggleChildren && (
                    <>
                      {/* ToggleButtonGroup 가상 자식 노드들 */}
                      {childrenAs<ButtonItem>(item.props?.children).map(
                        (button, index) => (
                          <div
                            key={`${item.id}-toggle-${index}`}
                            data-depth={depth + 1}
                            data-has-children={false}
                            onClick={(e) => {
                              e.stopPropagation();
                              // ToggleButton을 클릭했을 때는 해당 버튼을 선택
                              selectTabElement(
                                item.id as string,
                                item.props,
                                index
                              );
                            }}
                            className="element"
                          >
                            <div
                              className={`elementItem ${
                                selectedTab?.parentId === item.id &&
                                selectedTab?.tabIndex === index
                                  ? "active"
                                  : ""
                              }`}
                            >
                              <div
                                className="elementItemIndent"
                                style={{ width: `${(depth + 1) * 8 + 0}px` }}
                              ></div>
                              <div className="elementItemIcon">
                                <Box
                                  color={iconEditProps.color}
                                  strokeWidth={iconEditProps.stroke}
                                  size={iconEditProps.size}
                                  style={{ padding: "2px" }}
                                />
                              </div>
                              <div className="elementItemLabel">
                                {button.title || `Button ${index + 1}`}
                              </div>
                              <div className="elementItemActions"></div>
                            </div>
                          </div>
                        )
                      )}
                    </>
                  )}

                  {/* CheckboxGroup 가상 자식 노드들 */}
                  {hasCheckboxChildren && (
                    <>
                      {childrenAs<CheckboxItem>(item.props?.children).map(
                        (checkbox, index) => (
                          <div
                            key={`${item.id}-checkbox-${index}`}
                            data-depth={depth + 1}
                            data-has-children={false}
                            onClick={(e) => {
                              e.stopPropagation();
                              selectTabElement(
                                item.id as string,
                                item.props,
                                index
                              );
                            }}
                            className="element"
                          >
                            <div
                              className={`elementItem ${
                                selectedTab?.parentId === item.id &&
                                selectedTab?.tabIndex === index
                                  ? "active"
                                  : ""
                              }`}
                            >
                              <div
                                className="elementItemIndent"
                                style={{ width: `${(depth + 1) * 8 + 0}px` }}
                              ></div>
                              <div className="elementItemIcon">
                                <Box
                                  color={iconEditProps.color}
                                  strokeWidth={iconEditProps.stroke}
                                  size={iconEditProps.size}
                                  style={{ padding: "2px" }}
                                />
                              </div>
                              <div className="elementItemLabel">
                                {checkbox.label || `Checkbox ${index + 1}`}
                              </div>
                              <div className="elementItemActions"></div>
                            </div>
                          </div>
                        )
                      )}
                    </>
                  )}

                  {/* RadioGroup 가상 자식 노드들 */}
                  {hasRadioChildren && (
                    <>
                      {childrenAs<RadioItem>(item.props?.children).map(
                        (radio, index) => (
                          <div
                            key={`${item.id}-radio-${index}`}
                            data-depth={depth + 1}
                            data-has-children={false}
                            onClick={(e) => {
                              e.stopPropagation();
                              selectTabElement(
                                item.id as string,
                                item.props,
                                index
                              );
                            }}
                            className="element"
                          >
                            <div
                              className={`elementItem ${
                                selectedTab?.parentId === item.id &&
                                selectedTab?.tabIndex === index
                                  ? "active"
                                  : ""
                              }`}
                            >
                              <div
                                className="elementItemIndent"
                                style={{ width: `${(depth + 1) * 8 + 0}px` }}
                              ></div>
                              <div className="elementItemIcon">
                                <Box
                                  color={iconEditProps.color}
                                  strokeWidth={iconEditProps.stroke}
                                  size={iconEditProps.size}
                                  style={{ padding: "2px" }}
                                />
                              </div>
                              <div className="elementItemLabel">
                                {radio.label || `Radio ${index + 1}`}
                              </div>
                              <div className="elementItemActions"></div>
                            </div>
                          </div>
                        )
                      )}
                    </>
                  )}

                  {/* ListBox 가상 자식 노드들 */}
                  {hasListBoxChildren && (
                    <>
                      {childrenAs<ListItem>(item.props?.children).map(
                        (listItem, index) => (
                          <div
                            key={`${item.id}-listitem-${index}`}
                            data-depth={depth + 1}
                            data-has-children={false}
                            onClick={(e) => {
                              e.stopPropagation();
                              selectTabElement(
                                item.id as string,
                                item.props,
                                index
                              );
                            }}
                            className="element"
                          >
                            <div
                              className={`elementItem ${
                                selectedTab?.parentId === item.id &&
                                selectedTab?.tabIndex === index
                                  ? "active"
                                  : ""
                              }`}
                            >
                              <div
                                className="elementItemIndent"
                                style={{ width: `${(depth + 1) * 8 + 0}px` }}
                              ></div>
                              <div className="elementItemIcon">
                                <Box
                                  color={iconEditProps.color}
                                  strokeWidth={iconEditProps.stroke}
                                  size={iconEditProps.size}
                                  style={{ padding: "2px" }}
                                />
                              </div>
                              <div className="elementItemLabel">
                                {listItem.label || `Item ${index + 1}`}
                              </div>
                              <div className="elementItemActions"></div>
                            </div>
                          </div>
                        )
                      )}
                    </>
                  )}

                  {/* GridList 가상 자식 노드들 */}
                  {hasGridListChildren && (
                    <>
                      {childrenAs<ListItem>(item.props?.children).map(
                        (gridItem, index) => (
                          <div
                            key={`${item.id}-griditem-${index}`}
                            data-depth={depth + 1}
                            data-has-children={false}
                            onClick={(e) => {
                              e.stopPropagation();
                              selectTabElement(
                                item.id as string,
                                item.props,
                                index
                              );
                            }}
                            className="element"
                          >
                            <div
                              className={`elementItem ${
                                selectedTab?.parentId === item.id &&
                                selectedTab?.tabIndex === index
                                  ? "active"
                                  : ""
                              }`}
                            >
                              <div
                                className="elementItemIndent"
                                style={{ width: `${(depth + 1) * 8 + 0}px` }}
                              ></div>
                              <div className="elementItemIcon">
                                <Box
                                  color={iconEditProps.color}
                                  strokeWidth={iconEditProps.stroke}
                                  size={iconEditProps.size}
                                  style={{ padding: "2px" }}
                                />
                              </div>
                              <div className="elementItemLabel">
                                {gridItem.label || `Item ${index + 1}`}
                              </div>
                              <div className="elementItemActions"></div>
                            </div>
                          </div>
                        )
                      )}
                    </>
                  )}

                  {/* Select 가상 자식 노드들 */}
                  {hasSelectChildren && (
                    <>
                      {childrenAs<ListItem>(item.props?.children).map(
                        (selectItem, index) => (
                          <div
                            key={`${item.id}-selectitem-${index}`}
                            data-depth={depth + 1}
                            data-has-children={false}
                            onClick={(e) => {
                              e.stopPropagation();
                              selectTabElement(
                                item.id as string,
                                item.props,
                                index
                              );
                            }}
                            className="element"
                          >
                            <div
                              className={`elementItem ${
                                selectedTab?.parentId === item.id &&
                                selectedTab?.tabIndex === index
                                  ? "active"
                                  : ""
                              }`}
                            >
                              <div
                                className="elementItemIndent"
                                style={{ width: `${(depth + 1) * 8 + 0}px` }}
                              ></div>
                              <div className="elementItemIcon">
                                <Box
                                  color={iconEditProps.color}
                                  strokeWidth={iconEditProps.stroke}
                                  size={iconEditProps.size}
                                  style={{ padding: "2px" }}
                                />
                              </div>
                              <div className="elementItemLabel">
                                {selectItem.label || `Option ${index + 1}`}
                              </div>
                              <div className="elementItemActions"></div>
                            </div>
                          </div>
                        )
                      )}
                    </>
                  )}

                  {/* ComboBox 가상 자식 노드들 */}
                  {hasComboBoxChildren && (
                    <>
                      {childrenAs<ListItem>(item.props?.children).map(
                        (comboItem, index) => (
                          <div
                            key={`${item.id}-comboitem-${index}`}
                            data-depth={depth + 1}
                            data-has-children={false}
                            onClick={(e) => {
                              e.stopPropagation();
                              selectTabElement(
                                item.id as string,
                                item.props,
                                index
                              );
                            }}
                            className="element"
                          >
                            <div
                              className={`elementItem ${
                                selectedTab?.parentId === item.id &&
                                selectedTab?.tabIndex === index
                                  ? "active"
                                  : ""
                              }`}
                            >
                              <div
                                className="elementItemIndent"
                                style={{ width: `${(depth + 1) * 8 + 0}px` }}
                              ></div>
                              <div className="elementItemIcon">
                                <Box
                                  color={iconEditProps.color}
                                  strokeWidth={iconEditProps.stroke}
                                  size={iconEditProps.size}
                                  style={{ padding: "2px" }}
                                />
                              </div>
                              <div className="elementItemLabel">
                                {comboItem.label || `Option ${index + 1}`}
                              </div>
                              <div className="elementItemActions"></div>
                            </div>
                          </div>
                        )
                      )}
                    </>
                  )}

                  {/* Tree 가상 자식 노드들 */}
                  {hasTreeChildren && (
                    <>
                      {childrenAs<TreeItem>(item.props?.children).map(
                        (treeItem, index) => (
                          <div
                            key={`${item.id}-treeitem-${index}`}
                            data-depth={depth + 1}
                            data-has-children={
                              treeItem.children && treeItem.children.length > 0
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              selectTabElement(
                                item.id as string,
                                item.props,
                                index
                              );
                            }}
                            className="element"
                          >
                            <div
                              className={`elementItem ${
                                selectedTab?.parentId === item.id &&
                                selectedTab?.tabIndex === index
                                  ? "active"
                                  : ""
                              }`}
                            >
                              <div
                                className="elementItemIndent"
                                style={{ width: `${(depth + 1) * 8 + 0}px` }}
                              ></div>
                              <div className="elementItemIcon">
                                {treeItem.children &&
                                treeItem.children.length > 0 ? (
                                  <Folder
                                    color={iconEditProps.color}
                                    strokeWidth={iconEditProps.stroke}
                                    size={iconEditProps.size}
                                  />
                                ) : (
                                  <File
                                    color={iconEditProps.color}
                                    strokeWidth={iconEditProps.stroke}
                                    size={iconEditProps.size}
                                  />
                                )}
                              </div>
                              <div className="elementItemLabel">
                                {treeItem.title}
                              </div>
                              <div className="elementItemActions"></div>
                            </div>
                            {/* Tree 아이템의 하위 자식들 재귀적으로 렌더링 */}
                            {treeItem.children &&
                              treeItem.children.length > 0 && (
                                <>
                                  {treeItem.children.map(
                                    (child, childIndex) => (
                                      <div
                                        key={`${item.id}-treeitem-${index}-child-${childIndex}`}
                                        data-depth={depth + 2}
                                        data-has-children={false}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          selectTabElement(
                                            item.id as string,
                                            item.props,
                                            index
                                          );
                                        }}
                                        className="element"
                                      >
                                        <div className="elementItem">
                                          <div
                                            className="elementItemIndent"
                                            style={{
                                              width: `${(depth + 2) * 8 + 0}px`,
                                            }}
                                          ></div>
                                          <div className="elementItemIcon">
                                            <File
                                              color={iconEditProps.color}
                                              strokeWidth={iconEditProps.stroke}
                                              size={iconEditProps.size}
                                            />
                                          </div>
                                          <div className="elementItemLabel">
                                            {child.title}
                                          </div>
                                          <div className="elementItemActions"></div>
                                        </div>
                                      </div>
                                    )
                                  )}
                                </>
                              )}
                          </div>
                        )
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          );
        })}
      </>
    );
  };

  /**
   * renderElementTree - Hierarchical ElementTreeItem 구조 렌더링
   *
   * Phase 3.2: buildTreeFromElements로 생성된 hierarchical 구조를 렌더링
   * Table 컴포넌트는 기존 renderTableStructure 로직 재사용
   */
  const renderElementTree = (
    tree: ElementTreeItem[],
    onClick: (item: Element) => void,
    onDelete: (item: Element) => Promise<void>,
    depth: number = 0
  ): React.ReactNode => {
    if (tree.length === 0) return null;

    return (
      <>
        {tree.map((item) => {
          const hasChildNodes = item.children && item.children.length > 0;
          const isExpanded = expandedKeys.has(item.id);

          // Collection 컴포넌트들의 가상 자식 노드들
          const hasToggleChildren =
            item.tag === "ToggleButtonGroup" &&
            item.props?.children &&
            Array.isArray(item.props.children) &&
            item.props.children.length > 0;
          const hasCheckboxChildren =
            item.tag === "CheckboxGroup" &&
            item.props?.children &&
            Array.isArray(item.props.children) &&
            item.props.children.length > 0;
          const hasRadioChildren =
            item.tag === "RadioGroup" &&
            item.props?.children &&
            Array.isArray(item.props.children) &&
            item.props.children.length > 0;
          const hasListBoxChildren =
            item.tag === "ListBox" &&
            item.props?.children &&
            Array.isArray(item.props.children) &&
            item.props.children.length > 0;
          const hasGridListChildren =
            item.tag === "GridList" &&
            item.props?.children &&
            Array.isArray(item.props.children) &&
            item.props.children.length > 0;
          const hasSelectChildren =
            item.tag === "Select" &&
            item.props?.children &&
            Array.isArray(item.props.children) &&
            item.props.children.length > 0;
          const hasComboBoxChildren =
            item.tag === "ComboBox" &&
            item.props?.children &&
            Array.isArray(item.props.children) &&
            item.props.children.length > 0;
          const hasTreeChildren =
            item.tag === "Tree" &&
            item.props?.children &&
            Array.isArray(item.props.children) &&
            item.props.children.length > 0;

          // Table 컴포넌트 확인
          const hasTableChildren = item.tag === "Table" && hasChildNodes;

          const hasAnyChildren =
            hasChildNodes ||
            hasToggleChildren ||
            hasCheckboxChildren ||
            hasRadioChildren ||
            hasListBoxChildren ||
            hasGridListChildren ||
            hasSelectChildren ||
            hasComboBoxChildren ||
            hasTreeChildren ||
            hasTableChildren;

          // Element로 변환 (onClick, onDelete용)
          const element: Element = {
            id: item.id,
            tag: item.tag,
            parent_id: item.parent_id || null,
            order_num: item.order_num,
            props: item.props as ElementProps,
            deleted: item.deleted,
            dataBinding: item.dataBinding as DataBinding | undefined,
            page_id: "",
            created_at: "",
            updated_at: "",
          };

          return (
            <div
              key={item.id}
              data-depth={depth}
              data-has-children={hasAnyChildren}
              onClick={(e) => {
                e.stopPropagation();
                onClick(element);
              }}
              className="element"
            >
              <div
                className={`elementItem ${
                  selectedElementId === item.id ? "active" : ""
                }`}
              >
                <div
                  className="elementItemIndent"
                  style={{ width: depth > 0 ? `${depth * 8 + 0}px` : "0px" }}
                ></div>
                <div
                  className="elementItemIcon"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (hasAnyChildren) {
                      toggleExpand(item.id);
                    }
                  }}
                >
                  {hasAnyChildren ? (
                    <ChevronRight
                      color={iconEditProps.color}
                      strokeWidth={iconEditProps.stroke}
                      size={iconEditProps.size}
                      style={{
                        transform: isExpanded
                          ? "rotate(90deg)"
                          : "rotate(0deg)",
                      }}
                    />
                  ) : (
                    <Box
                      color={iconEditProps.color}
                      strokeWidth={iconEditProps.stroke}
                      size={iconEditProps.size}
                      style={{ padding: "2px" }}
                    />
                  )}
                </div>
                <div className="elementItemLabel">
                  {/* Tab과 Panel, Table 관련 컴포넌트들의 경우 더 명확한 라벨 표시 */}
                  {item.tag === "Tab" && item.props
                    ? `Tab: ${(item.props as ElementProps).title || "Untitled"}`
                    : item.tag === "Panel" && item.props
                    ? `Panel: ${
                        (item.props as ElementProps).title || "Untitled"
                      }`
                    : item.tag === "TableHeader"
                    ? "thead"
                    : item.tag === "TableBody"
                    ? "tbody"
                    : item.tag === "Column" && item.props
                    ? `th: ${(item.props as ElementProps).children || "Column"}`
                    : item.tag === "Row"
                    ? "tr"
                    : item.tag === "Cell" && item.props
                    ? `td: ${(item.props as ElementProps).children || "Cell"}`
                    : item.tag}
                </div>
                <div className="elementItemActions">
                  <button className="iconButton" aria-label="Settings">
                    <Settings2
                      color={iconEditProps.color}
                      strokeWidth={iconEditProps.stroke}
                      size={iconEditProps.size}
                    />
                  </button>
                  {/* body 요소가 아닐 때만 삭제 버튼 표시 */}
                  {item.tag !== "body" && (
                    <button
                      className="iconButton"
                      aria-label={`Delete ${item.tag}`}
                      onClick={async (e) => {
                        e.stopPropagation();
                        await onDelete(element);
                      }}
                    >
                      <Trash
                        color={iconEditProps.color}
                        strokeWidth={iconEditProps.stroke}
                        size={iconEditProps.size}
                      />
                    </button>
                  )}
                </div>
              </div>
              {isExpanded && (
                <>
                  {/* Table 컴포넌트의 경우 기존 renderTableStructure 사용 */}
                  {hasTableChildren
                    ? renderTableStructure(
                        // flat elements 필요 (renderTableStructure가 flat 기반)
                        // Element[]를 renderTableStructure가 기대하는 타입으로 안전하게 변환
                        currentPageElements as unknown as Array<{
                          id: string;
                          parent_id?: string | null;
                          order_num?: number;
                          tag?: string;
                          props?: ElementProps;
                        }>,
                        (el) => el.tag || "",
                        // onClick 함수 래핑: Element를 받아서 적절한 타입으로 변환
                        ((item: {
                          id: string;
                          parent_id?: string | null;
                          order_num?: number;
                          tag?: string;
                          props?: ElementProps;
                        }) => {
                          // 원본 Element 찾기
                          const originalElement = currentPageElements.find(
                            (el) => el.id === item.id
                          );
                          if (originalElement) {
                            onClick(originalElement);
                          }
                        }) as (item: {
                          id: string;
                          parent_id?: string | null;
                          order_num?: number;
                          tag?: string;
                          props?: ElementProps;
                        }) => void,
                        // onDelete 함수 래핑: Element를 받아서 적절한 타입으로 변환
                        ((item: {
                          id: string;
                          parent_id?: string | null;
                          order_num?: number;
                          tag?: string;
                          props?: ElementProps;
                        }) => {
                          // 원본 Element 찾기
                          const originalElement = currentPageElements.find(
                            (el) => el.id === item.id
                          );
                          if (originalElement) {
                            return onDelete(originalElement);
                          }
                          return Promise.resolve();
                        }) as (item: {
                          id: string;
                          parent_id?: string | null;
                          order_num?: number;
                          tag?: string;
                          props?: ElementProps;
                        }) => Promise<void>,
                        item.id,
                        depth,
                        isExpanded,
                        toggleExpand,
                        expandedKeys as Set<string>
                      )
                    : /* 일반 hierarchical 자식 노드들 재귀 렌더링 */
                      hasChildNodes &&
                      item.children &&
                      renderElementTree(
                        item.children,
                        onClick,
                        onDelete,
                        depth + 1
                      )}

                  {/* Collection 컴포넌트들의 가상 자식 노드들 (기존 로직 유지) */}
                  {hasToggleChildren && (
                    <>
                      {childrenAs<ButtonItem>(item.props?.children).map(
                        (button, index) => (
                          <div
                            key={`${item.id}-toggle-${index}`}
                            data-depth={depth + 1}
                            data-has-children={false}
                            onClick={(e) => {
                              e.stopPropagation();
                              selectTabElement(
                                item.id as string,
                                item.props as ElementProps,
                                index
                              );
                            }}
                            className="element"
                          >
                            <div
                              className={`elementItem ${
                                selectedTab?.parentId === item.id &&
                                selectedTab?.tabIndex === index
                                  ? "active"
                                  : ""
                              }`}
                            >
                              <div
                                className="elementItemIndent"
                                style={{ width: `${(depth + 1) * 8 + 0}px` }}
                              ></div>
                              <div className="elementItemIcon">
                                <Box
                                  color={iconEditProps.color}
                                  strokeWidth={iconEditProps.stroke}
                                  size={iconEditProps.size}
                                  style={{ padding: "2px" }}
                                />
                              </div>
                              <div className="elementItemLabel">
                                {button.title || `Button ${index + 1}`}
                              </div>
                              <div className="elementItemActions"></div>
                            </div>
                          </div>
                        )
                      )}
                    </>
                  )}

                  {/* CheckboxGroup 가상 자식 노드들 */}
                  {hasCheckboxChildren && (
                    <>
                      {childrenAs<CheckboxItem>(item.props?.children).map(
                        (checkbox, index) => (
                          <div
                            key={`${item.id}-checkbox-${index}`}
                            data-depth={depth + 1}
                            data-has-children={false}
                            onClick={(e) => {
                              e.stopPropagation();
                              selectTabElement(
                                item.id as string,
                                item.props as ElementProps,
                                index
                              );
                            }}
                            className="element"
                          >
                            <div
                              className={`elementItem ${
                                selectedTab?.parentId === item.id &&
                                selectedTab?.tabIndex === index
                                  ? "active"
                                  : ""
                              }`}
                            >
                              <div
                                className="elementItemIndent"
                                style={{ width: `${(depth + 1) * 8 + 0}px` }}
                              ></div>
                              <div className="elementItemIcon">
                                <Box
                                  color={iconEditProps.color}
                                  strokeWidth={iconEditProps.stroke}
                                  size={iconEditProps.size}
                                  style={{ padding: "2px" }}
                                />
                              </div>
                              <div className="elementItemLabel">
                                {checkbox.label || `Checkbox ${index + 1}`}
                              </div>
                              <div className="elementItemActions"></div>
                            </div>
                          </div>
                        )
                      )}
                    </>
                  )}

                  {/* RadioGroup 가상 자식 노드들 */}
                  {hasRadioChildren && (
                    <>
                      {childrenAs<RadioItem>(item.props?.children).map(
                        (radio, index) => (
                          <div
                            key={`${item.id}-radio-${index}`}
                            data-depth={depth + 1}
                            data-has-children={false}
                            onClick={(e) => {
                              e.stopPropagation();
                              selectTabElement(
                                item.id as string,
                                item.props as ElementProps,
                                index
                              );
                            }}
                            className="element"
                          >
                            <div
                              className={`elementItem ${
                                selectedTab?.parentId === item.id &&
                                selectedTab?.tabIndex === index
                                  ? "active"
                                  : ""
                              }`}
                            >
                              <div
                                className="elementItemIndent"
                                style={{ width: `${(depth + 1) * 8 + 0}px` }}
                              ></div>
                              <div className="elementItemIcon">
                                <Box
                                  color={iconEditProps.color}
                                  strokeWidth={iconEditProps.stroke}
                                  size={iconEditProps.size}
                                  style={{ padding: "2px" }}
                                />
                              </div>
                              <div className="elementItemLabel">
                                {radio.label || `Radio ${index + 1}`}
                              </div>
                              <div className="elementItemActions"></div>
                            </div>
                          </div>
                        )
                      )}
                    </>
                  )}

                  {/* ListBox 가상 자식 노드들 */}
                  {hasListBoxChildren && (
                    <>
                      {childrenAs<ListItem>(item.props?.children).map(
                        (listItem, index) => (
                          <div
                            key={`${item.id}-listitem-${index}`}
                            data-depth={depth + 1}
                            data-has-children={false}
                            onClick={(e) => {
                              e.stopPropagation();
                              selectTabElement(
                                item.id as string,
                                item.props as ElementProps,
                                index
                              );
                            }}
                            className="element"
                          >
                            <div
                              className={`elementItem ${
                                selectedTab?.parentId === item.id &&
                                selectedTab?.tabIndex === index
                                  ? "active"
                                  : ""
                              }`}
                            >
                              <div
                                className="elementItemIndent"
                                style={{ width: `${(depth + 1) * 8 + 0}px` }}
                              ></div>
                              <div className="elementItemIcon">
                                <Box
                                  color={iconEditProps.color}
                                  strokeWidth={iconEditProps.stroke}
                                  size={iconEditProps.size}
                                  style={{ padding: "2px" }}
                                />
                              </div>
                              <div className="elementItemLabel">
                                {listItem.label || `Item ${index + 1}`}
                              </div>
                              <div className="elementItemActions"></div>
                            </div>
                          </div>
                        )
                      )}
                    </>
                  )}

                  {/* GridList 가상 자식 노드들 */}
                  {hasGridListChildren && (
                    <>
                      {childrenAs<ListItem>(item.props?.children).map(
                        (gridItem, index) => (
                          <div
                            key={`${item.id}-griditem-${index}`}
                            data-depth={depth + 1}
                            data-has-children={false}
                            onClick={(e) => {
                              e.stopPropagation();
                              selectTabElement(
                                item.id as string,
                                item.props as ElementProps,
                                index
                              );
                            }}
                            className="element"
                          >
                            <div
                              className={`elementItem ${
                                selectedTab?.parentId === item.id &&
                                selectedTab?.tabIndex === index
                                  ? "active"
                                  : ""
                              }`}
                            >
                              <div
                                className="elementItemIndent"
                                style={{ width: `${(depth + 1) * 8 + 0}px` }}
                              ></div>
                              <div className="elementItemIcon">
                                <Box
                                  color={iconEditProps.color}
                                  strokeWidth={iconEditProps.stroke}
                                  size={iconEditProps.size}
                                  style={{ padding: "2px" }}
                                />
                              </div>
                              <div className="elementItemLabel">
                                {gridItem.label || `Item ${index + 1}`}
                              </div>
                              <div className="elementItemActions"></div>
                            </div>
                          </div>
                        )
                      )}
                    </>
                  )}

                  {/* Select 가상 자식 노드들 */}
                  {hasSelectChildren && (
                    <>
                      {childrenAs<ListItem>(item.props?.children).map(
                        (selectItem, index) => (
                          <div
                            key={`${item.id}-selectitem-${index}`}
                            data-depth={depth + 1}
                            data-has-children={false}
                            onClick={(e) => {
                              e.stopPropagation();
                              selectTabElement(
                                item.id as string,
                                item.props as ElementProps,
                                index
                              );
                            }}
                            className="element"
                          >
                            <div
                              className={`elementItem ${
                                selectedTab?.parentId === item.id &&
                                selectedTab?.tabIndex === index
                                  ? "active"
                                  : ""
                              }`}
                            >
                              <div
                                className="elementItemIndent"
                                style={{ width: `${(depth + 1) * 8 + 0}px` }}
                              ></div>
                              <div className="elementItemIcon">
                                <Box
                                  color={iconEditProps.color}
                                  strokeWidth={iconEditProps.stroke}
                                  size={iconEditProps.size}
                                  style={{ padding: "2px" }}
                                />
                              </div>
                              <div className="elementItemLabel">
                                {selectItem.label || `Option ${index + 1}`}
                              </div>
                              <div className="elementItemActions"></div>
                            </div>
                          </div>
                        )
                      )}
                    </>
                  )}

                  {/* ComboBox 가상 자식 노드들 */}
                  {hasComboBoxChildren && (
                    <>
                      {childrenAs<ListItem>(item.props?.children).map(
                        (comboItem, index) => (
                          <div
                            key={`${item.id}-comboitem-${index}`}
                            data-depth={depth + 1}
                            data-has-children={false}
                            onClick={(e) => {
                              e.stopPropagation();
                              selectTabElement(
                                item.id as string,
                                item.props as ElementProps,
                                index
                              );
                            }}
                            className="element"
                          >
                            <div
                              className={`elementItem ${
                                selectedTab?.parentId === item.id &&
                                selectedTab?.tabIndex === index
                                  ? "active"
                                  : ""
                              }`}
                            >
                              <div
                                className="elementItemIndent"
                                style={{ width: `${(depth + 1) * 8 + 0}px` }}
                              ></div>
                              <div className="elementItemIcon">
                                <Box
                                  color={iconEditProps.color}
                                  strokeWidth={iconEditProps.stroke}
                                  size={iconEditProps.size}
                                  style={{ padding: "2px" }}
                                />
                              </div>
                              <div className="elementItemLabel">
                                {comboItem.label || `Option ${index + 1}`}
                              </div>
                              <div className="elementItemActions"></div>
                            </div>
                          </div>
                        )
                      )}
                    </>
                  )}

                  {/* Tree 가상 자식 노드들 */}
                  {hasTreeChildren && (
                    <>
                      {childrenAs<TreeItem>(item.props?.children).map(
                        (treeItem, index) => (
                          <div
                            key={`${item.id}-treeitem-${index}`}
                            data-depth={depth + 1}
                            data-has-children={
                              treeItem.children && treeItem.children.length > 0
                            }
                            onClick={(e) => {
                              e.stopPropagation();
                              selectTabElement(
                                item.id as string,
                                item.props as ElementProps,
                                index
                              );
                            }}
                            className="element"
                          >
                            <div
                              className={`elementItem ${
                                selectedTab?.parentId === item.id &&
                                selectedTab?.tabIndex === index
                                  ? "active"
                                  : ""
                              }`}
                            >
                              <div
                                className="elementItemIndent"
                                style={{ width: `${(depth + 1) * 8 + 0}px` }}
                              ></div>
                              <div className="elementItemIcon">
                                {treeItem.children &&
                                treeItem.children.length > 0 ? (
                                  <Folder
                                    color={iconEditProps.color}
                                    strokeWidth={iconEditProps.stroke}
                                    size={iconEditProps.size}
                                  />
                                ) : (
                                  <File
                                    color={iconEditProps.color}
                                    strokeWidth={iconEditProps.stroke}
                                    size={iconEditProps.size}
                                  />
                                )}
                              </div>
                              <div className="elementItemLabel">
                                {treeItem.title}
                              </div>
                              <div className="elementItemActions"></div>
                            </div>
                            {/* Tree 아이템의 하위 자식들 재귀적으로 렌더링 */}
                            {treeItem.children &&
                              treeItem.children.length > 0 && (
                                <>
                                  {treeItem.children.map(
                                    (child, childIndex) => (
                                      <div
                                        key={`${item.id}-treeitem-${index}-child-${childIndex}`}
                                        data-depth={depth + 2}
                                        data-has-children={false}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          selectTabElement(
                                            item.id as string,
                                            item.props as ElementProps,
                                            index
                                          );
                                        }}
                                        className="element"
                                      >
                                        <div className="elementItem">
                                          <div
                                            className="elementItemIndent"
                                            style={{
                                              width: `${(depth + 2) * 8 + 0}px`,
                                            }}
                                          ></div>
                                          <div className="elementItemIcon">
                                            <File
                                              color={iconEditProps.color}
                                              strokeWidth={iconEditProps.stroke}
                                              size={iconEditProps.size}
                                            />
                                          </div>
                                          <div className="elementItemLabel">
                                            {child.title}
                                          </div>
                                          <div className="elementItemActions"></div>
                                        </div>
                                      </div>
                                    )
                                  )}
                                </>
                              )}
                          </div>
                        )
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          );
        })}
      </>
    );
  };

  // sendElementSelectedMessage 함수를 useIframeMessenger에서 가져와서 사용
  const { sendElementSelectedMessage, requestAutoSelectAfterUpdate } = useIframeMessenger();

  // 모든 트리 아이템 접기 함수 (useTreeExpandState의 collapseAll 사용)
  const collapseAllTreeItems = collapseAll;

  // 변경된 renderContent 함수
  const renderContent = () => {
    // 활성화된 모든 탭에 대한 콘텐츠를 배열로 반환
    const contents = [];

    if (activeTabs.has("nodes")) {
      contents.push(
        <div key="nodes" className="sidebar-section nodes">
          <NodesPanelWithTabs
            pages={pages}
            pageList={pageList}
            handleAddPage={handleAddPage}
            renderTree={renderTree}
            renderElementTree={renderElementTree}
            fetchElements={fetchElements}
            elements={currentPageElements}
            selectedElementId={selectedElementId}
            setSelectedElement={setSelectedElement}
            sendElementSelectedMessage={sendElementSelectedMessage}
            requestAutoSelectAfterUpdate={requestAutoSelectAfterUpdate}
            collapseAllTreeItems={collapseAllTreeItems}
            projectId={projectId}
          />
        </div>
      );
    }

    if (activeTabs.has("components")) {
      contents.push(
        <div key="components" className="sidebar-section components">
          <Components
            handleAddElement={handleAddElement}
            selectedElementId={selectedElementId}
          />
        </div>
      );
    }

    if (activeTabs.has("theme")) {
      contents.push(
        <div key="theme" className="sidebar-section theme">
          <ThemesPanel isActive={true} />
        </div>
      );
    }

    if (activeTabs.has("ai")) {
      contents.push(
        <div key="ai" className="sidebar-section ai">
          <AIPanel isActive={true} />
        </div>
      );
    }

    if (activeTabs.has("settings")) {
      contents.push(
        <div key="settings" className="sidebar-section settings settings">
          <SettingsPanel isActive={true} />
        </div>
      );
    }

    return contents.length > 0 ? (
      contents
    ) : (
      <div className="sidebar-empty-state"></div>
    );
  };

  // 드롭 위치나 추가 위치에 따라 position 계산
  /*const handleComponentAdd = (componentType: string, parentId?: string) => {
        // 현재 부모의 자식 요소 개수 확인
        const siblings = elements.filter(el => el.parent_id === parentId);
        const nextPosition = siblings.length + 1; // 마지막 위치에 추가

        // position을 명시적으로 전달
        handleAddElement(componentType, parentId, nextPosition);
    };

    // 드래그 앤 드롭 처리 부분

    const handleDrop = (event: DragEvent, targetParentId?: string, insertIndex?: number) => {
        event.preventDefault();
        const componentType = event.dataTransfer?.getData('text/plain');

        if (componentType) {
            // insertIndex가 있으면 사용, 없으면 자동 계산
            const position = insertIndex !== undefined
                ? insertIndex + 1 // 0-based index를 1-based order_num으로 변환
                : undefined; // 자동 계산하도록 undefined 전달

            handleAddElement(componentType, targetParentId, position);
        }
    };*/

  return (
    <aside className="sidebar">
      <div className="sidebar-container">{renderContent()}</div>
      {children}
    </aside>
  );
}
