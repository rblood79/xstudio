/**
 * BorderRadiusHandles - border-radius 조절용 코너 포인트 컴포넌트
 *
 * Adobe XD 스타일의 코너 포인트를 렌더링하고 드래그 인터랙션을 처리
 */

import { useMemo } from 'react';
import { useBorderRadiusDrag, type CornerPosition } from '../hooks/useBorderRadiusDrag';

import './BorderRadiusHandles.css';

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface BorderRadiusHandlesProps {
  /**
   * Overlay rect (요소의 위치와 크기)
   */
  rect: Rect;
  /**
   * 현재 border-radius 값 (CSS 문자열, e.g., "8px", "10%")
   */
  borderRadius?: string;
  /**
   * 개별 코너별 border-radius 값
   */
  individualRadii?: {
    topLeft?: string;
    topRight?: string;
    bottomLeft?: string;
    bottomRight?: string;
  };
  /**
   * 드래그 시작 콜백
   */
  onDragStart?: () => void;
  /**
   * 드래그 종료 콜백
   */
  onDragEnd?: (radius: number, corner: CornerPosition) => void;
}

/**
 * border-radius 값을 숫자로 파싱
 */
function parseBorderRadius(value: string | undefined): number {
  if (!value || value === 'reset' || value === 'inherit' || value === 'initial') {
    return 0;
  }
  const firstValue = value.split(/\s+/)[0];
  const parsed = parseFloat(firstValue);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * 코너별 커서 스타일
 */
const cornerCursors: Record<CornerPosition, string> = {
  topLeft: 'nwse-resize',
  topRight: 'nesw-resize',
  bottomLeft: 'nesw-resize',
  bottomRight: 'nwse-resize',
};

export function BorderRadiusHandles({
  rect,
  borderRadius,
  individualRadii,
  onDragStart,
  onDragEnd,
}: BorderRadiusHandlesProps) {
  // 드래그 훅
  // 기본: 개별 코너 조절 / Shift+드래그: 모든 코너 동시 조절
  const { handleDragStart, activeCorner } = useBorderRadiusDrag(
    { width: rect.width, height: rect.height },
    borderRadius,
    { onDragStart, onDragEnd }
  );

  // 각 코너의 radius 값 계산
  const radii = useMemo(() => {
    const baseRadius = parseBorderRadius(borderRadius);
    return {
      topLeft: parseBorderRadius(individualRadii?.topLeft) || baseRadius,
      topRight: parseBorderRadius(individualRadii?.topRight) || baseRadius,
      bottomLeft: parseBorderRadius(individualRadii?.bottomLeft) || baseRadius,
      bottomRight: parseBorderRadius(individualRadii?.bottomRight) || baseRadius,
    };
  }, [borderRadius, individualRadii]);

  // 코너 포인트 위치 계산
  // 포인트는 코너에서 radius만큼 안쪽으로 오프셋
  const cornerPositions = useMemo(() => {
    // radius에 비례하여 포인트 위치 조정
    // radius가 0이면 코너 근처, radius가 커지면 안쪽으로 이동
    const getOffset = (radius: number) => {
      // 최소 오프셋 (radius가 0일 때) - 모서리에 더 가깝게
      const minOffset = 4;
      // radius에 비례한 오프셋 (대각선 방향) - 계수 감소로 모서리에 더 가깝게
      const radiusOffset = radius * 0.5; // 45도 대각선이므로 약 0.5배
      return minOffset + radiusOffset;
    };

    return {
      topLeft: {
        x: getOffset(radii.topLeft),
        y: getOffset(radii.topLeft),
      },
      topRight: {
        x: rect.width - getOffset(radii.topRight),
        y: getOffset(radii.topRight),
      },
      bottomLeft: {
        x: getOffset(radii.bottomLeft),
        y: rect.height - getOffset(radii.bottomLeft),
      },
      bottomRight: {
        x: rect.width - getOffset(radii.bottomRight),
        y: rect.height - getOffset(radii.bottomRight),
      },
    };
  }, [rect.width, rect.height, radii]);

  // 최소 크기 제한 없음 - Figma 스타일로 호버 시에만 CSS로 표시

  return (
    <div className="border-radius-handles">
      {/* Top-Left Corner */}
      <div
        className={`border-radius-handle top-left ${activeCorner === 'topLeft' ? 'active' : ''}`}
        style={{
          left: cornerPositions.topLeft.x,
          top: cornerPositions.topLeft.y,
          cursor: cornerCursors.topLeft,
        }}
        onMouseDown={(e) => handleDragStart('topLeft', e)}
        title={`Border Radius: ${radii.topLeft}px`}
      >
        <div className="handle-inner" />
      </div>

      {/* Top-Right Corner */}
      <div
        className={`border-radius-handle top-right ${activeCorner === 'topRight' ? 'active' : ''}`}
        style={{
          left: cornerPositions.topRight.x,
          top: cornerPositions.topRight.y,
          cursor: cornerCursors.topRight,
        }}
        onMouseDown={(e) => handleDragStart('topRight', e)}
        title={`Border Radius: ${radii.topRight}px`}
      >
        <div className="handle-inner" />
      </div>

      {/* Bottom-Left Corner */}
      <div
        className={`border-radius-handle bottom-left ${activeCorner === 'bottomLeft' ? 'active' : ''}`}
        style={{
          left: cornerPositions.bottomLeft.x,
          top: cornerPositions.bottomLeft.y,
          cursor: cornerCursors.bottomLeft,
        }}
        onMouseDown={(e) => handleDragStart('bottomLeft', e)}
        title={`Border Radius: ${radii.bottomLeft}px`}
      >
        <div className="handle-inner" />
      </div>

      {/* Bottom-Right Corner */}
      <div
        className={`border-radius-handle bottom-right ${activeCorner === 'bottomRight' ? 'active' : ''}`}
        style={{
          left: cornerPositions.bottomRight.x,
          top: cornerPositions.bottomRight.y,
          cursor: cornerCursors.bottomRight,
        }}
        onMouseDown={(e) => handleDragStart('bottomRight', e)}
        title={`Border Radius: ${radii.bottomRight}px`}
      >
        <div className="handle-inner" />
      </div>

      {/* 현재 radius 값 표시 (드래그 중일 때) */}
      {activeCorner && (
        <div className="border-radius-tooltip">
          {radii[activeCorner]}px
        </div>
      )}
    </div>
  );
}
