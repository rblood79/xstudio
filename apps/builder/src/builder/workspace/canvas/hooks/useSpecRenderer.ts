/**
 * useSpecRenderer - Spec 기반 렌더링 공유 유틸리티
 *
 * Legacy cssVariableReader에서 @xstudio/specs 기반으로 전환하기 위한
 * Feature Flag 및 헬퍼 함수 제공
 *
 * @since 2026-02-12 Spec Migration Phase 0
 */

import { useMemo } from 'react';
import {
  getVariantColors as getSpecVariantColors,
  getSizePreset as getSpecSizePreset,
  resolveColor,
  hexStringToNumber,
} from '@xstudio/specs';
import type { ComponentSpec, TokenRef } from '@xstudio/specs';

// ============================================
// Types
// ============================================

export interface SpecVariantColors {
  bg: number;
  bgHover: number;
  bgPressed: number;
  text: number;
  border?: number;
  borderHover?: number;
  bgAlpha: number;
}

export interface SpecSizePreset {
  height: number;
  paddingX: number;
  paddingY: number;
  fontSize: number;
  borderRadius: number;
  iconSize?: number;
  gap?: number;
}

// ============================================
// Hooks
// ============================================

/**
 * Spec 기반 variant 색상 가져오기
 *
 * @param spec - ComponentSpec
 * @param variant - variant 이름
 * @param theme - 'light' | 'dark' (기본: 'light')
 */
export function useSpecVariantColors(
  spec: ComponentSpec<Record<string, unknown>>,
  variant: string,
  theme: 'light' | 'dark' = 'light',
): SpecVariantColors {
  return useMemo(() => {
    const variantSpec = spec.variants[variant] || spec.variants[spec.defaultVariant];
    return getSpecVariantColors(variantSpec, theme);
  }, [spec, variant, theme]);
}

/**
 * Spec 기반 사이즈 프리셋 가져오기
 *
 * @param spec - ComponentSpec
 * @param size - size 이름
 * @param theme - 'light' | 'dark' (기본: 'light')
 */
export function useSpecSizePreset(
  spec: ComponentSpec<Record<string, unknown>>,
  variant: string,
  theme: 'light' | 'dark' = 'light',
): SpecSizePreset {
  return useMemo(() => {
    const sizeSpec = spec.sizes[variant] || spec.sizes[spec.defaultSize];
    return getSpecSizePreset(sizeSpec, theme);
  }, [spec, variant, theme]);
}

// ============================================
// Utilities
// ============================================

/**
 * TokenRef Record를 hex number Record로 resolve
 *
 * 컴포넌트별 추가 색상 상수를 resolve할 때 사용
 * 예: TEXT_FIELD_EXTRA_COLORS -> { placeholderColor: 0x49454f, ... }
 */
export function resolveColorRecord<T extends Record<string, TokenRef>>(
  record: T,
  theme: 'light' | 'dark' = 'light',
): Record<keyof T, number> {
  const result = {} as Record<keyof T, number>;
  for (const key of Object.keys(record) as Array<keyof T>) {
    const resolved = resolveColor(record[key], theme);
    result[key] = typeof resolved === 'string' ? hexStringToNumber(resolved) : resolved as number;
  }
  return result;
}

/**
 * 단일 TokenRef를 hex number로 resolve
 */
export function resolveTokenColor(
  tokenRef: TokenRef,
  theme: 'light' | 'dark' = 'light',
): number {
  const resolved = resolveColor(tokenRef, theme);
  return typeof resolved === 'string' ? hexStringToNumber(resolved) : resolved as number;
}

// ============================================
// Label & Description Style Presets
// ============================================

export interface LabelStylePreset {
  fontSize: number;
  fontWeight: string;
  color: number;
  fontFamily: string;
}

export interface DescriptionStylePreset {
  fontSize: number;
  color: number;
  errorColor: number;
  fontFamily: string;
}

const LABEL_STYLE_PRESETS: Record<string, LabelStylePreset> = {
  sm: { fontSize: 12, fontWeight: '500', color: 0x374151, fontFamily: 'Inter, system-ui, sans-serif' },
  md: { fontSize: 14, fontWeight: '500', color: 0x374151, fontFamily: 'Inter, system-ui, sans-serif' },
  lg: { fontSize: 16, fontWeight: '500', color: 0x374151, fontFamily: 'Inter, system-ui, sans-serif' },
};

const DESCRIPTION_STYLE_PRESETS: Record<string, DescriptionStylePreset> = {
  sm: { fontSize: 11, color: 0x6b7280, errorColor: 0xef4444, fontFamily: 'Inter, system-ui, sans-serif' },
  md: { fontSize: 12, color: 0x6b7280, errorColor: 0xef4444, fontFamily: 'Inter, system-ui, sans-serif' },
  lg: { fontSize: 14, color: 0x6b7280, errorColor: 0xef4444, fontFamily: 'Inter, system-ui, sans-serif' },
};

export function getLabelStylePreset(size: string): LabelStylePreset {
  return LABEL_STYLE_PRESETS[size] ?? LABEL_STYLE_PRESETS.md;
}

export function getDescriptionStylePreset(size: string): DescriptionStylePreset {
  return DESCRIPTION_STYLE_PRESETS[size] ?? DESCRIPTION_STYLE_PRESETS.md;
}

// Re-export for convenience
export { getSpecVariantColors, getSpecSizePreset };
