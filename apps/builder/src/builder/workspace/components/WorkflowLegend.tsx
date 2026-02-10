/**
 * Workflow Legend
 *
 * 워크플로우 오버레이 활성 시 좌하단에 레전드를 표시한다.
 * 활성화된 토글 타입만 표시.
 *
 * @since 2026-02-10 Phase 4 Workflow
 */

import type React from "react";
import { useStore } from "../../stores";

// Legend entry types
interface LegendEntry {
  type: "solid" | "dashed" | "dotted" | "group";
  color: string;
  label: string;
}

// SVG icon for each line style
const LegendIcon: React.FC<{ type: LegendEntry["type"]; color: string }> = ({
  type,
  color,
}) => {
  const width = 24;
  const height = 12;
  const y = height / 2;

  if (type === "group") {
    return (
      <svg width={width} height={height} aria-hidden="true">
        <rect
          x={2}
          y={1}
          width={20}
          height={10}
          rx={2}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeDasharray="4 2"
        />
      </svg>
    );
  }

  let strokeDasharray: string | undefined;
  if (type === "dashed") strokeDasharray = "6 4";
  if (type === "dotted") strokeDasharray = "3 3";

  return (
    <svg width={width} height={height} aria-hidden="true">
      <line
        x1={0}
        y1={y}
        x2={width}
        y2={y}
        stroke={color}
        strokeWidth={2}
        strokeDasharray={strokeDasharray}
        strokeLinecap="round"
      />
    </svg>
  );
};

export const WorkflowLegend: React.FC = () => {
  const showOverlay = useStore((s) => s.showWorkflowOverlay);
  const showNav = useStore((s) => s.showWorkflowNavigation);
  const showEvents = useStore((s) => s.showWorkflowEvents);
  const showDS = useStore((s) => s.showWorkflowDataSources);
  const showLG = useStore((s) => s.showWorkflowLayoutGroups);

  if (!showOverlay) return null;

  const entries: LegendEntry[] = [];
  if (showNav)
    entries.push({ type: "solid", color: "#3b82f6", label: "Navigation" });
  if (showEvents)
    entries.push({ type: "dashed", color: "#a855f7", label: "Events" });
  if (showDS)
    entries.push({ type: "dotted", color: "#22c55e", label: "Data Sources" });
  if (showLG)
    entries.push({ type: "group", color: "#a78bfa", label: "Layout Groups" });

  if (entries.length === 0) return null;

  return (
    <div className="workflow-legend">
      {entries.map((entry) => (
        <div key={entry.label} className="workflow-legend-entry">
          <LegendIcon type={entry.type} color={entry.color} />
          <span className="workflow-legend-label">{entry.label}</span>
        </div>
      ))}
    </div>
  );
};
