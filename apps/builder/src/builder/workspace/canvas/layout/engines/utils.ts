/**
 * Layout Engine 공유 유틸리티
 *
 * 입력 규약 (P0):
 * - width, height: px, %, vh, vw, em, rem, calc(), number, auto 지원
 * - margin, padding: px, number, % 지원 (% = 포함 블록 width 기준)
 * - border-width: px, number, border shorthand("1px solid red") 지원
 * - intrinsic sizing: fit-content, min-content, max-content 지원 (모든 요소)
 *
 * @since 2026-01-28 Phase 2 - 하이브리드 레이아웃 엔진
 * @updated 2026-01-28 Phase 6 - P2 기능 (vertical-align, line-height)
 */

import type { Margin, BoxModel, VerticalAlign } from "./types";
import type { Element } from "../../../../../types/core/store.types";
import {
  fontFamily as specFontFamily,
  InputSpec,
  resolveToken,
} from "@xstudio/specs";
import { extractSpecTextStyle } from "../../utils/specTextStyle";
import {
  measureWrappedTextHeight,
  measureFontMetrics,
  getTextMeasurer,
  isCanvasKitMeasurer,
} from "../../utils/textMeasure";
import type { FontMetrics } from "../../utils/textMeasure";
import {
  resolveCSSSizeValue,
  FIT_CONTENT as CSS_FIT_CONTENT,
  MIN_CONTENT as CSS_MIN_CONTENT,
  MAX_CONTENT as CSS_MAX_CONTENT,
  parseBorderShorthand,
} from "./cssValueParser";
import type { CSSValueContext, CSSVariableScope } from "./cssValueParser";
import { resolveStyle, ROOT_COMPUTED_STYLE } from "./cssResolver";
import type { ComputedStyle } from "./cssResolver";
import type { LayoutContext } from "./LayoutEngine";
import { applyTextTransform } from "../../sprites/styleConverter";

// ─── Phantom Indicator 설정 (단일 소스) ─────────────────────────────────
// Switch/Checkbox/Radio: Preview DOM에는 [indicator + label] 구조이지만
// WebGL element tree에는 label 자식만 존재.
// 값의 원천: packages/specs/src/components/{Switch,Checkbox,Radio}.spec.ts

interface PhantomIndicatorConfig {
  widths: { sm: number; md: number; lg: number };
  heights: { sm: number; md: number; lg: number };
  gaps: { sm: number; md: number; lg: number };
  rowHeights: { sm: number; md: number; lg: number };
}

export const PHANTOM_INDICATOR_CONFIGS: Record<string, PhantomIndicatorConfig> =
  {
    switch: {
      widths: { sm: 36, md: 44, lg: 52 },
      heights: { sm: 20, md: 24, lg: 28 },
      gaps: { sm: 8, md: 10, lg: 12 },
      rowHeights: { sm: 20, md: 24, lg: 28 },
    },
    checkbox: {
      widths: { sm: 16, md: 20, lg: 24 },
      heights: { sm: 16, md: 20, lg: 24 },
      gaps: { sm: 6, md: 8, lg: 10 },
      rowHeights: { sm: 20, md: 24, lg: 28 }, // spec.sizes.height (전체 행 높이)
    },
    radio: {
      widths: { sm: 16, md: 20, lg: 24 },
      heights: { sm: 16, md: 20, lg: 24 },
      gaps: { sm: 6, md: 8, lg: 10 },
      rowHeights: { sm: 20, md: 24, lg: 28 }, // spec.sizes.height (전체 행 높이)
    },
  };

/** Phantom indicator의 width + gap (Row용). 해당 태그가 아니면 null */
export function getPhantomIndicatorSpace(
  tag: string,
  size?: string,
): { width: number; height: number; gap: number } | null {
  const config = PHANTOM_INDICATOR_CONFIGS[tag];
  if (!config) return null;
  const s = (size ?? "M") as "sm" | "md" | "lg";
  const w = config.widths[s] ?? config.widths.md;
  const h = config.heights[s] ?? config.heights.md;
  const gap = config.gaps[s] ?? config.gaps.md;
  return { width: w + gap, height: h, gap };
}

/** Phantom indicator의 width + gap (number, 폴백 0) */
export function getPhantomIndicatorWidth(tag: string, size?: string): number {
  const space = getPhantomIndicatorSpace(tag, size);
  return space?.width ?? 0;
}

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

/**
 * CSS intrinsic sizing sentinel 값
 *
 * Yoga/WASM가 fit-content를 네이티브 지원하지 않으므로,
 * parseSize()에서 sentinel 값으로 변환하여 BlockEngine/WASM에 전달한다.
 * AUTO(-1)와 동일한 패턴으로 Float32Array 직렬화 시 그대로 전달 가능.
 *
 * 통합 파서(cssValueParser.ts)에서 정의된 값을 re-export한다.
 */
export const FIT_CONTENT = CSS_FIT_CONTENT;
export const MIN_CONTENT = CSS_MIN_CONTENT;
export const MAX_CONTENT = CSS_MAX_CONTENT;

/** 허용되는 단위 패턴 */
const PX_NUMBER_PATTERN = /^-?\d+(\.\d+)?(px)?$/;

/**
 * 숫자 값 파싱 (px, number만 허용)
 *
 * @returns 파싱된 숫자 또는 undefined (미지원 단위)
 */
function parseNumericValue(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    // px 또는 숫자만 허용
    if (!PX_NUMBER_PATTERN.test(value.trim())) {
      return undefined; // rem, em, %, calc 등 미지원
    }
    return parseFloat(value);
  }
  return undefined;
}

/**
 * 크기 값 파싱 (width/height용: px, %, vh, vw, em, rem, calc, number, auto 허용)
 *
 * 내부적으로 resolveCSSSizeValue()에 위임하여 일관된 단위 해석을 제공한다.
 *
 * W3-7: variableScope 파라미터 추가로 var() 참조 해석 지원.
 * 디자인 토큰(color/spacing/typography)이 var()로 참조될 때 정상 해석된다.
 *
 * @param value - 파싱할 값
 * @param available - % 계산 시 기준값 (부모 content-box)
 * @param viewportWidth - vw 계산 시 기준값
 * @param viewportHeight - vh 계산 시 기준값
 * @param variableScope - CSS 변수 스코프 (var() 해석용, W3-7)
 * @returns 파싱된 숫자 또는 undefined (auto 또는 미지원 단위)
 */
export function parseSize(
  value: unknown,
  available: number,
  viewportWidth?: number,
  viewportHeight?: number,
  variableScope?: CSSVariableScope,
): number | undefined {
  if (value === undefined || value === "auto") return undefined;

  // C2: % 값인데 available이 음수(sentinel -1)이면 auto로 처리
  // CSS 스펙: auto height 부모의 블록 컨텍스트에서 자식의 percentage height는 auto
  if (typeof value === "string" && value.endsWith("%") && available < 0) {
    return undefined;
  }

  const ctx: CSSValueContext = {
    containerSize: available,
    viewportWidth,
    viewportHeight,
    variableScope,
  };

  return resolveCSSSizeValue(value, ctx);
}

/**
 * C3: % 값을 containerWidth 기준으로 해석
 *
 * 개별 margin/padding 속성의 % 값 해석용
 * CSS 스펙: margin/padding의 % 값은 포함 블록의 inline-size(width) 기준
 */
function resolvePercentValue(
  value: unknown,
  containerWidth?: number,
): number | undefined {
  if (typeof value !== "string" || !value.endsWith("%")) return undefined;
  if (containerWidth === undefined || containerWidth <= 0) return undefined;
  const pct = parseFloat(value);
  if (isNaN(pct)) return undefined;
  return (pct / 100) * containerWidth;
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
 * C3: % 단위 지원 - containerWidth가 제공되면 % 값을 해석
 * CSS 스펙: padding/margin의 % 값은 포함 블록의 width 기준 (4면 모두)
 *
 * 미지원 단위가 포함되면 해당 값은 0으로 처리
 */
function parseShorthand(value: unknown, containerWidth?: number): Margin {
  const zero = { top: 0, right: 0, bottom: 0, left: 0 };
  if (typeof value === "number") {
    return { top: value, right: value, bottom: value, left: value };
  }
  if (typeof value !== "string") return zero;

  const tokens = value.split(/\s+/);
  const parts = tokens.map((token) => {
    // px/number 먼저 시도
    const parsed = parseShorthandValue(token);
    if (parsed !== undefined) return parsed;
    // C3: % 해석 시도 (containerWidth 기준)
    if (
      token.endsWith("%") &&
      containerWidth !== undefined &&
      containerWidth > 0
    ) {
      const pct = parseFloat(token);
      if (!isNaN(pct)) return (pct / 100) * containerWidth;
    }
    // 개발 모드에서만 경고 (디버깅 용이성, 중복 방지)
    if (import.meta.env.DEV) {
      warnOnce(`[parseShorthand] Unsupported token "${token}", fallback to 0`);
    }
    return 0;
  });

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
      return zero;
  }
}

/**
 * 스타일에서 마진 파싱
 *
 * 개별 속성(marginTop 등)이 shorthand(margin)보다 우선합니다.
 * shorthand는 개별 속성이 없는 방향에만 적용됩니다.
 *
 * C3: containerWidth가 제공되면 % 값을 해석
 * CSS 스펙: margin의 % 값은 포함 블록의 width 기준 (4면 모두)
 */
export function parseMargin(
  style: Record<string, unknown> | undefined,
  containerWidth?: number,
): Margin {
  if (!style) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  // shorthand를 기본값으로 파싱
  const base =
    style.margin !== undefined
      ? parseShorthand(style.margin, containerWidth)
      : { top: 0, right: 0, bottom: 0, left: 0 };

  // 개별 속성으로 override (% 해석 포함)
  return {
    top:
      parseNumericValue(style.marginTop) ??
      resolvePercentValue(style.marginTop, containerWidth) ??
      base.top,
    right:
      parseNumericValue(style.marginRight) ??
      resolvePercentValue(style.marginRight, containerWidth) ??
      base.right,
    bottom:
      parseNumericValue(style.marginBottom) ??
      resolvePercentValue(style.marginBottom, containerWidth) ??
      base.bottom,
    left:
      parseNumericValue(style.marginLeft) ??
      resolvePercentValue(style.marginLeft, containerWidth) ??
      base.left,
  };
}

/**
 * 스타일에서 패딩 파싱
 *
 * C3: containerWidth가 제공되면 % 값을 해석
 * CSS 스펙: padding의 % 값은 포함 블록의 width 기준 (4면 모두)
 */
export function parsePadding(
  style: Record<string, unknown> | undefined,
  containerWidth?: number,
): Margin {
  if (!style) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const base =
    style.padding !== undefined
      ? parseShorthand(style.padding, containerWidth)
      : { top: 0, right: 0, bottom: 0, left: 0 };

  return {
    top:
      parseNumericValue(style.paddingTop) ??
      resolvePercentValue(style.paddingTop, containerWidth) ??
      base.top,
    right:
      parseNumericValue(style.paddingRight) ??
      resolvePercentValue(style.paddingRight, containerWidth) ??
      base.right,
    bottom:
      parseNumericValue(style.paddingBottom) ??
      resolvePercentValue(style.paddingBottom, containerWidth) ??
      base.bottom,
    left:
      parseNumericValue(style.paddingLeft) ??
      resolvePercentValue(style.paddingLeft, containerWidth) ??
      base.left,
  };
}

/**
 * 스타일에서 보더 너비 파싱
 *
 * H4: CSS border shorthand `border: "1px solid red"` 지원 추가
 * 빌더의 개별 속성(borderTopWidth 등) 우선, borderWidth shorthand 차선,
 * border shorthand("1px solid red")가 최종 폴백으로 적용됩니다.
 */
export function parseBorder(
  style: Record<string, unknown> | undefined,
): Margin {
  if (!style) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  // H4: border shorthand 먼저 파싱 ("1px solid red" → width: 1)
  let shorthandWidth = 0;
  if (style.border !== undefined) {
    const parsed = parseBorderShorthand(style.border);
    if (parsed) shorthandWidth = parsed.width;
  }

  // borderWidth shorthand (숫자만)가 border shorthand보다 우선
  const base =
    style.borderWidth !== undefined
      ? parseShorthand(style.borderWidth)
      : {
          top: shorthandWidth,
          right: shorthandWidth,
          bottom: shorthandWidth,
          left: shorthandWidth,
        };

  // 개별 속성으로 override
  return {
    top: parseNumericValue(style.borderTopWidth) ?? base.top,
    right: parseNumericValue(style.borderRightWidth) ?? base.right,
    bottom: parseNumericValue(style.borderBottomWidth) ?? base.bottom,
    left: parseNumericValue(style.borderLeftWidth) ?? base.left,
  };
}

/**
 * 요소 태그별 기본 너비 (텍스트 없을 때)
 *
 * width가 명시되지 않고 텍스트 콘텐츠도 없는 요소에 대한 폴백 너비
 */
const DEFAULT_ELEMENT_WIDTHS: Record<string, number> = {
  // 폼 요소 (기본 크기)
  input: 180,
  select: 150,
  textarea: 200,
  // 미디어 계열
  img: 150,
  video: 300,
  canvas: 200,
  iframe: 300,
};

/** 기본 너비 (알 수 없는 태그, 텍스트 없을 때) */
const DEFAULT_WIDTH = 80;

/**
 * 버튼 size별 설정
 *
 * @xstudio/specs ButtonSpec.sizes와 1:1 동기화
 * paddingLeft/paddingRight: ButtonSpec.sizes[size].paddingX (좌우 동일)
 * paddingY: ButtonSpec.sizes[size].paddingY (상하 동일)
 * fontSize: typography 토큰 resolved 값
 *
 * 🚀 Phase 12 Fix: height 제거, paddingY 추가
 * 기존 height는 ButtonSpec.height (예: sm=32)였으나 PixiButton 실제 렌더링은
 * max(paddingY*2 + textHeight, MIN_HEIGHT) 공식으로 계산되어 불일치 발생.
 * 동일 공식을 사용하여 CSS/WebGL 정합성 보장.
 */
const BUTTON_SIZE_CONFIG: Record<
  string,
  {
    height?: number;
    paddingLeft: number;
    paddingRight: number;
    paddingY: number;
    fontSize: number;
    lineHeight: number;
    borderWidth: number;
  }
> = {
  // @sync Button.css [data-size] padding/fontSize/line-height 값과 일치해야 함
  // @sync Button.css base: border: 1px solid (all variants, all sizes)
  // @sync shared-tokens.css spacing: 3xs=1, 2xs=2, xs=4, sm=8, md=12, lg=16, xl=24, 2xl=32
  // @sync shared-tokens.css line-height: text-sm=1.25/0.875, text-base=1.5/1, etc.
  // CSS Button은 명시적 height를 설정하지 않음 → line-height + padding + border로 자동 결정
  // lineHeight는 CSS line-height를 px로 환산한 값 (fontSize × ratio)
  xs: {
    paddingLeft: 8,
    paddingRight: 8,
    paddingY: 1, // --spacing-3xs
    fontSize: 10,
    lineHeight: 16, // 10 * (1/0.625) = 16
    borderWidth: 1,
  },
  sm: {
    paddingLeft: 12,
    paddingRight: 12,
    paddingY: 2, // --spacing-2xs
    fontSize: 12,
    lineHeight: 16, // 12 * (1/0.75) = 16
    borderWidth: 1,
  },
  md: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingY: 4, // --spacing-xs
    fontSize: 14,
    lineHeight: 20, // 14 * (1.25/0.875) = 20
    borderWidth: 1,
  },
  lg: {
    paddingLeft: 24,
    paddingRight: 24,
    paddingY: 8, // --spacing-sm
    fontSize: 16,
    lineHeight: 24, // 16 * (1.5/1) = 24
    borderWidth: 1,
  },
  xl: {
    paddingLeft: 32,
    paddingRight: 32,
    paddingY: 12, // --spacing-md
    fontSize: 18,
    lineHeight: 28, // 18 * (1.75/1.125) = 28
    borderWidth: 1,
  },
};

/** PixiButton MIN_BUTTON_HEIGHT과 동일 */
const MIN_BUTTON_HEIGHT = 24;

/**
 * Badge/Tag/Chip size별 설정
 *
 * cssVariableReader.ts의 BADGE_FALLBACKS와 1:1 동기화
 * PixiBadge 렌더링과 동일한 레이아웃 크기 보장
 */
const BADGE_SIZE_CONFIG: Record<
  string,
  {
    paddingLeft: number;
    paddingRight: number;
    paddingY: number;
    fontSize: number;
    lineHeight: number;
    borderWidth: number;
  }
> = {
  // @sync Button.css/BUTTON_SIZE_CONFIG — fontSize/lineHeight/padding 동일
  xs: {
    paddingLeft: 8,
    paddingRight: 8,
    paddingY: 1, // --spacing-3xs
    fontSize: 10,
    lineHeight: 16,
    borderWidth: 1,
  },
  sm: {
    paddingLeft: 12,
    paddingRight: 12,
    paddingY: 2, // --spacing-2xs
    fontSize: 12,
    lineHeight: 16,
    borderWidth: 1,
  },
  md: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingY: 4, // --spacing-xs
    fontSize: 14,
    lineHeight: 20,
    borderWidth: 1,
  },
  lg: {
    paddingLeft: 24,
    paddingRight: 24,
    paddingY: 8, // --spacing-sm
    fontSize: 16,
    lineHeight: 24,
    borderWidth: 1,
  },
  xl: {
    paddingLeft: 32,
    paddingRight: 32,
    paddingY: 12, // --spacing-md
    fontSize: 18,
    lineHeight: 28,
    borderWidth: 1,
  },
};

/**
 * ToggleButton size별 설정
 *
 * @sync ToggleButton.css [data-size] padding 값과 일치해야 함
 * Button.css와 동일한 padding 사용
 */
const TOGGLEBUTTON_SIZE_CONFIG: Record<
  string,
  {
    paddingLeft: number;
    paddingRight: number;
    paddingY: number;
    fontSize: number;
    lineHeight: number;
    borderWidth: number;
  }
> = {
  // @sync ToggleButton.css [data-size] padding 값과 일치해야 함 (Button.css와 동일)
  // @sync shared-tokens.css spacing/line-height 토큰
  xs: {
    paddingLeft: 8,
    paddingRight: 8,
    paddingY: 1, // --spacing-3xs
    fontSize: 10,
    lineHeight: 16, // 10 * (1/0.625)
    borderWidth: 1,
  },
  sm: {
    paddingLeft: 12,
    paddingRight: 12,
    paddingY: 2, // --spacing-2xs
    fontSize: 12,
    lineHeight: 16, // 12 * (1/0.75)
    borderWidth: 1,
  },
  md: {
    paddingLeft: 16,
    paddingRight: 16,
    paddingY: 4, // --spacing-xs
    fontSize: 14,
    lineHeight: 20, // 14 * (1.25/0.875)
    borderWidth: 1,
  },
  lg: {
    paddingLeft: 24,
    paddingRight: 24,
    paddingY: 8, // --spacing-sm
    fontSize: 16,
    lineHeight: 24, // 16 * (1.5/1)
    borderWidth: 1,
  },
  xl: {
    paddingLeft: 32,
    paddingRight: 32,
    paddingY: 12, // --spacing-md
    fontSize: 18,
    lineHeight: 28, // 18 * (1.75/1.125)
    borderWidth: 1,
  },
};

/**
 * Card size별 설정
 *
 * cssVariableReader.ts의 CARD_FALLBACKS와 1:1 동기화
 * PixiCard 렌더링과 동일한 내부 패딩 보장
 */
const CARD_SIZE_CONFIG: Record<string, { padding: number }> = {
  sm: { padding: 8 },
  md: { padding: 12 },
  lg: { padding: 16 },
};

/** inline-level UI 컴포넌트 태그 → size config 매핑 */
const INLINE_UI_SIZE_CONFIGS: Record<
  string,
  Record<
    string,
    {
      paddingLeft: number;
      paddingRight: number;
      paddingY: number;
      fontSize: number;
      lineHeight?: number;
      borderWidth: number;
      minWidth?: number;
      height?: number;
    }
  >
> = {
  badge: BADGE_SIZE_CONFIG,
  tag: BADGE_SIZE_CONFIG,
  chip: BADGE_SIZE_CONFIG,
  togglebutton: TOGGLEBUTTON_SIZE_CONFIG,
  submitbutton: BUTTON_SIZE_CONFIG,
  fancybutton: BUTTON_SIZE_CONFIG,
};

/**
 * 버튼 계열 요소의 size config 조회 (단일 소스)
 *
 * 엔진 모듈에서 버튼 크기 계산 시
 * BUTTON_SIZE_CONFIG / TOGGLEBUTTON_SIZE_CONFIG의 단일 진입점으로 사용.
 *
 * @returns 해당 tag/size의 config. 버튼 계열이 아니면 null.
 */
export function getButtonSizeConfig(
  tag: string,
  sizePropValue?: string,
): {
  paddingY: number;
  paddingX: number;
  fontSize: number;
  borderWidth: number;
} | null {
  const t = tag.toLowerCase();

  // button / submitbutton / fancybutton → BUTTON_SIZE_CONFIG
  if (t === "button" || t === "submitbutton" || t === "fancybutton") {
    const size = sizePropValue ?? "md";
    const c = BUTTON_SIZE_CONFIG[size] ?? BUTTON_SIZE_CONFIG["md"];
    return {
      paddingY: c.paddingY,
      paddingX: c.paddingLeft,
      fontSize: c.fontSize,
      borderWidth: c.borderWidth,
    };
  }

  // togglebutton → TOGGLEBUTTON_SIZE_CONFIG
  if (t === "togglebutton") {
    const size = sizePropValue ?? "md";
    const c = TOGGLEBUTTON_SIZE_CONFIG[size] ?? TOGGLEBUTTON_SIZE_CONFIG["md"];
    return {
      paddingY: c.paddingY,
      paddingX: c.paddingLeft,
      fontSize: c.fontSize,
      borderWidth: c.borderWidth,
    };
  }

  return null;
}

/**
 * 활성 TextMeasurer를 사용하여 텍스트 너비 측정
 *
 * Phase 4-1: getTextMeasurer() 전략 패턴 적용
 * - CanvasKit 초기화 후: CanvasKit Paragraph API (HarfBuzz 정확도)
 * - CanvasKit 미로드 시: Canvas 2D API (기존 동작)
 *
 * @param text - 측정할 텍스트
 * @param fontSize - 폰트 크기 (기본 14px)
 * @param fontFamily - 폰트 패밀리 (기본 Pretendard)
 * @param fontWeight - 폰트 두께 (기본 400)
 * @param extra - 렌더러 ParagraphStyle 정합성을 위한 추가 스타일 (기존 호출자 하위 호환)
 */
export function measureTextWidth(
  text: string,
  fontSize: number = 14,
  fontFamily: string = specFontFamily.sans,
  fontWeight: number | string = 400,
  extra?: {
    letterSpacing?: number;
    wordSpacing?: number;
    fontStyle?: number | string;
    fontStretch?: string;
    fontVariant?: string;
    lineHeight?: number;
  },
): number {
  if (!text) return 0;

  return getTextMeasurer().measureWidth(text, {
    fontSize,
    fontFamily,
    fontWeight,
    ...extra,
  });
}

/**
 * 텍스트 콘텐츠 추출
 *
 * 다양한 prop에서 텍스트 문자열 추출
 * 우선순위: children > text > label > title > placeholder > value
 */
function extractTextContent(
  props: Record<string, unknown> | undefined,
): string {
  if (!props) return "";

  // 우선순위에 따라 텍스트 소스 확인
  const textSources = [
    props.children,
    props.text,
    props.label,
    props.title,
    props.placeholder,
    props.value,
  ];

  for (const source of textSources) {
    const text = extractFromValue(source);
    if (text) return text;
  }

  return "";
}

/**
 * 단일 값에서 텍스트 추출
 */
function extractFromValue(value: unknown): string {
  if (value === undefined || value === null) return "";

  // 문자열
  if (typeof value === "string") return value;

  // 숫자
  if (typeof value === "number") return String(value);

  // 배열 (복수 children)
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item === "number") return String(item);
        return "";
      })
      .join("");
  }

  return "";
}

/**
 * 텍스트 기반 너비 계산
 *
 * Canvas 2D measureText()를 사용하여 정확한 텍스트 너비 측정
 * PixiButton의 measureTextSize()와 동일한 결과
 *
 * @param text - 텍스트 콘텐츠
 * @param fontSize - 폰트 크기 (기본 14px)
 * @param padding - 좌우 패딩 합계
 */
function calculateTextWidth(
  text: string,
  fontSize: number = 14,
  padding: number = 0,
): number {
  if (!text) return 0;

  const textWidth = measureTextWidth(text, fontSize);
  // float 정밀도 유지: Skia paragraph.layout(maxWidth)와 getMaxIntrinsicWidth() 간
  // 정확한 일치를 보장하여 마지막 글자 줄바꿈 방지
  return textWidth + padding;
}

/** 컴포넌트별 기본 size prop 값 */
const DEFAULT_SIZE_BY_TAG: Record<string, string> = {
  // Badge 계열: 'md' 기본값 (CSS TagGroup 기본 size=md와 동기화)
  badge: "md",
  tag: "md",
  chip: "md",
  // Button 계열: 'md' 기본값
  button: "md",
  submitbutton: "md",
  fancybutton: "md",
  input: "md",
  select: "sm",
  a: "md",
  togglebutton: "md",
};

/**
 * 요소의 콘텐츠 너비 계산
 *
 * CSS width: auto 동작 모방:
 * 1. 텍스트 콘텐츠가 있으면 텍스트 기반 너비 추정
 * 2. 텍스트가 없으면 태그별 기본 너비 사용
 *
 * @returns 콘텐츠 기반 너비
 */
export function calculateContentWidth(
  element: Element,
  childElements?: Element[],
  getChildElements?: (id: string) => Element[],
  computedStyle?: ComputedStyle,
): number {
  const style = element.props?.style as Record<string, unknown> | undefined;
  const tag = (element.tag ?? "").toLowerCase();

  // 1. 명시적 width가 있으면 사용
  const explicitWidth = parseNumericValue(style?.width);
  if (explicitWidth !== undefined) return explicitWidth;

  // 🚀 ToggleButtonGroup: 자식 버튼 텍스트 크기 합산
  // PixiToggleButtonGroup.tsx의 buttonSizes/contentWidth와 동일한 공식
  if (tag === "togglebuttongroup") {
    const props = element.props as Record<string, unknown> | undefined;
    const sizeName = (props?.size as string) ?? "md";
    const sizeConfig =
      TOGGLEBUTTON_SIZE_CONFIG[sizeName] ?? TOGGLEBUTTON_SIZE_CONFIG["md"];
    const borderWidth = sizeConfig.borderWidth;
    const paddingX = sizeConfig.paddingLeft; // paddingLeft === paddingRight
    const orientation = String(props?.orientation || "horizontal");
    const isHorizontal = orientation === "horizontal";
    const gap = parseNumericValue(style?.gap) ?? 0; // CSS gap (0 = default -1px overlap)

    // Spec에서 ToggleButton의 실제 text style 추출 (fontWeight/fontFamily 정합성)
    const tbSpecStyle = extractSpecTextStyle("togglebutton", {
      size: sizeName,
    });
    const tbFontSize = tbSpecStyle?.fontSize ?? sizeConfig.fontSize;
    const tbFontWeight = tbSpecStyle?.fontWeight ?? 400;
    const tbFontFamily = tbSpecStyle?.fontFamily ?? specFontFamily.sans;

    // items 배열에서 레이블 추출
    const items = Array.isArray(props?.items) ? (props.items as unknown[]) : [];

    // items prop이 없으면 child elements에서 레이블 추출
    if (items.length === 0 && childElements && childElements.length > 0) {
      for (const child of childElements) {
        const childProps = child.props as Record<string, unknown> | undefined;
        const label = String(
          childProps?.children ?? childProps?.text ?? childProps?.label ?? "",
        );
        if (label) {
          items.push(label);
        }
      }
    }

    if (items.length > 0) {
      const buttonWidths = items.map((item) => {
        const label =
          typeof item === "string"
            ? item
            : (((item as Record<string, unknown>)?.label as string) ??
              ((item as Record<string, unknown>)?.children as string) ??
              "");
        const textWidth = measureTextWidth(
          String(label),
          tbFontSize,
          tbFontFamily,
          tbFontWeight,
        );
        return Math.max(
          40,
          borderWidth + paddingX + textWidth + paddingX + borderWidth,
        );
      });
      if (isHorizontal) {
        // horizontal: 버튼 너비 합 + gap * (n-1) - margin overlap(1px * (n-1))
        return (
          buttonWidths.reduce((sum, w) => sum + w, 0) +
          gap * (items.length - 1) -
          (items.length - 1)
        );
      }
      // vertical: 가장 넓은 버튼
      return Math.max(...buttonWidths);
    }
    // items도 children도 없으면 기본값
    return DEFAULT_WIDTH;
  }

  // Phantom indicator space (모듈 스코프 PHANTOM_INDICATOR_CONFIGS 사용)
  const _phantomProps = element.props as Record<string, unknown> | undefined;
  const _phantomSize = (_phantomProps?.size as string) ?? "md";
  const phantomSpace = getPhantomIndicatorSpace(tag, _phantomSize);
  const phantomW = phantomSpace?.width ?? 0;

  // 2. Flex 컨테이너: childElements 기반 재귀 너비 계산 (텍스트 추출보다 먼저 처리)
  // TagGroup(flex column, fit-content), TagList(flex row) 등 컨테이너 컴포넌트의
  // intrinsic width를 자식 요소들의 실제 border-box 너비에서 산출
  // ⚠️ 반드시 extractTextContent보다 먼저 와야 함:
  //    TagGroup.props.label = "Tag Group"이 텍스트로 추출되면 ~63px이 반환되어
  //    자식 기반 너비(~132px)에 도달하지 못함
  if (childElements && childElements.length > 0) {
    const display = style?.display;
    if (display === "flex" || display === "inline-flex") {
      const flexDir = (style?.flexDirection as string) || "row";
      const gap = parseNumericValue(style?.gap) ?? 0;
      const isRow = flexDir === "row" || flexDir === "row-reverse";

      const childWidths = childElements.map((child) => {
        const childStyle = child.props?.style as
          | Record<string, unknown>
          | undefined;
        const explicitW = parseNumericValue(childStyle?.width);
        if (explicitW !== undefined) return explicitW;
        // content-box 너비
        const grandChildren = getChildElements?.(child.id);
        const contentW = calculateContentWidth(
          child,
          grandChildren,
          getChildElements,
        );
        // border-box 산출: enrichWithIntrinsicSize와 동일하게 padding + border 추가
        // (Tag, Badge 등 INLINE_BLOCK_TAGS의 spec padding/border가 포함되어야 함)
        const childBox = parseBoxModel(child, 0, -1);
        return (
          contentW +
          childBox.padding.left +
          childBox.padding.right +
          childBox.border.left +
          childBox.border.right
        );
      });

      // Phantom indicator: Checkbox/Radio/Switch의 indicator는 element tree에 없지만
      // spec shapes(Skia)가 시각적으로 그리므로 width 계산에 반영
      // CSS gap이 설정되면 specGap을 제거하고 CSS gap으로 대체
      const hasCSSGapW =
        style?.gap !== undefined || style?.columnGap !== undefined;
      const effectivePhantomW =
        hasCSSGapW && phantomW > 0
          ? phantomW - (phantomSpace?.gap ?? 0)
          : phantomW;

      if (isRow) {
        // phantomW > 0이면 phantom도 flex child로 간주 → gap 횟수에 포함
        const gapCount =
          childElements.length - 1 + (effectivePhantomW > 0 ? 1 : 0);
        return (
          childWidths.reduce((sum, w) => sum + w, 0) +
          gap * Math.max(0, gapCount) +
          effectivePhantomW
        );
      }
      return Math.max(...childWidths, phantomW, 0);
    }
  }

  // 3. 텍스트 콘텐츠 기반 너비 측정 (Canvas 2D measureText 사용)
  // childElements가 없는 legacy Checkbox/Radio/Switch 요소의 fallback 경로
  const text = extractTextContent(element.props as Record<string, unknown>);

  const indicatorConfig = PHANTOM_INDICATOR_CONFIGS[tag];
  if (indicatorConfig) {
    const props = element.props as Record<string, unknown> | undefined;
    const sizeName = (props?.size as string) ?? "md";
    const s = sizeName as "sm" | "md" | "lg";
    const indicatorSize =
      indicatorConfig.widths[s] ?? indicatorConfig.widths.md;
    const specIndicatorGap = indicatorConfig.gaps[s] ?? indicatorConfig.gaps.md;
    // CSS gap이 설정되면 specGap 대신 CSS gap 사용
    const hasCSSGapSec3 =
      style?.gap !== undefined || style?.columnGap !== undefined;
    const indicatorGap = hasCSSGapSec3
      ? (parseNumericValue(style?.gap ?? style?.columnGap) ?? specIndicatorGap)
      : specIndicatorGap;
    // Spec에서 실제 text style 추출 (fontWeight/fontFamily 정합성)
    const indicatorSpecStyle = extractSpecTextStyle(
      tag,
      props as Record<string, unknown>,
    );
    // fallback: typography 토큰 매칭 text-sm=14, text-md=16, text-lg=18
    const fontSize =
      indicatorSpecStyle?.fontSize ??
      (sizeName === "S" ? 14 : sizeName === "L" ? 18 : 16);
    const indicatorFontWeight = indicatorSpecStyle?.fontWeight ?? 400;
    const indicatorFontFamily =
      indicatorSpecStyle?.fontFamily ?? specFontFamily.sans;
    const labelText = String(
      props?.children ?? props?.label ?? props?.text ?? "",
    );
    // Canvas 2D 사용 시 CanvasKit paragraph API와의 폰트 측정 오차 보정 (+2px)
    // CanvasKit 측정기 사용 시 보정 불필요 (동일 렌더러로 측정)
    const canvas2dCompensation = isCanvasKitMeasurer() ? 0 : 2;
    const textWidth = labelText
      ? Math.ceil(
          measureTextWidth(
            labelText,
            fontSize,
            indicatorFontFamily,
            indicatorFontWeight,
          ),
        ) + canvas2dCompensation
      : 0;
    const flexDir = style?.flexDirection as string | undefined;
    const isColumn = flexDir === "column" || flexDir === "column-reverse";
    if (isColumn) {
      // Column: 너비 = max(indicator, text)
      return Math.max(indicatorSize, textWidth);
    }
    // Row: 너비 = indicator + gap + text
    return indicatorSize + indicatorGap + textWidth;
  }

  if (text) {
    const props = element.props as Record<string, unknown> | undefined;

    // 버튼, 인풋 등은 size prop에 따라 fontSize 결정
    // padding/border는 parseBoxModel에서 처리 → 여기서는 텍스트 너비만 반환
    // (inline padding 변경 시 이중 계산 방지)
    const isFormElement = ["button", "input", "select", "a"].includes(tag);
    const inlineUIConfig = INLINE_UI_SIZE_CONFIGS[tag];
    if (isFormElement || inlineUIConfig) {
      // Spec에서 실제 text style 추출 — 렌더러와 동일한 fontWeight/fontFamily 보장
      const inlineSpecStyle = extractSpecTextStyle(
        tag,
        props as Record<string, unknown>,
      );

      const defaultSize = DEFAULT_SIZE_BY_TAG[tag] ?? "md";
      const size = (props?.size as string) ?? defaultSize;
      const configMap = isFormElement ? BUTTON_SIZE_CONFIG : inlineUIConfig!;
      const sizeConfig =
        configMap[size] ??
        configMap[defaultSize] ??
        Object.values(configMap)[0];
      // Spec 기반 font 속성 (style override는 Spec 내부에서 반영됨)
      const fontSize =
        parseNumericValue(style?.fontSize) ??
        inlineSpecStyle?.fontSize ??
        sizeConfig.fontSize;
      const inlineFontWeight = inlineSpecStyle?.fontWeight ?? 400;
      const inlineFontFamily =
        inlineSpecStyle?.fontFamily ?? specFontFamily.sans;
      const textWidth = measureTextWidth(
        text,
        fontSize,
        inlineFontFamily,
        inlineFontWeight,
        inlineSpecStyle?.letterSpacing
          ? { letterSpacing: inlineSpecStyle.letterSpacing }
          : undefined,
      );

      // minWidth 적용: totalWidth = contentWidth + padding >= minWidth
      // PixiBadge와 동일한 너비 계산 (cssVariableReader.ts BADGE_FALLBACKS 참조)
      const minWidth = (sizeConfig as { minWidth?: number }).minWidth;
      if (minWidth !== undefined) {
        const padding = sizeConfig.paddingLeft + sizeConfig.paddingRight;
        const minContentWidth = Math.max(0, minWidth - padding);
        return Math.max(minContentWidth, textWidth);
      }

      return textWidth;
    }

    // 일반 요소: computedStyle 기준으로 font 속성을 해소
    // raw style에 fontSize가 없으면 CSS 상속 기본값(16px)을 사용해야 렌더러와 일치
    const fontSize =
      parseNumericValue(style?.fontSize) ?? computedStyle?.fontSize ?? 16; // CSS initial value (ROOT_COMPUTED_STYLE.fontSize)
    const fontFamily =
      (style?.fontFamily as string) ??
      computedStyle?.fontFamily ??
      specFontFamily.sans;
    const fontWeight = style?.fontWeight ?? computedStyle?.fontWeight ?? 400;
    const letterSpacing =
      parseNumericValue(style?.letterSpacing) ??
      computedStyle?.letterSpacing ??
      0;
    const wordSpacing =
      parseNumericValue(style?.wordSpacing) ?? computedStyle?.wordSpacing ?? 0;

    // textTransform 적용: 렌더러(TextSprite.tsx)는 applyTextTransform() 후 텍스트를 그림
    // 측정도 동일한 변환 후 텍스트로 수행해야 폭이 일치
    const textTransform =
      (style?.textTransform as string | undefined) ??
      computedStyle?.textTransform;
    const measuredText = applyTextTransform(text, textTransform);

    // lineHeight 계산: styleConverter.ts convertToTextStyle()와 동일 로직
    // 렌더러(nodeRenderers.ts)의 ParagraphStyle.heightMultiplier와 일치시키기 위해 필수
    const rawLineHeight = style?.lineHeight ?? computedStyle?.lineHeight;
    let lineHeight: number | undefined;
    if (rawLineHeight != null) {
      const lh = parseNumericValue(rawLineHeight);
      if (lh != null) {
        const isMultiplier =
          lh < 10 &&
          (typeof rawLineHeight === "number" ||
            (typeof rawLineHeight === "string" &&
              /^\d*\.?\d+$/.test(String(rawLineHeight).trim())));
        lineHeight = isMultiplier ? lh * fontSize : lh;
      }
    } else {
      // Tailwind CSS v4 기본 line-height: 1.5
      lineHeight = 1.5 * fontSize;
    }

    const baseWidth = measureTextWidth(
      measuredText,
      fontSize,
      fontFamily,
      fontWeight as number | string,
      {
        letterSpacing,
        wordSpacing,
        fontStyle: (style?.fontStyle ?? computedStyle?.fontStyle) as
          | number
          | string
          | undefined,
        fontStretch: (style?.fontStretch ?? computedStyle?.fontStretch) as
          | string
          | undefined,
        fontVariant: (style?.fontVariant ?? computedStyle?.fontVariant) as
          | string
          | undefined,
        lineHeight,
      },
    );
    // CanvasKit: ParagraphStyle이 렌더러와 일치하므로 보정 불필요, Math.ceil만으로 충분
    // Canvas 2D: CanvasKit 렌더링과의 엔진 간 오차 보정 (+4px)
    const generalCompensation = isCanvasKitMeasurer() ? 0 : 4;
    return Math.ceil(baseWidth) + generalCompensation;
  }

  // 4. 태그별 기본 너비 사용
  const defaultWidth = DEFAULT_ELEMENT_WIDTHS[tag];
  if (defaultWidth !== undefined) return defaultWidth;

  // 5. 알 수 없는 태그는 기본값 사용
  return DEFAULT_WIDTH;
}

/**
 * 요소 태그별 기본 높이
 *
 * height가 명시되지 않은 요소에 대한 추정 높이
 * 브라우저 CSS와 유사한 기본 크기 적용
 */
const DEFAULT_ELEMENT_HEIGHTS: Record<string, number> = {
  // 버튼/인풋 계열
  button: 36,
  // input: InputSpec.sizes 기반 동적 계산 (step 2.5)
  select: 36,
  textarea: 80,
  // 텍스트 계열
  // label: Tailwind CSS v4 line-height:1.5 적용 → step 7에서 동적 계산 (fontSize*1.5)
  // DEFAULT_ELEMENT_HEIGHTS에 두면 20으로 고정되어 실제 CSS 높이(21@14px)와 불일치
  p: 24,
  span: 20,
  h1: 40,
  h2: 36,
  h3: 32,
  h4: 28,
  h5: 24,
  h6: 20,
  // 컨테이너 계열 (auto, 자식 기반)
  div: 0,
  section: 0,
  article: 0,
  header: 0,
  footer: 0,
  nav: 0,
  aside: 0,
  main: 0,
  // 미디어 계열
  img: 150,
  video: 200,
  canvas: 150,
  // 리스트 계열
  ul: 0,
  ol: 0,
  li: 24,
  // 테이블 계열
  table: 0,
  tr: 36,
  td: 36,
  th: 36,
};

/**
 * 텍스트 높이 추정
 *
 * Canvas 2D measureText()는 width만 정확하고 height는 브라우저마다 다름.
 * CSS/PixiJS의 텍스트 높이와 동일하게 fontSize * lineHeight 비율로 추정.
 *
 * @param fontSize - 폰트 크기 (px)
 * @param lineHeight - 명시적 line-height (px); undefined이면 fontBoundingBox 기반 측정
 * @param fontFamily - 폰트 패밀리 (기본 Pretendard)
 * @param fontWeight - 폰트 두께 (기본 400)
 * @returns 추정 텍스트 높이
 */
function estimateTextHeight(
  fontSize: number,
  lineHeight?: number,
  fontFamily: string = specFontFamily.sans,
  fontWeight: number | string = 400,
): number {
  // 명시적 lineHeight가 있으면 float 그대로 반환 (Math.round 제거)
  if (lineHeight !== undefined) {
    return lineHeight;
  }
  // CSS line-height: normal 근사값 (fontBoundingBox 기반)
  // Button 등 UI 컴포넌트는 line-height: normal이 적용됨
  const fm = measureFontMetrics(fontFamily, fontSize, fontWeight);
  return fm.lineHeight;
}

/**
 * 요소의 콘텐츠 높이 계산
 *
 * @param element - 대상 요소
 * @param availableWidth - 사용 가능한 너비 (Card 등 텍스트 wrap 높이 계산용)
 * @returns 콘텐츠 기반 높이 (자식이 없으면 태그별 기본 높이)
 */
export function calculateContentHeight(
  element: Element,
  availableWidth?: number,
  childElements?: Element[],
  getChildElements?: (id: string) => Element[],
  computedStyle?: ComputedStyle,
): number {
  const style = element.props?.style as Record<string, unknown> | undefined;

  // 0. display: none → 레이아웃에서 제외, 높이 0
  if (style?.display === "none") return 0;

  // 1. 명시적 height가 있으면 사용
  const explicitHeight = parseNumericValue(style?.height);
  if (explicitHeight !== undefined) return explicitHeight;

  // 1.5. ToggleButtonGroup: 자식 ToggleButton의 border-box 높이 기반 계산
  // ToggleButtonGroup 자체는 padding/border 없는 flex 컨테이너이므로
  // content-box height = 자식 ToggleButton의 border-box height
  const tag0 = (element.tag ?? "").toLowerCase();
  if (tag0 === "togglebuttongroup") {
    const props = element.props as Record<string, unknown> | undefined;
    const sizeName = (props?.size as string) ?? "md";
    const sizeConfig =
      TOGGLEBUTTON_SIZE_CONFIG[sizeName] ?? TOGGLEBUTTON_SIZE_CONFIG["md"];
    const fontSize = sizeConfig.fontSize;
    // CSS 명시적 line-height 기반 텍스트 높이 + padding + border
    const textHeight = estimateTextHeight(fontSize, sizeConfig.lineHeight);
    return textHeight + sizeConfig.paddingY * 2 + sizeConfig.borderWidth * 2;
  }

  // 2. Self-rendering 요소는 size prop에 따라 높이 결정
  // contentHeight는 content-box 높이(텍스트 영역)만 반환해야 함
  // padding/border는 parseBoxModel에서 별도 관리 → BlockEngine이 합산
  const tag = (element.tag ?? "").toLowerCase();
  const inlineUIConfig = INLINE_UI_SIZE_CONFIGS[tag];
  if (tag === "button" || inlineUIConfig) {
    const props = element.props as Record<string, unknown> | undefined;
    const defaultSize = DEFAULT_SIZE_BY_TAG[tag] ?? "md";
    const size = (props?.size as string) ?? defaultSize;
    const configMap = tag === "button" ? BUTTON_SIZE_CONFIG : inlineUIConfig!;
    const sizeConfig =
      configMap[size] ?? configMap[defaultSize] ?? Object.values(configMap)[0];

    // 사용자가 인라인 padding을 설정했는지 확인 (configHeight 분기보다 먼저 판별 필요)
    const hasInlinePadding =
      style?.padding !== undefined ||
      style?.paddingTop !== undefined ||
      style?.paddingBottom !== undefined;

    // configHeight: border-box 기준 → content-box로 변환
    const configHeight = (sizeConfig as { height?: number }).height;
    const configContentHeight =
      configHeight !== undefined && !hasInlinePadding
        ? Math.max(
            0,
            configHeight - sizeConfig.paddingY * 2 - sizeConfig.borderWidth * 2,
          )
        : undefined;

    const fontSize = parseNumericValue(style?.fontSize) ?? sizeConfig.fontSize;
    const resolvedLineHeight = parseLineHeight(style, fontSize);
    // CSS Button은 명시적 line-height를 사용 → inline style이 없으면 config의 lineHeight 적용
    const configLineHeight = (sizeConfig as { lineHeight?: number }).lineHeight;
    const effectiveLineHeight = resolvedLineHeight ?? configLineHeight;
    const textHeight = estimateTextHeight(fontSize, effectiveLineHeight);
    // MIN_BUTTON_HEIGHT는 border-box 기준 → content-box 최소값으로 변환
    // 사용자가 인라인 padding을 설정한 경우 MIN_BUTTON_HEIGHT 미적용 (padding:0으로 축소 허용)
    const minContentHeight = hasInlinePadding
      ? 0
      : Math.max(
          0,
          MIN_BUTTON_HEIGHT -
            sizeConfig.paddingY * 2 -
            sizeConfig.borderWidth * 2,
        );

    // 텍스트 줄바꿈 높이 계산: availableWidth가 제공되면 줄바꿈 고려
    // configHeight보다 먼저 체크하여 텍스트가 줄바꿈되면 더 큰 높이를 사용
    if (availableWidth !== undefined && availableWidth > 0) {
      const paddingX =
        parseNumericValue(style?.paddingLeft) ??
        parseNumericValue(style?.padding) ??
        sizeConfig.paddingLeft;
      const maxTextWidth = availableWidth - paddingX * 2;
      if (maxTextWidth > 0) {
        const textContent = String(
          props?.children ?? props?.text ?? props?.label ?? "",
        );
        if (textContent) {
          const ws = (style?.whiteSpace as string) ?? "normal";
          const fw = parseNumericValue(style?.fontWeight) ?? 500;
          const wbVal = (style?.wordBreak as string) ?? undefined;
          const owVal = (style?.overflowWrap as string) ?? undefined;
          const measured = measureTextWithWhiteSpace(
            textContent,
            fontSize,
            specFontFamily.sans,
            fw,
            ws,
            maxTextWidth,
            wbVal,
            owVal,
          );
          if (measured.height > textHeight + 0.5) {
            const wrappedHeight = Math.max(measured.height, minContentHeight);
            // 텍스트 줄바꿈 높이가 configHeight보다 크면 확장
            return configContentHeight !== undefined
              ? Math.max(wrappedHeight, configContentHeight)
              : wrappedHeight;
          }
        }
      }
    }

    // 텍스트 줄바꿈 없음: configHeight가 있으면 고정 높이 사용
    if (configContentHeight !== undefined) {
      return configContentHeight;
    }

    return Math.max(textHeight, minContentHeight);
  }

  // 2.5. Input: fontSize 기반 동적 높이 계산 (Text 컴포넌트와 동일 패턴)
  // InputSpec.sizes에서 fontSize를 읽고, line-height: 1.5 기준으로 텍스트 높이 반환
  if (tag === "input") {
    const props = element.props as Record<string, unknown> | undefined;
    const sizeName = (props?.size as string) ?? "md";
    const sizeConfig = InputSpec.sizes[sizeName] ?? InputSpec.sizes.md;
    const rawFontSize = sizeConfig.fontSize;
    const specFontSize =
      typeof rawFontSize === "number"
        ? rawFontSize
        : typeof rawFontSize === "string" && rawFontSize.startsWith("{")
          ? (resolveToken(
              rawFontSize as Parameters<typeof resolveToken>[0],
            ) as number)
          : 16;
    const fontSize = parseNumericValue(style?.fontSize) ?? specFontSize;
    const resolvedLineHeight = parseLineHeight(style, fontSize);
    // CSS Input은 명시적 line-height 사용 → BUTTON_SIZE_CONFIG에서 lineHeight 참조
    // Input height = Button height (동일 size에서 동일 높이)
    const configLineHeight = BUTTON_SIZE_CONFIG[sizeName]?.lineHeight;
    const effectiveLineHeight = resolvedLineHeight ?? configLineHeight;
    return estimateTextHeight(fontSize, effectiveLineHeight);
  }

  // 3. CardHeader/CardContent/SelectTrigger: 투명 컨테이너 — 자식 높이 합산/max
  // Card의 새 트리 구조(Card → CardHeader → Heading, Card → CardContent → Description)에서
  // 각 래퍼가 자신의 자식 높이를 올바르게 반환해야 Card 전체 높이 계산이 정확해짐
  // SelectTrigger: Compositional Architecture — flex row 자식(SelectValue, SelectIcon) max 높이
  // flexDirection에 따라: column → 합산+gap, row → max (일반 flex 컨테이너와 동일)
  if (
    tag === "cardheader" ||
    tag === "cardcontent" ||
    tag === "selecttrigger"
  ) {
    if (childElements && childElements.length > 0) {
      const gapValue = parseNumericValue(style?.gap) ?? 8;
      const flexDir = (style?.flexDirection as string) || "column";
      const isColumn = flexDir === "column" || flexDir === "column-reverse";

      const childHeights = childElements.map((child) => {
        const grandChildren = getChildElements?.(child.id);
        const contentH = calculateContentHeight(
          child,
          availableWidth,
          grandChildren,
          getChildElements,
        );
        // 자식의 border-box 높이 계산: content-box + padding + border
        // Button 등 자식이 auto height일 때 padding/border를 포함해야 정확한 합산
        // (일반 flex 컨테이너 브랜치와 동일 패턴)
        const childStyle = child.props?.style as
          | Record<string, unknown>
          | undefined;
        const childTag = (child.tag ?? "").toLowerCase();
        const childExplicitH = parseNumericValue(childStyle?.height);
        const childIsFormEl = ["button", "input", "select"].includes(childTag);
        const childBoxSizing = childStyle?.boxSizing as string | undefined;
        const childIsSectionLike = childTag === "section";
        const childIsCardLike = childTag === "card" || childTag === "box";
        const childIsBorderBox =
          childBoxSizing === "border-box" ||
          (childIsFormEl && childExplicitH !== undefined) ||
          ((childIsSectionLike || childIsCardLike) &&
            childBoxSizing !== "content-box" &&
            childExplicitH !== undefined);

        if (childExplicitH !== undefined && childIsBorderBox) {
          return childExplicitH;
        }
        const childBox = parseBoxModel(child, 0, -1);
        return (
          contentH +
          childBox.padding.top +
          childBox.padding.bottom +
          childBox.border.top +
          childBox.border.bottom
        );
      });

      if (isColumn) {
        return Math.max(
          childHeights.reduce((sum, h) => sum + h, 0) +
            gapValue * Math.max(0, childHeights.length - 1),
          0,
        );
      }
      // row: 높이 = 가장 큰 자식의 높이
      return Math.max(...childHeights, 0);
    }
    return 0;
  }

  // 3. Card 컴포넌트: 자식 기반 or 텍스트 콘텐츠 기반 높이 계산
  // 🚀 Card는 style.padding이 있으므로 BlockEngine이 padding을 별도로 추가함
  // contentHeight는 content-box 높이만 반환 (padding 제외)
  if (tag === "card") {
    // childElements가 있으면 자식 기반 높이 계산 (display:flex column)
    // Card factory가 Heading + Description 자식을 생성하므로 이 경로가 우선
    if (childElements && childElements.length > 0) {
      const gap = parseNumericValue(style?.gap) ?? 8;
      // Card padding을 빼서 자식의 실제 텍스트 줄바꿈 너비 계산
      const cardPad = parsePadding(style, availableWidth);
      const childAvailableWidth =
        availableWidth != null
          ? availableWidth - cardPad.left - cardPad.right
          : availableWidth;
      let totalHeight = 0;
      for (let i = 0; i < childElements.length; i++) {
        const grandChildren = getChildElements?.(childElements[i].id);
        totalHeight += calculateContentHeight(
          childElements[i],
          childAvailableWidth,
          grandChildren,
          getChildElements,
        );
        if (i < childElements.length - 1) totalHeight += gap;
      }
      return Math.max(totalHeight, 36);
    }

    // fallback: props 기반 (자식 없는 Card)
    const props = element.props as Record<string, unknown> | undefined;
    const size = (props?.size as string) ?? "md";
    const cardConfig = CARD_SIZE_CONFIG[size] ?? CARD_SIZE_CONFIG.md;

    // padding은 style.padding 우선, 없으면 size config 사용
    const stylePadding = parseNumericValue(style?.padding);
    const cardPad = stylePadding ?? cardConfig.padding;

    // Card 너비: availableWidth가 있으면 사용, 없으면 200px 폴백
    const cardWidth = availableWidth ?? 200;
    const wrapWidth = cardWidth - cardPad * 2;
    const fontFamily = specFontFamily.sans;

    const cardTitle = String(props?.title || "");
    const description = String(props?.description || props?.children || "");

    let h = 0; // content-box height (padding 제외)

    if (cardTitle) {
      h += measureWrappedTextHeight(cardTitle, 16, 600, fontFamily, wrapWidth);
    }
    if (cardTitle) {
      h += 8; // marginBottom between header and content
    }
    if (description) {
      h += measureWrappedTextHeight(
        description,
        14,
        400,
        fontFamily,
        wrapWidth,
      );
    }

    // minHeight 36 (60 - 24px default padding = 36px content)
    return Math.max(h, 36);
  }

  // 3.5. Calendar Compositional Architecture: Card 패턴과 동일
  // Calendar → CalendarHeader + CalendarGrid 자식 높이 합산
  if (tag === "calendar") {
    if (childElements && childElements.length > 0) {
      const gap = parseNumericValue(style?.gap) ?? 6;
      const calPad = parsePadding(style, availableWidth);
      const childAvailableWidth =
        availableWidth != null
          ? availableWidth - calPad.left - calPad.right
          : availableWidth;
      let totalHeight = 0;
      for (let i = 0; i < childElements.length; i++) {
        totalHeight += calculateContentHeight(
          childElements[i],
          childAvailableWidth,
          undefined,
          getChildElements,
        );
        if (i < childElements.length - 1) totalHeight += gap;
      }
      return Math.max(totalHeight, 0);
    }
    return 0;
  }

  // CalendarHeader: intrinsic height = fontSize + 8
  if (tag === "calendarheader") {
    const props = element.props as Record<string, unknown> | undefined;
    const sizeName = (props?.size as string) ?? "md";
    const headerFontSizes: Record<string, number> = { sm: 12, md: 14, lg: 16 };
    return (headerFontSizes[sizeName] ?? 14) + 8;
  }

  // CalendarGrid: intrinsic height = weekdayRow + dateRows
  if (tag === "calendargrid") {
    const props = element.props as Record<string, unknown> | undefined;
    const sizeName = (props?.size as string) ?? "md";
    const gridDims: Record<string, { iconSize: number; gap: number }> = {
      sm: { iconSize: 24, gap: 4 },
      md: { iconSize: 28, gap: 6 },
      lg: { iconSize: 32, gap: 8 },
    };
    const d = gridDims[sizeName] ?? gridDims.md;
    const cellSize = d.iconSize + 4;
    const gp = d.gap;
    const now = new Date();
    const dayOffset =
      (props?.dayOffset as number) ??
      new Date(now.getFullYear(), now.getMonth(), 1).getDay();
    const totalDays =
      (props?.totalDays as number) ??
      new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const totalRows = Math.ceil((totalDays + dayOffset) / 7);
    return cellSize + totalRows * (cellSize + gp) - gp;
  }

  // 3.6a. DatePicker: 자식 기반 동적 높이 계산 (Card/Calendar 패턴)
  if (tag === "datepicker") {
    if (childElements && childElements.length > 0) {
      const gap = parseNumericValue(style?.gap) ?? 8;
      const dpPad = parsePadding(style, availableWidth);
      const childAvailableWidth =
        availableWidth != null
          ? availableWidth - dpPad.left - dpPad.right
          : availableWidth;
      let totalHeight = 0;
      for (let i = 0; i < childElements.length; i++) {
        totalHeight += calculateContentHeight(
          childElements[i],
          childAvailableWidth,
          undefined,
          getChildElements,
        );
        if (i < childElements.length - 1) totalHeight += gap;
      }
      return Math.max(totalHeight, 0);
    }
    return 0;
  }

  // 3.6b. DateField: intrinsic height from size (sm:32, md:40, lg:48)
  if (tag === "datefield") {
    const props = element.props as Record<string, unknown> | undefined;
    const sizeName = (props?.size as string) ?? "md";
    const dfHeights: Record<string, number> = { sm: 32, md: 40, lg: 48 };
    return dfHeights[sizeName] ?? 40;
  }

  // 3.6c. ComboBox/Select: 자식 기반 동적 높이 계산 (Card 패턴)
  // Select/ComboBox: 실제 visible 자식들의 높이 합산 + gap (flexDirection:column)
  // Dropdown: 레거시 spec shapes 기반 계산
  const COMBOBOX_INPUT_HEIGHTS: Record<string, number> = {
    sm: 20,
    md: 30,
    lg: 40,
  };
  // SelectItem 등 드롭다운 전용 자식은 collapsed 상태에서 비표시
  const SELECT_HIDDEN_CHILDREN = new Set([
    "SelectItem",
    "ComboBoxItem",
    "ListBoxItem",
  ]);
  if (tag === "combobox" || tag === "select" || tag === "dropdown") {
    const props = element.props as Record<string, unknown> | undefined;
    const sizeName = (props?.size as string) ?? "md";
    const isCompositional = tag === "select" || tag === "combobox";

    // gap: display:flex일 때만 적용 (CSS gap은 block에서 미적용)
    const displayVal = style?.display;
    const isFlex = displayVal === "flex" || displayVal === "inline-flex";
    const gapRaw = style?.gap;
    const gapParsed =
      typeof gapRaw === "number" ? gapRaw : parseFloat(String(gapRaw ?? ""));
    const gap = isFlex ? (isNaN(gapParsed) ? 8 : gapParsed) : 0;

    // Select/ComboBox: 실제 visible 자식 요소 순회 (Card와 동일 패턴)
    // label prop이 없으면 Label 자식 제외 (web preview 동작과 일치)
    if (isCompositional && childElements) {
      const hasLabel = !!props?.label;
      // wrapper tag: Select → SelectTrigger, ComboBox → ComboBoxWrapper
      const wrapperTag = tag === "select" ? "SelectTrigger" : "ComboBoxWrapper";
      const visibleChildren = childElements.filter(
        (c) =>
          !SELECT_HIDDEN_CHILDREN.has(c.tag ?? "") &&
          (c.tag !== "Label" || hasLabel),
      );
      let totalH = 0;
      let visibleCount = 0;

      for (const child of visibleChildren) {
        const childTag = (child.tag ?? "").toLowerCase();
        const childStyle = (child.props?.style || {}) as Record<
          string,
          unknown
        >;
        let childH: number;

        if (child.tag === wrapperTag) {
          // SelectTrigger/ComboBoxWrapper: 자식 높이(row max) + padding
          const wrapperChildren = getChildElements?.(child.id);
          let wrapperContentH = 0;
          if (wrapperChildren && wrapperChildren.length > 0) {
            for (const wc of wrapperChildren) {
              const wcStyle = (wc.props?.style || {}) as Record<
                string,
                unknown
              >;
              const wcH =
                typeof wcStyle.height === "number"
                  ? wcStyle.height
                  : Math.ceil(
                      (parseFloat(String(wcStyle.fontSize ?? 14)) || 14) * 1.5,
                    );
              if (wcH > wrapperContentH) wrapperContentH = wcH;
            }
          } else {
            wrapperContentH = Math.ceil(14 * 1.5);
          }
          // Wrapper padding (store 값 또는 spec 기본값)
          const hasWrapperPadding =
            childStyle.padding !== undefined ||
            childStyle.paddingTop !== undefined ||
            childStyle.paddingBottom !== undefined;
          if (hasWrapperPadding) {
            const wrapperPad = parsePadding(childStyle);
            childH = wrapperContentH + wrapperPad.top + wrapperPad.bottom;
          } else {
            const specPadY: Record<string, number> = { sm: 8, md: 16, lg: 24 };
            childH = wrapperContentH + (specPadY[sizeName] ?? 16);
          }
        } else if (
          childTag === "label" ||
          childTag === "description" ||
          childTag === "fielderror"
        ) {
          // 텍스트 자식: explicit height 우선, 없으면 fontSize * lineHeight
          const explicitH = parseNumericValue(childStyle.height);
          if (explicitH != null && explicitH > 0) {
            childH = explicitH;
          } else {
            const fontSize =
              parseFloat(String(childStyle.fontSize ?? 14)) || 14;
            childH = Math.ceil(fontSize * 1.5);
          }
        } else {
          // 기타 자식: explicit height 또는 텍스트 기반
          childH =
            typeof childStyle.height === "number"
              ? childStyle.height
              : Math.ceil(
                  (parseFloat(String(childStyle.fontSize ?? 14)) || 14) * 1.5,
                );
        }

        if (childH > 0) {
          totalH += childH;
          visibleCount++;
        }
      }

      // gap 추가 (visible 자식 사이)
      if (visibleCount > 1) {
        totalH += gap * (visibleCount - 1);
      }
      return totalH;
    }

    // Dropdown: 레거시 spec shapes 기반 계산
    const bodyHeight = COMBOBOX_INPUT_HEIGHTS[sizeName] ?? 30;
    const hasLabel = !!props?.label;
    if (hasLabel) {
      const labelChild = childElements?.find((c) => c.tag === "Label");
      const labelStyle = (labelChild?.props?.style || {}) as Record<
        string,
        unknown
      >;
      const labelFontSize = parseFloat(String(labelStyle.fontSize ?? 14)) || 14;
      const labelHeight = Math.ceil(labelFontSize * 1.5);
      return labelHeight + gap + bodyHeight;
    }
    return bodyHeight;
  }

  // 3.5. Checkbox/Radio/Switch: flexDirection에 따른 높이 계산
  // (PHANTOM_INDICATOR_CONFIGS 단일 소스 사용)
  const heightIndicatorConfig = PHANTOM_INDICATOR_CONFIGS[tag];
  if (heightIndicatorConfig) {
    const props = element.props as Record<string, unknown> | undefined;
    const sizeName = (props?.size as string) ?? "md";
    const s = sizeName as "sm" | "md" | "lg";
    const flexDir = style?.flexDirection as string | undefined;
    const isColumn = flexDir === "column" || flexDir === "column-reverse";
    if (isColumn) {
      const indicatorH =
        heightIndicatorConfig.heights[s] ?? heightIndicatorConfig.heights.md;
      const specGap =
        heightIndicatorConfig.gaps[s] ?? heightIndicatorConfig.gaps.md;
      // CSS gap이 설정되면 specGap 대신 CSS gap 사용
      const hasCSSGapH =
        style?.gap !== undefined || style?.rowGap !== undefined;
      const gap = hasCSSGapH
        ? (parseNumericValue(style?.gap ?? style?.rowGap) ?? specGap)
        : specGap;
      const fs = sizeName === "S" ? 14 : sizeName === "L" ? 18 : 16;
      return indicatorH + gap + Math.round(fs * 1.4);
    }
    return (
      heightIndicatorConfig.rowHeights[s] ?? heightIndicatorConfig.rowHeights.md
    );
  }

  // 4. Panel: spec shapes 기반 컴포넌트 — 자식 요소 없이 자체 렌더링
  // CSS Preview 기준 높이 추정 (title section + content section + border)
  // ⚠️ childElements 블록 밖에 배치: Panel은 element tree에 자식이 없음
  if (tag === "panel") {
    const props = element.props as Record<string, unknown> | undefined;
    const hasTitle = !!props?.title;
    const sizeName = (props?.size as string) ?? "md";
    const PANEL_HEIGHTS: Record<
      string,
      { withTitle: number; noTitle: number }
    > = {
      sm: { withTitle: 80, noTitle: 44 },
      md: { withTitle: 104, noTitle: 64 },
      lg: { withTitle: 130, noTitle: 80 },
    };
    const heights = PANEL_HEIGHTS[sizeName] ?? PANEL_HEIGHTS.md;
    return hasTitle ? heights.withTitle : heights.noTitle;
  }

  // 4.2. Breadcrumbs: display:flex, align-items:center — 높이 = lineHeight
  // CSS에 명시적 height 없음, 텍스트 line-height로 결정
  // sm: text-xs(12px) * ~1.33 ≈ 16px, md/lg: text-base(16px) * 1.5 = 24px
  if (tag === "breadcrumbs") {
    const props = element.props as Record<string, unknown> | undefined;
    const sizeName = (props?.size as string) ?? "md";
    const BREADCRUMBS_HEIGHTS: Record<string, number> = {
      sm: 16,
      md: 24,
      lg: 24,
    };
    return BREADCRUMBS_HEIGHTS[sizeName] ?? 24;
  }

  // 4.5. 컨테이너 컴포넌트: childElements 기반 높이 계산 (lineHeight보다 먼저 처리)
  // CheckboxGroup, RadioGroup 등 자식 요소를 포함하는 컨테이너의 intrinsic height 산출
  // ⚠️ lineHeight 체크보다 먼저 와야 함: 컨테이너의 높이는 자식 기반으로 산출해야 함
  if (childElements && childElements.length > 0) {
    // CheckboxGroup: 그룹 라벨 + 자식 Checkbox 세로 합산
    if (tag === "checkboxgroup" || tag === "radiogroup") {
      const props = element.props as Record<string, unknown> | undefined;
      const sizeName = (props?.size as string) ?? "md";
      const gap = sizeName === "S" ? 8 : sizeName === "L" ? 16 : 12;

      let totalHeight = 0;
      // 그룹 라벨
      if (props?.label) {
        // typography 토큰 매칭: text-sm=14, text-md=16, text-lg=18
        const labelFontSize =
          sizeName === "S" ? 14 : sizeName === "L" ? 18 : 16;
        totalHeight += estimateTextHeight(labelFontSize) + 8; // label + spacing
      }
      // 자식 Checkbox/Radio 항목
      for (let i = 0; i < childElements.length; i++) {
        const grandChildren = getChildElements?.(childElements[i].id);
        totalHeight += calculateContentHeight(
          childElements[i],
          availableWidth,
          grandChildren,
          getChildElements,
        );
        if (i < childElements.length - 1) totalHeight += gap;
      }
      return totalHeight;
    }

    // Tabs: 탭 바 높이 + TabPanel 패딩 + 활성 Panel 높이
    // CSS Preview 기준: Tabs(flex col) → TabList(30px) + TabPanel(pad=16px → Panel)
    if (tag === "tabs") {
      const props = element.props as Record<string, unknown> | undefined;
      const sizeName = (props?.size as string) ?? "md";
      // CSS 기준 탭 바 높이: sm=25, md=30, lg=35
      const tabBarHeight = sizeName === "S" ? 25 : sizeName === "L" ? 35 : 30;
      const tabPanelPadding = 16; // React-Aria TabPanel 기본 padding

      // 활성 Panel의 높이 계산 (Dual Lookup: 직속 → TabPanels 내부)
      let panelChildren = childElements.filter((c) => c.tag === "Panel");
      if (panelChildren.length === 0) {
        const tabPanelsEl = childElements.find((c) => c.tag === "TabPanels");
        if (tabPanelsEl && getChildElements) {
          panelChildren = getChildElements(tabPanelsEl.id).filter(
            (c) => c.tag === "Panel",
          );
        }
      }
      const activePanel = panelChildren[0]; // 기본: 첫 번째 Panel
      if (activePanel) {
        const panelGrandChildren = getChildElements?.(activePanel.id);
        const panelHeight = calculateContentHeight(
          activePanel,
          availableWidth,
          panelGrandChildren,
          getChildElements,
        );
        const panelBox = parseBoxModel(activePanel, 0, -1);
        const panelBorderBox =
          panelHeight +
          panelBox.padding.top +
          panelBox.padding.bottom +
          panelBox.border.top +
          panelBox.border.bottom;
        return tabBarHeight + tabPanelPadding * 2 + panelBorderBox;
      }
      return tabBarHeight;
    }

    // 일반 flex 컨테이너: flexDirection에 따라 자식 높이 합산/max
    const display = style?.display;
    if (display === "flex" || display === "inline-flex") {
      const flexDir = (style?.flexDirection as string) || "row";
      const gap = parseNumericValue(style?.gap) ?? 0;
      const isColumn = flexDir === "column" || flexDir === "column-reverse";

      // display: none 자식은 레이아웃에서 제외 (높이 0, gap 미적용)
      const visibleChildren = childElements.filter((child) => {
        const childStyle = child.props?.style as
          | Record<string, unknown>
          | undefined;
        return childStyle?.display !== "none";
      });

      const childHeights = visibleChildren.map((child) => {
        const grandChildren = getChildElements?.(child.id);
        const contentH = calculateContentHeight(
          child,
          availableWidth,
          grandChildren,
          getChildElements,
        );
        // 자식에 explicit height가 있고 border-box로 처리되는 경우,
        // calculateContentHeight가 반환한 값이 이미 border-box 높이이므로
        // padding+border를 추가하면 이중 계산됨
        const childStyle = child.props?.style as
          | Record<string, unknown>
          | undefined;
        const childTag = (child.tag ?? "").toLowerCase();
        const childExplicitH = parseNumericValue(childStyle?.height);
        const childIsFormEl = ["button", "input", "select"].includes(childTag);
        const childBoxSizing = childStyle?.boxSizing as string | undefined;
        const childIsSectionLike = childTag === "section";
        const childIsCardLike = childTag === "card" || childTag === "box";
        const childIsBorderBox =
          childBoxSizing === "border-box" ||
          (childIsFormEl && childExplicitH !== undefined) ||
          ((childIsSectionLike || childIsCardLike) &&
            childBoxSizing !== "content-box" &&
            childExplicitH !== undefined);

        if (childExplicitH !== undefined && childIsBorderBox) {
          // border-box: explicit height가 이미 padding+border 포함
          return childExplicitH;
        }
        // content-box: padding + border 추가
        const childBox = parseBoxModel(child, 0, -1);
        return (
          contentH +
          childBox.padding.top +
          childBox.padding.bottom +
          childBox.border.top +
          childBox.border.bottom
        );
      });

      if (isColumn) {
        return (
          childHeights.reduce((sum, h) => sum + h, 0) +
          gap * Math.max(0, visibleChildren.length - 1)
        );
      }
      return Math.max(...childHeights, 0);
    }

    // 일반 block/기타 컨테이너: block flow에서 자식 높이 세로 합산
    // display:flex가 아닌 컨테이너(display:block, 미지정 등)도
    // 자식이 있으면 자식 높이를 합산해야 정확한 높이 반환
    // (Menu → MenuItem, Disclosure → DisclosureHeader/Content 등)
    const visibleBlockChildren = childElements.filter((child) => {
      const cs = child.props?.style as Record<string, unknown> | undefined;
      return cs?.display !== "none";
    });

    if (visibleBlockChildren.length > 0) {
      // Group: 자식이 원래 캔버스 좌표(left/top)를 유지하므로
      // block flow 합산이 아닌 bounding box 기반 높이 계산
      if (tag === "group") {
        let minTop = Infinity;
        let maxBottom = 0;
        for (const child of visibleBlockChildren) {
          const childStyle = child.props?.style as
            | Record<string, unknown>
            | undefined;
          const childTop = parseNumericValue(childStyle?.top) ?? 0;
          const grandChildren = getChildElements?.(child.id);
          const contentH = calculateContentHeight(
            child,
            availableWidth,
            grandChildren,
            getChildElements,
          );
          const childBox = parseBoxModel(child, 0, -1);
          const borderBoxH =
            contentH +
            childBox.padding.top +
            childBox.padding.bottom +
            childBox.border.top +
            childBox.border.bottom;
          minTop = Math.min(minTop, childTop);
          maxBottom = Math.max(maxBottom, childTop + borderBoxH);
        }
        return minTop === Infinity ? 0 : maxBottom - minTop;
      }

      const blockChildHeights = visibleBlockChildren.map((child) => {
        const grandChildren = getChildElements?.(child.id);
        const contentH = calculateContentHeight(
          child,
          availableWidth,
          grandChildren,
          getChildElements,
        );
        const childStyle = child.props?.style as
          | Record<string, unknown>
          | undefined;
        const childTag = (child.tag ?? "").toLowerCase();
        const childExplicitH = parseNumericValue(childStyle?.height);
        const childIsFormEl = ["button", "input", "select"].includes(childTag);
        const childBoxSizing = childStyle?.boxSizing as string | undefined;
        const childIsSectionLike = childTag === "section";
        const childIsCardLike = childTag === "card" || childTag === "box";
        const childIsBorderBox =
          childBoxSizing === "border-box" ||
          (childIsFormEl && childExplicitH !== undefined) ||
          ((childIsSectionLike || childIsCardLike) &&
            childBoxSizing !== "content-box" &&
            childExplicitH !== undefined);

        if (childExplicitH !== undefined && childIsBorderBox) {
          return childExplicitH;
        }
        const childBox = parseBoxModel(child, 0, -1);
        return (
          contentH +
          childBox.padding.top +
          childBox.padding.bottom +
          childBox.border.top +
          childBox.border.bottom
        );
      });

      // Block flow: 세로 합산 (gap 없음, margin collapse는 미지원)
      return blockChildHeights.reduce((sum, h) => sum + h, 0);
    }
  }

  // 4.9. Leaf text elements: 텍스트 줄바꿈 시 높이 자동 확장
  // TEXT_LEAF_TAGS 요소는 텍스트만 포함하는 리프 노드이므로
  // availableWidth가 있으면 줄바꿈을 고려한 실제 높이를 반환
  if (TEXT_LEAF_TAGS.has(tag) && availableWidth != null && availableWidth > 0) {
    const props = element.props as Record<string, unknown> | undefined;
    const textContent = String(
      props?.children ?? props?.text ?? props?.label ?? "",
    );
    if (textContent) {
      const fs0 =
        parseNumericValue(style?.fontSize) ?? computedStyle?.fontSize ?? 16;
      const fw0 =
        parseNumericValue(style?.fontWeight) ??
        computedStyle?.fontWeight ??
        400;
      const ff0 =
        (style?.fontFamily as string) ??
        computedStyle?.fontFamily ??
        specFontFamily.sans;
      const pad = parsePadding(style, availableWidth);
      const maxTextWidth = availableWidth - pad.left - pad.right;
      if (maxTextWidth > 0) {
        // Tailwind CSS v4 기본 line-height: 1.5 → fontSize * 1.5
        const resolvedLH = parseLineHeight(style, fs0) ?? fs0 * 1.5;
        const wb1 = style?.wordBreak as string as
          | "normal"
          | "break-all"
          | "keep-all"
          | undefined;
        const ow1 = style?.overflowWrap as string as
          | "normal"
          | "break-word"
          | "anywhere"
          | undefined;
        const wrappedHeight = measureWrappedTextHeight(
          textContent,
          fs0,
          fw0,
          ff0,
          maxTextWidth,
          resolvedLH,
          wb1,
          ow1,
        );
        const singleLineH = resolvedLH;
        if (wrappedHeight > singleLineH + 0.5) {
          return wrappedHeight;
        }
      }
    }
  }

  // 5. lineHeight가 명시적으로 지정되어 있으면 최소 높이로 사용
  const fontSize =
    parseNumericValue(style?.fontSize) ?? computedStyle?.fontSize;
  const resolvedLineHeight = parseLineHeight(style, fontSize);
  if (resolvedLineHeight !== undefined) {
    // float 정밀도 유지: Math.round 제거 → 소수점 절사로 인한 줄바꿈 방지
    return resolvedLineHeight;
  }

  // 6. 태그별 기본 높이 사용
  const defaultHeight = DEFAULT_ELEMENT_HEIGHTS[tag];
  if (defaultHeight !== undefined) return defaultHeight;

  // 7. Text/Heading 등 XStudio 커스텀 태그: CSS line-height: 1.5 상속
  // Preview iframe의 :root { line-height: 1.5 } (Tailwind CSS v4 기본)이
  // Text 컴포넌트에 상속되므로 fontSize * 1.5를 명시적으로 전달
  // (Button 등 UI 컴포넌트는 line-height: normal → step 2에서 fontBoundingBox 기반 처리)
  const fs = fontSize ?? 16;
  return estimateTextHeight(fs, fs * 1.5);
}

/**
 * 요소의 박스 모델 계산
 *
 * 🚀 Phase 11: min/max width/height 파싱, box-sizing: border-box 지원
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
  viewportHeight?: number,
): BoxModel {
  const style = element.props?.style as Record<string, unknown> | undefined;

  // width/height 파싱 (%, px, vh, vw, auto 지원)
  let width = parseSize(
    style?.width,
    availableWidth,
    viewportWidth,
    viewportHeight,
  );
  let height = parseSize(
    style?.height,
    availableHeight,
    viewportWidth,
    viewportHeight,
  );

  // min/max 파싱
  const minWidth = parseSize(
    style?.minWidth,
    availableWidth,
    viewportWidth,
    viewportHeight,
  );
  const maxWidth = parseSize(
    style?.maxWidth,
    availableWidth,
    viewportWidth,
    viewportHeight,
  );
  const minHeight = parseSize(
    style?.minHeight,
    availableHeight,
    viewportWidth,
    viewportHeight,
  );
  const maxHeight = parseSize(
    style?.maxHeight,
    availableHeight,
    viewportWidth,
    viewportHeight,
  );

  // padding 파싱 (C3: availableWidth 전달로 % 값 해석)
  let padding = parsePadding(style, availableWidth);

  // border 파싱
  let border = parseBorder(style);

  // Self-rendering 요소: inline style이 없으면 size config 기본값 적용
  // Select는 Compositional Architecture (Card와 동일) — BUTTON_SIZE_CONFIG 미적용
  // Select 컨테이너는 web CSS에서 padding:0 + display:flex 구조이며,
  // 내부 SelectTrigger가 자체 padding을 처리
  const tag = (element.tag ?? "").toLowerCase();
  const isFormElement = ["button", "input"].includes(tag);
  const inlineUISizeConfig = INLINE_UI_SIZE_CONFIGS[tag];
  const hasSizeConfig = isFormElement || !!inlineUISizeConfig;

  if (hasSizeConfig) {
    const props = element.props as Record<string, unknown> | undefined;
    const defaultSize = DEFAULT_SIZE_BY_TAG[tag] ?? "md";
    const size = (props?.size as string) ?? defaultSize;
    const configMap = isFormElement ? BUTTON_SIZE_CONFIG : inlineUISizeConfig!;
    const sizeConfig =
      configMap[size] ?? configMap[defaultSize] ?? Object.values(configMap)[0];

    const hasInlinePadding =
      style?.padding !== undefined ||
      style?.paddingTop !== undefined ||
      style?.paddingRight !== undefined ||
      style?.paddingBottom !== undefined ||
      style?.paddingLeft !== undefined;
    if (!hasInlinePadding) {
      padding = {
        top: sizeConfig.paddingY,
        right: sizeConfig.paddingRight,
        bottom: sizeConfig.paddingY,
        left: sizeConfig.paddingLeft,
      };
    }

    const hasInlineBorder =
      style?.borderWidth !== undefined ||
      style?.borderTopWidth !== undefined ||
      style?.borderRightWidth !== undefined ||
      style?.borderBottomWidth !== undefined ||
      style?.borderLeftWidth !== undefined;
    if (!hasInlineBorder) {
      border = {
        top: sizeConfig.borderWidth,
        right: sizeConfig.borderWidth,
        bottom: sizeConfig.borderWidth,
        left: sizeConfig.borderWidth,
      };
    }
  }

  // 🚀 Phase 11: box-sizing: border-box 처리
  // border-box인 경우 width/height에서 padding + border 제외하여 content-box 크기로 변환
  //
  // 🚀 Self-rendering 요소(button, input, select)도 border-box로 처리:
  // PixiButton 등은 명시적 width/height를 총 렌더링 크기(border-box)로 취급하지만,
  // BlockEngine은 content-box + padding + border로 합산하므로 이중 계산 발생.
  // Flex 경로에서는 stripSelfRenderedProps()로 해결하지만,
  // BlockEngine 경로에서는 parseBoxModel 단계에서 border-box 변환으로 해결.
  const boxSizing = style?.boxSizing as string | undefined;
  // Preview iframe는 전역 `* { box-sizing: border-box; }`를 사용한다.
  // Section/Card(Box)는 style.boxSizing이 비어 있어도 명시적 width/height를
  // border-box로 해석해야 Web 모드와 동일하게 총 크기(패딩 포함)가 유지된다.
  const isSectionElement = tag === "section";
  const isCardLikeElement = tag === "card" || tag === "box";
  const isCalendarElement = tag === "calendar";
  const isDatePickerElement = tag === "datepicker";
  const treatAsBorderBox =
    boxSizing === "border-box" ||
    (isFormElement && (width !== undefined || height !== undefined)) ||
    ((isSectionElement ||
      isCardLikeElement ||
      isCalendarElement ||
      isDatePickerElement) &&
      boxSizing !== "content-box" &&
      (width !== undefined || height !== undefined));

  // Button 등 self-rendering 요소의 텍스트 줄바꿈 높이를 정확히 계산하려면
  // 요소 자체의 border-box width를 사용해야 함 (부모의 availableWidth가 아닌)
  // border-box 변환 전에 원래 width를 저장
  const originalBorderBoxWidth = width;

  if (treatAsBorderBox) {
    const paddingH = padding.left + padding.right;
    const borderH = border.left + border.right;
    const paddingV = padding.top + padding.bottom;
    const borderV = border.top + border.bottom;

    // FIT_CONTENT sentinel은 border-box 변환 대상이 아님 (실제 px 값이 아니므로)
    if (width !== undefined && width !== FIT_CONTENT) {
      width = Math.max(0, width - paddingH - borderH);
    }
    if (height !== undefined && height !== FIT_CONTENT) {
      height = Math.max(0, height - paddingV - borderV);
    }
  }

  // 콘텐츠 크기 계산
  const elementAvailableWidth =
    originalBorderBoxWidth !== undefined &&
    originalBorderBoxWidth !== FIT_CONTENT
      ? originalBorderBoxWidth
      : availableWidth;
  const contentWidth = calculateContentWidth(element);
  const contentHeight = calculateContentHeight(element, elementAvailableWidth);

  return {
    width,
    height,
    minWidth,
    maxWidth,
    minHeight,
    maxHeight,
    contentWidth,
    contentHeight,
    padding,
    border,
  };
}

// ---------------------------------------------------------------------------
// Intrinsic Size 주입 (§6 P1: Taffy 엔진 공유)
// ---------------------------------------------------------------------------

/**
 * CSS 스펙에서 기본 display가 inline-block인 태그
 *
 * 레이아웃 엔진이 이 요소들을 block으로 처리할 때,
 * width가 없으면 100%로 확장된다.
 * fit-content 동작을 에뮬레이트하기 위해 intrinsic width를 주입한다.
 */
export const INLINE_BLOCK_TAGS = new Set([
  "button",
  "submitbutton",
  "fancybutton",
  "togglebutton",
  "badge",
  "tag",
  "chip",
  "checkbox",
  "radio",
  "switch",
  "togglebuttongroup",
]);

/**
 * 텍스트만 포함하는 리프 태그 — 줄바꿈 시 높이가 width에 따라 동적으로 변함
 * enrichWithIntrinsicSize 2-pass에서 width 변경 시 높이 재계산 대상
 */
export const TEXT_LEAF_TAGS = new Set([
  "text",
  "heading",
  "description",
  "label",
  "paragraph",
]);

/**
 * 리프 UI 컴포넌트에 intrinsic size(width/height)를 주입
 *
 * 레이아웃 엔진(Dropflow/Taffy)은 자식이 없는 블록의 height를 0으로 collapse하고,
 * block 요소의 width를 부모 100%로 확장한다.
 *
 * Button, Badge 등은 텍스트/인디케이터가 props에만 있어
 * 엔진이 콘텐츠 크기를 계산할 수 없다.
 *
 * parseBoxModel()의 contentWidth/contentHeight + spec padding/border를
 * 사용하여 border-box 크기를 CSS width/height로 주입한다.
 *
 * @param computedStyle - 상속 적용 후 해당 요소의 computed style (fontSize 등 활용)
 */
export function enrichWithIntrinsicSize(
  element: Element,
  availableWidth: number,
  availableHeight: number,
  _computedStyle?: ComputedStyle,
  childElements?: Element[],
  getChildElements?: (id: string) => Element[],
  isFlexChild?: boolean,
): Element {
  const style = element.props?.style as Record<string, unknown> | undefined;
  const tag = (element.tag ?? "").toLowerCase();

  const rawHeight = style?.height;
  const INTRINSIC_HEIGHT_KEYWORDS = new Set([
    "fit-content",
    "min-content",
    "max-content",
    "auto",
  ]);
  const needsHeight =
    !rawHeight || INTRINSIC_HEIGHT_KEYWORDS.has(rawHeight as string);

  const rawWidth = style?.width;
  const INTRINSIC_WIDTH_KEYWORDS = new Set([
    "fit-content",
    "min-content",
    "max-content",
    "auto",
  ]);
  // C1: 모든 요소에서 intrinsic width keyword(fit-content/min-content/max-content) 처리
  // INLINE_BLOCK 태그의 width:auto 자동 주입은 기존 동작 유지
  const hasExplicitIntrinsicWidthKeyword =
    typeof rawWidth === "string" &&
    rawWidth !== "auto" &&
    INTRINSIC_WIDTH_KEYWORDS.has(rawWidth);
  // Flex 자식인 TEXT_LEAF_TAGS(Label, Description 등)도 intrinsic width 필요:
  // Block layout에서는 자동 stretch되지만, Flex layout에서는 Taffy가 content size를
  // 알 수 없어 width=0으로 처리함 (Checkbox/Radio/Switch 내부 Label 세로 출력 버그)
  const needsWidth =
    hasExplicitIntrinsicWidthKeyword ||
    (INLINE_BLOCK_TAGS.has(tag) &&
      (!rawWidth || INTRINSIC_WIDTH_KEYWORDS.has(rawWidth as string))) ||
    (isFlexChild &&
      TEXT_LEAF_TAGS.has(tag) &&
      (!rawWidth || INTRINSIC_WIDTH_KEYWORDS.has(rawWidth as string)));

  if (!needsHeight && !needsWidth) return element;

  const box = parseBoxModel(element, availableWidth, availableHeight);

  // min-content / max-content 너비 직접 계산
  let resolvedIntrinsicWidth: number | undefined;
  if (
    needsWidth &&
    (rawWidth === "min-content" || rawWidth === "max-content")
  ) {
    const props = element.props as Record<string, unknown> | undefined;
    const textContent = String(
      props?.children ?? props?.text ?? props?.label ?? props?.title ?? "",
    );
    if (textContent) {
      const styleRecord = style as Record<string, unknown> | undefined;
      const fontSize =
        typeof styleRecord?.fontSize === "number"
          ? styleRecord.fontSize
          : (_computedStyle?.fontSize ?? 16);
      resolvedIntrinsicWidth =
        rawWidth === "min-content"
          ? calculateMinContentWidth(textContent, fontSize)
          : calculateMaxContentWidth(textContent, fontSize);
    }
  }

  // contentHeight <= 0이면 컨테이너 요소 (div, section 등) — 스킵
  // 단, ComboBox/Select 등 spec shapes 기반 입력 컴포넌트는 예외:
  // flex container 스타일(flexDirection: column)로 parseBoxModel이 contentHeight=0을 반환하지만,
  // calculateContentHeight에서 spec size 기반 높이를 산출하므로 height 주입이 필요함
  // 또한, childElements가 있는 컨테이너(CardHeader/CardContent 등)도 예외:
  // 자체 텍스트는 없지만 자식 요소의 높이를 합산해야 하므로 calculateContentHeight가 필요함
  // Select: Compositional Architecture — Card와 동일하게 자식 기반 높이 + padding 경로
  const SPEC_SHAPES_INPUT_TAGS = new Set(["dropdown", "breadcrumbs"]);
  if (
    box.contentHeight <= 0 &&
    !needsWidth &&
    !SPEC_SHAPES_INPUT_TAGS.has(tag) &&
    !(childElements && childElements.length > 0)
  ) {
    return element;
  }

  // 항상 border-box 값을 주입:
  // 웹 CSS의 * { box-sizing: border-box } 동작과 일치
  // content 크기 + padding + border = border-box 크기
  // Dropflow: border-box 네이티브 지원 (adapter에서 boxSizing: 'border-box' 고정)
  // Taffy 0.9: style.size를 border-box로 처리 → 변환 불필요

  const injectedStyle: Record<string, unknown> = { ...style };

  // Height 주입
  // childElements가 있으면 재계산 (CheckboxGroup 등 자식 기반 높이 필요)
  const childResolvedHeight =
    childElements && childElements.length > 0
      ? calculateContentHeight(
          element,
          availableWidth,
          childElements,
          getChildElements,
          _computedStyle,
        )
      : box.contentHeight;
  if (needsHeight && childResolvedHeight > 0) {
    let injectHeight = childResolvedHeight;
    // ComboBox/Select: calculateContentHeight가 전체 시각적 높이(label+input/trigger)를 반환
    // spec shapes가 내부 padding 없이 렌더링하므로 추가 padding/border 불필요
    const isSpecShapesInput = SPEC_SHAPES_INPUT_TAGS.has(tag);
    if (!isSpecShapesInput) {
      injectHeight += box.padding.top + box.padding.bottom;
      injectHeight += box.border.top + box.border.bottom;
    }
    injectedStyle.height = injectHeight;
  }

  // Width 주입 (inline-block 태그의 fit-content / min-content / max-content 에뮬레이션)
  // childElements가 있으면 재계산 (ToggleButtonGroup 등 자식이 Element로 저장된 경우)
  // childElements가 없어도 INLINE_BLOCK_TAGS(Tag, Badge 등)는 텍스트 기반 너비 계산 필요:
  // box.contentWidth는 availableWidth 기반이므로 fit-content 시 부모 전체 너비를 차지하는 버그 발생
  const childResolvedWidth =
    childElements && childElements.length > 0
      ? calculateContentWidth(
          element,
          childElements,
          getChildElements,
          _computedStyle,
        )
      : INLINE_BLOCK_TAGS.has(tag) || hasExplicitIntrinsicWidthKeyword
        ? calculateContentWidth(
            element,
            undefined,
            getChildElements,
            _computedStyle,
          )
        : box.contentWidth;
  const baseContentWidth = resolvedIntrinsicWidth ?? childResolvedWidth;
  if (needsWidth && baseContentWidth > 0) {
    let injectWidth = baseContentWidth;
    injectWidth += box.padding.left + box.padding.right;
    injectWidth += box.border.left + box.border.right;
    injectedStyle.width = injectWidth;
  }

  // 변경이 없으면 원본 반환
  if (
    injectedStyle.height === undefined &&
    injectedStyle.width === style?.width
  ) {
    return element;
  }

  return {
    ...element,
    props: {
      ...element.props,
      style: injectedStyle,
    },
  } as Element;
}

/**
 * vertical-align 값 파싱
 *
 * 지원 값: baseline (기본), top, bottom, middle
 * text-top, text-bottom, super, sub 등은 폰트 메트릭이 필요하여 baseline으로 폴백
 */
export function parseVerticalAlign(
  style: Record<string, unknown> | undefined,
): VerticalAlign {
  if (!style) return "baseline";

  const value = style.verticalAlign as string | undefined;
  if (!value) return "baseline";

  switch (value) {
    case "top":
      return "top";
    case "bottom":
      return "bottom";
    case "middle":
      return "middle";
    case "baseline":
    case "text-top":
    case "text-bottom":
    case "super":
    case "sub":
    default:
      // text-top/text-bottom/super/sub은 폰트 메트릭이 필요하여 baseline으로 폴백
      return "baseline";
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
  fontSize?: number,
): number | undefined {
  if (!style) return undefined;

  const value = style.lineHeight;
  if (value === undefined || value === "normal") return undefined;

  // 숫자 (배율)
  if (typeof value === "number") {
    const baseFontSize = fontSize ?? 16; // 기본 폰트 크기
    return value * baseFontSize;
  }

  // 문자열
  if (typeof value === "string") {
    const trimmed = value.trim();

    // px 값 (명시적으로 'px'가 있는 경우만)
    if (trimmed.endsWith("px")) {
      return parseFloat(trimmed);
    }

    // 숫자만 (배율) - CSS에서 line-height 숫자는 배율
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
// 🚀 텍스트가 수직 중앙 정렬되는 요소 (CSS baseline ≈ height/2)
// CSS에서 button/input/badge 등은 내부 텍스트가 수직 중앙 정렬되므로
// baseline이 요소의 수직 중앙 근처에 위치
const VERTICALLY_CENTERED_TAGS = new Set([
  "button",
  "submitbutton",
  "fancybutton",
  "togglebutton",
  "input",
  "select",
  "badge",
  "tag",
  "chip", // inline-flex 컴포넌트
]);

/**
 * 스타일에서 폰트 속성을 개별값으로 파싱
 *
 * measureFontMetrics()에 전달할 개별 폰트 속성 값을 추출합니다.
 * 기존 buildFontSpec()을 대체하여 구조화된 값으로 반환합니다.
 * 이를 통해 캐시 키 생성과 메트릭 측정을 효율적으로 수행합니다.
 */
interface ParsedFontProps {
  fontFamily: string;
  fontSize: number;
  fontWeight: string | number;
}

function parseFontProps(
  style: Record<string, unknown> | undefined,
): ParsedFontProps {
  if (!style) {
    return { fontFamily: "sans-serif", fontSize: 16, fontWeight: 400 };
  }

  const sizeProp = style.fontSize;
  const familyProp = style.fontFamily;
  const weightProp = style.fontWeight;

  // fontSize 파싱
  let fontSize = 16;
  if (typeof sizeProp === "number") {
    fontSize = sizeProp;
  } else if (typeof sizeProp === "string" && sizeProp.trim()) {
    const parsed = parseFloat(sizeProp.trim());
    if (!isNaN(parsed)) fontSize = parsed;
  }

  // fontFamily 파싱
  let fontFamily = "sans-serif";
  if (typeof familyProp === "string" && familyProp.trim()) {
    fontFamily = familyProp.trim();
  }

  // fontWeight 파싱
  let fontWeight: string | number = 400;
  if (typeof weightProp === "number") {
    fontWeight = weightProp;
  } else if (typeof weightProp === "string" && weightProp.trim()) {
    fontWeight = weightProp.trim();
  }

  return { fontFamily, fontSize, fontWeight };
}

/**
 * 스타일에서 FontMetrics를 조회 (캐싱 포함)
 *
 * textMeasure.ts의 measureFontMetrics()에 위임하여
 * Canvas 2D TextMetrics 기반 정밀 ascent/descent를 반환합니다.
 *
 * 기존 measureAlphabeticAscent() + measureAlphabeticDescent()를 통합 교체:
 *
 * [Before] 매 호출마다 document.createElement('canvas') 생성:
 *   - measureAlphabeticAscent(fontSpec) → 새 Canvas 생성 → ascent | null
 *   - measureAlphabeticDescent(fontSpec) → 새 Canvas 생성 → descent | null
 *   - 2번 호출 시 Canvas 4개 생성 (ascent + descent 각각)
 *
 * [After] 싱글톤 context + Map 캐시로 O(1) 조회:
 *   - getFontMetricsFromStyle(style) → { ascent, descent, fontHeight }
 *   - 캐시 히트 시 Canvas context 접근 없음
 *   - SSR 환경에서도 fontSize 기반 근사값 자동 반환 (null 대신)
 */
function getFontMetricsFromStyle(
  style: Record<string, unknown> | undefined,
): FontMetrics {
  const { fontFamily, fontSize, fontWeight } = parseFontProps(style);
  return measureFontMetrics(fontFamily, fontSize, fontWeight);
}

/**
 * inline-block 요소의 baseline 위치 계산
 *
 * CSS 명세 (Chrome 구현):
 * - 일반적인 경우: 마지막 줄 텍스트의 baseline
 * - overflow: hidden/auto/scroll → margin-box 하단
 * - 콘텐츠 없음 → margin-box 하단
 *
 * Wave 3 정밀화: measureFontMetrics()의 캐싱된 ascent/descent를 활용하여
 * 폰트 메트릭 기반 정밀 계산을 수행합니다.
 * 기존 measureAlphabeticAscent()/measureAlphabeticDescent()의 매 호출
 * Canvas 생성 문제를 해결하고, SSR 환경에서도 근사값을 안정적으로 제공합니다.
 *
 * @param element - 대상 요소
 * @param height - 요소 높이 (margin 제외)
 * @returns baseline 위치 (요소 상단 기준 오프셋)
 *
 * @example
 * // 높이 100px, baseline이 하단에서 20px 위
 * calculateBaseline(element, 100) // → 80 (상단에서 80px 아래)
 */
export function calculateBaseline(element: Element, height: number): number {
  const style = element.props?.style as Record<string, unknown> | undefined;
  const tag = (element.tag ?? "").toLowerCase();

  // overflow가 visible이 아니면 하단이 baseline
  const overflow = style?.overflow as string | undefined;
  const overflowX = style?.overflowX as string | undefined;
  const overflowY = style?.overflowY as string | undefined;

  if (
    (overflow && overflow !== "visible") ||
    (overflowX && overflowX !== "visible") ||
    (overflowY && overflowY !== "visible")
  ) {
    return height; // 하단
  }

  // 콘텐츠가 없으면 하단이 baseline
  // 높이가 0이면 콘텐츠 없음으로 간주
  if (height === 0) {
    return 0;
  }

  // 폰트 메트릭 조회 (캐싱됨, SSR-safe — 근사값 자동 반환)
  const fm = getFontMetricsFromStyle(style);

  // 버튼/input 등 텍스트 수직 중앙 정렬 요소
  // CSS에서 이 요소들의 baseline은 수직 중앙의 텍스트 baseline
  if (VERTICALLY_CENTERED_TAGS.has(tag)) {
    // baseline = (height - effectiveLineHeight) / 2 + ascent
    const lineHeight = parseLineHeight(style);
    const effectiveLineHeight = lineHeight ?? height;

    // 텍스트 블록은 요소 수직 중앙에 위치:
    //   텍스트 블록 상단 = (height - effectiveLineHeight) / 2
    const textBlockTop = (height - effectiveLineHeight) / 2;
    return textBlockTop + fm.ascent;
  }

  // 일반적인 경우: 폰트 메트릭 기반 baseline 계산
  const lineHeight = parseLineHeight(style);

  if (lineHeight !== undefined && lineHeight <= height) {
    // line-height가 있으면 half-leading 모델로 정밀 계산
    // CSS half-leading: (lineHeight - fontHeight) / 2
    // baseline from line box top = half-leading + ascent
    const halfLeading = (lineHeight - fm.fontHeight) / 2;

    if (height <= lineHeight * 1.5) {
      // 단일 줄로 간주
      return Math.max(halfLeading + fm.ascent, 0);
    } else {
      // 여러 줄: 마지막 줄 baseline
      return height - lineHeight + halfLeading + fm.ascent;
    }
  }

  // line-height 없음: 요소 높이를 단일 line box로 간주
  // ascent가 곧 baseline 위치
  return fm.ascent;
}

// ============================================
// white-space 기반 텍스트 측정
// ============================================

/**
 * white-space CSS 속성에 따른 텍스트 크기 측정
 *
 * - normal: 공백 축소 + 자동 줄바꿈 (기본 동작)
 * - nowrap: 공백 축소 + 줄바꿈 없이 한 줄
 * - pre: 공백 보존 + \n만 줄바꿈, 자동 줄바꿈 없음
 * - pre-wrap: 공백 보존 + \n + 자동 줄바꿈
 * - pre-line: 공백 축소 + \n + 자동 줄바꿈
 */
export function measureTextWithWhiteSpace(
  text: string,
  fontSize: number,
  fontFamily: string,
  fontWeight: number | string,
  whiteSpace: string,
  maxWidth: number,
  wordBreak?: string,
  overflowWrap?: string,
): { width: number; height: number } {
  // CSS line-height: normal 근사값 (fontBoundingBox 기반)
  const fm = measureFontMetrics(fontFamily, fontSize, fontWeight);
  const lineHeight = fm.lineHeight;

  // ADR-008: word-break/overflow-wrap 타입 캐스팅
  const wb = wordBreak as "normal" | "break-all" | "keep-all" | undefined;
  const ow = overflowWrap as "normal" | "break-word" | "anywhere" | undefined;

  switch (whiteSpace) {
    case "nowrap": {
      // 줄바꿈 없이 한 줄
      const width = measureTextWidth(text, fontSize, fontFamily, fontWeight);
      return { width, height: lineHeight };
    }
    case "pre": {
      // \n만 줄바꿈, 자동 줄바꿈 없음
      const lines = text.split("\n");
      let maxLineWidth = 0;
      for (const line of lines) {
        const w = measureTextWidth(line, fontSize, fontFamily, fontWeight);
        if (w > maxLineWidth) maxLineWidth = w;
      }
      return { width: maxLineWidth, height: lines.length * lineHeight };
    }
    case "pre-wrap":
    case "pre-line": {
      // \n + 자동 줄바꿈 (pre-line은 공백 축소)
      const processedText =
        whiteSpace === "pre-line" ? text.replace(/[ \t]+/g, " ") : text;
      return {
        width: maxWidth,
        height: measureWrappedTextHeight(
          processedText,
          fontSize,
          fontWeight,
          fontFamily,
          maxWidth,
          undefined,
          wb,
          ow,
        ),
      };
    }
    default: {
      // normal: 기본 동작
      return {
        width: maxWidth,
        height: measureWrappedTextHeight(
          text,
          fontSize,
          fontWeight,
          fontFamily,
          maxWidth,
          undefined,
          wb,
          ow,
        ),
      };
    }
  }
}

// ============================================
// min-content / max-content 텍스트 너비 측정
// ============================================

/**
 * min-content 너비 계산
 *
 * CSS min-content: 가장 긴 단어(줄바꿈 불가능한 최소 단위)의 너비.
 * 텍스트를 단어 단위로 분리하여 가장 긴 단어의 렌더링 너비를 반환한다.
 *
 * @param text - 측정할 텍스트
 * @param fontSize - 폰트 크기 (기본 14px)
 * @param fontFamily - 폰트 패밀리
 * @param fontWeight - 폰트 두께
 * @returns 가장 긴 단어의 px 너비
 */
export function calculateMinContentWidth(
  text: string,
  fontSize: number = 14,
  fontFamily: string = specFontFamily.sans,
  fontWeight: number | string = 400,
): number {
  if (!text) return 0;

  // 공백/줄바꿈/탭으로 단어 분리
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;

  let maxWordWidth = 0;
  for (const word of words) {
    const width = measureTextWidth(word, fontSize, fontFamily, fontWeight);
    if (width > maxWordWidth) {
      maxWordWidth = width;
    }
  }

  return Math.ceil(maxWordWidth);
}

/**
 * max-content 너비 계산
 *
 * CSS max-content: 줄바꿈 없이 한 줄로 렌더링했을 때의 전체 너비.
 *
 * @param text - 측정할 텍스트
 * @param fontSize - 폰트 크기 (기본 14px)
 * @param fontFamily - 폰트 패밀리
 * @param fontWeight - 폰트 두께
 * @returns 전체 텍스트의 한 줄 px 너비
 */
export function calculateMaxContentWidth(
  text: string,
  fontSize: number = 14,
  fontFamily: string = specFontFamily.sans,
  fontWeight: number | string = 400,
): number {
  if (!text) return 0;

  return Math.ceil(measureTextWidth(text, fontSize, fontFamily, fontWeight));
}

// ─── Taffy 엔진 공용 유틸리티 ─────────────────────────────────────────

/**
 * RC-3: CSS prop → number | string 파서 (단위 정규화 적용)
 *
 * rem, em, vh, vw, calc() 등을 resolveCSSSizeValue()로 해석.
 * % 값은 Taffy 네이티브 % 처리를 위해 문자열 그대로 반환.
 *
 * TaffyFlexEngine, TaffyGridEngine 공용
 */
export function parseCSSPropWithContext(
  value: unknown,
  ctx: CSSValueContext = {},
): number | string | undefined {
  if (value === undefined || value === null || value === "" || value === "auto")
    return undefined;
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    // % 값은 Taffy가 네이티브로 처리
    if (value.endsWith("%")) return value;
    // intrinsic sizing 키워드는 Taffy에서 미지원 → undefined
    if (
      value === "fit-content" ||
      value === "min-content" ||
      value === "max-content"
    )
      return undefined;
    // resolveCSSSizeValue: rem, em, vh, vw, calc(), clamp(), min(), max() 해석
    const px = resolveCSSSizeValue(value, ctx);
    if (px !== undefined && px >= 0) return px;
    // fallback: parseFloat (순수 숫자 문자열)
    const num = parseFloat(value);
    if (!isNaN(num)) return num;
  }
  return undefined;
}

/**
 * Taffy 공통 스타일 적용: Size + Min/Max + Padding + Border + Gap
 *
 * TaffyFlexEngine과 TaffyGridEngine 양쪽에서 동일한 Box model + Gap 변환을
 * 중복 없이 적용하기 위한 헬퍼.
 *
 * Position, Margin(auto), Inset은 엔진별 차이가 있으므로 포함하지 않음.
 */
export function applyCommonTaffyStyle(
  result: Record<string, unknown>,
  style: Record<string, unknown>,
  ctx: CSSValueContext,
): void {
  // Size — parseCSSPropWithContext가 number|string|undefined 반환
  // normalizeStyle.dimToString()이 JSON 직렬화 시 number → "Npx" 변환
  const widthVal = parseCSSPropWithContext(style.width, ctx);
  const heightVal = parseCSSPropWithContext(style.height, ctx);
  if (widthVal !== undefined) result.width = widthVal;
  if (heightVal !== undefined) result.height = heightVal;

  // Min/Max size
  const minW = parseCSSPropWithContext(style.minWidth, ctx);
  const minH = parseCSSPropWithContext(style.minHeight, ctx);
  const maxW = parseCSSPropWithContext(style.maxWidth, ctx);
  const maxH = parseCSSPropWithContext(style.maxHeight, ctx);
  if (minW !== undefined) result.minWidth = minW;
  if (minH !== undefined) result.minHeight = minH;
  if (maxW !== undefined) result.maxWidth = maxW;
  if (maxH !== undefined) result.maxHeight = maxH;

  // Padding — 숫자 직접 전달
  const padding = parsePadding(style);
  if (padding.top !== 0) result.paddingTop = padding.top;
  if (padding.right !== 0) result.paddingRight = padding.right;
  if (padding.bottom !== 0) result.paddingBottom = padding.bottom;
  if (padding.left !== 0) result.paddingLeft = padding.left;

  // Border — 숫자 직접 전달
  const border = parseBorder(style);
  if (border.top !== 0) result.borderTop = border.top;
  if (border.right !== 0) result.borderRight = border.right;
  if (border.bottom !== 0) result.borderBottom = border.bottom;
  if (border.left !== 0) result.borderLeft = border.left;

  // Taffy 0.9는 style.size를 border-box로 처리합니다.
  // XStudio의 * { box-sizing: border-box } 값을 그대로 전달하면
  // Taffy가 내부적으로 content = size - padding - border를 계산합니다.
  // layout.size도 border-box를 반환하므로 추가 변환 불필요.

  // Gap — parseCSSPropWithContext 결과 직접 전달 (number 또는 % 문자열)
  const gap = parseCSSPropWithContext(style.gap, ctx);
  const rowGap = parseCSSPropWithContext(style.rowGap, ctx);
  const columnGap = parseCSSPropWithContext(style.columnGap, ctx);
  if (gap !== undefined) {
    result.rowGap = gap;
    result.columnGap = gap;
  }
  if (rowGap !== undefined) result.rowGap = rowGap;
  if (columnGap !== undefined) result.columnGap = columnGap;

  // Overflow — Taffy가 scroll/hidden 컨테이너의 크기 계산에 사용
  if (style.overflow) {
    result.overflowX = style.overflow;
    result.overflowY = style.overflow;
  }
  if (style.overflowX) result.overflowX = style.overflowX;
  if (style.overflowY) result.overflowY = style.overflowY;

  // Aspect ratio
  if (style.aspectRatio !== undefined) result.aspectRatio = style.aspectRatio;
}

/**
 * CSS flex item 속성을 Taffy 스타일에 적용.
 *
 * CSS 명세: flex/grid 부모의 모든 자식은 자신의 display와 무관하게
 * flex/grid item으로 참여한다. 자식의 display는 내부 formatting context만 결정.
 *
 * TaffyFlexEngine.elementToTaffyStyle()의 flex item 파싱 로직(L147-201)과
 * 동일한 규칙을 적용하여, block/grid 경로에서도 재사용 가능하게 한다.
 *
 * @param result - 스타일 결과 객체 (in-place 수정)
 * @param style  - 요소의 원본 CSS 스타일
 * @param ctx    - CSS 값 파싱 컨텍스트
 */
export function applyFlexItemProperties(
  result: Record<string, unknown>,
  style: Record<string, unknown>,
  ctx: CSSValueContext = {},
): void {
  // flex shorthand → flexGrow/flexShrink/flexBasis 분해
  // result에 이미 값이 있으면(taffyConfig 패스스루 등) shorthand로 덮어쓰지 않음
  if (style.flex !== undefined && style.flex !== null) {
    const flexVal = style.flex;
    if (typeof flexVal === "number") {
      // flex: 1 → flexGrow: 1, flexShrink: 1, flexBasis: 0%
      if (style.flexGrow === undefined && result.flexGrow === undefined)
        result.flexGrow = flexVal;
      if (style.flexShrink === undefined && result.flexShrink === undefined)
        result.flexShrink = 1;
      if (style.flexBasis === undefined && result.flexBasis === undefined)
        result.flexBasis = "0%";
    } else if (typeof flexVal === "string") {
      const parts = String(flexVal).trim().split(/\s+/);
      if (parts.length === 1) {
        const n = Number(parts[0]);
        if (!isNaN(n)) {
          if (style.flexGrow === undefined && result.flexGrow === undefined)
            result.flexGrow = n;
          if (style.flexShrink === undefined && result.flexShrink === undefined)
            result.flexShrink = 1;
          if (style.flexBasis === undefined && result.flexBasis === undefined)
            result.flexBasis = "0%";
        } else if (parts[0] === "auto") {
          if (style.flexGrow === undefined && result.flexGrow === undefined)
            result.flexGrow = 1;
          if (style.flexShrink === undefined && result.flexShrink === undefined)
            result.flexShrink = 1;
        } else if (parts[0] === "none") {
          if (style.flexGrow === undefined && result.flexGrow === undefined)
            result.flexGrow = 0;
          if (style.flexShrink === undefined && result.flexShrink === undefined)
            result.flexShrink = 0;
        }
      } else if (parts.length >= 2) {
        if (style.flexGrow === undefined && result.flexGrow === undefined)
          result.flexGrow = Number(parts[0]) || 0;
        if (style.flexShrink === undefined && result.flexShrink === undefined)
          result.flexShrink = Number(parts[1]) || 0;
        if (
          parts[2] &&
          style.flexBasis === undefined &&
          result.flexBasis === undefined
        ) {
          const basisVal = parseCSSPropWithContext(parts[2], ctx);
          if (basisVal !== undefined) result.flexBasis = basisVal;
        } else if (
          !parts[2] &&
          style.flexBasis === undefined &&
          result.flexBasis === undefined
        ) {
          result.flexBasis = "0%";
        }
      }
    }
  }

  // 개별 속성은 shorthand/taffyConfig 모두를 덮어씀 (CSS 우선순위)
  if (style.flexGrow !== undefined) result.flexGrow = Number(style.flexGrow);
  if (style.flexShrink !== undefined)
    result.flexShrink = Number(style.flexShrink);
  if (style.flexBasis !== undefined) {
    const basis = parseCSSPropWithContext(style.flexBasis, ctx);
    if (basis !== undefined) result.flexBasis = basis;
  }

  // order (flex/grid item 공통)
  if (style.order !== undefined) {
    const order = parseInt(String(style.order), 10);
    if (!isNaN(order) && order !== 0) result.order = order;
  }
}

/**
 * Taffy 엔진 공통 CSS 컨텍스트 구성
 *
 * 부모 요소의 computed style과 CSS 단위 해석용 컨텍스트를 생성.
 * TaffyFlexEngine.calculate()와 TaffyGridEngine.calculate()에서 동일.
 */
export function resolveParentContext(
  parent: Element,
  context?: LayoutContext,
): { parentComputed: ComputedStyle; cssCtx: CSSValueContext } {
  const parentRawStyle = parent.props?.style as
    | Record<string, unknown>
    | undefined;
  const parentComputed =
    context?.parentComputedStyle ??
    resolveStyle(parentRawStyle, ROOT_COMPUTED_STYLE);

  const cssCtx: CSSValueContext = {
    viewportWidth:
      context?.viewportWidth ??
      (typeof window !== "undefined" ? window.innerWidth : 1920),
    viewportHeight:
      context?.viewportHeight ??
      (typeof window !== "undefined" ? window.innerHeight : 1080),
    parentSize: parentComputed.fontSize,
    rootFontSize: 16,
  };

  return { parentComputed, cssCtx };
}
