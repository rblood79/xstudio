/**
 * AppearanceSection - Appearance 스타일 편집 섹션
 *
 * Background, Border 편집
 *
 * 🚀 Phase 3: Jotai 기반 Fine-grained Reactivity
 * 🚀 Phase 23: 컨텐츠 분리로 접힌 섹션 훅 실행 방지
 */

import { memo } from 'react';
import { PropertySection, PropertyUnitInput, PropertyColor, PropertySelect } from '../../../components';
import { Button } from "@xstudio/shared/components";
import { iconProps } from '../../../../utils/ui/uiConstants';
import {
  Square,
  SquareDashed,
  SquareRoundCorner,
  SquareDashedBottom,
  EllipsisVertical,
} from 'lucide-react';
import { useStyleActions } from '../hooks/useStyleActions';
import { useOptimizedStyleActions } from '../hooks/useOptimizedStyleActions';
import { useAppearanceValuesJotai } from '../hooks/useAppearanceValuesJotai';
import { useResetStyles } from '../hooks/useResetStyles';

/**
 * 🚀 Phase 3/23: 내부 컨텐츠 컴포넌트
 * - 섹션이 열릴 때만 마운트됨
 * - Jotai atom에서 직접 값 구독 (props 불필요)
 */
const AppearanceSectionContent = memo(function AppearanceSectionContent() {
  const { updateStyle } = useStyleActions();
  // 🚀 Phase 1: RAF 기반 스로틀 업데이트
  const { updateStyleImmediate, updateStyleRAF } = useOptimizedStyleActions();
  // 🚀 Phase 3: Jotai atom에서 직접 값 구독
  const styleValues = useAppearanceValuesJotai();

  if (!styleValues) return null;

  return (
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
          units={['reset', 'px']}
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
  );
});

/**
 * AppearanceSection - 외부 래퍼
 * - PropertySection만 관리
 * - 🚀 Phase 3: Jotai 기반 - props 불필요
 * - 🚀 Phase 4.2c: useResetStyles 경량 훅 사용
 */
export const AppearanceSection = memo(function AppearanceSection() {
  const resetStyles = useResetStyles();

  const handleReset = () => {
    resetStyles(['backgroundColor', 'borderColor', 'borderWidth', 'borderRadius', 'borderStyle']);
  };

  return (
    <PropertySection id="appearance" title="Appearance" onReset={handleReset}>
      <AppearanceSectionContent />
    </PropertySection>
  );
});
