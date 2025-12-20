/**
 * TypographySection - Typography 스타일 편집 섹션
 *
 * Font, Text styles 편집
 *
 * 🚀 Phase 22: useTypographyValues 훅으로 성능 최적화
 * - 11개 속성만 의존성으로 사용 (61% 성능 개선)
 */

import { memo } from 'react';
import { PropertySection, PropertyUnitInput, PropertyColor, PropertySelect } from '../../common';
import { ToggleButton, ToggleButtonGroup, Button } from '../../../../shared/components';
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
  Baseline,
} from 'lucide-react';
import { useStyleActions } from '../hooks/useStyleActions';
import { useOptimizedStyleActions } from '../hooks/useOptimizedStyleActions';
import { useTypographyValues } from '../hooks/useTypographyValues';

interface TypographySectionProps {
  selectedElement: SelectedElement;
}

// 🚀 Phase 22: 내부 훅이 최적화를 담당하므로 간단한 memo만 사용
export const TypographySection = memo(function TypographySection({
  selectedElement,
}: TypographySectionProps) {
  const { updateStyle, resetStyles } = useStyleActions();
  // 🚀 Phase 1: RAF 기반 스로틀 업데이트
  const { updateStyleImmediate, updateStyleRAF } = useOptimizedStyleActions();
  // 🚀 Phase 22: 섹션 전용 훅 사용
  const styleValues = useTypographyValues(selectedElement);

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

  if (!styleValues) return null;

  return (
    <PropertySection id="typography" title="Typography" onReset={handleReset}>
      {() => (
        <>
          <PropertySelect
            icon={Type}
            label="Font Family"
            className="font-family"
            value={styleValues.fontFamily}
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
            className="color"
            value={styleValues.color}
            onChange={(value) => updateStyle('color', value)}
            placeholder="#000000"
          />

          <div className="fieldset-actions actions-font">
            <Button>
              <EllipsisVertical
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.strokeWidth}
              />
            </Button>
          </div>

          <PropertyUnitInput
            icon={Type}
            label="Font Size"
            className="font-size"
            value={styleValues.fontSize}
            units={['reset', 'px', 'rem', 'em', 'pt']}
            onChange={(value) => updateStyleImmediate('fontSize', value)}
            onDrag={(value) => updateStyleRAF('fontSize', value)}
            min={8}
            max={200}
          />
          <PropertyUnitInput
            icon={Type}
            label="Line Height"
            className="line-height"
            value={styleValues.lineHeight}
            units={['reset', 'px', 'rem', 'em', '']}
            onChange={(value) => updateStyleImmediate('lineHeight', value)}
            onDrag={(value) => updateStyleRAF('lineHeight', value)}
            min={0}
            max={10}
            allowKeywords
          />

          <PropertySelect
            icon={Type}
            label="Font Weight"
            className="font-weight"
            value={styleValues.fontWeight}
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
            className="letter-spacing"
            value={styleValues.letterSpacing}
            units={['reset', 'px', 'rem', 'em']}
            onChange={(value) => updateStyleImmediate('letterSpacing', value)}
            onDrag={(value) => updateStyleRAF('letterSpacing', value)}
            min={-10}
            max={10}
            allowKeywords
          />
          <div className="fieldset-actions">
            <Button>
              <EllipsisVertical
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.strokeWidth}
              />
            </Button>
          </div>

          <fieldset className="properties-aria text-align">
            <legend className="fieldset-legend">Text Align</legend>
            <ToggleButtonGroup
              aria-label="Text alignment"
              indicator
              selectedKeys={[styleValues.textAlign]}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string;
                if (value) updateStyle('textAlign', value);
              }}
            >
              <ToggleButton id="left">
                <AlignLeft
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.strokeWidth}
                />
              </ToggleButton>
              <ToggleButton id="center">
                <AlignCenter
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.strokeWidth}
                />
              </ToggleButton>
              <ToggleButton id="right">
                <AlignRight
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.strokeWidth}
                />
              </ToggleButton>
            </ToggleButtonGroup>
          </fieldset>

          <fieldset className="properties-aria vertical-align">
            <legend className="fieldset-legend">Vertical Align</legend>
            <ToggleButtonGroup
              aria-label="Vertical alignment"
              indicator
              selectedKeys={[styleValues.verticalAlign]}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string;
                if (value) updateStyle('verticalAlign', value);
              }}
            >
              <ToggleButton id="top">
                <AlignVerticalJustifyStart
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.strokeWidth}
                />
              </ToggleButton>
              <ToggleButton id="middle">
                <AlignVerticalJustifyCenter
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.strokeWidth}
                />
              </ToggleButton>
              <ToggleButton id="bottom">
                <AlignVerticalJustifyEnd
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.strokeWidth}
                />
              </ToggleButton>
            </ToggleButtonGroup>
          </fieldset>

          <div className="fieldset-actions">
            <Button>
              <EllipsisVertical
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.strokeWidth}
              />
            </Button>
          </div>

          <fieldset className="properties-aria text-decoration">
            <legend className="fieldset-legend">Text Decoration</legend>
            <ToggleButtonGroup
              aria-label="Text decoration"
              indicator
              selectedKeys={
                styleValues.textDecoration === 'none'
                  ? []
                  : [styleValues.textDecoration]
              }
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string;
                // 선택 해제 시 'none'으로 초기화
                updateStyle('textDecoration', value || 'none');
              }}
            >
              <ToggleButton id="overline">
                <Baseline
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.strokeWidth}
                  style={{ transform: 'rotate(180deg)' }}
                />
              </ToggleButton>
              <ToggleButton id="underline">
                <Underline
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.strokeWidth}
                />
              </ToggleButton>
              <ToggleButton id="line-through">
                <Strikethrough
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.strokeWidth}
                />
              </ToggleButton>
            </ToggleButtonGroup>
          </fieldset>

          <fieldset className="properties-aria font-style">
            <legend className="fieldset-legend">Font Style</legend>
            <ToggleButtonGroup
              aria-label="Font style"
              indicator
              selectedKeys={[styleValues.fontStyle]}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string;
                if (value) updateStyle('fontStyle', value);
              }}
            >
              <ToggleButton id="normal">
                <RemoveFormatting
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.strokeWidth}
                />
              </ToggleButton>
              <ToggleButton id="italic">
                <Italic
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.strokeWidth}
                />
              </ToggleButton>
              <ToggleButton id="oblique">
                <Type
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.strokeWidth}
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
                strokeWidth={iconProps.strokeWidth}
              />
            </Button>
          </div>

          <fieldset className="properties-aria text-transform">
            <legend className="fieldset-legend">Text Transform</legend>
            <ToggleButtonGroup
              aria-label="Text transform"
              indicator
              selectedKeys={
                styleValues.textTransform === 'none'
                  ? []
                  : [styleValues.textTransform]
              }
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string;
                // 선택 해제 시 'none'으로 초기화
                updateStyle('textTransform', value || 'none');
              }}
            >
              <ToggleButton id="uppercase">
                <CaseUpper
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.strokeWidth}
                />
              </ToggleButton>
              <ToggleButton id="lowercase">
                <CaseLower
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.strokeWidth}
                />
              </ToggleButton>
              <ToggleButton id="capitalize">
                <CaseSensitive
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.strokeWidth}
                />
              </ToggleButton>
            </ToggleButtonGroup>
          </fieldset>
        </>
      )}
    </PropertySection>
  );
});
