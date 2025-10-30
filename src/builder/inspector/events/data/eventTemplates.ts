import type { EventHandler, EventType, ActionType } from "../types";

/**
 * Event Template - 자주 사용되는 이벤트 패턴을 템플릿으로 제공
 */
export interface EventTemplate {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
  icon: string;
  events: EventHandler[];
  tags: string[];
  usageCount?: number;
  componentTypes?: string[]; // 호환 가능한 컴포넌트 타입
}

export type TemplateCategory = "form" | "navigation" | "ui" | "data";

export interface TemplateCategoryInfo {
  id: TemplateCategory;
  label: string;
  icon: string;
  description: string;
}

/**
 * Template Categories
 */
export const TEMPLATE_CATEGORIES: Record<TemplateCategory, TemplateCategoryInfo> = {
  form: {
    id: "form",
    label: "Form Actions",
    icon: "📝",
    description: "Form validation, submission, and data handling"
  },
  navigation: {
    id: "navigation",
    label: "Navigation",
    icon: "🧭",
    description: "Page navigation and scrolling"
  },
  ui: {
    id: "ui",
    label: "UI Controls",
    icon: "🎨",
    description: "Modals, toasts, and visibility toggles"
  },
  data: {
    id: "data",
    label: "Data Operations",
    icon: "💾",
    description: "API calls, data fetching, and state management"
  }
};

/**
 * Helper function to create event template
 */
function createTemplate(
  id: string,
  name: string,
  description: string,
  category: TemplateCategory,
  icon: string,
  events: Array<{ type: EventType; actions: Array<{ type: ActionType; config: any }> }>,
  tags: string[],
  componentTypes?: string[],
  usageCount?: number
): EventTemplate {
  return {
    id,
    name,
    description,
    category,
    icon,
    events: events.map((event) => ({
      id: `${id}-${event.type}`,
      type: event.type,
      actions: event.actions.map((action, idx) => ({
        id: `${id}-${event.type}-action-${idx}`,
        type: action.type,
        config: action.config
      }))
    })),
    tags,
    componentTypes,
    usageCount
  };
}

/**
 * Form Templates
 */
export const FORM_TEMPLATES: EventTemplate[] = [
  createTemplate(
    "form-validation",
    "Form Validation",
    "Validate form inputs and show error messages",
    "form",
    "✅",
    [
      {
        type: "onSubmit",
        actions: [
          { type: "validateForm", config: { showErrors: true } },
          { type: "showToast", config: { message: "Form validated successfully", variant: "success" } }
        ]
      }
    ],
    ["validation", "error", "form"],
    ["Form", "TextField", "TextArea"],
    95
  ),

  createTemplate(
    "form-submit-api",
    "Submit to API",
    "Validate and submit form data to API endpoint",
    "form",
    "📤",
    [
      {
        type: "onSubmit",
        actions: [
          { type: "validateForm", config: { showErrors: true } },
          {
            type: "apiCall",
            config: {
              method: "POST",
              endpoint: "/api/submit",
              successMessage: "Form submitted successfully"
            }
          },
          { type: "showToast", config: { message: "Submitted!", variant: "success" } }
        ]
      }
    ],
    ["submit", "api", "post", "form"],
    ["Form", "Button"],
    88
  ),

  createTemplate(
    "form-reset",
    "Reset Form",
    "Clear all form fields and reset to initial values",
    "form",
    "🔄",
    [
      {
        type: "onClick",
        actions: [
          { type: "resetForm", config: {} },
          { type: "showToast", config: { message: "Form reset", variant: "info" } }
        ]
      }
    ],
    ["reset", "clear", "form"],
    ["Button"],
    72
  ),

  createTemplate(
    "form-autosave",
    "Auto-save Form",
    "Automatically save form data on input change",
    "form",
    "💾",
    [
      {
        type: "onChange",
        actions: [
          { type: "setState", config: { key: "formData", value: "{{value}}" } },
          {
            type: "apiCall",
            config: {
              method: "PUT",
              endpoint: "/api/autosave",
              debounce: 1000
            }
          }
        ]
      }
    ],
    ["autosave", "draft", "form"],
    ["TextField", "TextArea", "Form"],
    65
  )
];

/**
 * Navigation Templates
 */
export const NAVIGATION_TEMPLATES: EventTemplate[] = [
  createTemplate(
    "nav-page",
    "Navigate to Page",
    "Navigate to another page on click",
    "navigation",
    "➡️",
    [
      {
        type: "onClick",
        actions: [
          { type: "navigate", config: { path: "/page", openInNewTab: false } }
        ]
      }
    ],
    ["navigate", "link", "page"],
    ["Button", "Link", "Card"],
    92
  ),

  createTemplate(
    "nav-scroll-section",
    "Scroll to Section",
    "Smooth scroll to a specific section",
    "navigation",
    "⬇️",
    [
      {
        type: "onClick",
        actions: [
          { type: "scrollTo", config: { target: "#section-id", behavior: "smooth" } }
        ]
      }
    ],
    ["scroll", "anchor", "section"],
    ["Button", "Link"],
    78
  ),

  createTemplate(
    "nav-back",
    "Back Button",
    "Navigate to previous page",
    "navigation",
    "⬅️",
    [
      {
        type: "onClick",
        actions: [
          { type: "navigate", config: { path: "{{history.back}}", openInNewTab: false } }
        ]
      }
    ],
    ["back", "previous", "history"],
    ["Button"],
    70
  ),

  createTemplate(
    "nav-external-link",
    "Open External Link",
    "Open external URL in new tab",
    "navigation",
    "🔗",
    [
      {
        type: "onClick",
        actions: [
          { type: "navigate", config: { path: "https://example.com", openInNewTab: true } }
        ]
      }
    ],
    ["external", "link", "new tab"],
    ["Button", "Link"],
    65
  )
];

/**
 * UI Templates
 */
export const UI_TEMPLATES: EventTemplate[] = [
  createTemplate(
    "ui-open-modal",
    "Open Modal",
    "Show modal dialog on click",
    "ui",
    "📱",
    [
      {
        type: "onClick",
        actions: [
          { type: "showModal", config: { modalId: "modal-id" } }
        ]
      }
    ],
    ["modal", "dialog", "popup"],
    ["Button", "Link", "Card"],
    90
  ),

  createTemplate(
    "ui-close-modal",
    "Close Modal",
    "Close modal dialog",
    "ui",
    "❌",
    [
      {
        type: "onClick",
        actions: [
          { type: "hideModal", config: { modalId: "modal-id" } }
        ]
      }
    ],
    ["modal", "close", "dismiss"],
    ["Button"],
    85
  ),

  createTemplate(
    "ui-toast-notification",
    "Show Toast",
    "Display toast notification message",
    "ui",
    "🔔",
    [
      {
        type: "onClick",
        actions: [
          { type: "showToast", config: { message: "Action completed", variant: "success", duration: 3000 } }
        ]
      }
    ],
    ["toast", "notification", "alert"],
    ["Button"],
    82
  ),

  createTemplate(
    "ui-toggle-visibility",
    "Toggle Element",
    "Show/hide element on click",
    "ui",
    "👁️",
    [
      {
        type: "onClick",
        actions: [
          { type: "toggleVisibility", config: { targetId: "element-id" } }
        ]
      }
    ],
    ["toggle", "show", "hide", "visibility"],
    ["Button", "Link"],
    75
  ),

  createTemplate(
    "ui-copy-clipboard",
    "Copy to Clipboard",
    "Copy text to clipboard and show confirmation",
    "ui",
    "📋",
    [
      {
        type: "onClick",
        actions: [
          { type: "copyToClipboard", config: { text: "{{value}}" } },
          { type: "showToast", config: { message: "Copied to clipboard!", variant: "success" } }
        ]
      }
    ],
    ["copy", "clipboard", "text"],
    ["Button"],
    68
  )
];

/**
 * Data Templates
 */
export const DATA_TEMPLATES: EventTemplate[] = [
  createTemplate(
    "data-fetch-load",
    "Fetch Data on Load",
    "Load data from API when component mounts",
    "data",
    "📥",
    [
      {
        type: "onLoad",
        actions: [
          {
            type: "apiCall",
            config: {
              method: "GET",
              endpoint: "/api/data",
              storeIn: "pageData"
            }
          }
        ]
      }
    ],
    ["fetch", "load", "api", "data"],
    ["ListBox", "GridList", "Select", "ComboBox", "Table"],
    80
  ),

  createTemplate(
    "data-refresh",
    "Refresh Data",
    "Reload data from API on click",
    "data",
    "🔄",
    [
      {
        type: "onClick",
        actions: [
          {
            type: "apiCall",
            config: {
              method: "GET",
              endpoint: "/api/data",
              storeIn: "pageData"
            }
          },
          { type: "showToast", config: { message: "Data refreshed", variant: "info" } }
        ]
      }
    ],
    ["refresh", "reload", "api"],
    ["Button"],
    76
  ),

  createTemplate(
    "data-filter",
    "Filter Data",
    "Filter collection based on input",
    "data",
    "🔍",
    [
      {
        type: "onChange",
        actions: [
          { type: "setState", config: { key: "filterQuery", value: "{{value}}" } },
          { type: "customFunction", config: { functionName: "filterData", params: { query: "{{value}}" } } }
        ]
      }
    ],
    ["filter", "search", "query"],
    ["TextField", "ComboBox"],
    70
  ),

  createTemplate(
    "data-selection-action",
    "Handle Selection",
    "Execute action when item is selected",
    "data",
    "✓",
    [
      {
        type: "onSelectionChange",
        actions: [
          { type: "setState", config: { key: "selectedItem", value: "{{selection}}" } },
          { type: "showToast", config: { message: "Item selected", variant: "info" } }
        ]
      }
    ],
    ["selection", "select", "choose"],
    ["ListBox", "GridList", "Select", "ComboBox"],
    85
  ),

  createTemplate(
    "data-delete-confirm",
    "Delete with Confirmation",
    "Show confirmation modal before deleting",
    "data",
    "🗑️",
    [
      {
        type: "onClick",
        actions: [
          { type: "showModal", config: { modalId: "confirm-delete-modal" } }
        ]
      },
      {
        type: "onAction",
        actions: [
          {
            type: "apiCall",
            config: {
              method: "DELETE",
              endpoint: "/api/items/{{id}}",
              successMessage: "Item deleted"
            }
          },
          { type: "hideModal", config: {} },
          { type: "showToast", config: { message: "Deleted successfully", variant: "success" } }
        ]
      }
    ],
    ["delete", "remove", "confirm"],
    ["Button"],
    72
  )
];

/**
 * All Templates
 */
export const ALL_TEMPLATES: EventTemplate[] = [
  ...FORM_TEMPLATES,
  ...NAVIGATION_TEMPLATES,
  ...UI_TEMPLATES,
  ...DATA_TEMPLATES
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: TemplateCategory): EventTemplate[] {
  return ALL_TEMPLATES.filter((template) => template.category === category);
}

/**
 * Get template by id
 */
export function getTemplateById(id: string): EventTemplate | undefined {
  return ALL_TEMPLATES.find((template) => template.id === id);
}

/**
 * Search templates by query
 */
export function searchTemplates(query: string): EventTemplate[] {
  const lowerQuery = query.toLowerCase();

  return ALL_TEMPLATES.filter((template) => {
    return (
      template.name.toLowerCase().includes(lowerQuery) ||
      template.description.toLowerCase().includes(lowerQuery) ||
      template.tags.some((tag) => tag.toLowerCase().includes(lowerQuery))
    );
  });
}

/**
 * Get recommended templates for component type
 */
export function getRecommendedTemplates(componentType: string): EventTemplate[] {
  return ALL_TEMPLATES
    .filter((template) => {
      if (!template.componentTypes) return false;
      return template.componentTypes.includes(componentType);
    })
    .sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0))
    .slice(0, 5); // Top 5 recommendations
}
