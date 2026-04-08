/**
 * Spacing Tokens
 *
 * 간격 토큰 정의
 *
 * @packageDocumentation
 */

import type { SpacingTokens } from "../types/token.types";

/**
 * 간격 토큰
 */
export const spacing: SpacingTokens = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  "2xl": 48,
};

/**
 * 간격 토큰 값 반환
 */
export function getSpacingToken(name: keyof SpacingTokens): number {
  return spacing[name];
}

/**
 * Breadcrumb `::after` 가로 패딩(한쪽), px.
 * `packages/shared/.../theme/shared-tokens.css`의 `--spacing-xs` / `--spacing-sm` / `--spacing-md`
 * (0.25 / 0.5 / 0.75 rem @ 16px)와 동일. (`spacing.md` 프리미티브 16px과 별개)
 */
export function breadcrumbSeparatorAfterPaddingXPx(sizeKey: string): number {
  const k = sizeKey.trim().toLowerCase();
  if (k === "s" || k === "sm") return 4;
  if (k === "l" || k === "lg") return 12;
  return 8;
}

/** RSP `Breadcrumbs` / `Breadcrumb` size → spec 키 `S` | `M` | `L` */
export function normalizeBreadcrumbRspSizeKey(raw: string): "S" | "M" | "L" {
  const k = raw.trim().toLowerCase();
  if (k === "s" || k === "sm") return "S";
  if (k === "l" || k === "lg") return "L";
  return "M";
}
