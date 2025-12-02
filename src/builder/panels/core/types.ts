/**
 * Panel System Types
 *
 * 모든 패널이 따라야 하는 인터페이스와 타입 정의
 * 12개 패널을 동등하게 취급하는 범용 시스템
 */

import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * 패널 카테고리
 * - navigation: Pages, Components, Library 등 탐색 관련
 * - editor: Properties, Styles, Data, Events 등 편집 관련
 * - tool: Theme, AI 등 도구
 * - system: User, Settings 등 시스템
 */
export type PanelCategory = 'navigation' | 'editor' | 'tool' | 'system';

/**
 * 패널 위치
 */
export type PanelSide = 'left' | 'right';

/**
 * 패널 ID (12개 패널)
 */
export type PanelId =
  // Navigation panels
  | 'nodes'
  | 'components'
  | 'library'
  | 'dataset'
  | 'datasetEditor'  // Dataset 에디터 패널 (DatasetPanel과 함께 사용)
  // Tool panels
  | 'theme'
  | 'ai'
  // System panels
  | 'user'
  | 'settings'
  // Editor panels
  | 'properties'
  | 'styles'
  | 'data'
  | 'events';

/**
 * 패널 설정
 *
 * 모든 패널은 이 인터페이스를 구현해야 함
 */
export interface PanelConfig {
  /** 고유 ID */
  id: PanelId;

  /** 표시 이름 (한글) */
  name: string;

  /** 표시 이름 (영문, 옵션) */
  nameEn?: string;

  /** 아이콘 컴포넌트 (lucide-react) */
  icon: LucideIcon;

  /** 패널 컴포넌트 */
  component: ComponentType<PanelProps>;

  /** 카테고리 */
  category: PanelCategory;

  /** 기본 위치 */
  defaultPosition: PanelSide;

  /** 최소 너비 (px, 옵션) */
  minWidth?: number;

  /** 최대 너비 (px, 옵션) */
  maxWidth?: number;

  /** 설명 (옵션) */
  description?: string;

  /** 키보드 단축키 (옵션) */
  shortcut?: string;
}

/**
 * 패널 컴포넌트 Props
 *
 * 모든 패널 컴포넌트가 받는 공통 props
 */
export interface PanelProps {
  /** 현재 패널이 활성 상태인지 */
  isActive?: boolean;

  /** 패널이 위치한 사이드 */
  side?: PanelSide;

  /** 패널 닫기 콜백 (옵션) */
  onClose?: () => void;
}

/**
 * 패널 레이아웃 상태
 *
 * Zustand store에 저장되는 패널 배치 정보
 */
export interface PanelLayoutState {
  /** 좌측 사이드바에 배치된 패널 ID 배열 */
  leftPanels: PanelId[];

  /** 우측 인스펙터에 배치된 패널 ID 배열 */
  rightPanels: PanelId[];

  /** 좌측에서 현재 활성화된 패널 ID 배열 (Multi toggle 지원) */
  activeLeftPanels: PanelId[];

  /** 우측에서 현재 활성화된 패널 ID 배열 (Multi toggle 지원) */
  activeRightPanels: PanelId[];

  /** 좌측 사이드바 표시 여부 */
  showLeft: boolean;

  /** 우측 인스펙터 표시 여부 */
  showRight: boolean;
}

/**
 * 기본 패널 레이아웃
 *
 * 최초 로드 시 또는 리셋 시 사용되는 기본 배치
 */
export const DEFAULT_PANEL_LAYOUT: PanelLayoutState = {
  leftPanels: [
    'nodes',
    'components',
    'dataset',
    'theme',
    'ai',
    'settings',
  ],
  rightPanels: [
    'properties',
    'styles',
    'data',
    'events',
  ],
  activeLeftPanels: ['nodes'], // Multi toggle 지원: 배열
  activeRightPanels: ['properties'], // Multi toggle 지원: 배열
  showLeft: true,
  showRight: true,
};

/**
 * 패널 레이아웃 액션
 */
export interface PanelLayoutActions {
  /** 패널을 다른 사이드로 이동 */
  movePanel: (panelId: PanelId, from: PanelSide, to: PanelSide) => void;

  /** 패널 토글 (활성화/비활성화) - Multi toggle 지원 */
  togglePanel: (side: PanelSide, panelId: PanelId) => void;

  /** 사이드바/인스펙터 표시/숨김 토글 */
  toggleSide: (side: PanelSide) => void;

  /** 레이아웃 초기화 */
  resetLayout: () => void;

  /** 레이아웃 전체 설정 */
  setLayout: (layout: PanelLayoutState) => void;
}

/**
 * 패널 검색 필터
 */
export interface PanelFilter {
  category?: PanelCategory;
  search?: string;
}
