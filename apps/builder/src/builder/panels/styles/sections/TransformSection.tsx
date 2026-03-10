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

import { memo, useCallback, useState } from "react";
import {
  PropertySection,
  PropertyUnitInput,
  PropertySelect,
} from "../../../components";
import { ToggleButton, ToggleButtonGroup } from "@xstudio/shared/components";
import { SwatchIconButton } from "../../../components/ui";
import { iconProps } from "../../../../utils/ui/uiConstants";
import {
  EllipsisVertical,
  RulerDimensionLine,
  ArrowRightFromLine,
  ArrowDownFromLine,
  Minus,
  MoveHorizontal,
  Shrink,
  ChevronsLeftRightEllipsis,
  Ratio,
  Lock,
  Unlock,
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
  selfAlignmentKeysAtom,
} from "../atoms/styleAtoms";
import {
  resolveSizeMode,
  sizeModeToStyleUpdates,
} from "../../../stores/utils/sizeModeResolver";
import type { SizeMode } from "../../../stores/utils/sizeModeResolver";

const ICON_SIZE = 14;
const ICON_STROKE = 1.5;

const ASPECT_RATIO_OPTIONS = [
  { value: "reset", label: "Auto" },
  { value: "1 / 1", label: "1:1 Square" },
  { value: "16 / 9", label: "16:9 Video" },
  { value: "4 / 3", label: "4:3 Classic" },
  { value: "3 / 2", label: "3:2 Photo" },
  { value: "21 / 9", label: "21:9 Ultra" },
  { value: "9 / 16", label: "9:16 Portrait" },
  { value: "3 / 4", label: "3:4 Portrait" },
];

/**
 * Size Mode 세그먼트 컨트롤 (ADR-026)
 * Fixed / Fill / Fit 3버튼 토글
 * Phase 4: fillDisabled prop으로 Fill 버튼 비활성화 + 툴팁
 */
const SizeModeToggle = memo(function SizeModeToggle({
  axis,
  mode,
  onChange,
  fillDisabled,
  fillDisabledReason,
}: {
  axis: "width" | "height";
  mode: SizeMode;
  onChange: (mode: SizeMode) => void;
  fillDisabled?: boolean;
  fillDisabledReason?: string;
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
      <ToggleButton
        id="fill"
        aria-label={
          fillDisabledReason ? `Fill (${fillDisabledReason})` : "Fill"
        }
        isDisabled={fillDisabled}
      >
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
  const hasConstraints = !!(
    styleValues?.minWidth ||
    styleValues?.maxWidth ||
    styleValues?.minHeight ||
    styleValues?.maxHeight ||
    styleValues?.aspectRatio
  );
  const [showConstraints, setShowConstraints] = useState(hasConstraints);

  // ADR-026: Size Mode atoms
  const widthMode = useAtomValue(widthSizeModeAtom);
  const heightMode = useAtomValue(heightSizeModeAtom);
  const parentDisplay = useAtomValue(parentDisplayAtom);
  const parentFlexDirection = useAtomValue(parentFlexDirectionAtom);
  const selfAlignmentKeys = useAtomValue(selfAlignmentKeysAtom);

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

  const handleSelfAlignment = useCallback(
    (keys: Set<string>) => {
      const value = Array.from(keys)[0] as string | undefined;
      if (!value) {
        updateStylesImmediate({ alignSelf: "", justifySelf: "" });
        return;
      }
      const positionMap: Record<
        string,
        { horizontal: string; vertical: string }
      > = {
        leftTop: { horizontal: "start", vertical: "start" },
        centerTop: { horizontal: "center", vertical: "start" },
        rightTop: { horizontal: "end", vertical: "start" },
        leftCenter: { horizontal: "start", vertical: "center" },
        centerCenter: { horizontal: "center", vertical: "center" },
        rightCenter: { horizontal: "end", vertical: "center" },
        leftBottom: { horizontal: "start", vertical: "end" },
        centerBottom: { horizontal: "center", vertical: "end" },
        rightBottom: { horizontal: "end", vertical: "end" },
      };
      const pos = positionMap[value];
      if (pos) {
        updateStylesImmediate({
          alignSelf: pos.vertical,
          justifySelf: pos.horizontal,
        });
      }
    },
    [updateStylesImmediate],
  );

  const handleAspectRatioLock = useCallback(() => {
    if (styleValues?.aspectRatio && styleValues.aspectRatio !== "auto") {
      updateStyleImmediate("aspectRatio", "");
    } else {
      // Calculate from current dimensions if available
      const w = parseFloat(styleValues?.width ?? "0");
      const h = parseFloat(styleValues?.height ?? "0");
      if (w > 0 && h > 0) {
        updateStyleImmediate("aspectRatio", `${w} / ${h}`);
      } else {
        updateStyleImmediate("aspectRatio", "1 / 1");
      }
    }
  }, [
    styleValues?.aspectRatio,
    styleValues?.width,
    styleValues?.height,
    updateStyleImmediate,
  ]);

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

  // Self-alignment: 부모가 flex/grid일 때만 표시
  const isFlexOrGridParent =
    parentDisplay === "flex" ||
    parentDisplay === "inline-flex" ||
    parentDisplay === "grid" ||
    parentDisplay === "inline-grid";
  const showSelfAlignment = !styleValues.isBody && isFlexOrGridParent;

  // ADR-026 Phase 4: Fill 비활성화 힌트
  // Block 부모: Height Fill 불가 (Block은 높이 채우기 미지원)
  const isBlockParent =
    parentDisplay === "block" || parentDisplay === "inline-block";
  const heightFillDisabled = isBlockParent;
  const heightFillReason = isBlockParent ? "Block 부모에서 불가" : undefined;
  // Width Fill은 모든 부모에서 가능 (block: 100%, flex: flex-grow, grid: stretch)
  const widthFillDisabled = false;

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
              fillDisabled={widthFillDisabled}
            />
          </fieldset>
          <fieldset className="properties-aria size-mode-height">
            <legend className="fieldset-legend">H Sizing</legend>
            <SizeModeToggle
              axis="height"
              mode={heightMode}
              onChange={handleHeightModeChange}
              fillDisabled={heightFillDisabled}
              fillDisabledReason={heightFillReason}
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
        <SwatchIconButton
          aria-label="Toggle constraints"
          onPress={() => setShowConstraints((v) => !v)}
        >
          <ChevronsLeftRightEllipsis
            color={iconProps.color}
            size={iconProps.size}
            strokeWidth={iconProps.strokeWidth}
          />
        </SwatchIconButton>
      </div>

      {showConstraints && !styleValues.isBody && (
        <>
          <PropertyUnitInput
            label="Min W"
            className="min-width"
            value={styleValues.minWidth}
            units={["reset", "px", "%", "rem", "vw"]}
            onChange={(value) => updateStyleImmediate("minWidth", value)}
            onDrag={(value) => updateStylePreview("minWidth", value)}
            min={0}
            max={9999}
          />
          <PropertyUnitInput
            label="Max W"
            className="max-width"
            value={styleValues.maxWidth}
            units={["reset", "px", "%", "rem", "vw"]}
            onChange={(value) => updateStyleImmediate("maxWidth", value)}
            onDrag={(value) => updateStylePreview("maxWidth", value)}
            min={0}
            max={9999}
          />
          <div className="fieldset-actions actions-constraint-w" />
          <PropertyUnitInput
            label="Min H"
            className="min-height"
            value={styleValues.minHeight}
            units={["reset", "px", "%", "rem", "vh"]}
            onChange={(value) => updateStyleImmediate("minHeight", value)}
            onDrag={(value) => updateStylePreview("minHeight", value)}
            min={0}
            max={9999}
          />
          <PropertyUnitInput
            label="Max H"
            className="max-height"
            value={styleValues.maxHeight}
            units={["reset", "px", "%", "rem", "vh"]}
            onChange={(value) => updateStyleImmediate("maxHeight", value)}
            onDrag={(value) => updateStylePreview("maxHeight", value)}
            min={0}
            max={9999}
          />
          <div className="fieldset-actions actions-constraint-h" />
          <div className="aspect-ratio-field">
            <PropertySelect
              icon={Ratio}
              label="Ratio"
              className="aspect-ratio-select"
              value={styleValues.aspectRatio || ""}
              options={ASPECT_RATIO_OPTIONS}
              onChange={(value) => {
                if (value === "reset" || value === "") {
                  updateStyleImmediate("aspectRatio", "");
                } else {
                  // aspectRatio가 설정되면 height를 auto로 변경하여 적용 가능하게 함
                  // CSS aspect-ratio는 width 또는 height 중 하나가 auto일 때만 적용됨
                  const updates: Record<string, string> = {
                    aspectRatio: value,
                  };
                  // height가 고정값이면 auto로 변경 (width는 유지)
                  if (
                    styleValues.height &&
                    styleValues.height !== "auto" &&
                    styleValues.height !== "fit-content" &&
                    styleValues.height !== "min-content" &&
                    styleValues.height !== "max-content"
                  ) {
                    updates.height = "auto";
                  }
                  updateStylesImmediate(updates);
                }
              }}
            />
            <SwatchIconButton
              aria-label="Lock aspect ratio"
              onPress={handleAspectRatioLock}
            >
              {styleValues.aspectRatio ? (
                <Lock
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.strokeWidth}
                />
              ) : (
                <Unlock
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.strokeWidth}
                />
              )}
            </SwatchIconButton>
          </div>
        </>
      )}

      {showSelfAlignment && (
        <div className="direction-alignment-grid self-alignment">
          <legend className="fieldset-legend">Self Align</legend>
          <ToggleButtonGroup
            aria-label="Self alignment"
            indicator
            selectionMode="single"
            selectedKeys={selfAlignmentKeys}
            onSelectionChange={handleSelfAlignment}
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
      )}

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
        <SwatchIconButton aria-label="More position options">
          <EllipsisVertical
            color={iconProps.color}
            size={iconProps.size}
            strokeWidth={iconProps.strokeWidth}
          />
        </SwatchIconButton>
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
      "minWidth",
      "maxWidth",
      "minHeight",
      "maxHeight",
      "aspectRatio",
    ]);
  };

  return (
    <PropertySection id="transform" title="Transform" onReset={handleReset}>
      <TransformSectionContent />
    </PropertySection>
  );
});
