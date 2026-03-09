import React from "react";
import type { PreviewElement, RenderContext } from "../types";

/**
 * Color 관련 컴포넌트 렌더러
 * - ColorArea
 * - ColorSlider
 * - ColorWheel
 *
 * Preview에서는 간단한 HTML placeholder로 렌더링.
 * 실제 색상 인터랙션은 React Aria 컴포넌트가 담당.
 */

/**
 * ColorArea 렌더링 — 2D 색상 영역 선택기
 */
export const renderColorArea = (
  element: PreviewElement,
  _context: RenderContext,
): React.ReactNode => {
  return (
    <div
      key={element.id}
      data-element-id={element.id}
      data-custom-id={element.customId}
      style={{
        width: 192,
        height: 192,
        borderRadius: 4,
        background:
          "linear-gradient(to top, black, transparent), linear-gradient(to right, white, hsl(200, 100%, 50%))",
        position: "relative",
        ...element.props.style,
      }}
      className={element.props.className}
    />
  );
};

/**
 * ColorSlider 렌더링 — 단일 채널 색상 슬라이더
 */
export const renderColorSlider = (
  element: PreviewElement,
  _context: RenderContext,
): React.ReactNode => {
  const isVertical = element.props.orientation === "vertical";

  return (
    <div
      key={element.id}
      data-element-id={element.id}
      data-custom-id={element.customId}
      style={{
        width: isVertical ? 24 : 192,
        height: isVertical ? 192 : 24,
        borderRadius: 12,
        background:
          "linear-gradient(to right, red, yellow, lime, aqua, blue, magenta, red)",
        ...element.props.style,
      }}
      className={element.props.className}
    />
  );
};

/**
 * ColorWheel 렌더링 — 원형 색상 선택기
 */
export const renderColorWheel = (
  element: PreviewElement,
  _context: RenderContext,
): React.ReactNode => {
  return (
    <div
      key={element.id}
      data-element-id={element.id}
      data-custom-id={element.customId}
      style={{
        width: 192,
        height: 192,
        borderRadius: "50%",
        background:
          "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)",
        ...element.props.style,
      }}
      className={element.props.className}
    />
  );
};
