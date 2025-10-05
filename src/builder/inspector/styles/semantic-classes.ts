import type { SemanticClassCategory } from "../types";

/**
 * 의미 클래스 카탈로그
 * components.css에 정의된 클래스들을 관리
 */
export const semanticClassCategories: SemanticClassCategory[] = [
  {
    id: "containers",
    label: "Containers",
    icon: "📦",
    classes: [
      {
        value: "card",
        label: "Card",
        category: "containers",
        description: "Card container with border and shadow",
      },
      {
        value: "panel",
        label: "Panel",
        category: "containers",
        description: "Panel with background",
      },
      {
        value: "surface",
        label: "Surface",
        category: "containers",
        description: "Surface level container",
      },
      {
        value: "section",
        label: "Section",
        category: "containers",
        description: "Section container",
      },
    ],
  },
  {
    id: "layouts",
    label: "Layouts",
    icon: "📐",
    classes: [
      {
        value: "flex-row",
        label: "Flex Row",
        category: "layouts",
        description: "Horizontal flex layout",
      },
      {
        value: "flex-col",
        label: "Flex Column",
        category: "layouts",
        description: "Vertical flex layout",
      },
      {
        value: "flex-center",
        label: "Flex Center",
        category: "layouts",
        description: "Centered flex layout",
      },
      {
        value: "flex-between",
        label: "Flex Between",
        category: "layouts",
        description: "Space between flex layout",
      },
      {
        value: "grid-2",
        label: "Grid 2 Columns",
        category: "layouts",
        description: "2-column grid",
      },
      {
        value: "grid-3",
        label: "Grid 3 Columns",
        category: "layouts",
        description: "3-column grid",
      },
      {
        value: "grid-4",
        label: "Grid 4 Columns",
        category: "layouts",
        description: "4-column grid",
      },
      {
        value: "stack",
        label: "Stack",
        category: "layouts",
        description: "Vertical stack with gap",
      },
    ],
  },
  {
    id: "spacing",
    label: "Spacing",
    icon: "📏",
    classes: [
      {
        value: "gap-xs",
        label: "Gap XS",
        category: "spacing",
        description: "var(--spacing-1)",
      },
      {
        value: "gap-sm",
        label: "Gap Small",
        category: "spacing",
        description: "var(--spacing-2)",
      },
      {
        value: "gap-md",
        label: "Gap Medium",
        category: "spacing",
        description: "var(--spacing-4)",
      },
      {
        value: "gap-lg",
        label: "Gap Large",
        category: "spacing",
        description: "var(--spacing-6)",
      },
      {
        value: "gap-xl",
        label: "Gap XL",
        category: "spacing",
        description: "var(--spacing-8)",
      },
      {
        value: "padding-xs",
        label: "Padding XS",
        category: "spacing",
        description: "var(--spacing-1)",
      },
      {
        value: "padding-sm",
        label: "Padding Small",
        category: "spacing",
        description: "var(--spacing-2)",
      },
      {
        value: "padding-md",
        label: "Padding Medium",
        category: "spacing",
        description: "var(--spacing-4)",
      },
      {
        value: "padding-lg",
        label: "Padding Large",
        category: "spacing",
        description: "var(--spacing-6)",
      },
      {
        value: "padding-xl",
        label: "Padding XL",
        category: "spacing",
        description: "var(--spacing-8)",
      },
    ],
  },
  {
    id: "effects",
    label: "Effects",
    icon: "✨",
    classes: [
      {
        value: "elevated",
        label: "Elevated",
        category: "effects",
        description: "Shadow elevation",
      },
      {
        value: "bordered",
        label: "Bordered",
        category: "effects",
        description: "With border",
      },
      {
        value: "rounded",
        label: "Rounded",
        category: "effects",
        description: "Border radius",
      },
      {
        value: "rounded-sm",
        label: "Rounded Small",
        category: "effects",
        description: "Small border radius",
      },
      {
        value: "rounded-lg",
        label: "Rounded Large",
        category: "effects",
        description: "Large border radius",
      },
      {
        value: "rounded-full",
        label: "Rounded Full",
        category: "effects",
        description: "Fully rounded",
      },
    ],
  },
  {
    id: "typography",
    label: "Typography",
    icon: "📝",
    classes: [
      {
        value: "text-xs",
        label: "Text XS",
        category: "typography",
        description: "Extra small text",
      },
      {
        value: "text-sm",
        label: "Text Small",
        category: "typography",
        description: "Small text",
      },
      {
        value: "text-md",
        label: "Text Medium",
        category: "typography",
        description: "Medium text",
      },
      {
        value: "text-lg",
        label: "Text Large",
        category: "typography",
        description: "Large text",
      },
      {
        value: "text-xl",
        label: "Text XL",
        category: "typography",
        description: "Extra large text",
      },
      {
        value: "font-normal",
        label: "Font Normal",
        category: "typography",
        description: "Normal font weight",
      },
      {
        value: "font-medium",
        label: "Font Medium",
        category: "typography",
        description: "Medium font weight",
      },
      {
        value: "font-semibold",
        label: "Font Semibold",
        category: "typography",
        description: "Semibold font weight",
      },
      {
        value: "font-bold",
        label: "Font Bold",
        category: "typography",
        description: "Bold font weight",
      },
      {
        value: "text-left",
        label: "Text Left",
        category: "typography",
        description: "Left aligned text",
      },
      {
        value: "text-center",
        label: "Text Center",
        category: "typography",
        description: "Center aligned text",
      },
      {
        value: "text-right",
        label: "Text Right",
        category: "typography",
        description: "Right aligned text",
      },
    ],
  },
  {
    id: "colors",
    label: "Colors",
    icon: "🎨",
    classes: [
      {
        value: "text-primary",
        label: "Text Primary",
        category: "colors",
        description: "Primary text color",
      },
      {
        value: "text-secondary",
        label: "Text Secondary",
        category: "colors",
        description: "Secondary text color",
      },
      {
        value: "text-muted",
        label: "Text Muted",
        category: "colors",
        description: "Muted text color",
      },
      {
        value: "bg-primary",
        label: "BG Primary",
        category: "colors",
        description: "Primary background",
      },
      {
        value: "bg-secondary",
        label: "BG Secondary",
        category: "colors",
        description: "Secondary background",
      },
      {
        value: "bg-surface",
        label: "BG Surface",
        category: "colors",
        description: "Surface background",
      },
      {
        value: "bg-muted",
        label: "BG Muted",
        category: "colors",
        description: "Muted background",
      },
    ],
  },
];

/**
 * 모든 의미 클래스 목록 (플랫)
 */
export const allSemanticClasses = semanticClassCategories.flatMap(
  (cat) => cat.classes
);

/**
 * 클래스 검색
 */
export function searchSemanticClasses(query: string) {
  const lowerQuery = query.toLowerCase();
  return allSemanticClasses.filter(
    (cls) =>
      cls.value.toLowerCase().includes(lowerQuery) ||
      cls.label.toLowerCase().includes(lowerQuery) ||
      cls.description?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * 카테고리별 클래스 조회
 */
export function getClassesByCategory(categoryId: string) {
  const category = semanticClassCategories.find((cat) => cat.id === categoryId);
  return category?.classes || [];
}
