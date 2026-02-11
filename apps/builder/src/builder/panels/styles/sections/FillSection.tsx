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

import { memo, useCallback, useMemo } from 'react';
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
import {
  DialogTrigger,
  Button as AriaButton,
} from 'react-aria-components';
import { Plus } from 'lucide-react';
import { ColorSwatch } from '@xstudio/shared/components/ColorSwatch';
import { Popover } from '@xstudio/shared/components/Popover';
import { PropertySection } from '../../../components';
import { Button } from '@xstudio/shared/components';
import { iconProps, iconSmall } from '../../../../utils/ui/uiConstants';
import { useFillValuesJotai } from '../hooks/useFillValuesJotai';
import { useFillActions } from '../hooks/useFillActions';
import type { FillItem, ColorFillItem, GradientStop } from '../../../../types/builder/fill.types';
import { FillType } from '../../../../types/builder/fill.types';
import { FillLayerRow } from '../components/FillLayerRow';
import { FillDetailPopover } from '../components/FillDetailPopover';
import { gradientStopsToCss } from '../utils/colorUtils';
import { useAppearanceValuesJotai } from '../hooks/useAppearanceValuesJotai';

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
 * FillBackgroundInline - style-background 그리드 구조에 맞는 V2 Fill UI
 *
 * 기존 PropertyColor와 동일한 그리드 레이아웃(3열: 1fr 1fr inspector-control-size)에서:
 * - 첫번째 Fill: PropertyColor 스타일 swatch (클릭 시 FillDetailPopover)
 * - + 버튼: 3번째 열 (actions-icon)
 * - 추가 Fill(2번째~): 그리드 아래 FillLayerRow 리스트
 */
export const FillBackgroundInline = memo(function FillBackgroundInline() {
  const { fills } = useFillValuesJotai();
  const styleValues = useAppearanceValuesJotai();
  const {
    addFill,
    removeFill,
    reorderFill,
    toggleFill,
    updateFill,
    updateFillPreview,
    changeFillType,
  } = useFillActions();

  const firstFill = fills[0] ?? null;
  const extraFills = fills.slice(1);

  // fills가 없을 때 표시할 기본 색상: 현재 요소의 backgroundColor 또는 #FFFFFF
  const placeholderColor = styleValues?.backgroundColor || '#FFFFFF';
  // hex6 → hex8 변환 (addFill에 전달용)
  const placeholderColorHex8 = placeholderColor.length === 7
    ? `${placeholderColor}FF`
    : placeholderColor;

  // fills가 없을 때 popover에 전달할 가상 fill 객체 (store에 저장되지 않음, 표시 전용)
  const virtualFill = useMemo<ColorFillItem>(() => ({
    id: '__virtual__',
    type: FillType.Color,
    color: placeholderColorHex8,
    enabled: true,
    opacity: 1,
    blendMode: 'normal',
  }), [placeholderColorHex8]);

  // popover에 전달할 fill: 실제 fill이 있으면 그것, 없으면 가상 fill
  const popoverFill = firstFill ?? virtualFill;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const handleAdd = useCallback(() => {
    const hasColor = fills.some((f) => f.type === FillType.Color);
    if (hasColor) {
      addFill(FillType.LinearGradient);
    } else {
      addFill(FillType.Color, placeholderColorHex8);
    }
  }, [fills, addFill, placeholderColorHex8]);

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

  // popover 콜백: fills가 없으면 fill 생성과 동시에 색상 적용
  // fills가 있으면 기존 fill 업데이트
  const handleColorChange = useCallback(
    (color: string) => {
      if (firstFill && firstFill.type === FillType.Color) {
        updateFillPreview(firstFill.id, { color } as Partial<ColorFillItem>);
      } else if (!firstFill) {
        // 가상 fill 상태 → 실제 fill 생성 (사용자가 색상을 변경한 순간)
        addFill(FillType.Color, color);
      }
    },
    [firstFill, updateFillPreview, addFill],
  );

  const handleColorChangeEnd = useCallback(
    (color: string) => {
      if (firstFill && firstFill.type === FillType.Color) {
        updateFill(firstFill.id, { color } as Partial<ColorFillItem>);
      } else if (!firstFill) {
        addFill(FillType.Color, color);
      }
    },
    [firstFill, updateFill, addFill],
  );

  const handleFillUpdate = useCallback(
    (updates: Partial<FillItem>) => {
      if (firstFill) updateFillPreview(firstFill.id, updates);
    },
    [firstFill, updateFillPreview],
  );

  const handleFillUpdateEnd = useCallback(
    (updates: Partial<FillItem>) => {
      if (firstFill) updateFill(firstFill.id, updates);
    },
    [firstFill, updateFill],
  );

  const handleTypeChange = useCallback(
    (newType: FillType) => {
      if (firstFill) {
        changeFillType(firstFill.id, newType);
      } else {
        // 가상 fill 상태에서 타입 변경 → 해당 타입으로 fill 생성
        addFill(newType);
      }
    },
    [firstFill, changeFillType, addFill],
  );

  // swatch에 표시할 색상
  const swatchColor = useMemo(() => {
    if (!firstFill) return placeholderColor;
    if (firstFill.type === FillType.Color) return (firstFill as ColorFillItem).color;
    return undefined;
  }, [firstFill, placeholderColor]);

  // swatch 배경 CSS (gradient인 경우)
  const swatchStyle = useMemo(() => {
    if (!firstFill) return undefined;
    if (firstFill.type === FillType.Color) return undefined;
    if (
      firstFill.type === FillType.LinearGradient ||
      firstFill.type === FillType.RadialGradient ||
      firstFill.type === FillType.AngularGradient
    ) {
      const stops = (firstFill as { stops: GradientStop[] }).stops;
      return { background: `linear-gradient(90deg, ${gradientStopsToCss(stops)})` };
    }
    if (firstFill.type === FillType.MeshGradient) {
      return { background: 'conic-gradient(#FF0000, #FFFF00, #00FF00, #00FFFF, #0000FF, #FF00FF, #FF0000)' };
    }
    return undefined;
  }, [firstFill]);

  const isColor = firstFill?.type === FillType.Color || !firstFill;
  const isGradient =
    firstFill?.type === FillType.LinearGradient ||
    firstFill?.type === FillType.RadialGradient ||
    firstFill?.type === FillType.AngularGradient;
  const isMesh = firstFill?.type === FillType.MeshGradient;

  const extraFillIds = extraFills.map((f) => f.id);

  return (
    <>
      <div className="style-background">
        <fieldset className="properties-aria property-color-input background-color">
          <legend className="fieldset-legend">Background</legend>
          <DialogTrigger>
            <AriaButton
              className="react-aria-Group color-swatch-button"
              aria-label="Edit background fill"
            >
              {isColor && (
                <ColorSwatch color={swatchColor!} />
              )}
              {isGradient && (
                <div
                  className="fill-background-gradient-swatch"
                  style={swatchStyle}
                />
              )}
              {isMesh && (
                <div
                  className="fill-background-gradient-swatch"
                  style={swatchStyle}
                />
              )}
            </AriaButton>
            <Popover
              placement="bottom start"
              className="fill-detail-popover-container"
              showArrow={false}
            >
              <FillDetailPopover
                fill={popoverFill}
                onColorChange={handleColorChange}
                onColorChangeEnd={handleColorChangeEnd}
                onUpdate={handleFillUpdate}
                onUpdateEnd={handleFillUpdateEnd}
                onTypeChange={handleTypeChange}
              />
            </Popover>
          </DialogTrigger>
        </fieldset>
        <div className="fieldset-actions actions-icon">
          <Button
            onPress={handleAdd}
            aria-label="Add background"
          >
            <Plus
              color={iconProps.color}
              size={iconProps.size}
              strokeWidth={iconProps.strokeWidth}
            />
          </Button>
        </div>
      </div>

      {extraFills.length > 0 && (
        <div className="fill-background-extra">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={extraFillIds} strategy={verticalListSortingStrategy}>
              {extraFills.map((fill) => (
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
        </div>
      )}
    </>
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
