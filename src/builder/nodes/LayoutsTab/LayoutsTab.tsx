/**
 * LayoutsTab
 *
 * Layouts 탭의 메인 컨테이너.
 * Layout 목록과 현재 Layout의 Element 트리를 표시.
 */

import React, { useCallback, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import { CirclePlus, CopyMinus, ChevronRight, Box, Trash, Settings2 } from "lucide-react";
import { iconProps } from "../../../utils/ui/uiConstants";
import { useLayoutsStore } from "../../stores/layouts";
import { useEditModeStore } from "../../stores/editMode";
import { useStore } from "../../stores";
import { ElementProps } from "../../../types/integrations/supabase.types";
import { Element } from "../../../types/core/store.types";
import type { ElementTreeItem } from "../../../types/builder/stately.types";
import type { Layout } from "../../../types/builder/layout.types";
import { buildTreeFromElements } from "../../utils/treeUtils";
import { MessageService } from "../../../utils/messaging";
import { getDB } from "../../../lib/db";
import { useTreeExpandState } from "../../hooks/useTreeExpandState";

interface LayoutsTabProps {
  // ⭐ renderTree/renderElementTree/collapseAllTreeItems 제거됨
  // Layout은 자체 renderLayoutTree와 collapseLayoutTree 사용
  selectedElementId: string | null;
  setSelectedElement: (elementId: string | null, props?: ElementProps) => void;
  sendElementSelectedMessage: (elementId: string, props: ElementProps) => void;
  requestAutoSelectAfterUpdate: (elementId: string) => void; // ⭐ ACK 기반 auto-select
  projectId?: string; // prop으로 받은 projectId (우선 사용)
}

export function LayoutsTab({
  selectedElementId,
  setSelectedElement,
  sendElementSelectedMessage,
  requestAutoSelectAfterUpdate,
  projectId: projectIdProp,
}: LayoutsTabProps) {
  // URL params (fallback)
  const { projectId: projectIdFromParams } = useParams<{ projectId: string }>();

  // prop 우선, useParams fallback
  const projectId = projectIdProp || projectIdFromParams;

  // Layouts store
  const layouts = useLayoutsStore((state) => state.layouts);
  const currentLayoutId = useLayoutsStore((state) => state.currentLayoutId);
  const setCurrentLayoutInStore = useLayoutsStore((state) => state.setCurrentLayout);
  const createLayout = useLayoutsStore((state) => state.createLayout);
  const deleteLayout = useLayoutsStore((state) => state.deleteLayout);
  const fetchLayouts = useLayoutsStore((state) => state.fetchLayouts);

  // Compute currentLayout from layouts and currentLayoutId
  const currentLayout = useMemo(() => {
    const found = layouts.find((l) => l.id === currentLayoutId) || null;
    console.log(`📌 [currentLayout] 계산: currentLayoutId=${currentLayoutId?.slice(0,8)}, found=${found?.name}`);
    return found;
  }, [layouts, currentLayoutId]);

  // Edit Mode store
  const setEditModeLayoutId = useEditModeStore(
    (state) => state.setCurrentLayoutId
  );

  // Elements store - Layout에 속한 요소들
  const allElements = useStore((state) => state.elements);
  const removeElement = useStore((state) => state.removeElement);
  const setElements = useStore((state) => state.setElements);

  // 컴포넌트 마운트 시 Layouts 로드
  useEffect(() => {
    console.log("🔍 [LayoutsTab] projectId:", projectId);
    if (projectId) {
      console.log("📥 [LayoutsTab] fetchLayouts 호출:", projectId);
      fetchLayouts(projectId);
    } else {
      console.warn("⚠️ [LayoutsTab] projectId가 없습니다!");
    }
  }, [projectId, fetchLayouts]);

  // ⭐ Layout/Slot System: 이미 로드된 Layout ID 추적 (중복 로드 방지)
  const loadedLayoutIdsRef = React.useRef<Set<string>>(new Set());

  // ⭐ Layout/Slot System: Layout 선택 시 DB에서 요소 로드 (fallback용 - handleSelectLayout에서 주로 처리)
  useEffect(() => {
    if (!currentLayoutId) {
      console.log("📥 [LayoutsTab] currentLayoutId가 없음 - 요소 로드 스킵");
      return;
    }

    // 이미 로드된 Layout이면 스킵 (handleSelectLayout에서 이미 로드됨)
    if (loadedLayoutIdsRef.current.has(currentLayoutId)) {
      console.log(`📥 [LayoutsTab] Layout ${currentLayoutId.slice(0, 8)} 이미 로드됨 - 스킵`);
      return;
    }

    const loadLayoutElements = async () => {
      try {
        console.log(`📥 [LayoutsTab] Layout ${currentLayoutId} 요소 로드 시작... (fallback)`);
        const db = await getDB();
        const layoutElements = await db.elements.getByLayout(currentLayoutId);
        console.log(`📥 [LayoutsTab] IndexedDB에서 ${layoutElements.length}개 요소 조회됨`);

        // 최신 elements 상태 가져오기 (stale closure 방지)
        const currentElements = useStore.getState().elements;
        const storeSetElements = useStore.getState().setElements;

        // 기존 요소들 중 해당 레이아웃 요소가 아닌 것들 유지
        const otherElements = currentElements.filter(
          (el) => el.layout_id !== currentLayoutId
        );
        // 새로 로드한 레이아웃 요소들과 병합
        const mergedElements = [...otherElements, ...layoutElements];
        storeSetElements(mergedElements, { skipHistory: true });

        // 로드 완료 표시
        loadedLayoutIdsRef.current.add(currentLayoutId);
        console.log(
          `📥 [LayoutsTab] Layout ${currentLayoutId} 요소 ${layoutElements.length}개 로드 완료 (전체: ${mergedElements.length})`
        );
      } catch (error) {
        console.error("[LayoutsTab] Layout 요소 로드 실패:", error);
      }
    };

    loadLayoutElements();
  }, [currentLayoutId]); // useStore.getState()를 사용하므로 다른 의존성 불필요

  // 현재 Layout의 요소들만 필터링
  const layoutElements = useMemo(() => {
    console.log(`🎯 [layoutElements] 필터링: currentLayout=${currentLayout?.id?.slice(0,8)}, allElements=${allElements.length}개`);
    if (!currentLayout) return [];
    const filtered = allElements.filter((el) => el.layout_id === currentLayout.id);
    console.log(`🎯 [layoutElements] 필터 결과: ${filtered.length}개 (${filtered.map(el => el.tag).join(', ')})`);
    return filtered;
  }, [allElements, currentLayout]);

  // Layout 요소 트리 빌드
  const layoutElementTree = useMemo(() => {
    console.log(`🌳 [layoutElementTree] 트리 빌드: ${layoutElements.length}개 요소`);
    return buildTreeFromElements(layoutElements);
  }, [layoutElements]);

  // ⭐ Layout 전용 트리 펼치기/접기 상태 관리
  const { expandedKeys, toggleKey, collapseAll: collapseLayoutTree, expandKey } = useTreeExpandState({
    selectedElementId,
    elements: layoutElements,
  });

  // ⭐ Layout 전환 시 body 자동 펼치기 + 선택 (Pages 탭과 동일 패턴)
  const prevLayoutIdRef = React.useRef<string | null>(null);

  useEffect(() => {
    const layoutChanged = currentLayout?.id !== prevLayoutIdRef.current;

    if (layoutChanged && currentLayout?.id) {
      // Layout이 변경되었으면 먼저 모든 확장 상태를 초기화
      collapseLayoutTree();
      console.log(`📂 [LayoutsTab] Layout 전환: ${prevLayoutIdRef.current?.slice(0, 8)} → ${currentLayout.id.slice(0, 8)}`);
      prevLayoutIdRef.current = currentLayout.id;
    }

    // body 요소 (order_num === 0) 자동 펼치기 + 선택 (ACK 기반)
    if (currentLayout && layoutElements.length > 0) {
      const bodyElement = layoutElements.find(el => el.order_num === 0) || layoutElements.find(el => el.tag === 'body');
      if (bodyElement) {
        console.log(`📂 [LayoutsTab] body 자동 펼치기 + 선택: ${bodyElement.id.slice(0, 8)}`);
        expandKey(bodyElement.id);
        // ⭐ Store 업데이트
        setSelectedElement(bodyElement.id, bodyElement.props as ElementProps);
        // ⭐ ACK 기반 auto-select 등록 (iframe 렌더링 완료 후 overlay 표시)
        requestAutoSelectAfterUpdate(bodyElement.id);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLayout?.id, layoutElements, expandKey, collapseLayoutTree, setSelectedElement, requestAutoSelectAfterUpdate]);

  // ⭐ Layout 전용 Element Tree 렌더링 함수 (재귀 호출을 위해 내부 함수로 구현)
  const renderLayoutTree = useCallback((
    tree: ElementTreeItem[],
    onClick: (item: Element) => void,
    onDelete: (item: Element) => Promise<void>,
    depth: number = 0
  ): React.ReactNode => {
    // 재귀 호출을 위한 내부 헬퍼 함수
    const renderTree = (
      items: ElementTreeItem[],
      currentDepth: number
    ): React.ReactNode => {
      if (items.length === 0) return null;

      return (
        <>
          {items.map((item) => {
            const hasChildNodes = item.children && item.children.length > 0;
            const isExpanded = expandedKeys.has(item.id);

            // Element로 변환 (onClick, onDelete용)
            const element: Element = {
              id: item.id,
              tag: item.tag,
              parent_id: item.parent_id || null,
              order_num: item.order_num,
              props: item.props as ElementProps,
              deleted: item.deleted,
              layout_id: currentLayout?.id || null,
              page_id: null,
              created_at: "",
              updated_at: "",
            };

            return (
              <div
                key={item.id}
                data-depth={currentDepth}
                data-has-children={hasChildNodes}
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
                    style={{ width: currentDepth > 0 ? `${currentDepth * 8}px` : "0px" }}
                  ></div>
                  <div
                    className="elementItemIcon"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (hasChildNodes) {
                        toggleKey(item.id);
                      }
                    }}
                  >
                    {hasChildNodes ? (
                      <ChevronRight
                        color={iconProps.color}
                        strokeWidth={iconProps.stroke}
                        size={iconProps.size}
                        style={{
                          transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                        }}
                      />
                    ) : (
                      <Box
                        color={iconProps.color}
                        strokeWidth={iconProps.stroke}
                        size={iconProps.size}
                        style={{ padding: "2px" }}
                      />
                    )}
                  </div>
                  <div className="elementItemLabel">
                    {item.tag === "Slot" && item.props
                      ? `Slot: ${(item.props as Record<string, unknown>).name || "unnamed"}`
                      : item.tag}
                  </div>
                  <div className="elementItemActions">
                    <button className="iconButton" aria-label="Settings">
                      <Settings2
                        color={iconProps.color}
                        strokeWidth={iconProps.stroke}
                        size={iconProps.size}
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
                          color={iconProps.color}
                          strokeWidth={iconProps.stroke}
                          size={iconProps.size}
                        />
                      </button>
                    )}
                  </div>
                </div>
                {isExpanded && hasChildNodes && item.children && (
                  renderTree(item.children, currentDepth + 1)
                )}
              </div>
            );
          })}
        </>
      );
    };

    return renderTree(tree, depth);
  }, [expandedKeys, toggleKey, selectedElementId, currentLayout?.id]);

  // Layout 선택 핸들러
  // ⭐ 요소를 먼저 로드한 후 currentLayoutId 설정 (타이밍 문제 해결)
  const handleSelectLayout = useCallback(
    async (layout: Layout) => {
      console.log(`🔄 [LayoutsTab] Layout 선택: ${layout.name} (${layout.id})`);
      console.log(`🔄 [LayoutsTab] 현재 currentLayoutId: ${currentLayoutId}`);

      try {
        // 1. 먼저 Layout 요소들을 Store에 로드
        const db = await getDB();
        const layoutElements = await db.elements.getByLayout(layout.id);
        console.log(`📥 [LayoutsTab] Layout ${layout.id.slice(0, 8)} 요소 ${layoutElements.length}개 선 로드`);

        // 기존 요소들 중 해당 레이아웃 요소가 아닌 것들 유지 + 새 레이아웃 요소 추가
        const currentElements = useStore.getState().elements;
        const otherElements = currentElements.filter((el) => el.layout_id !== layout.id);
        const mergedElements = [...otherElements, ...layoutElements];
        setElements(mergedElements, { skipHistory: true });

        // 로드 완료 표시 (useEffect에서 중복 로드 방지)
        loadedLayoutIdsRef.current.add(layout.id);

        // 2. 그 다음 currentLayoutId 설정 (이제 요소들이 있으므로 필터링 정상 작동)
        setCurrentLayoutInStore(layout.id);
        setEditModeLayoutId(layout.id);
        console.log(`🔄 [LayoutsTab] Layout 선택 완료`);
      } catch (error) {
        console.error("Layout 선택 에러:", error);
        // 에러 발생해도 Layout 선택은 진행
        setCurrentLayoutInStore(layout.id);
        setEditModeLayoutId(layout.id);
      }
    },
    [setCurrentLayoutInStore, setEditModeLayoutId, currentLayoutId, setElements]
  );

  // Layout 삭제 핸들러
  const handleDeleteLayout = useCallback(
    async (layout: Layout) => {
      try {
        await deleteLayout(layout.id);
        // 삭제 후 다른 Layout 선택
        const remaining = layouts.filter((l) => l.id !== layout.id);
        if (remaining.length > 0) {
          handleSelectLayout(remaining[0]);
        } else {
          setCurrentLayoutInStore(null);
          setEditModeLayoutId(null);
        }
      } catch (error) {
        console.error("Layout 삭제 에러:", error);
      }
    },
    [
      deleteLayout,
      layouts,
      handleSelectLayout,
      setCurrentLayoutInStore,
      setEditModeLayoutId,
    ]
  );

  // 새 Layout 생성 핸들러
  const handleAddLayout = useCallback(async () => {
    if (!projectId) {
      console.error("프로젝트 ID가 없습니다");
      return;
    }
    try {
      const newLayout = await createLayout({
        name: `Layout ${layouts.length + 1}`,
        description: "",
        project_id: projectId,
      });
      if (newLayout) {
        handleSelectLayout(newLayout);
      }
    } catch (error) {
      console.error("Layout 생성 에러:", error);
    }
  }, [projectId, createLayout, layouts.length, handleSelectLayout]);

  // Element 삭제 핸들러
  const handleDeleteElement = useCallback(
    async (el: Element) => {
      await removeElement(el.id);
      if (el.id === selectedElementId) {
        setSelectedElement(null);
        MessageService.clearOverlay();
      }
    },
    [removeElement, selectedElementId, setSelectedElement]
  );

  return (
    <div
      className="layouts-tab"
      role="tabpanel"
      id="tabpanel-layouts"
      aria-label="Layouts"
    >
      {/* Layouts List */}
      <div className="sidebar_layouts">
        <div className="panel-header">
          <h3 className="panel-title">Layouts</h3>
          <div className="header-actions">
            <button
              className="iconButton"
              aria-label="Add Layout"
              onClick={handleAddLayout}
            >
              <CirclePlus
                color={iconProps.color}
                strokeWidth={iconProps.stroke}
                size={iconProps.size}
              />
            </button>
          </div>
        </div>

        <div className="elements">
          {layouts.length === 0 ? (
            <p className="no_element">No layouts available</p>
          ) : (
            layouts.map((layout) => (
              <div
                key={layout.id}
                className="element"
                onClick={() => handleSelectLayout(layout)}
              >
                <div
                  className={`elementItem ${
                    currentLayout?.id === layout.id ? "active" : ""
                  }`}
                >
                  <div className="elementItemIndent" style={{ width: "0px" }}></div>
                  <div className="elementItemIcon">
                    <Box
                      color={iconProps.color}
                      strokeWidth={iconProps.stroke}
                      size={iconProps.size}
                      style={{ padding: "2px" }}
                    />
                  </div>
                  <div className="elementItemLabel">{layout.name}</div>
                  <div className="elementItemActions">
                    <button
                      className="iconButton"
                      aria-label={`Delete ${layout.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLayout(layout);
                      }}
                    >
                      <Trash
                        color={iconProps.color}
                        strokeWidth={iconProps.stroke}
                        size={iconProps.size}
                      />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Layout Element Tree */}
      <div className="sidebar_elements">
        <div className="panel-header">
          <h3 className="panel-title">Layers</h3>
          <div className="header-actions">
            <button
              className="iconButton"
              aria-label="Collapse All"
              onClick={() => collapseLayoutTree()}
            >
              <CopyMinus
                color={iconProps.color}
                strokeWidth={iconProps.stroke}
                size={iconProps.size}
              />
            </button>
          </div>
        </div>
        <div className="elements">
          {!currentLayout ? (
            <p className="no_element">Select a layout to view elements</p>
          ) : layoutElements.length === 0 ? (
            <p className="no_element">No elements in this layout</p>
          ) : (
            renderLayoutTree(
              layoutElementTree,
              (el) => {
                setSelectedElement(el.id, el.props as ElementProps);
                requestAnimationFrame(() =>
                  sendElementSelectedMessage(el.id, el.props as ElementProps)
                );
              },
              handleDeleteElement
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default LayoutsTab;
