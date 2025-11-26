/**
 * LayoutSection - Layout 스타일 편집 섹션
 *
 * Flex direction, Alignment, Gap, Padding, Margin 편집
 * 4방향 확장 모드: direction-alignment-grid 스타일 패턴 사용
 */

import { useState, useMemo } from 'react';
import { PropertySection, PropertyUnitInput } from '../../common';
import { ToggleButton, ToggleButtonGroup, Button } from '../../../components';
import { Input } from 'react-aria-components';
import { iconProps } from '../../../../utils/ui/uiConstants';
import type { SelectedElement } from '../../../inspector/types';
import {
  Square,
  Maximize2,
  Minimize2,
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

/**
 * 4방향 값 추출 (padding/margin)
 */
function get4DirectionValues(
  element: SelectedElement,
  prefix: 'padding' | 'margin'
): { top: string; right: string; bottom: string; left: string } {
  return {
    top: getStyleValue(element, `${prefix}Top` as keyof React.CSSProperties, ''),
    right: getStyleValue(element, `${prefix}Right` as keyof React.CSSProperties, ''),
    bottom: getStyleValue(element, `${prefix}Bottom` as keyof React.CSSProperties, ''),
    left: getStyleValue(element, `${prefix}Left` as keyof React.CSSProperties, ''),
  };
}

/**
 * 4방향 입력 그리드 컴포넌트
 * direction-alignment-grid 스타일 패턴 사용
 */
interface FourWayGridProps {
  values: { top: string; right: string; bottom: string; left: string };
  onChange: (direction: 'Top' | 'Right' | 'Bottom' | 'Left', value: string) => void;
  allowNegative?: boolean;
}

function FourWayGrid({ values, onChange }: FourWayGridProps) {
  const handleChange = (direction: 'Top' | 'Right' | 'Bottom' | 'Left', inputValue: string) => {
    // 숫자만 추출하고 px 단위 추가
    const numericValue = inputValue.replace(/[^0-9.-]/g, '');
    if (numericValue === '' || numericValue === '-') {
      onChange(direction, '');
    } else {
      onChange(direction, `${numericValue}px`);
    }
  };

  const getDisplayValue = (value: string) => {
    // px 제거하고 숫자만 표시
    return value.replace('px', '');
  };

  return (
    <div className="four-way-grid">
      <Input
        className="react-aria-Input four-way-top"
        value={getDisplayValue(values.top)}
        onChange={(e) => handleChange('Top', e.target.value)}
        placeholder="T"
        aria-label="Top"
      />
      <Input
        className="react-aria-Input four-way-left"
        value={getDisplayValue(values.left)}
        onChange={(e) => handleChange('Left', e.target.value)}
        placeholder="L"
        aria-label="Left"
      />
      <Input
        className="react-aria-Input four-way-right"
        value={getDisplayValue(values.right)}
        onChange={(e) => handleChange('Right', e.target.value)}
        placeholder="R"
        aria-label="Right"
      />
      <Input
        className="react-aria-Input four-way-bottom"
        value={getDisplayValue(values.bottom)}
        onChange={(e) => handleChange('Bottom', e.target.value)}
        placeholder="B"
        aria-label="Bottom"
      />
    </div>
  );
}

export function LayoutSection({ selectedElement }: LayoutSectionProps) {
  const [isSpacingExpanded, setIsSpacingExpanded] = useState(false);

  const {
    updateStyle,
    resetStyles,
    handleFlexDirection,
    handleFlexAlignment,
    handleJustifyContentSpacing,
  } = useStyleActions();

  // 4방향 값 계산
  const paddingValues = useMemo(
    () => get4DirectionValues(selectedElement, 'padding'),
    [selectedElement]
  );
  const marginValues = useMemo(
    () => get4DirectionValues(selectedElement, 'margin'),
    [selectedElement]
  );

  const handleReset = () => {
    resetStyles([
      'display', 'flexDirection', 'alignItems', 'justifyContent', 'gap',
      'padding', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
      'margin', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    ]);
  };

  const handlePaddingChange = (direction: 'Top' | 'Right' | 'Bottom' | 'Left', value: string) => {
    updateStyle(`padding${direction}` as keyof React.CSSProperties, value);
  };

  const handleMarginChange = (direction: 'Top' | 'Right' | 'Bottom' | 'Left', value: string) => {
    updateStyle(`margin${direction}` as keyof React.CSSProperties, value);
  };

  return (
    <PropertySection id="layout" title="Layout" onReset={handleReset}>
      <div className="layout-direction">
        <div className="direction-controls flex-direction">
          <legend className="fieldset-legend">Direction</legend>
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
        <div className="direction-alignment-grid flex-alignment">
          <legend className="fieldset-legend">Alignment</legend>
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
            <LayoutGrid
              color={iconProps.color}
              size={iconProps.size}
              strokeWidth={iconProps.stroke}
            />
          </Button>
        </div>
        <div className="justify-control justify-content">
          <legend className="fieldset-legend">Justify</legend>
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
          label="Gap"
          className="displayGap"
          value={getStyleValue(selectedElement, 'gap', '0px')}
          units={['reset', 'px', 'rem', 'em']}
          onChange={(value) => updateStyle('gap', value)}
          min={0}
          max={500}
        />
      </div>

      {/* Spacing Section: Padding & Margin */}
      {!isSpacingExpanded ? (
        /* 축소 모드: 단일 입력 */
        <div className="layout-container">
          <PropertyUnitInput
            icon={SquareSquare}
            label="Padding"
            className="padding"
            value={getStyleValue(selectedElement, 'padding', '0px')}
            units={['reset', 'px', 'rem', 'em']}
            onChange={(value) => updateStyle('padding', value)}
            min={0}
            max={500}
          />
          <PropertyUnitInput
            icon={Frame}
            label="Margin"
            className="margin"
            value={getStyleValue(selectedElement, 'margin', '0px')}
            units={['reset', 'px', 'rem', 'em']}
            onChange={(value) => updateStyle('margin', value)}
            min={0}
            max={500}
          />
          <div className="fieldset-actions">
            <Button
              onPress={() => setIsSpacingExpanded(true)}
              aria-label="Expand spacing to 4-way input"
            >
              <Maximize2
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </Button>
          </div>
        </div>
      ) : (
        /* 확장 모드: 4방향 그리드 입력 */
        <div className="layout-container">
          <fieldset className="properties-aria property-unit-input layout-padding">
            <legend className="fieldset-legend">Padding</legend>
            <div className="react-aria-Group layout-spacing">
              <FourWayGrid
                values={paddingValues}
                onChange={handlePaddingChange}
              />
            </div>
          </fieldset>
          <fieldset className="properties-aria property-unit-input layout-margin">
            <legend className="fieldset-legend">Margin</legend>
            <div className="react-aria-Group layout-spacing">
              <FourWayGrid
                values={marginValues}
                onChange={handleMarginChange}
                allowNegative
              />
            </div>
          </fieldset>
          <div className="fieldset-actions">
            <Button
              onPress={() => setIsSpacingExpanded(false)}
              aria-label="Collapse spacing to single input"
            >
              <Minimize2
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </Button>
          </div>
        </div>
      )}
    </PropertySection>
  );
}
