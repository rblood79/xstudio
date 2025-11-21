/**
 * Responsive CSS Generator
 *
 * Element의 Responsive 설정을 CSS 미디어 쿼리로 변환.
 */

import {
  BreakpointName,
  BREAKPOINTS,
  BREAKPOINT_ORDER,
  ResponsiveStyles,
  ResponsiveVisibility,
  ElementResponsiveConfig,
  GeneratedMediaQuery,
  ElementGeneratedCSS,
  generateMediaQueryString,
} from "../../../types/builder/responsive.types";

/**
 * CSS 속성 이름을 kebab-case로 변환
 */
function toKebabCase(str: string): string {
  return str.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
}

/**
 * CSS 값 포맷팅 (숫자면 px 추가)
 */
function formatCSSValue(value: string | number | undefined): string {
  if (value === undefined) return "";
  if (typeof value === "number") {
    return `${value}px`;
  }
  return value;
}

/**
 * Responsive 스타일을 CSS 규칙 문자열로 변환
 */
function generateStyleRules(
  styles: ResponsiveStyles,
  breakpoint: BreakpointName,
  selector: string
): string[] {
  const rules: string[] = [];
  const cssProperties: string[] = [];

  // 각 스타일 속성에 대해 해당 Breakpoint 값 추출
  const styleKeys = Object.keys(styles) as (keyof ResponsiveStyles)[];

  for (const key of styleKeys) {
    const responsiveValue = styles[key];
    if (!responsiveValue) continue;

    const value = responsiveValue[breakpoint];
    if (value === undefined) continue;

    const cssProperty = toKebabCase(key);
    const cssValue = formatCSSValue(value);

    if (cssValue) {
      cssProperties.push(`  ${cssProperty}: ${cssValue};`);
    }
  }

  if (cssProperties.length > 0) {
    rules.push(`${selector} {\n${cssProperties.join("\n")}\n}`);
  }

  return rules;
}

/**
 * Responsive 가시성을 CSS 규칙으로 변환
 */
function generateVisibilityRules(
  visibility: ResponsiveVisibility,
  breakpoint: BreakpointName,
  selector: string
): string[] {
  const rules: string[] = [];
  const isVisible = visibility[breakpoint];

  if (isVisible === false) {
    rules.push(`${selector} {\n  display: none !important;\n}`);
  }

  return rules;
}

/**
 * Element의 Responsive 설정을 CSS로 변환
 */
export function generateElementCSS(
  elementId: string,
  config: ElementResponsiveConfig,
  customSelector?: string
): ElementGeneratedCSS {
  const selector = customSelector || `[data-element-id="${elementId}"]`;
  const baseRules: string[] = [];
  const mediaQueries: GeneratedMediaQuery[] = [];

  // 각 Breakpoint별로 CSS 생성
  for (const breakpoint of BREAKPOINT_ORDER) {
    const breakpointConfig = BREAKPOINTS[breakpoint];
    const rules: string[] = [];

    // 스타일 규칙 생성
    if (config.styles) {
      rules.push(...generateStyleRules(config.styles, breakpoint, selector));
    }

    // 가시성 규칙 생성
    if (config.visibility) {
      rules.push(...generateVisibilityRules(config.visibility, breakpoint, selector));
    }

    if (rules.length > 0) {
      // Desktop은 기본 스타일 (미디어 쿼리 없음)
      if (breakpoint === "desktop") {
        baseRules.push(...rules);
      } else {
        mediaQueries.push({
          breakpoint,
          mediaQuery: generateMediaQueryString(breakpointConfig),
          rules,
        });
      }
    }
  }

  return {
    elementId,
    baseCSS: baseRules.join("\n\n"),
    mediaQueries,
  };
}

/**
 * 여러 Element의 CSS를 하나의 스타일시트로 결합
 */
export function combineElementCSS(elementCSSList: ElementGeneratedCSS[]): string {
  const parts: string[] = [];

  // 기본 CSS (Desktop)
  const baseCSS = elementCSSList
    .map((el) => el.baseCSS)
    .filter((css) => css.length > 0);

  if (baseCSS.length > 0) {
    parts.push("/* Base Styles (Desktop) */");
    parts.push(baseCSS.join("\n\n"));
  }

  // Tablet 미디어 쿼리
  const tabletRules = elementCSSList
    .flatMap((el) => el.mediaQueries.filter((mq) => mq.breakpoint === "tablet"))
    .flatMap((mq) => mq.rules);

  if (tabletRules.length > 0) {
    const tabletMediaQuery = generateMediaQueryString(BREAKPOINTS.tablet);
    parts.push(`\n/* Tablet Styles */`);
    parts.push(`${tabletMediaQuery} {\n${tabletRules.join("\n\n")}\n}`);
  }

  // Mobile 미디어 쿼리
  const mobileRules = elementCSSList
    .flatMap((el) => el.mediaQueries.filter((mq) => mq.breakpoint === "mobile"))
    .flatMap((mq) => mq.rules);

  if (mobileRules.length > 0) {
    const mobileMediaQuery = generateMediaQueryString(BREAKPOINTS.mobile);
    parts.push(`\n/* Mobile Styles */`);
    parts.push(`${mobileMediaQuery} {\n${mobileRules.join("\n\n")}\n}`);
  }

  return parts.join("\n");
}

/**
 * Responsive CSS를 DOM에 적용
 */
export function applyResponsiveCSS(css: string, styleId = "responsive-layout-styles"): void {
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;

  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }

  styleEl.textContent = css;
}

/**
 * Responsive CSS를 DOM에서 제거
 */
export function removeResponsiveCSS(styleId = "responsive-layout-styles"): void {
  const styleEl = document.getElementById(styleId);
  if (styleEl) {
    styleEl.remove();
  }
}

/**
 * 단일 Element의 Responsive CSS를 빠르게 생성
 */
export function generateQuickResponsiveCSS(
  elementId: string,
  visibility?: ResponsiveVisibility,
  styles?: ResponsiveStyles
): string {
  const config: ElementResponsiveConfig = { visibility, styles };
  const elementCSS = generateElementCSS(elementId, config);
  return combineElementCSS([elementCSS]);
}

export default {
  generateElementCSS,
  combineElementCSS,
  applyResponsiveCSS,
  removeResponsiveCSS,
  generateQuickResponsiveCSS,
};
