/**
 * Layout Engine 공통 타입 정의
 *
 * @since 2026-01-28 Phase 2 - 하이브리드 레이아웃 엔진
 * @updated 2026-01-28 Phase 6 - P2 기능 (vertical-align, LineBox)
 */

/**
 * 마진/패딩 값 (상하좌우)
 */
export interface Margin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * CSS vertical-align 값
 *
 * P2 지원 범위: baseline, top, bottom, middle
 * text-top, text-bottom, super, sub 등은 폰트 메트릭이 필요하여 미지원
 */
export type VerticalAlign = 'baseline' | 'top' | 'bottom' | 'middle';

/**
 * LineBox 내 요소 정보
 *
 * 같은 줄에 위치하는 inline-block 요소들의 레이아웃 정보
 */
export interface LineBoxItem {
  /** 요소 ID */
  elementId: string;
  /** 요소 인덱스 (children 배열 내) */
  index: number;
  /** line box 내 x 오프셋 */
  x: number;
  /** 요소 너비 */
  width: number;
  /** 요소 높이 (margin 제외) */
  height: number;
  /** margin */
  margin: Margin;
  /** vertical-align 값 */
  verticalAlign: VerticalAlign;
  /**
   * baseline 위치 (요소 하단 기준 오프셋)
   *
   * CSS 명세:
   * - 일반: 내부 텍스트의 baseline (텍스트 없으면 하단)
   * - overflow: hidden/auto/scroll → 하단 (margin-box 기준)
   * - 콘텐츠 없음 → 하단
   */
  baseline: number;
}

/**
 * LineBox (인라인 포맷팅 컨텍스트의 줄)
 *
 * 한 줄에 배치되는 inline/inline-block 요소들의 컨테이너
 */
export interface LineBox {
  /** line box 시작 y 좌표 */
  y: number;
  /** line box 높이 */
  height: number;
  /** line box의 baseline 위치 (y 기준 오프셋) */
  baseline: number;
  /** 이 줄에 포함된 요소들 */
  items: LineBoxItem[];
}

/**
 * 박스 모델 계산 결과
 */
export interface BoxModel {
  /** 명시적 width (undefined면 auto) */
  width?: number;
  /** 명시적 height (undefined면 auto) */
  height?: number;
  /** min-width 제한 */
  minWidth?: number;
  /** max-width 제한 */
  maxWidth?: number;
  /** min-height 제한 */
  minHeight?: number;
  /** max-height 제한 */
  maxHeight?: number;
  /** 콘텐츠 기반 너비 (자식/텍스트 등) */
  contentWidth: number;
  /** 콘텐츠 기반 높이 */
  contentHeight: number;
  /** padding */
  padding: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
  /** border width */
  border: {
    top: number;
    right: number;
    bottom: number;
    left: number;
  };
}
