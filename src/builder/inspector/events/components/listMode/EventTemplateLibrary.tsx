import { useState, useMemo } from "react";
import { TextField, Button } from "react-aria-components";
import {
  ALL_TEMPLATES,
  TEMPLATE_CATEGORIES,
  getTemplatesByCategory,
  searchTemplates,
  getRecommendedTemplates,
  type EventTemplate,
  type TemplateCategory
} from "../../data/eventTemplates";
import { TemplateCard } from "./TemplateCard";

export interface EventTemplateLibraryProps {
  componentType?: string;
  onApplyTemplate: (template: EventTemplate) => void;
}

/**
 * EventTemplateLibrary - Browse and apply event templates
 */
export function EventTemplateLibrary({
  componentType,
  onApplyTemplate
}: EventTemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory | "all">("all");

  // Get recommended templates for current component type
  const recommendedTemplates = useMemo(() => {
    if (!componentType) return [];
    return getRecommendedTemplates(componentType);
  }, [componentType]);

  // Filter templates based on search and category
  const filteredTemplates = useMemo(() => {
    let templates: EventTemplate[] = [];

    // Apply search filter
    if (searchQuery.trim().length > 0) {
      templates = searchTemplates(searchQuery.trim());
    } else if (selectedCategory === "all") {
      templates = ALL_TEMPLATES;
    } else {
      templates = getTemplatesByCategory(selectedCategory);
    }

    // Filter by component compatibility if provided
    if (componentType) {
      templates = templates.filter((template) => {
        if (!template.componentTypes) return true;
        return template.componentTypes.includes(componentType);
      });
    }

    // Sort by usage count
    return templates.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
  }, [searchQuery, selectedCategory, componentType]);

  const isSearching = searchQuery.trim().length > 0;

  return (
    <div className="event-template-library">
      {/* Search Field */}
      <TextField
        className="template-search-field"
        value={searchQuery}
        onChange={setSearchQuery}
      >
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input type="text" placeholder="Search templates..." />
          {searchQuery && (
            <Button
              className="react-aria-Button search-clear-button"
              onPress={() => setSearchQuery("")}
            >
              ✕
            </Button>
          )}
        </div>
      </TextField>

      {/* Category Filter (hidden during search) */}
      {!isSearching && (
        <div className="template-category-filter">
          <button
            className={`category-filter-button ${selectedCategory === "all" ? "selected" : ""}`}
            onClick={() => setSelectedCategory("all")}
          >
            All Templates
          </button>
          {Object.values(TEMPLATE_CATEGORIES).map((category) => (
            <button
              key={category.id}
              className={`category-filter-button ${selectedCategory === category.id ? "selected" : ""}`}
              onClick={() => setSelectedCategory(category.id)}
            >
              <span className="category-icon">{category.icon}</span>
              <span>{category.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Recommended Templates */}
      {!isSearching && componentType && recommendedTemplates.length > 0 && (
        <div className="recommended-templates-section">
          <div className="section-header">
            <span className="section-icon">⭐</span>
            <h3 className="section-title">Recommended for {componentType}</h3>
          </div>
          <div className="template-grid">
            {recommendedTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onApply={onApplyTemplate}
              />
            ))}
          </div>
        </div>
      )}

      {/* All Templates / Search Results */}
      <div className="templates-section">
        {isSearching && (
          <div className="section-header">
            <h3 className="section-title">
              Search Results ({filteredTemplates.length})
            </h3>
          </div>
        )}

        {filteredTemplates.length === 0 ? (
          <div className="empty-templates">
            {isSearching ? (
              <>
                <span className="empty-icon">🔍</span>
                <p className="empty-message">No templates found for "{searchQuery}"</p>
                <Button
                  className="react-aria-Button"
                  onPress={() => setSearchQuery("")}
                >
                  Clear Search
                </Button>
              </>
            ) : (
              <>
                <span className="empty-icon">📦</span>
                <p className="empty-message">No templates available</p>
              </>
            )}
          </div>
        ) : (
          <div className="template-grid">
            {filteredTemplates.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onApply={onApplyTemplate}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
