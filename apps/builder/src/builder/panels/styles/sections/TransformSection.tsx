/**
 * TransformSection - Transform 스타일 편집 섹션
 *
 * Size (with ADR-026 Size Mode), Position 편집
 * Note: Alignment는 Layout 섹션의 3x3 Flex alignment로 통합됨
 *
 * Phase 3: Jotai 기반 Fine-grained Reactivity
 * Phase 23: 컨텐츠 분리로 접힌 섹션 훅 실행 방지
 * ADR-026 Phase 1: Size Mode (Fixed/Fill/Fit) 세그먼트 컨트롤
 */

import { memo, useCallback } from "react";
import { PropertySection, PropertyUnitInput } from "../../../components";
import {
  Button,
  ToggleButton,
  ToggleButtonGroup,
} from "@xstudio/shared/components";
import { iconProps } from "../../../../utils/ui/uiConstants";
import {
  EllipsisVertical,
  RulerDimensionLine,
  ArrowRightFromLine,
  ArrowDownFromLine,
  Minus,
  MoveHorizontal,
  Shrink,
} from "lucide-react";
import { useOptimizedStyleActions } from "../hooks/useOptimizedStyleActions";
import { useTransformValuesJotai } from "../hooks/useTransformValuesJotai";
import { useResetStyles } from "../hooks/useResetStyles";
import { useCanvasSyncStore } from "../../../workspace/canvas/canvasSync";
import { useAtomValue } from "jotai";
import {
  widthSizeModeAtom,
  heightSizeModeAtom,
  parentDisplayAtom,
  parentFlexDirectionAtom,
} from "../atoms/styleAtoms";
import {
  resolveSizeMode,
  sizeModeToStyleUpdates,
} from "../../../stores/utils/sizeModeResolver";
import type { SizeMode } from "../../../stores/utils/sizeModeResolver";

const ICON_SIZE = 14;
const ICON_STROKE = 1.5;

/**
 * Size Mode 세그먼트 컨트롤 (ADR-026)
 * Fixed / Fill / Fit 3버튼 토글
 */
const SizeModeToggle = memo(function SizeModeToggle({
  axis,
  mode,
  onChange,
}: {
  axis: "width" | "height";
  mode: SizeMode;
  onChange: (mode: SizeMode) => void;
}) {
  const handleSelectionChange = useCallback(
    (keys: Set<string>) => {
      const selected = Array.from(keys)[0] as SizeMode | undefined;
      if (selected) onChange(selected);
    },
    [onChange],
  );

  return (
    <ToggleButtonGroup
      aria-label={`${axis} size mode`}
      size="sm"
      indicator
      selectionMode="single"
      disallowEmptySelection
      selectedKeys={[mode]}
      onSelectionChange={handleSelectionChange}
    >
      <ToggleButton id="fixed" aria-label="Fixed">
        <Minus size={ICON_SIZE} strokeWidth={ICON_STROKE} />
      </ToggleButton>
      <ToggleButton id="fill" aria-label="Fill">
        <MoveHorizontal
          size={ICON_SIZE}
          strokeWidth={ICON_STROKE}
          style={axis === "height" ? { transform: "rotate(90deg)" } : undefined}
        />
      </ToggleButton>
      <ToggleButton id="fit" aria-label="Fit">
        <Shrink size={ICON_SIZE} strokeWidth={ICON_STROKE} />
      </ToggleButton>
    </ToggleButtonGroup>
  );
});

/**
 * Phase 3/23: 내부 컨텐츠 컴포넌트
 * - 섹션이 열릴 때만 마운트됨
 * - Jotai atom에서 직접 값 구독 (props 불필요)
 */
const TransformSectionContent = memo(function TransformSectionContent() {
  const { updateStyleImmediate, updateStylePreview, updateStylesImmediate } =
    useOptimizedStyleActions();
  const styleValues = useTransformValuesJotai();
  const canvasSize = useCanvasSyncStore((state) => state.canvasSize);

  // ADR-026: Size Mode atoms
  const widthMode = useAtomValue(widthSizeModeAtom);
  const heightMode = useAtomValue(heightSizeModeAtom);
  const parentDisplay = useAtomValue(parentDisplayAtom);
  const parentFlexDirection = useAtomValue(parentFlexDirectionAtom);

  const handleSizeModeChange = useCallback(
    (axis: "width" | "height", mode: SizeMode) => {
      const currentValue =
        axis === "width" ? styleValues?.width : styleValues?.height;
      const css = resolveSizeMode(
        mode,
        axis,
        parentDisplay,
        parentFlexDirection,
        currentValue,
      );
      const updates = sizeModeToStyleUpdates(css);
      updateStylesImmediate(updates);
    },
    [
      parentDisplay,
      parentFlexDirection,
      styleValues?.width,
      styleValues?.height,
      updateStylesImmediate,
    ],
  );

  const handleWidthModeChange = useCallback(
    (mode: SizeMode) => handleSizeModeChange("width", mode),
    [handleSizeModeChange],
  );

  const handleHeightModeChange = useCallback(
    (mode: SizeMode) => handleSizeModeChange("height", mode),
    [handleSizeModeChange],
  );

  if (!styleValues) return null;

  const displayWidth =
    styleValues.isBody && styleValues.width === "auto"
      ? String(canvasSize.width)
      : styleValues.width;
  const displayHeight =
    styleValues.isBody && styleValues.height === "auto"
      ? String(canvasSize.height)
      : styleValues.height;

  // Body 요소에서는 Size Mode 비표시
  const showSizeMode = !styleValues.isBody;

  return (
    <>
      {showSizeMode && (
        <>
          <fieldset className="properties-aria size-mode-width">
            <legend className="fieldset-legend">W Sizing</legend>
            <SizeModeToggle
              axis="width"
              mode={widthMode}
              onChange={handleWidthModeChange}
            />
          </fieldset>
          <fieldset className="properties-aria size-mode-height">
            <legend className="fieldset-legend">H Sizing</legend>
            <SizeModeToggle
              axis="height"
              mode={heightMode}
              onChange={handleHeightModeChange}
            />
          </fieldset>
        </>
      )}
      <PropertyUnitInput
        icon={RulerDimensionLine}
        label="Width"
        className="width"
        value={displayWidth}
        units={["reset", "fit-content", "px", "%", "vh", "vw"]}
        onChange={(value) => updateStyleImmediate("width", value)}
        onDrag={(value) => updateStylePreview("width", value)}
        min={0}
        max={9999}
      />
      <PropertyUnitInput
        icon={RulerDimensionLine}
        label="Height"
        className="height"
        value={displayHeight}
        units={["reset", "fit-content", "px", "%", "vh", "vw"]}
        onChange={(value) => updateStyleImmediate("height", value)}
        onDrag={(value) => updateStylePreview("height", value)}
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
        units={["reset", "px", "%", "vh", "vw"]}
        onChange={(value) => updateStyleImmediate("left", value)}
        onDrag={(value) => updateStylePreview("left", value)}
        min={-9999}
        max={9999}
      />
      <PropertyUnitInput
        icon={ArrowDownFromLine}
        label="Top"
        className="top"
        value={styleValues.top}
        units={["reset", "px", "%", "vh", "vw"]}
        onChange={(value) => updateStyleImmediate("top", value)}
        onDrag={(value) => updateStylePreview("top", value)}
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
 * - Phase 3: Jotai 기반 - props 불필요
 * - Phase 4.2c: useResetStyles 경량 훅 사용
 */
export const TransformSection = memo(function TransformSection() {
  const resetStyles = useResetStyles();

  const handleReset = () => {
    resetStyles([
      "width",
      "height",
      "top",
      "left",
      "flexGrow",
      "flexShrink",
      "flexBasis",
      "alignSelf",
      "justifySelf",
    ]);
  };

  return (
    <PropertySection id="transform" title="Transform" onReset={handleReset}>
      <TransformSectionContent />
    </PropertySection>
  );
});
