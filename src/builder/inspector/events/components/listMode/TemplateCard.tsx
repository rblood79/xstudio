import { Button } from "react-aria-components";
import type { EventTemplate } from "../../data/eventTemplates";

export interface TemplateCardProps {
  template: EventTemplate;
  onApply: (template: EventTemplate) => void;
}

/**
 * TemplateCard - Individual template card component
 */
export function TemplateCard({ template, onApply }: TemplateCardProps) {
  // Calculate total actions across all events
  const totalActions = template.events.reduce(
    (sum, event) => sum + event.actions.length,
    0
  );

  return (
    <div className="template-card">
      <div className="template-card-header">
        <span className="template-icon">{template.icon}</span>
        <div className="template-title-section">
          <h4 className="template-name">{template.name}</h4>
          {template.usageCount && (
            <span className="template-usage">{template.usageCount}% usage</span>
          )}
        </div>
      </div>

      <p className="template-description">{template.description}</p>

      <div className="template-metadata">
        <div className="template-stat">
          <span className="stat-icon">⚡</span>
          <span className="stat-text">
            {template.events.length} event{template.events.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="template-stat">
          <span className="stat-icon">🎯</span>
          <span className="stat-text">
            {totalActions} action{totalActions !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {template.componentTypes && template.componentTypes.length > 0 && (
        <div className="template-compatible">
          <span className="compatible-label">Works with:</span>
          <div className="compatible-tags">
            {template.componentTypes.slice(0, 3).map((type) => (
              <span key={type} className="compatible-tag">
                {type}
              </span>
            ))}
            {template.componentTypes.length > 3 && (
              <span className="compatible-tag-more">
                +{template.componentTypes.length - 3}
              </span>
            )}
          </div>
        </div>
      )}

      <Button
        className="react-aria-Button template-apply-button"
        onPress={() => onApply(template)}
      >
        Apply Template
      </Button>
    </div>
  );
}
