/**
 * TransformSection - Transform 스타일 편집 섹션
 *
 * Size, Position 편집
 * Note: Alignment는 Layout 섹션의 3x3 Flex alignment로 통합됨
 *
 * 🚀 Phase 22: useTransformValues 훅으로 성능 최적화
 * - 4개 속성만 의존성으로 사용 (86% 성능 개선)
 */

import { memo } from 'react';
import { PropertySection, PropertyUnitInput } from '../../common';
import { Button } from '../../../../shared/components';
import { iconProps } from '../../../../utils/ui/uiConstants';
import type { SelectedElement } from '../../../inspector/types';
import {
  EllipsisVertical,
  RulerDimensionLine,
  ArrowRightFromLine,
  ArrowDownFromLine,
} from 'lucide-react';
import { useStyleActions } from '../hooks/useStyleActions';
import { useOptimizedStyleActions } from '../hooks/useOptimizedStyleActions';
import { useTransformValues } from '../hooks/useTransformValues';

interface TransformSectionProps {
  selectedElement: SelectedElement;
}

// 🚀 Phase 22: 내부 훅이 최적화를 담당하므로 간단한 memo만 사용
export const TransformSection = memo(function TransformSection({
  selectedElement,
}: TransformSectionProps) {
  const { resetStyles } = useStyleActions();
  // 🚀 Phase 1: RAF 기반 스로틀 업데이트
  const { updateStyleImmediate, updateStyleRAF } = useOptimizedStyleActions();
  // 🚀 Phase 22: 섹션 전용 훅 사용
  const styleValues = useTransformValues(selectedElement);

  const handleReset = () => {
    resetStyles(['width', 'height', 'top', 'left']);
  };

  if (!styleValues) return null;

  return (
    <PropertySection id="transform" title="Transform" onReset={handleReset}>
      {() => (
        <>
          <PropertyUnitInput
            icon={RulerDimensionLine}
            label="Width"
            className="width"
            value={styleValues.width}
            units={['reset', 'px', '%', 'rem', 'em', 'vh', 'vw']}
            onChange={(value) => updateStyleImmediate('width', value)}
            onDrag={(value) => updateStyleRAF('width', value)}
            min={0}
            max={9999}
          />
          <PropertyUnitInput
            icon={RulerDimensionLine}
            label="Height"
            className="height"
            value={styleValues.height}
            units={['reset', 'px', '%', 'rem', 'em', 'vh', 'vw']}
            onChange={(value) => updateStyleImmediate('height', value)}
            onDrag={(value) => updateStyleRAF('height', value)}
            min={0}
            max={9999}
          />
          <div className="fieldset-actions actions-size">
            <Button>
              <EllipsisVertical
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.strokeWidth}
              />
            </Button>
          </div>

          <PropertyUnitInput
            icon={ArrowRightFromLine}
            label="Left"
            className="left"
            value={styleValues.left}
            units={['reset', 'px', '%', 'rem', 'em', 'vh', 'vw']}
            onChange={(value) => updateStyleImmediate('left', value)}
            onDrag={(value) => updateStyleRAF('left', value)}
            min={-9999}
            max={9999}
          />
          <PropertyUnitInput
            icon={ArrowDownFromLine}
            label="Top"
            className="top"
            value={styleValues.top}
            units={['reset', 'px', '%', 'rem', 'em', 'vh', 'vw']}
            onChange={(value) => updateStyleImmediate('top', value)}
            onDrag={(value) => updateStyleRAF('top', value)}
            min={-9999}
            max={9999}
          />
          <div className="fieldset-actions actions-position">
            <Button>
              <EllipsisVertical
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.strokeWidth}
              />
            </Button>
          </div>
        </>
      )}
    </PropertySection>
  );
});
