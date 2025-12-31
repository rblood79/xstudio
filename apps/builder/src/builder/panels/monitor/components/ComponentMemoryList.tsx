/**
 * ComponentMemoryList Component
 *
 * 컴포넌트별 메모리 사용량 목록
 * - 상위 메모리 사용 요소 표시
 * - 정렬 옵션 (메모리, 자식수, 깊이)
 */

import { useState } from "react";
import { Box, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { Button } from "react-aria-components";
import {
  useComponentMemory,
  type ComponentMemoryInfo,
} from "../hooks/useComponentMemory";
import { formatBytes } from "../hooks/useMemoryStats";
import { iconSmall, iconEditProps, iconLarge } from "../../../../utils/ui/uiConstants";

interface ComponentMemoryListProps {
  enabled?: boolean;
}

type SortBy = "memory" | "children" | "depth";

function getMemoryLevel(
  percentage: number
): "high" | "medium" | "low" {
  if (percentage >= 15) return "high";
  if (percentage >= 5) return "medium";
  return "low";
}

export function ComponentMemoryList({
  enabled = true,
}: ComponentMemoryListProps) {
  const [sortBy, setSortBy] = useState<SortBy>("memory");
  const [expanded, setExpanded] = useState(true);
  const { componentMemory, totalMemory, refresh } = useComponentMemory({
    enabled,
    sortBy,
    limit: 15,
  });

  return (
    <div className="component-memory-list">
      {/* Header */}
      <div className="component-memory-header">
        <button
          type="button"
          className="component-memory-toggle"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
        >
          {expanded ? <ChevronUp size={iconEditProps.size} /> : <ChevronDown size={iconEditProps.size} />}
          <span>Component Memory</span>
        </button>
        <div className="component-memory-controls">
          <select
            className="component-memory-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            aria-label="Sort by"
          >
            <option value="memory">Memory</option>
            <option value="children">Children</option>
            <option value="depth">Depth</option>
          </select>
          <Button
            className="component-memory-refresh"
            onPress={refresh}
            aria-label="Refresh"
          >
            <RefreshCw size={iconSmall.size} />
          </Button>
        </div>
      </div>

      {/* Total */}
      <div className="component-memory-total">
        <span className="total-label">Total Elements Memory:</span>
        <span className="total-value">{formatBytes(totalMemory)}</span>
      </div>

      {/* List */}
      {expanded && (
        <div className="component-memory-items" role="list">
          {componentMemory.map((info) => (
            <ComponentMemoryItem key={info.elementId} info={info} />
          ))}
          {componentMemory.length === 0 && (
            <div className="component-memory-empty">
              <Box size={iconLarge.size} />
              <p>No components to analyze</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface ComponentMemoryItemProps {
  info: ComponentMemoryInfo;
}

function ComponentMemoryItem({ info }: ComponentMemoryItemProps) {
  const level = getMemoryLevel(info.percentage);

  return (
    <div className="component-memory-item" data-level={level} role="listitem">
      <div className="component-memory-item-header">
        <span className="component-tag">{info.tag}</span>
        {info.customId && (
          <span className="component-customid">#{info.customId}</span>
        )}
      </div>
      <div className="component-memory-item-stats">
        <div className="component-stat">
          <span className="stat-value">{formatBytes(info.memoryBytes)}</span>
          <span className="stat-label">Memory</span>
        </div>
        <div className="component-stat">
          <span className="stat-value">{info.childCount}</span>
          <span className="stat-label">Children</span>
        </div>
        <div className="component-stat">
          <span className="stat-value">{info.depth}</span>
          <span className="stat-label">Depth</span>
        </div>
        <div className="component-stat">
          <span className="stat-value">{info.percentage.toFixed(1)}%</span>
          <span className="stat-label">Share</span>
        </div>
      </div>
      <div className="component-memory-bar">
        <div
          className="component-memory-bar-fill"
          style={{ width: `${Math.min(100, info.percentage)}%` }}
        />
      </div>
    </div>
  );
}
