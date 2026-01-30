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
import { fontFamily as specFontFamily } from '@xstudio/specs';

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
  paddingLeft: number;
  paddingRight: number;
  paddingY: number;
  fontSize: number;
  borderWidth: number;
}> = {
  // @sync Button.css [data-size] padding 값과 일치해야 함
  // @sync Button.css base: border: 1px solid (all variants, all sizes)
  xs: { paddingLeft: 8, paddingRight: 8, paddingY: 2, fontSize: 12, borderWidth: 1 },     // --spacing-sm = 8px
  sm: { paddingLeft: 12, paddingRight: 12, paddingY: 4, fontSize: 14, borderWidth: 1 },   // --spacing-md = 12px
  md: { paddingLeft: 24, paddingRight: 24, paddingY: 8, fontSize: 16, borderWidth: 1 },   // --spacing-xl = 24px
  lg: { paddingLeft: 32, paddingRight: 32, paddingY: 12, fontSize: 18, borderWidth: 1 },  // --spacing-2xl = 32px
  xl: { paddingLeft: 40, paddingRight: 40, paddingY: 16, fontSize: 20, borderWidth: 1 },  // --spacing-3xl = 40px
};

/** PixiButton MIN_BUTTON_HEIGHT과 동일 */
const MIN_BUTTON_HEIGHT = 24;

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
  fontFamily: string = specFontFamily.sans
): number {
  if (!text) return 0;

  const ctx = getMeasureContext();
  if (!ctx) {
    // Canvas 미지원 환경: 추정값 사용
    return text.length * (fontSize * 0.5);
  }

  ctx.font = `${fontSize}px ${fontFamily}`;
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

/**
 * 요소의 콘텐츠 너비 계산
 *
 * CSS width: auto 동작 모방:
 * 1. 텍스트 콘텐츠가 있으면 텍스트 기반 너비 추정
 * 2. 텍스트가 없으면 태그별 기본 너비 사용
 *
 * @returns 콘텐츠 기반 너비
 */
export function calculateContentWidth(element: Element): number {
  const style = element.props?.style as Record<string, unknown> | undefined;
  const tag = (element.tag ?? '').toLowerCase();

  // 1. 명시적 width가 있으면 사용
  const explicitWidth = parseNumericValue(style?.width);
  if (explicitWidth !== undefined) return explicitWidth;

  // 2. 텍스트 콘텐츠 기반 너비 측정 (Canvas 2D measureText 사용)
  const text = extractTextContent(element.props as Record<string, unknown>);

  if (text) {
    const props = element.props as Record<string, unknown> | undefined;

    // 버튼, 인풋 등은 size prop에 따라 padding/fontSize 결정
    const needsPadding = ['button', 'input', 'select', 'a', 'label'].includes(tag);
    if (needsPadding) {
      const size = (props?.size as string) ?? 'sm';
      const sizeConfig = BUTTON_SIZE_CONFIG[size] ?? BUTTON_SIZE_CONFIG.sm;
      const fontSize = parseNumericValue(style?.fontSize) ?? sizeConfig.fontSize;
      const borderTotal = (sizeConfig.borderWidth ?? 0) * 2; // CSS: border-box, left + right
      const totalPadding = sizeConfig.paddingLeft + sizeConfig.paddingRight + borderTotal;
      return calculateTextWidth(text, fontSize, totalPadding);
    }

    // 일반 요소
    const fontSize = parseNumericValue(style?.fontSize) ?? 14;
    return calculateTextWidth(text, fontSize, 0);
  }

  // 3. 태그별 기본 너비 사용
  const defaultWidth = DEFAULT_ELEMENT_WIDTHS[tag];
  if (defaultWidth !== undefined) return defaultWidth;

  // 4. 알 수 없는 태그는 기본값 사용
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
  // CSS default line-height: normal ≈ 1.2
  // PixiJS Text bounds도 유사한 비율 사용
  return Math.round(fontSize * 1.2);
}

/**
 * 요소의 콘텐츠 높이 계산
 *
 * @returns 콘텐츠 기반 높이 (자식이 없으면 태그별 기본 높이)
 */
export function calculateContentHeight(element: Element): number {
  const style = element.props?.style as Record<string, unknown> | undefined;

  // 1. 명시적 height가 있으면 사용
  const explicitHeight = parseNumericValue(style?.height);
  if (explicitHeight !== undefined) return explicitHeight;

  // 2. 버튼은 size prop에 따라 높이 결정
  // 🚀 Phase 12 Fix: PixiButton과 동일한 공식 사용
  // 기존: BUTTON_SIZE_CONFIG[size].height (고정값, 실제 렌더링과 불일치)
  // 수정: max(paddingY*2 + textHeight, MIN_BUTTON_HEIGHT) (PixiButton 공식과 동일)
  const tag = (element.tag ?? '').toLowerCase();
  if (tag === 'button') {
    const props = element.props as Record<string, unknown> | undefined;
    const size = (props?.size as string) ?? 'sm';
    const sizeConfig = BUTTON_SIZE_CONFIG[size] ?? BUTTON_SIZE_CONFIG.sm;
    const fontSize = parseNumericValue(style?.fontSize) ?? sizeConfig.fontSize;
    const resolvedLineHeight = parseLineHeight(style, fontSize);
    const textHeight = estimateTextHeight(fontSize, resolvedLineHeight);
    return Math.max(sizeConfig.paddingY * 2 + textHeight, MIN_BUTTON_HEIGHT);
  }

  // 3. lineHeight가 명시적으로 지정되어 있으면 최소 높이로 사용
  const fontSize = parseNumericValue(style?.fontSize);
  const resolvedLineHeight = parseLineHeight(style, fontSize);
  if (resolvedLineHeight !== undefined) {
    return Math.round(resolvedLineHeight);
  }

  // 4. 태그별 기본 높이 사용
  const defaultHeight = DEFAULT_ELEMENT_HEIGHTS[tag];
  if (defaultHeight !== undefined) return defaultHeight;

  // 5. 알 수 없는 태그는 기본값 사용
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

  // padding 파싱
  const padding = parsePadding(style);

  // border 파싱
  const border = parseBorder(style);

  // 🚀 Phase 11: box-sizing: border-box 처리
  // border-box인 경우 width/height에서 padding + border 제외하여 content-box 크기로 변환
  const boxSizing = style?.boxSizing as string | undefined;
  if (boxSizing === 'border-box') {
    const paddingH = padding.left + padding.right;
    const borderH = border.left + border.right;
    const paddingV = padding.top + padding.bottom;
    const borderV = border.top + border.bottom;

    if (width !== undefined) {
      width = Math.max(0, width - paddingH - borderH);
    }
    if (height !== undefined) {
      height = Math.max(0, height - paddingV - borderV);
    }
  }

  // 콘텐츠 크기 계산
  const contentWidth = calculateContentWidth(element);
  const contentHeight = calculateContentHeight(element);

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
// CSS에서 button/input은 내부 텍스트가 수직 중앙 정렬되므로
// baseline이 요소의 수직 중앙 근처에 위치
const VERTICALLY_CENTERED_TAGS = new Set([
  'button', 'submitbutton', 'fancybutton', 'togglebutton',
  'input', 'select',
]);

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
  // TODO: 실제 구현에서는 자식 요소/텍스트 유무 확인 필요
  // 현재는 높이가 0이면 콘텐츠 없음으로 간주
  if (height === 0) {
    return 0;
  }

  // 🚀 버튼/input 등 텍스트 수직 중앙 정렬 요소
  // CSS에서 이 요소들의 baseline은 수직 중앙의 텍스트 baseline
  // 텍스트가 중앙에 위치하므로 baseline ≈ height / 2
  // (동일 폰트 크기의 다른 높이 요소들 간 baseline 정렬 시
  //  결과적으로 수직 중앙 정렬과 동일한 효과)
  if (VERTICALLY_CENTERED_TAGS.has(tag)) {
    return height / 2;
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
