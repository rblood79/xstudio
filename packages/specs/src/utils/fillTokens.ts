/**
 * ADR-908 Phase 2 — Fill token dual-read seam
 *
 * VariantSpec 의 legacy background 계열 10 필드와 신규 `VariantSpec.fill` (FillTokenSpec)
 * 양쪽을 단일 진입점 `resolveFillTokens(variant)` 로 통합. 5 direct consumer
 * (CSSGenerator / ReactRenderer / variantColors / stateEffect / validate-specs) 가
 * legacy / 신규 어느 선언을 쓰든 같은 결과를 얻는다.
 *
 * Phase 3 migration 전 seam — component spec 이 `fill` 을 개별 설정하면 즉시 FillTokenSpec
 * 우선 소비되고, 미설정 spec 은 `variantSpecToFillTokens()` 가 legacy 필드에서 재구성.
 * Phase 4 legacy 제거 단계에서 `variantSpecToFillTokens()` + legacy 필드가 함께 삭제된다.
 */

import type {
  FillStateTokens,
  FillTokenSpec,
  IndicatorModeSpec,
  VariantSpec,
} from "../types/spec.types";

/**
 * VariantSpec 의 legacy background 계열 필드를 FillTokenSpec 구조로 변환.
 *
 * 매핑 (ADR-908 Phase 1 parity):
 * - background / backgroundHover / backgroundPressed → default.base / hover / pressed
 * - selectedBackground(Hover/Pressed)               → default.selected(Hover/Pressed)
 * - emphasizedSelectedBackground                    → default.emphasizedSelected
 * - outlineBackground                               → outline.base
 * - subtleBackground                                → subtle.base
 * - backgroundAlpha                                 → alpha
 *
 * base (default.base) 는 VariantSpec.background 가 필수이므로 항상 채워진다.
 * optional 필드는 variant 에 존재할 때만 FillTokenSpec 에 추가 (exactOptionalPropertyTypes 준수).
 */
export function variantSpecToFillTokens(variant: VariantSpec): FillTokenSpec {
  const def: FillStateTokens = {
    base: variant.background,
    hover: variant.backgroundHover,
    pressed: variant.backgroundPressed,
  };

  if (variant.selectedBackground !== undefined) {
    def.selected = variant.selectedBackground;
  }
  if (variant.selectedBackgroundHover !== undefined) {
    def.selectedHover = variant.selectedBackgroundHover;
  }
  if (variant.selectedBackgroundPressed !== undefined) {
    def.selectedPressed = variant.selectedBackgroundPressed;
  }
  if (variant.emphasizedSelectedBackground !== undefined) {
    def.emphasizedSelected = variant.emphasizedSelectedBackground;
  }

  const fill: FillTokenSpec = { default: def };

  if (variant.outlineBackground !== undefined) {
    fill.outline = { base: variant.outlineBackground };
  }
  if (variant.subtleBackground !== undefined) {
    fill.subtle = { base: variant.subtleBackground };
  }
  if (variant.backgroundAlpha !== undefined) {
    fill.alpha = variant.backgroundAlpha;
  }

  return fill;
}

/**
 * Fill token dual-read seam 진입점.
 *
 * spec.fill (Phase 3 migration 대상) 이 선언되어 있으면 그대로 반환 (신규 선언 우선).
 * 미선언 시 `variantSpecToFillTokens()` 가 legacy background 필드에서 재구성.
 *
 * consumer 는 legacy / 신규 분기 없이 이 함수만 호출하면 된다:
 * ```ts
 * const fill = resolveFillTokens(variant);
 * emitCSS(`background-color: ${resolveToken(fill.default.base)};`);
 * ```
 *
 * Phase 4 에서 legacy 필드 + variantSpecToFillTokens 함께 삭제되며, 본 함수는
 * `variant.fill!` 단순 반환으로 축소된다 (또는 제거되고 consumer 가 직접 spec.fill 참조).
 */
export function resolveFillTokens(variant: VariantSpec): FillTokenSpec {
  return variant.fill ?? variantSpecToFillTokens(variant);
}

/**
 * ADR-908 Phase 3-B — IndicatorModeSpec fill dual-read seam
 *
 * IndicatorModeSpec 의 `fill` 선언 시 우선, 미선언 시 legacy `background` / `backgroundPressed`
 * 필드에서 FillStateTokens 재구성. `base` 는 IndicatorModeSpec legacy 에서 `im.background` 에
 * 매핑되나 CSSGenerator 가 컨테이너 배경을 `transparent` 로 하드코딩하여 실제 emit 되지 않는다.
 * 오직 `pressed` 만 실 소비 (ToggleButton[data-pressed]:not([data-selected]) 선택자).
 *
 * Phase 4 에서 legacy `background` / `backgroundPressed` 필드 + 본 helper 의 fallback 분기 삭제,
 * `im.fill!` 단순 반환으로 축소.
 */
export function resolveIndicatorFill(im: IndicatorModeSpec): FillStateTokens {
  if (im.fill) return im.fill;
  const state: FillStateTokens = { base: im.background };
  if (im.backgroundPressed !== undefined) {
    state.pressed = im.backgroundPressed;
  }
  return state;
}
