/**
 * CSS Variable Reader
 *
 * CSS 변수를 런타임에 읽어서 PixiJS에서 사용할 수 있는 hex 값으로 변환
 * 테마 변경 시 동적으로 색상 업데이트 지원
 *
 * @since 2025-12-15
 */

// ============================================
// Types
// ============================================

export interface M3ButtonColors {
  // Default (surface-container-high)
  defaultBg: number;
  defaultBgHover: number;
  defaultBgPressed: number;
  defaultText: number;
  defaultBorder: number;

  // Primary
  primaryBg: number;
  primaryBgHover: number;
  primaryBgPressed: number;
  primaryText: number;

  // Secondary
  secondaryBg: number;
  secondaryBgHover: number;
  secondaryBgPressed: number;
  secondaryText: number;

  // Tertiary
  tertiaryBg: number;
  tertiaryBgHover: number;
  tertiaryBgPressed: number;
  tertiaryText: number;

  // Error
  errorBg: number;
  errorBgHover: number;
  errorBgPressed: number;
  errorText: number;

  // Surface
  surfaceBg: number;
  surfaceBgHover: number;
  surfaceBgPressed: number;
  surfaceText: number;
  surfaceBorder: number;

  // Outline
  outlineBg: number;
  outlineBgHover: number;
  outlineBgPressed: number;
  outlineText: number;
  outlineBorder: number;

  // Ghost
  ghostBg: number;
  ghostBgHover: number;
  ghostBgPressed: number;
  ghostText: number;
}

// ============================================
// CSS Variable Reading
// ============================================

/**
 * CSS 변수 값을 읽어옴
 */
function getCSSVariable(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * CSS 색상 문자열을 hex 숫자로 변환
 * 지원: #hex, rgb(), rgba(), color-mix()
 */
function cssColorToHex(color: string, fallback: number): number {
  if (!color) return fallback;

  // #hex 형식
  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      const expanded = hex.split('').map((c) => c + c).join('');
      return parseInt(expanded, 16);
    }
    return parseInt(hex, 16);
  }

  // rgb()/rgba() 형식
  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    return (r << 16) | (g << 8) | b;
  }

  // color-mix() 처리 - 브라우저가 계산한 값을 canvas로 읽어옴
  if (color.startsWith('color-mix')) {
    return resolveColorMix(color, fallback);
  }

  return fallback;
}

/**
 * color-mix() 값을 실제 색상으로 변환
 * 임시 DOM 요소를 사용하여 브라우저가 계산한 값을 읽어옴
 */
function resolveColorMix(colorMix: string, fallback: number): number {
  try {
    const tempDiv = document.createElement('div');
    tempDiv.style.color = colorMix;
    tempDiv.style.display = 'none';
    document.body.appendChild(tempDiv);

    const computedColor = getComputedStyle(tempDiv).color;
    document.body.removeChild(tempDiv);

    return cssColorToHex(computedColor, fallback);
  } catch {
    return fallback;
  }
}

/**
 * 색상을 어둡게 (black과 mix)
 * @param color hex 색상
 * @param percent 원본 색상 비율 (92 = 92% 원본 + 8% black)
 */
function mixWithBlack(color: number, percent: number): number {
  const ratio = percent / 100;
  const r = Math.round(((color >> 16) & 0xff) * ratio);
  const g = Math.round(((color >> 8) & 0xff) * ratio);
  const b = Math.round((color & 0xff) * ratio);
  return (r << 16) | (g << 8) | b;
}

/**
 * 색상을 밝게 (white와 mix)
 * @param color hex 색상
 * @param percent primary 색상 비율 (8 = 8% primary + 92% white)
 */
function mixWithWhite(color: number, percent: number): number {
  const ratio = percent / 100;
  const whiteRatio = 1 - ratio;
  const r = Math.round(((color >> 16) & 0xff) * ratio + 255 * whiteRatio);
  const g = Math.round(((color >> 8) & 0xff) * ratio + 255 * whiteRatio);
  const b = Math.round((color & 0xff) * ratio + 255 * whiteRatio);
  return (r << 16) | (g << 8) | b;
}

// ============================================
// Fallback Colors (M3 Light Mode)
// ============================================

const FALLBACK_COLORS = {
  primary: 0x6750a4,
  onPrimary: 0xffffff,
  secondary: 0x625b71,
  onSecondary: 0xffffff,
  tertiary: 0x7d5260,
  onTertiary: 0xffffff,
  error: 0xb3261e,
  onError: 0xffffff,
  surfaceContainerHigh: 0xece6f0,
  surfaceContainerHighest: 0xe6e0e9,
  onSurface: 0x1d1b20,
  outline: 0x79747e,
  outlineVariant: 0xcac4d0,
};

// ============================================
// Main API
// ============================================

/**
 * 현재 테마의 M3 버튼 색상을 읽어옴
 */
export function getM3ButtonColors(): M3ButtonColors {
  // CSS 변수에서 색상 읽기
  const primary = cssColorToHex(getCSSVariable('--primary'), FALLBACK_COLORS.primary);
  const onPrimary = cssColorToHex(getCSSVariable('--on-primary'), FALLBACK_COLORS.onPrimary);
  const secondary = cssColorToHex(getCSSVariable('--secondary'), FALLBACK_COLORS.secondary);
  const onSecondary = cssColorToHex(getCSSVariable('--on-secondary'), FALLBACK_COLORS.onSecondary);
  const tertiary = cssColorToHex(getCSSVariable('--tertiary'), FALLBACK_COLORS.tertiary);
  const onTertiary = cssColorToHex(getCSSVariable('--on-tertiary'), FALLBACK_COLORS.onTertiary);
  const error = cssColorToHex(getCSSVariable('--error'), FALLBACK_COLORS.error);
  const onError = cssColorToHex(getCSSVariable('--on-error'), FALLBACK_COLORS.onError);
  const surfaceContainerHigh = cssColorToHex(getCSSVariable('--surface-container-high'), FALLBACK_COLORS.surfaceContainerHigh);
  const surfaceContainerHighest = cssColorToHex(getCSSVariable('--surface-container-highest'), FALLBACK_COLORS.surfaceContainerHighest);
  const onSurface = cssColorToHex(getCSSVariable('--on-surface'), FALLBACK_COLORS.onSurface);
  const outline = cssColorToHex(getCSSVariable('--outline'), FALLBACK_COLORS.outline);
  const outlineVariant = cssColorToHex(getCSSVariable('--outline-variant'), FALLBACK_COLORS.outlineVariant);

  return {
    // Default
    defaultBg: surfaceContainerHigh,
    defaultBgHover: mixWithBlack(surfaceContainerHigh, 92),
    defaultBgPressed: mixWithBlack(surfaceContainerHigh, 88),
    defaultText: onSurface,
    defaultBorder: outlineVariant,

    // Primary
    primaryBg: primary,
    primaryBgHover: mixWithBlack(primary, 92),
    primaryBgPressed: mixWithBlack(primary, 88),
    primaryText: onPrimary,

    // Secondary
    secondaryBg: secondary,
    secondaryBgHover: mixWithBlack(secondary, 92),
    secondaryBgPressed: mixWithBlack(secondary, 88),
    secondaryText: onSecondary,

    // Tertiary
    tertiaryBg: tertiary,
    tertiaryBgHover: mixWithBlack(tertiary, 92),
    tertiaryBgPressed: mixWithBlack(tertiary, 88),
    tertiaryText: onTertiary,

    // Error
    errorBg: error,
    errorBgHover: mixWithBlack(error, 92),
    errorBgPressed: mixWithBlack(error, 88),
    errorText: onError,

    // Surface
    surfaceBg: surfaceContainerHighest,
    surfaceBgHover: mixWithBlack(surfaceContainerHighest, 92),
    surfaceBgPressed: mixWithBlack(surfaceContainerHighest, 88),
    surfaceText: onSurface,
    surfaceBorder: outlineVariant,

    // Outline (transparent bg, primary text)
    outlineBg: 0xffffff,
    outlineBgHover: mixWithWhite(primary, 8),
    outlineBgPressed: mixWithWhite(primary, 12),
    outlineText: primary,
    outlineBorder: outline,

    // Ghost (transparent bg, primary text)
    ghostBg: 0xffffff,
    ghostBgHover: mixWithWhite(primary, 8),
    ghostBgPressed: mixWithWhite(primary, 12),
    ghostText: primary,
  };
}

/**
 * --outline-variant 색상 가져오기 (캔버스 경계선 등)
 */
export function getOutlineVariantColor(): number {
  return cssColorToHex(getCSSVariable('--outline-variant'), FALLBACK_COLORS.outlineVariant);
}

/**
 * variant 이름으로 색상 가져오기
 */
export function getVariantColors(
  variant: string,
  colors: M3ButtonColors
): {
  bg: number;
  bgHover: number;
  bgPressed: number;
  text: number;
  border?: number;
  bgAlpha?: number;
} {
  switch (variant) {
    case 'primary':
      return {
        bg: colors.primaryBg,
        bgHover: colors.primaryBgHover,
        bgPressed: colors.primaryBgPressed,
        text: colors.primaryText,
      };
    case 'secondary':
      return {
        bg: colors.secondaryBg,
        bgHover: colors.secondaryBgHover,
        bgPressed: colors.secondaryBgPressed,
        text: colors.secondaryText,
      };
    case 'tertiary':
      return {
        bg: colors.tertiaryBg,
        bgHover: colors.tertiaryBgHover,
        bgPressed: colors.tertiaryBgPressed,
        text: colors.tertiaryText,
      };
    case 'error':
      return {
        bg: colors.errorBg,
        bgHover: colors.errorBgHover,
        bgPressed: colors.errorBgPressed,
        text: colors.errorText,
      };
    case 'surface':
      return {
        bg: colors.surfaceBg,
        bgHover: colors.surfaceBgHover,
        bgPressed: colors.surfaceBgPressed,
        text: colors.surfaceText,
        border: colors.surfaceBorder,
      };
    case 'outline':
      return {
        bg: colors.outlineBg,
        bgHover: colors.outlineBgHover,
        bgPressed: colors.outlineBgPressed,
        text: colors.outlineText,
        border: colors.outlineBorder,
        bgAlpha: 0,
      };
    case 'ghost':
      return {
        bg: colors.ghostBg,
        bgHover: colors.ghostBgHover,
        bgPressed: colors.ghostBgPressed,
        text: colors.ghostText,
        bgAlpha: 0,
      };
    case 'default':
    default:
      return {
        bg: colors.defaultBg,
        bgHover: colors.defaultBgHover,
        bgPressed: colors.defaultBgPressed,
        text: colors.defaultText,
        border: colors.defaultBorder,
      };
  }
}

// ============================================
// Size Preset Reading (Dynamic CSS Variables)
// ============================================

/**
 * Button/Component 사이즈 프리셋 타입
 */
export interface SizePreset {
  fontSize: number;
  paddingX: number;
  paddingY: number;
  borderRadius: number;
}

/**
 * CSS 변수에서 px 값 파싱
 * rem → px 변환 (1rem = 16px 기준)
 */
function parseCSSValue(value: string, fallback: number): number {
  if (!value) return fallback;

  const trimmed = value.trim();

  // px 값
  if (trimmed.endsWith('px')) {
    return parseFloat(trimmed) || fallback;
  }

  // rem 값 → px 변환 (1rem = 16px)
  if (trimmed.endsWith('rem')) {
    const remValue = parseFloat(trimmed);
    return remValue ? remValue * 16 : fallback;
  }

  // 숫자만 있는 경우
  const num = parseFloat(trimmed);
  return isNaN(num) ? fallback : num;
}

/**
 * Button.css 사이즈별 CSS 변수 매핑
 *
 * CSS 정의:
 * - xs: font-size: var(--text-2xs), padding: var(--spacing-2xs) var(--spacing-sm)
 * - sm: font-size: var(--text-sm),  padding: var(--spacing) var(--spacing-md)
 * - md: font-size: var(--text-base), padding: var(--spacing-sm) var(--spacing-xl)
 * - lg: font-size: var(--text-lg),  padding: var(--spacing-md) var(--spacing-2xl)
 * - xl: font-size: var(--text-xl),  padding: var(--spacing-lg) var(--spacing-3xl)
 */
const SIZE_CSS_MAPPING: Record<string, { fontSize: string; paddingY: string; paddingX: string; borderRadius: string }> = {
  xs: { fontSize: '--text-2xs', paddingY: '--spacing-2xs', paddingX: '--spacing-sm', borderRadius: '--radius-sm' },
  sm: { fontSize: '--text-sm', paddingY: '--spacing', paddingX: '--spacing-md', borderRadius: '--radius-sm' },
  md: { fontSize: '--text-base', paddingY: '--spacing-sm', paddingX: '--spacing-xl', borderRadius: '--radius-md' },
  lg: { fontSize: '--text-lg', paddingY: '--spacing-md', paddingX: '--spacing-2xl', borderRadius: '--radius-lg' },
  xl: { fontSize: '--text-xl', paddingY: '--spacing-lg', paddingX: '--spacing-3xl', borderRadius: '--radius-lg' },
};

/**
 * Fallback 값 (CSS 변수 읽기 실패 시)
 * shared-tokens.css와 동기화
 */
const SIZE_FALLBACKS: Record<string, SizePreset> = {
  xs: { fontSize: 10, paddingX: 8, paddingY: 2, borderRadius: 4 },
  sm: { fontSize: 14, paddingX: 12, paddingY: 4, borderRadius: 4 },
  md: { fontSize: 16, paddingX: 24, paddingY: 8, borderRadius: 6 },
  lg: { fontSize: 18, paddingX: 32, paddingY: 12, borderRadius: 8 },
  xl: { fontSize: 20, paddingX: 40, paddingY: 16, borderRadius: 8 },
};

/**
 * 사이즈별 프리셋을 CSS 변수에서 동적으로 읽어옴
 *
 * CSS 스타일시트 값 변경 시 WebGL 컴포넌트에도 자동 반영
 *
 * @param size - 'xs' | 'sm' | 'md' | 'lg' | 'xl'
 * @returns SizePreset with fontSize, paddingX, paddingY, borderRadius
 *
 * @example
 * const preset = getSizePreset('md');
 * // { fontSize: 16, paddingX: 24, paddingY: 8, borderRadius: 6 }
 */
export function getSizePreset(size: string): SizePreset {
  const mapping = SIZE_CSS_MAPPING[size];
  const fallback = SIZE_FALLBACKS[size] || SIZE_FALLBACKS.sm;

  if (!mapping) {
    return fallback;
  }

  // CSS 변수에서 값 읽기
  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const paddingX = parseCSSValue(getCSSVariable(mapping.paddingX), fallback.paddingX);
  const paddingY = parseCSSValue(getCSSVariable(mapping.paddingY), fallback.paddingY);
  const borderRadius = parseCSSValue(getCSSVariable(mapping.borderRadius), fallback.borderRadius);

  return { fontSize, paddingX, paddingY, borderRadius };
}

/**
 * 모든 사이즈 프리셋을 한번에 읽어옴
 * 컴포넌트 초기화 시 사용
 *
 * @returns Record<string, SizePreset>
 */
export function getAllSizePresets(): Record<string, SizePreset> {
  return {
    xs: getSizePreset('xs'),
    sm: getSizePreset('sm'),
    md: getSizePreset('md'),
    lg: getSizePreset('lg'),
    xl: getSizePreset('xl'),
  };
}

/**
 * Checkbox/Radio 등 컴포넌트용 사이즈 프리셋
 * 체크박스 박스 크기만 다름
 */
export interface CheckboxSizePreset {
  boxSize: number;
  fontSize: number;
  gap: number;
}

const CHECKBOX_SIZE_MAPPING: Record<string, { boxSize: string; fontSize: string }> = {
  sm: { boxSize: '--spacing-lg', fontSize: '--text-sm' },       // 16px box
  md: { boxSize: '--spacing-xl', fontSize: '--text-sm' },       // 24px box → 실제 20px 원함
  lg: { boxSize: '--spacing-xl', fontSize: '--text-base' },     // 24px box
};

const CHECKBOX_FALLBACKS: Record<string, CheckboxSizePreset> = {
  sm: { boxSize: 16, fontSize: 14, gap: 8 },
  md: { boxSize: 20, fontSize: 14, gap: 8 },
  lg: { boxSize: 24, fontSize: 16, gap: 8 },
};

/**
 * Checkbox/Radio 사이즈 프리셋 읽기
 */
export function getCheckboxSizePreset(size: string): CheckboxSizePreset {
  const mapping = CHECKBOX_SIZE_MAPPING[size];
  const fallback = CHECKBOX_FALLBACKS[size] || CHECKBOX_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  // CSS 변수에서 읽되, md의 경우 특수 처리 (20px 고정)
  const boxSize = size === 'md'
    ? 20
    : parseCSSValue(getCSSVariable(mapping.boxSize), fallback.boxSize);
  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const gap = parseCSSValue(getCSSVariable('--spacing-sm'), fallback.gap);

  return { boxSize, fontSize, gap };
}
