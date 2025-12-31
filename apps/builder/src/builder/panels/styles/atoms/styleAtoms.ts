/**
 * Style Atoms - Jotai 기반 스타일 상태 관리
 *
 * 🚀 Phase 3: Fine-grained Reactivity
 * - 속성 레벨 구독으로 불필요한 리렌더링 최소화
 * - Zustand → Jotai 브릿지로 점진적 마이그레이션
 *
 * @since 2025-12-20 Phase 3 - Advanced State Management
 */

import { atom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import type { SelectedElement } from '../../../inspector/types';

// ============================================
// Base Atoms
// ============================================

/**
 * 선택된 요소 atom
 * Zustand 브릿지를 통해 동기화됨
 */
export const selectedElementAtom = atom<SelectedElement | null>(null);

/**
 * 인라인 스타일 atom (파생)
 */
export const inlineStyleAtom = atom((get) => {
  const element = get(selectedElementAtom);
  return element?.style ?? null;
});

/**
 * Computed 스타일 atom (파생)
 */
export const computedStyleAtom = atom((get) => {
  const element = get(selectedElementAtom);
  return element?.computedStyle ?? null;
});

// ============================================
// Style Value Helper
// ============================================

// Properties that should only show inline styles (not computed)
const INLINE_ONLY_PROPERTIES = new Set([
  'width', 'height', 'top', 'left', 'right', 'bottom',
]);

/**
 * 스타일 값 추출 (inline > computed > default)
 */
export function getStyleValueFromAtoms(
  inlineStyle: React.CSSProperties | null,
  computedStyle: Partial<React.CSSProperties> | null | undefined,
  property: keyof React.CSSProperties,
  defaultValue: string
): string {
  // Priority 1: Inline style
  if (inlineStyle && inlineStyle[property] !== undefined) {
    return String(inlineStyle[property]);
  }

  // Priority 2: Computed style (skip for inline-only properties)
  if (
    !INLINE_ONLY_PROPERTIES.has(property as string) &&
    computedStyle &&
    computedStyle[property] !== undefined
  ) {
    return String(computedStyle[property]);
  }

  // Priority 3: Default value
  return defaultValue;
}

// ============================================
// Transform Section Atoms (4개 속성)
// ============================================

export const widthAtom = selectAtom(
  selectedElementAtom,
  (element) => element?.style?.width ?? 'auto',
  (a, b) => a === b
);

export const heightAtom = selectAtom(
  selectedElementAtom,
  (element) => element?.style?.height ?? 'auto',
  (a, b) => a === b
);

export const topAtom = selectAtom(
  selectedElementAtom,
  (element) => element?.style?.top ?? 'auto',
  (a, b) => a === b
);

export const leftAtom = selectAtom(
  selectedElementAtom,
  (element) => element?.style?.left ?? 'auto',
  (a, b) => a === b
);

/**
 * Transform 섹션 전체 값 (그룹 atom)
 * 🚀 selectAtom으로 equality 체크 추가 - 불필요한 리렌더링 방지
 */
export const transformValuesAtom = selectAtom(
  selectedElementAtom,
  (element) => {
    if (!element) return null;
    return {
      width: String(element.style?.width ?? 'auto'),
      height: String(element.style?.height ?? 'auto'),
      top: String(element.style?.top ?? 'auto'),
      left: String(element.style?.left ?? 'auto'),
    };
  },
  (a, b) => {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    return a.width === b.width && a.height === b.height && a.top === b.top && a.left === b.left;
  }
);

// ============================================
// Layout Section Atoms (15개 속성)
// ============================================

export const displayAtom = selectAtom(
  selectedElementAtom,
  (element) => {
    const inline = element?.style?.display;
    const computed = element?.computedStyle?.display;
    return String(inline ?? computed ?? 'block');
  },
  (a, b) => a === b
);

export const flexDirectionAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.flexDirection ?? element?.computedStyle?.flexDirection ?? 'row'),
  (a, b) => a === b
);

export const alignItemsAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.alignItems ?? element?.computedStyle?.alignItems ?? ''),
  (a, b) => a === b
);

export const justifyContentAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.justifyContent ?? element?.computedStyle?.justifyContent ?? ''),
  (a, b) => a === b
);

export const gapAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.gap ?? element?.computedStyle?.gap ?? '0px'),
  (a, b) => a === b
);

export const flexWrapAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.flexWrap ?? element?.computedStyle?.flexWrap ?? 'nowrap'),
  (a, b) => a === b
);

// Padding atoms
export const paddingAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.padding ?? element?.computedStyle?.padding ?? '0px'),
  (a, b) => a === b
);

export const paddingTopAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.paddingTop ?? element?.computedStyle?.paddingTop ?? '0px'),
  (a, b) => a === b
);

export const paddingRightAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.paddingRight ?? element?.computedStyle?.paddingRight ?? '0px'),
  (a, b) => a === b
);

export const paddingBottomAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.paddingBottom ?? element?.computedStyle?.paddingBottom ?? '0px'),
  (a, b) => a === b
);

export const paddingLeftAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.paddingLeft ?? element?.computedStyle?.paddingLeft ?? '0px'),
  (a, b) => a === b
);

// Margin atoms
export const marginAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.margin ?? element?.computedStyle?.margin ?? '0px'),
  (a, b) => a === b
);

export const marginTopAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.marginTop ?? element?.computedStyle?.marginTop ?? '0px'),
  (a, b) => a === b
);

export const marginRightAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.marginRight ?? element?.computedStyle?.marginRight ?? '0px'),
  (a, b) => a === b
);

export const marginBottomAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.marginBottom ?? element?.computedStyle?.marginBottom ?? '0px'),
  (a, b) => a === b
);

export const marginLeftAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.marginLeft ?? element?.computedStyle?.marginLeft ?? '0px'),
  (a, b) => a === b
);

/**
 * Layout 섹션 전체 값 (그룹 atom)
 * 🚀 selectAtom으로 equality 체크 추가 - 불필요한 리렌더링 방지
 */
export const layoutValuesAtom = selectAtom(
  selectedElementAtom,
  (element) => {
    if (!element) return null;

    const style = element.style ?? {};
    const computed = element.computedStyle ?? {};

    return {
      display: String(style.display ?? computed.display ?? 'block'),
      flexDirection: String(style.flexDirection ?? computed.flexDirection ?? 'row'),
      alignItems: String(style.alignItems ?? computed.alignItems ?? ''),
      justifyContent: String(style.justifyContent ?? computed.justifyContent ?? ''),
      gap: String(style.gap ?? computed.gap ?? '0px'),
      flexWrap: String(style.flexWrap ?? computed.flexWrap ?? 'nowrap'),
      padding: String(style.padding ?? computed.padding ?? '0px'),
      paddingTop: String(style.paddingTop ?? computed.paddingTop ?? '0px'),
      paddingRight: String(style.paddingRight ?? computed.paddingRight ?? '0px'),
      paddingBottom: String(style.paddingBottom ?? computed.paddingBottom ?? '0px'),
      paddingLeft: String(style.paddingLeft ?? computed.paddingLeft ?? '0px'),
      margin: String(style.margin ?? computed.margin ?? '0px'),
      marginTop: String(style.marginTop ?? computed.marginTop ?? '0px'),
      marginRight: String(style.marginRight ?? computed.marginRight ?? '0px'),
      marginBottom: String(style.marginBottom ?? computed.marginBottom ?? '0px'),
      marginLeft: String(style.marginLeft ?? computed.marginLeft ?? '0px'),
    };
  },
  (a, b) => {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    return (
      a.display === b.display &&
      a.flexDirection === b.flexDirection &&
      a.alignItems === b.alignItems &&
      a.justifyContent === b.justifyContent &&
      a.gap === b.gap &&
      a.flexWrap === b.flexWrap &&
      a.padding === b.padding &&
      a.paddingTop === b.paddingTop &&
      a.paddingRight === b.paddingRight &&
      a.paddingBottom === b.paddingBottom &&
      a.paddingLeft === b.paddingLeft &&
      a.margin === b.margin &&
      a.marginTop === b.marginTop &&
      a.marginRight === b.marginRight &&
      a.marginBottom === b.marginBottom &&
      a.marginLeft === b.marginLeft
    );
  }
);

// ============================================
// Appearance Section Atoms (5개 속성)
// ============================================

export const backgroundColorAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.backgroundColor ?? element?.computedStyle?.backgroundColor ?? '#FFFFFF'),
  (a, b) => a === b
);

export const borderColorAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.borderColor ?? element?.computedStyle?.borderColor ?? '#000000'),
  (a, b) => a === b
);

export const borderWidthAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.borderWidth ?? element?.computedStyle?.borderWidth ?? '0px'),
  (a, b) => a === b
);

export const borderRadiusAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.borderRadius ?? element?.computedStyle?.borderRadius ?? '0px'),
  (a, b) => a === b
);

export const borderStyleAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.borderStyle ?? element?.computedStyle?.borderStyle ?? 'solid'),
  (a, b) => a === b
);

/**
 * Appearance 섹션 전체 값 (그룹 atom)
 * 🚀 selectAtom으로 equality 체크 추가 - 불필요한 리렌더링 방지
 */
export const appearanceValuesAtom = selectAtom(
  selectedElementAtom,
  (element) => {
    if (!element) return null;

    const style = element.style ?? {};
    const computed = element.computedStyle ?? {};

    return {
      backgroundColor: String(style.backgroundColor ?? computed.backgroundColor ?? '#FFFFFF'),
      borderColor: String(style.borderColor ?? computed.borderColor ?? '#000000'),
      borderWidth: String(style.borderWidth ?? computed.borderWidth ?? '0px'),
      borderRadius: String(style.borderRadius ?? computed.borderRadius ?? '0px'),
      borderStyle: String(style.borderStyle ?? computed.borderStyle ?? 'solid'),
    };
  },
  (a, b) => {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    return (
      a.backgroundColor === b.backgroundColor &&
      a.borderColor === b.borderColor &&
      a.borderWidth === b.borderWidth &&
      a.borderRadius === b.borderRadius &&
      a.borderStyle === b.borderStyle
    );
  }
);

// ============================================
// Typography Section Atoms (11개 속성)
// ============================================

export const fontFamilyAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.fontFamily ?? element?.computedStyle?.fontFamily ?? 'Arial'),
  (a, b) => a === b
);

export const fontSizeAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.fontSize ?? element?.computedStyle?.fontSize ?? '16px'),
  (a, b) => a === b
);

export const fontWeightAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.fontWeight ?? element?.computedStyle?.fontWeight ?? 'normal'),
  (a, b) => a === b
);

export const fontStyleAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.fontStyle ?? element?.computedStyle?.fontStyle ?? 'normal'),
  (a, b) => a === b
);

export const lineHeightAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.lineHeight ?? element?.computedStyle?.lineHeight ?? 'normal'),
  (a, b) => a === b
);

export const letterSpacingAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.letterSpacing ?? element?.computedStyle?.letterSpacing ?? 'normal'),
  (a, b) => a === b
);

export const colorAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.color ?? element?.computedStyle?.color ?? '#000000'),
  (a, b) => a === b
);

export const textAlignAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.textAlign ?? element?.computedStyle?.textAlign ?? 'left'),
  (a, b) => a === b
);

export const textDecorationAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.textDecoration ?? element?.computedStyle?.textDecoration ?? 'none'),
  (a, b) => a === b
);

export const textTransformAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.textTransform ?? element?.computedStyle?.textTransform ?? 'none'),
  (a, b) => a === b
);

export const verticalAlignAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.verticalAlign ?? element?.computedStyle?.verticalAlign ?? 'baseline'),
  (a, b) => a === b
);

/**
 * Typography 섹션 전체 값 (그룹 atom)
 * 🚀 selectAtom으로 equality 체크 추가 - 불필요한 리렌더링 방지
 */
export const typographyValuesAtom = selectAtom(
  selectedElementAtom,
  (element) => {
    if (!element) return null;

    const style = element.style ?? {};
    const computed = element.computedStyle ?? {};

    return {
      fontFamily: String(style.fontFamily ?? computed.fontFamily ?? 'Arial'),
      fontSize: String(style.fontSize ?? computed.fontSize ?? '16px'),
      fontWeight: String(style.fontWeight ?? computed.fontWeight ?? 'normal'),
      fontStyle: String(style.fontStyle ?? computed.fontStyle ?? 'normal'),
      lineHeight: String(style.lineHeight ?? computed.lineHeight ?? 'normal'),
      letterSpacing: String(style.letterSpacing ?? computed.letterSpacing ?? 'normal'),
      color: String(style.color ?? computed.color ?? '#000000'),
      textAlign: String(style.textAlign ?? computed.textAlign ?? 'left'),
      textDecoration: String(style.textDecoration ?? computed.textDecoration ?? 'none'),
      textTransform: String(style.textTransform ?? computed.textTransform ?? 'none'),
      verticalAlign: String(style.verticalAlign ?? computed.verticalAlign ?? 'baseline'),
    };
  },
  (a, b) => {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    return (
      a.fontFamily === b.fontFamily &&
      a.fontSize === b.fontSize &&
      a.fontWeight === b.fontWeight &&
      a.fontStyle === b.fontStyle &&
      a.lineHeight === b.lineHeight &&
      a.letterSpacing === b.letterSpacing &&
      a.color === b.color &&
      a.textAlign === b.textAlign &&
      a.textDecoration === b.textDecoration &&
      a.textTransform === b.textTransform &&
      a.verticalAlign === b.verticalAlign
    );
  }
);

// ============================================
// Layout Alignment Keys Atoms (Toggle 그룹용)
// ============================================

/**
 * Flex Direction 토글 키
 * display가 flex가 아니면 'block', flex면 direction 반환
 */
export const flexDirectionKeysAtom = selectAtom(
  selectedElementAtom,
  (element): string[] => {
    if (!element) return ['block'];

    const style = element.style ?? {};
    const computed = element.computedStyle ?? {};
    const display = String(style.display ?? computed.display ?? 'block');
    const flexDirection = String(style.flexDirection ?? computed.flexDirection ?? 'row');

    if (display !== 'flex') return ['block'];
    if (flexDirection === 'column') return ['column'];
    return ['row'];
  },
  (a, b) => a.length === b.length && a.every((v, i) => v === b[i])
);

/**
 * Flex Alignment 9-grid 토글 키
 */
export const flexAlignmentKeysAtom = selectAtom(
  selectedElementAtom,
  (element): string[] => {
    if (!element) return [];

    const style = element.style ?? {};
    const computed = element.computedStyle ?? {};
    const display = String(style.display ?? computed.display ?? 'block');

    if (display !== 'flex') return [];

    const alignItems = String(style.alignItems ?? computed.alignItems ?? '');
    const justifyContent = String(style.justifyContent ?? computed.justifyContent ?? '');
    const flexDirection = String(style.flexDirection ?? computed.flexDirection ?? 'row');

    // Map alignItems/justifyContent to grid position
    const alignMap: Record<string, string> = {
      'flex-start': 'Top',
      'start': 'Top',
      'center': 'Center',
      'flex-end': 'Bottom',
      'end': 'Bottom',
    };
    const justifyMap: Record<string, string> = {
      'flex-start': 'left',
      'start': 'left',
      'center': 'center',
      'flex-end': 'right',
      'end': 'right',
    };

    const vertical = alignMap[alignItems] || '';
    const horizontal = justifyMap[justifyContent] || '';

    if (!vertical && !horizontal) return [];

    // For column direction, swap horizontal/vertical interpretation
    if (flexDirection === 'column') {
      return [`${horizontal}${vertical}`];
    }
    return [`${horizontal}${vertical}`];
  },
  (a, b) => a.length === b.length && a.every((v, i) => v === b[i])
);

/**
 * Justify Content Spacing 토글 키
 */
export const justifyContentSpacingKeysAtom = selectAtom(
  selectedElementAtom,
  (element): string[] => {
    if (!element) return [];

    const style = element.style ?? {};
    const computed = element.computedStyle ?? {};
    const justifyContent = String(style.justifyContent ?? computed.justifyContent ?? '');

    if (['space-around', 'space-between', 'space-evenly'].includes(justifyContent)) {
      return [justifyContent];
    }
    return [];
  },
  (a, b) => a.length === b.length && a.every((v, i) => v === b[i])
);

/**
 * Flex Wrap 토글 키
 */
export const flexWrapKeysAtom = selectAtom(
  selectedElementAtom,
  (element): string[] => {
    if (!element) return ['nowrap'];

    const style = element.style ?? {};
    const computed = element.computedStyle ?? {};
    const flexWrap = String(style.flexWrap ?? computed.flexWrap ?? 'nowrap');

    return [flexWrap];
  },
  (a, b) => a.length === b.length && a.every((v, i) => v === b[i])
);

// ============================================
// StylesPanel용 Atoms (헤더/빈 상태용)
// ============================================

/**
 * 요소가 선택되었는지 여부 (빈 상태 체크용)
 */
export const hasSelectedElementAtom = selectAtom(
  selectedElementAtom,
  (element) => element !== null,
  (a, b) => a === b
);

/**
 * 선택된 요소의 스타일 객체 (복사용)
 */
export const selectedStyleAtom = selectAtom(
  selectedElementAtom,
  (element) => element?.style ?? null,
  (a, b) => {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    // 객체 키/값 비교 (shallow)
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(key => a[key as keyof typeof a] === b[key as keyof typeof b]);
  }
);

/**
 * 수정된 속성 개수 (modify 탭 표시용)
 */
export const modifiedCountAtom = selectAtom(
  selectedElementAtom,
  (element) => {
    if (!element?.style) return 0;
    return Object.keys(element.style).filter(
      (key) => element.style![key as keyof React.CSSProperties] !== undefined
    ).length;
  },
  (a, b) => a === b
);

/**
 * Copy 버튼 비활성화 여부
 */
export const isCopyDisabledAtom = selectAtom(
  selectedElementAtom,
  (element) => {
    if (!element?.style) return true;
    return Object.keys(element.style).length === 0;
  },
  (a, b) => a === b
);
