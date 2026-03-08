/**
 * AppearanceSection - Appearance 스타일 편집 섹션
 *
 * Background + Border 편집 (단일 섹션)
 *
 * 🚀 Phase 3: Jotai 기반 Fine-grained Reactivity
 * 🚀 Phase 23: 컨텐츠 분리로 접힌 섹션 훅 실행 방지
 * 🎨 Color Picker Phase 1: isFillV2Enabled() → FillSectionContent 분기
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
} from "lucide-react";
import { shadows } from "@xstudio/specs";
import { useStyleActions } from "../hooks/useStyleActions";
import { useOptimizedStyleActions } from "../hooks/useOptimizedStyleActions";
import { useAppearanceValuesJotai } from "../hooks/useAppearanceValuesJotai";
import { useResetStyles } from "../hooks/useResetStyles";
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

/**
 * 🚀 Phase 3/23: 내부 컨텐츠 컴포넌트
 * - 섹션이 열릴 때만 마운트됨
 * - Jotai atom에서 직접 값 구독 (props 불필요)
 */
const AppearanceSectionContent = memo(function AppearanceSectionContent() {
  const { updateStyle } = useStyleActions();
  // 🚀 Phase 1: RAF 기반 스로틀 업데이트
  const { updateStyleImmediate, updateStylePreview } =
    useOptimizedStyleActions();
  // 🚀 Phase 3: Jotai atom에서 직접 값 구독
  const styleValues = useAppearanceValuesJotai();

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
    resetStyles([
      "backgroundColor",
      "borderColor",
      "borderWidth",
      "borderRadius",
      "borderStyle",
      "boxShadow",
    ]);
    // V2: fills 배열도 초기화
    if (isFillV2Enabled()) {
      useStore.getState().updateSelectedFills([]);
    }
  };

  return (
    <PropertySection id="appearance" title="Appearance" onReset={handleReset}>
      <AppearanceSectionContent />
    </PropertySection>
  );
});
