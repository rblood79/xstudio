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

// ============================================
// Slider Size Preset
// ============================================

/**
 * Slider 컴포넌트용 사이즈 프리셋
 *
 * CSS 정의 (Slider.css):
 * - sm: trackHeight: 24px, trackWidth: 1px, thumbSize: var(--text-xl)
 * - md: trackHeight: 30px, trackWidth: 2px, thumbSize: var(--text-2xl)
 * - lg: trackHeight: 36px, trackWidth: 3px, thumbSize: var(--text-3xl)
 */
export interface SliderSizePreset {
  trackHeight: number;
  trackWidth: number;
  thumbSize: number;
}

const SLIDER_SIZE_MAPPING: Record<string, { thumbSize: string }> = {
  sm: { thumbSize: '--text-xl' },   // 20px
  md: { thumbSize: '--text-2xl' },  // 24px
  lg: { thumbSize: '--text-3xl' },  // 30px
};

const SLIDER_FALLBACKS: Record<string, SliderSizePreset> = {
  sm: { trackHeight: 24, trackWidth: 1, thumbSize: 20 },
  md: { trackHeight: 30, trackWidth: 2, thumbSize: 24 },
  lg: { trackHeight: 36, trackWidth: 3, thumbSize: 30 },
};

/**
 * Slider 사이즈 프리셋 읽기
 */
export function getSliderSizePreset(size: string): SliderSizePreset {
  const mapping = SLIDER_SIZE_MAPPING[size];
  const fallback = SLIDER_FALLBACKS[size] || SLIDER_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const thumbSize = parseCSSValue(getCSSVariable(mapping.thumbSize), fallback.thumbSize);

  // trackHeight와 trackWidth는 CSS에서 하드코딩됨
  return {
    trackHeight: fallback.trackHeight,
    trackWidth: fallback.trackWidth,
    thumbSize,
  };
}

// ============================================
// Radio Size Preset
// ============================================

/**
 * Radio 컴포넌트용 사이즈 프리셋
 *
 * CSS 정의 (Radio.css):
 * - sm: radioSize: var(--text-lg), fontSize: var(--text-sm), selectedBorderWidth: 5px
 * - md: radioSize: var(--text-xl), fontSize: var(--text-base), selectedBorderWidth: ~10px
 * - lg: radioSize: var(--text-2xl), fontSize: var(--text-lg), selectedBorderWidth: 6px
 */
export interface RadioSizePreset {
  radioSize: number;
  fontSize: number;
  selectedBorderWidth: number;
  gap: number;
}

const RADIO_SIZE_MAPPING: Record<string, { radioSize: string; fontSize: string }> = {
  sm: { radioSize: '--text-lg', fontSize: '--text-sm' },
  md: { radioSize: '--text-xl', fontSize: '--text-base' },
  lg: { radioSize: '--text-2xl', fontSize: '--text-lg' },
};

const RADIO_FALLBACKS: Record<string, RadioSizePreset> = {
  sm: { radioSize: 18, fontSize: 14, selectedBorderWidth: 5, gap: 8 },
  md: { radioSize: 20, fontSize: 16, selectedBorderWidth: 6, gap: 8 },
  lg: { radioSize: 24, fontSize: 18, selectedBorderWidth: 7, gap: 10 },
};

/**
 * Radio 사이즈 프리셋 읽기
 */
export function getRadioSizePreset(size: string): RadioSizePreset {
  const mapping = RADIO_SIZE_MAPPING[size];
  const fallback = RADIO_FALLBACKS[size] || RADIO_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const radioSize = parseCSSValue(getCSSVariable(mapping.radioSize), fallback.radioSize);
  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const gap = parseCSSValue(getCSSVariable('--spacing-sm'), fallback.gap);

  return {
    radioSize,
    fontSize,
    selectedBorderWidth: fallback.selectedBorderWidth,
    gap,
  };
}

// ============================================
// ProgressBar Size Preset
// ============================================

/**
 * ProgressBar 컴포넌트용 사이즈 프리셋
 *
 * CSS 정의 (ProgressBar.css):
 * - sm: width: 200px, barHeight: 6px, fontSize: var(--text-sm), borderRadius: var(--radius-sm)
 * - md: width: 250px, barHeight: 10px, fontSize: var(--text-base), borderRadius: var(--radius-md)
 * - lg: width: 300px, barHeight: 14px, fontSize: var(--text-lg), borderRadius: var(--radius-lg)
 */
export interface ProgressBarSizePreset {
  width: number;
  barHeight: number;
  fontSize: number;
  borderRadius: number;
}

const PROGRESSBAR_SIZE_MAPPING: Record<string, { fontSize: string; borderRadius: string }> = {
  sm: { fontSize: '--text-sm', borderRadius: '--radius-sm' },
  md: { fontSize: '--text-base', borderRadius: '--radius-md' },
  lg: { fontSize: '--text-lg', borderRadius: '--radius-lg' },
};

const PROGRESSBAR_FALLBACKS: Record<string, ProgressBarSizePreset> = {
  sm: { width: 200, barHeight: 6, fontSize: 14, borderRadius: 4 },
  md: { width: 250, barHeight: 10, fontSize: 16, borderRadius: 6 },
  lg: { width: 300, barHeight: 14, fontSize: 18, borderRadius: 8 },
};

/**
 * ProgressBar 사이즈 프리셋 읽기
 */
export function getProgressBarSizePreset(size: string): ProgressBarSizePreset {
  const mapping = PROGRESSBAR_SIZE_MAPPING[size];
  const fallback = PROGRESSBAR_FALLBACKS[size] || PROGRESSBAR_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const borderRadius = parseCSSValue(getCSSVariable(mapping.borderRadius), fallback.borderRadius);

  return {
    width: fallback.width,
    barHeight: fallback.barHeight,
    fontSize,
    borderRadius,
  };
}

// ============================================
// Input (TextField) Size Preset
// ============================================

/**
 * Input/TextField 컴포넌트용 사이즈 프리셋
 *
 * CSS 정의 (TextField.css):
 * - sm: labelSize: var(--text-xs), paddingY: var(--spacing-sm), paddingX: var(--spacing), fontSize: var(--text-xs)
 * - md: labelSize: var(--text-sm), paddingY: var(--spacing), paddingX: var(--spacing-md), fontSize: var(--text-sm)
 * - lg: labelSize: var(--text-base), paddingY: var(--spacing-md), paddingX: var(--spacing-lg), fontSize: var(--text-base)
 */
export interface InputSizePreset {
  fontSize: number;
  labelSize: number;
  paddingX: number;
  paddingY: number;
  borderRadius: number;
}

const INPUT_SIZE_MAPPING: Record<string, { labelSize: string; fontSize: string; paddingY: string; paddingX: string }> = {
  sm: { labelSize: '--text-xs', fontSize: '--text-xs', paddingY: '--spacing-sm', paddingX: '--spacing' },
  md: { labelSize: '--text-sm', fontSize: '--text-sm', paddingY: '--spacing', paddingX: '--spacing-md' },
  lg: { labelSize: '--text-base', fontSize: '--text-base', paddingY: '--spacing-md', paddingX: '--spacing-lg' },
};

const INPUT_FALLBACKS: Record<string, InputSizePreset> = {
  sm: { fontSize: 12, labelSize: 12, paddingX: 8, paddingY: 6, borderRadius: 6 },
  md: { fontSize: 14, labelSize: 14, paddingX: 12, paddingY: 8, borderRadius: 6 },
  lg: { fontSize: 16, labelSize: 16, paddingX: 16, paddingY: 12, borderRadius: 6 },
};

/**
 * Input 사이즈 프리셋 읽기
 */
export function getInputSizePreset(size: string): InputSizePreset {
  const mapping = INPUT_SIZE_MAPPING[size];
  const fallback = INPUT_FALLBACKS[size] || INPUT_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const labelSize = parseCSSValue(getCSSVariable(mapping.labelSize), fallback.labelSize);
  const paddingX = parseCSSValue(getCSSVariable(mapping.paddingX), fallback.paddingX);
  const paddingY = parseCSSValue(getCSSVariable(mapping.paddingY), fallback.paddingY);
  const borderRadius = parseCSSValue(getCSSVariable('--border-radius'), fallback.borderRadius);

  return { fontSize, labelSize, paddingX, paddingY, borderRadius };
}

// ============================================
// Select Size Preset
// ============================================

/**
 * Select 컴포넌트용 사이즈 프리셋
 *
 * CSS 정의 (Select.css):
 * - sm: labelSize: var(--text-xs), paddingY: var(--spacing-sm), paddingX: var(--spacing), fontSize: var(--text-xs), chevronSize: 20px
 * - md: labelSize: var(--text-sm), paddingY: var(--spacing), paddingX: var(--spacing-md), fontSize: var(--text-sm), chevronSize: 24px
 * - lg: labelSize: var(--text-base), paddingY: var(--spacing-md), paddingX: var(--spacing-lg), fontSize: var(--text-base), chevronSize: 28px
 */
export interface SelectSizePreset {
  fontSize: number;
  labelSize: number;
  paddingX: number;
  paddingY: number;
  chevronSize: number;
  borderRadius: number;
}

const SELECT_SIZE_MAPPING: Record<string, { labelSize: string; fontSize: string; paddingY: string; paddingX: string }> = {
  sm: { labelSize: '--text-xs', fontSize: '--text-xs', paddingY: '--spacing-sm', paddingX: '--spacing' },
  md: { labelSize: '--text-sm', fontSize: '--text-sm', paddingY: '--spacing', paddingX: '--spacing-md' },
  lg: { labelSize: '--text-base', fontSize: '--text-base', paddingY: '--spacing-md', paddingX: '--spacing-lg' },
};

const SELECT_FALLBACKS: Record<string, SelectSizePreset> = {
  sm: { fontSize: 12, labelSize: 12, paddingX: 8, paddingY: 6, chevronSize: 20, borderRadius: 6 },
  md: { fontSize: 14, labelSize: 14, paddingX: 12, paddingY: 8, chevronSize: 24, borderRadius: 6 },
  lg: { fontSize: 16, labelSize: 16, paddingX: 16, paddingY: 12, chevronSize: 28, borderRadius: 6 },
};

/**
 * Select 사이즈 프리셋 읽기
 */
export function getSelectSizePreset(size: string): SelectSizePreset {
  const mapping = SELECT_SIZE_MAPPING[size];
  const fallback = SELECT_FALLBACKS[size] || SELECT_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const labelSize = parseCSSValue(getCSSVariable(mapping.labelSize), fallback.labelSize);
  const paddingX = parseCSSValue(getCSSVariable(mapping.paddingX), fallback.paddingX);
  const paddingY = parseCSSValue(getCSSVariable(mapping.paddingY), fallback.paddingY);
  const borderRadius = parseCSSValue(getCSSVariable('--border-radius'), fallback.borderRadius);

  return {
    fontSize,
    labelSize,
    paddingX,
    paddingY,
    chevronSize: fallback.chevronSize,
    borderRadius,
  };
}

// ============================================
// Switch Size Preset
// ============================================

/**
 * Switch 컴포넌트용 사이즈 프리셋
 *
 * CSS 정의 (Switch.css):
 * - sm: indicatorWidth: calc(var(--text-4xl) + 4px), indicatorHeight: calc(var(--text-lg) + 2px), thumbSize: var(--text-lg), fontSize: var(--text-sm)
 * - md: indicatorWidth: calc(var(--text-4xl) + 8px), indicatorHeight: calc(var(--text-xl) + 4px), thumbSize: var(--text-xl), fontSize: var(--text-base)
 * - lg: indicatorWidth: 52px, indicatorHeight: 28px, thumbSize: 24px, fontSize: var(--text-lg)
 */
export interface SwitchSizePreset {
  indicatorWidth: number;
  indicatorHeight: number;
  thumbSize: number;
  fontSize: number;
  gap: number;
}

const SWITCH_SIZE_MAPPING: Record<string, { fontSize: string; thumbSize: string }> = {
  sm: { fontSize: '--text-sm', thumbSize: '--text-lg' },
  md: { fontSize: '--text-base', thumbSize: '--text-xl' },
  lg: { fontSize: '--text-lg', thumbSize: '--text-2xl' },
};

const SWITCH_FALLBACKS: Record<string, SwitchSizePreset> = {
  sm: { indicatorWidth: 40, indicatorHeight: 20, thumbSize: 18, fontSize: 14, gap: 8 },
  md: { indicatorWidth: 44, indicatorHeight: 24, thumbSize: 20, fontSize: 16, gap: 8 },
  lg: { indicatorWidth: 52, indicatorHeight: 28, thumbSize: 24, fontSize: 18, gap: 10 },
};

/**
 * Switch 사이즈 프리셋 읽기
 */
export function getSwitchSizePreset(size: string): SwitchSizePreset {
  const mapping = SWITCH_SIZE_MAPPING[size];
  const fallback = SWITCH_FALLBACKS[size] || SWITCH_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const thumbSize = parseCSSValue(getCSSVariable(mapping.thumbSize), fallback.thumbSize);
  const gap = parseCSSValue(getCSSVariable('--gap'), fallback.gap);

  // indicatorWidth와 indicatorHeight는 계산이 복잡하므로 fallback 사용
  // 실제 CSS에서 calc()를 사용하기 때문
  return {
    indicatorWidth: fallback.indicatorWidth,
    indicatorHeight: fallback.indicatorHeight,
    thumbSize,
    fontSize,
    gap,
  };
}

// ============================================
// ToggleButton Size Preset
// ============================================

/**
 * ToggleButton 사이즈 프리셋
 *
 * CSS에서 읽어오는 값:
 * - sm: fontSize: var(--text-sm), paddingY: var(--spacing), paddingX: var(--spacing-md)
 * - md: fontSize: var(--text-base), paddingY: var(--spacing-sm), paddingX: var(--spacing-xl)
 * - lg: fontSize: var(--text-lg), paddingY: var(--spacing-md), paddingX: var(--spacing-2xl)
 */
export interface ToggleButtonSizePreset {
  fontSize: number;
  paddingY: number;
  paddingX: number;
  borderRadius: number;
}

const TOGGLE_BUTTON_SIZE_MAPPING: Record<string, { fontSize: string; paddingY: string; paddingX: string }> = {
  sm: { fontSize: '--text-sm', paddingY: '--spacing', paddingX: '--spacing-md' },
  md: { fontSize: '--text-base', paddingY: '--spacing-sm', paddingX: '--spacing-xl' },
  lg: { fontSize: '--text-lg', paddingY: '--spacing-md', paddingX: '--spacing-2xl' },
};

const TOGGLE_BUTTON_FALLBACKS: Record<string, ToggleButtonSizePreset> = {
  sm: { fontSize: 14, paddingY: 4, paddingX: 12, borderRadius: 6 },
  md: { fontSize: 16, paddingY: 8, paddingX: 20, borderRadius: 8 },
  lg: { fontSize: 18, paddingY: 12, paddingX: 24, borderRadius: 10 },
};

/**
 * ToggleButton 사이즈 프리셋 읽기
 */
export function getToggleButtonSizePreset(size: string): ToggleButtonSizePreset {
  const mapping = TOGGLE_BUTTON_SIZE_MAPPING[size];
  const fallback = TOGGLE_BUTTON_FALLBACKS[size] || TOGGLE_BUTTON_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const paddingY = parseCSSValue(getCSSVariable(mapping.paddingY), fallback.paddingY);
  const paddingX = parseCSSValue(getCSSVariable(mapping.paddingX), fallback.paddingX);
  const borderRadius = parseCSSValue(getCSSVariable('--radius-md'), fallback.borderRadius);

  return {
    fontSize,
    paddingY,
    paddingX,
    borderRadius,
  };
}

// ============================================
// ToggleButton Color Preset
// ============================================

/**
 * ToggleButton 색상 프리셋
 *
 * CSS에서 읽어오는 값 (variant별):
 * - default/unselected: bg=transparent, border=--color-gray-300, text=--color-gray-700
 * - selected (per variant): bg/border/text from CSS variables
 */
export interface ToggleButtonColorPreset {
  background: number;
  border: number;
  text: number;
  selectedBackground: number;
  selectedBorder: number;
  selectedText: number;
  hoverBackground: number;
  pressedBackground: number;
}

const TOGGLE_BUTTON_COLOR_FALLBACKS: Record<string, ToggleButtonColorPreset> = {
  default: {
    background: 0xffffff,
    border: 0xd1d5db,
    text: 0x374151,
    selectedBackground: 0x3b82f6,
    selectedBorder: 0x3b82f6,
    selectedText: 0xffffff,
    hoverBackground: 0xf3f4f6,
    pressedBackground: 0xe5e7eb,
  },
  primary: {
    background: 0xffffff,
    border: 0xd1d5db,
    text: 0x374151,
    selectedBackground: 0x3b82f6,
    selectedBorder: 0x3b82f6,
    selectedText: 0xffffff,
    hoverBackground: 0xdbeafe,
    pressedBackground: 0xbfdbfe,
  },
  secondary: {
    background: 0xffffff,
    border: 0xd1d5db,
    text: 0x374151,
    selectedBackground: 0x6366f1,
    selectedBorder: 0x6366f1,
    selectedText: 0xffffff,
    hoverBackground: 0xe0e7ff,
    pressedBackground: 0xc7d2fe,
  },
  surface: {
    background: 0xffffff,
    border: 0xd1d5db,
    text: 0x374151,
    selectedBackground: 0x6b7280,
    selectedBorder: 0x6b7280,
    selectedText: 0xffffff,
    hoverBackground: 0xf3f4f6,
    pressedBackground: 0xe5e7eb,
  },
};

/**
 * ToggleButton 색상 프리셋 읽기
 */
export function getToggleButtonColorPreset(variant: string): ToggleButtonColorPreset {
  const fallback = TOGGLE_BUTTON_COLOR_FALLBACKS[variant] || TOGGLE_BUTTON_COLOR_FALLBACKS.default;

  // CSS 변수에서 색상 읽기 시도 (fallback 사용)
  // ToggleButton CSS에서는 --tb-selected-bg 등의 변수 사용
  return {
    background: cssColorToHex(getCSSVariable('--color-white'), fallback.background),
    border: cssColorToHex(getCSSVariable('--color-gray-300'), fallback.border),
    text: cssColorToHex(getCSSVariable('--color-gray-700'), fallback.text),
    selectedBackground: fallback.selectedBackground,
    selectedBorder: fallback.selectedBorder,
    selectedText: fallback.selectedText,
    hoverBackground: fallback.hoverBackground,
    pressedBackground: fallback.pressedBackground,
  };
}

// ============================================
// ListBox Size Preset
// ============================================

/**
 * ListBox 사이즈 프리셋
 *
 * CSS에서 읽어오는 값:
 * - sm: fontSize: var(--text-xs), itemPaddingY: var(--spacing-sm), itemPaddingX: var(--spacing), itemHeight: 32px
 * - md: fontSize: var(--text-sm), itemPaddingY: var(--spacing), itemPaddingX: var(--spacing-md), itemHeight: 40px
 * - lg: fontSize: var(--text-base), itemPaddingY: var(--spacing-md), itemPaddingX: var(--spacing-lg), itemHeight: 48px
 */
export interface ListBoxSizePreset {
  fontSize: number;
  itemPaddingY: number;
  itemPaddingX: number;
  itemHeight: number;
  borderRadius: number;
  containerPadding: number;
  gap: number;
}

const LISTBOX_SIZE_MAPPING: Record<string, { fontSize: string; paddingY: string; paddingX: string }> = {
  sm: { fontSize: '--text-xs', paddingY: '--spacing-sm', paddingX: '--spacing' },
  md: { fontSize: '--text-sm', paddingY: '--spacing', paddingX: '--spacing-md' },
  lg: { fontSize: '--text-base', paddingY: '--spacing-md', paddingX: '--spacing-lg' },
};

const LISTBOX_FALLBACKS: Record<string, ListBoxSizePreset> = {
  sm: { fontSize: 12, itemPaddingY: 8, itemPaddingX: 4, itemHeight: 32, borderRadius: 4, containerPadding: 2, gap: 2 },
  md: { fontSize: 14, itemPaddingY: 4, itemPaddingX: 12, itemHeight: 40, borderRadius: 8, containerPadding: 4, gap: 4 },
  lg: { fontSize: 16, itemPaddingY: 12, itemPaddingX: 16, itemHeight: 48, borderRadius: 8, containerPadding: 8, gap: 6 },
};

/**
 * ListBox 사이즈 프리셋 읽기
 */
export function getListBoxSizePreset(size: string): ListBoxSizePreset {
  const mapping = LISTBOX_SIZE_MAPPING[size];
  const fallback = LISTBOX_FALLBACKS[size] || LISTBOX_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const itemPaddingY = parseCSSValue(getCSSVariable(mapping.paddingY), fallback.itemPaddingY);
  const itemPaddingX = parseCSSValue(getCSSVariable(mapping.paddingX), fallback.itemPaddingX);
  const borderRadius = parseCSSValue(getCSSVariable('--radius-xs'), fallback.borderRadius);

  return {
    fontSize,
    itemPaddingY,
    itemPaddingX,
    itemHeight: fontSize + itemPaddingY * 2 + 4, // 계산된 높이
    borderRadius,
    containerPadding: fallback.containerPadding,
    gap: fallback.gap,
  };
}

// ============================================
// ListBox Color Preset
// ============================================

/**
 * ListBox 색상 프리셋
 */
export interface ListBoxColorPreset {
  containerBackground: number;
  containerBorder: number;
  itemBackground: number;
  itemHoverBackground: number;
  itemSelectedBackground: number;
  textColor: number;
  selectedTextColor: number;
}

const LISTBOX_COLOR_FALLBACKS: Record<string, ListBoxColorPreset> = {
  primary: {
    containerBackground: 0xffffff,
    containerBorder: 0xe5e7eb,
    itemBackground: 0xffffff,
    itemHoverBackground: 0xf3f4f6,
    itemSelectedBackground: 0xdbeafe,
    textColor: 0x374151,
    selectedTextColor: 0x1e40af,
  },
  secondary: {
    containerBackground: 0xffffff,
    containerBorder: 0xe5e7eb,
    itemBackground: 0xffffff,
    itemHoverBackground: 0xf3f4f6,
    itemSelectedBackground: 0xe0e7ff,
    textColor: 0x374151,
    selectedTextColor: 0x3730a3,
  },
  tertiary: {
    containerBackground: 0xffffff,
    containerBorder: 0xe5e7eb,
    itemBackground: 0xffffff,
    itemHoverBackground: 0xf3f4f6,
    itemSelectedBackground: 0xfce7f3,
    textColor: 0x374151,
    selectedTextColor: 0x9d174d,
  },
  error: {
    containerBackground: 0xffffff,
    containerBorder: 0xfca5a5,
    itemBackground: 0xffffff,
    itemHoverBackground: 0xfef2f2,
    itemSelectedBackground: 0xfee2e2,
    textColor: 0x374151,
    selectedTextColor: 0xb91c1c,
  },
  filled: {
    containerBackground: 0xf3f4f6,
    containerBorder: 0xf3f4f6,
    itemBackground: 0xf3f4f6,
    itemHoverBackground: 0xe5e7eb,
    itemSelectedBackground: 0xdbeafe,
    textColor: 0x374151,
    selectedTextColor: 0x1e40af,
  },
  surface: {
    containerBackground: 0xffffff,
    containerBorder: 0xe5e7eb,
    itemBackground: 0xffffff,
    itemHoverBackground: 0xf3f4f6,
    itemSelectedBackground: 0xf3f4f6,
    textColor: 0x374151,
    selectedTextColor: 0x111827,
  },
};

/**
 * ListBox 색상 프리셋 읽기
 */
export function getListBoxColorPreset(variant: string): ListBoxColorPreset {
  return LISTBOX_COLOR_FALLBACKS[variant] || LISTBOX_COLOR_FALLBACKS.primary;
}

// ============================================
// Badge Size Preset
// ============================================

/**
 * Badge 사이즈 프리셋
 *
 * CSS에서 읽어오는 값:
 * - sm: fontSize: var(--text-sm), paddingY: 2px, paddingX: var(--spacing-md), height: 20px
 * - md: fontSize: var(--text-base), paddingY: var(--spacing-sm), paddingX: var(--spacing-md), height: 24px
 * - lg: fontSize: var(--text-lg), paddingY: var(--spacing-sm), paddingX: var(--spacing-lg), height: 28px
 */
export interface BadgeSizePreset {
  fontSize: number;
  paddingY: number;
  paddingX: number;
  height: number;
  minWidth: number;
  dotSize: number;
}

const BADGE_SIZE_MAPPING: Record<string, { fontSize: string; paddingX: string }> = {
  sm: { fontSize: '--text-sm', paddingX: '--spacing-md' },
  md: { fontSize: '--text-base', paddingX: '--spacing-md' },
  lg: { fontSize: '--text-lg', paddingX: '--spacing-lg' },
};

const BADGE_FALLBACKS: Record<string, BadgeSizePreset> = {
  sm: { fontSize: 14, paddingY: 2, paddingX: 12, height: 20, minWidth: 20, dotSize: 8 },
  md: { fontSize: 16, paddingY: 8, paddingX: 12, height: 24, minWidth: 24, dotSize: 10 },
  lg: { fontSize: 18, paddingY: 8, paddingX: 16, height: 28, minWidth: 28, dotSize: 12 },
};

/**
 * Badge 사이즈 프리셋 읽기
 */
export function getBadgeSizePreset(size: string): BadgeSizePreset {
  const mapping = BADGE_SIZE_MAPPING[size];
  const fallback = BADGE_FALLBACKS[size] || BADGE_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const paddingX = parseCSSValue(getCSSVariable(mapping.paddingX), fallback.paddingX);

  return {
    fontSize,
    paddingY: fallback.paddingY,
    paddingX,
    height: fallback.height,
    minWidth: fallback.minWidth,
    dotSize: fallback.dotSize,
  };
}

// ============================================
// Badge Color Preset
// ============================================

/**
 * Badge 색상 프리셋
 */
export interface BadgeColorPreset {
  background: number;
  text: number;
}

const BADGE_COLOR_FALLBACKS: Record<string, BadgeColorPreset> = {
  default: { background: 0xe5e7eb, text: 0x6b7280 },
  primary: { background: 0x3b82f6, text: 0xffffff },
  secondary: { background: 0x6366f1, text: 0xffffff },
  tertiary: { background: 0xec4899, text: 0xffffff },
  error: { background: 0xef4444, text: 0xffffff },
  surface: { background: 0xf3f4f6, text: 0x374151 },
};

/**
 * Badge 색상 프리셋 읽기
 */
export function getBadgeColorPreset(variant: string): BadgeColorPreset {
  return BADGE_COLOR_FALLBACKS[variant] || BADGE_COLOR_FALLBACKS.default;
}

// ============================================
// Meter Size Preset
// ============================================

/**
 * Meter 사이즈 프리셋
 *
 * CSS에서 읽어오는 값:
 * - sm: width: 200px, barHeight: 6px, fontSize: var(--text-sm)
 * - md: width: 250px, barHeight: 10px, fontSize: var(--text-base)
 * - lg: width: 300px, barHeight: 14px, fontSize: var(--text-lg)
 */
export interface MeterSizePreset {
  width: number;
  barHeight: number;
  borderRadius: number;
  fontSize: number;
  gap: number;
}

const METER_SIZE_MAPPING: Record<string, { fontSize: string; borderRadius: string }> = {
  sm: { fontSize: '--text-sm', borderRadius: '--radius-sm' },
  md: { fontSize: '--text-base', borderRadius: '--radius-md' },
  lg: { fontSize: '--text-lg', borderRadius: '--radius-lg' },
};

const METER_FALLBACKS: Record<string, MeterSizePreset> = {
  sm: { width: 200, barHeight: 6, borderRadius: 4, fontSize: 14, gap: 4 },
  md: { width: 250, barHeight: 10, borderRadius: 8, fontSize: 16, gap: 4 },
  lg: { width: 300, barHeight: 14, borderRadius: 12, fontSize: 18, gap: 4 },
};

/**
 * Meter 사이즈 프리셋 읽기
 */
export function getMeterSizePreset(size: string): MeterSizePreset {
  const mapping = METER_SIZE_MAPPING[size];
  const fallback = METER_FALLBACKS[size] || METER_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const borderRadius = parseCSSValue(getCSSVariable(mapping.borderRadius), fallback.borderRadius);

  return {
    width: fallback.width,
    barHeight: fallback.barHeight,
    borderRadius,
    fontSize,
    gap: fallback.gap,
  };
}

// ============================================
// Meter Color Preset
// ============================================

/**
 * Meter 색상 프리셋
 */
export interface MeterColorPreset {
  trackColor: number;
  fillColor: number;
  labelColor: number;
  valueColor: number;
}

const METER_COLOR_FALLBACKS: Record<string, MeterColorPreset> = {
  default: { trackColor: 0xe5e7eb, fillColor: 0x3b82f6, labelColor: 0x374151, valueColor: 0x6b7280 },
  primary: { trackColor: 0xe5e7eb, fillColor: 0x3b82f6, labelColor: 0x374151, valueColor: 0x6b7280 },
  secondary: { trackColor: 0xe5e7eb, fillColor: 0x6366f1, labelColor: 0x374151, valueColor: 0x6b7280 },
  tertiary: { trackColor: 0xe5e7eb, fillColor: 0xec4899, labelColor: 0x374151, valueColor: 0x6b7280 },
  error: { trackColor: 0xe5e7eb, fillColor: 0xef4444, labelColor: 0x374151, valueColor: 0x6b7280 },
  surface: { trackColor: 0xe5e7eb, fillColor: 0x6b7280, labelColor: 0x374151, valueColor: 0x6b7280 },
};

/**
 * Meter 색상 프리셋 읽기
 */
export function getMeterColorPreset(variant: string): MeterColorPreset {
  return METER_COLOR_FALLBACKS[variant] || METER_COLOR_FALLBACKS.primary;
}

// ============================================
// Phase 2: Separator Size Preset
// ============================================

/**
 * Separator 사이즈 프리셋
 *
 * CSS에서 읽어오는 값:
 * - sm: thickness: 1px, margin: var(--spacing-2)
 * - md: thickness: 1px, margin: var(--spacing-4)
 * - lg: thickness: 2px, margin: var(--spacing-6)
 */
export interface SeparatorSizePreset {
  thickness: number;
  margin: number;
}

const SEPARATOR_SIZE_MAPPING: Record<string, { margin: string }> = {
  sm: { margin: '--spacing-2' },
  md: { margin: '--spacing-4' },
  lg: { margin: '--spacing-6' },
};

const SEPARATOR_FALLBACKS: Record<string, SeparatorSizePreset> = {
  sm: { thickness: 1, margin: 4 },
  md: { thickness: 1, margin: 8 },
  lg: { thickness: 2, margin: 12 },
};

/**
 * Separator 사이즈 프리셋 읽기
 */
export function getSeparatorSizePreset(size: string): SeparatorSizePreset {
  const mapping = SEPARATOR_SIZE_MAPPING[size];
  const fallback = SEPARATOR_FALLBACKS[size] || SEPARATOR_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const margin = parseCSSValue(getCSSVariable(mapping.margin), fallback.margin);

  return {
    thickness: fallback.thickness,
    margin,
  };
}

/**
 * Separator 색상 프리셋
 */
export interface SeparatorColorPreset {
  color: number;
}

const SEPARATOR_COLOR_FALLBACKS: Record<string, SeparatorColorPreset> = {
  default: { color: 0xcad3dc },
  primary: { color: 0x3b82f6 },
  secondary: { color: 0x6366f1 },
  surface: { color: 0x9ca3af },
};

/**
 * Separator 색상 프리셋 읽기
 */
export function getSeparatorColorPreset(variant: string): SeparatorColorPreset {
  return SEPARATOR_COLOR_FALLBACKS[variant] || SEPARATOR_COLOR_FALLBACKS.default;
}

// ============================================
// Phase 2: Link Size Preset
// ============================================

/**
 * Link 사이즈 프리셋
 *
 * CSS에서 읽어오는 값:
 * - sm: fontSize: var(--text-sm)
 * - md: fontSize: var(--text-base)
 * - lg: fontSize: var(--text-lg)
 */
export interface LinkSizePreset {
  fontSize: number;
}

const LINK_SIZE_MAPPING: Record<string, { fontSize: string }> = {
  sm: { fontSize: '--text-sm' },
  md: { fontSize: '--text-base' },
  lg: { fontSize: '--text-lg' },
};

const LINK_FALLBACKS: Record<string, LinkSizePreset> = {
  sm: { fontSize: 14 },
  md: { fontSize: 16 },
  lg: { fontSize: 18 },
};

/**
 * Link 사이즈 프리셋 읽기
 */
export function getLinkSizePreset(size: string): LinkSizePreset {
  const mapping = LINK_SIZE_MAPPING[size];
  const fallback = LINK_FALLBACKS[size] || LINK_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);

  return {
    fontSize,
  };
}

/**
 * Link 색상 프리셋
 */
export interface LinkColorPreset {
  color: number;
  hoverColor: number;
  pressedColor: number;
}

const LINK_COLOR_FALLBACKS: Record<string, LinkColorPreset> = {
  default: { color: 0x3b82f6, hoverColor: 0x2563eb, pressedColor: 0x1d4ed8 },
  primary: { color: 0x3b82f6, hoverColor: 0x2563eb, pressedColor: 0x1d4ed8 },
  secondary: { color: 0x6366f1, hoverColor: 0x4f46e5, pressedColor: 0x4338ca },
};

/**
 * Link 색상 프리셋 읽기
 */
export function getLinkColorPreset(variant: string): LinkColorPreset {
  return LINK_COLOR_FALLBACKS[variant] || LINK_COLOR_FALLBACKS.primary;
}

// ============================================
// Phase 2: Breadcrumbs Size Preset
// ============================================

/**
 * Breadcrumbs 사이즈 프리셋
 */
export interface BreadcrumbsSizePreset {
  fontSize: number;
  gap: number;
  padding: number;
}

const BREADCRUMBS_SIZE_MAPPING: Record<string, { fontSize: string; gap: string }> = {
  sm: { fontSize: '--text-xs', gap: '--spacing-xs' },
  md: { fontSize: '--text-sm', gap: '--spacing' },
  lg: { fontSize: '--text-base', gap: '--spacing-sm' },
};

const BREADCRUMBS_FALLBACKS: Record<string, BreadcrumbsSizePreset> = {
  sm: { fontSize: 12, gap: 4, padding: 4 },
  md: { fontSize: 14, gap: 8, padding: 8 },
  lg: { fontSize: 16, gap: 10, padding: 12 },
};

/**
 * Breadcrumbs 사이즈 프리셋 읽기
 */
export function getBreadcrumbsSizePreset(size: string): BreadcrumbsSizePreset {
  const mapping = BREADCRUMBS_SIZE_MAPPING[size];
  const fallback = BREADCRUMBS_FALLBACKS[size] || BREADCRUMBS_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const gap = parseCSSValue(getCSSVariable(mapping.gap), fallback.gap);

  return {
    fontSize,
    gap,
    padding: fallback.padding,
  };
}

/**
 * Breadcrumbs 색상 프리셋
 */
export interface BreadcrumbsColorPreset {
  textColor: number;
  currentColor: number;
  separatorColor: number;
}

const BREADCRUMBS_COLOR_FALLBACKS: Record<string, BreadcrumbsColorPreset> = {
  default: { textColor: 0x6b7280, currentColor: 0x374151, separatorColor: 0x9ca3af },
  primary: { textColor: 0x6b7280, currentColor: 0x3b82f6, separatorColor: 0x9ca3af },
  secondary: { textColor: 0x6b7280, currentColor: 0x6366f1, separatorColor: 0x9ca3af },
  tertiary: { textColor: 0x6b7280, currentColor: 0xec4899, separatorColor: 0x9ca3af },
  error: { textColor: 0x6b7280, currentColor: 0xef4444, separatorColor: 0x9ca3af },
};

/**
 * Breadcrumbs 색상 프리셋 읽기
 */
export function getBreadcrumbsColorPreset(variant: string): BreadcrumbsColorPreset {
  return BREADCRUMBS_COLOR_FALLBACKS[variant] || BREADCRUMBS_COLOR_FALLBACKS.default;
}

// ============================================
// Phase 2: Card Size Preset
// ============================================

/**
 * Card 사이즈 프리셋
 */
export interface CardSizePreset {
  padding: number;
  borderRadius: number;
}

const CARD_SIZE_MAPPING: Record<string, { padding: string; borderRadius: string }> = {
  sm: { padding: '--spacing-sm', borderRadius: '--radius-md' },
  md: { padding: '--spacing-md', borderRadius: '--radius-lg' },
  lg: { padding: '--spacing-lg', borderRadius: '--radius-xl' },
};

const CARD_FALLBACKS: Record<string, CardSizePreset> = {
  sm: { padding: 8, borderRadius: 8 },
  md: { padding: 12, borderRadius: 12 },
  lg: { padding: 16, borderRadius: 16 },
};

/**
 * Card 사이즈 프리셋 읽기
 */
export function getCardSizePreset(size: string): CardSizePreset {
  const mapping = CARD_SIZE_MAPPING[size];
  const fallback = CARD_FALLBACKS[size] || CARD_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const padding = parseCSSValue(getCSSVariable(mapping.padding), fallback.padding);
  const borderRadius = parseCSSValue(getCSSVariable(mapping.borderRadius), fallback.borderRadius);

  return {
    padding,
    borderRadius,
  };
}

/**
 * Card 색상 프리셋
 */
export interface CardColorPreset {
  backgroundColor: number;
  borderColor: number;
  textColor: number;
  hoverBgColor: number;
}

const CARD_COLOR_FALLBACKS: Record<string, CardColorPreset> = {
  default: { backgroundColor: 0xf3f4f6, borderColor: 0xcad3dc, textColor: 0x374151, hoverBgColor: 0xe5e7eb },
  primary: { backgroundColor: 0x3b82f6, borderColor: 0x3b82f6, textColor: 0xffffff, hoverBgColor: 0x2563eb },
  secondary: { backgroundColor: 0x6366f1, borderColor: 0x6366f1, textColor: 0xffffff, hoverBgColor: 0x4f46e5 },
  surface: { backgroundColor: 0xf9fafb, borderColor: 0xcad3dc, textColor: 0x374151, hoverBgColor: 0xf3f4f6 },
  elevated: { backgroundColor: 0xffffff, borderColor: 0x00000000, textColor: 0x374151, hoverBgColor: 0xf9fafb },
  outlined: { backgroundColor: 0xffffff, borderColor: 0x9ca3af, textColor: 0x374151, hoverBgColor: 0xf9fafb },
};

/**
 * Card 색상 프리셋 읽기
 */
export function getCardColorPreset(variant: string): CardColorPreset {
  return CARD_COLOR_FALLBACKS[variant] || CARD_COLOR_FALLBACKS.default;
}

// ============================================
// Phase 2: Menu Size Preset
// ============================================

/**
 * Menu 사이즈 프리셋
 */
export interface MenuSizePreset {
  fontSize: number;
  itemPaddingX: number;
  itemPaddingY: number;
  containerPadding: number;
  minWidth: number;
  borderRadius: number;
}

const MENU_SIZE_MAPPING: Record<string, { fontSize: string; paddingX: string; paddingY: string }> = {
  sm: { fontSize: '--text-xs', paddingX: '--spacing', paddingY: '--spacing-sm' },
  md: { fontSize: '--text-sm', paddingX: '--spacing-md', paddingY: '--spacing' },
  lg: { fontSize: '--text-base', paddingX: '--spacing-lg', paddingY: '--spacing-md' },
};

const MENU_FALLBACKS: Record<string, MenuSizePreset> = {
  sm: { fontSize: 12, itemPaddingX: 8, itemPaddingY: 6, containerPadding: 6, minWidth: 120, borderRadius: 6 },
  md: { fontSize: 14, itemPaddingX: 12, itemPaddingY: 8, containerPadding: 8, minWidth: 150, borderRadius: 8 },
  lg: { fontSize: 16, itemPaddingX: 16, itemPaddingY: 12, containerPadding: 12, minWidth: 180, borderRadius: 10 },
};

/**
 * Menu 사이즈 프리셋 읽기
 */
export function getMenuSizePreset(size: string): MenuSizePreset {
  const mapping = MENU_SIZE_MAPPING[size];
  const fallback = MENU_FALLBACKS[size] || MENU_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const itemPaddingX = parseCSSValue(getCSSVariable(mapping.paddingX), fallback.itemPaddingX);
  const itemPaddingY = parseCSSValue(getCSSVariable(mapping.paddingY), fallback.itemPaddingY);

  return {
    fontSize,
    itemPaddingX,
    itemPaddingY,
    containerPadding: fallback.containerPadding,
    minWidth: fallback.minWidth,
    borderRadius: fallback.borderRadius,
  };
}

/**
 * Menu 색상 프리셋
 */
export interface MenuColorPreset {
  backgroundColor: number;
  borderColor: number;
  textColor: number;
  hoverBgColor: number;
  hoverTextColor: number;
  separatorColor: number;
}

const MENU_COLOR_FALLBACKS: Record<string, MenuColorPreset> = {
  default: { backgroundColor: 0xf3f4f6, borderColor: 0xcad3dc, textColor: 0x374151, hoverBgColor: 0xdbeafe, hoverTextColor: 0x1e40af, separatorColor: 0xcad3dc },
  primary: { backgroundColor: 0xf3f4f6, borderColor: 0x3b82f6, textColor: 0x374151, hoverBgColor: 0xdbeafe, hoverTextColor: 0x1e40af, separatorColor: 0x3b82f6 },
  secondary: { backgroundColor: 0xf3f4f6, borderColor: 0x6366f1, textColor: 0x374151, hoverBgColor: 0xe0e7ff, hoverTextColor: 0x3730a3, separatorColor: 0x6366f1 },
  tertiary: { backgroundColor: 0xf3f4f6, borderColor: 0xec4899, textColor: 0x374151, hoverBgColor: 0xfce7f3, hoverTextColor: 0x9d174d, separatorColor: 0xec4899 },
  error: { backgroundColor: 0xf3f4f6, borderColor: 0xef4444, textColor: 0x374151, hoverBgColor: 0xfee2e2, hoverTextColor: 0x991b1b, separatorColor: 0xef4444 },
  filled: { backgroundColor: 0xf9fafb, borderColor: 0x00000000, textColor: 0x374151, hoverBgColor: 0xe5e7eb, hoverTextColor: 0x374151, separatorColor: 0x9ca3af },
};

/**
 * Menu 색상 프리셋 읽기
 */
export function getMenuColorPreset(variant: string): MenuColorPreset {
  return MENU_COLOR_FALLBACKS[variant] || MENU_COLOR_FALLBACKS.default;
}

// ============================================
// Phase 2: Tabs Size Preset
// ============================================

/**
 * Tabs 사이즈 프리셋
 */
export interface TabsSizePreset {
  fontSize: number;
  tabPaddingX: number;
  tabPaddingY: number;
  indicatorHeight: number;
  panelPadding: number;
}

const TABS_SIZE_MAPPING: Record<string, { fontSize: string; paddingX: string; paddingY: string }> = {
  sm: { fontSize: '--text-xs', paddingX: '--spacing-md', paddingY: '--spacing-sm' },
  md: { fontSize: '--text-sm', paddingX: '--spacing-lg', paddingY: '--spacing' },
  lg: { fontSize: '--text-base', paddingX: '--spacing-xl', paddingY: '--spacing-md' },
};

const TABS_FALLBACKS: Record<string, TabsSizePreset> = {
  sm: { fontSize: 12, tabPaddingX: 12, tabPaddingY: 6, indicatorHeight: 2, panelPadding: 12 },
  md: { fontSize: 14, tabPaddingX: 16, tabPaddingY: 8, indicatorHeight: 3, panelPadding: 16 },
  lg: { fontSize: 16, tabPaddingX: 20, tabPaddingY: 12, indicatorHeight: 4, panelPadding: 20 },
};

/**
 * Tabs 사이즈 프리셋 읽기
 */
export function getTabsSizePreset(size: string): TabsSizePreset {
  const mapping = TABS_SIZE_MAPPING[size];
  const fallback = TABS_FALLBACKS[size] || TABS_FALLBACKS.md;

  if (!mapping) {
    return fallback;
  }

  const fontSize = parseCSSValue(getCSSVariable(mapping.fontSize), fallback.fontSize);
  const tabPaddingX = parseCSSValue(getCSSVariable(mapping.paddingX), fallback.tabPaddingX);
  const tabPaddingY = parseCSSValue(getCSSVariable(mapping.paddingY), fallback.tabPaddingY);

  return {
    fontSize,
    tabPaddingX,
    tabPaddingY,
    indicatorHeight: fallback.indicatorHeight,
    panelPadding: fallback.panelPadding,
  };
}

/**
 * Tabs 색상 프리셋
 */
export interface TabsColorPreset {
  textColor: number;
  selectedTextColor: number;
  indicatorColor: number;
  hoverBgColor: number;
  borderColor: number;
}

const TABS_COLOR_FALLBACKS: Record<string, TabsColorPreset> = {
  default: { textColor: 0x6b7280, selectedTextColor: 0x374151, indicatorColor: 0x3b82f6, hoverBgColor: 0x00000014, borderColor: 0xcad3dc },
  primary: { textColor: 0x6b7280, selectedTextColor: 0x3b82f6, indicatorColor: 0x3b82f6, hoverBgColor: 0x3b82f614, borderColor: 0xcad3dc },
  secondary: { textColor: 0x6b7280, selectedTextColor: 0x6366f1, indicatorColor: 0x6366f1, hoverBgColor: 0x6366f114, borderColor: 0xcad3dc },
  tertiary: { textColor: 0x6b7280, selectedTextColor: 0xec4899, indicatorColor: 0xec4899, hoverBgColor: 0xec489914, borderColor: 0xcad3dc },
};

/**
 * Tabs 색상 프리셋 읽기
 */
export function getTabsColorPreset(variant: string): TabsColorPreset {
  return TABS_COLOR_FALLBACKS[variant] || TABS_COLOR_FALLBACKS.default;
}
