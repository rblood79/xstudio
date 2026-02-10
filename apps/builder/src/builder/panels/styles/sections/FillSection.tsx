/**
 * FillSection (UI: "Background") - Background 레이어 편집 섹션
 *
 * Color Picker Phase 1:
 * - PropertySection 래퍼 + 내부 Content 분리
 * - Jotai atom 구독 (fillsAtom)
 * - @dnd-kit/sortable 드래그 순서 변경
 * - memo 최적화
 * - Color fill은 최대 1개 제한 (웹 CSS: background-color는 1개만)
 * - Phase 2: Gradient/Image 추가 시 다중 레이어 활성화 (CSS background 다중 레이어)
 *
 * @since 2026-02-10 Color Picker Phase 1
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
}: {
  fill: FillItem;
  onToggle: (id: string) => void;
  onUpdate: (id: string, updates: Partial<FillItem>) => void;
  onUpdatePreview: (id: string, updates: Partial<FillItem>) => void;
  onRemove: (id: string) => void;
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
  const { addFill, removeFill, reorderFill, toggleFill, updateFill, updateFillPreview } =
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
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
});

/**
 * FillSection - 외부 래퍼 (UI 표시: "Background")
 * - Color fill은 최대 1개 (웹 CSS background-color 제약)
 * - Phase 2: Gradient/Image 타입은 다중 레이어 허용
 */
export const FillSection = memo(function FillSection() {
  const { fills } = useFillValuesJotai();
  const { addFill } = useFillActions();

  // Phase 1: Color fill이 이미 있으면 추가 버튼 비활성화
  const hasColorFill = fills.some((f) => f.type === FillType.Color);

  const handleAdd = useCallback(() => {
    addFill();
  }, [addFill]);

  return (
    <PropertySection
      id="background"
      title="Background"
    >
      <div className="fill-section-header-actions">
        <button
          type="button"
          className="fill-section-add-btn"
          onClick={handleAdd}
          aria-label="Add background"
          title={hasColorFill ? 'Color background already exists' : 'Add background'}
          disabled={hasColorFill}
        >
          <Plus
            size={iconSmall.size}
            strokeWidth={iconSmall.strokeWidth}
            color={iconSmall.color}
          />
        </button>
      </div>
      <FillSectionContent />
    </PropertySection>
  );
});
