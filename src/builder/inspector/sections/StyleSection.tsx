import { DisclosureGroup, Disclosure } from "react-aria-components";
import {
  ToggleButton,
  ToggleButtonGroup,
  Button,
  Select,
  SelectItem,
} from "../../components/list";
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
            <ToggleButtonGroup>
              <ToggleButton>
                <AlignStartVertical
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.stroke}
                />
              </ToggleButton>
              <ToggleButton>
                <AlignHorizontalJustifyCenter
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.stroke}
                />
              </ToggleButton>
              <ToggleButton>
                <AlignEndVertical
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.stroke}
                />
              </ToggleButton>
            </ToggleButtonGroup>
          </div>
          <div className="alignment-controls-vertical">
            <ToggleButtonGroup>
              <ToggleButton>
                <AlignStartHorizontal
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.stroke}
                />
              </ToggleButton>
              <ToggleButton>
                <AlignVerticalJustifyCenter
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.stroke}
                />
              </ToggleButton>
              <ToggleButton>
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

        <fieldset className="transform-size">
          <legend className="fieldset-legend">Size</legend>
          <div className="size-control-width react-aria-Group">
            <label className="control-label">W</label>
            <input className="control-input" type="text" placeholder="auto" />
          </div>
          <div className="size-control-height react-aria-Group">
            <label className="control-label">H</label>
            <input className="control-input" type="text" placeholder="auto" />
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

        <fieldset className="transform-position">
          <legend className="fieldset-legend">Position</legend>
          <div className="position-control-x react-aria-Group">
            <label className="control-label">X</label>
            <input className="control-input"></input>
          </div>
          <div className="position-control-y react-aria-Group">
            <label className="control-label">Y</label>
            <input className="control-input"></input>
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
          <legend className="fieldset-legend">Direction</legend>
          <div className="direction-controls">
            <ToggleButtonGroup aria-label="Flex direction">
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
            <ToggleButtonGroup aria-label="Flex alignment">
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
            <ToggleButtonGroup aria-label="Justify content alignment">
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
          <div className="gap-control react-aria-Group">
            <label className="control-label">
              <LayoutGrid
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </label>
            <input className="control-input"></input>
          </div>
        </fieldset>

        <div className="spacing-controls-container">
          <fieldset className="spacing-padding">
            <legend className="fieldset-legend">Padding</legend>
            <div className="spacing-control react-aria-Group">
              <label className="control-label">
                <SquareSquare
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.stroke}
                />
              </label>
              <input className="control-input" />
            </div>
          </fieldset>
          <fieldset className="spacing-margin">
            <legend className="fieldset-legend">Margin</legend>
            <div className="spacing-control react-aria-Group">
              <label className="control-label">
                <Frame
                  color={iconProps.color}
                  size={iconProps.size}
                  strokeWidth={iconProps.stroke}
                />
              </label>
              <input className="control-input" />
            </div>
          </fieldset>
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
        <fieldset className="style-background">
          <legend className="fieldset-legend">Background</legend>
          <div className="color-control react-aria-Group">
            <label className="control-label">
              <Square color={iconProps.color} size={18} strokeWidth={0} />
            </label>
            <input className="control-input" />
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
        <div className="border-controls-container">
          <fieldset className="style-border">
            <legend className="fieldset-legend">Border Color</legend>
            <div className="color-control react-aria-Group">
              <label className="control-label">
                <Square color={iconProps.color} size={18} strokeWidth={0} />
              </label>
              <input className="control-input" />
            </div>
          </fieldset>
          <fieldset className="style-border-width">
            <legend className="fieldset-legend">Border Width</legend>

            <div className="border-width-control react-aria-Group">
              <label className="control-label">
                <SquareDashed
                  color={iconProps.color}
                  strokeWidth={iconProps.stroke}
                  size={iconProps.size}
                />
              </label>
              <input className="control-input" />
            </div>
          </fieldset>
          <fieldset className="style-border-radius">
            <legend className="fieldset-legend">Border Radius</legend>
            <div className="border-radius-control react-aria-Group">
              <label className="control-label">
                <SquareRoundCorner
                  color={iconProps.color}
                  strokeWidth={iconProps.stroke}
                  size={iconProps.size}
                />
              </label>
              <input className="control-input" />
            </div>
          </fieldset>
          <fieldset className="style-border-style">
            <legend className="fieldset-legend">Border Style</legend>
            <div className="border-style-control react-aria-Group">
              <label className="control-label">
                <SquareDashedBottom
                  color={iconProps.color}
                  strokeWidth={iconProps.stroke}
                  size={iconProps.size}
                />
              </label>
              <input className="control-input" />
            </div>
          </fieldset>
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
        <fieldset className="typography-font">
          <legend className="fieldset-legend">Font</legend>
          <div className="font-select-control react-aria-Group">
            <Select
              items={[
                { id: "Arial", label: "Arial" },
                { id: "Helvetica", label: "Helvetica" },
                { id: "Times New Roman", label: "Times New Roman" },
                { id: "Georgia", label: "Georgia" },
                { id: "Courier New", label: "Courier New" },
                { id: "Verdana", label: "Verdana" },
              ]}
            >
              {(item) => <SelectItem>{item.label}</SelectItem>}
            </Select>
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
