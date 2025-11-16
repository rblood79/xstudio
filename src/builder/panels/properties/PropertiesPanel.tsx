/**
 * PropertiesPanel - 속성 편집 패널
 *
 * PanelProps 인터페이스를 구현하여 패널 시스템과 통합
 * 요소별 속성 에디터를 동적으로 로드하여 표시
 */

import { useEffect, useState, useCallback, useMemo } from "react";
import type { ComponentType } from "react";
import type { PanelProps } from "../core/types";
import { getEditor } from "../../inspector/editors/registry";
import { useInspectorState } from "../../inspector/hooks/useInspectorState";
import type { ComponentEditorProps } from "../../inspector/types";
import { EmptyState, LoadingSpinner, PanelHeader, MultiSelectStatusIndicator, BatchPropertyEditor, SelectionFilter } from "../common";
import { Button } from "../../components";
import { Copy, ClipboardPaste } from "lucide-react";
import { iconProps } from "../../../utils/ui/uiConstants";
import { useKeyboardShortcutsRegistry } from "../../hooks/useKeyboardShortcutsRegistry";
import { useCopyPaste } from "../../hooks/useCopyPaste";
import { useStore } from "../../stores";
import { copyMultipleElements, pasteMultipleElements, serializeCopiedElements, deserializeCopiedElements } from "../../utils/multiElementCopy";
import { createGroupFromSelection, ungroupElement } from "../../stores/utils/elementGrouping";
import { alignElements } from "../../stores/utils/elementAlignment";
import type { AlignmentType } from "../../stores/utils/elementAlignment";
import { distributeElements } from "../../stores/utils/elementDistribution";
import type { DistributionType } from "../../stores/utils/elementDistribution";
import { trackBatchUpdate, trackGroupCreation, trackUngroup, trackMultiPaste } from "../../stores/utils/historyHelpers";
import "../../panels/common/index.css";

export function PropertiesPanel({ isActive }: PanelProps) {
  const selectedElement = useInspectorState((state) => state.selectedElement);
  const updateProperties = useInspectorState((state) => state.updateProperties);

  // ⭐ Multi-select state from store
  const selectedElementIds = useStore((state) => (state as any).selectedElementIds || []);
  const multiSelectMode = useStore((state) => (state as any).multiSelectMode || false);
  const elementsMap = useStore((state) => state.elementsMap);
  const elements = useStore((state) => state.elements);
  const currentPageId = useStore((state) => state.currentPageId);
  const removeElement = useStore((state) => state.removeElement);
  const setSelectedElement = useStore((state) => state.setSelectedElement);
  const updateElementProps = useStore((state) => state.updateElementProps);
  const addElement = useStore((state) => state.addElement);
  const updateElement = useStore((state) => state.updateElement);

  const [Editor, setEditor] =
    useState<ComponentType<ComponentEditorProps> | null>(null);
  const [loading, setLoading] = useState(true);

  // 요소 타입에 맞는 에디터 동적 로드
  useEffect(() => {
    let isMounted = true;

    if (!selectedElement) {
      // 비동기 상태 업데이트로 변경
      Promise.resolve().then(() => {
        if (isMounted) {
          setEditor(null);
          setLoading(false);
        }
      });
      return;
    }

    // 비동기로 처리하여 effect 내에서 직접 setState 호출 방지
    Promise.resolve().then(() => {
      if (!isMounted) return;

      setLoading(true);

      getEditor(selectedElement.type)
        .then((editor) => {
          if (isMounted) {
            setEditor(() => editor);
            setLoading(false);
          }
        })
        .catch((error) => {
          if (isMounted) {
            // Log error for debugging, but don't pollute console in production
            if (import.meta.env.DEV) {
              console.error(
                "[PropertiesPanel] Failed to load editor:",
                selectedElement.type,
                error
              );
            }
            setEditor(null);
            setLoading(false);
          }
        });
    });

    return () => {
      isMounted = false;
    };
  }, [selectedElement]);

  const handleUpdate = (updatedProps: Record<string, unknown>) => {
    // 한 번에 모든 속성 업데이트 (순차 업데이트로 인한 동기화 문제 방지)
    updateProperties(updatedProps);
  };

  // 🔥 최적화: useCopyPaste hook 사용
  const { copy: copyProperties, paste: pasteProperties } = useCopyPaste({
    onPaste: updateProperties,
    name: 'properties',
  });

  const handleCopyProperties = useCallback(async () => {
    if (!selectedElement?.properties) return;
    await copyProperties(selectedElement.properties);
    // TODO: Show toast notification
  }, [selectedElement, copyProperties]);

  const handlePasteProperties = useCallback(async () => {
    await pasteProperties();
    // TODO: Show toast notification
  }, [pasteProperties]);

  // ⭐ Multi-select quick actions
  const handleCopyAll = useCallback(async () => {
    console.log('[Copy] Starting copy operation...', { selectedElementIds });

    if (selectedElementIds.length === 0) {
      console.warn('[Copy] No elements selected');
      return;
    }

    try {
      // Copy elements with relationship preservation
      console.log('[Copy] Calling copyMultipleElements...');
      const copiedData = copyMultipleElements(selectedElementIds, elementsMap);
      console.log('[Copy] Copied data:', {
        elementCount: copiedData.elements.length,
        rootIds: copiedData.rootIds,
        externalParents: copiedData.externalParents.size,
      });

      // Serialize and copy to clipboard
      console.log('[Copy] Serializing to JSON...');
      const jsonData = serializeCopiedElements(copiedData);
      console.log('[Copy] JSON length:', jsonData.length, 'bytes');

      console.log('[Copy] Writing to clipboard...');
      await navigator.clipboard.writeText(jsonData);

      console.log(`✅ [Copy] Successfully copied ${selectedElementIds.length} elements to clipboard`);
      // TODO: Show toast notification
    } catch (error) {
      console.error('❌ [Copy] Failed to copy elements:', error);
      // TODO: Show error toast
    }
  }, [selectedElementIds, elementsMap]);

  const handlePasteAll = useCallback(async () => {
    console.log('[Paste] Starting paste operation...', { currentPageId });

    if (!currentPageId) {
      console.warn('[Paste] No current page selected');
      return;
    }

    try {
      // Read from clipboard
      console.log('[Paste] Reading from clipboard...');
      const clipboardText = await navigator.clipboard.readText();
      console.log('[Paste] Clipboard text length:', clipboardText.length, 'bytes');
      console.log('[Paste] First 100 chars:', clipboardText.substring(0, 100));

      // Deserialize
      console.log('[Paste] Deserializing clipboard data...');
      const copiedData = deserializeCopiedElements(clipboardText);
      if (!copiedData) {
        console.warn('[Paste] Clipboard does not contain valid XStudio element data');
        return;
      }

      console.log('[Paste] Deserialized data:', {
        elementCount: copiedData.elements.length,
        rootIds: copiedData.rootIds,
        externalParents: copiedData.externalParents.size,
      });

      // Paste with offset
      console.log('[Paste] Creating new elements with offset...');
      const newElements = pasteMultipleElements(copiedData, currentPageId, { x: 10, y: 10 });
      console.log('[Paste] New elements created:', newElements.length);

      if (newElements.length === 0) {
        console.warn('[Paste] No elements to paste');
        return;
      }

      // Add all new elements to store
      console.log('[Paste] Adding elements to store...');
      await Promise.all(newElements.map((element) => {
        console.log('[Paste] Adding element:', element.id, element.tag);
        return addElement(element);
      }));

      // ⭐ Phase 7: Track in history AFTER adding elements
      trackMultiPaste(newElements);

      console.log(`✅ [Paste] Successfully pasted ${newElements.length} elements`);
      // TODO: Show toast notification
    } catch (error) {
      console.error('❌ [Paste] Failed to paste elements:', error);
      // TODO: Show error toast
    }
  }, [currentPageId, addElement]);

  const handleDeleteAll = useCallback(async () => {
    // Confirm deletion
    if (!confirm(`${selectedElementIds.length}개 요소를 모두 삭제하시겠습니까?`)) {
      return;
    }

    // Delete all selected elements
    try {
      await Promise.all(selectedElementIds.map((id: string) => removeElement(id)));
      // TODO: Show toast notification
      console.log('Deleted all selected elements');
    } catch (error) {
      console.error('Failed to delete elements:', error);
      // TODO: Show error toast
    }
  }, [selectedElementIds, removeElement]);

  const handleClearSelection = useCallback(() => {
    setSelectedElement(null);
    console.log('Selection cleared');
  }, [setSelectedElement]);

  // ⭐ Batch property update handler
  const handleBatchUpdate = useCallback(async (updates: Record<string, unknown>) => {
    try {
      // ⭐ Phase 7: Track in history BEFORE applying updates
      trackBatchUpdate(selectedElementIds, updates, elementsMap);

      // Apply updates to all selected elements
      await Promise.all(
        selectedElementIds.map((id: string) => updateElementProps(id, updates))
      );
      console.log('Batch update applied to', selectedElementIds.length, 'elements');
      // TODO: Show toast notification
    } catch (error) {
      console.error('Failed to batch update properties:', error);
      // TODO: Show error toast
    }
  }, [selectedElementIds, updateElementProps, elementsMap]);

  // ⭐ Phase 3: Selection filter handler
  const handleFilteredElements = useCallback((filteredIds: string[]) => {
    const store = useStore.getState();
    const setSelectedElements = (store as any).setSelectedElements;

    if (setSelectedElements && filteredIds.length > 0) {
      setSelectedElements(filteredIds);
      console.log(`✅ [Filter] Applied filter, selected ${filteredIds.length} elements`);
    } else if (filteredIds.length === 0) {
      setSelectedElement(null);
      console.log('✅ [Filter] No elements match filter, cleared selection');
    }
  }, [setSelectedElement]);

  // ⭐ Get current page's elements for filter
  const currentPageElements = useMemo(() => {
    return elements.filter((el) => el.page_id === currentPageId);
  }, [elements, currentPageId]);

  // ⭐ Get selected elements from store
  const selectedElements = useMemo(() => {
    return selectedElementIds
      .map((id: string) => elementsMap.get(id))
      .filter((el): el is NonNullable<typeof el> => el !== undefined);
  }, [selectedElementIds, elementsMap]);

  // ⭐ Phase 6: Duplicate handler (Cmd+D)
  const handleDuplicate = useCallback(async () => {
    if (!multiSelectMode || selectedElementIds.length === 0 || !currentPageId) {
      console.warn('[Duplicate] No elements selected or no page active');
      return;
    }

    try {
      console.log(`[Duplicate] Duplicating ${selectedElementIds.length} elements`);

      // Copy current selection
      const copiedData = copyMultipleElements(selectedElementIds, elementsMap);

      // Paste with 10px offset (standard offset for duplicate)
      const newElements = pasteMultipleElements(copiedData, currentPageId, { x: 10, y: 10 });

      if (newElements.length === 0) {
        console.warn('[Duplicate] No elements to duplicate');
        return;
      }

      // Add all new elements to store
      await Promise.all(newElements.map((element) => addElement(element)));

      // ⭐ Track in history AFTER adding elements
      trackMultiPaste(newElements);

      // ⭐ Auto-select duplicated elements
      const newElementIds = newElements.map((el) => el.id);
      const store = useStore.getState();
      const setSelectedElements = (store as any).setSelectedElements;

      if (setSelectedElements) {
        setSelectedElements(newElementIds);
        console.log(`✅ [Duplicate] Duplicated and selected ${newElements.length} elements`);
      }

      // TODO: Show toast notification
    } catch (error) {
      console.error('❌ [Duplicate] Failed to duplicate elements:', error);
      // TODO: Show error toast
    }
  }, [multiSelectMode, selectedElementIds, currentPageId, elementsMap, addElement]);

  // ⭐ Phase 3: Advanced Selection - Select All (Cmd+A)
  const handleSelectAll = useCallback(() => {
    if (!currentPageId || elements.length === 0) {
      console.warn('[SelectAll] No elements to select');
      return;
    }

    // Get all element IDs from current page
    const allElementIds = elements
      .filter((el) => el.page_id === currentPageId)
      .map((el) => el.id);

    if (allElementIds.length === 0) {
      console.warn('[SelectAll] No elements on current page');
      return;
    }

    // Use store's setSelectedElements
    const store = useStore.getState();
    const setSelectedElements = (store as any).setSelectedElements;

    if (setSelectedElements) {
      setSelectedElements(allElementIds);
      console.log(`✅ [SelectAll] Selected ${allElementIds.length} elements`);
    }
  }, [currentPageId, elements]);

  // ⭐ Phase 3: Advanced Selection - Clear Selection (Esc)
  const handleEscapeClearSelection = useCallback(() => {
    setSelectedElement(null);
    console.log('✅ [Esc] Selection cleared');
  }, [setSelectedElement]);

  // ⭐ Phase 3: Advanced Selection - Tab Navigation
  const handleTabNavigation = useCallback((event: KeyboardEvent) => {
    if (!multiSelectMode || selectedElementIds.length === 0) return;

    event.preventDefault();

    const currentIndex = selectedElementIds.indexOf(selectedElement?.id || '');
    let nextIndex: number;

    if (event.shiftKey) {
      // Shift+Tab: Navigate backwards
      nextIndex = currentIndex <= 0 ? selectedElementIds.length - 1 : currentIndex - 1;
    } else {
      // Tab: Navigate forwards
      nextIndex = currentIndex >= selectedElementIds.length - 1 ? 0 : currentIndex + 1;
    }

    const nextElementId = selectedElementIds[nextIndex];
    const nextElement = elementsMap.get(nextElementId);

    if (nextElement) {
      setSelectedElement(nextElementId, nextElement.props as any);
      console.log(`✅ [Tab] Navigated to element ${nextIndex + 1}/${selectedElementIds.length}:`, nextElement.tag);
    }
  }, [multiSelectMode, selectedElementIds, selectedElement, elementsMap, setSelectedElement]);

  // ⭐ Phase 4: Group Selection (Cmd+G)
  const handleGroupSelection = useCallback(async () => {
    if (!multiSelectMode || selectedElementIds.length < 2 || !currentPageId) {
      console.warn('[Group] Need at least 2 elements selected');
      return;
    }

    try {
      console.log('[Group] Grouping', selectedElementIds.length, 'elements');

      // Create group from selection
      const { groupElement, updatedChildren } = createGroupFromSelection(
        selectedElementIds,
        elementsMap,
        currentPageId
      );

      // Add group to store
      await addElement(groupElement);

      // Update children with new parent_id
      await Promise.all(
        updatedChildren.map((child) => updateElement(child.id, child))
      );

      // ⭐ Phase 7: Track in history AFTER group creation
      trackGroupCreation(groupElement, updatedChildren);

      // Select the new group
      setSelectedElement(groupElement.id, groupElement.props as any);

      console.log(`✅ [Group] Created group ${groupElement.id}`);
    } catch (error) {
      console.error('❌ [Group] Failed to create group:', error);
    }
  }, [multiSelectMode, selectedElementIds, currentPageId, elementsMap, addElement, updateElement, setSelectedElement]);

  // ⭐ Phase 4: Ungroup Selection (Cmd+Shift+G)
  const handleUngroupSelection = useCallback(async () => {
    if (!selectedElement || selectedElement.tag !== 'Group') {
      console.warn('[Ungroup] Selected element is not a Group');
      return;
    }

    try {
      console.log('[Ungroup] Ungrouping element', selectedElement.id);

      // Store group element before deletion for history
      const groupElementForHistory = elementsMap.get(selectedElement.id);

      // Ungroup element
      const { updatedChildren, groupIdToDelete } = ungroupElement(
        selectedElement.id,
        elementsMap
      );

      // ⭐ Phase 7: Track in history BEFORE making changes
      if (groupElementForHistory) {
        trackUngroup(groupIdToDelete, updatedChildren, groupElementForHistory);
      }

      // Update children with new parent_id
      await Promise.all(
        updatedChildren.map((child) => updateElement(child.id, child))
      );

      // Delete group element
      await removeElement(groupIdToDelete);

      // Select first child
      if (updatedChildren.length > 0) {
        setSelectedElement(updatedChildren[0].id, updatedChildren[0].props as any);
      } else {
        setSelectedElement(null);
      }

      console.log(`✅ [Ungroup] Ungrouped ${updatedChildren.length} elements`);
    } catch (error) {
      console.error('❌ [Ungroup] Failed to ungroup:', error);
    }
  }, [selectedElement, elementsMap, updateElement, removeElement, setSelectedElement]);

  // ⭐ Phase 5.1: Element Alignment
  const handleAlign = useCallback(async (type: AlignmentType) => {
    if (!multiSelectMode || selectedElementIds.length < 2) {
      console.warn('[Alignment] Need at least 2 elements selected');
      return;
    }

    try {
      console.log(`[Alignment] Aligning ${selectedElementIds.length} elements to ${type}`);

      // Calculate alignment updates
      const updates = alignElements(selectedElementIds, elementsMap, type);

      if (updates.length === 0) {
        console.warn('[Alignment] No updates generated');
        return;
      }

      // Collect style updates for history tracking
      const styleUpdates: Record<string, Record<string, unknown>> = {};
      updates.forEach((update) => {
        styleUpdates[update.id] = update.style;
      });

      // ⭐ Track in history BEFORE applying updates
      trackBatchUpdate(selectedElementIds, styleUpdates, elementsMap);

      // Apply updates to each element
      await Promise.all(
        updates.map((update) => {
          const element = elementsMap.get(update.id);
          if (element) {
            const updatedStyle = {
              ...(element.props.style as Record<string, unknown> || {}),
              ...update.style,
            };
            return updateElementProps(update.id, { style: updatedStyle });
          }
          return Promise.resolve();
        })
      );

      console.log(`✅ [Alignment] Aligned ${updates.length} elements to ${type}`);
    } catch (error) {
      console.error('❌ [Alignment] Failed to align:', error);
    }
  }, [multiSelectMode, selectedElementIds, elementsMap, updateElementProps]);

  // ⭐ Phase 5.2: Element Distribution
  const handleDistribute = useCallback(async (type: DistributionType) => {
    if (!multiSelectMode || selectedElementIds.length < 3) {
      console.warn('[Distribution] Need at least 3 elements selected');
      return;
    }

    try {
      console.log(`[Distribution] Distributing ${selectedElementIds.length} elements ${type}ly`);

      // Calculate distribution updates
      const updates = distributeElements(selectedElementIds, elementsMap, type);

      if (updates.length === 0) {
        console.warn('[Distribution] No updates generated');
        return;
      }

      // Collect style updates for history tracking
      const styleUpdates: Record<string, Record<string, unknown>> = {};
      updates.forEach((update) => {
        styleUpdates[update.id] = update.style;
      });

      // ⭐ Track in history BEFORE applying updates
      trackBatchUpdate(selectedElementIds, styleUpdates, elementsMap);

      // Apply updates to each element
      await Promise.all(
        updates.map((update) => {
          const element = elementsMap.get(update.id);
          if (element) {
            const updatedStyle = {
              ...(element.props.style as Record<string, unknown> || {}),
              ...update.style,
            };
            return updateElementProps(update.id, { style: updatedStyle });
          }
          return Promise.resolve();
        })
      );

      console.log(`✅ [Distribution] Distributed ${updates.length} elements ${type}ly`);
    } catch (error) {
      console.error('❌ [Distribution] Failed to distribute:', error);
    }
  }, [multiSelectMode, selectedElementIds, elementsMap, updateElementProps]);

  // 🔥 최적화: 키보드 단축키를 useKeyboardShortcutsRegistry로 통합
  const shortcuts = useMemo(
    () => [
      {
        key: 'c',
        modifier: 'cmdShift' as const,
        handler: handleCopyProperties,
        description: 'Copy Properties',
      },
      {
        key: 'v',
        modifier: 'cmdShift' as const,
        handler: handlePasteProperties,
        description: 'Paste Properties',
      },
      // ⭐ Multi-element shortcuts
      {
        key: 'c',
        modifier: 'cmd' as const,
        handler: handleCopyAll,
        description: 'Copy All Elements',
      },
      {
        key: 'v',
        modifier: 'cmd' as const,
        handler: handlePasteAll,
        description: 'Paste Elements',
      },
      {
        key: 'd',
        modifier: 'cmd' as const,
        handler: handleDuplicate,
        description: 'Duplicate Selection',
      },
      // ⭐ Phase 3: Advanced Selection shortcuts
      {
        key: 'a',
        modifier: 'cmd' as const,
        handler: handleSelectAll,
        description: 'Select All',
      },
      {
        key: 'Escape',
        modifier: 'none' as const,
        handler: handleEscapeClearSelection,
        description: 'Clear Selection',
      },
      // ⭐ Phase 4: Grouping shortcuts
      {
        key: 'g',
        modifier: 'cmd' as const,
        handler: handleGroupSelection,
        description: 'Group Selection',
      },
      {
        key: 'g',
        modifier: 'cmdShift' as const,
        handler: handleUngroupSelection,
        description: 'Ungroup Selection',
      },
      // ⭐ Phase 5.1: Alignment shortcuts
      {
        key: 'l',
        modifier: 'cmdShift' as const,
        handler: () => handleAlign('left'),
        description: 'Align Left',
      },
      {
        key: 'h',
        modifier: 'cmdShift' as const,
        handler: () => handleAlign('center'),
        description: 'Align Horizontal Center',
      },
      {
        key: 'r',
        modifier: 'cmdShift' as const,
        handler: () => handleAlign('right'),
        description: 'Align Right',
      },
      {
        key: 't',
        modifier: 'cmdShift' as const,
        handler: () => handleAlign('top'),
        description: 'Align Top',
      },
      {
        key: 'm',
        modifier: 'cmdShift' as const,
        handler: () => handleAlign('middle'),
        description: 'Align Vertical Middle',
      },
      {
        key: 'b',
        modifier: 'cmdShift' as const,
        handler: () => handleAlign('bottom'),
        description: 'Align Bottom',
      },
      // ⭐ Phase 5.2: Distribution shortcuts
      {
        key: 'd',
        modifier: 'cmdShift' as const,
        handler: () => handleDistribute('horizontal'),
        description: 'Distribute Horizontally',
      },
      {
        key: 'v',
        modifier: 'cmdAltShift' as const,
        handler: () => handleDistribute('vertical'),
        description: 'Distribute Vertically',
      },
    ],
    [handleCopyProperties, handlePasteProperties, handleCopyAll, handlePasteAll, handleDuplicate, handleSelectAll, handleEscapeClearSelection, handleGroupSelection, handleUngroupSelection, handleAlign, handleDistribute]
  );

  useKeyboardShortcutsRegistry(shortcuts, [handleCopyProperties, handlePasteProperties, handleCopyAll, handlePasteAll, handleDuplicate, handleSelectAll, handleEscapeClearSelection, handleGroupSelection, handleUngroupSelection, handleAlign, handleDistribute]);

  // ⭐ Phase 3: Tab navigation (requires special handling)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab' && multiSelectMode && selectedElementIds.length > 0) {
        handleTabNavigation(event);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [multiSelectMode, selectedElementIds, handleTabNavigation]);

  // 활성 상태가 아니면 렌더링하지 않음 (성능 최적화)
  if (!isActive) {
    return null;
  }

  // 선택된 요소가 없으면 빈 상태 표시
  if (!selectedElement) {
    return <EmptyState message="요소를 선택하세요" />;
  }

  if (loading) {
    return (
      <LoadingSpinner
        message="에디터를 불러오는 중..."
        description={`${selectedElement.type} 속성 에디터 로드`}
      />
    );
  }

  if (!Editor) {
    return (
      <EmptyState
        message="사용 가능한 속성 에디터가 없습니다"
        description={`'${selectedElement.type}' 컴포넌트의 에디터를 찾을 수 없습니다.`}
      />
    );
  }

  return (
    <div className="properties-panel">
      <PanelHeader
        title={multiSelectMode ? `${selectedElementIds.length}개 요소 선택됨` : selectedElement.type}
        actions={
          <div className="panel-actions">
            <Button
              variant="ghost"
              size="sm"
              onPress={handleCopyProperties}
              aria-label="Copy properties"
              isDisabled={
                !selectedElement?.properties ||
                Object.keys(selectedElement.properties).length === 0
              }
            >
              <Copy
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onPress={handlePasteProperties}
              aria-label="Paste properties"
            >
              <ClipboardPaste
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </Button>
          </div>
        }
      />

      {/* ⭐ Multi-select status indicator */}
      {multiSelectMode && selectedElementIds.length > 1 && (
        <>
          <MultiSelectStatusIndicator
            count={selectedElementIds.length}
            primaryElementId={selectedElementIds[0]}
            primaryElementType={selectedElement?.type}
            onCopyAll={handleCopyAll}
            onPasteAll={handlePasteAll}
            onDeleteAll={handleDeleteAll}
            onClearSelection={handleClearSelection}
            onGroupSelection={handleGroupSelection}
            onAlign={handleAlign}
            onDistribute={handleDistribute}
          />

          {/* ⭐ Batch property editor for common properties */}
          <BatchPropertyEditor
            selectedElements={selectedElements}
            onBatchUpdate={handleBatchUpdate}
          />

          {/* ⭐ Phase 3: Selection filter for advanced filtering */}
          <SelectionFilter
            allElements={currentPageElements}
            onFilteredElements={handleFilteredElements}
          />
        </>
      )}

      <Editor
        elementId={selectedElement.id}
        currentProps={selectedElement.properties}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
