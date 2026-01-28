/**
 * Layout Engine 공유 유틸리티
 *
 * 입력 규약 (P0):
 * - width, height: px, %, vh, vw, number, auto 지원
 * - margin, padding, border-width: px, number만 지원 (% 미지원)
 * - rem, em, calc() 등은 지원하지 않음
 *
 * @since 2026-01-28 Phase 2 - 하이브리드 레이아웃 엔진
 * @updated 2026-01-28 Phase 6 - P2 기능 (vertical-align, line-height)
 */

import type { Margin, BoxModel, VerticalAlign } from './types';
import type { Element } from '../../../../../types/core/store.types';

/**
 * 중복 경고 방지용 Set
 *
 * 주의: 모듈 전역이므로 장시간 세션에서 메모리 누적 가능.
 * 100개 초과 시 clear하여 메모리 제한.
 */
const warnedTokens = new Set<string>();

/**
 * 동일 메시지는 1회만 경고
 *
 * 트레이드오프: 100개 초과 시 전체 clear하므로 동일 경고가 주기적으로 재출력될 수 있음.
 */
function warnOnce(message: string): void {
  if (warnedTokens.size > 100) {
    warnedTokens.clear();
  }
  if (!warnedTokens.has(message)) {
    warnedTokens.add(message);
    console.warn(message);
  }
}

/** 테스트용 초기화 */
export function resetWarnedTokens(): void {
  warnedTokens.clear();
}

/** 허용되는 단위 패턴 */
const PX_NUMBER_PATTERN = /^-?\d+(\.\d+)?(px)?$/;
const PERCENT_PATTERN = /^-?\d+(\.\d+)?%$/;
const VIEWPORT_PATTERN = /^-?\d+(\.\d+)?(vh|vw)$/;

/**
 * 숫자 값 파싱 (px, number만 허용)
 *
 * @returns 파싱된 숫자 또는 undefined (미지원 단위)
 */
function parseNumericValue(value: unknown): number | undefined {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // px 또는 숫자만 허용
    if (!PX_NUMBER_PATTERN.test(value.trim())) {
      return undefined; // rem, em, %, calc 등 미지원
    }
    return parseFloat(value);
  }
  return undefined;
}

/**
 * 크기 값 파싱 (width/height용: px, %, vh, vw, number, auto 허용)
 *
 * @param value - 파싱할 값
 * @param available - % 계산 시 기준값 (부모 content-box)
 * @param viewportWidth - vw 계산 시 기준값
 * @param viewportHeight - vh 계산 시 기준값
 * @returns 파싱된 숫자 또는 undefined (auto 또는 미지원 단위)
 */
export function parseSize(
  value: unknown,
  available: number,
  viewportWidth?: number,
  viewportHeight?: number
): number | undefined {
  if (value === undefined || value === 'auto') return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();

    // % 허용 (부모 content-box 기준)
    if (PERCENT_PATTERN.test(trimmed)) {
      return (parseFloat(trimmed) / 100) * available;
    }

    // vh/vw 허용 (viewport 기준)
    if (VIEWPORT_PATTERN.test(trimmed)) {
      const num = parseFloat(trimmed);
      if (trimmed.endsWith('vh') && viewportHeight !== undefined) {
        return (num / 100) * viewportHeight;
      }
      if (trimmed.endsWith('vw') && viewportWidth !== undefined) {
        return (num / 100) * viewportWidth;
      }
      // viewport 크기 미제공 시 undefined
      return undefined;
    }

    // px 또는 숫자만 허용
    if (PX_NUMBER_PATTERN.test(trimmed)) {
      return parseFloat(trimmed);
    }

    // rem, em, calc 등 미지원
    return undefined;
  }
  return undefined;
}

/**
 * shorthand 개별 값 파싱 (px, number만 허용)
 *
 * @returns 파싱된 숫자 또는 undefined
 */
function parseShorthandValue(value: string): number | undefined {
  const trimmed = value.trim();
  if (!PX_NUMBER_PATTERN.test(trimmed)) {
    return undefined; // 미지원 단위
  }
  return parseFloat(trimmed);
}

/**
 * shorthand 속성 파싱 (margin, padding, borderWidth)
 * "10px" → 모두 10
 * "10px 20px" → 상하 10, 좌우 20
 * "10px 20px 30px" → 상 10, 좌우 20, 하 30
 * "10px 20px 30px 40px" → 상 10, 우 20, 하 30, 좌 40
 *
 * 미지원 단위가 포함되면 해당 값은 0으로 처리
 */
function parseShorthand(value: unknown): Margin {
  const zero = { top: 0, right: 0, bottom: 0, left: 0 };
  if (typeof value === 'number') {
    return { top: value, right: value, bottom: value, left: value };
  }
  if (typeof value !== 'string') return zero;

  const tokens = value.split(/\s+/);
  const parts = tokens.map((token) => {
    const parsed = parseShorthandValue(token);
    if (parsed === undefined) {
      // 개발 모드에서만 경고 (디버깅 용이성, 중복 방지)
      if (import.meta.env.DEV) {
        warnOnce(`[parseShorthand] Unsupported token "${token}", fallback to 0`);
      }
      return 0;
    }
    return parsed;
  });

  switch (parts.length) {
    case 1:
      return { top: parts[0], right: parts[0], bottom: parts[0], left: parts[0] };
    case 2:
      return { top: parts[0], right: parts[1], bottom: parts[0], left: parts[1] };
    case 3:
      return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[1] };
    case 4:
      return { top: parts[0], right: parts[1], bottom: parts[2], left: parts[3] };
    default:
      return zero;
  }
}

/**
 * 스타일에서 마진 파싱
 *
 * 개별 속성(marginTop 등)이 shorthand(margin)보다 우선합니다.
 * shorthand는 개별 속성이 없는 방향에만 적용됩니다.
 */
export function parseMargin(style: Record<string, unknown> | undefined): Margin {
  if (!style) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  // shorthand를 기본값으로 파싱
  const base =
    style.margin !== undefined
      ? parseShorthand(style.margin)
      : { top: 0, right: 0, bottom: 0, left: 0 };

  // 개별 속성으로 override
  return {
    top: parseNumericValue(style.marginTop) ?? base.top,
    right: parseNumericValue(style.marginRight) ?? base.right,
    bottom: parseNumericValue(style.marginBottom) ?? base.bottom,
    left: parseNumericValue(style.marginLeft) ?? base.left,
  };
}

/**
 * 스타일에서 패딩 파싱
 */
export function parsePadding(style: Record<string, unknown> | undefined): Margin {
  if (!style) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const base =
    style.padding !== undefined
      ? parseShorthand(style.padding)
      : { top: 0, right: 0, bottom: 0, left: 0 };

  return {
    top: parseNumericValue(style.paddingTop) ?? base.top,
    right: parseNumericValue(style.paddingRight) ?? base.right,
    bottom: parseNumericValue(style.paddingBottom) ?? base.bottom,
    left: parseNumericValue(style.paddingLeft) ?? base.left,
  };
}

/**
 * 스타일에서 보더 너비 파싱
 *
 * 주의: CSS shorthand `border: "1px solid red"`는 지원하지 않습니다.
 * 빌더는 개별 속성(borderTopWidth 등)으로 저장하는 것을 전제로 합니다.
 * borderWidth shorthand("1px" 또는 "1px 2px")는 지원합니다.
 */
export function parseBorder(style: Record<string, unknown> | undefined): Margin {
  if (!style) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  // borderWidth shorthand (숫자만, "1px solid red" 형태 미지원)
  const base =
    style.borderWidth !== undefined
      ? parseShorthand(style.borderWidth)
      : { top: 0, right: 0, bottom: 0, left: 0 };

  return {
    top: parseNumericValue(style.borderTopWidth) ?? base.top,
    right: parseNumericValue(style.borderRightWidth) ?? base.right,
    bottom: parseNumericValue(style.borderBottomWidth) ?? base.bottom,
    left: parseNumericValue(style.borderLeftWidth) ?? base.left,
  };
}

/**
 * 요소의 콘텐츠 너비 계산
 *
 * 실제 구현에서는 자식 요소들의 레이아웃을 재귀적으로 계산해야 합니다.
 * 텍스트 요소의 경우 폰트 메트릭 기반 측정이 필요합니다.
 *
 * @returns 콘텐츠 기반 너비 (자식이 없으면 0)
 */
export function calculateContentWidth(element: Element): number {
  // TODO: 실제 구현 시 다음을 고려:
  // 1. 자식 요소들의 너비 합계 (inline-block) 또는 최대값 (block)
  // 2. 텍스트 콘텐츠의 경우 Canvas.measureText() 사용
  // 3. 이미지의 경우 naturalWidth 사용

  // 임시: props에 명시된 width가 있으면 사용
  const style = element.props?.style as Record<string, unknown> | undefined;
  const explicitWidth = parseNumericValue(style?.width);
  if (explicitWidth !== undefined) return explicitWidth;

  // 기본값: 0 (콘텐츠 없음으로 간주)
  return 0;
}

/**
 * 요소의 콘텐츠 높이 계산
 *
 * @returns 콘텐츠 기반 높이 (자식이 없으면 0)
 */
export function calculateContentHeight(element: Element): number {
  // TODO: 실제 구현 시 다음을 고려:
  // 1. 자식 요소들의 높이 합계 (block) 또는 최대값 (inline-block 한 줄)
  // 2. 텍스트 콘텐츠의 경우 lineHeight * 줄 수
  // 3. 이미지의 경우 naturalHeight 사용

  const style = element.props?.style as Record<string, unknown> | undefined;
  const explicitHeight = parseNumericValue(style?.height);
  if (explicitHeight !== undefined) return explicitHeight;

  return 0;
}

/**
 * 요소의 박스 모델 계산
 *
 * @param element - 대상 요소
 * @param availableWidth - 사용 가능한 너비 (% 계산용)
 * @param availableHeight - 사용 가능한 높이 (% 계산용)
 * @param viewportWidth - vw 계산용
 * @param viewportHeight - vh 계산용
 */
export function parseBoxModel(
  element: Element,
  availableWidth: number,
  availableHeight: number,
  viewportWidth?: number,
  viewportHeight?: number
): BoxModel {
  const style = element.props?.style as Record<string, unknown> | undefined;

  // width/height 파싱 (%, px, vh, vw, auto 지원)
  const width = parseSize(style?.width, availableWidth, viewportWidth, viewportHeight);
  const height = parseSize(style?.height, availableHeight, viewportWidth, viewportHeight);

  // padding 파싱
  const padding = parsePadding(style);

  // border 파싱
  const border = parseBorder(style);

  // 콘텐츠 크기 계산
  const contentWidth = calculateContentWidth(element);
  const contentHeight = calculateContentHeight(element);

  return {
    width,
    height,
    contentWidth,
    contentHeight,
    padding,
    border,
  };
}

/**
 * vertical-align 값 파싱
 *
 * 지원 값: baseline (기본), top, bottom, middle
 * text-top, text-bottom, super, sub 등은 폰트 메트릭이 필요하여 baseline으로 폴백
 */
export function parseVerticalAlign(
  style: Record<string, unknown> | undefined
): VerticalAlign {
  if (!style) return 'baseline';

  const value = style.verticalAlign as string | undefined;
  if (!value) return 'baseline';

  switch (value) {
    case 'top':
      return 'top';
    case 'bottom':
      return 'bottom';
    case 'middle':
      return 'middle';
    case 'baseline':
    case 'text-top':
    case 'text-bottom':
    case 'super':
    case 'sub':
    default:
      // text-top/text-bottom/super/sub은 폰트 메트릭이 필요하여 baseline으로 폴백
      return 'baseline';
  }
}

/**
 * line-height 값 파싱
 *
 * @returns line-height 픽셀 값 또는 undefined (normal)
 *
 * 지원 값:
 * - number (예: 1.5) → fontSize * number
 * - px (예: 24px) → 24
 * - normal → undefined (브라우저 기본값, 보통 1.2 정도)
 */
export function parseLineHeight(
  style: Record<string, unknown> | undefined,
  fontSize?: number
): number | undefined {
  if (!style) return undefined;

  const value = style.lineHeight;
  if (value === undefined || value === 'normal') return undefined;

  // 숫자 (배율)
  if (typeof value === 'number') {
    const baseFontSize = fontSize ?? 16; // 기본 폰트 크기
    return value * baseFontSize;
  }

  // 문자열
  if (typeof value === 'string') {
    const trimmed = value.trim();

    // px 값
    if (PX_NUMBER_PATTERN.test(trimmed)) {
      return parseFloat(trimmed);
    }

    // 숫자만 (배율)
    const num = parseFloat(trimmed);
    if (!isNaN(num)) {
      const baseFontSize = fontSize ?? 16;
      return num * baseFontSize;
    }
  }

  return undefined;
}

/**
 * inline-block 요소의 baseline 위치 계산
 *
 * CSS 명세 (Chrome 구현):
 * - 일반적인 경우: 마지막 줄 텍스트의 baseline
 * - overflow: hidden/auto/scroll → margin-box 하단
 * - 콘텐츠 없음 → margin-box 하단
 *
 * @param element - 대상 요소
 * @param height - 요소 높이 (margin 제외)
 * @returns baseline 위치 (요소 상단 기준 오프셋)
 *
 * @example
 * // 높이 100px, baseline이 하단에서 20px 위
 * calculateBaseline(element, 100) // → 80 (상단에서 80px 아래)
 */
export function calculateBaseline(
  element: Element,
  height: number
): number {
  const style = element.props?.style as Record<string, unknown> | undefined;

  // overflow가 visible이 아니면 하단이 baseline
  const overflow = style?.overflow as string | undefined;
  const overflowX = style?.overflowX as string | undefined;
  const overflowY = style?.overflowY as string | undefined;

  if (
    (overflow && overflow !== 'visible') ||
    (overflowX && overflowX !== 'visible') ||
    (overflowY && overflowY !== 'visible')
  ) {
    return height; // 하단
  }

  // 콘텐츠가 없으면 하단이 baseline
  // TODO: 실제 구현에서는 자식 요소/텍스트 유무 확인 필요
  // 현재는 높이가 0이면 콘텐츠 없음으로 간주
  if (height === 0) {
    return 0;
  }

  // 일반적인 경우: 텍스트 baseline 계산
  // TODO: 실제 구현에서는 폰트 메트릭 기반 baseline 계산 필요
  // 현재는 간단히 하단에서 약간 위 (폰트 descender 가정)
  const lineHeight = parseLineHeight(style);
  if (lineHeight !== undefined && lineHeight <= height) {
    // line-height 기반 baseline 추정
    // 일반적으로 baseline은 line-height의 약 80% 지점
    return height - lineHeight * 0.2;
  }

  // 기본값: 하단에서 약간 위 (폰트 baseline 추정)
  // 일반적인 폰트의 descender는 약 20% 정도
  return height * 0.8;
}
