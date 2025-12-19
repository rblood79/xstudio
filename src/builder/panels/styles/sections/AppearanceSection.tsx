/**
 * AppearanceSection - Appearance 스타일 편집 섹션
 *
 * Background, Border 편집
 *
 * 🚀 Phase 20: Lazy Children Pattern + memo + styleValues 적용
 */

import { memo } from 'react';
import { PropertySection, PropertyUnitInput, PropertyColor, PropertySelect } from '../../common';
import { Button } from '../../../../shared/components';
import { iconProps } from '../../../../utils/ui/uiConstants';
import type { SelectedElement } from '../../../inspector/types';
import type { StyleValues } from '../hooks/useStyleValues';
import {
  Square,
  SquareDashed,
  SquareRoundCorner,
  SquareDashedBottom,
  EllipsisVertical,
} from 'lucide-react';
import { useStyleActions } from '../hooks/useStyleActions';

interface AppearanceSectionProps {
  selectedElement: SelectedElement;
  styleValues: StyleValues | null;
}

// 🚀 Phase 21: 커스텀 비교 함수 - 실제 사용하는 스타일 값만 비교
export const AppearanceSection = memo(function AppearanceSection({
  selectedElement,
  styleValues,
}: AppearanceSectionProps) {
  const { updateStyle, resetStyles } = useStyleActions();

  const handleReset = () => {
    resetStyles(['backgroundColor', 'borderColor', 'borderWidth', 'borderRadius', 'borderStyle']);
  };

  // 🚀 Phase 20: styleValues가 없으면 렌더링 안함
  if (!styleValues) return null;

  return (
    <PropertySection id="appearance" title="Appearance" onReset={handleReset}>
      {() => (
        <>
          <div className="style-background">
            <PropertyColor
              icon={Square}
              label="Background Color"
              className="background-color"
              value={styleValues.backgroundColor}
              onChange={(value) => updateStyle('backgroundColor', value)}
              placeholder="#FFFFFF"
            />
            <div className="fieldset-actions actions-icon">
              <Button>
                <EllipsisVertical
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.strokeWidth}
                />
              </Button>
            </div>
          </div>

          <div className="style-border">
            <PropertyColor
              icon={Square}
              label="Color"
              className="border-color"
              value={styleValues.borderColor}
              onChange={(value) => updateStyle('borderColor', value)}
              placeholder="#000000"
            />
            <PropertyUnitInput
              icon={SquareDashed}
              label="Border Width"
              className="border-width"
              value={styleValues.borderWidth}
              units={['reset', 'px']}
              onChange={(value) => updateStyle('borderWidth', value)}
              min={0}
              max={100}
            />
            <PropertyUnitInput
              icon={SquareRoundCorner}
              label="Border Radius"
              className="border-radius"
              value={styleValues.borderRadius}
              units={['reset', 'px', '%', 'rem', 'em']}
              onChange={(value) => updateStyle('borderRadius', value)}
              min={0}
              max={500}
            />
            <PropertySelect
              icon={SquareDashedBottom}
              label="Border Style"
              className="border-style"
              value={styleValues.borderStyle}
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
                  strokeWidth={iconProps.strokeWidth}
                />
              </Button>
            </div>
          </div>
        </>
      )}
    </PropertySection>
  );
}, (prevProps, nextProps) => {
  // 🚀 Phase 21: styleValues의 관련 값만 비교 (selectedElement 무시)
  const prev = prevProps.styleValues;
  const next = nextProps.styleValues;
  if (prev === next) return true;
  if (!prev || !next) return false;
  return (
    prev.backgroundColor === next.backgroundColor &&
    prev.borderColor === next.borderColor &&
    prev.borderWidth === next.borderWidth &&
    prev.borderRadius === next.borderRadius &&
    prev.borderStyle === next.borderStyle
  );
});
