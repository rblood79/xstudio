/**
 * TransformSection - Transform 스타일 편집 섹션
 *
 * Size, Position 편집
 * Note: Alignment는 Layout 섹션의 3x3 Flex alignment로 통합됨
 *
 * 🚀 Phase 3: Jotai 기반 Fine-grained Reactivity
 * - useTransformValuesJotai로 atom에서 직접 값 구독
 * - selectedElement props 불필요 (atom에서 읽음)
 *
 * 🚀 Phase 23: 컨텐츠 분리로 접힌 섹션 훅 실행 방지
 * - TransformSectionContent를 별도 컴포넌트로 분리
 * - 섹션이 열릴 때만 훅 실행
 */

import { memo } from 'react';
import { PropertySection, PropertyUnitInput } from '../../../components';
import { Button } from "@xstudio/shared/components";
import { iconProps } from '../../../../utils/ui/uiConstants';
import {
  EllipsisVertical,
  RulerDimensionLine,
  ArrowRightFromLine,
  ArrowDownFromLine,
} from 'lucide-react';
import { useOptimizedStyleActions } from '../hooks/useOptimizedStyleActions';
import { useTransformValuesJotai } from '../hooks/useTransformValuesJotai';
import { useResetStyles } from '../hooks/useResetStyles';
import { useCanvasSyncStore } from '../../../workspace/canvas/canvasSync';

/**
 * 🚀 Phase 3/23: 내부 컨텐츠 컴포넌트
 * - 섹션이 열릴 때만 마운트됨
 * - Jotai atom에서 직접 값 구독 (props 불필요)
 */
const TransformSectionContent = memo(function TransformSectionContent() {
  // 🚀 Phase 1: RAF 기반 스로틀 업데이트
  const { updateStyleImmediate, updateStylePreview } = useOptimizedStyleActions();
  // 🚀 Phase 3: Jotai atom에서 직접 값 구독
  const styleValues = useTransformValuesJotai();
  // Body 요소: breakpoint 크기 표시 (canvasSize 구독으로 토글 변경 즉시 반영)
  const canvasSize = useCanvasSyncStore(state => state.canvasSize);

  if (!styleValues) return null;

  const displayWidth = styleValues.isBody && styleValues.width === 'auto'
    ? String(canvasSize.width)
    : styleValues.width;
  const displayHeight = styleValues.isBody && styleValues.height === 'auto'
    ? String(canvasSize.height)
    : styleValues.height;

  return (
    <>
      <PropertyUnitInput
        icon={RulerDimensionLine}
        label="Width"
        className="width"
        value={displayWidth}
        units={['reset', 'fit-content', 'px', '%', 'vh', 'vw']}
        onChange={(value) => updateStyleImmediate('width', value)}
        onDrag={(value) => updateStylePreview('width', value)}
        min={0}
        max={9999}
      />
      <PropertyUnitInput
        icon={RulerDimensionLine}
        label="Height"
        className="height"
        value={displayHeight}
        units={['reset', 'fit-content', 'px', '%', 'vh', 'vw']}
        onChange={(value) => updateStyleImmediate('height', value)}
        onDrag={(value) => updateStylePreview('height', value)}
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
        units={['reset', 'px', '%', 'vh', 'vw']}
        onChange={(value) => updateStyleImmediate('left', value)}
        onDrag={(value) => updateStylePreview('left', value)}
        min={-9999}
        max={9999}
      />
      <PropertyUnitInput
        icon={ArrowDownFromLine}
        label="Top"
        className="top"
        value={styleValues.top}
        units={['reset', 'px', '%', 'vh', 'vw']}
        onChange={(value) => updateStyleImmediate('top', value)}
        onDrag={(value) => updateStylePreview('top', value)}
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
 * - 🚀 Phase 3: Jotai 기반 - props 불필요
 * - 🚀 Phase 4.2c: useResetStyles 경량 훅 사용
 */
export const TransformSection = memo(function TransformSection() {
  const resetStyles = useResetStyles();

  const handleReset = () => {
    resetStyles(['width', 'height', 'top', 'left']);
  };

  return (
    <PropertySection id="transform" title="Transform" onReset={handleReset}>
      <TransformSectionContent />
    </PropertySection>
  );
});
