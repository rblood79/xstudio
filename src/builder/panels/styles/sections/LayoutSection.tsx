/**
 * LayoutSection - Layout 스타일 편집 섹션
 *
 * Flex direction, Alignment, Gap, Padding, Margin 편집
 */

import { PropertySection, PropertyUnitInput } from '../../common';
import { ToggleButton, ToggleButtonGroup, Button } from '../../../components';
import { iconProps } from '../../../../utils/ui/uiConstants';
import type { SelectedElement } from '../../../inspector/types';
import {
  Square,
  EllipsisVertical,
  Frame,
  LayoutGrid,
  SquareSquare,
  StretchHorizontal,
  StretchVertical,
  AlignHorizontalSpaceAround,
  GalleryHorizontal,
} from 'lucide-react';
import { useStyleActions } from '../hooks/useStyleActions';
import {
  getStyleValue,
  getFlexDirectionKeys,
  getFlexAlignmentKeys,
  getJustifyContentSpacingKeys,
} from '../hooks/useStyleValues';

interface LayoutSectionProps {
  selectedElement: SelectedElement;
}

export function LayoutSection({ selectedElement }: LayoutSectionProps) {
  const {
    updateStyle,
    handleFlexDirection,
    handleFlexAlignment,
    handleJustifyContentSpacing,
  } = useStyleActions();

  return (
    <PropertySection title="Layout">
      <fieldset className="layout-direction">
        <div className="direction-controls">
          <ToggleButtonGroup
            aria-label="Flex direction"
            indicator
            selectedKeys={getFlexDirectionKeys(selectedElement)}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string;
              handleFlexDirection(value);
            }}
          >
            <ToggleButton id="reset">
              <Square
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </ToggleButton>
            <ToggleButton id="row">
              <StretchVertical
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </ToggleButton>
            <ToggleButton id="column">
              <StretchHorizontal
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </ToggleButton>
          </ToggleButtonGroup>
        </div>
        <div className="direction-alignment-grid">
          <ToggleButtonGroup
            aria-label="Flex alignment"
            indicator
            selectionMode="single"
            selectedKeys={getFlexAlignmentKeys(selectedElement)}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string;
              if (value) {
                const currentFlexDirection = getStyleValue(
                  selectedElement,
                  'flexDirection',
                  'row'
                );
                handleFlexAlignment(value, currentFlexDirection);
              }
            }}
          >
            <ToggleButton id="leftTop">
              <span className="alignment-dot" />
            </ToggleButton>
            <ToggleButton id="centerTop">
              <span className="alignment-dot" />
            </ToggleButton>
            <ToggleButton id="rightTop">
              <span className="alignment-dot" />
            </ToggleButton>
            <ToggleButton id="leftCenter">
              <span className="alignment-dot" />
            </ToggleButton>
            <ToggleButton id="centerCenter">
              <span className="alignment-dot" />
            </ToggleButton>
            <ToggleButton id="rightCenter">
              <span className="alignment-dot" />
            </ToggleButton>
            <ToggleButton id="leftBottom">
              <span className="alignment-dot" />
            </ToggleButton>
            <ToggleButton id="centerBottom">
              <span className="alignment-dot" />
            </ToggleButton>
            <ToggleButton id="rightBottom">
              <span className="alignment-dot" />
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
        <div className="justify-control">
          <ToggleButtonGroup
            aria-label="Justify content alignment"
            indicator
            selectionMode="single"
            selectedKeys={getJustifyContentSpacingKeys(selectedElement)}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string;
              if (value) {
                handleJustifyContentSpacing(value);
              }
            }}
          >
            <ToggleButton id="space-around">
              <AlignHorizontalSpaceAround
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </ToggleButton>
            <ToggleButton id="space-between">
              <GalleryHorizontal
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </ToggleButton>
            <ToggleButton id="space-evenly">
              <AlignHorizontalSpaceAround
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </ToggleButton>
          </ToggleButtonGroup>
        </div>
        <PropertyUnitInput
          icon={LayoutGrid}
          className="gap-control"
          value={getStyleValue(selectedElement, 'gap', '0px')}
          units={['auto', 'px', 'rem', 'em']}
          onChange={(value) => updateStyle('gap', value)}
          min={0}
          max={500}
        />
      </fieldset>

      <div className="layout-container">
        <PropertyUnitInput
          icon={SquareSquare}
          label="Padding"
          className="layout-padding"
          value={getStyleValue(selectedElement, 'padding', '0px')}
          units={['auto', 'px', 'rem', 'em']}
          onChange={(value) => updateStyle('padding', value)}
          min={0}
          max={500}
        />
        <PropertyUnitInput
          icon={Frame}
          label="Margin"
          className="layout-margin"
          value={getStyleValue(selectedElement, 'margin', '0px')}
          units={['px', 'rem', 'em', 'auto']}
          onChange={(value) => updateStyle('margin', value)}
          min={0}
          max={500}
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
