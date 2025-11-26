/**
 * AppearanceSection - Appearance 스타일 편집 섹션
 *
 * Background, Border 편집
 */

import { PropertySection, PropertyUnitInput, PropertyColor, PropertySelect } from '../../common';
import { Button } from '../../../components';
import { iconProps } from '../../../../utils/ui/uiConstants';
import type { SelectedElement } from '../../../inspector/types';
import {
  Square,
  SquareDashed,
  SquareRoundCorner,
  SquareDashedBottom,
  EllipsisVertical,
} from 'lucide-react';
import { useStyleActions } from '../hooks/useStyleActions';
import { getStyleValue } from '../hooks/useStyleValues';

interface AppearanceSectionProps {
  selectedElement: SelectedElement;
}

export function AppearanceSection({ selectedElement }: AppearanceSectionProps) {
  const { updateStyle, resetStyles } = useStyleActions();

  const handleReset = () => {
    resetStyles(['backgroundColor', 'borderColor', 'borderWidth', 'borderRadius', 'borderStyle']);
  };

  return (
    <PropertySection id="appearance" title="Appearance" onReset={handleReset}>
      <div className="style-background">
        <PropertyColor
          icon={Square}
          label="Background Color"
          className="background-color"
          value={getStyleValue(selectedElement, 'backgroundColor', '#FFFFFF')}
          onChange={(value) => updateStyle('backgroundColor', value)}
          placeholder="#FFFFFF"
        />
        <div className="fieldset-actions actions-icon">
          <Button>
            <EllipsisVertical
              color={iconProps.color}
              size={iconProps.size}
              strokeWidth={iconProps.stroke}
            />
          </Button>
        </div>
      </div>

      <div className="style-border">
        <PropertyColor
          icon={Square}
          label="Color"
          className="border-color"
          value={getStyleValue(selectedElement, 'borderColor', '#000000')}
          onChange={(value) => updateStyle('borderColor', value)}
          placeholder="#000000"
        />
        <PropertyUnitInput
          icon={SquareDashed}
          label="Border Width"
          className="border-width"
          value={getStyleValue(selectedElement, 'borderWidth', '0px')}
          units={['reset', 'px']}
          onChange={(value) => updateStyle('borderWidth', value)}
          min={0}
          max={100}
        />
        <PropertyUnitInput
          icon={SquareRoundCorner}
          label="Border Radius"
          className="border-radius"
          value={getStyleValue(selectedElement, 'borderRadius', '0px')}
          units={['reset', 'px', '%', 'rem', 'em']}
          onChange={(value) => updateStyle('borderRadius', value)}
          min={0}
          max={500}
        />
        <PropertySelect
          icon={SquareDashedBottom}
          label="Border Style"
          className="border-style"
          value={getStyleValue(selectedElement, 'borderStyle', 'solid')}
          options={[
            { value: 'reset', label: 'Reset' },
            { value: 'none', label: 'none' },
            { value: 'solid', label: 'solid' },
            { value: 'dashed', label: 'dashed' },
            { value: 'dotted', label: 'dotted' },
            { value: 'double', label: 'double' },
            { value: 'groove', label: 'groove' },
            { value: 'ridge', label: 'ridge' },
            { value: 'inset', label: 'inset' },
            { value: 'outset', label: 'outset' },
          ]}
          onChange={(value) => updateStyle('borderStyle', value)}
        />
        <div className="fieldset-actions actions-icon">
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
