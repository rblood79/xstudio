/**
 * Body Layer
 *
 * Body 요소의 스타일 (배경색, 패딩, 테두리 등)을 렌더링합니다.
 * 🚀 Border-Box v2: border-box 방식 렌더링
 *
 * @since 2025-12-12
 * @updated 2025-12-15 Border-Box v2 - drawBox 유틸리티 적용
 */

import { useCallback, useMemo, memo } from "react";
import { Graphics as PixiGraphics } from "pixi.js";
import { useExtend } from "@pixi/react";
import { PIXI_COMPONENTS } from "../pixiSetup";
import { useStore } from "../../../stores";
import { cssColorToHex, parseCSSSize } from "../sprites/styleConverter";
import type { CSSStyle } from "../sprites/styleConverter";
import { drawBox, parseBorderConfig } from "../utils";
import { useSkiaNode } from "../skia/useSkiaNode";
import { isFillV2Enabled } from "../../../../utils/featureFlags";
import {
  fillsToSkiaFillColor,
  fillsToSkiaFillStyle,
} from "../../../panels/styles/utils/fillToSkia";
import type { FillStyle } from "../skia/types";
import { useResolvedSkiaTheme } from "../../../../stores/themeConfigStore";
import { lightColors, darkColors } from "@xstudio/specs";

// ============================================
// Types
// ============================================

export interface BodyLayerProps {
  /** 대상 페이지 ID */
  pageId: string;
  /** 페이지 너비 */
  pageWidth: number;
  /** 페이지 높이 */
  pageHeight: number;
}

// ============================================
// Component
// ============================================

/**
 * BodyLayer
 *
 * 현재 페이지의 Body 요소 스타일을 렌더링합니다.
 * - backgroundColor
 * - borderRadius
 * - border
 * - boxShadow (TODO)
 */
export const BodyLayer = memo(function BodyLayer({
  pageId,
  pageWidth,
  pageHeight,
}: BodyLayerProps) {
  useExtend(PIXI_COMPONENTS);
  // 🚀 최적화: elements 배열 대신 elementsMap 사용
  const elementsMap = useStore((state) => state.elementsMap);
  // Body 요소 찾기 (페이지당 1개만 존재)
  const bodyElement = useMemo(() => {
    for (const el of elementsMap.values()) {
      if (el.page_id === pageId && el.tag.toLowerCase() === "body") {
        return el;
      }
    }
    return undefined;
  }, [elementsMap, pageId]);

  // ADR-021: 다크 모드 시 Body 배경을 {color.base} 토큰 기반으로 전환
  const skiaTheme = useResolvedSkiaTheme();

  // Body 스타일
  const bodyStyle = bodyElement?.props?.style as CSSStyle | undefined;

  // 스타일 값 추출 — 테마 base 색상을 1순위로 사용
  const backgroundColor = useMemo(() => {
    const baseHex = skiaTheme === "dark" ? darkColors.base : lightColors.base;
    return cssColorToHex(baseHex, 0xffffff);
  }, [skiaTheme]);

  const backgroundAlpha = 1;

  // Border-Box v2: parseBorderConfig로 border 정보 추출
  const borderConfig = useMemo(() => parseBorderConfig(bodyStyle), [bodyStyle]);

  // Border-Box v2: borderRadius 파싱 (border와 독립적으로 적용)
  const borderRadius = useMemo(() => {
    return parseCSSSize(bodyStyle?.borderRadius, undefined, 0);
  }, [bodyStyle?.borderRadius]);

  // Border-Box v2: drawBox 유틸리티 사용
  const draw = useCallback(
    (g: PixiGraphics) => {
      drawBox(g, {
        width: pageWidth,
        height: pageHeight,
        backgroundColor,
        backgroundAlpha,
        borderRadius,
        border: borderConfig,
      });
    },
    [
      pageWidth,
      pageHeight,
      backgroundColor,
      backgroundAlpha,
      borderRadius,
      borderConfig,
    ],
  );

  // Phase 5: Skia 렌더 데이터 등록 (body 배경)
  // Skia 모드에서 PixiJS canvas가 hidden이므로 body도 Skia로 렌더링해야 한다.
  const fills = bodyElement?.fills;
  const bodySkiaData = useMemo(() => {
    // Fill V2: fills 배열에서 fillColor/gradient 추출
    let fillColor: Float32Array;
    const fillV2Color =
      isFillV2Enabled() && fills && fills.length > 0
        ? fillsToSkiaFillColor(fills)
        : null;

    let gradientFill: FillStyle | undefined;
    if (isFillV2Enabled() && fills && fills.length > 0) {
      const fillV2Style = fillsToSkiaFillStyle(fills, pageWidth, pageHeight);
      if (fillV2Style && fillV2Style.type !== "color") {
        gradientFill = fillV2Style;
      }
    }

    if (fillV2Color) {
      fillColor = fillV2Color;
    } else {
      const r = ((backgroundColor >> 16) & 0xff) / 255;
      const g = ((backgroundColor >> 8) & 0xff) / 255;
      const b = (backgroundColor & 0xff) / 255;
      // gradient fill이 있으면 alpha=1 (shader가 alpha 처리)
      fillColor = Float32Array.of(r, g, b, gradientFill ? 1 : backgroundAlpha);
    }

    // overflow 클리핑: body에 overflow 설정 시 자식 클리핑 (ADR-050)
    const overflow = bodyStyle?.overflow as string | undefined;
    const clipChildren =
      overflow === "hidden" ||
      overflow === "clip" ||
      overflow === "scroll" ||
      overflow === "auto";

    return {
      type: "box" as const,
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      visible: true,
      ...(clipChildren ? { clipChildren: true } : {}),
      box: {
        fillColor,
        ...(gradientFill ? { fill: gradientFill } : {}),
        borderRadius,
        strokeColor: (() => {
          if (borderConfig) {
            const sc = borderConfig.color ?? 0x000000;
            return Float32Array.of(
              ((sc >> 16) & 0xff) / 255,
              ((sc >> 8) & 0xff) / 255,
              (sc & 0xff) / 255,
              borderConfig.alpha ?? 1,
            );
          }
          // 기본 장식 border: CSS --border 동기화 (page 영역 구분)
          return skiaTheme === "dark"
            ? Float32Array.of(0.25, 0.25, 0.28, 1) // zinc-700 ≈ #3f3f46
            : Float32Array.of(0.83, 0.83, 0.83, 1); // gray-300 ≈ #d4d4d4
        })(),
        strokeWidth: borderConfig?.width ?? 1,
      },
    };
  }, [
    pageWidth,
    pageHeight,
    backgroundColor,
    backgroundAlpha,
    borderRadius,
    borderConfig,
    fills,
    bodyStyle,
  ]);

  useSkiaNode(bodyElement?.id ?? "", bodyElement ? bodySkiaData : null);

  // Pencil-style: 선택은 BuilderCanvas 중앙 핸들러가 처리
  const handleClick = useCallback(() => {
    // no-op: selection handled by central handler
  }, []);

  return (
    <pixiGraphics
      label={bodyElement?.id || "BodyLayer"}
      draw={draw}
      eventMode="static"
      cursor="default"
      onPointerDown={handleClick}
    />
  );
});

export default BodyLayer;
