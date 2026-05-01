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
import { FrameList } from "./FrameList";
import { FrameElementTree } from "./FrameElementTree";
import {
  useLayoutsStore,
  useSelectedReusableFrameId,
} from "../../../stores/layouts";
import {
  createReusableFrame,
  deleteReusableFrame,
  selectReusableFrame,
  getNextFrameName,
} from "../../../stores/utils/frameActions";
import { useEditModeStore } from "../../../stores/editMode";
import { useStore } from "../../../stores";
import { selectCanonicalDocument } from "../../../stores/elements";
// ADR-916 Phase 3 G4 — mutation reverse wrapper (D18=A 정합)
import { mergeElementsCanonicalPrimary } from "../../../../adapters/canonical/canonicalMutations";
import { matchesLegacyLayoutId } from "../../../../adapters/canonical/legacyElementFields";
import { ElementProps } from "../../../../types/integrations/supabase.types";
import { Element } from "../../../../types/core/store.types";
import { buildTreeFromElements } from "../../../utils/treeUtils";
import { MessageService } from "../../../../utils/messaging";
import { getDB } from "../../../../lib/db";
import { useTreeExpandState } from "@/builder/hooks";
import { loadFrameElements } from "../../../utils/frameElementLoader";
import {
  isWebGLCanvas,
  isCanvasCompareMode,
} from "../../../../utils/featureFlags";
import type { FrameNode } from "@composition/shared";

interface FramesTabProps {
  selectedElementId: string | null;
  setSelectedElement: (elementId: string | null, props?: ElementProps) => void;
  sendElementSelectedMessage: (elementId: string, props: ElementProps) => void;
  requestAutoSelectAfterUpdate: (elementId: string) => void;
  projectId?: string;
}

function hasHydratedFrameElements(
  elementsMap: ReadonlyMap<string, Element>,
  frameId: string,
): boolean {
  for (const element of elementsMap.values()) {
    if (
      !element.deleted &&
      matchesLegacyLayoutId(element, frameId) &&
      element.page_id == null
    ) {
      return true;
    }
  }
  return false;
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

  // CRUD 는 ADR-911 P2-a frameActions wrapper (PR-A) 로 위임.
  const layouts = useLayoutsStore((state) => state.layouts);
  const fetchLayouts = useLayoutsStore((state) => state.fetchLayouts);

  // Edit Mode store
  const setEditModeLayoutId = useEditModeStore(
    (state) => state.setCurrentLayoutId,
  );

  // ADR-040: elementsMap O(1) 조회
  const elementsMap = useStore((state) => state.elementsMap);
  const pages = useStore((state) => state.pages);
  const removeElement = useStore((state) => state.removeElement);

  // ADR-911 direct cutover: selectCanonicalDocument 의 reusable FrameNode 를
  // 단일 read path 로 사용한다. selector cache 함정 회피를 위해 useMemo 안에서
  // useStore.getState() 를 호출한다.
  // id 정규화: canonical FrameNode.id 는 "layout-<legacyId>" 접두사 → metadata.layoutId
  // (legacyToCanonical adapter 가 보존) 우선 사용. legacy CRUD 와 id 정합 유지.
  const reusableFrames = useMemo<
    ReadonlyArray<{ id: string; name: string }>
  >(() => {
    void elementsMap;
    const state = useStore.getState();
    const doc = selectCanonicalDocument(state, pages, layouts);
    return doc.children
      .filter(
        (n): n is FrameNode =>
          n.type === "frame" && (n as FrameNode).reusable === true,
      )
      .map((f) => {
        const layoutId = (f.metadata as { layoutId?: string } | undefined)
          ?.layoutId;
        return {
          id: layoutId ?? f.id,
          name: f.name ?? "",
        };
      });
    // elementsMap 변경 시 canonical projection 도 갱신 (selectCanonicalDocument 가 elements 소비)
  }, [layouts, pages, elementsMap]);

  // selectedReusableFrameId 기반 현재 프레임 조회
  const currentFrame = useMemo(() => {
    const projectedFrame =
      reusableFrames.find((f) => f.id === selectedReusableFrameId) || null;
    if (projectedFrame || !selectedReusableFrameId) {
      return projectedFrame;
    }

    return { id: selectedReusableFrameId, name: "" };
  }, [reusableFrames, selectedReusableFrameId]);

  const isWebGLOnly = isWebGLCanvas() && !isCanvasCompareMode();

  // 컴포넌트 마운트 시 frames 로드 (legacy bridge: fetchLayouts)
  useEffect(() => {
    if (projectId) {
      fetchLayouts(projectId);
    }
  }, [projectId, fetchLayouts]);

  // 이미 로드된 frame ID 추적 (중복 로드 방지)
  const loadedFrameIdsRef = React.useRef<Set<string>>(new Set());
  const loadingFrameIdsRef = React.useRef<Set<string>>(new Set());
  const frameSelectRequestRef = React.useRef(0);

  // selectedReusableFrameId 변경 시 DB에서 요소 로드 (fallback)
  useEffect(() => {
    if (!selectedReusableFrameId) return;

    if (
      loadedFrameIdsRef.current.has(selectedReusableFrameId) ||
      loadingFrameIdsRef.current.has(selectedReusableFrameId)
    ) {
      return;
    }

    if (hasHydratedFrameElements(elementsMap, selectedReusableFrameId)) {
      loadedFrameIdsRef.current.add(selectedReusableFrameId);
      return;
    }

    const loadSelectedFrameElements = async () => {
      loadingFrameIdsRef.current.add(selectedReusableFrameId);
      try {
        const db = await getDB();
        const frameElements = await loadFrameElements(
          db,
          selectedReusableFrameId,
        );
        if (frameElements.length > 0) {
          mergeElementsCanonicalPrimary(frameElements);
          loadedFrameIdsRef.current.add(selectedReusableFrameId);
        }
      } catch (error) {
        console.error("[FramesTab] Frame 요소 로드 실패:", error);
      } finally {
        loadingFrameIdsRef.current.delete(selectedReusableFrameId);
      }
    };

    loadSelectedFrameElements();
  }, [selectedReusableFrameId, elementsMap]);

  // 새로고침 직후 전역 hydrate race 로 selected frame 이외의 body/slot 이
  // 메모리에 없을 수 있다. Frames 탭 목록이 로드되면 등록된 frame 전체 중
  // 아직 store 에 없는 frame elements 를 보강 로드해 tree/canvas 입력을 맞춘다.
  useEffect(() => {
    if (reusableFrames.length === 0) return;

    const missingFrameIds = reusableFrames
      .map((frame) => frame.id)
      .filter(
        (frameId) =>
          !loadedFrameIdsRef.current.has(frameId) &&
          !loadingFrameIdsRef.current.has(frameId) &&
          !hasHydratedFrameElements(elementsMap, frameId),
      );

    for (const frame of reusableFrames) {
      if (hasHydratedFrameElements(elementsMap, frame.id)) {
        loadedFrameIdsRef.current.add(frame.id);
      }
    }

    if (missingFrameIds.length === 0) return;

    missingFrameIds.forEach((frameId) =>
      loadingFrameIdsRef.current.add(frameId),
    );

    const loadMissingFrameElements = async () => {
      try {
        const db = await getDB();
        const frameElementGroups = await Promise.all(
          missingFrameIds.map(async (frameId) => ({
            frameId,
            elements: await loadFrameElements(db, frameId),
          })),
        );
        const liveFrameIds = new Set(
          useLayoutsStore.getState().layouts.map((layout) => layout.id),
        );
        const liveFrameElementGroups = frameElementGroups.filter((group) =>
          liveFrameIds.has(group.frameId),
        );

        const frameElements = liveFrameElementGroups.flatMap(
          (group) => group.elements,
        );
        if (frameElements.length > 0) {
          mergeElementsCanonicalPrimary(frameElements);
        }

        liveFrameElementGroups.forEach((group) => {
          if (group.elements.length > 0) {
            loadedFrameIdsRef.current.add(group.frameId);
          }
        });
      } catch (error) {
        console.error("[FramesTab] Frame 요소 보강 로드 실패:", error);
      } finally {
        missingFrameIds.forEach((frameId) =>
          loadingFrameIdsRef.current.delete(frameId),
        );
      }
    };

    loadMissingFrameElements();
  }, [reusableFrames, elementsMap]);

  // ADR-040: elementsMap 순회로 legacy layout binding 필터링
  const frameElements = useMemo(() => {
    if (!currentFrame) return [];
    const filtered: Element[] = [];
    elementsMap.forEach((el) => {
      if (
        !el.deleted &&
        matchesLegacyLayoutId(el, currentFrame.id) &&
        el.page_id == null
      ) {
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

  // Frame 선택 핸들러 — id 기반 (ADR-911 P2-a PR-B)
  const handleSelectFrame = useCallback(
    async (frameId: string) => {
      const requestId = frameSelectRequestRef.current + 1;
      frameSelectRequestRef.current = requestId;
      selectReusableFrame(frameId);
      setEditModeLayoutId(frameId);

      if (hasHydratedFrameElements(elementsMap, frameId)) {
        loadedFrameIdsRef.current.add(frameId);
        return;
      }
      if (loadingFrameIdsRef.current.has(frameId)) {
        return;
      }
      loadingFrameIdsRef.current.add(frameId);

      try {
        const db = await getDB();
        const frameElements = await loadFrameElements(db, frameId);
        if (requestId !== frameSelectRequestRef.current) {
          return;
        }

        if (frameElements.length > 0) {
          mergeElementsCanonicalPrimary(frameElements);
          loadedFrameIdsRef.current.add(frameId);
        }
      } catch (error) {
        if (requestId !== frameSelectRequestRef.current) {
          return;
        }
        console.error("[FramesTab] Frame 선택 에러:", error);
      } finally {
        loadingFrameIdsRef.current.delete(frameId);
      }
    },
    [setEditModeLayoutId, elementsMap],
  );

  // Frame 삭제 핸들러 — frameActions.deleteReusableFrame 위임
  const handleDeleteFrame = useCallback(
    async (frameId: string) => {
      try {
        await deleteReusableFrame(frameId);
        const remaining = reusableFrames.filter((f) => f.id !== frameId);
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
    [reusableFrames, handleSelectFrame, setEditModeLayoutId],
  );

  // 새 Frame 생성 핸들러 — frameActions.createReusableFrame 위임.
  // unique 한 default 이름은 getNextFrameName 으로 안정 생성 — 이전 패턴
  // (`Frame ${reusableFrames.length + 1}`) 의 중복 위험 제거 (delete 후 add 또는
  // IDB 잔존 데이터 + 메모리 length mismatch 시 충돌 방지).
  const handleAddFrame = useCallback(async () => {
    if (!projectId) {
      console.error("[FramesTab] 프로젝트 ID가 없습니다");
      return;
    }
    try {
      const ref = await createReusableFrame({
        name: getNextFrameName(reusableFrames),
        projectId,
      });
      await handleSelectFrame(ref.id);
    } catch (error) {
      console.error("[FramesTab] Frame 생성 에러:", error);
    }
  }, [projectId, reusableFrames, handleSelectFrame]);

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
      {/* Frames List — ADR-911 P2 PR-D 추출 */}
      <FrameList
        frames={reusableFrames}
        selectedFrameId={currentFrame?.id ?? null}
        onSelect={handleSelectFrame}
        onDelete={handleDeleteFrame}
        onAdd={handleAddFrame}
      />

      {/* Frame Element Tree — ADR-911 P2 PR-D2 추출 */}
      <FrameElementTree
        tree={frameElementTree}
        frameId={currentFrame?.id ?? null}
        selectedElementId={selectedElementId}
        expandedKeys={expandedKeys}
        toggleKey={toggleKey}
        onCollapseAll={collapseFrameTree}
        onElementClick={(el) => {
          setSelectedElement(el.id, el.props as ElementProps);
          requestAnimationFrame(() =>
            sendElementSelectedMessage(el.id, el.props as ElementProps),
          );
        }}
        onElementDelete={handleDeleteElement}
      />
    </div>
  );
}

export default FramesTab;
