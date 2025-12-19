/**
 * TransformSection - Transform 스타일 편집 섹션
 *
 * Size, Position 편집
 * Note: Alignment는 Layout 섹션의 3x3 Flex alignment로 통합됨
 *
 * 🚀 Phase 20: styleValues prop으로 파싱된 값 직접 사용
 */

import { memo } from 'react';
import { PropertySection, PropertyUnitInput } from '../../common';
import { Button } from '../../../../shared/components';
import { iconProps } from '../../../../utils/ui/uiConstants';
import type { SelectedElement } from '../../../inspector/types';
import type { StyleValues } from '../hooks/useStyleValues';
import {
  EllipsisVertical,
  RulerDimensionLine,
  ArrowRightFromLine,
  ArrowDownFromLine,
} from 'lucide-react';
import { useStyleActions } from '../hooks/useStyleActions';

interface TransformSectionProps {
  selectedElement: SelectedElement;
  styleValues: StyleValues | null;
}

// 🚀 Phase 21: 커스텀 비교 함수 - 실제 사용하는 스타일 값만 비교
export const TransformSection = memo(function TransformSection({
  selectedElement,
  styleValues,
}: TransformSectionProps) {
  const { updateStyle, resetStyles } = useStyleActions();

  const handleReset = () => {
    resetStyles(['width', 'height', 'top', 'left']);
  };

  // 🚀 Phase 20: styleValues가 없으면 렌더링 안함
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
            onChange={(value) => updateStyle('width', value)}
            min={0}
            max={9999}
          />
          <PropertyUnitInput
            icon={RulerDimensionLine}
            label="Height"
            className="height"
            value={styleValues.height}
            units={['reset', 'px', '%', 'rem', 'em', 'vh', 'vw']}
            onChange={(value) => updateStyle('height', value)}
            min={0}
            max={9999}
          />
          <div className="fieldset-actions actions-size">
            <Button>
              <EllipsisVertical
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </Button>
          </div>

          <PropertyUnitInput
            icon={ArrowRightFromLine}
            label="Left"
            className="left"
            value={styleValues.left}
            units={['reset', 'px', '%', 'rem', 'em', 'vh', 'vw']}
            onChange={(value) => updateStyle('left', value)}
            min={-9999}
            max={9999}
          />
          <PropertyUnitInput
            icon={ArrowDownFromLine}
            label="Top"
            className="top"
            value={styleValues.top}
            units={['reset', 'px', '%', 'rem', 'em', 'vh', 'vw']}
            onChange={(value) => updateStyle('top', value)}
            min={-9999}
            max={9999}
          />
          <div className="fieldset-actions actions-position">
            <Button>
              <EllipsisVertical
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </Button>
          </div>
        </>
      )}
    </PropertySection>
  );
}, (prevProps, nextProps) => {
  // 🚀 Phase 21: styleValues의 관련 값만 비교 (selectedElement 무시)
  const prev = prevProps.styleValues;
  const next = nextProps.styleValues;
  if (prev === next) return true;
  if (!prev || !next) return false;
  return (
    prev.width === next.width &&
    prev.height === next.height &&
    prev.top === next.top &&
    prev.left === next.left
  );
});
