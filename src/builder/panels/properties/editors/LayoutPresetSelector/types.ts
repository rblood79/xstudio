/**
 * LayoutPresetSelector Types
 *
 * Phase 6: Layout 프리셋 시스템을 위한 타입 정의
 */

import type { CSSProperties } from "react";

/**
 * Slot 정의
 */
export interface SlotDefinition {
  /** Slot 이름 (고유 식별자) */
  name: string;
  /** 필수 여부 */
  required: boolean;
  /** 설명 */
  description?: string;
  /** 기본 스타일 */
  defaultStyle?: CSSProperties;
}

/**
 * SVG 미리보기 영역
 */
export interface PreviewArea {
  /** 영역 이름 */
  name: string;
  /** X 위치 (%) */
  x: number;
  /** Y 위치 (%) */
  y: number;
  /** 너비 (%) */
  width: number;
  /** 높이 (%) */
  height: number;
  /** Slot 여부 */
  isSlot: boolean;
  /** 필수 여부 */
  required?: boolean;
}

/**
 * 레이아웃 프리셋
 */
export interface LayoutPreset {
  /** 프리셋 ID */
  id: string;
  /** 프리셋 이름 */
  name: string;
  /** 설명 */
  description: string;
  /** 카테고리 */
  category: "basic" | "sidebar" | "complex" | "dashboard";
  /** Slot 정의 목록 */
  slots: SlotDefinition[];
  /** 컨테이너 스타일 (CSS Grid/Flexbox) */
  containerStyle?: CSSProperties;
  /** SVG 미리보기 영역 */
  previewAreas: PreviewArea[];
}

/**
 * 프리셋 적용 모드
 */
export type PresetApplyMode = "replace" | "merge" | "cancel";

/**
 * 기존 Slot 정보
 */
export interface ExistingSlotInfo {
  /** Slot 이름 */
  slotName: string;
  /** Element ID */
  elementId: string;
  /** 자식 요소 존재 여부 */
  hasChildren: boolean;
}

/**
 * 프리셋 카테고리 메타데이터
 */
export interface PresetCategoryMeta {
  label: string;
  icon: string;
}
