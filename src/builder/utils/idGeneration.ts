import type { Element } from "../../types/unified";

/**
 * Generates a unique custom ID for a component based on its tag
 * Format: {tag}_{number} (e.g., button_1, select_2, textfield_3)
 *
 * @param tag - Component tag name (e.g., "Button", "Select")
 * @param pageElements - All elements in the current page
 * @returns Generated custom ID (e.g., "button_1")
 */
export function generateCustomId(
  tag: string,
  pageElements: Element[]
): string {
  // Convert tag to lowercase for ID format
  const tagLower = tag.toLowerCase();

  // Find all existing elements with the same tag
  const sameTagElements = pageElements.filter((el) => el.tag === tag);

  // Extract existing numbers from customIds
  const existingNumbers: number[] = [];
  const idPattern = new RegExp(`^${tagLower}_(\\d+)$`);

  sameTagElements.forEach((el) => {
    if (el.customId) {
      const match = el.customId.match(idPattern);
      if (match) {
        existingNumbers.push(Number.parseInt(match[1], 10));
      }
    }
  });

  // Find the next available number
  let nextNumber = 1;
  if (existingNumbers.length > 0) {
    // Sort numbers and find the first gap, or use max + 1
    existingNumbers.sort((a, b) => a - b);

    // Find first gap in sequence
    for (let i = 0; i < existingNumbers.length; i++) {
      if (existingNumbers[i] !== i + 1) {
        nextNumber = i + 1;
        break;
      }
    }

    // If no gap found, use max + 1
    if (nextNumber === 1 && existingNumbers.length > 0) {
      nextNumber = Math.max(...existingNumbers) + 1;
    }
  }

  return `${tagLower}_${nextNumber}`;
}
