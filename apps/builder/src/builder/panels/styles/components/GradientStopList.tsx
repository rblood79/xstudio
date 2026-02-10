/**
 * GradientStopList - 그래디언트 스톱 목록
 *
 * Gradient Phase 2
 * - 각 행: [색상 스와치] [position % input] [삭제 버튼]
 * - 스톱 추가/삭제/위치 변경
 *
 * @since 2026-02-10 Gradient Phase 2
 */

import { memo, useCallback } from 'react';
import { Plus, X } from 'lucide-react';
import type { GradientStop } from '../../../../types/builder/fill.types';
import { iconSmall } from '../../../../utils/ui/uiConstants';

import './GradientStopList.css';

interface GradientStopListProps {
  stops: GradientStop[];
  activeStopIndex: number;
  onStopSelect: (index: number) => void;
  onStopPositionChange: (index: number, position: number) => void;
  onStopAdd: () => void;
  onStopRemove: (index: number) => void;
}

export const GradientStopList = memo(function GradientStopList({
  stops,
  activeStopIndex,
  onStopSelect,
  onStopPositionChange,
  onStopAdd,
  onStopRemove,
}: GradientStopListProps) {
  const handlePositionBlur = useCallback(
    (index: number, e: React.FocusEvent<HTMLInputElement>) => {
      const parsed = Number(e.target.value);
      if (!Number.isNaN(parsed)) {
        const clamped = Math.max(0, Math.min(100, Math.round(parsed)));
        onStopPositionChange(index, clamped / 100);
      }
    },
    [onStopPositionChange],
  );

  const handlePositionKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        (e.target as HTMLInputElement).blur();
      }
    },
    [],
  );

  const canDelete = stops.length > 2;

  return (
    <div className="gradient-stop-list">
      {stops.map((stop, index) => (
        <div
          key={index}
          className="gradient-stop-list__row"
          data-active={index === activeStopIndex || undefined}
          onClick={() => onStopSelect(index)}
        >
          <div
            className="gradient-stop-list__swatch"
            style={{ backgroundColor: stop.color.slice(0, 7) }}
          />
          <input
            type="number"
            className="gradient-stop-list__position"
            min={0}
            max={100}
            step={1}
            defaultValue={Math.round(stop.position * 100)}
            key={`${index}-${stop.position}`}
            onBlur={(e) => handlePositionBlur(index, e)}
            onKeyDown={handlePositionKeyDown}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Stop ${index + 1} position`}
          />
          <span className="gradient-stop-list__position-suffix">%</span>
          <span className="gradient-stop-list__spacer" />
          <button
            type="button"
            className="gradient-stop-list__delete"
            disabled={!canDelete}
            onClick={(e) => {
              e.stopPropagation();
              onStopRemove(index);
            }}
            aria-label={`Remove stop ${index + 1}`}
          >
            <X
              size={iconSmall.size}
              strokeWidth={iconSmall.strokeWidth}
              color={iconSmall.color}
            />
          </button>
        </div>
      ))}
      <button
        type="button"
        className="gradient-stop-list__add-btn"
        onClick={onStopAdd}
      >
        <Plus size={12} strokeWidth={2} />
        Add Stop
      </button>
    </div>
  );
});
