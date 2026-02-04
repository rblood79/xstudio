/**
 * TypographySection - Typography 스타일 편집 섹션
 *
 * Font, Text styles 편집
 *
 * 🚀 Phase 3: Jotai 기반 Fine-grained Reactivity
 * 🚀 Phase 23: 컨텐츠 분리로 접힌 섹션 훅 실행 방지
 */

import { memo } from 'react';
import { PropertySection, PropertyUnitInput, PropertyColor, PropertySelect } from '../../../components';
import { ToggleButton, ToggleButtonGroup, Button } from "@xstudio/shared/components";
import { iconProps } from '../../../../utils/ui/uiConstants';
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
import { useTypographyValuesJotai } from '../hooks/useTypographyValuesJotai';
import { useResetStyles } from '../hooks/useResetStyles';

/**
 * 🚀 Phase 3/23: 내부 컨텐츠 컴포넌트
 * - 섹션이 열릴 때만 마운트됨
 * - Jotai atom에서 직접 값 구독 (props 불필요)
 */
const TypographySectionContent = memo(function TypographySectionContent() {
  const { updateStyle } = useStyleActions();
  // 🚀 Phase 1: RAF 기반 스로틀 업데이트
  const { updateStyleImmediate, updateStylePreview } = useOptimizedStyleActions();
  // 🚀 Phase 3: Jotai atom에서 직접 값 구독
  const styleValues = useTypographyValuesJotai();

  if (!styleValues) return null;

  return (
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
        units={['reset', 'px', 'pt']}
        onChange={(value) => updateStyleImmediate('fontSize', value)}
        onDrag={(value) => updateStylePreview('fontSize', value)}
        min={8}
        max={200}
      />
      <PropertyUnitInput
        icon={Type}
        label="Line Height"
        className="line-height"
        value={styleValues.lineHeight}
        units={['reset', 'px']}
        onChange={(value) => updateStyleImmediate('lineHeight', value)}
        onDrag={(value) => updateStylePreview('lineHeight', value)}
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
        units={['reset', 'px']}
        onChange={(value) => updateStyleImmediate('letterSpacing', value)}
        onDrag={(value) => updateStylePreview('letterSpacing', value)}
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
  );
});

/**
 * TypographySection - 외부 래퍼
 * - PropertySection만 관리
 * - 🚀 Phase 3: Jotai 기반 - props 불필요
 * - 🚀 Phase 4.2c: useResetStyles 경량 훅 사용
 */
export const TypographySection = memo(function TypographySection() {
  const resetStyles = useResetStyles();

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
    <PropertySection id="typography" title="Typography" onReset={handleReset}>
      <TypographySectionContent />
    </PropertySection>
  );
});
