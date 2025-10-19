import { ToggleButton, ToggleButtonGroup, Button } from "../../components/list";
import {
  PropertySelect,
  PropertyInput,
  PropertyUnitInput,
} from "../components";
import { useInspectorState } from "../hooks/useInspectorState";
import { iconProps } from "../../../utils/uiConstants";
import type { SelectedElement } from "../types";

import {
  Square,
  SquareDashed,
  ChevronUp,
  EllipsisVertical,
  Frame,
  LayoutGrid,
  SquareDashedBottom,
  StretchHorizontal,
  StretchVertical,
  AlignHorizontalSpaceAround,
  GalleryHorizontal,
  SquareRoundCorner,
  SquareSquare,
  AlignHorizontalJustifyCenter,
  AlignStartVertical,
  AlignVerticalJustifyCenter,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignEndHorizontal,
  Type,
  RulerDimensionLine,
  ArrowRightFromLine,
  ArrowDownFromLine,
} from "lucide-react";

export interface StyleSectionProps {
  element: SelectedElement;
}

// Helper function: Get style value with priority (inline > computed > default)
function getStyleValue(
  element: SelectedElement,
  property: keyof React.CSSProperties,
  defaultValue: string
): string {
  // Priority 1: Inline style
  if (element.style && element.style[property] !== undefined) {
    return String(element.style[property]);
  }
  // Priority 2: Computed style
  if (element.computedStyle && element.computedStyle[property] !== undefined) {
    return String(element.computedStyle[property]);
  }
  // Priority 3: Default value
  return defaultValue;
}

// Helper function: Check if element is flex container
// TODO: Implement this for conditional rendering of flex properties
// function isFlexContainer(element: SelectedElement): boolean {
//   const display = getStyleValue(element, "display", "block");
//   return display === "flex" || display === "inline-flex";
// }

// Helper function: Get selected vertical alignment button ID
function getVerticalAlignmentKeys(element: SelectedElement): string[] {
  const alignItems = getStyleValue(element, "alignItems", "");
  const reverseMap: Record<string, string> = {
    "flex-start": "align-vertical-start",
    "center": "align-vertical-center",
    "flex-end": "align-vertical-end",
  };
  return alignItems && reverseMap[alignItems] ? [reverseMap[alignItems]] : [];
}

// Helper function: Get selected horizontal alignment button ID
function getHorizontalAlignmentKeys(element: SelectedElement): string[] {
  const justifyContent = getStyleValue(element, "justifyContent", "");
  const reverseMap: Record<string, string> = {
    "flex-start": "align-horizontal-start",
    "center": "align-horizontal-center",
    "flex-end": "align-horizontal-end",
  };
  return justifyContent && reverseMap[justifyContent] ? [reverseMap[justifyContent]] : [];
}

// Helper function: Get selected flex alignment button ID (3x3 grid)
function getFlexAlignmentKeys(element: SelectedElement): string[] {
  const justifyContent = getStyleValue(element, "justifyContent", "");
  const alignItems = getStyleValue(element, "alignItems", "");
  const flexDirection = getStyleValue(element, "flexDirection", "row");

  // For row (default): horizontal = justifyContent, vertical = alignItems
  // For column: horizontal = alignItems, vertical = justifyContent
  let horizontal: string, vertical: string;

  if (flexDirection === "column") {
    horizontal = alignItems;
    vertical = justifyContent;
  } else {
    // row or default
    horizontal = justifyContent;
    vertical = alignItems;
  }

  // Map combinations to button IDs (horizontal:vertical)
  const combinationMap: Record<string, string> = {
    "flex-start:flex-start": "leftTop",
    "center:flex-start": "centerTop",
    "flex-end:flex-start": "rightTop",
    "flex-start:center": "leftCenter",
    "center:center": "centerCenter",
    "flex-end:center": "rightCenter",
    "flex-start:flex-end": "leftBottom",
    "center:flex-end": "centerBottom",
    "flex-end:flex-end": "rightBottom",
  };

  const key = `${horizontal}:${vertical}`;
  return combinationMap[key] ? [combinationMap[key]] : [];
}

// Helper function: Get selected flex direction button ID
function getFlexDirectionKeys(element: SelectedElement): string[] {
  const flexDirection = getStyleValue(element, "flexDirection", "");

  // Map flex-direction values to button IDs
  if (flexDirection === "row") return ["row"];
  if (flexDirection === "column") return ["column"];

  // If no flex-direction or "row" (default), show reset
  return ["reset"];
}

// Helper function: Get selected justify content spacing (space-around/between/evenly)
function getJustifyContentSpacingKeys(element: SelectedElement): string[] {
  const justifyContent = getStyleValue(element, "justifyContent", "");

  if (justifyContent === "space-around") return ["space-around"];
  if (justifyContent === "space-between") return ["space-between"];
  if (justifyContent === "space-evenly") return ["space-evenly"];

  return [];
}

export function StyleSection({ element }: StyleSectionProps) {
  const { updateInlineStyle, updateInlineStyles } = useInspectorState();

  return (
    <div className="style-section">
      <div className="section-header">
        <h3 className="section-title">Transform</h3>
        <div className="header-actions">
          <button className="iconButton" aria-label="Add Element">
            <ChevronUp
              color={iconProps.color}
              strokeWidth={iconProps.stroke}
              size={iconProps.size}
            />
          </button>
        </div>
      </div>
      <div className="section-content">
        <fieldset className="transform-alignment">
          <legend className="fieldset-legend">Alignment</legend>
          <div className="alignment-controls-horizontal">
            <ToggleButtonGroup
              aria-label="Flex alignment-vertical"
              indicator
              selectedKeys={getVerticalAlignmentKeys(element)}
              onSelectionChange={(keys) => {
                console.log("🎯 Flex alignment-vertical 선택 변경:", keys);
                const value = Array.from(keys)[0] as string;
                if (value) {
                  console.log("✅ display: flex + alignItems 설정 시작");
                  // Auto-enable display: flex and set alignItems
                  const alignItemsMap: Record<string, string> = {
                    "align-vertical-start": "flex-start",
                    "align-vertical-center": "center",
                    "align-vertical-end": "flex-end",
                  };
                  updateInlineStyles({
                    display: "flex",
                    alignItems: alignItemsMap[value] || "flex-start",
                  });
                }
              }}
            >
              <ToggleButton id="align-vertical-start">
                <AlignStartVertical
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.stroke}
                />
              </ToggleButton>
              <ToggleButton id="align-vertical-center">
                <AlignHorizontalJustifyCenter
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.stroke}
                />
              </ToggleButton>
              <ToggleButton id="align-vertical-end">
                <AlignEndVertical
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.stroke}
                />
              </ToggleButton>
            </ToggleButtonGroup>
          </div>
          <div className="alignment-controls-vertical">
            <ToggleButtonGroup
              aria-label="Flex alignment-horizontal"
              indicator
              selectedKeys={getHorizontalAlignmentKeys(element)}
              onSelectionChange={(keys) => {
                console.log("🎯 Flex alignment-horizontal 선택 변경:", keys);
                const value = Array.from(keys)[0] as string;
                if (value) {
                  console.log("✅ display: flex + justifyContent 설정 시작");
                  // Auto-enable display: flex and set justifyContent
                  const justifyContentMap: Record<string, string> = {
                    "align-horizontal-start": "flex-start",
                    "align-horizontal-center": "center",
                    "align-horizontal-end": "flex-end",
                  };
                  updateInlineStyles({
                    display: "flex",
                    justifyContent: justifyContentMap[value] || "flex-start",
                  });
                }
              }}
            >
              <ToggleButton id="align-horizontal-start">
                <AlignStartHorizontal
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.stroke}
                />
              </ToggleButton>
              <ToggleButton id="align-horizontal-center">
                <AlignVerticalJustifyCenter
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.stroke}
                />
              </ToggleButton>
              <ToggleButton id="align-horizontal-end">
                <AlignEndHorizontal
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.stroke}
                />
              </ToggleButton>
            </ToggleButtonGroup>
          </div>
          <div className="fieldset-actions">
            <Button>
              <EllipsisVertical
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </Button>
          </div>
        </fieldset>

        <div className="transform-size">
          <PropertyUnitInput
            icon={RulerDimensionLine}
            label="Width"
            value={getStyleValue(element, "width", "auto")}
            units={["px", "%", "rem", "em", "vh", "vw", "auto"]}
            onChange={(value) => updateInlineStyle("width", value)}
            min={0}
            max={9999}
          />
          <PropertyUnitInput
            icon={RulerDimensionLine}
            label="Height"
            className="transform-size-height"
            value={getStyleValue(element, "height", "auto")}
            units={["px", "%", "rem", "em", "vh", "vw", "auto"]}
            onChange={(value) => updateInlineStyle("height", value)}
            min={0}
            max={9999}
          />
          <div className="fieldset-actions">
            <Button>
              <EllipsisVertical
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </Button>
          </div>
        </div>

        <div className="transform-position">
          <PropertyUnitInput
            icon={ArrowRightFromLine}
            label="Left"
            className="transform-position-left"
            value={getStyleValue(element, "left", "auto")}
            units={["px", "%", "rem", "em", "vh", "vw", "auto"]}
            onChange={(value) => updateInlineStyle("left", value)}
            min={-9999}
            max={9999}
          />
          <PropertyUnitInput
            icon={ArrowDownFromLine}
            label="Top"
            className="transform-position-top"
            value={getStyleValue(element, "top", "auto")}
            units={["px", "%", "rem", "em", "vh", "vw", "auto"]}
            onChange={(value) => updateInlineStyle("top", value)}
            min={-9999}
            max={9999}
          />
          <div className="fieldset-actions">
            <Button>
              <EllipsisVertical
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </Button>
          </div>
        </div>
      </div>

      <div className="section-header">
        <h3 className="section-title">Layout</h3>
        <div className="header-actions">
          <button className="iconButton" aria-label="Add Element">
            <ChevronUp
              color={iconProps.color}
              strokeWidth={iconProps.stroke}
              size={iconProps.size}
            />
          </button>
        </div>
      </div>

      <div className="section-content">
        <fieldset className="layout-direction">
          <div className="direction-controls">
            <ToggleButtonGroup
              aria-label="Flex direction"
              indicator
              selectedKeys={getFlexDirectionKeys(element)}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string;
                if (value === "reset") {
                  // Remove flex-direction (or set to default)
                  updateInlineStyle("flexDirection", "");
                } else if (value === "row") {
                  updateInlineStyles({
                    display: "flex",
                    flexDirection: "row",
                  });
                } else if (value === "column") {
                  updateInlineStyles({
                    display: "flex",
                    flexDirection: "column",
                  });
                }
              }}
            >
              <ToggleButton id="reset">
                <Square
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.stroke}
                />
              </ToggleButton>
              <ToggleButton id="row">
                <StretchVertical
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.stroke}
                />
              </ToggleButton>
              <ToggleButton id="column">
                <StretchHorizontal
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.stroke}
                />
              </ToggleButton>
            </ToggleButtonGroup>
          </div>
          <div className="direction-alignment-grid">
            <ToggleButtonGroup
              aria-label="Flex alignment"
              indicator
              selectedKeys={getFlexAlignmentKeys(element)}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string;
                if (value) {
                  // Get current flex-direction to determine axis mapping
                  const currentFlexDirection = getStyleValue(element, "flexDirection", "row");

                  // Map button position to horizontal and vertical alignment values
                  const positionMap: Record<string, { horizontal: string; vertical: string }> = {
                    leftTop: { horizontal: "flex-start", vertical: "flex-start" },
                    centerTop: { horizontal: "center", vertical: "flex-start" },
                    rightTop: { horizontal: "flex-end", vertical: "flex-start" },
                    leftCenter: { horizontal: "flex-start", vertical: "center" },
                    centerCenter: { horizontal: "center", vertical: "center" },
                    rightCenter: { horizontal: "flex-end", vertical: "center" },
                    leftBottom: { horizontal: "flex-start", vertical: "flex-end" },
                    centerBottom: { horizontal: "center", vertical: "flex-end" },
                    rightBottom: { horizontal: "flex-end", vertical: "flex-end" },
                  };

                  const position = positionMap[value];
                  if (position) {
                    // For row: horizontal = justifyContent, vertical = alignItems
                    // For column: horizontal = alignItems, vertical = justifyContent
                    if (currentFlexDirection === "column") {
                      updateInlineStyles({
                        display: "flex",
                        justifyContent: position.vertical,
                        alignItems: position.horizontal,
                      });
                    } else {
                      // row or default
                      updateInlineStyles({
                        display: "flex",
                        justifyContent: position.horizontal,
                        alignItems: position.vertical,
                      });
                    }
                  }
                }
              }}
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
          <div className="fieldset-actions">
            <Button>
              <EllipsisVertical
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </Button>
          </div>
          <div className="justify-control">
            <ToggleButtonGroup
              aria-label="Justify content alignment"
              indicator
              selectedKeys={getJustifyContentSpacingKeys(element)}
              onSelectionChange={(keys) => {
                const value = Array.from(keys)[0] as string;
                if (value) {
                  updateInlineStyles({
                    display: "flex",
                    justifyContent: value, // space-around, space-between, space-evenly
                  });
                }
              }}
            >
              <ToggleButton id="space-around">
                <AlignHorizontalSpaceAround
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.stroke}
                />
              </ToggleButton>
              <ToggleButton id="space-between">
                <GalleryHorizontal
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.stroke}
                />
              </ToggleButton>
              <ToggleButton id="space-evenly">
                <AlignHorizontalSpaceAround
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.stroke}
                />
              </ToggleButton>
            </ToggleButtonGroup>
          </div>
          <PropertyUnitInput
            icon={LayoutGrid}
            //label="Gap"
            className="gap-control"
            value={getStyleValue(element, "gap", "0px")}
            units={["px", "rem", "em"]}
            onChange={(value) => updateInlineStyle("gap", value)}
            min={0}
            max={500}
          />
        </fieldset>

        <div className="layout-container">
          <PropertyUnitInput
            icon={SquareSquare}
            label="Padding"
            className="layout-padding"
            value={getStyleValue(element, "padding", "0px")}
            units={["px", "rem", "em"]}
            onChange={(value) => updateInlineStyle("padding", value)}
            min={0}
            max={500}
          />
          <PropertyUnitInput
            icon={Frame}
            label="Margin"
            className="layout-margin"
            value={getStyleValue(element, "margin", "0px")}
            units={["px", "rem", "em", "auto"]}
            onChange={(value) => updateInlineStyle("margin", value)}
            min={0}
            max={500}
          />
          <div className="fieldset-actions">
            <Button>
              <EllipsisVertical
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </Button>
          </div>
        </div>
      </div>

      <div className="section-header">
        <h3 className="section-title">Style</h3>
        <div className="header-actions">
          <button className="iconButton" aria-label="Add Element">
            <ChevronUp
              color={iconProps.color}
              strokeWidth={iconProps.stroke}
              size={iconProps.size}
            />
          </button>
        </div>
      </div>

      <div className="section-content">
        <div className="style-background">
          <PropertyInput
            icon={Square}
            label="Background Color"
            value={getStyleValue(element, "backgroundColor", "#FFFFFF")}
            onChange={(value) => updateInlineStyle("backgroundColor", value)}
            placeholder="#FFFFFF"
          />
          <div className="fieldset-actions">
            <Button>
              <EllipsisVertical
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </Button>
          </div>
        </div>
        <div className="border-controls-container">
          <PropertyInput
            icon={Square}
            label="Border Color"
            className="color-control"
            value={getStyleValue(element, "borderColor", "#000000")}
            onChange={(value) => updateInlineStyle("borderColor", value)}
            placeholder="#000000"
          />
          <PropertyUnitInput
            icon={SquareDashed}
            label="Border Width"
            className="border-width-control"
            value={getStyleValue(element, "borderWidth", "0px")}
            units={["px"]}
            onChange={(value) => updateInlineStyle("borderWidth", value)}
            min={0}
            max={100}
          />
          <PropertyUnitInput
            icon={SquareRoundCorner}
            label="Border Radius"
            className="border-radius-control"
            value={getStyleValue(element, "borderRadius", "0px")}
            units={["px", "%", "rem", "em"]}
            onChange={(value) => updateInlineStyle("borderRadius", value)}
            min={0}
            max={500}
          />
          <PropertySelect
            icon={SquareDashedBottom}
            label="Border Style"
            className="border-style-control"
            value={getStyleValue(element, "borderStyle", "solid")}
            options={[
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
            onChange={(value) => updateInlineStyle("borderStyle", value)}
          />
          <div className="fieldset-actions">
            <Button>
              <EllipsisVertical
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </Button>
          </div>
        </div>
      </div>

      <div className="section-header">
        <h3 className="section-title">Text</h3>
        <div className="header-actions">
          <button className="iconButton" aria-label="Add Element">
            <ChevronUp
              color={iconProps.color}
              strokeWidth={iconProps.stroke}
              size={iconProps.size}
            />
          </button>
        </div>
      </div>

      <div className="section-content">
        <PropertySelect
          icon={Type}
          label="Font Family"
          value={getStyleValue(element, "fontFamily", "Arial")}
          options={[
            { value: "Arial", label: "Arial" },
            { value: "Helvetica", label: "Helvetica" },
            { value: "Times New Roman", label: "Times New Roman" },
            { value: "Georgia", label: "Georgia" },
            { value: "Courier New", label: "Courier New" },
            { value: "Verdana", label: "Verdana" },
          ]}
          onChange={(value) => updateInlineStyle("fontFamily", value)}
        />

        <PropertyInput
          icon={Type}
          label="Color"
          type="color"
          value={getStyleValue(element, "color", "#000000")}
          onChange={(value) => updateInlineStyle("color", value)}
          placeholder="#000000"
        />

        <PropertyUnitInput
          icon={Type}
          label="Font Size"
          value={getStyleValue(element, "fontSize", "16px")}
          units={["px", "rem", "em", "pt"]}
          onChange={(value) => updateInlineStyle("fontSize", value)}
          min={8}
          max={200}
        />

        <PropertySelect
          icon={Type}
          label="Font Weight"
          value={getStyleValue(element, "fontWeight", "normal")}
          options={[
            { value: "100", label: "100 - Thin" },
            { value: "200", label: "200 - Extra Light" },
            { value: "300", label: "300 - Light" },
            { value: "400", label: "400 - Normal" },
            { value: "500", label: "500 - Medium" },
            { value: "600", label: "600 - Semi Bold" },
            { value: "700", label: "700 - Bold" },
            { value: "800", label: "800 - Extra Bold" },
            { value: "900", label: "900 - Black" },
            { value: "normal", label: "Normal" },
            { value: "bold", label: "Bold" },
          ]}
          onChange={(value) => updateInlineStyle("fontWeight", value)}
        />

        <PropertyUnitInput
          icon={Type}
          label="Line Height"
          value={getStyleValue(element, "lineHeight", "normal")}
          units={["px", "rem", "em", ""]}
          onChange={(value) => updateInlineStyle("lineHeight", value)}
          min={0}
          max={10}
          allowKeywords
        />

        <PropertyUnitInput
          icon={Type}
          label="Letter Spacing"
          value={getStyleValue(element, "letterSpacing", "normal")}
          units={["px", "rem", "em"]}
          onChange={(value) => updateInlineStyle("letterSpacing", value)}
          min={-10}
          max={10}
          allowKeywords
        />

        <fieldset className="properties-aria">
          <legend className="fieldset-legend">Text Align</legend>
          <ToggleButtonGroup
            aria-label="Text alignment"
            selectedKeys={[getStyleValue(element, "textAlign", "left")]}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string;
              if (value) updateInlineStyle("textAlign", value);
            }}
          >
            <ToggleButton id="left">Left</ToggleButton>
            <ToggleButton id="center">Center</ToggleButton>
            <ToggleButton id="right">Right</ToggleButton>
            <ToggleButton id="justify">Justify</ToggleButton>
          </ToggleButtonGroup>
        </fieldset>

        <fieldset className="properties-aria">
          <legend className="fieldset-legend">Text Decoration</legend>
          <ToggleButtonGroup
            aria-label="Text decoration"
            selectedKeys={[getStyleValue(element, "textDecoration", "none")]}
            onSelectionChange={(keys) => {
              const value = Array.from(keys)[0] as string;
              if (value) updateInlineStyle("textDecoration", value);
            }}
          >
            <ToggleButton id="none">None</ToggleButton>
            <ToggleButton id="underline">Underline</ToggleButton>
            <ToggleButton id="line-through">Line Through</ToggleButton>
          </ToggleButtonGroup>
        </fieldset>

        <PropertySelect
          icon={Type}
          label="Text Transform"
          value={getStyleValue(element, "textTransform", "none")}
          options={[
            { value: "none", label: "None" },
            { value: "uppercase", label: "UPPERCASE" },
            { value: "lowercase", label: "lowercase" },
            { value: "capitalize", label: "Capitalize" },
          ]}
          onChange={(value) => updateInlineStyle("textTransform", value)}
        />

        <PropertySelect
          icon={Type}
          label="Font Style"
          value={getStyleValue(element, "fontStyle", "normal")}
          options={[
            { value: "normal", label: "Normal" },
            { value: "italic", label: "Italic" },
            { value: "oblique", label: "Oblique" },
          ]}
          onChange={(value) => updateInlineStyle("fontStyle", value)}
        />
      </div>
    </div>
  );
}
