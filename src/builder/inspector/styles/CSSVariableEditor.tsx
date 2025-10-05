import { Button, TextField, Label, Input } from "react-aria-components";

export interface CSSVariableEditorProps {
  variables: Record<string, string>;
  onChange: (variables: Record<string, string>) => void;
}

/**
 * 사용 가능한 CSS 변수 목록
 */
const availableVariables = [
  // Colors
  {
    key: "--color-primary",
    label: "Primary Color",
    type: "color",
    category: "Colors",
  },
  {
    key: "--color-secondary",
    label: "Secondary Color",
    type: "color",
    category: "Colors",
  },
  {
    key: "--color-background",
    label: "Background",
    type: "color",
    category: "Colors",
  },
  {
    key: "--color-surface",
    label: "Surface",
    type: "color",
    category: "Colors",
  },
  { key: "--color-border", label: "Border", type: "color", category: "Colors" },
  {
    key: "--color-text-primary",
    label: "Text Primary",
    type: "color",
    category: "Colors",
  },
  {
    key: "--color-text-secondary",
    label: "Text Secondary",
    type: "color",
    category: "Colors",
  },

  // Spacing
  { key: "--spacing-1", label: "Spacing 1", type: "text", category: "Spacing" },
  { key: "--spacing-2", label: "Spacing 2", type: "text", category: "Spacing" },
  { key: "--spacing-4", label: "Spacing 4", type: "text", category: "Spacing" },
  { key: "--spacing-6", label: "Spacing 6", type: "text", category: "Spacing" },
  { key: "--spacing-8", label: "Spacing 8", type: "text", category: "Spacing" },

  // Border Radius
  {
    key: "--radius-sm",
    label: "Radius Small",
    type: "text",
    category: "Border Radius",
  },
  {
    key: "--radius-md",
    label: "Radius Medium",
    type: "text",
    category: "Border Radius",
  },
  {
    key: "--radius-lg",
    label: "Radius Large",
    type: "text",
    category: "Border Radius",
  },
  {
    key: "--radius-full",
    label: "Radius Full",
    type: "text",
    category: "Border Radius",
  },

  // Typography
  {
    key: "--font-size-xs",
    label: "Font Size XS",
    type: "text",
    category: "Typography",
  },
  {
    key: "--font-size-sm",
    label: "Font Size Small",
    type: "text",
    category: "Typography",
  },
  {
    key: "--font-size-md",
    label: "Font Size Medium",
    type: "text",
    category: "Typography",
  },
  {
    key: "--font-size-lg",
    label: "Font Size Large",
    type: "text",
    category: "Typography",
  },
  {
    key: "--font-size-xl",
    label: "Font Size XL",
    type: "text",
    category: "Typography",
  },
  {
    key: "--font-weight-normal",
    label: "Font Weight Normal",
    type: "text",
    category: "Typography",
  },
  {
    key: "--font-weight-medium",
    label: "Font Weight Medium",
    type: "text",
    category: "Typography",
  },
  {
    key: "--font-weight-semibold",
    label: "Font Weight Semibold",
    type: "text",
    category: "Typography",
  },
  {
    key: "--font-weight-bold",
    label: "Font Weight Bold",
    type: "text",
    category: "Typography",
  },
];

export function CSSVariableEditor({
  variables,
  onChange,
}: CSSVariableEditorProps) {
  const handleVariableChange = (key: string, value: string) => {
    if (value === "") {
      // 빈 값이면 변수 제거
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { [key]: _, ...rest } = variables;
      onChange(rest);
    } else {
      onChange({
        ...variables,
        [key]: value,
      });
    }
  };

  const handleRemoveVariable = (key: string) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { [key]: _, ...rest } = variables;
    onChange(rest);
  };

  // 카테고리별로 그룹화
  const categories = Array.from(
    new Set(availableVariables.map((v) => v.category))
  );

  return (
    <div className="css-variable-editor">
      <div className="editor-header">
        <Label className="section-label">CSS 변수 재정의</Label>
        <p className="section-description">
          컴포넌트별로 CSS 변수를 재정의할 수 있습니다.
        </p>
      </div>

      {categories.map((category) => {
        const categoryVars = availableVariables.filter(
          (v) => v.category === category
        );
        const hasActiveVars = categoryVars.some((v) => variables[v.key]);

        return (
          <details
            key={category}
            className="variable-category"
            open={hasActiveVars}
          >
            <summary className="category-header">
              <span className="category-title">{category}</span>
              {hasActiveVars && (
                <span className="active-count">
                  {categoryVars.filter((v) => variables[v.key]).length}
                </span>
              )}
            </summary>

            <div className="category-variables">
              {categoryVars.map((variable) => {
                const isActive = !!variables[variable.key];

                return (
                  <div
                    key={variable.key}
                    className={`variable-row ${isActive ? "active" : ""}`}
                  >
                    <TextField
                      className="variable-field"
                      value={variables[variable.key] || ""}
                      onChange={(value) =>
                        handleVariableChange(variable.key, value)
                      }
                    >
                      <Label className="variable-label">
                        {variable.label}
                        <code className="variable-key">{variable.key}</code>
                      </Label>
                      <Input
                        className="variable-input"
                        type={variable.type}
                        placeholder={
                          variable.type === "color" ? "#000000" : "value"
                        }
                      />
                    </TextField>

                    {isActive && (
                      <Button
                        className="remove-button"
                        onPress={() => handleRemoveVariable(variable.key)}
                        aria-label={`Remove ${variable.label}`}
                      >
                        ✕
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </details>
        );
      })}

      {/* 커스텀 변수 추가 (향후 구현) */}
      {Object.keys(variables).length > 0 && (
        <details className="custom-variables">
          <summary className="category-header">
            <span className="category-title">현재 변수 미리보기</span>
          </summary>
          <pre className="variables-preview">
            {Object.entries(variables).map(([key, value]) => (
              <div key={key} className="variable-line">
                {key}: {value};
              </div>
            ))}
          </pre>
        </details>
      )}
    </div>
  );
}
