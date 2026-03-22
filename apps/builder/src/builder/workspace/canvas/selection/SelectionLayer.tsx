/**
 * Selection Layer
 *
 * 🚀 Phase 10 B1.3: 선택 시스템 통합 레이어
 * 🚀 Phase 19: 성능 최적화 - selectionBoxRef를 통한 imperative 업데이트
 *
 * 기능:
 * - 선택된 요소의 SelectionBox 표시
 * - Transform 핸들로 리사이즈
 * - 드래그로 이동
 * - 라쏘 선택
 *
 * @since 2025-12-11 Phase 10 B1.3
 * @updated 2025-12-23 Phase 19 성능 최적화
 */

import { useCallback, useMemo, memo, useState, useEffect } from "react";
import { useExtend } from "@pixi/react";
import { PIXI_COMPONENTS } from "../pixiSetup";
import { useStore } from "../../../stores";
import {
  getElementBoundsSimple,
  getElementContainer,
} from "../elementRegistry";
import {
  computeSelectionBounds as computeSelectionBoundsModel,
  resolveSelectedElementsForPage,
} from "../interaction";
import { SelectionBox } from "./SelectionBox";
import type { BoundingBox } from "./types";

// ============================================
// Types
// ============================================

export interface SelectionLayerProps {
  /** 페이지 너비 (Body 선택용) */
  pageWidth?: number;
  /** 페이지 높이 (Body 선택용) */
  pageHeight?: number;
  /** 페이지 위치 맵 (Body 선택/바운드용) */
  pagePositions?: Record<string, { x: number; y: number }>;
  /** 페이지 위치 변경 버전 */
  pagePositionsVersion?: number;
  /** 현재 줌 레벨 (핸들 크기 유지용) */
  zoom?: number;
  /** 🚀 Phase 7: Pan offset for coordinate transformation */
  panOffset?: { x: number; y: number };
}

// ============================================
// Component
// ============================================

/**
 * SelectionLayer
 *
 * 캔버스의 선택 시스템을 관리하는 최상위 레이어입니다.
 */
export const SelectionLayer = memo(function SelectionLayer({
  pageWidth = 1920,
  pageHeight = 1080,
  pagePositions,
  pagePositionsVersion: _pagePositionsVersion = 0,
  zoom = 1,
  panOffset = { x: 0, y: 0 },
}: SelectionLayerProps) {
  useExtend(PIXI_COMPONENTS);

  // Store state
  // 🚀 성능 최적화: elementsMap 전체 구독 제거
  // 기존: elementsMap 구독 → 어떤 요소든 변경되면 SelectionLayer 리렌더
  // 개선: selectedElementIds + 선택된 요소의 스타일 변경만 구독
  const selectedElementIds = useStore((state) => state.selectedElementIds);
  const currentPageId = useStore((state) => state.currentPageId);

  // 🚀 최적화: elementsMap은 구독하지 않고 getState()로 읽음
  const getElementsMap = useCallback(() => useStore.getState().elementsMap, []);

  // 선택된 요소들 (Body 포함)
  // 🚀 최적화: getState()로 elementsMap 조회 (구독 없음)
  const selectedElements = useMemo(() => {
    return resolveSelectedElementsForPage({
      currentPageId,
      elementsMap: getElementsMap(),
      selectedElementIds,
    });
  }, [currentPageId, selectedElementIds, getElementsMap]);

  const computeSelectionBounds = useCallback(() => {
    return computeSelectionBoundsModel({
      getBounds: getElementBoundsSimple,
      getContainer: getElementContainer,
      pageHeight,
      pagePositions,
      pageWidth,
      panOffset,
      selectedElements,
      zoom,
    });
  }, [selectedElements, pageWidth, pageHeight, zoom, panOffset, pagePositions]);

  // 🚀 Phase 2: 선택 변경 시 bounds 계산
  // ElementRegistry의 getBounds()를 사용하여 실제 렌더링된 위치 조회
  const [selectionBounds, setSelectionBounds] = useState<BoundingBox | null>(
    null,
  );

  // layoutBoundsRegistry에 직접 저장된 bounds를 사용하므로 getBounds() 타이밍 문제 없음.
  // LayoutContainer의 useEffect(RAF)가 bounds를 저장한 후, 다음 프레임에서 조회.
  useEffect(() => {
    let cancelled = false;
    requestAnimationFrame(() => {
      if (!cancelled) {
        const bounds = computeSelectionBounds();
        setSelectionBounds(bounds);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [computeSelectionBounds]);

  // 단일 선택 여부
  const isSingleSelection = selectedElements.length === 1;

  return (
    <pixiContainer label="SelectionLayer">
      {/* 선택 박스 (선택된 요소가 있을 때) */}
      {selectionBounds && selectedElements.length > 0 && (
        <SelectionBox
          bounds={selectionBounds}
          showHandles={isSingleSelection}
          zoom={zoom}
        />
      )}
    </pixiContainer>
  );
});

export default SelectionLayer;
