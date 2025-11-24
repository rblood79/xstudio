/**
 * TypographySection - Typography 스타일 편집 섹션
 *
 * Font, Text styles 편집
 */

import { PropertySection, PropertyUnitInput, PropertyColor, PropertySelect } from '../../common';
import { ToggleButton, ToggleButtonGroup, Button } from '../../../components';
import { iconProps } from '../../../../utils/ui/uiConstants';
import type { SelectedElement } from '../../../inspector/types';
import {
  Type,
  EllipsisVertical,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  Underline,
  Strikethrough,
  RemoveFormatting,
  Italic,
  CaseSensitive,
  CaseLower,
  CaseUpper,
} from 'lucide-react';
import { useStyleActions } from '../hooks/useStyleActions';
import { getStyleValue } from '../hooks/useStyleValues';

interface TypographySectionProps {
  selectedElement: SelectedElement;
}

export function TypographySection({ selectedElement }: TypographySectionProps) {
  const { updateStyle, resetStyles } = useStyleActions();

  const handleReset = () => {
    resetStyles([
      'fontFamily',
      'fontSize',
      'fontWeight',
      'fontStyle',
      'lineHeight',
      'letterSpacing',
      'color',
      'textAlign',
      'textDecoration',
      'textTransform',
      'verticalAlign',
    ]);
  };

  return (
    <PropertySection id="typography" title="Text" onReset={handleReset}>
      <PropertySelect
        icon={Type}
        label="Font Family"
        value={getStyleValue(selectedElement, 'fontFamily', 'Arial')}
        options={[
          { value: 'reset', label: 'Reset' },
          { value: 'Arial', label: 'Arial' },
          { value: 'Helvetica', label: 'Helvetica' },
          { value: 'Times New Roman', label: 'Times New Roman' },
          { value: 'Georgia', label: 'Georgia' },
          { value: 'Courier New', label: 'Courier New' },
          { value: 'Verdana', label: 'Verdana' },
        ]}
        onChange={(value) => updateStyle('fontFamily', value)}
      />

      <PropertyColor
        icon={Type}
        label="Color"
        value={getStyleValue(selectedElement, 'color', '#000000')}
        onChange={(value) => updateStyle('color', value)}
        placeholder="#000000"
      />

      <div className="text-size">
        <PropertyUnitInput
          icon={Type}
          label="Font Size"
          value={getStyleValue(selectedElement, 'fontSize', '16px')}
          onChange={(value) => updateStyle('fontSize', value)}
          min={8}
          max={200}
        />
        <PropertyUnitInput
          icon={Type}
          label="Line Height"
          className="text-size-height"
          value={getStyleValue(selectedElement, 'lineHeight', 'normal')}
          onChange={(value) => updateStyle('lineHeight', value)}
          min={0}
          max={10}
          allowKeywords
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

      <div className="text-weight-spacing">
        <PropertySelect
          icon={Type}
          label="Font Weight"
          value={getStyleValue(selectedElement, 'fontWeight', 'normal')}
          options={[
            { value: 'reset', label: 'Reset' },
            { value: '100', label: '100 - Thin' },
            { value: '200', label: '200 - Extra Light' },
            { value: '300', label: '300 - Light' },
            { value: '400', label: '400 - Normal' },
            { value: '500', label: '500 - Medium' },
            { value: '600', label: '600 - Semi Bold' },
            { value: '700', label: '700 - Bold' },
            { value: '800', label: '800 - Extra Bold' },
            { value: '900', label: '900 - Black' },
            { value: 'normal', label: 'Normal' },
            { value: 'bold', label: 'Bold' },
          ]}
          onChange={(value) => updateStyle('fontWeight', value)}
        />
        <PropertyUnitInput
          icon={Type}
          label="Letter Spacing"
          className="text-weight-spacing-letter"
          value={getStyleValue(selectedElement, 'letterSpacing', 'normal')}
          onChange={(value) => updateStyle('letterSpacing', value)}
          min={-10}
          max={10}
          allowKeywords
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

      <div className="text-alignment">
        <fieldset className="properties-aria">
          <legend className="fieldset-legend">Text Align</legend>
          <ToggleButtonGroup
            aria-label="Text alignment"
            indicator
            selectedKeys={[getStyleValue(selectedElement, 'textAlign', 'left')]}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string;
              if (value) updateStyle('textAlign', value);
            }}
          >
            <ToggleButton id="left">
              <AlignLeft
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </ToggleButton>
            <ToggleButton id="center">
              <AlignCenter
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </ToggleButton>
            <ToggleButton id="right">
              <AlignRight
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </ToggleButton>
          </ToggleButtonGroup>
        </fieldset>

        <fieldset className="properties-aria text-alignment-vertical">
          <legend className="fieldset-legend">Vertical Align</legend>
          <ToggleButtonGroup
            aria-label="Vertical alignment"
            indicator
            selectedKeys={[getStyleValue(selectedElement, 'verticalAlign', 'baseline')]}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string;
              if (value) updateStyle('verticalAlign', value);
            }}
          >
            <ToggleButton id="top">
              <AlignVerticalJustifyStart
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </ToggleButton>
            <ToggleButton id="middle">
              <AlignVerticalJustifyCenter
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </ToggleButton>
            <ToggleButton id="bottom">
              <AlignVerticalJustifyEnd
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </ToggleButton>
          </ToggleButtonGroup>
        </fieldset>

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

      <div className="text-decoration-style">
        <fieldset className="properties-aria">
          <legend className="fieldset-legend">Text Decoration</legend>
          <ToggleButtonGroup
            aria-label="Text decoration"
            indicator
            selectedKeys={[getStyleValue(selectedElement, 'textDecoration', 'none')]}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string;
              if (value) updateStyle('textDecoration', value);
            }}
          >
            <ToggleButton id="none">
              <RemoveFormatting
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </ToggleButton>
            <ToggleButton id="underline">
              <Underline
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </ToggleButton>
            <ToggleButton id="line-through">
              <Strikethrough
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </ToggleButton>
          </ToggleButtonGroup>
        </fieldset>

        <fieldset className="properties-aria text-font-style">
          <legend className="fieldset-legend">Font Style</legend>
          <ToggleButtonGroup
            aria-label="Font style"
            indicator
            selectedKeys={[getStyleValue(selectedElement, 'fontStyle', 'normal')]}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string;
              if (value) updateStyle('fontStyle', value);
            }}
          >
            <ToggleButton id="normal">
              <RemoveFormatting
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </ToggleButton>
            <ToggleButton id="italic">
              <Italic
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </ToggleButton>
            <ToggleButton id="oblique">
              <Type
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
                style={{ fontStyle: 'oblique', transform: 'skewX(-10deg)' }}
              />
            </ToggleButton>
          </ToggleButtonGroup>
        </fieldset>

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

      <fieldset className="properties-aria">
        <legend className="fieldset-legend">Text Transform</legend>
        <ToggleButtonGroup
          aria-label="Text transform"
          indicator
          selectedKeys={[getStyleValue(selectedElement, 'textTransform', 'none')]}
          onSelectionChange={(keys) => {
            const value = Array.from(keys)[0] as string;
            if (value) updateStyle('textTransform', value);
          }}
        >
          <ToggleButton id="none">
            <RemoveFormatting
              color={iconProps.color}
              size={iconProps.size}
              strokeWidth={iconProps.stroke}
            />
          </ToggleButton>
          <ToggleButton id="uppercase">
            <CaseUpper
              color={iconProps.color}
              size={iconProps.size}
              strokeWidth={iconProps.stroke}
            />
          </ToggleButton>
          <ToggleButton id="lowercase">
            <CaseLower
              color={iconProps.color}
              size={iconProps.size}
              strokeWidth={iconProps.stroke}
            />
          </ToggleButton>
          <ToggleButton id="capitalize">
            <CaseSensitive
              color={iconProps.color}
              size={iconProps.size}
              strokeWidth={iconProps.stroke}
            />
          </ToggleButton>
        </ToggleButtonGroup>
      </fieldset>
    </PropertySection>
  );
}
