/**
 * AppearanceSection - Appearance 스타일 편집 섹션
 *
 * Background + Border 편집 (단일 섹션)
 * 접힌 섹션의 훅 실행을 방지하기 위해 내용 컴포넌트 분리.
 * isFillV2Enabled() 플래그에 따라 Fill V2 컨텐츠 분기.
 */

import { memo, lazy, Suspense } from "react";
import {
  PropertySection,
  PropertyUnitInput,
  PropertyColor,
  PropertySelect,
} from "../../../components";
import { SwatchIconButton } from "../../../components/ui";
import { iconProps } from "../../../../utils/ui/uiConstants";
import {
  Square,
  SquareDashed,
  SquareRoundCorner,
  SquareDashedBottom,
  EllipsisVertical,
  Eclipse,
  Scissors,
} from "lucide-react";
import { OVERFLOW_OPTIONS } from "../constants/styleOptions";
import { shadows } from "@composition/specs";
import { useStyleActions } from "../hooks/useStyleActions";
import { useOptimizedStyleActions } from "../hooks/useOptimizedStyleActions";
import { useAppearanceValues } from "../hooks/useAppearanceValues";
import { useResetStyles, useHasDirtyStyles } from "../hooks/useResetStyles";
import { isFillV2Enabled } from "../../../../utils/featureFlags";
import { useStore } from "../../../stores";

const LazyFillBackgroundInline = lazy(() =>
  import("./FillSection").then((m) => ({ default: m.FillBackgroundInline })),
);

/** Shadow 프리셋 옵션 */
const SHADOW_PRESET_OPTIONS = [
  { value: "reset", label: "Reset" },
  { value: "none", label: "none" },
  { value: "sm", label: "sm" },
  { value: "md", label: "md" },
  { value: "lg", label: "lg" },
  { value: "xl", label: "xl" },
  { value: "inset", label: "inset" },
];

/** CSS box-shadow 값 → 프리셋 키 역매핑 */
const cssToPresetMap = new Map(
  Object.entries(shadows).map(([key, val]) => [val, key]),
);

function boxShadowToPresetKey(cssValue: string): string {
  if (!cssValue || cssValue === "none") return "none";
  return cssToPresetMap.get(cssValue) ?? cssValue;
}

const AppearanceSectionContent = memo(function AppearanceSectionContent() {
  const { updateStyle } = useStyleActions();
  const { updateStyleImmediate, updateStylePreview } =
    useOptimizedStyleActions();
  const selectedId = useStore((s) => s.selectedElementId);
  const styleValues = useAppearanceValues(selectedId);

  if (!styleValues) return null;

  return (
    <>
      {/* Background: FillV2 활성화 시 FillBackgroundInline, 아니면 기존 PropertyColor */}
      {isFillV2Enabled() ? (
        <Suspense fallback={null}>
          <LazyFillBackgroundInline />
        </Suspense>
      ) : (
        <div className="style-background">
          <PropertyColor
            icon={Square}
            label="Background Color"
            className="background-color"
            value={styleValues.backgroundColor}
            onChange={(value) => updateStyle("backgroundColor", value)}
            placeholder="#FFFFFF"
          />
          <div className="fieldset-actions actions-icon">
            <SwatchIconButton aria-label="More background options">
              <EllipsisVertical
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.strokeWidth}
              />
            </SwatchIconButton>
          </div>
        </div>
      )}

      {/* Border */}
      <div className="style-border">
        <PropertyColor
          icon={Square}
          label="Color"
          className="border-color"
          value={styleValues.borderColor}
          onChange={(value) => updateStyle("borderColor", value)}
          placeholder="#000000"
        />
        <PropertyUnitInput
          icon={SquareDashed}
          label="Border Width"
          className="border-width"
          value={styleValues.borderWidth}
          units={["reset", "px"]}
          onChange={(value) => updateStyleImmediate("borderWidth", value)}
          onDrag={(value) => updateStylePreview("borderWidth", value)}
          min={0}
          max={100}
        />
        <PropertyUnitInput
          icon={SquareRoundCorner}
          label="Border Radius"
          className="border-radius"
          value={styleValues.borderRadius}
          units={["reset", "px"]}
          onChange={(value) => updateStyleImmediate("borderRadius", value)}
          onDrag={(value) => updateStylePreview("borderRadius", value)}
          min={0}
          max={500}
        />
        <PropertySelect
          icon={SquareDashedBottom}
          label="Border Style"
          className="border-style"
          value={styleValues.borderStyle}
          options={[
            { value: "reset", label: "Reset" },
            { value: "none", label: "none" },
            { value: "solid", label: "solid" },
            { value: "dashed", label: "dashed" },
            { value: "dotted", label: "dotted" },
            { value: "double", label: "double" },
            { value: "groove", label: "groove" },
            { value: "ridge", label: "ridge" },
            { value: "inset", label: "inset" },
            { value: "outset", label: "outset" },
          ]}
          onChange={(value) => updateStyle("borderStyle", value)}
        />
        <div className="fieldset-actions actions-icon">
          <SwatchIconButton aria-label="More border options">
            <EllipsisVertical
              color={iconProps.color}
              size={iconProps.size}
              strokeWidth={iconProps.strokeWidth}
            />
          </SwatchIconButton>
        </div>
      </div>

      {/* Box Shadow */}
      <div className="style-shadow">
        <PropertySelect
          icon={Eclipse}
          label="Box Shadow"
          className="box-shadow"
          value={boxShadowToPresetKey(styleValues.boxShadow)}
          options={SHADOW_PRESET_OPTIONS}
          onChange={(value) => {
            if (value === "" || value === "none") {
              updateStyle("boxShadow", "none");
            } else {
              const cssValue = shadows[value as keyof typeof shadows];
              updateStyle("boxShadow", cssValue ?? value);
            }
          }}
        />
      </div>

      {/* Overflow */}
      <div className="style-overflow">
        <PropertySelect
          icon={Scissors}
          label="Overflow"
          className="overflow"
          value={styleValues.overflow}
          options={OVERFLOW_OPTIONS}
          onChange={(value) => updateStyleImmediate("overflow", value)}
        />
      </div>
    </>
  );
});

/**
 * AppearanceSection - 외부 래퍼 (PropertySection 관리)
 */
const APPEARANCE_PROPS = [
  "backgroundColor",
  "borderColor",
  "borderWidth",
  "borderRadius",
  "borderStyle",
  "boxShadow",
  "overflow",
];

export const AppearanceSection = memo(function AppearanceSection() {
  const resetStyles = useResetStyles();
  const hasDirty = useHasDirtyStyles(APPEARANCE_PROPS);

  const handleReset = () => {
    resetStyles(APPEARANCE_PROPS);
    // V2: fills 배열도 초기화
    if (isFillV2Enabled()) {
      useStore.getState().updateSelectedFills([]);
    }
  };

  return (
    <PropertySection
      id="appearance"
      title="Appearance"
      onReset={hasDirty ? handleReset : undefined}
    >
      <AppearanceSectionContent />
    </PropertySection>
  );
});
