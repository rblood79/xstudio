/**
 * TransformSection - Transform 스타일 편집 섹션
 *
 * Size, Position 편집
 * Note: Alignment는 Layout 섹션의 3x3 Flex alignment로 통합됨
 *
 * 🚀 Phase 22: useTransformValues 훅으로 성능 최적화
 * - 4개 속성만 의존성으로 사용 (86% 성능 개선)
 *
 * 🚀 Phase 23: 컨텐츠 분리로 접힌 섹션 훅 실행 방지
 * - TransformSectionContent를 별도 컴포넌트로 분리
 * - 섹션이 열릴 때만 훅 실행
 */

import { memo } from 'react';
import { PropertySection, PropertyUnitInput } from '../../common';
import { Button } from '../../../../shared/components';
import { iconProps } from '../../../../utils/ui/uiConstants';
import type { SelectedElement } from '../../../inspector/types';
import {
  EllipsisVertical,
  RulerDimensionLine,
  ArrowRightFromLine,
  ArrowDownFromLine,
} from 'lucide-react';
import { useStyleActions } from '../hooks/useStyleActions';
import { useOptimizedStyleActions } from '../hooks/useOptimizedStyleActions';
import { useTransformValues } from '../hooks/useTransformValues';

interface TransformSectionProps {
  selectedElement: SelectedElement;
}

/**
 * 🚀 Phase 23: 내부 컨텐츠 컴포넌트
 * - 섹션이 열릴 때만 마운트됨
 * - 훅은 여기서만 실행 (접힌 상태에서 실행 방지)
 */
const TransformSectionContent = memo(function TransformSectionContent({
  selectedElement,
}: TransformSectionProps) {
  // 🚀 Phase 1: RAF 기반 스로틀 업데이트
  const { updateStyleImmediate, updateStyleRAF } = useOptimizedStyleActions();
  // 🚀 Phase 22: 섹션 전용 훅 사용
  const styleValues = useTransformValues(selectedElement);

  if (!styleValues) return null;

  return (
    <>
      <PropertyUnitInput
        icon={RulerDimensionLine}
        label="Width"
        className="width"
        value={styleValues.width}
        units={['reset', 'px', '%', 'rem', 'em', 'vh', 'vw']}
        onChange={(value) => updateStyleImmediate('width', value)}
        onDrag={(value) => updateStyleRAF('width', value)}
        min={0}
        max={9999}
      />
      <PropertyUnitInput
        icon={RulerDimensionLine}
        label="Height"
        className="height"
        value={styleValues.height}
        units={['reset', 'px', '%', 'rem', 'em', 'vh', 'vw']}
        onChange={(value) => updateStyleImmediate('height', value)}
        onDrag={(value) => updateStyleRAF('height', value)}
        min={0}
        max={9999}
      />
      <div className="fieldset-actions actions-size">
        <Button>
          <EllipsisVertical
            color={iconProps.color}
            size={iconProps.size}
            strokeWidth={iconProps.strokeWidth}
          />
        </Button>
      </div>

      <PropertyUnitInput
        icon={ArrowRightFromLine}
        label="Left"
        className="left"
        value={styleValues.left}
        units={['reset', 'px', '%', 'rem', 'em', 'vh', 'vw']}
        onChange={(value) => updateStyleImmediate('left', value)}
        onDrag={(value) => updateStyleRAF('left', value)}
        min={-9999}
        max={9999}
      />
      <PropertyUnitInput
        icon={ArrowDownFromLine}
        label="Top"
        className="top"
        value={styleValues.top}
        units={['reset', 'px', '%', 'rem', 'em', 'vh', 'vw']}
        onChange={(value) => updateStyleImmediate('top', value)}
        onDrag={(value) => updateStyleRAF('top', value)}
        min={-9999}
        max={9999}
      />
      <div className="fieldset-actions actions-position">
        <Button>
          <EllipsisVertical
            color={iconProps.color}
            size={iconProps.size}
            strokeWidth={iconProps.strokeWidth}
          />
        </Button>
      </div>
    </>
  );
});

/**
 * TransformSection - 외부 래퍼
 * - PropertySection만 관리
 * - 무거운 훅은 내부 컴포넌트로 위임
 */
export const TransformSection = memo(function TransformSection({
  selectedElement,
}: TransformSectionProps) {
  const { resetStyles } = useStyleActions();

  const handleReset = () => {
    resetStyles(['width', 'height', 'top', 'left']);
  };

  return (
    <PropertySection id="transform" title="Transform" onReset={handleReset}>
      <TransformSectionContent selectedElement={selectedElement} />
    </PropertySection>
  );
});
