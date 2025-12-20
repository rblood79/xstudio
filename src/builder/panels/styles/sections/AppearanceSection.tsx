/**
 * AppearanceSection - Appearance 스타일 편집 섹션
 *
 * Background, Border 편집
 *
 * 🚀 Phase 22: useAppearanceValues 훅으로 성능 최적화
 * - 5개 속성만 의존성으로 사용 (82% 성능 개선)
 */

import { memo } from 'react';
import { PropertySection, PropertyUnitInput, PropertyColor, PropertySelect } from '../../common';
import { Button } from '../../../../shared/components';
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
import { useOptimizedStyleActions } from '../hooks/useOptimizedStyleActions';
import { useAppearanceValues } from '../hooks/useAppearanceValues';

interface AppearanceSectionProps {
  selectedElement: SelectedElement;
}

// 🚀 Phase 22: 내부 훅이 최적화를 담당하므로 간단한 memo만 사용
export const AppearanceSection = memo(function AppearanceSection({
  selectedElement,
}: AppearanceSectionProps) {
  const { updateStyle, resetStyles } = useStyleActions();
  // 🚀 Phase 1: RAF 기반 스로틀 업데이트
  const { updateStyleImmediate, updateStyleRAF } = useOptimizedStyleActions();
  // 🚀 Phase 22: 섹션 전용 훅 사용
  const styleValues = useAppearanceValues(selectedElement);

  const handleReset = () => {
    resetStyles(['backgroundColor', 'borderColor', 'borderWidth', 'borderRadius', 'borderStyle']);
  };

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
              onChange={(value) => updateStyleImmediate('borderWidth', value)}
              onDrag={(value) => updateStyleRAF('borderWidth', value)}
              min={0}
              max={100}
            />
            <PropertyUnitInput
              icon={SquareRoundCorner}
              label="Border Radius"
              className="border-radius"
              value={styleValues.borderRadius}
              units={['reset', 'px', '%', 'rem', 'em']}
              onChange={(value) => updateStyleImmediate('borderRadius', value)}
              onDrag={(value) => updateStyleRAF('borderRadius', value)}
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
});
