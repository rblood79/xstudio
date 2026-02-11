/**
 * FillSection (UI: "Background") - Background 레이어 편집 섹션
 *
 * Phase 2: Color + Gradient 다중 레이어
 * - PropertySection 래퍼 + 내부 Content 분리
 * - Jotai atom 구독 (fillsAtom)
 * - @dnd-kit/sortable 드래그 순서 변경
 * - memo 최적화
 *
 * @since 2026-02-10 Color Picker Phase 1
 * @updated 2026-02-10 Gradient Phase 2
 */

import { memo, useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  type DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus } from 'lucide-react';
import { PropertySection } from '../../../components';
import { iconSmall } from '../../../../utils/ui/uiConstants';
import { useFillValuesJotai } from '../hooks/useFillValuesJotai';
import { useFillActions } from '../hooks/useFillActions';
import type { FillItem } from '../../../../types/builder/fill.types';
import { FillType } from '../../../../types/builder/fill.types';
import { FillLayerRow } from '../components/FillLayerRow';

import './FillSection.css';

/** Sortable 래퍼 - 각 FillLayerRow를 sortable로 만듦 */
function SortableFillRow({
  fill,
  onToggle,
  onUpdate,
  onUpdatePreview,
  onRemove,
  onTypeChange,
}: {
  fill: FillItem;
  onToggle: (id: string) => void;
  onUpdate: (id: string, updates: Partial<FillItem>) => void;
  onUpdatePreview: (id: string, updates: Partial<FillItem>) => void;
  onRemove: (id: string) => void;
  onTypeChange: (fillId: string, newType: FillType) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({
    id: fill.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <FillLayerRow
        fill={fill}
        onToggle={onToggle}
        onUpdate={onUpdate}
        onUpdatePreview={onUpdatePreview}
        onRemove={onRemove}
        onTypeChange={onTypeChange}
      />
    </div>
  );
}

/**
 * 내부 컨텐츠 - 섹션이 열릴 때만 마운트
 * Jotai atom에서 직접 값 구독
 */
const FillSectionContent = memo(function FillSectionContent() {
  const { fills } = useFillValuesJotai();
  const { addFill, removeFill, reorderFill, toggleFill, updateFill, updateFillPreview, changeFillType } =
    useFillActions();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const fromIndex = fills.findIndex((f) => f.id === active.id);
      const toIndex = fills.findIndex((f) => f.id === over.id);
      if (fromIndex !== -1 && toIndex !== -1) {
        reorderFill(fromIndex, toIndex);
      }
    },
    [fills, reorderFill],
  );

  const fillIds = fills.map((f) => f.id);

  return (
    <div className="fill-section-content">
      {fills.length === 0 ? (
        <div className="fill-section-empty">No background</div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={fillIds} strategy={verticalListSortingStrategy}>
            {fills.map((fill) => (
              <SortableFillRow
                key={fill.id}
                fill={fill}
                onToggle={toggleFill}
                onUpdate={updateFill}
                onUpdatePreview={updateFillPreview}
                onRemove={removeFill}
                onTypeChange={changeFillType}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
});

/**
 * FillSectionInline - Appearance 섹션 내부에 인라인으로 렌더링
 * PropertySection 래퍼 없이 Background 콘텐츠만 제공
 */
export const FillSectionInline = memo(function FillSectionInline() {
  const { fills } = useFillValuesJotai();
  const { addFill } = useFillActions();

  const handleAdd = useCallback(() => {
    const hasColor = fills.some((f) => f.type === FillType.Color);
    addFill(hasColor ? FillType.LinearGradient : FillType.Color);
  }, [fills, addFill]);

  return (
    <div className="fill-section-inline">
      <div className="fill-section-inline-header">
        <span className="fill-section-inline-label">Background</span>
        <button
          type="button"
          className="fill-section-add-btn"
          onClick={handleAdd}
          aria-label="Add background"
          title="Add background"
        >
          <Plus
            size={iconSmall.size}
            strokeWidth={iconSmall.strokeWidth}
            color={iconSmall.color}
          />
        </button>
      </div>
      <FillSectionContent />
    </div>
  );
});

/**
 * FillSection - 독립 섹션 래퍼 (PropertySection 포함)
 * 호환성 유지용 — 단독 사용 시
 */
export const FillSection = memo(function FillSection() {
  return (
    <PropertySection id="background" title="Background">
      <FillSectionInline />
    </PropertySection>
  );
});
