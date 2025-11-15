/**
 * styleTypes - StylesPanel 관련 TypeScript 타입 정의
 */

import type { SelectedElement } from '../../../inspector/types';

/**
 * Section 컴포넌트 공통 Props
 */
export interface SectionProps {
  selectedElement: SelectedElement;
}

/**
 * 스타일 출처 타입
 */
export type StyleSource =
  | { type: 'inline'; location: 'user-set' }
  | { type: 'computed'; location: string } // CSS class name
  | { type: 'inherited'; location: string } // Parent element tag
  | { type: 'default'; location: 'component-default' };

/**
 * 스타일 값 정보 (출처 포함)
 */
export interface StyleValueInfo {
  value: string;
  source: StyleSource;
  isModified: boolean;
}

/**
 * Cascade 정보 (상속 체인)
 */
export interface CascadeInfo {
  winner: string; // 최종 적용 값
  overridden: string[]; // 오버라이드된 값들
}

/**
 * 스타일 수정 상태
 */
export interface ModifiedStylesState {
  hasModifiedStyles: boolean;
  modifiedProperties: string[];
  modifiedCount: number;
}
