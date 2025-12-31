/**
 * PresetPreview - SVG 기반 레이아웃 썸네일
 *
 * Phase 6: 프리셋 미리보기 컴포넌트
 *
 * 성능 최적화:
 * - memo로 불필요한 리렌더링 방지
 * - useMemo로 SVG 요소 캐싱
 * - 단순 SVG rect만 사용하여 가벼운 렌더링
 */

import { memo, useMemo } from "react";
import type { PreviewArea } from "./types";

interface PresetPreviewProps {
  /** 미리보기 영역 배열 */
  areas: PreviewArea[];
  /** SVG 너비 */
  width?: number;
  /** SVG 높이 */
  height?: number;
  /** 선택된 Slot 이름 */
  selectedSlot?: string;
}

export const PresetPreview = memo(function PresetPreview({
  areas,
  width = 120,
  height = 80,
  selectedSlot,
}: PresetPreviewProps) {
  // SVG rect 요소 캐싱
  const rectElements = useMemo(() => {
    return areas.map((area) => {
      const isSelected = selectedSlot === area.name;
      const isRequired = area.required;

      // 색상 결정
      let fill: string;
      if (isSelected) {
        fill = "var(--color-primary-200)";
      } else if (isRequired) {
        fill = "var(--color-primary-100)";
      } else if (area.isSlot) {
        fill = "var(--color-gray-100)";
      } else {
        fill = "var(--color-gray-50)";
      }

      return (
        <g key={area.name}>
          <rect
            x={`${area.x}%`}
            y={`${area.y}%`}
            width={`${area.width}%`}
            height={`${area.height}%`}
            fill={fill}
            stroke={
              isSelected
                ? "var(--color-primary-500)"
                : "var(--color-gray-300)"
            }
            strokeWidth={isSelected ? 2 : 1}
            rx={2}
          />
          {/* Slot 이름 표시 (영역이 충분히 크면) */}
          {area.width >= 20 && area.height >= 15 && (
            <text
              x={`${area.x + area.width / 2}%`}
              y={`${area.y + area.height / 2}%`}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="var(--color-gray-600)"
              fontSize="8"
              fontFamily="var(--font-sans)"
            >
              {area.name}
            </text>
          )}
          {/* Required 표시 */}
          {isRequired && area.width >= 15 && (
            <text
              x={`${area.x + area.width - 2}%`}
              y={`${area.y + 4}%`}
              textAnchor="end"
              fill="var(--color-primary-600)"
              fontSize="8"
              fontWeight="bold"
            >
              *
            </text>
          )}
        </g>
      );
    });
  }, [areas, selectedSlot]);

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="preset-preview-svg"
      style={{
        border: "1px solid var(--color-gray-200)",
        borderRadius: "var(--radius-sm)",
        backgroundColor: "var(--color-white)",
      }}
    >
      {rectElements}
    </svg>
  );
});

export default PresetPreview;
