/**
 * TransformSection - Transform 스타일 편집 섹션
 *
 * Size, Position 편집
 * Note: Alignment는 Layout 섹션의 3x3 Flex alignment로 통합됨
 */

import { PropertySection, PropertyUnitInput } from '../../common';
import { Button } from '../../../components';
import { iconProps } from '../../../../utils/ui/uiConstants';
import type { SelectedElement } from '../../../inspector/types';
import {
  EllipsisVertical,
  RulerDimensionLine,
  ArrowRightFromLine,
  ArrowDownFromLine,
} from 'lucide-react';
import { useStyleActions } from '../hooks/useStyleActions';
import { getStyleValue } from '../hooks/useStyleValues';

interface TransformSectionProps {
  selectedElement: SelectedElement;
}

export function TransformSection({ selectedElement }: TransformSectionProps) {
  const { updateStyle, resetStyles } = useStyleActions();

  const handleReset = () => {
    resetStyles(['width', 'height', 'top', 'left']);
  };

  return (
    <PropertySection id="transform" title="Transform" onReset={handleReset}>
      <PropertyUnitInput
        icon={RulerDimensionLine}
        label="Width"
        className="width"
        value={getStyleValue(selectedElement, 'width', 'auto')}
        units={['reset', 'px', '%', 'rem', 'em', 'vh', 'vw']}
        onChange={(value) => updateStyle('width', value)}
        min={0}
        max={9999}
      />
      <PropertyUnitInput
        icon={RulerDimensionLine}
        label="Height"
        className="height"
        value={getStyleValue(selectedElement, 'height', 'auto')}
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
        value={getStyleValue(selectedElement, 'left', 'auto')}
        units={['reset', 'px', '%', 'rem', 'em', 'vh', 'vw']}
        onChange={(value) => updateStyle('left', value)}
        min={-9999}
        max={9999}
      />
      <PropertyUnitInput
        icon={ArrowDownFromLine}
        label="Top"
        className="top"
        value={getStyleValue(selectedElement, 'top', 'auto')}
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
    </PropertySection>
  );
}
