/**
 * CSS Shorthand Expander
 *
 * CSS shorthand 속성을 개별 속성으로 확장하는 유틸리티
 *
 * 지원 속성:
 * - padding / margin: 1-4 값 확장
 * - borderRadius: 1-4 값 확장
 * - border: width style color 분리
 *
 * @example
 * expandPadding('8px 16px') // { top: '8px', right: '16px', bottom: '8px', left: '16px' }
 * expandBorderRadius('4px 8px') // { topLeft: '4px', topRight: '8px', ... }
 *
 * @since 2025-12-20 Phase 2 - Structural Optimization
 */

// ============================================
// Types
// ============================================

export interface FourWayValues {
  top: string;
  right: string;
  bottom: string;
  left: string;
}

export interface BorderRadiusValues {
  topLeft: string;
  topRight: string;
  bottomRight: string;
  bottomLeft: string;
}

export interface BorderValues {
  width: string;
  style: string;
  color: string;
}

// ============================================
// Padding / Margin Expansion
// ============================================

/**
 * CSS padding/margin shorthand 확장
 *
 * @param value - CSS shorthand 값 (예: "8px", "8px 16px", "8px 16px 12px", "8px 16px 12px 4px")
 * @param defaultValue - 기본값 (기본: '0px')
 * @returns 4방향 값 객체
 *
 * @example
 * expandSpacing('8px')           // 모든 방향 8px
 * expandSpacing('8px 16px')      // 상하 8px, 좌우 16px
 * expandSpacing('8px 16px 12px') // 상 8px, 좌우 16px, 하 12px
 * expandSpacing('8px 16px 12px 4px') // 상 8px, 우 16px, 하 12px, 좌 4px
 */
export function expandSpacing(
  value: string | null | undefined,
  defaultValue: string = '0px'
): FourWayValues {
  if (!value || typeof value !== 'string') {
    return {
      top: defaultValue,
      right: defaultValue,
      bottom: defaultValue,
      left: defaultValue,
    };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return {
      top: defaultValue,
      right: defaultValue,
      bottom: defaultValue,
      left: defaultValue,
    };
  }

  const parts = trimmed.split(/\s+/);

  switch (parts.length) {
    case 1:
      return {
        top: parts[0],
        right: parts[0],
        bottom: parts[0],
        left: parts[0],
      };
    case 2:
      return {
        top: parts[0],
        right: parts[1],
        bottom: parts[0],
        left: parts[1],
      };
    case 3:
      return {
        top: parts[0],
        right: parts[1],
        bottom: parts[2],
        left: parts[1],
      };
    case 4:
      return {
        top: parts[0],
        right: parts[1],
        bottom: parts[2],
        left: parts[3],
      };
    default:
      return {
        top: defaultValue,
        right: defaultValue,
        bottom: defaultValue,
        left: defaultValue,
      };
  }
}

/**
 * Padding shorthand 확장 (expandSpacing 별칭)
 */
export function expandPadding(
  value: string | null | undefined,
  defaultValue: string = '0px'
): FourWayValues {
  return expandSpacing(value, defaultValue);
}

/**
 * Margin shorthand 확장 (expandSpacing 별칭)
 */
export function expandMargin(
  value: string | null | undefined,
  defaultValue: string = '0px'
): FourWayValues {
  return expandSpacing(value, defaultValue);
}

// ============================================
// Border Radius Expansion
// ============================================

/**
 * CSS border-radius shorthand 확장
 *
 * @param value - CSS border-radius 값
 * @param defaultValue - 기본값 (기본: '0px')
 * @returns 4모서리 값 객체
 *
 * @example
 * expandBorderRadius('4px')           // 모든 모서리 4px
 * expandBorderRadius('4px 8px')       // 좌상/우하 4px, 우상/좌하 8px
 * expandBorderRadius('4px 8px 12px')  // 좌상 4px, 우상/좌하 8px, 우하 12px
 * expandBorderRadius('4px 8px 12px 16px') // 좌상 4px, 우상 8px, 우하 12px, 좌하 16px
 */
export function expandBorderRadius(
  value: string | null | undefined,
  defaultValue: string = '0px'
): BorderRadiusValues {
  if (!value || typeof value !== 'string') {
    return {
      topLeft: defaultValue,
      topRight: defaultValue,
      bottomRight: defaultValue,
      bottomLeft: defaultValue,
    };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return {
      topLeft: defaultValue,
      topRight: defaultValue,
      bottomRight: defaultValue,
      bottomLeft: defaultValue,
    };
  }

  // "/" 기호가 있으면 수평/수직 분리 (복잡한 경우, 첫 번째 값만 사용)
  const mainValue = trimmed.split('/')[0].trim();
  const parts = mainValue.split(/\s+/);

  switch (parts.length) {
    case 1:
      return {
        topLeft: parts[0],
        topRight: parts[0],
        bottomRight: parts[0],
        bottomLeft: parts[0],
      };
    case 2:
      return {
        topLeft: parts[0],
        topRight: parts[1],
        bottomRight: parts[0],
        bottomLeft: parts[1],
      };
    case 3:
      return {
        topLeft: parts[0],
        topRight: parts[1],
        bottomRight: parts[2],
        bottomLeft: parts[1],
      };
    case 4:
      return {
        topLeft: parts[0],
        topRight: parts[1],
        bottomRight: parts[2],
        bottomLeft: parts[3],
      };
    default:
      return {
        topLeft: defaultValue,
        topRight: defaultValue,
        bottomRight: defaultValue,
        bottomLeft: defaultValue,
      };
  }
}

// ============================================
// Border Expansion
// ============================================

/**
 * CSS border shorthand 확장
 *
 * @param value - CSS border 값 (예: "1px solid black")
 * @returns border 구성 요소
 *
 * @example
 * expandBorder('1px solid black') // { width: '1px', style: 'solid', color: 'black' }
 * expandBorder('2px dashed')      // { width: '2px', style: 'dashed', color: '' }
 */
export function expandBorder(
  value: string | null | undefined
): BorderValues {
  if (!value || typeof value !== 'string') {
    return { width: '', style: '', color: '' };
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return { width: '', style: '', color: '' };
  }

  // border-style 키워드
  const BORDER_STYLES = [
    'none', 'hidden', 'dotted', 'dashed', 'solid',
    'double', 'groove', 'ridge', 'inset', 'outset',
  ];

  const parts = trimmed.split(/\s+/);

  let width = '';
  let style = '';
  let color = '';

  for (const part of parts) {
    const lowerPart = part.toLowerCase();

    if (BORDER_STYLES.includes(lowerPart)) {
      style = lowerPart;
    } else if (/^-?\d+(\.\d+)?(px|em|rem|%|pt)?$/.test(part)) {
      width = part;
    } else {
      // 나머지는 색상으로 간주
      color = part;
    }
  }

  return { width, style, color };
}

// ============================================
// Collapse Functions (개별 값 → Shorthand)
// ============================================

/**
 * 4방향 값을 shorthand로 축소
 *
 * @param values - 4방향 값 객체
 * @returns CSS shorthand 문자열
 *
 * @example
 * collapseSpacing({ top: '8px', right: '8px', bottom: '8px', left: '8px' }) // '8px'
 * collapseSpacing({ top: '8px', right: '16px', bottom: '8px', left: '16px' }) // '8px 16px'
 */
export function collapseSpacing(values: FourWayValues): string {
  const { top, right, bottom, left } = values;

  // 모든 값이 같으면 1개
  if (top === right && right === bottom && bottom === left) {
    return top;
  }

  // 상하 같고, 좌우 같으면 2개
  if (top === bottom && right === left) {
    return `${top} ${right}`;
  }

  // 좌우만 같으면 3개
  if (right === left) {
    return `${top} ${right} ${bottom}`;
  }

  // 모두 다르면 4개
  return `${top} ${right} ${bottom} ${left}`;
}

/**
 * Border radius 값을 shorthand로 축소
 */
export function collapseBorderRadius(values: BorderRadiusValues): string {
  const { topLeft, topRight, bottomRight, bottomLeft } = values;

  // 모든 값이 같으면 1개
  if (topLeft === topRight && topRight === bottomRight && bottomRight === bottomLeft) {
    return topLeft;
  }

  // 대각선 값이 같으면 2개
  if (topLeft === bottomRight && topRight === bottomLeft) {
    return `${topLeft} ${topRight}`;
  }

  // 좌우 대칭이면 3개
  if (topRight === bottomLeft) {
    return `${topLeft} ${topRight} ${bottomRight}`;
  }

  // 모두 다르면 4개
  return `${topLeft} ${topRight} ${bottomRight} ${bottomLeft}`;
}

/**
 * Border 구성 요소를 shorthand로 결합
 */
export function collapseBorder(values: BorderValues): string {
  const parts: string[] = [];

  if (values.width) parts.push(values.width);
  if (values.style) parts.push(values.style);
  if (values.color) parts.push(values.color);

  return parts.join(' ');
}
