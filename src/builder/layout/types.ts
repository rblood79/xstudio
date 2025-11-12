/**
 * Layout Types
 *
 * 레이아웃 시스템에서 사용하는 타입 정의
 */

import type { PanelId, PanelSide, PanelLayoutState, PanelLayoutActions } from '../panels/core/types';

/**
 * PanelSlot Props
 */
export interface PanelSlotProps {
  /** 슬롯 위치 (left/right) */
  side: PanelSide;

  /** 이 슬롯에 배치된 패널 ID 배열 */
  availablePanels: PanelId[];

  /** 현재 활성화된 패널 ID */
  activePanel: PanelId | null;

  /** 패널 선택 콜백 */
  onSelectPanel: (panelId: PanelId) => void;

  /** 슬롯 표시 여부 */
  isVisible?: boolean;
}

/**
 * usePanelLayout 반환 타입
 */
export interface UsePanelLayoutReturn extends PanelLayoutActions {
  /** 현재 레이아웃 상태 */
  layout: PanelLayoutState;

  /** 로딩 상태 */
  isLoading: boolean;

  /** 레이아웃이 로컬스토리지에서 로드되었는지 */
  isLoaded: boolean;
}

/**
 * 레이아웃 저장 키
 */
export const PANEL_LAYOUT_STORAGE_KEY = 'xstudio-panel-layout';
