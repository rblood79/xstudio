import { DisclosureGroup, Disclosure, Button } from "react-aria-components";
import { SemanticClassPicker } from "../styles/SemanticClassPicker";
import { CSSVariableEditor } from "../styles/CSSVariableEditor";
import { PreviewPanel } from "../styles/PreviewPanel";
import { useInspectorState } from "../hooks/useInspectorState";
import type { SelectedElement } from "../types";

export interface StyleSectionProps {
  element: SelectedElement;
}

export function StyleSection({ element }: StyleSectionProps) {
  const { updateSemanticClasses, updateCSSVariables } = useInspectorState();

  return (
    <div className="style-section">
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
