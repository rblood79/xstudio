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
      <div className="transform-size">
        <PropertyUnitInput
          icon={RulerDimensionLine}
          label="Width"
          value={getStyleValue(selectedElement, 'width', 'auto')}
          units={['reset', 'px', '%', 'rem', 'em', 'vh', 'vw']}
          onChange={(value) => updateStyle('width', value)}
          min={0}
          max={9999}
        />
        <PropertyUnitInput
          icon={RulerDimensionLine}
          label="Height"
          className="transform-size-height"
          value={getStyleValue(selectedElement, 'height', 'auto')}
          units={['reset', 'px', '%', 'rem', 'em', 'vh', 'vw']}
          onChange={(value) => updateStyle('height', value)}
          min={0}
          max={9999}
        />
        <div className="fieldset-actions">
          <Button>
            <EllipsisVertical
              color={iconProps.color}
              size={iconProps.size}
              strokeWidth={iconProps.stroke}
            />
          </Button>
        </div>
      </div>

      <div className="transform-position">
        <PropertyUnitInput
          icon={ArrowRightFromLine}
          label="Left"
          className="transform-position-left"
          value={getStyleValue(selectedElement, 'left', 'auto')}
          units={['reset', 'px', '%', 'rem', 'em', 'vh', 'vw']}
          onChange={(value) => updateStyle('left', value)}
          min={-9999}
          max={9999}
        />
        <PropertyUnitInput
          icon={ArrowDownFromLine}
          label="Top"
          className="transform-position-top"
          value={getStyleValue(selectedElement, 'top', 'auto')}
          units={['reset', 'px', '%', 'rem', 'em', 'vh', 'vw']}
          onChange={(value) => updateStyle('top', value)}
          min={-9999}
          max={9999}
        />
        <div className="fieldset-actions">
          <Button>
            <EllipsisVertical
              color={iconProps.color}
              size={iconProps.size}
              strokeWidth={iconProps.stroke}
            />
          </Button>
        </div>
      </div>
    </PropertySection>
  );
}
