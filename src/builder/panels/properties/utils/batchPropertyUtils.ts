/**
 * Batch Property Editor Utilities
 * Phase 2: Multi-Element Editing - Batch Property Editor
 *
 * Utilities for finding and managing common properties across multiple elements
 */

import type { Element } from "../../../../types/core/store.types";

/**
 * Property value info with mixed state detection
 */
export interface PropertyValue {
  /** Property key */
  key: string;
  /** Property value (or first value if mixed) */
  value: unknown;
  /** Whether values are mixed across elements */
  isMixed: boolean;
  /** All unique values (only populated if isMixed) */
  uniqueValues?: unknown[];
}

/**
 * Common properties result
 */
export interface CommonProperties {
  /** Properties that exist in all elements */
  commonProps: PropertyValue[];
  /** Total number of selected elements */
  elementCount: number;
  /** Element types (unique) */
  elementTypes: string[];
}

/**
 * Find common properties across multiple elements
 *
 * @param elements - Array of elements to analyze
 * @returns Common properties with mixed state detection
 */
export function findCommonProperties(elements: Element[]): CommonProperties {
  if (elements.length === 0) {
    return {
      commonProps: [],
      elementCount: 0,
      elementTypes: [],
    };
  }

  // Get unique element types
  const elementTypes = Array.from(new Set(elements.map((el) => el.tag)));

  // Get all property keys from first element
  const firstElement = elements[0];
  const firstProps = firstElement.props || {};
  const firstKeys = Object.keys(firstProps);

  // Find keys that exist in ALL elements
  const commonKeys = firstKeys.filter((key) => {
    return elements.every((el) => key in (el.props || {}));
  });

  // Build PropertyValue array with mixed state detection
  const commonProps: PropertyValue[] = commonKeys.map((key) => {
    // Get all values for this key
    const values = elements.map((el) => (el.props || {})[key]);

    // Check if all values are the same (deep equality for objects/arrays)
    const firstValue = values[0];
    const allSame = values.every((val) => {
      // Deep equality check
      return JSON.stringify(val) === JSON.stringify(firstValue);
    });

    if (allSame) {
      return {
        key,
        value: firstValue,
        isMixed: false,
      };
    } else {
      // Mixed values - collect unique values
      const uniqueValues = Array.from(
        new Set(values.map((val) => JSON.stringify(val)))
      ).map((str) => JSON.parse(str));

      return {
        key,
        value: firstValue, // Use first value as default
        isMixed: true,
        uniqueValues,
      };
    }
  });

  return {
    commonProps,
    elementCount: elements.length,
    elementTypes,
  };
}

/**
 * Filter properties by category
 *
 * @param props - Property values to filter
 * @param category - Category to filter by
 * @returns Filtered properties
 */
export function filterPropertiesByCategory(
  props: PropertyValue[],
  category: "layout" | "style" | "content" | "all"
): PropertyValue[] {
  if (category === "all") {
    return props;
  }

  // Common layout properties
  const layoutProps = ["display", "flexDirection", "justifyContent", "alignItems", "gap", "width", "height", "padding", "margin"];

  // Common style properties
  const styleProps = ["backgroundColor", "color", "border", "borderRadius", "boxShadow", "opacity"];

  // Common content properties
  const contentProps = ["children", "label", "placeholder", "value", "defaultValue"];

  const categoryMap = {
    layout: layoutProps,
    style: styleProps,
    content: contentProps,
  };

  const relevantKeys = categoryMap[category];

  return props.filter((prop) => relevantKeys.includes(prop.key));
}

/**
 * Check if a property value is editable in batch mode
 * Some properties (like id, customId) should not be batch-editable
 *
 * @param key - Property key
 * @returns Whether the property is batch-editable
 */
export function isBatchEditable(key: string): boolean {
  const nonEditableProps = ["id", "customId", "key", "data-element-id"];
  return !nonEditableProps.includes(key);
}
