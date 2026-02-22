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

import type { Margin, BoxModel, VerticalAlign } from './types';
import type { Element } from '../../../../../types/core/store.types';
import { fontFamily as specFontFamily } from '@xstudio/specs';
import { measureWrappedTextHeight, measureFontMetrics } from '../../utils/textMeasure';
import type { FontMetrics } from '../../utils/textMeasure';
import {
  resolveCSSSizeValue,
  FIT_CONTENT as CSS_FIT_CONTENT,
  MIN_CONTENT as CSS_MIN_CONTENT,
  MAX_CONTENT as CSS_MAX_CONTENT,
  parseBorderShorthand,
} from './cssValueParser';
import type { CSSValueContext, CSSVariableScope } from './cssValueParser';
import type { ComputedStyle } from './cssResolver';

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
  if (value === undefined || value === 'auto') return undefined;

  // C2: % 값인데 available이 음수(sentinel -1)이면 auto로 처리
  // CSS 스펙: auto height 부모의 블록 컨텍스트에서 자식의 percentage height는 auto
  if (typeof value === 'string' && value.endsWith('%') && available < 0) {
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
function resolvePercentValue(value: unknown, containerWidth?: number): number | undefined {
  if (typeof value !== 'string' || !value.endsWith('%')) return undefined;
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
  if (typeof value === 'number') {
    return { top: value, right: value, bottom: value, left: value };
  }
  if (typeof value !== 'string') return zero;

  const tokens = value.split(/\s+/);
  const parts = tokens.map((token) => {
    // px/number 먼저 시도
    const parsed = parseShorthandValue(token);
    if (parsed !== undefined) return parsed;
    // C3: % 해석 시도 (containerWidth 기준)
    if (token.endsWith('%') && containerWidth !== undefined && containerWidth > 0) {
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
 *
 * C3: containerWidth가 제공되면 % 값을 해석
 * CSS 스펙: margin의 % 값은 포함 블록의 width 기준 (4면 모두)
 */
export function parseMargin(style: Record<string, unknown> | undefined, containerWidth?: number): Margin {
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
    top: parseNumericValue(style.marginTop) ?? resolvePercentValue(style.marginTop, containerWidth) ?? base.top,
    right: parseNumericValue(style.marginRight) ?? resolvePercentValue(style.marginRight, containerWidth) ?? base.right,
    bottom: parseNumericValue(style.marginBottom) ?? resolvePercentValue(style.marginBottom, containerWidth) ?? base.bottom,
    left: parseNumericValue(style.marginLeft) ?? resolvePercentValue(style.marginLeft, containerWidth) ?? base.left,
  };
}

/**
 * 스타일에서 패딩 파싱
 *
 * C3: containerWidth가 제공되면 % 값을 해석
 * CSS 스펙: padding의 % 값은 포함 블록의 width 기준 (4면 모두)
 */
export function parsePadding(style: Record<string, unknown> | undefined, containerWidth?: number): Margin {
  if (!style) {
    return { top: 0, right: 0, bottom: 0, left: 0 };
  }

  const base =
    style.padding !== undefined
      ? parseShorthand(style.padding, containerWidth)
      : { top: 0, right: 0, bottom: 0, left: 0 };

  return {
    top: parseNumericValue(style.paddingTop) ?? resolvePercentValue(style.paddingTop, containerWidth) ?? base.top,
    right: parseNumericValue(style.paddingRight) ?? resolvePercentValue(style.paddingRight, containerWidth) ?? base.right,
    bottom: parseNumericValue(style.paddingBottom) ?? resolvePercentValue(style.paddingBottom, containerWidth) ?? base.bottom,
    left: parseNumericValue(style.paddingLeft) ?? resolvePercentValue(style.paddingLeft, containerWidth) ?? base.left,
  };
}

/**
 * 스타일에서 보더 너비 파싱
 *
 * H4: CSS border shorthand `border: "1px solid red"` 지원 추가
 * 빌더의 개별 속성(borderTopWidth 등) 우선, borderWidth shorthand 차선,
 * border shorthand("1px solid red")가 최종 폴백으로 적용됩니다.
 */
export function parseBorder(style: Record<string, unknown> | undefined): Margin {
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
      : { top: shorthandWidth, right: shorthandWidth, bottom: shorthandWidth, left: shorthandWidth };

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
const BUTTON_SIZE_CONFIG: Record<string, {
  height?: number;
  paddingLeft: number;
  paddingRight: number;
  paddingY: number;
  fontSize: number;
  borderWidth: number;
}> = {
  // @sync Button.css [data-size] padding 값과 일치해야 함
  // @sync Button.css base: border: 1px solid (all variants, all sizes)
  // CSS Button은 명시적 height를 설정하지 않음 → line-height:normal + padding + border로 자동 결정
  // height를 지정하면 CSS 렌더링과 불일치 (CSS는 fontBoundingBox 기반 line-height 사용)
  xs: { paddingLeft: 8, paddingRight: 8, paddingY: 2, fontSize: 12, borderWidth: 1 },
  sm: { paddingLeft: 12, paddingRight: 12, paddingY: 4, fontSize: 14, borderWidth: 1 },
  md: { paddingLeft: 24, paddingRight: 24, paddingY: 8, fontSize: 16, borderWidth: 1 },
  lg: { paddingLeft: 32, paddingRight: 32, paddingY: 12, fontSize: 18, borderWidth: 1 },
  xl: { paddingLeft: 40, paddingRight: 40, paddingY: 16, fontSize: 20, borderWidth: 1 },
};

/** PixiButton MIN_BUTTON_HEIGHT과 동일 */
const MIN_BUTTON_HEIGHT = 24;

/**
 * Badge/Tag/Chip size별 설정
 *
 * cssVariableReader.ts의 BADGE_FALLBACKS와 1:1 동기화
 * PixiBadge 렌더링과 동일한 레이아웃 크기 보장
 */
const BADGE_SIZE_CONFIG: Record<string, {
  paddingLeft: number;
  paddingRight: number;
  paddingY: number;
  fontSize: number;
  borderWidth: number;
  minWidth: number;
  height: number;
}> = {
  // xs/xl은 BADGE_FALLBACKS에 없으므로 sm/lg 기준 추정
  xs: { paddingLeft: 8, paddingRight: 8, paddingY: 1, fontSize: 12, borderWidth: 0, minWidth: 16, height: 16 },
  sm: { paddingLeft: 12, paddingRight: 12, paddingY: 2, fontSize: 14, borderWidth: 0, minWidth: 20, height: 20 },
  md: { paddingLeft: 12, paddingRight: 12, paddingY: 8, fontSize: 16, borderWidth: 0, minWidth: 24, height: 24 },
  lg: { paddingLeft: 16, paddingRight: 16, paddingY: 8, fontSize: 18, borderWidth: 0, minWidth: 28, height: 28 },
  xl: { paddingLeft: 20, paddingRight: 20, paddingY: 10, fontSize: 20, borderWidth: 0, minWidth: 32, height: 32 },
};

/**
 * ToggleButton size별 설정
 *
 * @sync ToggleButton.css [data-size] padding 값과 일치해야 함
 * Button.css와 동일한 padding 사용
 */
const TOGGLEBUTTON_SIZE_CONFIG: Record<string, {
  paddingLeft: number;
  paddingRight: number;
  paddingY: number;
  fontSize: number;
  borderWidth: number;
}> = {
  // @sync ToggleButton.css [data-size] padding 값과 일치해야 함
  sm: { paddingLeft: 12, paddingRight: 12, paddingY: 4, fontSize: 14, borderWidth: 1 },   // --spacing-md = 12px
  md: { paddingLeft: 24, paddingRight: 24, paddingY: 8, fontSize: 16, borderWidth: 1 },   // --spacing-xl = 24px
  lg: { paddingLeft: 32, paddingRight: 32, paddingY: 12, fontSize: 18, borderWidth: 1 },  // --spacing-2xl = 32px
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
const INLINE_UI_SIZE_CONFIGS: Record<string, Record<string, {
  paddingLeft: number;
  paddingRight: number;
  paddingY: number;
  fontSize: number;
  borderWidth: number;
  minWidth?: number;
  height?: number;
}>> = {
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
): { paddingY: number; paddingX: number; fontSize: number; borderWidth: number } | null {
  const t = tag.toLowerCase();

  // button / submitbutton / fancybutton → BUTTON_SIZE_CONFIG
  if (t === 'button' || t === 'submitbutton' || t === 'fancybutton') {
    const size = sizePropValue ?? 'sm';
    const c = BUTTON_SIZE_CONFIG[size] ?? BUTTON_SIZE_CONFIG['sm'];
    return { paddingY: c.paddingY, paddingX: c.paddingLeft, fontSize: c.fontSize, borderWidth: c.borderWidth };
  }

  // togglebutton → TOGGLEBUTTON_SIZE_CONFIG
  if (t === 'togglebutton') {
    const size = sizePropValue ?? 'md';
    const c = TOGGLEBUTTON_SIZE_CONFIG[size] ?? TOGGLEBUTTON_SIZE_CONFIG['md'];
    return { paddingY: c.paddingY, paddingX: c.paddingLeft, fontSize: c.fontSize, borderWidth: c.borderWidth };
  }

  return null;
}

/**
 * Canvas 2D 텍스트 측정용 컨텍스트 (싱글톤)
 *
 * PixiButton의 measureTextSize()와 동일한 결과를 위해
 * Canvas 2D measureText() 사용
 */
let measureCanvas: HTMLCanvasElement | null = null;
let measureContext: CanvasRenderingContext2D | null = null;

function getMeasureContext(): CanvasRenderingContext2D | null {
  if (!measureContext) {
    if (typeof document === 'undefined') return null;
    measureCanvas = document.createElement('canvas');
    measureContext = measureCanvas.getContext('2d');
  }
  return measureContext;
}

/**
 * Canvas 2D를 사용하여 텍스트 너비 측정
 *
 * PixiButton의 measureTextSize()와 동일한 결과를 반환
 *
 * @param text - 측정할 텍스트
 * @param fontSize - 폰트 크기 (기본 14px)
 * @param fontFamily - 폰트 패밀리 (기본 Pretendard)
 */
export function measureTextWidth(
  text: string,
  fontSize: number = 14,
  fontFamily: string = specFontFamily.sans,
  fontWeight: number | string = 400,
): number {
  if (!text) return 0;

  const ctx = getMeasureContext();
  if (!ctx) {
    // Canvas 미지원 환경: 추정값 사용
    return text.length * (fontSize * 0.5);
  }

  ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  const metrics = ctx.measureText(text);
  return metrics.width;
}

/**
 * 텍스트 콘텐츠 추출
 *
 * 다양한 prop에서 텍스트 문자열 추출
 * 우선순위: children > text > label > title > placeholder > value
 */
function extractTextContent(props: Record<string, unknown> | undefined): string {
  if (!props) return '';

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

  return '';
}

/**
 * 단일 값에서 텍스트 추출
 */
function extractFromValue(value: unknown): string {
  if (value === undefined || value === null) return '';

  // 문자열
  if (typeof value === 'string') return value;

  // 숫자
  if (typeof value === 'number') return String(value);

  // 배열 (복수 children)
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === 'string') return item;
        if (typeof item === 'number') return String(item);
        return '';
      })
      .join('');
  }

  return '';
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
function calculateTextWidth(text: string, fontSize: number = 14, padding: number = 0): number {
  if (!text) return 0;

  const textWidth = measureTextWidth(text, fontSize);
  // 🚀 Phase 12 Fix: Math.ceil → Math.round
  // Math.ceil은 항상 +1px 올림되어 inline-block 버튼 간 ~1px 가로 여백 발생
  // Math.round로 변경하여 CSS와 동일한 정합성 확보
  return Math.round(textWidth + padding);
}

/** 컴포넌트별 기본 size prop 값 */
const DEFAULT_SIZE_BY_TAG: Record<string, string> = {
  // Badge 계열: PixiBadge와 동일하게 'md' 기본값
  badge: 'md',
  tag: 'md',
  chip: 'md',
  // Button 계열: 'sm' 기본값
  button: 'sm',
  submitbutton: 'sm',
  fancybutton: 'sm',
  input: 'sm',
  select: 'sm',
  a: 'sm',
  togglebutton: 'sm',
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
): number {
  const style = element.props?.style as Record<string, unknown> | undefined;
  const tag = (element.tag ?? '').toLowerCase();

  // 1. 명시적 width가 있으면 사용
  const explicitWidth = parseNumericValue(style?.width);
  if (explicitWidth !== undefined) return explicitWidth;

  // 🚀 ToggleButtonGroup: 자식 버튼 텍스트 크기 합산
  // PixiToggleButtonGroup.tsx의 buttonSizes/contentWidth와 동일한 공식
  if (tag === 'togglebuttongroup') {
    const props = element.props as Record<string, unknown> | undefined;
    const sizeName = (props?.size as string) ?? 'md';
    const sizeConfig = TOGGLEBUTTON_SIZE_CONFIG[sizeName] ?? TOGGLEBUTTON_SIZE_CONFIG['md'];
    const borderWidth = sizeConfig.borderWidth;
    const paddingX = sizeConfig.paddingLeft; // paddingLeft === paddingRight
    const fontSize = sizeConfig.fontSize;
    const orientation = String(props?.orientation || 'horizontal');
    const isHorizontal = orientation === 'horizontal';
    const gap = parseNumericValue(style?.gap) ?? 0; // CSS gap (0 = default -1px overlap)

    // items 배열에서 레이블 추출
    const items = Array.isArray(props?.items) ? props.items as unknown[] : [];

    // items prop이 없으면 child elements에서 레이블 추출
    if (items.length === 0 && childElements && childElements.length > 0) {
      for (const child of childElements) {
        const childProps = child.props as Record<string, unknown> | undefined;
        const label = String(childProps?.children ?? childProps?.text ?? childProps?.label ?? '');
        if (label) {
          items.push(label);
        }
      }
    }

    if (items.length > 0) {
      const buttonWidths = items.map((item) => {
        const label = typeof item === 'string'
          ? item
          : (item as Record<string, unknown>)?.label as string ?? (item as Record<string, unknown>)?.children as string ?? '';
        const textWidth = calculateTextWidth(String(label), fontSize, 0);
        return Math.max(40, borderWidth + paddingX + textWidth + paddingX + borderWidth);
      });
      if (isHorizontal) {
        // horizontal: 버튼 너비 합 + gap * (n-1) - margin overlap(1px * (n-1))
        return buttonWidths.reduce((sum, w) => sum + w, 0) + gap * (items.length - 1) - (items.length - 1);
      }
      // vertical: 가장 넓은 버튼
      return Math.max(...buttonWidths);
    }
    // items도 children도 없으면 기본값
    return DEFAULT_WIDTH;
  }

  // 2. Flex 컨테이너: childElements 기반 재귀 너비 계산 (텍스트 추출보다 먼저 처리)
  // TagGroup(flex column, fit-content), TagList(flex row) 등 컨테이너 컴포넌트의
  // intrinsic width를 자식 요소들의 실제 border-box 너비에서 산출
  // ⚠️ 반드시 extractTextContent보다 먼저 와야 함:
  //    TagGroup.props.label = "Tag Group"이 텍스트로 추출되면 ~63px이 반환되어
  //    자식 기반 너비(~132px)에 도달하지 못함
  if (childElements && childElements.length > 0) {
    const display = style?.display;
    if (display === 'flex' || display === 'inline-flex') {
      const flexDir = (style?.flexDirection as string) || 'row';
      const gap = parseNumericValue(style?.gap) ?? 0;
      const isRow = flexDir === 'row' || flexDir === 'row-reverse';

      const childWidths = childElements.map(child => {
        const childStyle = child.props?.style as Record<string, unknown> | undefined;
        const explicitW = parseNumericValue(childStyle?.width);
        if (explicitW !== undefined) return explicitW;
        // content-box 너비
        const grandChildren = getChildElements?.(child.id);
        const contentW = calculateContentWidth(child, grandChildren, getChildElements);
        // border-box 산출: enrichWithIntrinsicSize와 동일하게 padding + border 추가
        // (Tag, Badge 등 INLINE_BLOCK_TAGS의 spec padding/border가 포함되어야 함)
        const childBox = parseBoxModel(child, 0, -1);
        return contentW + childBox.padding.left + childBox.padding.right
          + childBox.border.left + childBox.border.right;
      });

      if (isRow) {
        return childWidths.reduce((sum, w) => sum + w, 0)
          + gap * Math.max(0, childElements.length - 1);
      }
      return Math.max(...childWidths, 0);
    }
  }

  // 3. 텍스트 콘텐츠 기반 너비 측정 (Canvas 2D measureText 사용)
  const text = extractTextContent(element.props as Record<string, unknown>);

  // 🚀 Checkbox/Radio/Switch: flexDirection에 따른 너비 계산
  // Switch/Toggle의 indicatorWidth는 Switch.spec.ts의 trackWidth 기준 (36/44/52)
  const INLINE_FORM_INDICATOR_WIDTHS: Record<string, Record<string, number>> = {
    checkbox: { sm: 16, md: 20, lg: 24 },
    radio: { sm: 16, md: 20, lg: 24 },
    switch: { sm: 36, md: 44, lg: 52 },
    toggle: { sm: 36, md: 44, lg: 52 },
  };
  // Switch/Toggle gap은 Switch.spec.ts sizes 기준 (8/10/12)
  const INLINE_FORM_GAPS: Record<string, Record<string, number>> = {
    checkbox: { sm: 6, md: 8, lg: 10 },
    radio: { sm: 6, md: 8, lg: 10 },
    switch: { sm: 8, md: 10, lg: 12 },
    toggle: { sm: 8, md: 10, lg: 12 },
  };
  const inlineFormIndicator = INLINE_FORM_INDICATOR_WIDTHS[tag];
  if (inlineFormIndicator) {
    const props = element.props as Record<string, unknown> | undefined;
    const sizeName = (props?.size as string) ?? 'md';
    const indicatorSize = inlineFormIndicator[sizeName] ?? 20;
    const gap = INLINE_FORM_GAPS[tag]?.[sizeName] ?? (sizeName === 'sm' ? 6 : sizeName === 'lg' ? 10 : 8);
    // typography 토큰 매칭: text-sm=14, text-md=16, text-lg=18
    const fontSize = sizeName === 'sm' ? 14 : sizeName === 'lg' ? 18 : 16;
    const labelText = String(props?.children ?? props?.label ?? props?.text ?? '');
    // Canvas 2D measureText와 CanvasKit paragraph API 간 폰트 측정 오차 보정 (+2px)
    const textWidth = labelText ? Math.ceil(calculateTextWidth(labelText, fontSize, 0)) + 2 : 0;
    const flexDir = style?.flexDirection as string | undefined;
    const isColumn = flexDir === 'column' || flexDir === 'column-reverse';
    if (isColumn) {
      // Column: 너비 = max(indicator, text)
      return Math.max(indicatorSize, textWidth);
    }
    // Row: 너비 = indicator + gap + text
    return indicatorSize + gap + textWidth;
  }

  if (text) {
    const props = element.props as Record<string, unknown> | undefined;

    // 버튼, 인풋 등은 size prop에 따라 fontSize 결정
    // padding/border는 parseBoxModel에서 처리 → 여기서는 텍스트 너비만 반환
    // (inline padding 변경 시 이중 계산 방지)
    const isFormElement = ['button', 'input', 'select', 'a'].includes(tag);
    const inlineUIConfig = INLINE_UI_SIZE_CONFIGS[tag];
    if (isFormElement || inlineUIConfig) {
      const defaultSize = DEFAULT_SIZE_BY_TAG[tag] ?? 'sm';
      const size = (props?.size as string) ?? defaultSize;
      const configMap = isFormElement ? BUTTON_SIZE_CONFIG : inlineUIConfig!;
      const sizeConfig = configMap[size] ?? configMap[defaultSize] ?? Object.values(configMap)[0];
      const fontSize = parseNumericValue(style?.fontSize) ?? sizeConfig.fontSize;
      const textWidth = calculateTextWidth(text, fontSize, 0);

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

    // 일반 요소
    // Canvas 2D measureText와 CanvasKit paragraph API 간 폰트 측정 오차 보정 (+2px)
    const fontSize = parseNumericValue(style?.fontSize) ?? 14;
    return Math.ceil(calculateTextWidth(text, fontSize, 0)) + 2;
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
  input: 36,
  select: 36,
  textarea: 80,
  // 텍스트 계열
  p: 24,
  span: 20,
  label: 20,
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

/** 기본 높이 (알 수 없는 태그) */
const DEFAULT_HEIGHT = 36;

/**
 * 텍스트 높이 추정
 *
 * Canvas 2D measureText()는 width만 정확하고 height는 브라우저마다 다름.
 * CSS/PixiJS의 텍스트 높이와 동일하게 fontSize * lineHeight 비율로 추정.
 *
 * @param fontSize - 폰트 크기 (px)
 * @returns 추정 텍스트 높이
 */
function estimateTextHeight(fontSize: number, lineHeight?: number): number {
  // 명시적 lineHeight가 있으면 그 값 사용
  if (lineHeight !== undefined) {
    return Math.round(lineHeight);
  }
  // CSS line-height: normal에 대응하는 fontBoundingBox 기반 lineHeight 사용
  // - fontBoundingBox: 폰트 전체의 ascent+descent (CSS line-height: normal과 동일 기준)
  // - actualBoundingBox: 특정 글리프의 높이 (CSS line-height보다 작아 부정확)
  const fm = measureFontMetrics(specFontFamily.sans, fontSize, 400);
  return Math.round(fm.lineHeight);
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
): number {
  const style = element.props?.style as Record<string, unknown> | undefined;

  // 0. display: none → 레이아웃에서 제외, 높이 0
  if (style?.display === 'none') return 0;

  // 1. 명시적 height가 있으면 사용
  const explicitHeight = parseNumericValue(style?.height);
  if (explicitHeight !== undefined) return explicitHeight;

  // 1.5. ToggleButtonGroup: 자식 ToggleButton의 border-box 높이 기반 계산
  // ToggleButtonGroup 자체는 padding/border 없는 flex 컨테이너이므로
  // content-box height = 자식 ToggleButton의 border-box height
  const tag0 = (element.tag ?? '').toLowerCase();
  if (tag0 === 'togglebuttongroup') {
    const props = element.props as Record<string, unknown> | undefined;
    const sizeName = (props?.size as string) ?? 'md';
    const sizeConfig = TOGGLEBUTTON_SIZE_CONFIG[sizeName] ?? TOGGLEBUTTON_SIZE_CONFIG['md'];
    const fontSize = sizeConfig.fontSize;
    const fm = measureFontMetrics(specFontFamily.sans, fontSize, 400);
    // ToggleButton border-box height = fontBoundingBox lineHeight + paddingY*2 + borderWidth*2
    return fm.lineHeight + sizeConfig.paddingY * 2 + sizeConfig.borderWidth * 2;
  }

  // 2. Self-rendering 요소는 size prop에 따라 높이 결정
  // contentHeight는 content-box 높이(텍스트 영역)만 반환해야 함
  // padding/border는 parseBoxModel에서 별도 관리 → BlockEngine이 합산
  const tag = (element.tag ?? '').toLowerCase();
  const inlineUIConfig = INLINE_UI_SIZE_CONFIGS[tag];
  if (tag === 'button' || inlineUIConfig) {
    const props = element.props as Record<string, unknown> | undefined;
    const defaultSize = DEFAULT_SIZE_BY_TAG[tag] ?? 'sm';
    const size = (props?.size as string) ?? defaultSize;
    const configMap = tag === 'button' ? BUTTON_SIZE_CONFIG : inlineUIConfig!;
    const sizeConfig = configMap[size] ?? configMap[defaultSize] ?? Object.values(configMap)[0];

    // 사용자가 인라인 padding을 설정했는지 확인 (configHeight 분기보다 먼저 판별 필요)
    const hasInlinePadding = style?.padding !== undefined ||
      style?.paddingTop !== undefined || style?.paddingBottom !== undefined;

    // configHeight: border-box 기준 → content-box로 변환
    const configHeight = (sizeConfig as { height?: number }).height;
    const configContentHeight = (configHeight !== undefined && !hasInlinePadding)
      ? Math.max(0, configHeight - sizeConfig.paddingY * 2 - sizeConfig.borderWidth * 2)
      : undefined;

    const fontSize = parseNumericValue(style?.fontSize) ?? sizeConfig.fontSize;
    const resolvedLineHeight = parseLineHeight(style, fontSize);
    const textHeight = estimateTextHeight(fontSize, resolvedLineHeight);
    // MIN_BUTTON_HEIGHT는 border-box 기준 → content-box 최소값으로 변환
    // 사용자가 인라인 padding을 설정한 경우 MIN_BUTTON_HEIGHT 미적용 (padding:0으로 축소 허용)
    const minContentHeight = hasInlinePadding
      ? 0
      : Math.max(0, MIN_BUTTON_HEIGHT - sizeConfig.paddingY * 2 - sizeConfig.borderWidth * 2);

    // 텍스트 줄바꿈 높이 계산: availableWidth가 제공되면 줄바꿈 고려
    // configHeight보다 먼저 체크하여 텍스트가 줄바꿈되면 더 큰 높이를 사용
    if (availableWidth !== undefined && availableWidth > 0) {
      const paddingX = parseNumericValue(style?.paddingLeft) ?? parseNumericValue(style?.padding) ?? sizeConfig.paddingLeft;
      const maxTextWidth = availableWidth - paddingX * 2;
      if (maxTextWidth > 0) {
        const textContent = String(props?.children ?? props?.text ?? props?.label ?? '');
        if (textContent) {
          const ws = (style?.whiteSpace as string) ?? 'normal';
          const measured = measureTextWithWhiteSpace(textContent, fontSize, specFontFamily.sans, 500, ws, maxTextWidth);
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

  // 3. Card 컴포넌트: 자식 기반 or 텍스트 콘텐츠 기반 높이 계산
  // 🚀 Card는 style.padding이 있으므로 BlockEngine이 padding을 별도로 추가함
  // contentHeight는 content-box 높이만 반환 (padding 제외)
  if (tag === 'card') {
    // childElements가 있으면 자식 기반 높이 계산 (display:flex column)
    // Card factory가 Heading + Description 자식을 생성하므로 이 경로가 우선
    if (childElements && childElements.length > 0) {
      const gap = parseNumericValue(style?.gap) ?? 8;
      let totalHeight = 0;
      for (let i = 0; i < childElements.length; i++) {
        const grandChildren = getChildElements?.(childElements[i].id);
        totalHeight += calculateContentHeight(
          childElements[i], availableWidth, grandChildren, getChildElements
        );
        if (i < childElements.length - 1) totalHeight += gap;
      }
      return Math.max(totalHeight, 36);
    }

    // fallback: props 기반 (자식 없는 Card)
    const props = element.props as Record<string, unknown> | undefined;
    const size = (props?.size as string) ?? 'md';
    const cardConfig = CARD_SIZE_CONFIG[size] ?? CARD_SIZE_CONFIG.md;

    // padding은 style.padding 우선, 없으면 size config 사용
    const stylePadding = parseNumericValue(style?.padding);
    const cardPad = stylePadding ?? cardConfig.padding;

    // Card 너비: availableWidth가 있으면 사용, 없으면 200px 폴백
    const cardWidth = availableWidth ?? 200;
    const wrapWidth = cardWidth - cardPad * 2;
    const fontFamily = specFontFamily.sans;

    const cardTitle = String(props?.heading || props?.title || '');
    const subheading = props?.subheading ? String(props.subheading) : '';
    const description = String(props?.description || props?.children || '');

    let h = 0; // content-box height (padding 제외)

    if (cardTitle) {
      h += measureWrappedTextHeight(cardTitle, 16, 600, fontFamily, wrapWidth);
    }
    if (subheading) {
      if (cardTitle) h += 2; // header gap
      h += measureWrappedTextHeight(subheading, 14, 400, fontFamily, wrapWidth);
    }
    if (cardTitle || subheading) {
      h += 8; // marginBottom between header and content
    }
    if (description) {
      h += measureWrappedTextHeight(description, 14, 400, fontFamily, wrapWidth);
    }

    // minHeight 36 (60 - 24px default padding = 36px content)
    return Math.max(h, 36);
  }

  // 3.6. ComboBox/Select: CSS 측정 기반 높이 (label + input/trigger)
  // CSS: Label(fontSize*1.5 ceil) + gap(8) + input/trigger
  // ComboBox input: fontSize + paddingY*2 (md: 14+16=30)
  // Select trigger: fontSize + paddingY*2 + 4 (md: 14+16+4=34, 버튼이 input보다 4px 높음)
  const COMBOBOX_INPUT_HEIGHTS: Record<string, number> = {
    sm: 20, md: 30, lg: 40,
  };
  const SELECT_TRIGGER_HEIGHTS: Record<string, number> = {
    sm: 24, md: 34, lg: 44,
  };
  const LABEL_OFFSETS: Record<string, number> = {
    sm: 26, md: 29, lg: 32,
  };
  if (tag === 'combobox' || tag === 'select' || tag === 'dropdown') {
    const props = element.props as Record<string, unknown> | undefined;
    const sizeName = (props?.size as string) ?? 'md';
    const isSelect = tag === 'select';
    const bodyHeight = isSelect
      ? (SELECT_TRIGGER_HEIGHTS[sizeName] ?? 34)
      : (COMBOBOX_INPUT_HEIGHTS[sizeName] ?? 30);
    const hasLabel = !!(props?.label);
    if (hasLabel) {
      return (LABEL_OFFSETS[sizeName] ?? 29) + bodyHeight;
    }
    return bodyHeight;
  }

  // 3.5. Checkbox/Radio/Switch/Toggle: flexDirection에 따른 높이 계산
  const INLINE_FORM_HEIGHTS: Record<string, Record<string, number>> = {
    checkbox: { sm: 20, md: 24, lg: 28 },
    radio: { sm: 20, md: 24, lg: 28 },
    switch: { sm: 20, md: 24, lg: 28 },
    toggle: { sm: 20, md: 24, lg: 28 },
  };
  const INLINE_FORM_INDICATOR_HEIGHTS: Record<string, Record<string, number>> = {
    checkbox: { sm: 16, md: 20, lg: 24 },
    radio: { sm: 16, md: 20, lg: 24 },
    switch: { sm: 20, md: 24, lg: 28 },
    toggle: { sm: 20, md: 24, lg: 28 },
  };
  const inlineFormHeightConfig = INLINE_FORM_HEIGHTS[tag];
  if (inlineFormHeightConfig) {
    const props = element.props as Record<string, unknown> | undefined;
    const sizeName = (props?.size as string) ?? 'md';
    const flexDir = style?.flexDirection as string | undefined;
    const isColumn = flexDir === 'column' || flexDir === 'column-reverse';
    if (isColumn) {
      // Column: 높이 = indicator + gap + text line-height
      const indicatorH = INLINE_FORM_INDICATOR_HEIGHTS[tag]?.[sizeName] ?? 20;
      // Switch/Toggle gap은 spec 기준 (8/10/12), Checkbox/Radio는 (6/8/10)
      const isSwitch = tag === 'switch' || tag === 'toggle';
      const gap = isSwitch
        ? (sizeName === 'sm' ? 8 : sizeName === 'lg' ? 12 : 10)
        : (sizeName === 'sm' ? 6 : sizeName === 'lg' ? 10 : 8);
      // typography 토큰 매칭: text-sm=14, text-md=16, text-lg=18
      const fs = sizeName === 'sm' ? 14 : sizeName === 'lg' ? 18 : 16;
      return indicatorH + gap + Math.round(fs * 1.4);
    }
    // Row: spec 높이
    return inlineFormHeightConfig[sizeName] ?? 24;
  }

  // 4. Panel: spec shapes 기반 컴포넌트 — 자식 요소 없이 자체 렌더링
  // CSS Preview 기준 높이 추정 (title section + content section + border)
  // ⚠️ childElements 블록 밖에 배치: Panel은 element tree에 자식이 없음
  if (tag === 'panel') {
    const props = element.props as Record<string, unknown> | undefined;
    const hasTitle = !!props?.title;
    const sizeName = (props?.size as string) ?? 'md';
    const PANEL_HEIGHTS: Record<string, { withTitle: number; noTitle: number }> = {
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
  if (tag === 'breadcrumbs') {
    const props = element.props as Record<string, unknown> | undefined;
    const sizeName = (props?.size as string) ?? 'md';
    const BREADCRUMBS_HEIGHTS: Record<string, number> = { sm: 16, md: 24, lg: 24 };
    return BREADCRUMBS_HEIGHTS[sizeName] ?? 24;
  }

  // 4.5. 컨테이너 컴포넌트: childElements 기반 높이 계산 (lineHeight보다 먼저 처리)
  // CheckboxGroup, RadioGroup 등 자식 요소를 포함하는 컨테이너의 intrinsic height 산출
  // ⚠️ lineHeight 체크보다 먼저 와야 함: 컨테이너의 높이는 자식 기반으로 산출해야 함
  if (childElements && childElements.length > 0) {
    // CheckboxGroup: 그룹 라벨 + 자식 Checkbox 세로 합산
    if (tag === 'checkboxgroup' || tag === 'radiogroup') {
      const props = element.props as Record<string, unknown> | undefined;
      const sizeName = (props?.size as string) ?? 'md';
      const gap = sizeName === 'sm' ? 8 : sizeName === 'lg' ? 16 : 12;

      let totalHeight = 0;
      // 그룹 라벨
      if (props?.label) {
        // typography 토큰 매칭: text-sm=14, text-md=16, text-lg=18
        const labelFontSize = sizeName === 'sm' ? 14 : sizeName === 'lg' ? 18 : 16;
        totalHeight += estimateTextHeight(labelFontSize) + 8; // label + spacing
      }
      // 자식 Checkbox/Radio 항목
      for (let i = 0; i < childElements.length; i++) {
        const grandChildren = getChildElements?.(childElements[i].id);
        totalHeight += calculateContentHeight(childElements[i], availableWidth, grandChildren, getChildElements);
        if (i < childElements.length - 1) totalHeight += gap;
      }
      return totalHeight;
    }

    // Tabs: 탭 바 높이 + TabPanel 패딩 + 활성 Panel 높이
    // CSS Preview 기준: Tabs(flex col) → TabList(30px) + TabPanel(pad=16px → Panel)
    if (tag === 'tabs') {
      const props = element.props as Record<string, unknown> | undefined;
      const sizeName = (props?.size as string) ?? 'md';
      // CSS 기준 탭 바 높이: sm=25, md=30, lg=35
      const tabBarHeight = sizeName === 'sm' ? 25 : sizeName === 'lg' ? 35 : 30;
      const tabPanelPadding = 16; // React-Aria TabPanel 기본 padding

      // 활성 Panel의 높이 계산
      const panelChildren = childElements.filter(c => c.tag === 'Panel');
      const activePanel = panelChildren[0]; // 기본: 첫 번째 Panel
      if (activePanel) {
        const panelGrandChildren = getChildElements?.(activePanel.id);
        const panelHeight = calculateContentHeight(
          activePanel, availableWidth,
          panelGrandChildren, getChildElements
        );
        const panelBox = parseBoxModel(activePanel, 0, -1);
        const panelBorderBox = panelHeight
          + panelBox.padding.top + panelBox.padding.bottom
          + panelBox.border.top + panelBox.border.bottom;
        return tabBarHeight + tabPanelPadding * 2 + panelBorderBox;
      }
      return tabBarHeight;
    }

    // 일반 flex 컨테이너: flexDirection에 따라 자식 높이 합산/max
    const display = style?.display;
    if (display === 'flex' || display === 'inline-flex') {
      const flexDir = (style?.flexDirection as string) || 'row';
      const gap = parseNumericValue(style?.gap) ?? 0;
      const isColumn = flexDir === 'column' || flexDir === 'column-reverse';

      // display: none 자식은 레이아웃에서 제외 (높이 0, gap 미적용)
      const visibleChildren = childElements.filter(child => {
        const childStyle = child.props?.style as Record<string, unknown> | undefined;
        return childStyle?.display !== 'none';
      });

      const childHeights = visibleChildren.map(child => {
        const grandChildren = getChildElements?.(child.id);
        const contentH = calculateContentHeight(child, availableWidth, grandChildren, getChildElements);
        // border-box 높이: padding + border 추가
        const childBox = parseBoxModel(child, 0, -1);
        return contentH + childBox.padding.top + childBox.padding.bottom
          + childBox.border.top + childBox.border.bottom;
      });

      if (isColumn) {
        return childHeights.reduce((sum, h) => sum + h, 0)
          + gap * Math.max(0, visibleChildren.length - 1);
      }
      return Math.max(...childHeights, 0);
    }
  }

  // 5. lineHeight가 명시적으로 지정되어 있으면 최소 높이로 사용
  const fontSize = parseNumericValue(style?.fontSize);
  const resolvedLineHeight = parseLineHeight(style, fontSize);
  if (resolvedLineHeight !== undefined) {
    return Math.round(resolvedLineHeight);
  }

  // 6. 태그별 기본 높이 사용
  const defaultHeight = DEFAULT_ELEMENT_HEIGHTS[tag];
  if (defaultHeight !== undefined) return defaultHeight;

  // 7. 알 수 없는 태그는 기본값 사용
  return DEFAULT_HEIGHT;
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
  viewportHeight?: number
): BoxModel {
  const style = element.props?.style as Record<string, unknown> | undefined;

  // width/height 파싱 (%, px, vh, vw, auto 지원)
  let width = parseSize(style?.width, availableWidth, viewportWidth, viewportHeight);
  let height = parseSize(style?.height, availableHeight, viewportWidth, viewportHeight);

  // min/max 파싱
  const minWidth = parseSize(style?.minWidth, availableWidth, viewportWidth, viewportHeight);
  const maxWidth = parseSize(style?.maxWidth, availableWidth, viewportWidth, viewportHeight);
  const minHeight = parseSize(style?.minHeight, availableHeight, viewportWidth, viewportHeight);
  const maxHeight = parseSize(style?.maxHeight, availableHeight, viewportWidth, viewportHeight);

  // padding 파싱 (C3: availableWidth 전달로 % 값 해석)
  let padding = parsePadding(style, availableWidth);

  // border 파싱
  let border = parseBorder(style);

  // Self-rendering 요소: inline style이 없으면 size config 기본값 적용
  const tag = (element.tag ?? '').toLowerCase();
  const isFormElement = ['button', 'input', 'select'].includes(tag);
  const inlineUISizeConfig = INLINE_UI_SIZE_CONFIGS[tag];
  const hasSizeConfig = isFormElement || !!inlineUISizeConfig;

  if (hasSizeConfig) {
    const props = element.props as Record<string, unknown> | undefined;
    const defaultSize = DEFAULT_SIZE_BY_TAG[tag] ?? 'sm';
    const size = (props?.size as string) ?? defaultSize;
    const configMap = isFormElement ? BUTTON_SIZE_CONFIG : inlineUISizeConfig!;
    const sizeConfig = configMap[size] ?? configMap[defaultSize] ?? Object.values(configMap)[0];

    const hasInlinePadding = style?.padding !== undefined ||
      style?.paddingTop !== undefined || style?.paddingRight !== undefined ||
      style?.paddingBottom !== undefined || style?.paddingLeft !== undefined;
    if (!hasInlinePadding) {
      padding = {
        top: sizeConfig.paddingY,
        right: sizeConfig.paddingRight,
        bottom: sizeConfig.paddingY,
        left: sizeConfig.paddingLeft,
      };
    }

    const hasInlineBorder = style?.borderWidth !== undefined ||
      style?.borderTopWidth !== undefined || style?.borderRightWidth !== undefined ||
      style?.borderBottomWidth !== undefined || style?.borderLeftWidth !== undefined;
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
  const isSectionElement = tag === 'section';
  const isCardLikeElement = tag === 'card' || tag === 'box';
  const treatAsBorderBox = boxSizing === 'border-box' ||
    (isFormElement && (width !== undefined || height !== undefined)) ||
    ((isSectionElement || isCardLikeElement) &&
      boxSizing !== 'content-box' &&
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
  const elementAvailableWidth = (originalBorderBoxWidth !== undefined && originalBorderBoxWidth !== FIT_CONTENT)
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
// Intrinsic Size 주입 (§6 P1: DropflowBlockEngine + TaffyFlexEngine 공유)
// ---------------------------------------------------------------------------

/**
 * CSS 스펙에서 기본 display가 inline-block인 태그
 *
 * 레이아웃 엔진이 이 요소들을 block으로 처리할 때,
 * width가 없으면 100%로 확장된다.
 * fit-content 동작을 에뮬레이트하기 위해 intrinsic width를 주입한다.
 */
export const INLINE_BLOCK_TAGS = new Set([
  'button', 'submitbutton', 'fancybutton', 'togglebutton',
  'badge', 'tag', 'chip',
  'checkbox', 'radio', 'switch', 'toggle',
  'togglebuttongroup',
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
): Element {
  const style = element.props?.style as Record<string, unknown> | undefined;
  const tag = (element.tag ?? '').toLowerCase();

  const rawHeight = style?.height;
  const INTRINSIC_HEIGHT_KEYWORDS = new Set(['fit-content', 'min-content', 'max-content', 'auto']);
  const needsHeight = !rawHeight || INTRINSIC_HEIGHT_KEYWORDS.has(rawHeight as string);

  const rawWidth = style?.width;
  const INTRINSIC_WIDTH_KEYWORDS = new Set(['fit-content', 'min-content', 'max-content', 'auto']);
  // C1: 모든 요소에서 intrinsic width keyword(fit-content/min-content/max-content) 처리
  // INLINE_BLOCK 태그의 width:auto 자동 주입은 기존 동작 유지
  const hasExplicitIntrinsicWidthKeyword = typeof rawWidth === 'string' &&
    rawWidth !== 'auto' && INTRINSIC_WIDTH_KEYWORDS.has(rawWidth);
  const needsWidth = hasExplicitIntrinsicWidthKeyword ||
    (INLINE_BLOCK_TAGS.has(tag) && (!rawWidth || INTRINSIC_WIDTH_KEYWORDS.has(rawWidth as string)));

  if (!needsHeight && !needsWidth) return element;

  const box = parseBoxModel(element, availableWidth, availableHeight);

  // min-content / max-content 너비 직접 계산
  let resolvedIntrinsicWidth: number | undefined;
  if (needsWidth && (rawWidth === 'min-content' || rawWidth === 'max-content')) {
    const props = element.props as Record<string, unknown> | undefined;
    const textContent = String(
      props?.children ?? props?.text ?? props?.label ?? props?.title ?? '',
    );
    if (textContent) {
      const styleRecord = style as Record<string, unknown> | undefined;
      const fontSize = typeof styleRecord?.fontSize === 'number' ? styleRecord.fontSize : 14;
      resolvedIntrinsicWidth = rawWidth === 'min-content'
        ? calculateMinContentWidth(textContent, fontSize)
        : calculateMaxContentWidth(textContent, fontSize);
    }
  }

  // contentHeight <= 0이면 컨테이너 요소 (div, section 등) — 스킵
  // 단, ComboBox/Select 등 spec shapes 기반 입력 컴포넌트는 예외:
  // flex container 스타일(flexDirection: column)로 parseBoxModel이 contentHeight=0을 반환하지만,
  // calculateContentHeight에서 spec size 기반 높이를 산출하므로 height 주입이 필요함
  const SPEC_SHAPES_INPUT_TAGS = new Set(['combobox', 'select', 'dropdown', 'breadcrumbs']);
  if (box.contentHeight <= 0 && !needsWidth && !SPEC_SHAPES_INPUT_TAGS.has(tag)) return element;

  // padding과 border를 독립적으로 처리:
  // - CSS에 해당 속성이 없으면 → spec 기본값을 크기에 포함
  // - CSS에 해당 속성이 있으면 → 해당 부분 생략 (엔진이 CSS 값을 추가)
  //
  // 예외: INLINE_BLOCK_TAGS (button, badge 등)
  //   layoutInlineRun()은 style.height를 완전한 border-box 크기로 직접 사용하며,
  //   별도의 padding/border 추가 처리를 하지 않는다.
  //   따라서 INLINE_BLOCK_TAGS는 항상 padding + border를 포함해야 한다.
  //   block 경로에서는 treatAsBorderBox 변환이 이중 계산을 방지한다.
  const isInlineBlockTag = INLINE_BLOCK_TAGS.has(tag);
  const hasCSSVerticalPadding = style?.padding !== undefined ||
    style?.paddingTop !== undefined || style?.paddingBottom !== undefined;
  const hasCSSVerticalBorder = style?.borderWidth !== undefined ||
    style?.borderTopWidth !== undefined || style?.borderBottomWidth !== undefined;
  const hasCSSHorizontalPadding = style?.padding !== undefined ||
    style?.paddingLeft !== undefined || style?.paddingRight !== undefined;
  const hasCSSHorizontalBorder = style?.borderWidth !== undefined ||
    style?.borderLeftWidth !== undefined || style?.borderRightWidth !== undefined;

  const injectedStyle: Record<string, unknown> = { ...style };

  // Height 주입
  // childElements가 있으면 재계산 (CheckboxGroup 등 자식 기반 높이 필요)
  const childResolvedHeight = (childElements && childElements.length > 0)
    ? calculateContentHeight(element, availableWidth, childElements, getChildElements)
    : box.contentHeight;
  if (needsHeight && childResolvedHeight > 0) {
    let injectHeight = childResolvedHeight;
    // parseBoxModel의 treatAsBorderBox 로직과 일치시켜야 함:
    // Card/Box/Section은 height를 border-box로 해석하므로 padding+border 포함 필요
    const isSectionLike = tag === 'section';
    const isCardLike = tag === 'card' || tag === 'box';
    const isTreatedAsBorderBox = (isSectionLike || isCardLike)
      && style?.boxSizing !== 'content-box';
    // ComboBox/Select: calculateContentHeight가 전체 시각적 높이(label+input/trigger)를 반환
    // spec shapes가 내부 padding 없이 렌더링하므로 추가 padding/border 불필요
    const isSpecShapesInput = SPEC_SHAPES_INPUT_TAGS.has(tag);
    if (!isSpecShapesInput && (isTreatedAsBorderBox || !hasCSSVerticalPadding || isInlineBlockTag)) {
      injectHeight += box.padding.top + box.padding.bottom;
    }
    if (!isSpecShapesInput && (isTreatedAsBorderBox || !hasCSSVerticalBorder || isInlineBlockTag)) {
      injectHeight += box.border.top + box.border.bottom;
    }
    injectedStyle.height = injectHeight;
  }

  // Width 주입 (inline-block 태그의 fit-content / min-content / max-content 에뮬레이션)
  // childElements가 있으면 재계산 (ToggleButtonGroup 등 자식이 Element로 저장된 경우)
  const childResolvedWidth = (childElements && childElements.length > 0)
    ? calculateContentWidth(element, childElements, getChildElements)
    : box.contentWidth;
  const baseContentWidth = resolvedIntrinsicWidth ?? childResolvedWidth;
  if (needsWidth && baseContentWidth > 0) {
    let injectWidth = baseContentWidth;
    if (!hasCSSHorizontalPadding || isInlineBlockTag) {
      injectWidth += box.padding.left + box.padding.right;
    }
    if (!hasCSSHorizontalBorder || isInlineBlockTag) {
      injectWidth += box.border.left + box.border.right;
    }
    injectedStyle.width = injectWidth;
  }

  // 변경이 없으면 원본 반환
  if (injectedStyle.height === undefined && injectedStyle.width === style?.width) {
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

    // px 값 (명시적으로 'px'가 있는 경우만)
    if (trimmed.endsWith('px')) {
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
  'button', 'submitbutton', 'fancybutton', 'togglebutton',
  'input', 'select',
  'badge', 'tag', 'chip',  // inline-flex 컴포넌트
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

function parseFontProps(style: Record<string, unknown> | undefined): ParsedFontProps {
  if (!style) {
    return { fontFamily: 'sans-serif', fontSize: 16, fontWeight: 400 };
  }

  const sizeProp = style.fontSize;
  const familyProp = style.fontFamily;
  const weightProp = style.fontWeight;

  // fontSize 파싱
  let fontSize = 16;
  if (typeof sizeProp === 'number') {
    fontSize = sizeProp;
  } else if (typeof sizeProp === 'string' && sizeProp.trim()) {
    const parsed = parseFloat(sizeProp.trim());
    if (!isNaN(parsed)) fontSize = parsed;
  }

  // fontFamily 파싱
  let fontFamily = 'sans-serif';
  if (typeof familyProp === 'string' && familyProp.trim()) {
    fontFamily = familyProp.trim();
  }

  // fontWeight 파싱
  let fontWeight: string | number = 400;
  if (typeof weightProp === 'number') {
    fontWeight = weightProp;
  } else if (typeof weightProp === 'string' && weightProp.trim()) {
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
function getFontMetricsFromStyle(style: Record<string, unknown> | undefined): FontMetrics {
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
export function calculateBaseline(
  element: Element,
  height: number
): number {
  const style = element.props?.style as Record<string, unknown> | undefined;
  const tag = (element.tag ?? '').toLowerCase();

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
): { width: number; height: number } {
  // CSS line-height: normal에 대응하는 fontBoundingBox 기반 lineHeight 사용
  const fm = measureFontMetrics(fontFamily, fontSize, fontWeight);
  const lineHeight = fm.lineHeight;

  switch (whiteSpace) {
    case 'nowrap': {
      // 줄바꿈 없이 한 줄
      const width = measureTextWidth(text, fontSize, fontFamily, fontWeight);
      return { width, height: lineHeight };
    }
    case 'pre': {
      // \n만 줄바꿈, 자동 줄바꿈 없음
      const lines = text.split('\n');
      let maxLineWidth = 0;
      for (const line of lines) {
        const w = measureTextWidth(line, fontSize, fontFamily, fontWeight);
        if (w > maxLineWidth) maxLineWidth = w;
      }
      return { width: maxLineWidth, height: lines.length * lineHeight };
    }
    case 'pre-wrap':
    case 'pre-line': {
      // \n + 자동 줄바꿈 (pre-line은 공백 축소)
      const processedText = whiteSpace === 'pre-line'
        ? text.replace(/[ \t]+/g, ' ')
        : text;
      return {
        width: maxWidth,
        height: measureWrappedTextHeight(processedText, fontSize, fontWeight, fontFamily, maxWidth),
      };
    }
    default: {
      // normal: 기본 동작
      return {
        width: maxWidth,
        height: measureWrappedTextHeight(text, fontSize, fontWeight, fontFamily, maxWidth),
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
