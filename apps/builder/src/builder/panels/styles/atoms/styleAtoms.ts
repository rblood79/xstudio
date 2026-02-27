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
import {
  computeSyntheticStyle,
} from '../../../../services/computedStyleService';
import type { SyntheticComputedStyle } from '../../../../services/computedStyleService';
import { DEFAULT_FONT_FAMILY } from '../../../fonts/customFonts';

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

/**
 * 합성 computedStyle atom (파생)
 * WebGL/Skia 환경에서 DOM 없이 size/variant prop으로 계산된 CSS 값
 * inline > computedStyle > syntheticStyle > default 우선순위에서 3순위
 */
export const syntheticComputedStyleAtom = atom((get) => {
  const element = get(selectedElementAtom);
  return computeSyntheticStyle(element);
});

// ============================================
// Style Value Helper
// ============================================

// Properties that should only show inline styles (not computed)
const INLINE_ONLY_PROPERTIES = new Set([
  'width', 'height', 'top', 'left', 'right', 'bottom',
]);

/**
 * 스타일 값 추출 (inline > computed > synthetic > default)
 *
 * @param inlineStyle - 사용자가 직접 설정한 인라인 스타일
 * @param computedStyle - 브라우저/Preview iframe에서 계산된 스타일
 * @param syntheticStyle - size/variant prop 기반 합성 계산 스타일 (WebGL/Skia 전용)
 * @param property - 조회할 CSS 속성 키
 * @param defaultValue - 모든 소스에 값이 없을 때의 기본값
 */
export function getStyleValueFromAtoms(
  inlineStyle: React.CSSProperties | null,
  computedStyle: Partial<React.CSSProperties> | null | undefined,
  syntheticStyle: SyntheticComputedStyle | null | undefined,
  property: keyof React.CSSProperties,
  defaultValue: string
): string {
  // Priority 1: Inline style (사용자 직접 설정)
  if (inlineStyle && inlineStyle[property] !== undefined) {
    return String(inlineStyle[property]);
  }

  // Priority 2: Computed style from preview iframe (skip for inline-only properties)
  if (
    !INLINE_ONLY_PROPERTIES.has(property as string) &&
    computedStyle &&
    computedStyle[property] !== undefined
  ) {
    return String(computedStyle[property]);
  }

  // Priority 3: Synthetic computed style (size/variant preset 기반)
  if (syntheticStyle) {
    const syntheticValue = syntheticStyle[property as keyof SyntheticComputedStyle];
    if (syntheticValue !== undefined) {
      return syntheticValue;
    }
  }

  // Priority 4: Default value
  return defaultValue;
}

// ============================================
// Transform Section Atoms (4개 속성)
// ============================================

/**
 * 🚀 컴포넌트별 기본 CSS 값
 * CSS 클래스에서 정의된 기본값 (inline style이 없을 때 표시)
 *
 * 참고: 대부분의 컴포넌트는 fit-content 또는 auto를 사용
 * 명시적 크기가 있는 컴포넌트만 여기에 정의
 */
const DEFAULT_CSS_VALUES: Record<string, { width?: string; height?: string; display?: string; flexDirection?: string; alignItems?: string; gap?: number | string; flexWrap?: string }> = {
  // === 컨테이너 (width: 100%) ===
  Card: { width: '100%' },
  Box: { width: '100%' },
  Panel: { width: '100%' },
  Table: { width: '100%' },
  Tree: { width: '100%' },
  Tabs: { width: '100%' },
  Disclosure: { width: '100%' },
  DropZone: { width: '100%', height: '120px' },
  Separator: { width: '100%' },

  // === 입력 필드 (fit-content) ===
  Button: { width: 'fit-content' },
  TextField: { width: 'fit-content' },
  TextArea: { width: 'fit-content' },
  Select: { width: 'fit-content' },
  ComboBox: { width: 'fit-content' },
  NumberField: { width: '120px' },
  SearchField: { width: 'fit-content' },

  // === 체크박스/라디오/스위치 (fit-content) ===
  Checkbox: { width: 'fit-content' },
  CheckboxGroup: { width: 'fit-content' },
  Radio: { width: 'fit-content' },
  RadioGroup: { width: 'fit-content' },
  Switch: { width: 'fit-content' },

  // === 슬라이더/프로그레스 (고정 width) ===
  Slider: { width: '300px' },
  ProgressBar: { width: '250px' },
  Meter: { width: '250px' },

  // === 토글 버튼 ===
  ToggleButton: { width: 'fit-content' },
  ToggleButtonGroup: { width: 'fit-content', display: 'flex', flexDirection: 'row', alignItems: 'center' },

  // === 리스트/그리드 ===
  ListBox: { width: 'fit-content' },
  GridList: { width: 'fit-content' },
  Menu: { width: 'fit-content' },
  TagGroup: { width: 'fit-content', display: 'flex', flexDirection: 'column', gap: 2 },
  TagList: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: 4 },

  // === 네비게이션 ===
  Link: { width: 'fit-content' },
  Breadcrumbs: { width: 'fit-content' },
  Toolbar: { width: 'fit-content' },

  // === 오버레이 ===
  Tooltip: { width: 'fit-content' },
  Popover: { width: 'fit-content' },
  Dialog: { width: 'fit-content' },

  // === 날짜/시간 ===
  Calendar: { width: 'fit-content' },
  DatePicker: { width: 'fit-content' },
  DateRangePicker: { width: 'fit-content' },
  DateField: { width: 'fit-content' },
  TimeField: { width: 'fit-content' },

  // === 색상 ===
  ColorPicker: { width: 'fit-content' },
  ColorSwatch: { width: 'fit-content' },
  ColorSlider: { width: 'fit-content' },
  ColorArea: { width: 'fit-content' },
  ColorWheel: { width: 'fit-content' },
  ColorField: { width: 'fit-content' },
  ColorSwatchPicker: { width: 'fit-content' },

  // === 기타 ===
  Badge: { width: 'fit-content' },
  Form: { width: '100%' },
  FileTrigger: { width: 'fit-content' },
  Skeleton: { width: '100%' },
  Toast: { width: 'fit-content' },
  Pagination: { width: 'fit-content' },
  Group: { width: 'fit-content' },
  Slot: { width: '100%' },

  // === 레이아웃 ===
  Div: { width: 'auto' },
  Section: { width: '100%' },
  Nav: { width: '100%' },
};

/**
 * 🚀 Transform 값 결정 로직:
 * 1. inline style이 있으면 inline 표시 (사용자가 직접 설정한 값)
 * 2. 없으면 컴포넌트 기본 CSS 값 표시
 * 3. 둘 다 없으면 'auto'
 *
 * @param elementType 컴포넌트 타입 (예: 'Card', 'Button')
 * @param inlineValue inline style 값
 * @param prop 'width' | 'height'
 */
function getTransformValue(
  elementType: string | undefined,
  inlineValue: unknown,
  prop: 'width' | 'height'
): string {
  // 1. inline style 우선 (사용자가 직접 설정한 값)
  if (inlineValue !== undefined && inlineValue !== null && inlineValue !== '') {
    return String(inlineValue);
  }

  // 2. 컴포넌트 기본 CSS 값
  if (elementType) {
    const defaultCss = DEFAULT_CSS_VALUES[elementType];
    if (defaultCss?.[prop]) {
      return defaultCss[prop]!;
    }
  }

  // 3. 기본값
  return 'auto';
}

export const widthAtom = selectAtom(
  selectedElementAtom,
  (element) => getTransformValue(element?.type, element?.style?.width, 'width'),
  (a, b) => a === b
);

export const heightAtom = selectAtom(
  selectedElementAtom,
  (element) => getTransformValue(element?.type, element?.style?.height, 'height'),
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
 * 🚀 컴포넌트 기본 CSS 값 표시 (inline style이 없을 때)
 */
export const transformValuesAtom = selectAtom(
  selectedElementAtom,
  (element) => {
    if (!element) return null;
    const result = {
      width: getTransformValue(element.type, element.style?.width, 'width'),
      height: getTransformValue(element.type, element.style?.height, 'height'),
      top: String(element.style?.top ?? 'auto'),
      left: String(element.style?.left ?? 'auto'),
    };
    return result;
  },
  (a, b) => {
    if (a === null && b === null) return true;
    if (a === null || b === null) return false;
    return a.width === b.width && a.height === b.height && a.top === b.top && a.left === b.left;
  }
);

// ============================================
// Layout Default Helper
// ============================================

/**
 * 레이아웃 속성의 태그별 기본값 조회
 * inline style → computed style → 태그별 CSS 기본값 → 글로벌 기본값
 */
function getLayoutDefault(
  element: SelectedElement | null,
  prop: 'display' | 'flexDirection' | 'alignItems',
  globalDefault: string,
): string {
  const inline = element?.style?.[prop];
  if (inline !== undefined && inline !== null && inline !== '') return String(inline);

  const computed = element?.computedStyle?.[prop];
  if (computed !== undefined && computed !== null && computed !== '') return String(computed);

  const tag = element?.type;
  if (tag) {
    const tagDefault = DEFAULT_CSS_VALUES[tag]?.[prop];
    if (tagDefault) return tagDefault;
  }

  return globalDefault;
}

// ============================================
// Layout Section Atoms (15개 속성)
// ============================================

export const displayAtom = selectAtom(
  selectedElementAtom,
  (element) => getLayoutDefault(element, 'display', 'block'),
  (a, b) => a === b
);

export const flexDirectionAtom = selectAtom(
  selectedElementAtom,
  (element) => getLayoutDefault(element, 'flexDirection', 'row'),
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
  (element) => {
    const inline = element?.style?.paddingTop;
    if (inline !== undefined && inline !== null && inline !== '') return String(inline);
    const computed = element?.computedStyle?.paddingTop;
    if (computed !== undefined && computed !== null && computed !== '') return String(computed);
    const synthetic = computeSyntheticStyle(element);
    if (synthetic.paddingTop) return synthetic.paddingTop;
    return '0px';
  },
  (a, b) => a === b
);

export const paddingRightAtom = selectAtom(
  selectedElementAtom,
  (element) => {
    const inline = element?.style?.paddingRight;
    if (inline !== undefined && inline !== null && inline !== '') return String(inline);
    const computed = element?.computedStyle?.paddingRight;
    if (computed !== undefined && computed !== null && computed !== '') return String(computed);
    const synthetic = computeSyntheticStyle(element);
    if (synthetic.paddingRight) return synthetic.paddingRight;
    return '0px';
  },
  (a, b) => a === b
);

export const paddingBottomAtom = selectAtom(
  selectedElementAtom,
  (element) => {
    const inline = element?.style?.paddingBottom;
    if (inline !== undefined && inline !== null && inline !== '') return String(inline);
    const computed = element?.computedStyle?.paddingBottom;
    if (computed !== undefined && computed !== null && computed !== '') return String(computed);
    const synthetic = computeSyntheticStyle(element);
    if (synthetic.paddingBottom) return synthetic.paddingBottom;
    return '0px';
  },
  (a, b) => a === b
);

export const paddingLeftAtom = selectAtom(
  selectedElementAtom,
  (element) => {
    const inline = element?.style?.paddingLeft;
    if (inline !== undefined && inline !== null && inline !== '') return String(inline);
    const computed = element?.computedStyle?.paddingLeft;
    if (computed !== undefined && computed !== null && computed !== '') return String(computed);
    const synthetic = computeSyntheticStyle(element);
    if (synthetic.paddingLeft) return synthetic.paddingLeft;
    return '0px';
  },
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
    const synthetic = computeSyntheticStyle(element);

    return {
      display: getLayoutDefault(element, 'display', 'block'),
      flexDirection: getLayoutDefault(element, 'flexDirection', 'row'),
      alignItems: getLayoutDefault(element, 'alignItems', ''),
      justifyContent: String(style.justifyContent ?? computed.justifyContent ?? ''),
      gap: String(style.gap ?? computed.gap ?? '0px'),
      flexWrap: String(style.flexWrap ?? computed.flexWrap ?? 'nowrap'),
      padding: String(style.padding ?? computed.padding ?? '0px'),
      paddingTop: String(style.paddingTop ?? computed.paddingTop ?? synthetic.paddingTop ?? '0px'),
      paddingRight: String(style.paddingRight ?? computed.paddingRight ?? synthetic.paddingRight ?? '0px'),
      paddingBottom: String(style.paddingBottom ?? computed.paddingBottom ?? synthetic.paddingBottom ?? '0px'),
      paddingLeft: String(style.paddingLeft ?? computed.paddingLeft ?? synthetic.paddingLeft ?? '0px'),
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
  (element) => {
    const inline = element?.style?.borderRadius;
    if (inline !== undefined && inline !== null && inline !== '') return String(inline);
    const computed = element?.computedStyle?.borderRadius;
    if (computed !== undefined && computed !== null && computed !== '') return String(computed);
    const synthetic = computeSyntheticStyle(element);
    if (synthetic.borderRadius) return synthetic.borderRadius;
    return '0px';
  },
  (a, b) => a === b
);

export const borderStyleAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.borderStyle ?? element?.computedStyle?.borderStyle ?? 'solid'),
  (a, b) => a === b
);

export const boxShadowAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.boxShadow ?? element?.computedStyle?.boxShadow ?? 'none'),
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
    const synthetic = computeSyntheticStyle(element);

    return {
      backgroundColor: String(style.backgroundColor ?? computed.backgroundColor ?? '#FFFFFF'),
      borderColor: String(style.borderColor ?? computed.borderColor ?? '#000000'),
      borderWidth: String(style.borderWidth ?? computed.borderWidth ?? '0px'),
      borderRadius: String(style.borderRadius ?? computed.borderRadius ?? synthetic.borderRadius ?? '0px'),
      borderStyle: String(style.borderStyle ?? computed.borderStyle ?? 'solid'),
      boxShadow: String(style.boxShadow ?? computed.boxShadow ?? 'none'),
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
      a.borderStyle === b.borderStyle &&
      a.boxShadow === b.boxShadow
    );
  }
);

// ============================================
// Typography Section Atoms (11개 속성)
// ============================================

export const fontFamilyAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.fontFamily ?? element?.computedStyle?.fontFamily ?? DEFAULT_FONT_FAMILY),
  (a, b) => a === b
);

export const fontSizeAtom = selectAtom(
  selectedElementAtom,
  (element) => {
    const inline = element?.style?.fontSize;
    if (inline !== undefined && inline !== null && inline !== '') return String(inline);
    const computed = element?.computedStyle?.fontSize;
    if (computed !== undefined && computed !== null && computed !== '') return String(computed);
    const synthetic = computeSyntheticStyle(element);
    if (synthetic.fontSize) return synthetic.fontSize;
    return '16px';
  },
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
    const synthetic = computeSyntheticStyle(element);

    return {
      fontFamily: String(style.fontFamily ?? computed.fontFamily ?? DEFAULT_FONT_FAMILY),
      fontSize: String(style.fontSize ?? computed.fontSize ?? synthetic.fontSize ?? '16px'),
      fontWeight: String(style.fontWeight ?? computed.fontWeight ?? 'normal'),
      fontStyle: String(style.fontStyle ?? computed.fontStyle ?? 'normal'),
      lineHeight: String(style.lineHeight ?? computed.lineHeight ?? synthetic.lineHeight ?? 'normal'),
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

    const display = getLayoutDefault(element, 'display', 'block');
    const flexDirection = getLayoutDefault(element, 'flexDirection', 'row');

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

    const display = getLayoutDefault(element, 'display', 'block');

    if (display !== 'flex') return [];

    const alignItems = getLayoutDefault(element, 'alignItems', '');
    const justifyContent = String((element?.style ?? {}).justifyContent ?? (element?.computedStyle ?? {}).justifyContent ?? '');
    const flexDirection = getLayoutDefault(element, 'flexDirection', 'row');

    // Map CSS values to grid position labels
    // verticalMap: CSS value → Top/Center/Bottom (세로 위치)
    // horizontalMap: CSS value → left/center/right (가로 위치)
    const verticalMap: Record<string, string> = {
      'flex-start': 'Top',
      'start': 'Top',
      'center': 'Center',
      'flex-end': 'Bottom',
      'end': 'Bottom',
    };
    const horizontalMap: Record<string, string> = {
      'flex-start': 'left',
      'start': 'left',
      'center': 'center',
      'flex-end': 'right',
      'end': 'right',
    };

    let vertical: string;
    let horizontal: string;

    if (flexDirection === 'column') {
      // column: justifyContent = main axis (세로), alignItems = cross axis (가로)
      vertical = verticalMap[justifyContent] || '';
      horizontal = horizontalMap[alignItems] || '';
    } else {
      // row: justifyContent = main axis (가로), alignItems = cross axis (세로)
      vertical = verticalMap[alignItems] || '';
      horizontal = horizontalMap[justifyContent] || '';
    }

    if (!vertical && !horizontal) return [];
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
