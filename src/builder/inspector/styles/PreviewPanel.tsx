export interface PreviewPanelProps {
  semanticClasses?: string[];
  cssVariables?: Record<string, string>;
}

export function PreviewPanel({
  semanticClasses,
  cssVariables,
}: PreviewPanelProps) {
  const hasClasses = semanticClasses && semanticClasses.length > 0;
  const hasVariables = cssVariables && Object.keys(cssVariables).length > 0;

  if (!hasClasses && !hasVariables) {
    return null;
  }

  // CSS 변수를 style 객체로 변환
  const inlineStyle = cssVariables
    ? (cssVariables as React.CSSProperties)
    : undefined;

  return (
    <div className="preview-panel">
      <h4 className="panel-title">적용된 스타일</h4>

      {hasClasses && (
        <div className="preview-section">
          <span className="preview-label">클래스:</span>
          <div className="preview-classes">
            {semanticClasses.map((cls) => (
              <code key={cls} className="preview-class-tag">
                {cls}
              </code>
            ))}
          </div>
        </div>
      )}

      {hasVariables && (
        <div className="preview-section">
          <span className="preview-label">CSS 변수:</span>
          <div className="preview-variables">
            {Object.entries(cssVariables).map(([key, value]) => (
              <div key={key} className="preview-variable">
                <code className="variable-key">{key}:</code>
                <code className="variable-value">{value}</code>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 실제 렌더링 미리보기 */}
      <div className="preview-section">
        <span className="preview-label">미리보기:</span>
        <div className="preview-render-container">
          <div className={semanticClasses?.join(" ")} style={inlineStyle}>
            <p>Preview Content</p>
          </div>
        </div>
      </div>
    </div>
  );
}
