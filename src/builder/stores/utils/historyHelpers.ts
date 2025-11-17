/**
 * History Helper Functions for Multi-Select Operations
 * Phase 7: History Integration
 *
 * Helper functions to track multi-element operations in history
 */

import type { Element, ComponentElementProps } from "../../../types/builder/unified.types";
import { historyManager } from "../history";

/**
 * Track batch property update in history
 *
 * @param elementIds - IDs of elements being updated
 * @param updates - Property updates to apply
 * @param elementsMap - Map of all elements
 */
export function trackBatchUpdate(
  elementIds: string[],
  updates: Record<string, unknown>,
  elementsMap: Map<string, Element>
): void {
  if (elementIds.length === 0) return;

  // Collect previous props for all elements
  const batchUpdates = elementIds.map((id) => {
    const element = elementsMap.get(id);
    if (!element) return null;

    return {
      elementId: id,
      prevProps: element.props as ComponentElementProps,
      newProps: { ...element.props, ...updates } as ComponentElementProps,
    };
  }).filter((update): update is NonNullable<typeof update> => update !== null);

  if (batchUpdates.length === 0) return;

  // Add to history
  historyManager.addEntry({
    type: 'batch',
    elementId: elementIds[0], // Primary element for reference
    elementIds: elementIds,
    data: {
      batchUpdates,
    },
  });

  console.log(`✅ [History] Tracked batch update for ${batchUpdates.length} elements`);
}

/**
 * Track group creation in history
 *
 * @param groupElement - The created group element
 * @param childElements - Elements moved into the group
 */
export function trackGroupCreation(
  groupElement: Element,
  childElements: Element[]
): void {
  if (childElements.length === 0) return;

  historyManager.addEntry({
    type: 'group',
    elementId: groupElement.id,
    elementIds: childElements.map((el) => el.id),
    data: {
      element: groupElement,
      elements: childElements,
      groupData: {
        groupId: groupElement.id,
        childIds: childElements.map((el) => el.id),
      },
    },
  });

  console.log(`✅ [History] Tracked group creation: ${groupElement.id} with ${childElements.length} children`);
}

/**
 * Track ungroup operation in history
 *
 * @param groupId - ID of the group being ungrouped
 * @param childElements - Elements being moved out of the group
 * @param groupElement - The group element (for restoration)
 */
export function trackUngroup(
  groupId: string,
  childElements: Element[],
  groupElement: Element
): void {
  if (childElements.length === 0) return;

  historyManager.addEntry({
    type: 'ungroup',
    elementId: groupId,
    elementIds: childElements.map((el) => el.id),
    data: {
      element: groupElement, // Store group for redo
      prevElements: childElements, // Store previous state of children
      groupData: {
        groupId: groupId,
        childIds: childElements.map((el) => el.id),
      },
    },
  });

  console.log(`✅ [History] Tracked ungroup: ${groupId} with ${childElements.length} children`);
}

/**
 * Track multi-element delete in history
 *
 * @param elements - Elements being deleted
 */
export function trackMultiDelete(elements: Element[]): void {
  if (elements.length === 0) return;

  // For multi-delete, we track each element separately
  // This allows proper undo/redo with parent-child relationships
  elements.forEach((element) => {
    historyManager.addEntry({
      type: 'remove',
      elementId: element.id,
      data: {
        element: element,
        childElements: element.children as Element[] | undefined,
      },
    });
  });

  console.log(`✅ [History] Tracked multi-delete for ${elements.length} elements`);
}

/**
 * Track multi-element copy/paste in history
 *
 * ✅ 개선: 단일 batch entry로 추적 (여러 개별 entry 대신)
 * - Undo 시 한 번에 모든 요소 삭제
 * - Redo 시 한 번에 모든 요소 복원
 * - 히스토리 메모리 사용량 감소
 *
 * @param newElements - Newly pasted elements
 */
export function trackMultiPaste(newElements: Element[]): void {
  if (newElements.length === 0) return;

  // 단일 히스토리 entry로 모든 요소 추적
  // parent 요소와 나머지 요소들을 분리
  const [firstElement, ...restElements] = newElements;

  historyManager.addEntry({
    type: 'add',
    elementId: firstElement.id, // Primary element for reference
    elementIds: newElements.map(el => el.id), // All pasted element IDs
    data: {
      element: firstElement, // 첫 번째 요소 (primary)
      childElements: restElements, // 나머지 요소들 (모두 형제 관계일 수도 있음)
      elements: newElements, // 전체 요소 목록 (참고용)
    },
  });

  console.log(`✅ [History] Tracked multi-paste: single batch entry for ${newElements.length} elements`);
}

/**
 * Undo batch property update
 *
 * @param batchUpdates - Batch update data from history
 * @param updateElementProps - Function to update element props
 */
export async function undoBatchUpdate(
  batchUpdates: Array<{ elementId: string; prevProps: ComponentElementProps; newProps: ComponentElementProps }>,
  updateElementProps: (id: string, props: Record<string, unknown>) => Promise<void>
): Promise<void> {
  await Promise.all(
    batchUpdates.map((update) =>
      updateElementProps(update.elementId, update.prevProps as Record<string, unknown>)
    )
  );

  console.log(`✅ [History] Undid batch update for ${batchUpdates.length} elements`);
}

/**
 * Redo batch property update
 *
 * @param batchUpdates - Batch update data from history
 * @param updateElementProps - Function to update element props
 */
export async function redoBatchUpdate(
  batchUpdates: Array<{ elementId: string; prevProps: ComponentElementProps; newProps: ComponentElementProps }>,
  updateElementProps: (id: string, props: Record<string, unknown>) => Promise<void>
): Promise<void> {
  await Promise.all(
    batchUpdates.map((update) =>
      updateElementProps(update.elementId, update.newProps as Record<string, unknown>)
    )
  );

  console.log(`✅ [History] Redid batch update for ${batchUpdates.length} elements`);
}

/**
 * Undo group creation
 *
 * @param groupId - ID of the group to remove
 * @param childIds - IDs of children to restore
 * @param removeElement - Function to remove element
 * @param updateElement - Function to update element
 * @param elementsMap - Map of all elements
 */
export async function undoGroupCreation(
  groupId: string,
  childIds: string[],
  removeElement: (id: string) => Promise<void>,
  updateElement: (id: string, updates: Partial<Element>) => Promise<void>,
  elementsMap: Map<string, Element>
): Promise<void> {
  // Get group element to restore children's original parent_id
  const groupElement = elementsMap.get(groupId);
  const originalParentId = groupElement?.parent_id || null;

  // Restore children's original parent_id
  await Promise.all(
    childIds.map((childId) =>
      updateElement(childId, { parent_id: originalParentId })
    )
  );

  // Remove group
  await removeElement(groupId);

  console.log(`✅ [History] Undid group creation: ${groupId}`);
}

/**
 * Redo group creation
 *
 * @param groupElement - Group element to recreate
 * @param childIds - IDs of children to move into group
 * @param addElement - Function to add element
 * @param updateElement - Function to update element
 */
export async function redoGroupCreation(
  groupElement: Element,
  childIds: string[],
  addElement: (element: Element) => Promise<void>,
  updateElement: (id: string, updates: Partial<Element>) => Promise<void>
): Promise<void> {
  // Recreate group
  await addElement(groupElement);

  // Move children into group
  await Promise.all(
    childIds.map((childId) =>
      updateElement(childId, { parent_id: groupElement.id })
    )
  );

  console.log(`✅ [History] Redid group creation: ${groupElement.id}`);
}
