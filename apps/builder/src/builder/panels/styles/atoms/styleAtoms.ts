/**
 * Style Atoms - Jotai 기반 스타일 상태 관리
 *
 * 🚀 Phase 3: Fine-grained Reactivity
 * - 속성 레벨 구독으로 불필요한 리렌더링 최소화
 * - Zustand → Jotai 브릿지로 점진적 마이그레이션
 *
 * @since 2025-12-20 Phase 3 - Advanced State Management
 */

import { atom } from "jotai";
import { selectAtom } from "jotai/utils";
import type { SelectedElement } from "../../../inspector/types";
import { computeSyntheticStyle } from "../../../../services/computedStyleService";
import type { SyntheticComputedStyle } from "../../../../services/computedStyleService";
import {
  DEFAULT_FONT_FAMILY,
  extractFirstFontFamily,
  normalizeFontWeight,
} from "../../../fonts/customFonts";

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
  "width",
  "height",
  "top",
  "left",
  "right",
  "bottom",
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
  defaultValue: string,
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
    const syntheticValue =
      syntheticStyle[property as keyof SyntheticComputedStyle];
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
const DEFAULT_CSS_VALUES: Record<
  string,
  {
    width?: string;
    height?: string;
    display?: string;
    flexDirection?: string;
    alignItems?: string;
    gap?: number | string;
    flexWrap?: string;
  }
> = {
  // === 컨테이너 (width: 100%) ===
  Card: { width: "100%" },
  Box: { width: "100%" },
  Panel: { width: "100%" },
  Table: { width: "100%" },
  Tree: { width: "100%" },
  Tabs: { width: "100%" },
  Disclosure: { width: "100%" },
  DropZone: { width: "100%", height: "120px" },
  Separator: { width: "100%" },

  // === 입력 필드 (fit-content) ===
  Button: { width: "fit-content" },
  TextField: { width: "fit-content" },
  TextArea: { width: "fit-content" },
  Select: { width: "fit-content" },
  ComboBox: { width: "fit-content" },
  NumberField: { width: "120px" },
  SearchField: { width: "fit-content" },

  // === 체크박스/라디오/스위치 (fit-content) ===
  Checkbox: { width: "fit-content" },
  CheckboxGroup: { width: "fit-content" },
  Radio: { width: "fit-content" },
  RadioGroup: { width: "fit-content" },
  Switch: { width: "fit-content" },

  // === 슬라이더/프로그레스 (고정 width) ===
  Slider: { width: "300px" },
  ProgressBar: { width: "250px" },
  Meter: { width: "250px" },

  // === 토글 버튼 ===
  ToggleButton: { width: "fit-content" },
  ToggleButtonGroup: {
    width: "fit-content",
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
  },

  // === 리스트/그리드 ===
  ListBox: { width: "fit-content" },
  GridList: { width: "fit-content" },
  Menu: { width: "fit-content" },
  TagGroup: {
    width: "fit-content",
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  TagList: { display: "flex", flexDirection: "row", flexWrap: "wrap", gap: 4 },

  // === 네비게이션 ===
  Link: { width: "fit-content" },
  Breadcrumbs: { width: "fit-content" },
  Toolbar: { width: "fit-content" },

  // === 오버레이 ===
  Tooltip: { width: "fit-content" },
  Popover: { width: "fit-content" },
  Dialog: { width: "fit-content" },

  // === 날짜/시간 ===
  Calendar: { width: "fit-content" },
  DatePicker: { width: "fit-content" },
  DateRangePicker: { width: "fit-content" },
  DateField: { width: "fit-content" },
  TimeField: { width: "fit-content" },

  // === 색상 ===
  ColorPicker: { width: "fit-content" },
  ColorSwatch: { width: "fit-content" },
  ColorSlider: { width: "fit-content" },
  ColorArea: { width: "fit-content" },
  ColorWheel: { width: "fit-content" },
  ColorField: { width: "fit-content" },
  ColorSwatchPicker: { width: "fit-content" },

  // === 기타 ===
  Badge: { width: "fit-content" },
  Form: { width: "100%" },
  FileTrigger: { width: "fit-content" },
  Skeleton: { width: "100%" },
  Toast: { width: "fit-content" },
  Pagination: { width: "fit-content" },
  Group: { width: "fit-content" },
  Slot: { width: "100%" },

  // === 레이아웃 ===
  Div: { width: "auto" },
  Section: { width: "100%" },
  Nav: { width: "100%" },
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
  prop: "width" | "height",
): string {
  // 1. inline style 우선 (사용자가 직접 설정한 값)
  if (inlineValue !== undefined && inlineValue !== null && inlineValue !== "") {
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
  return "auto";
}

export const widthAtom = selectAtom(
  selectedElementAtom,
  (element) => getTransformValue(element?.type, element?.style?.width, "width"),
  (a, b) => a === b,
);

export const heightAtom = selectAtom(
  selectedElementAtom,
  (element) =>
    getTransformValue(element?.type, element?.style?.height, "height"),
  (a, b) => a === b,
);

export const topAtom = selectAtom(
  selectedElementAtom,
  (element) => element?.style?.top ?? "auto",
  (a, b) => a === b,
);

export const leftAtom = selectAtom(
  selectedElementAtom,
  (element) => element?.style?.left ?? "auto",
  (a, b) => a === b,
);

// ============================================
// ADR-026 Phase 2: Min/Max + Aspect Ratio Atoms
// ============================================

export const minWidthAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.minWidth ?? ""),
  (a, b) => a === b,
);

export const maxWidthAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.maxWidth ?? ""),
  (a, b) => a === b,
);

export const minHeightAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.minHeight ?? ""),
  (a, b) => a === b,
);

export const maxHeightAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.maxHeight ?? ""),
  (a, b) => a === b,
);

export const aspectRatioAtom = selectAtom(
  selectedElementAtom,
  (element) => String(element?.style?.aspectRatio ?? ""),
  (a, b) => a === b,
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
  prop: "display" | "flexDirection" | "alignItems",
  globalDefault: string,
): string {
  const inline = element?.style?.[prop];
  if (inline !== undefined && inline !== null && inline !== "")
    return String(inline);

  const computed = element?.computedStyle?.[prop];
  if (computed !== undefined && computed !== null && computed !== "")
    return String(computed);

  const tag = element?.type;
  if (tag) {
    const tagDefault = DEFAULT_CSS_VALUES[tag]?.[prop];
    if (tagDefault) return tagDefault;
  }

  return globalDefault;
}

// ============================================
// Layout Section Atoms — REMOVED (ADR-067 Phase 2)
// Migrated to useLayoutValues + useLayoutAuxiliary (Zustand direct + Spec preset)
// ============================================

// ============================================
// Appearance Section Atoms — REMOVED (ADR-067 Phase 4)
// Migrated to useAppearanceValues hook (Zustand direct + Spec preset)
// ============================================


// ============================================
// Typography Section Atoms — REMOVED (ADR-067 Phase 3)
// Migrated to useTypographyValues hook (Zustand direct)
// ============================================


// ============================================
// Layout Alignment Keys Atoms — REMOVED (ADR-067 Phase 2)
// Migrated to useLayoutAuxiliary hooks (Zustand direct)
// ============================================

// ============================================
// StylesPanel용 Atoms (헤더/빈 상태용)
// ============================================

/**
 * 요소가 선택되었는지 여부 (빈 상태 체크용)
 */
export const hasSelectedElementAtom = selectAtom(
  selectedElementAtom,
  (element) => element !== null,
  (a, b) => a === b,
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
    return keysA.every(
      (key) => a[key as keyof typeof a] === b[key as keyof typeof b],
    );
  },
);

/**
 * 수정된 속성 개수 (modify 탭 표시용)
 */
export const modifiedCountAtom = selectAtom(
  selectedElementAtom,
  (element) => {
    if (!element?.style) return 0;
    return Object.keys(element.style).filter(
      (key) => element.style![key as keyof React.CSSProperties] !== undefined,
    ).length;
  },
  (a, b) => a === b,
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
  (a, b) => a === b,
);
