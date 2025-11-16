/**
 * Smart Selection Utilities
 * Phase 9: Advanced Features - Smart Selection
 *
 * AI-powered selection suggestions based on element relationships and patterns
 */

import type { Element } from "../../types/core/store.types";

/**
 * Selection suggestion type
 */
export type SelectionSuggestion =
  | "similar"      // Same tag and className
  | "siblings"     // Same parent
  | "children"     // All descendants
  | "parent"       // Parent element
  | "sameType"     // Same tag only
  | "sameClass"    // Same className only
  | "sameStyle";   // Similar style properties

/**
 * Suggestion result with metadata
 */
export interface SuggestionResult {
  type: SelectionSuggestion;
  elementIds: string[];
  count: number;
  description: string;
}

/**
 * Find similar elements (same tag and className)
 *
 * @param referenceId - Reference element ID
 * @param allElements - All elements in the page
 * @returns Array of similar element IDs
 */
export function selectSimilar(
  referenceId: string,
  allElements: Element[]
): string[] {
  const reference = allElements.find((el) => el.id === referenceId);
  if (!reference) return [];

  const referenceClassName = (reference.props.className as string) || "";

  return allElements
    .filter(
      (el) =>
        el.id !== referenceId &&
        el.tag === reference.tag &&
        (el.props.className as string || "") === referenceClassName
    )
    .map((el) => el.id);
}

/**
 * Find sibling elements (same parent)
 *
 * @param referenceId - Reference element ID
 * @param allElements - All elements in the page
 * @returns Array of sibling element IDs
 */
export function selectSiblings(
  referenceId: string,
  allElements: Element[]
): string[] {
  const reference = allElements.find((el) => el.id === referenceId);
  if (!reference) return [];

  return allElements
    .filter(
      (el) =>
        el.id !== referenceId &&
        el.parent_id === reference.parent_id
    )
    .map((el) => el.id);
}

/**
 * Find all child elements (descendants)
 *
 * @param referenceId - Reference element ID
 * @param allElements - All elements in the page
 * @returns Array of child element IDs
 */
export function selectChildren(
  referenceId: string,
  allElements: Element[]
): string[] {
  const childIds: string[] = [];

  // BFS to find all descendants
  const queue = [referenceId];
  const visited = new Set<string>([referenceId]);

  while (queue.length > 0) {
    const currentId = queue.shift()!;

    // Find children of current element
    const children = allElements.filter(
      (el) => el.parent_id === currentId && !visited.has(el.id)
    );

    children.forEach((child) => {
      childIds.push(child.id);
      visited.add(child.id);
      queue.push(child.id);
    });
  }

  return childIds;
}

/**
 * Find parent element
 *
 * @param referenceId - Reference element ID
 * @param allElements - All elements in the page
 * @returns Parent element ID or null
 */
export function selectParent(
  referenceId: string,
  allElements: Element[]
): string | null {
  const reference = allElements.find((el) => el.id === referenceId);
  if (!reference || !reference.parent_id) return null;

  return reference.parent_id;
}

/**
 * Find elements with same tag
 *
 * @param referenceId - Reference element ID
 * @param allElements - All elements in the page
 * @returns Array of element IDs with same tag
 */
export function selectSameType(
  referenceId: string,
  allElements: Element[]
): string[] {
  const reference = allElements.find((el) => el.id === referenceId);
  if (!reference) return [];

  return allElements
    .filter((el) => el.id !== referenceId && el.tag === reference.tag)
    .map((el) => el.id);
}

/**
 * Find elements with same className
 *
 * @param referenceId - Reference element ID
 * @param allElements - All elements in the page
 * @returns Array of element IDs with same className
 */
export function selectSameClass(
  referenceId: string,
  allElements: Element[]
): string[] {
  const reference = allElements.find((el) => el.id === referenceId);
  if (!reference) return [];

  const referenceClassName = (reference.props.className as string) || "";
  if (!referenceClassName) return [];

  return allElements
    .filter(
      (el) =>
        el.id !== referenceId &&
        (el.props.className as string || "") === referenceClassName
    )
    .map((el) => el.id);
}

/**
 * Find elements with similar style properties
 *
 * @param referenceId - Reference element ID
 * @param allElements - All elements in the page
 * @param threshold - Similarity threshold (0-1, default 0.7)
 * @returns Array of element IDs with similar styles
 */
export function selectSameStyle(
  referenceId: string,
  allElements: Element[],
  threshold: number = 0.7
): string[] {
  const reference = allElements.find((el) => el.id === referenceId);
  if (!reference) return [];

  const referenceStyle = (reference.props.style || {}) as Record<string, unknown>;
  const referenceKeys = Object.keys(referenceStyle);

  if (referenceKeys.length === 0) return [];

  return allElements
    .filter((el) => {
      if (el.id === referenceId) return false;

      const elStyle = (el.props.style || {}) as Record<string, unknown>;
      const elKeys = Object.keys(elStyle);

      if (elKeys.length === 0) return false;

      // Calculate similarity: matching keys / total keys
      const matchingKeys = referenceKeys.filter(
        (key) => referenceStyle[key] === elStyle[key]
      );

      const similarity = matchingKeys.length / Math.max(referenceKeys.length, elKeys.length);

      return similarity >= threshold;
    })
    .map((el) => el.id);
}

/**
 * Get all selection suggestions for a reference element
 *
 * @param referenceId - Reference element ID
 * @param allElements - All elements in the page
 * @returns Array of suggestion results
 */
export function getAllSuggestions(
  referenceId: string,
  allElements: Element[]
): SuggestionResult[] {
  const reference = allElements.find((el) => el.id === referenceId);
  if (!reference) return [];

  const suggestions: SuggestionResult[] = [];

  // Similar elements (tag + className)
  const similarIds = selectSimilar(referenceId, allElements);
  if (similarIds.length > 0) {
    suggestions.push({
      type: "similar",
      elementIds: similarIds,
      count: similarIds.length,
      description: `Similar elements (same tag and className)`,
    });
  }

  // Siblings
  const siblingIds = selectSiblings(referenceId, allElements);
  if (siblingIds.length > 0) {
    suggestions.push({
      type: "siblings",
      elementIds: siblingIds,
      count: siblingIds.length,
      description: `Siblings (same parent)`,
    });
  }

  // Children
  const childIds = selectChildren(referenceId, allElements);
  if (childIds.length > 0) {
    suggestions.push({
      type: "children",
      elementIds: childIds,
      count: childIds.length,
      description: `All children (descendants)`,
    });
  }

  // Parent
  const parentId = selectParent(referenceId, allElements);
  if (parentId) {
    suggestions.push({
      type: "parent",
      elementIds: [parentId],
      count: 1,
      description: `Parent element`,
    });
  }

  // Same type (tag only)
  const sameTypeIds = selectSameType(referenceId, allElements);
  if (sameTypeIds.length > 0) {
    suggestions.push({
      type: "sameType",
      elementIds: sameTypeIds,
      count: sameTypeIds.length,
      description: `Same type (${reference.tag})`,
    });
  }

  // Same className
  const sameClassIds = selectSameClass(referenceId, allElements);
  if (sameClassIds.length > 0) {
    const className = (reference.props.className as string) || "";
    suggestions.push({
      type: "sameClass",
      elementIds: sameClassIds,
      count: sameClassIds.length,
      description: `Same className (${className})`,
    });
  }

  // Similar style
  const sameStyleIds = selectSameStyle(referenceId, allElements, 0.7);
  if (sameStyleIds.length > 0) {
    suggestions.push({
      type: "sameStyle",
      elementIds: sameStyleIds,
      count: sameStyleIds.length,
      description: `Similar styles (70%+ match)`,
    });
  }

  return suggestions;
}
