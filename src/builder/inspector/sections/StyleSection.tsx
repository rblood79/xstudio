import { DisclosureGroup, Disclosure } from "react-aria-components";
import { ToggleButton, ToggleButtonGroup, Button } from "../../components/list";
import { PropertySelect, PropertyInput, PropertyUnitInput } from "../components";
import { SemanticClassPicker } from "../styles/SemanticClassPicker";
import { CSSVariableEditor } from "../styles/CSSVariableEditor";
import { PreviewPanel } from "../styles/PreviewPanel";
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

export function StyleSection({ element }: StyleSectionProps) {
  const { updateSemanticClasses, updateCSSVariables } = useInspectorState();

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
            <ToggleButtonGroup aria-label="Flex alignment-vertical" indicator>
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
            <ToggleButtonGroup aria-label="Flex alignment-horizontal" indicator>
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
            value={element.cssVariables?.width || "auto"}
            units={["px", "%", "rem", "em", "vh", "vw", "auto"]}
            onChange={(value) => {
              console.log("Width 변경:", value);
              updateCSSVariables({ width: value });
            }}
            min={0}
            max={9999}
          />
          <PropertyUnitInput
            icon={RulerDimensionLine}
            label="Height"
            className="transform-size-height"
            value={element.cssVariables?.["height"] || "auto"}
            units={["px", "%", "rem", "em", "vh", "vw", "auto"]}
            onChange={(value) => updateCSSVariables({ height: value })}
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
          <PropertyInput
            icon={ArrowRightFromLine}
            label="Left"
            className="transform-position-left"
            value={element.cssVariables?.["x"] || "auto"}
            onChange={(value) => updateCSSVariables({ x: value })}
            placeholder="auto"
          />
          <PropertyInput
            icon={ArrowDownFromLine}
            label="Top"
            className="transform-position-top"
            value={element.cssVariables?.["y"] || "auto"}
            onChange={(value) => updateCSSVariables({ y: value })}
            placeholder="auto"
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
            <ToggleButtonGroup aria-label="Flex direction" indicator>
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
            <ToggleButtonGroup aria-label="Flex alignment" indicator>
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
            <ToggleButtonGroup aria-label="Justify content alignment" indicator>
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
          <PropertyInput
            icon={LayoutGrid}
            //label="Gap"
            className="gap-control"
            value={element.cssVariables?.["gap"] || "0"}
            onChange={(value) => updateCSSVariables({ gap: value })}
            placeholder="0"
          />
        </fieldset>

        <div className="layout-container">
          <PropertyInput
            icon={SquareSquare}
            label="Padding"
            className="layout-padding"
            value={element.cssVariables?.["padding"] || "0"}
            onChange={(value) => updateCSSVariables({ padding: value })}
            placeholder="0"
          />
          <PropertyInput
            icon={Frame}
            label="Margin"
            className="layout-margin"
            value={element.cssVariables?.["margin"] || "0"}
            onChange={(value) => updateCSSVariables({ margin: value })}
            placeholder="0"
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
            value={element.cssVariables?.["background-color"] || "#FFFFFF"}
            onChange={(value) =>
              updateCSSVariables({ "background-color": value })
            }
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
            className="style-border"
            value={element.cssVariables?.["border-color"] || "#000000"}
            onChange={(value) => updateCSSVariables({ "border-color": value })}
            placeholder="#000000"
          />
          <PropertyInput
            icon={SquareDashed}
            label="Border Width"
            className="style-border-width"
            value={element.cssVariables?.["border-width"] || "0"}
            onChange={(value) => updateCSSVariables({ "border-width": value })}
            placeholder="0"
          />
          <PropertyInput
            icon={SquareRoundCorner}
            label="Border Radius"
            className="style-border-radius"
            value={element.cssVariables?.["border-radius"] || "0"}
            onChange={(value) => updateCSSVariables({ "border-radius": value })}
            placeholder="0"
          />
          <PropertyInput
            icon={SquareDashedBottom}
            label="Border Style"
            className="style-border-style"
            value={element.cssVariables?.["border-style"] || "solid"}
            onChange={(value) => updateCSSVariables({ "border-style": value })}
            placeholder="solid"
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
          label="Font"
          value="Arial"
          options={[
            { value: "Arial", label: "Arial" },
            { value: "Helvetica", label: "Helvetica" },
            { value: "Times New Roman", label: "Times New Roman" },
            { value: "Georgia", label: "Georgia" },
            { value: "Courier New", label: "Courier New" },
            { value: "Verdana", label: "Verdana" },
          ]}
          onChange={(key: string) => {
            console.log("Font 변경:", key);
            // TODO: 폰트 변경 로직 추가
          }}
        />
      </div>

      <PreviewPanel
        semanticClasses={element.semanticClasses}
        cssVariables={element.cssVariables}
      />

      <DisclosureGroup className="style-accordion">
        <Disclosure id="semantic" className="style-disclosure">
          <Button slot="trigger" className="disclosure-trigger">
            <span className="disclosure-title">의미 클래스</span>
            <span className="disclosure-icon">▼</span>
          </Button>
          <div className="disclosure-panel">
            <SemanticClassPicker
              selectedClasses={element.semanticClasses || []}
              onChange={updateSemanticClasses}
            />
          </div>
        </Disclosure>

        <Disclosure id="variables" className="style-disclosure">
          <Button slot="trigger" className="disclosure-trigger">
            <span className="disclosure-title">CSS 변수</span>
            <span className="disclosure-icon">▼</span>
          </Button>
          <div className="disclosure-panel">
            <CSSVariableEditor
              variables={element.cssVariables || {}}
              onChange={updateCSSVariables}
            />
          </div>
        </Disclosure>
      </DisclosureGroup>
    </div>
  );
}
