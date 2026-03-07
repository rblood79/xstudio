/**
 * TypographySection - Typography 스타일 편집 섹션
 *
 * Font, Text styles 편집
 *
 * 🚀 Phase 3: Jotai 기반 Fine-grained Reactivity
 * 🚀 Phase 23: 컨텐츠 분리로 접힌 섹션 훅 실행 방지
 */

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  PropertySection,
  PropertyUnitInput,
  PropertyColor,
  PropertySelect,
} from "../../../components";
import { ToggleButton, ToggleButtonGroup } from "@xstudio/shared/components";
import { iconProps } from "../../../../utils/ui/uiConstants";
import {
  Type,
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
  TextWrap,
} from "lucide-react";
import { useStyleActions } from "../hooks/useStyleActions";
import { useOptimizedStyleActions } from "../hooks/useOptimizedStyleActions";
import { useTypographyValuesJotai } from "../hooks/useTypographyValuesJotai";
import { useResetStyles } from "../hooks/useResetStyles";
import {
  DEFAULT_FONT_OPTIONS,
  FONT_REGISTRY_STORAGE_KEY,
  getCustomFonts,
  getFontWeightOptions,
} from "../../../fonts/customFonts";
import { usePanelLayout } from "../../../hooks/usePanelLayout";

/**
 * 🚀 Phase 3/23: 내부 컨텐츠 컴포넌트
 * - 섹션이 열릴 때만 마운트됨
 * - Jotai atom에서 직접 값 구독 (props 불필요)
 */
const TypographySectionContent = memo(function TypographySectionContent() {
  const { updateStyle, updateStyles } = useStyleActions();
  const { togglePanel } = usePanelLayout();
  // 🚀 Phase 1: RAF 기반 스로틀 업데이트
  const { updateStyleImmediate, updateStylePreview } =
    useOptimizedStyleActions();
  // 🚀 Phase 3: Jotai atom에서 직접 값 구독
  const styleValues = useTypographyValuesJotai();
  const [customFonts, setCustomFonts] = useState(() => getCustomFonts());

  // ADR-008: Text Behavior 프리셋 변경 핸들러
  // updateStyles (batch)로 5개 속성을 단일 set()에 적용 → 히스토리 1건 + 레이아웃 1회
  const handleTextBehaviorChange = useCallback(
    (preset: string) => {
      const presets: Record<string, Record<string, string>> = {
        normal: {
          whiteSpace: "",
          wordBreak: "",
          overflowWrap: "",
          textOverflow: "",
          overflow: "",
        },
        nowrap: {
          whiteSpace: "nowrap",
          wordBreak: "",
          overflowWrap: "",
          textOverflow: "",
          overflow: "",
        },
        truncate: {
          whiteSpace: "nowrap",
          wordBreak: "",
          overflowWrap: "",
          textOverflow: "ellipsis",
          overflow: "hidden",
        },
        "break-words": {
          whiteSpace: "",
          wordBreak: "",
          overflowWrap: "break-word",
          textOverflow: "",
          overflow: "",
        },
        "break-all": {
          whiteSpace: "",
          wordBreak: "break-all",
          overflowWrap: "",
          textOverflow: "",
          overflow: "",
        },
        "keep-all": {
          whiteSpace: "",
          wordBreak: "keep-all",
          overflowWrap: "break-word",
          textOverflow: "",
          overflow: "",
        },
        preserve: {
          whiteSpace: "pre-wrap",
          wordBreak: "",
          overflowWrap: "",
          textOverflow: "",
          overflow: "",
        },
      };
      const values = presets[preset];
      if (!values) return; // 'custom' → no-op
      updateStyles(values);
    },
    [updateStyles],
  );

  useEffect(() => {
    const syncFonts = () => setCustomFonts(getCustomFonts());

    window.addEventListener("xstudio:custom-fonts-updated", syncFonts);
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== FONT_REGISTRY_STORAGE_KEY) return;
      syncFonts();
    };
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener("xstudio:custom-fonts-updated", syncFonts);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const fontOptions = useMemo(() => {
    const seenFamilies = new Set<string>();
    const dynamicOptions: Array<{ value: string; label: string }> = [];
    for (const font of customFonts) {
      if (!seenFamilies.has(font.family)) {
        seenFamilies.add(font.family);
        dynamicOptions.push({
          value: font.family,
          label: `${font.family} (Custom)`,
        });
      }
    }

    return [...DEFAULT_FONT_OPTIONS, ...dynamicOptions];
  }, [customFonts]);

  const fontWeightOptions = useMemo(
    () => getFontWeightOptions(styleValues?.fontFamily || ""),
    [styleValues?.fontFamily, customFonts],
  );

  if (!styleValues) return null;

  return (
    <>
      <PropertySelect
        icon={Type}
        label="Font Family"
        className="font-family"
        value={styleValues.fontFamily}
        options={fontOptions}
        onChange={(value) => updateStyle("fontFamily", value)}
      />

      <PropertyColor
        icon={Type}
        label="Color"
        className="color"
        value={styleValues.color}
        onChange={(value) => updateStyle("color", value)}
        placeholder="#000000"
      />

      <div className="fieldset-actions actions-font">
        <button
          className="react-aria-Button"
          data-variant="default"
          data-size="sm"
          type="button"
          title="폰트 관리"
          style={{ cursor: "pointer", borderRadius: 4 }}
          onClick={() => togglePanel("right", "fonts")}
        >
          <Type
            color={iconProps.color}
            size={iconProps.size}
            strokeWidth={iconProps.strokeWidth}
          />
        </button>
      </div>

      <PropertyUnitInput
        icon={Type}
        label="Font Size"
        className="font-size"
        value={styleValues.fontSize}
        units={["reset", "px"]}
        defaultUnit="px"
        onChange={(value) => updateStyleImmediate("fontSize", value)}
        onDrag={(value) => updateStylePreview("fontSize", value)}
        min={8}
        max={200}
      />
      <PropertyUnitInput
        icon={Type}
        label="Line Height"
        className="line-height"
        value={styleValues.lineHeight}
        units={["reset", "px"]}
        onChange={(value) => updateStyleImmediate("lineHeight", value)}
        onDrag={(value) => updateStylePreview("lineHeight", value)}
        min={0}
        max={10}
        allowKeywords
      />

      <PropertySelect
        icon={Type}
        label="Font Weight"
        className="font-weight"
        value={styleValues.fontWeight}
        options={fontWeightOptions}
        onChange={(value) => updateStyle("fontWeight", value)}
      />
      <PropertyUnitInput
        icon={Type}
        label="Letter Spacing"
        className="letter-spacing"
        value={styleValues.letterSpacing}
        units={["reset", "px"]}
        onChange={(value) => updateStyleImmediate("letterSpacing", value)}
        onDrag={(value) => updateStylePreview("letterSpacing", value)}
        min={-10}
        max={10}
        allowKeywords
      />

      <fieldset className="properties-aria text-align">
        <legend className="fieldset-legend">Text Align</legend>
        <ToggleButtonGroup
          aria-label="Text alignment"
          indicator
          selectedKeys={[styleValues.textAlign]}
          onSelectionChange={(keys) => {
            const value = Array.from(keys)[0] as string;
            if (value) updateStyle("textAlign", value);
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
            if (value) updateStyle("verticalAlign", value);
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

      <fieldset className="properties-aria text-decoration">
        <legend className="fieldset-legend">Text Decoration</legend>
        <ToggleButtonGroup
          aria-label="Text decoration"
          indicator
          selectedKeys={
            styleValues.textDecoration === "none"
              ? []
              : [styleValues.textDecoration]
          }
          onSelectionChange={(keys) => {
            const value = Array.from(keys)[0] as string;
            // 선택 해제 시 'none'으로 초기화
            updateStyle("textDecoration", value || "none");
          }}
        >
          <ToggleButton id="overline">
            <Baseline
              color={iconProps.color}
              size={iconProps.size}
              strokeWidth={iconProps.strokeWidth}
              style={{ transform: "rotate(180deg)" }}
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
            if (value) updateStyle("fontStyle", value);
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
              style={{ fontStyle: "oblique", transform: "skewX(-10deg)" }}
            />
          </ToggleButton>
        </ToggleButtonGroup>
      </fieldset>

      <fieldset className="properties-aria text-transform">
        <legend className="fieldset-legend">Text Transform</legend>
        <ToggleButtonGroup
          aria-label="Text transform"
          indicator
          selectedKeys={
            styleValues.textTransform === "none"
              ? []
              : [styleValues.textTransform]
          }
          onSelectionChange={(keys) => {
            const value = Array.from(keys)[0] as string;
            // 선택 해제 시 'none'으로 초기화
            updateStyle("textTransform", value || "none");
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

      {/* ADR-008: Text Behavior Preset */}
      <PropertySelect
        icon={TextWrap}
        label="Wrap"
        className="text-behavior"
        value={styleValues.textBehaviorPreset}
        options={[
          { value: "normal", label: "Normal" },
          { value: "nowrap", label: "No Wrap" },
          { value: "truncate", label: "Truncate (...)" },
          { value: "break-words", label: "Break Words" },
          { value: "break-all", label: "Break All" },
          { value: "keep-all", label: "Keep All (CJK)" },
          { value: "preserve", label: "Preserve" },
          { value: "custom", label: "Custom..." },
        ]}
        onChange={handleTextBehaviorChange}
      />
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
      "fontFamily",
      "fontSize",
      "fontWeight",
      "fontStyle",
      "lineHeight",
      "letterSpacing",
      "color",
      "textAlign",
      "textDecoration",
      "textTransform",
      "verticalAlign",
      "whiteSpace",
      "wordBreak",
      "overflowWrap",
      "textOverflow",
      "overflow",
    ]);
  };

  return (
    <PropertySection id="typography" title="Typography" onReset={handleReset}>
      <TypographySectionContent />
    </PropertySection>
  );
});
