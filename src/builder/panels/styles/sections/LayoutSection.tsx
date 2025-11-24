/**
 * LayoutSection - Layout 스타일 편집 섹션
 *
 * Flex direction, Alignment, Gap, Padding, Margin 편집
 * Figma 스타일 확장형: 기본은 단일 입력, 확장 시 4방향 개별 입력
 */

import { useState, useMemo } from 'react';
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
  ChevronDown,
  ChevronUp,
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
 * 4방향 값이 모두 같은지 확인하고, Mixed 여부와 첫 번째 값 반환
 */
function get4DirectionValues(
  element: SelectedElement,
  prefix: 'padding' | 'margin'
): {
  top: string;
  right: string;
  bottom: string;
  left: string;
  isMixed: boolean;
  displayValue: string;
} {
  const top = getStyleValue(element, `${prefix}Top` as keyof React.CSSProperties, '0px');
  const right = getStyleValue(element, `${prefix}Right` as keyof React.CSSProperties, '0px');
  const bottom = getStyleValue(element, `${prefix}Bottom` as keyof React.CSSProperties, '0px');
  const left = getStyleValue(element, `${prefix}Left` as keyof React.CSSProperties, '0px');

  // 모든 값이 같은지 확인
  const isMixed = !(top === right && right === bottom && bottom === left);

  // 표시할 값: Mixed면 shorthand에서 첫 번째 값, 아니면 공통 값
  const shorthand = getStyleValue(element, prefix as keyof React.CSSProperties, '0px');
  const displayValue = isMixed ? shorthand : top;

  return { top, right, bottom, left, isMixed, displayValue };
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

  // 4방향 값 계산 (메모이제이션)
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

  // 4방향 동시 업데이트 (단일 값 입력 시)
  const updateSpacingAll = (prefix: 'padding' | 'margin', value: string) => {
    if (value === '') {
      // reset: 모든 방향 제거
      updateStyle(`${prefix}Top`, '');
      updateStyle(`${prefix}Right`, '');
      updateStyle(`${prefix}Bottom`, '');
      updateStyle(`${prefix}Left`, '');
      updateStyle(prefix, '');
    } else {
      // 단일 값: shorthand로 설정
      updateStyle(prefix, value);
    }
  };

  return (
    <PropertySection id="layout" title="Layout" onReset={handleReset}>
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
          units={['reset', 'px', 'rem', 'em']}
          onChange={(value) => updateStyle('gap', value)}
          min={0}
          max={500}
        />
      </fieldset>

      {/* Spacing Section: Padding & Margin */}
      <div className={`layout-spacing ${isSpacingExpanded ? 'expanded' : ''}`}>
        <div className="spacing-header">
          <span className="spacing-title">Spacing</span>
          <Button
            onPress={() => setIsSpacingExpanded(!isSpacingExpanded)}
            aria-label={isSpacingExpanded ? 'Collapse spacing' : 'Expand spacing'}
            aria-expanded={isSpacingExpanded}
          >
            {isSpacingExpanded ? (
              <ChevronUp
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            ) : (
              <ChevronDown
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            )}
          </Button>
        </div>

        {!isSpacingExpanded ? (
          /* 축소 모드: 단일 입력 */
          <div className="layout-container">
            <PropertyUnitInput
              icon={SquareSquare}
              label={paddingValues.isMixed ? 'Padding (Mixed)' : 'Padding'}
              className="layout-padding"
              value={paddingValues.displayValue}
              units={['reset', 'px', 'rem', 'em']}
              onChange={(value) => updateSpacingAll('padding', value)}
              min={0}
              max={500}
            />
            <PropertyUnitInput
              icon={Frame}
              label={marginValues.isMixed ? 'Margin (Mixed)' : 'Margin'}
              className="layout-margin"
              value={marginValues.displayValue}
              units={['reset', 'px', 'rem', 'em']}
              onChange={(value) => updateSpacingAll('margin', value)}
              min={0}
              max={500}
            />
          </div>
        ) : (
          /* 확장 모드: 4방향 개별 입력 */
          <div className="spacing-expanded">
            {/* Padding 4-way */}
            <fieldset className="spacing-4way">
              <legend>
                <SquareSquare
                  color={iconProps.color}
                  size={14}
                  strokeWidth={iconProps.stroke}
                />
                Padding
              </legend>
              <div className="spacing-4way-grid">
                <PropertyUnitInput
                  label="T"
                  className="spacing-top"
                  value={paddingValues.top}
                  units={['reset', 'px', 'rem', 'em']}
                  onChange={(value) => updateStyle('paddingTop', value)}
                  min={0}
                  max={500}
                />
                <PropertyUnitInput
                  label="R"
                  className="spacing-right"
                  value={paddingValues.right}
                  units={['reset', 'px', 'rem', 'em']}
                  onChange={(value) => updateStyle('paddingRight', value)}
                  min={0}
                  max={500}
                />
                <PropertyUnitInput
                  label="B"
                  className="spacing-bottom"
                  value={paddingValues.bottom}
                  units={['reset', 'px', 'rem', 'em']}
                  onChange={(value) => updateStyle('paddingBottom', value)}
                  min={0}
                  max={500}
                />
                <PropertyUnitInput
                  label="L"
                  className="spacing-left"
                  value={paddingValues.left}
                  units={['reset', 'px', 'rem', 'em']}
                  onChange={(value) => updateStyle('paddingLeft', value)}
                  min={0}
                  max={500}
                />
              </div>
            </fieldset>

            {/* Margin 4-way */}
            <fieldset className="spacing-4way">
              <legend>
                <Frame
                  color={iconProps.color}
                  size={14}
                  strokeWidth={iconProps.stroke}
                />
                Margin
              </legend>
              <div className="spacing-4way-grid">
                <PropertyUnitInput
                  label="T"
                  className="spacing-top"
                  value={marginValues.top}
                  units={['reset', 'px', 'rem', 'em']}
                  onChange={(value) => updateStyle('marginTop', value)}
                  min={-500}
                  max={500}
                />
                <PropertyUnitInput
                  label="R"
                  className="spacing-right"
                  value={marginValues.right}
                  units={['reset', 'px', 'rem', 'em']}
                  onChange={(value) => updateStyle('marginRight', value)}
                  min={-500}
                  max={500}
                />
                <PropertyUnitInput
                  label="B"
                  className="spacing-bottom"
                  value={marginValues.bottom}
                  units={['reset', 'px', 'rem', 'em']}
                  onChange={(value) => updateStyle('marginBottom', value)}
                  min={-500}
                  max={500}
                />
                <PropertyUnitInput
                  label="L"
                  className="spacing-left"
                  value={marginValues.left}
                  units={['reset', 'px', 'rem', 'em']}
                  onChange={(value) => updateStyle('marginLeft', value)}
                  min={-500}
                  max={500}
                />
              </div>
            </fieldset>
          </div>
        )}
      </div>
    </PropertySection>
  );
}
