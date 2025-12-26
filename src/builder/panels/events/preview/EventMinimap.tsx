/**
 * EventMinimap - 이벤트 핸들러 미니맵
 *
 * 블록 간 연결선을 시각화하여 관계 파악 지원
 * 편집 기능 없이 읽기 전용으로 제공
 *
 * Phase 5: Events Panel 재설계
 */

import { useMemo } from 'react';
import type { BlockEventHandler } from '../types/eventBlockTypes';

interface EventMinimapProps {
  /** 이벤트 핸들러 목록 */
  handlers: BlockEventHandler[];
  /** 현재 선택된 핸들러 ID */
  selectedHandlerId?: string;
  /** 핸들러 클릭 핸들러 */
  onHandlerClick?: (handlerId: string) => void;
  /** 너비 */
  width?: number;
  /** 높이 */
  height?: number;
}

// 미니맵 상수
const BLOCK_WIDTH = 60;
const BLOCK_HEIGHT = 20;
const BLOCK_GAP_X = 20;
const BLOCK_GAP_Y = 30;
const PADDING = 10;

// 블록 타입별 색상
const BLOCK_COLORS = {
  trigger: '#3b82f6', // blue
  condition: '#f59e0b', // amber
  then: '#22c55e', // green
  else: '#ef4444', // red
};

interface MinimapBlock {
  id: string;
  type: 'trigger' | 'condition' | 'then' | 'else';
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  handlerId: string;
}

interface MinimapConnection {
  from: { x: number; y: number };
  to: { x: number; y: number };
  type: 'normal' | 'branch';
}

/**
 * 핸들러에서 미니맵 블록 및 연결선 생성
 */
function generateMinimapData(handlers: BlockEventHandler[]) {
  const blocks: MinimapBlock[] = [];
  const connections: MinimapConnection[] = [];

  let currentY = PADDING;

  for (const handler of handlers) {
    let currentX = PADDING;

    // WHEN 블록 (Trigger)
    const triggerBlock: MinimapBlock = {
      id: `${handler.id}-trigger`,
      type: 'trigger',
      label: handler.trigger.event.replace(/^on/, ''),
      x: currentX,
      y: currentY,
      width: BLOCK_WIDTH,
      height: BLOCK_HEIGHT,
      handlerId: handler.id,
    };
    blocks.push(triggerBlock);

    currentX += BLOCK_WIDTH + BLOCK_GAP_X;

    // IF 블록 (Condition) - 있는 경우만
    if (handler.conditions && handler.conditions.conditions.length > 0) {
      const conditionBlock: MinimapBlock = {
        id: `${handler.id}-condition`,
        type: 'condition',
        label: `IF (${handler.conditions.conditions.length})`,
        x: currentX,
        y: currentY,
        width: BLOCK_WIDTH,
        height: BLOCK_HEIGHT,
        handlerId: handler.id,
      };
      blocks.push(conditionBlock);

      // Trigger → Condition 연결
      connections.push({
        from: { x: triggerBlock.x + triggerBlock.width, y: triggerBlock.y + triggerBlock.height / 2 },
        to: { x: conditionBlock.x, y: conditionBlock.y + conditionBlock.height / 2 },
        type: 'normal',
      });

      currentX += BLOCK_WIDTH + BLOCK_GAP_X;

      // THEN 블록들
      if (handler.thenActions.length > 0) {
        const thenBlock: MinimapBlock = {
          id: `${handler.id}-then`,
          type: 'then',
          label: `THEN (${handler.thenActions.length})`,
          x: currentX,
          y: currentY - BLOCK_GAP_Y / 2,
          width: BLOCK_WIDTH,
          height: BLOCK_HEIGHT,
          handlerId: handler.id,
        };
        blocks.push(thenBlock);

        // Condition → Then 연결 (위쪽 분기)
        connections.push({
          from: { x: conditionBlock.x + conditionBlock.width, y: conditionBlock.y + conditionBlock.height / 2 },
          to: { x: thenBlock.x, y: thenBlock.y + thenBlock.height / 2 },
          type: 'branch',
        });
      }

      // ELSE 블록들
      if (handler.elseActions && handler.elseActions.length > 0) {
        const elseBlock: MinimapBlock = {
          id: `${handler.id}-else`,
          type: 'else',
          label: `ELSE (${handler.elseActions.length})`,
          x: currentX,
          y: currentY + BLOCK_GAP_Y / 2,
          width: BLOCK_WIDTH,
          height: BLOCK_HEIGHT,
          handlerId: handler.id,
        };
        blocks.push(elseBlock);

        // Condition → Else 연결 (아래쪽 분기)
        connections.push({
          from: { x: conditionBlock.x + conditionBlock.width, y: conditionBlock.y + conditionBlock.height / 2 },
          to: { x: elseBlock.x, y: elseBlock.y + elseBlock.height / 2 },
          type: 'branch',
        });
      }
    } else {
      // 조건 없이 직접 THEN 블록
      if (handler.thenActions.length > 0) {
        const thenBlock: MinimapBlock = {
          id: `${handler.id}-then`,
          type: 'then',
          label: `DO (${handler.thenActions.length})`,
          x: currentX,
          y: currentY,
          width: BLOCK_WIDTH,
          height: BLOCK_HEIGHT,
          handlerId: handler.id,
        };
        blocks.push(thenBlock);

        // Trigger → Then 연결
        connections.push({
          from: { x: triggerBlock.x + triggerBlock.width, y: triggerBlock.y + triggerBlock.height / 2 },
          to: { x: thenBlock.x, y: thenBlock.y + thenBlock.height / 2 },
          type: 'normal',
        });
      }
    }

    currentY += BLOCK_HEIGHT + BLOCK_GAP_Y;
  }

  return { blocks, connections };
}

/**
 * 이벤트 미니맵 컴포넌트
 *
 * @example
 * <EventMinimap
 *   handlers={eventHandlers}
 *   selectedHandlerId={selectedHandler?.id}
 *   onHandlerClick={(id) => setSelectedHandler(handlers.find(h => h.id === id))}
 * />
 */
export function EventMinimap({
  handlers,
  selectedHandlerId,
  onHandlerClick,
  width = 250,
  height = 150,
}: EventMinimapProps) {
  const { blocks, connections } = useMemo(
    () => generateMinimapData(handlers),
    [handlers]
  );

  // 뷰박스 계산
  const viewBox = useMemo(() => {
    if (blocks.length === 0) {
      return `0 0 ${width} ${height}`;
    }

    const maxX = Math.max(...blocks.map((b) => b.x + b.width)) + PADDING;
    const maxY = Math.max(...blocks.map((b) => b.y + b.height)) + PADDING;

    return `0 0 ${Math.max(maxX, width)} ${Math.max(maxY, height)}`;
  }, [blocks, width, height]);

  if (handlers.length === 0) {
    return (
      <div className="event-minimap event-minimap-empty">
        <span>No handlers</span>
      </div>
    );
  }

  return (
    <div className="event-minimap">
      <svg
        width={width}
        height={height}
        viewBox={viewBox}
        className="event-minimap-svg"
      >
        {/* 연결선 */}
        <g className="minimap-connections">
          {connections.map((conn, index) => (
            <path
              key={index}
              d={`M ${conn.from.x} ${conn.from.y} C ${conn.from.x + 10} ${conn.from.y}, ${conn.to.x - 10} ${conn.to.y}, ${conn.to.x} ${conn.to.y}`}
              fill="none"
              stroke={conn.type === 'branch' ? '#94a3b8' : '#64748b'}
              strokeWidth={1}
              strokeDasharray={conn.type === 'branch' ? '2,2' : undefined}
            />
          ))}
        </g>

        {/* 블록들 */}
        <g className="minimap-blocks">
          {blocks.map((block) => {
            const isSelected = block.handlerId === selectedHandlerId;
            const color = BLOCK_COLORS[block.type];

            return (
              <g
                key={block.id}
                className={`minimap-block ${isSelected ? 'selected' : ''}`}
                onClick={() => onHandlerClick?.(block.handlerId)}
                style={{ cursor: onHandlerClick ? 'pointer' : 'default' }}
              >
                <rect
                  x={block.x}
                  y={block.y}
                  width={block.width}
                  height={block.height}
                  rx={3}
                  fill={color}
                  fillOpacity={isSelected ? 1 : 0.7}
                  stroke={isSelected ? '#1e293b' : 'none'}
                  strokeWidth={isSelected ? 2 : 0}
                />
                <text
                  x={block.x + block.width / 2}
                  y={block.y + block.height / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={8}
                  fontWeight={500}
                >
                  {block.label.length > 8 ? block.label.slice(0, 7) + '…' : block.label}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
