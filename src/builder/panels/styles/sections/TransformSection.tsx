/**
 * TransformSection - Transform 스타일 편집 섹션
 *
 * Alignment, Size, Position 편집
 */

import { PropertySection, PropertyUnitInput } from '../../common';
import { ToggleButton, ToggleButtonGroup, Button } from '../../../components';
import { iconProps } from '../../../../utils/ui/uiConstants';
import type { SelectedElement } from '../../../inspector/types';
import {
  EllipsisVertical,
  RulerDimensionLine,
  ArrowRightFromLine,
  ArrowDownFromLine,
  AlignStartVertical,
  AlignHorizontalJustifyCenter,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignVerticalJustifyCenter,
  AlignEndHorizontal,
} from 'lucide-react';
import { useStyleActions } from '../hooks/useStyleActions';
import {
  getStyleValue,
  getVerticalAlignmentKeys,
  getHorizontalAlignmentKeys,
} from '../hooks/useStyleValues';

interface TransformSectionProps {
  selectedElement: SelectedElement;
}

export function TransformSection({ selectedElement }: TransformSectionProps) {
  const {
    updateStyle,
    handleVerticalAlignment,
    handleHorizontalAlignment,
  } = useStyleActions();

  return (
    <PropertySection title="Transform">
      <fieldset className="transform-alignment">
        <legend className="fieldset-legend">Alignment</legend>
        <div className="alignment-controls-horizontal">
          <ToggleButtonGroup
            aria-label="Flex alignment-vertical"
            indicator
            selectedKeys={getVerticalAlignmentKeys(selectedElement)}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string;
              if (value) {
                console.log('🎯 Flex alignment-vertical 선택 변경:', keys);
                console.log('✅ display: flex + alignItems 설정 시작');
                handleVerticalAlignment(value);
              }
            }}
          >
            <ToggleButton id="align-vertical-start">
              <AlignStartVertical
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </ToggleButton>
            <ToggleButton id="align-vertical-center">
              <AlignHorizontalJustifyCenter
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </ToggleButton>
            <ToggleButton id="align-vertical-end">
              <AlignEndVertical
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </ToggleButton>
          </ToggleButtonGroup>
        </div>
        <div className="alignment-controls-vertical">
          <ToggleButtonGroup
            aria-label="Flex alignment-horizontal"
            indicator
            selectedKeys={getHorizontalAlignmentKeys(selectedElement)}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string;
              if (value) {
                console.log('🎯 Flex alignment-horizontal 선택 변경:', keys);
                console.log('✅ display: flex + justifyContent 설정 시작');
                handleHorizontalAlignment(value);
              }
            }}
          >
            <ToggleButton id="align-horizontal-start">
              <AlignStartHorizontal
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </ToggleButton>
            <ToggleButton id="align-horizontal-center">
              <AlignVerticalJustifyCenter
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </ToggleButton>
            <ToggleButton id="align-horizontal-end">
              <AlignEndHorizontal
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </ToggleButton>
          </ToggleButtonGroup>
        </div>
        <div className="fieldset-actions">
          <Button>
            <EllipsisVertical
              color={iconProps.color}
              size={iconProps.size}
              strokeWidth={iconProps.stroke}
            />
          </Button>
        </div>
      </fieldset>

      <div className="transform-size">
        <PropertyUnitInput
          icon={RulerDimensionLine}
          label="Width"
          value={getStyleValue(selectedElement, 'width', 'auto')}
          units={['px', '%', 'rem', 'em', 'vh', 'vw', 'auto']}
          onChange={(value) => updateStyle('width', value)}
          min={0}
          max={9999}
        />
        <PropertyUnitInput
          icon={RulerDimensionLine}
          label="Height"
          className="transform-size-height"
          value={getStyleValue(selectedElement, 'height', 'auto')}
          units={['px', '%', 'rem', 'em', 'vh', 'vw', 'auto']}
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
          units={['px', '%', 'rem', 'em', 'vh', 'vw', 'auto']}
          onChange={(value) => updateStyle('left', value)}
          min={-9999}
          max={9999}
        />
        <PropertyUnitInput
          icon={ArrowDownFromLine}
          label="Top"
          className="transform-position-top"
          value={getStyleValue(selectedElement, 'top', 'auto')}
          units={['px', '%', 'rem', 'em', 'vh', 'vw', 'auto']}
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
