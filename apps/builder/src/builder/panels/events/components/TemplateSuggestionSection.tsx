import { useState, useMemo } from "react";
import { BookOpen } from "lucide-react";
import { getRecommendedTemplates } from "../data/eventTemplates";
import type { EventTemplate } from "../data/eventTemplates";
import type { EventHandler } from "../types/eventTypes";

export interface TemplateSuggestionSectionProps {
  componentType: string;
  currentHandlers: EventHandler[];
  onApplyTemplate: (template: EventTemplate) => void;
  maxVisible?: number;
}

/**
 * TemplateSuggestionSection - Recipe template cards for one-click event+action setup
 *
 * Shows recommended templates based on the selected component type.
 * Templates with events that already exist in currentHandlers show a "merge" badge.
 */
export function TemplateSuggestionSection({
  componentType,
  currentHandlers,
  onApplyTemplate,
  maxVisible = 3,
}: TemplateSuggestionSectionProps) {
  const [showAll, setShowAll] = useState(false);

  const templates = useMemo(
    () => getRecommendedTemplates(componentType),
    [componentType]
  );

  const currentEventTypes = useMemo(
    () => new Set(currentHandlers.map((h) => h.event)),
    [currentHandlers]
  );

  if (templates.length === 0) {
    return null;
  }

  const visibleTemplates = showAll
    ? templates
    : templates.slice(0, maxVisible);

  const hasMore = templates.length > maxVisible;

  function hasMergeConflict(template: EventTemplate): boolean {
    return template.events.some((evt) => currentEventTypes.has(evt.event));
  }

  return (
    <div className="template-suggestion-section">
      <div className="template-suggestion-header">
        <BookOpen size={14} />
        <span>Quick Setup</span>
      </div>

      <div className="template-suggestion-list">
        {visibleTemplates.map((template) => (
          <button
            key={template.id}
            className="template-suggestion-card"
            type="button"
            onClick={() => onApplyTemplate(template)}
          >
            <span className="template-icon"><template.icon size={14} /></span>
            <div className="template-info">
              <span className="template-name">{template.name}</span>
              <span className="template-desc">
                &mdash; {template.description}
              </span>
            </div>
            {hasMergeConflict(template) && (
              <span className="template-merge-badge">merge</span>
            )}
          </button>
        ))}
      </div>

      {hasMore && (
        <button
          className="template-show-more"
          type="button"
          onClick={() => setShowAll((prev) => !prev)}
        >
          {showAll
            ? "Show less"
            : `Show all (${templates.length})`}
        </button>
      )}
    </div>
  );
}
