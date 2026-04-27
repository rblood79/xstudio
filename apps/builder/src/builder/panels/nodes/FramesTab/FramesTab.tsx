/**
 * FramesTab
 *
 * ADR-903 P3-C: LayoutsTab → FramesTab 재설계.
 * Canonical reusable frame 목록 표시 + Element 트리.
 *
 * P3-C 변경 사항:
 * - frame 목록: `useLayoutsStore.layouts` (legacy bridge — P3-D에서 canonical store로 교체)
 * - frame selection: `selectedReusableFrameId` (P3-B canonical selector, currentLayoutId backward-compat 제거)
 * - frame 생성: `createLayout` bridge (P3-D에서 canonical document mutation으로 전환 예정)
 * - UI 레이블: "Layouts" → "Frames"
 *
 * @deprecated-path `currentLayoutId` direct access 제거됨. `selectedReusableFrameId` 사용.
 */

import React, { useCallback, useEffect, useMemo } from "react";
import { useParams } from "react-router-dom";
import {
  CirclePlus,
  Minimize,
  ChevronRight,
  Box,
  Trash,
  Settings2,
} from "lucide-react";
import { iconProps } from "../../../../utils/ui/uiConstants";
import {
  useLayoutsStore,
  useSelectedReusableFrameId,
} from "../../../stores/layouts";
import {
  createReusableFrame,
  deleteReusableFrame,
  selectReusableFrame,
} from "../../../stores/utils/frameActions";
import { useEditModeStore } from "../../../stores/editMode";
import { useStore } from "../../../stores";
import { ElementProps } from "../../../../types/integrations/supabase.types";
import { Element } from "../../../../types/core/store.types";
import type { ElementTreeItem } from "../../../../types/builder/stately.types";
import { buildTreeFromElements } from "../../../utils/treeUtils";
import { MessageService } from "../../../../utils/messaging";
import { getDB } from "../../../../lib/db";
import { useTreeExpandState } from "@/builder/hooks";
import {
  isWebGLCanvas,
  isCanvasCompareMode,
} from "../../../../utils/featureFlags";

interface FramesTabProps {
  selectedElementId: string | null;
  setSelectedElement: (elementId: string | null, props?: ElementProps) => void;
  sendElementSelectedMessage: (elementId: string, props: ElementProps) => void;
  requestAutoSelectAfterUpdate: (elementId: string) => void;
  projectId?: string;
}

export function FramesTab({
  selectedElementId,
  setSelectedElement,
  sendElementSelectedMessage,
  requestAutoSelectAfterUpdate,
  projectId: projectIdProp,
}: FramesTabProps) {
  const { projectId: projectIdFromParams } = useParams<{ projectId: string }>();
  const projectId = projectIdProp || projectIdFromParams;

  // P3-B canonical selector: selectedReusableFrameId (currentLayoutId alias 제거됨)
  const selectedReusableFrameId = useSelectedReusableFrameId();

  // Legacy read bridge — frame 목록은 useLayoutsStore.layouts[] 직접 소비.
  // PR-C 에서 selectCanonicalDocument 기반 read path 로 전환 예정.
  // CRUD 는 ADR-911 P2-a frameActions wrapper (PR-A) 로 위임.
  const layouts = useLayoutsStore((state) => state.layouts);
  const fetchLayouts = useLayoutsStore((state) => state.fetchLayouts);

  // selectedReusableFrameId 기반 현재 프레임 조회 (legacy bridge)
  const currentFrame = useMemo(() => {
    return layouts.find((l) => l.id === selectedReusableFrameId) || null;
  }, [layouts, selectedReusableFrameId]);

  // Edit Mode store
  const setEditModeLayoutId = useEditModeStore(
    (state) => state.setCurrentLayoutId,
  );

  // ADR-040: elementsMap O(1) 조회
  const elementsMap = useStore((state) => state.elementsMap);
  const removeElement = useStore((state) => state.removeElement);
  const mergeElements = useStore((state) => state.mergeElements);

  const isWebGLOnly = isWebGLCanvas() && !isCanvasCompareMode();

  // 컴포넌트 마운트 시 frames 로드 (legacy bridge: fetchLayouts)
  useEffect(() => {
    if (projectId) {
      fetchLayouts(projectId);
    }
  }, [projectId, fetchLayouts]);

  // 이미 로드된 frame ID 추적 (중복 로드 방지)
  const loadedFrameIdsRef = React.useRef<Set<string>>(new Set());

  // selectedReusableFrameId 변경 시 DB에서 요소 로드 (fallback)
  useEffect(() => {
    if (!selectedReusableFrameId) return;

    if (loadedFrameIdsRef.current.has(selectedReusableFrameId)) {
      return;
    }

    const loadFrameElements = async () => {
      try {
        const db = await getDB();
        // ADR-903 P3-D 진입 전: getByLayout bridge 유지
        const frameElements = await db.elements.getByLayout(
          selectedReusableFrameId,
        );

        const currentElements = useStore.getState().elements;
        const storeSetElements = useStore.getState().setElements;

        // 해당 frame 소속 이외 elements 유지 + 새 frame elements 병합
        const otherElements = currentElements.filter(
          (el) => el.layout_id !== selectedReusableFrameId,
        );
        storeSetElements([...otherElements, ...frameElements]);

        loadedFrameIdsRef.current.add(selectedReusableFrameId);
      } catch (error) {
        console.error("[FramesTab] Frame 요소 로드 실패:", error);
      }
    };

    loadFrameElements();
  }, [selectedReusableFrameId]);

  // ADR-040: elementsMap 순회로 layout_id 필터링
  const frameElements = useMemo(() => {
    if (!currentFrame) return [];
    const filtered: Element[] = [];
    elementsMap.forEach((el) => {
      if (el.layout_id === currentFrame.id) {
        filtered.push(el);
      }
    });
    return filtered;
  }, [elementsMap, currentFrame]);

  // Frame 요소 트리 빌드
  const frameElementTree = useMemo(() => {
    return buildTreeFromElements(frameElements);
  }, [frameElements]);

  // Frame 전용 트리 펼치기/접기 상태
  const {
    expandedKeys,
    toggleKey,
    collapseAll: collapseFrameTree,
    expandKey,
  } = useTreeExpandState({
    selectedElementId,
    elements: frameElements,
  });

  // Frame 전환 시 body 자동 펼치기 + 선택
  const prevFrameIdRef = React.useRef<string | null>(null);
  const bodyAutoSelectedRef = React.useRef<boolean>(false);

  useEffect(() => {
    const frameChanged = currentFrame?.id !== prevFrameIdRef.current;

    if (frameChanged && currentFrame?.id) {
      collapseFrameTree();
      prevFrameIdRef.current = currentFrame.id;
      bodyAutoSelectedRef.current = false;
    }

    if (
      currentFrame &&
      frameElements.length > 0 &&
      !bodyAutoSelectedRef.current
    ) {
      const bodyElement =
        frameElements.find((el) => el.order_num === 0) ||
        frameElements.find((el) => el.type === "body");
      if (bodyElement) {
        expandKey(bodyElement.id);
        setSelectedElement(bodyElement.id, bodyElement.props as ElementProps);
        requestAutoSelectAfterUpdate(bodyElement.id);
        bodyAutoSelectedRef.current = true;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    currentFrame?.id,
    frameElements,
    expandKey,
    collapseFrameTree,
    setSelectedElement,
    requestAutoSelectAfterUpdate,
  ]);

  // Frame 전용 Element Tree 렌더링
  const renderFrameTree = useCallback(
    (
      tree: ElementTreeItem[],
      onClick: (item: Element) => void,
      onDelete: (item: Element) => Promise<void>,
      depth: number = 0,
    ): React.ReactNode => {
      const renderTree = (
        items: ElementTreeItem[],
        currentDepth: number,
      ): React.ReactNode => {
        if (items.length === 0) return null;

        return (
          <>
            {items.map((item) => {
              const hasChildNodes = item.children && item.children.length > 0;
              const isExpanded = expandedKeys.has(item.id);

              const element: Element = {
                id: item.id,
                type: item.type,
                parent_id: item.parent_id || null,
                order_num: item.order_num,
                props: item.props as ElementProps,
                deleted: item.deleted,
                layout_id: currentFrame?.id || null,
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
                      style={{
                        width:
                          currentDepth > 0 ? `${currentDepth * 8}px` : "0px",
                      }}
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
                          strokeWidth={iconProps.strokeWidth}
                          size={iconProps.size}
                          style={{
                            transform: isExpanded
                              ? "rotate(90deg)"
                              : "rotate(0deg)",
                          }}
                        />
                      ) : (
                        <Box
                          color={iconProps.color}
                          strokeWidth={iconProps.strokeWidth}
                          size={iconProps.size}
                          style={{ padding: "2px" }}
                        />
                      )}
                    </div>
                    <div className="elementItemLabel">
                      {item.type === "Slot" && item.props
                        ? `Slot: ${
                            (item.props as Record<string, unknown>).name ||
                            "unnamed"
                          }`
                        : item.type}
                    </div>
                    <div className="elementItemActions">
                      {item.type === "body" && (
                        <button className="iconButton" aria-label="Settings">
                          <Settings2
                            color={iconProps.color}
                            strokeWidth={iconProps.strokeWidth}
                            size={iconProps.size}
                          />
                        </button>
                      )}
                      {item.type !== "body" && (
                        <button
                          className="iconButton"
                          aria-label={`Delete ${item.type}`}
                          onClick={async (e) => {
                            e.stopPropagation();
                            await onDelete(element);
                          }}
                        >
                          <Trash
                            color={iconProps.color}
                            strokeWidth={iconProps.strokeWidth}
                            size={iconProps.size}
                          />
                        </button>
                      )}
                    </div>
                  </div>
                  {isExpanded &&
                    hasChildNodes &&
                    item.children &&
                    renderTree(item.children, currentDepth + 1)}
                </div>
              );
            })}
          </>
        );
      };

      return renderTree(tree, depth);
    },
    [expandedKeys, toggleKey, selectedElementId, currentFrame?.id],
  );

  // Frame 선택 핸들러 — id 기반 (ADR-911 P2-a PR-B)
  const handleSelectFrame = useCallback(
    async (frameId: string) => {
      try {
        const db = await getDB();
        // ADR-903 P3-D 진입 전: getByLayout bridge 유지
        const frameElements = await db.elements.getByLayout(frameId);

        mergeElements(frameElements);
        loadedFrameIdsRef.current.add(frameId);

        selectReusableFrame(frameId);
        setEditModeLayoutId(frameId);
      } catch (error) {
        console.error("[FramesTab] Frame 선택 에러:", error);
        selectReusableFrame(frameId);
        setEditModeLayoutId(frameId);
      }
    },
    [setEditModeLayoutId, mergeElements],
  );

  // Frame 삭제 핸들러 — frameActions.deleteReusableFrame 위임
  const handleDeleteFrame = useCallback(
    async (frameId: string) => {
      try {
        await deleteReusableFrame(frameId);
        const remaining = layouts.filter((l) => l.id !== frameId);
        if (remaining.length > 0) {
          handleSelectFrame(remaining[0].id);
        } else {
          selectReusableFrame(null);
          setEditModeLayoutId(null);
        }
      } catch (error) {
        console.error("[FramesTab] Frame 삭제 에러:", error);
      }
    },
    [layouts, handleSelectFrame, setEditModeLayoutId],
  );

  // 새 Frame 생성 핸들러 — frameActions.createReusableFrame 위임
  const handleAddFrame = useCallback(async () => {
    if (!projectId) {
      console.error("[FramesTab] 프로젝트 ID가 없습니다");
      return;
    }
    try {
      const ref = await createReusableFrame({
        name: `Frame ${layouts.length + 1}`,
        projectId,
      });
      handleSelectFrame(ref.id);
    } catch (error) {
      console.error("[FramesTab] Frame 생성 에러:", error);
    }
  }, [projectId, layouts.length, handleSelectFrame]);

  // Element 삭제 핸들러
  const handleDeleteElement = useCallback(
    async (el: Element) => {
      await removeElement(el.id);
      if (el.id === selectedElementId) {
        setSelectedElement(null);
        if (!isWebGLOnly) {
          MessageService.clearOverlay();
        }
      }
    },
    [removeElement, selectedElementId, setSelectedElement, isWebGLOnly],
  );

  return (
    <div
      className="layouts-tab"
      role="tabpanel"
      id="tabpanel-frames"
      aria-label="Frames"
    >
      {/* Frames List */}
      <div className="sidebar_layouts">
        <div className="panel-header">
          <h3 className="panel-title">Frames</h3>
          <div className="header-actions">
            <button
              className="iconButton"
              aria-label="Add Frame"
              onClick={handleAddFrame}
            >
              <CirclePlus
                color={iconProps.color}
                strokeWidth={iconProps.strokeWidth}
                size={iconProps.size}
              />
            </button>
          </div>
        </div>

        <div className="elements">
          {layouts.length === 0 ? (
            <p className="no_element">No frames available</p>
          ) : (
            layouts.map((frame) => (
              <div
                key={frame.id}
                className="element"
                onClick={() => handleSelectFrame(frame.id)}
              >
                <div
                  className={`elementItem ${
                    currentFrame?.id === frame.id ? "active" : ""
                  }`}
                >
                  <div
                    className="elementItemIndent"
                    style={{ width: "0px" }}
                  ></div>
                  <div className="elementItemIcon">
                    <Box
                      color={iconProps.color}
                      strokeWidth={iconProps.strokeWidth}
                      size={iconProps.size}
                      style={{ padding: "2px" }}
                    />
                  </div>
                  <div className="elementItemLabel">{frame.name}</div>
                  <div className="elementItemActions">
                    <button
                      className="iconButton"
                      aria-label={`Delete ${frame.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFrame(frame.id);
                      }}
                    >
                      <Trash
                        color={iconProps.color}
                        strokeWidth={iconProps.strokeWidth}
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

      {/* Frame Element Tree */}
      <div className="sidebar_elements">
        <div className="panel-header">
          <h3 className="panel-title">Layers</h3>
          <div className="header-actions">
            <button
              className="iconButton"
              aria-label="Collapse All"
              onClick={() => collapseFrameTree()}
            >
              <Minimize
                color={iconProps.color}
                strokeWidth={iconProps.strokeWidth}
                size={iconProps.size}
              />
            </button>
          </div>
        </div>
        <div className="elements">
          {!currentFrame ? (
            <p className="no_element">Select a frame to view elements</p>
          ) : frameElements.length === 0 ? (
            <p className="no_element">No elements in this frame</p>
          ) : (
            renderFrameTree(
              frameElementTree,
              (el) => {
                setSelectedElement(el.id, el.props as ElementProps);
                requestAnimationFrame(() =>
                  sendElementSelectedMessage(el.id, el.props as ElementProps),
                );
              },
              handleDeleteElement,
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default FramesTab;
