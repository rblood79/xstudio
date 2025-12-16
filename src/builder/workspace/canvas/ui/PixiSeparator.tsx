/**
 * Pixi Separator
 *
 * 🚀 Phase 2: Separator WebGL 컴포넌트 (Pattern A)
 *
 * 가로/세로 구분선 컴포넌트
 * - variant (default, primary, secondary, surface) 지원
 * - size (sm, md, lg) 지원
 * - orientation (horizontal, vertical) 지원
 * - lineStyle (solid, dashed, dotted) 지원
 *
 * @since 2025-12-16 Phase 2 WebGL Migration
 */

import { memo, useCallback, useMemo } from "react";
import { Graphics as PixiGraphics } from "pixi.js";
import type { Element } from "../../../../types/core/store.types";
import type { CSSStyle } from "../sprites/styleConverter";
import { cssColorToHex, parseCSSSize } from "../sprites/styleConverter";
import {
  getSeparatorSizePreset,
  getSeparatorColorPreset,
} from "../utils/cssVariableReader";

// ============================================
// Types
// ============================================

export interface PixiSeparatorProps {
  element: Element;
  isSelected?: boolean;
  onClick?: (elementId: string) => void;
}

interface SeparatorElementProps {
  variant?: "default" | "primary" | "secondary" | "surface";
  size?: "sm" | "md" | "lg";
  orientation?: "horizontal" | "vertical";
  lineStyle?: "solid" | "dashed" | "dotted";
  style?: CSSStyle;
}

// ============================================
// Component
// ============================================

export const PixiSeparator = memo(function PixiSeparator({
  element,
  onClick,
}: PixiSeparatorProps) {
  const style = element.props?.style as CSSStyle | undefined;
  const props = element.props as SeparatorElementProps | undefined;

  // variant, size, orientation
  const variant = useMemo(() => String(props?.variant || "default"), [props?.variant]);
  const size = useMemo(() => String(props?.size || "md"), [props?.size]);
  const orientation = useMemo(
    () => String(props?.orientation || "horizontal"),
    [props?.orientation]
  );
  const lineStyle = useMemo(
    () => String(props?.lineStyle || "solid"),
    [props?.lineStyle]
  );

  // 🚀 CSS에서 프리셋 읽기
  const sizePreset = useMemo(() => getSeparatorSizePreset(size), [size]);
  const colorPreset = useMemo(() => getSeparatorColorPreset(variant), [variant]);

  // 색상 (inline style 오버라이드 지원)
  const lineColor = useMemo(() => {
    if (style?.backgroundColor) {
      return cssColorToHex(style.backgroundColor, colorPreset.color);
    }
    if (style?.borderColor) {
      return cssColorToHex(style.borderColor, colorPreset.color);
    }
    return colorPreset.color;
  }, [style?.backgroundColor, style?.borderColor, colorPreset.color]);

  // 크기 계산
  const separatorSize = useMemo(() => {
    if (orientation === "vertical") {
      const height = parseCSSSize(style?.height, undefined, 100);
      return {
        width: sizePreset.thickness,
        height,
      };
    }
    // horizontal
    const width = parseCSSSize(style?.width, undefined, 200);
    return {
      width,
      height: sizePreset.thickness,
    };
  }, [orientation, style?.width, style?.height, sizePreset.thickness]);

  // 위치
  const posX = parseCSSSize(style?.left, undefined, 0);
  const posY = parseCSSSize(style?.top, undefined, 0);

  // 구분선 그리기
  const drawSeparator = useCallback(
    (g: PixiGraphics) => {
      g.clear();

      // 대시 패턴 설정
      let dashArray: number[] = [];
      if (lineStyle === "dashed") {
        dashArray = [6, 4];
      } else if (lineStyle === "dotted") {
        dashArray = [2, 2];
      }

      if (lineStyle === "solid") {
        // 실선
        if (orientation === "vertical") {
          g.rect(0, 0, separatorSize.width, separatorSize.height);
        } else {
          g.rect(0, 0, separatorSize.width, separatorSize.height);
        }
        g.fill({ color: lineColor });
      } else {
        // 대시 또는 점선
        g.setStrokeStyle({
          width: sizePreset.thickness,
          color: lineColor,
        });

        if (orientation === "vertical") {
          // 세로 대시 라인 그리기
          let y = 0;
          let dashIndex = 0;
          while (y < separatorSize.height) {
            const dashLen = dashArray[dashIndex % dashArray.length];
            if (dashIndex % 2 === 0) {
              g.moveTo(sizePreset.thickness / 2, y);
              g.lineTo(sizePreset.thickness / 2, Math.min(y + dashLen, separatorSize.height));
            }
            y += dashLen;
            dashIndex++;
          }
        } else {
          // 가로 대시 라인 그리기
          let x = 0;
          let dashIndex = 0;
          while (x < separatorSize.width) {
            const dashLen = dashArray[dashIndex % dashArray.length];
            if (dashIndex % 2 === 0) {
              g.moveTo(x, sizePreset.thickness / 2);
              g.lineTo(Math.min(x + dashLen, separatorSize.width), sizePreset.thickness / 2);
            }
            x += dashLen;
            dashIndex++;
          }
        }
        g.stroke();
      }
    },
    [orientation, separatorSize.width, separatorSize.height, lineColor, lineStyle, sizePreset.thickness]
  );

  // 클릭 핸들러
  const handleClick = useCallback(() => {
    onClick?.(element.id);
  }, [element.id, onClick]);

  return (
    <pixiContainer x={posX} y={posY}>
      <pixiGraphics
        draw={drawSeparator}
        eventMode="static"
        cursor="pointer"
        onPointerDown={handleClick}
      />
    </pixiContainer>
  );
});

export default PixiSeparator;
