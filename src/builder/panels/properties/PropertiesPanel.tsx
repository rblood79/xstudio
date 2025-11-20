/**
 * PropertiesPanel - 속성 편집 패널
 *
 * PanelProps 인터페이스를 구현하여 패널 시스템과 통합
 * 요소별 속성 에디터를 동적으로 로드하여 표시
 * 
 * ⭐ 최적화: PropertyEditorWrapper로 Editor 렌더링 분리
 */

import { useEffect, useState, useCallback, useMemo, memo } from "react";
import type { ComponentType } from "react";
import type { PanelProps } from "../core/types";
import { getEditor } from "../../inspector/editors/registry";
import { useInspectorState } from "../../inspector/hooks/useInspectorState";
import type { ComponentEditorProps, SelectedElement } from "../../inspector/types";
import { EmptyState, LoadingSpinner, PanelHeader, MultiSelectStatusIndicator, BatchPropertyEditor, SelectionFilter, KeyboardShortcutsHelp, SmartSelection, SelectionMemory } from "../common";
import { Button } from "../../components";
import { Copy, ClipboardPaste } from "lucide-react";
import { iconProps } from "../../../utils/ui/uiConstants";
import { useKeyboardShortcutsRegistry } from "../../hooks/useKeyboardShortcutsRegistry";
import { useCopyPaste } from "../../hooks/useCopyPaste";
import { useStore } from "../../stores";
import { copyMultipleElements, pasteMultipleElements, serializeCopiedElements, deserializeCopiedElements } from "../../utils/multiElementCopy";
import { selectionMemory } from "../../utils/selectionMemory";
import { createGroupFromSelection, ungroupElement } from "../../stores/utils/elementGrouping";
import { alignElements } from "../../stores/utils/elementAlignment";
import type { AlignmentType } from "../../stores/utils/elementAlignment";
import { distributeElements } from "../../stores/utils/elementDistribution";
import type { DistributionType } from "../../stores/utils/elementDistribution";
import { trackBatchUpdate, trackGroupCreation, trackUngroup, trackMultiPaste, trackMultiDelete } from "../../stores/utils/historyHelpers";
import { supabase } from "../../../env/supabase.client";
import "../../panels/common/index.css";

/**
 * PropertyEditorWrapper - Editor 컴포넌트를 분리하여 불필요한 리렌더링 방지
 * 
 * PropertiesPanel이 리렌더링되어도 실제 props가 변경되지 않으면 Editor는 리렌더링되지 않음
 */
const PropertyEditorWrapper = memo(function PropertyEditorWrapper({
  selectedElement,
}: {
  selectedElement: SelectedElement;
}) {
  const [Editor, setEditor] = useState<ComponentType<ComponentEditorProps> | null>(null);
  const [loading, setLoading] = useState(true);

  // 요소 타입에 맞는 에디터 동적 로드
  useEffect(() => {
    let isMounted = true;

    if (!selectedElement) {
      Promise.resolve().then(() => {
        if (isMounted) {
          setEditor(null);
          setLoading(false);
        }
      });
      return;
    }

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
            if (import.meta.env.DEV) {
              console.error(
                "[PropertyEditorWrapper] Failed to load editor:",
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
  }, [selectedElement.type]);

  // handleUpdate는 항상 안정적인 함수 (getState 사용)
  const handleUpdate = useCallback((updatedProps: Record<string, unknown>) => {
    useInspectorState.getState().updateProperties(updatedProps);
  }, []);

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
    <Editor
      elementId={selectedElement.id}
      currentProps={selectedElement.properties}
      onUpdate={handleUpdate}
    />
  );
}, (prevProps, nextProps) => {
  // ⭐ 깊은 비교: selectedElement의 실제 내용이 변경되었는지 확인
  return (
    prevProps.selectedElement.id === nextProps.selectedElement.id &&
    prevProps.selectedElement.type === nextProps.selectedElement.type &&
    JSON.stringify(prevProps.selectedElement.properties) === JSON.stringify(nextProps.selectedElement.properties)
  );
});

/**
 * ⭐ Phase 4: useAsyncAction/useAsyncData 사용 가이드
 *
 * 비동기 작업이 필요한 경우 아래 훅들을 사용하세요:
 *
 * 1. useAsyncAction (React Query의 useMutation 스타일)
 *    - 서버에 데이터 저장/수정/삭제
 *    - 자동 재시도 (3회, Exponential backoff)
 *    - 4xx 에러는 재시도 스킵
 *
 *    예시:
 *    ```typescript
 *    import { useAsyncAction } from '../../hooks/useAsyncAction';
 *
 *    const { execute: saveElement, isLoading, error } = useAsyncAction({
 *      actionKey: 'save-element',
 *      action: async (element: Element) => {
 *        const { data, error } = await supabase
 *          .from('elements')
 *          .insert(element)
 *          .select()
 *          .single();
 *        if (error) throw error;
 *        return data;
 *      },
 *      onSuccess: (data) => {
 *        console.log('Element saved:', data);
 *        // TODO: Show toast notification
 *      },
 *      onError: (error) => {
 *        console.error('Failed to save:', error);
 *        // TODO: Show error toast
 *      },
 *      retry: 3,
 *    });
 *
 *    // 사용
 *    await saveElement(newElement);
 *    ```
 *
 * 2. useAsyncData (React Query의 useQuery 스타일)
 *    - 서버에서 데이터 fetch
 *    - 자동 캐싱 (staleTime)
 *    - 주기적 갱신 (refetchInterval)
 *
 *    예시:
 *    ```typescript
 *    import { useAsyncData } from '../../hooks/useAsyncData';
 *
 *    const { data: tokens, isLoading, error, refetch } = useAsyncData({
 *      queryKey: 'design-tokens',
 *      queryFn: async () => {
 *        const { data, error } = await supabase
 *          .from('design_tokens')
 *          .select('*')
 *          .eq('project_id', projectId);
 *        if (error) throw error;
 *        return data;
 *      },
 *      staleTime: 5 * 60 * 1000, // 5분 캐시
 *      refetchInterval: 30000,    // 30초마다 갱신
 *      onSuccess: (data) => console.log('Tokens loaded:', data.length),
 *    });
 *
 *    if (isLoading) return <LoadingSpinner />;
 *    if (error) return <ErrorMessage error={error} />;
 *    ```
 */

export function PropertiesPanel({ isActive }: PanelProps) {
  // ⭐ 최적화: selectedElement 구독 (properties 변경 감지 필요)
  const selectedElement = useInspectorState((state) => state.selectedElement);

  // ⭐ Optimized: Only subscribe to necessary state (actions don't cause re-renders)
  const selectedElementIds = useStore((state) => state.selectedElementIds || []);
  const multiSelectMode = useStore((state) => state.multiSelectMode || false);
  const currentPageId = useStore((state) => state.currentPageId);

  // ⭐ Subscribe to elements for current page only
  const elements = useStore((state) => state.elements);

  // ⭐ Optimized: Get actions without subscribing to state changes
  const removeElement = useStore.getState().removeElement;
  const setSelectedElement = useStore.getState().setSelectedElement;
  const updateElementProps = useStore.getState().updateElementProps;
  const addElement = useStore.getState().addElement;
  const updateElement = useStore.getState().updateElement;
  const setSelectedElements = useStore.getState().setSelectedElements;

  // ⭐ Optimized: Only get elementsMap/elements when actually needed (not subscribed)
  const getElementsMap = useCallback(() => useStore.getState().elementsMap, []);
  const getElements = useCallback(() => useStore.getState().elements, []);

  // ⭐ Get current page elements
  const currentPageElements = useMemo(() => {
    return elements.filter((el) => el.page_id === currentPageId);
  }, [currentPageId, elements]);

  // ⭐ Get selected elements array for BatchPropertyEditor
  const selectedElements = useMemo(() => {
    return currentPageElements.filter((el) => selectedElementIds.includes(el.id));
  }, [selectedElementIds, currentPageElements]);

  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // 🔥 최적화: useCopyPaste hook 사용
  const { copy: copyProperties, paste: pasteProperties } = useCopyPaste({
    onPaste: (data) => {
      useInspectorState.getState().updateProperties(data);
    },
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
      const elementsMap = getElementsMap();
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
      // Note: useCopyPaste hook doesn't support complex element copying with relationships
      // eslint-disable-next-line local/prefer-copy-paste-hook
      await navigator.clipboard.writeText(jsonData);

      console.log(`✅ [Copy] Successfully copied ${selectedElementIds.length} elements to clipboard`);
      // TODO: Show toast notification
    } catch (error) {
      console.error('❌ [Copy] Failed to copy elements:', error);
      // TODO: Show error toast
    }
  }, [selectedElementIds, getElementsMap]);

  const handlePasteAll = useCallback(async () => {
    console.log('[Paste] Starting paste operation...', { currentPageId });

    if (!currentPageId) {
      console.warn('[Paste] No current page selected');
      return;
    }

    try {
      // Read from clipboard
      console.log('[Paste] Reading from clipboard...');
      // Note: useCopyPaste hook doesn't support complex element pasting with relationships
      // eslint-disable-next-line local/prefer-copy-paste-hook
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

    try {
      console.log(`[DeleteAll] Deleting ${selectedElementIds.length} elements`);

      // ⭐ Collect elements BEFORE deletion for history tracking
      const elementsMap = getElementsMap();
      const elementsToDelete = selectedElementIds
        .map((id: string) => elementsMap.get(id))
        .filter((el): el is NonNullable<typeof el> => el !== undefined);

      if (elementsToDelete.length === 0) {
        console.warn('[DeleteAll] No elements to delete');
        return;
      }

      // ⭐ Track in history BEFORE deleting
      trackMultiDelete(elementsToDelete);

      // Delete all selected elements
      await Promise.all(selectedElementIds.map((id: string) => removeElement(id)));

      console.log(`✅ [DeleteAll] Deleted ${elementsToDelete.length} elements`);
      // TODO: Show toast notification
    } catch (error) {
      console.error('❌ [DeleteAll] Failed to delete elements:', error);
      // TODO: Show error toast
    }
  }, [selectedElementIds, getElementsMap, removeElement]);

  const handleClearSelection = useCallback(() => {
    setSelectedElement(null);
    console.log('Selection cleared');
  }, [setSelectedElement]);

  // ⭐ Batch property update handler
  const handleBatchUpdate = useCallback(async (updates: Record<string, unknown>) => {
    try {
      // ⭐ Phase 7: Track in history BEFORE applying updates
      const elementsMap = getElementsMap();
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
  }, [selectedElementIds, getElementsMap, updateElementProps]);

  // ⭐ Phase 3: Selection filter handler
  const handleFilteredElements = useCallback((filteredIds: string[]) => {
    if (filteredIds.length > 0) {
      setSelectedElements(filteredIds);
      console.log(`✅ [Filter] Applied filter, selected ${filteredIds.length} elements`);
    } else if (filteredIds.length === 0) {
      setSelectedElement(null);
      console.log('✅ [Filter] No elements match filter, cleared selection');
    }
  }, [setSelectedElement, setSelectedElements]);

  // ⭐ Phase 6: Duplicate handler (Cmd+D)
  const handleDuplicate = useCallback(async () => {
    if (!multiSelectMode || selectedElementIds.length === 0 || !currentPageId) {
      console.warn('[Duplicate] No elements selected or no page active');
      return;
    }

    try {
      console.log(`[Duplicate] Duplicating ${selectedElementIds.length} elements`);

      // Copy current selection
      const elementsMap = getElementsMap();
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
      setSelectedElements(newElementIds);
      console.log(`✅ [Duplicate] Duplicated and selected ${newElements.length} elements`);

      // TODO: Show toast notification
    } catch (error) {
      console.error('❌ [Duplicate] Failed to duplicate elements:', error);
      // TODO: Show error toast
    }
  }, [multiSelectMode, selectedElementIds, currentPageId, getElementsMap, addElement, setSelectedElements]);

  // ⭐ Phase 3: Advanced Selection - Select All (Cmd+A)
  const handleSelectAll = useCallback(() => {
    const elements = getElements();

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
    setSelectedElements(allElementIds);
    console.log(`✅ [SelectAll] Selected ${allElementIds.length} elements`);
  }, [currentPageId, getElements, setSelectedElements]);

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
    const elementsMap = getElementsMap();
    const nextElement = elementsMap.get(nextElementId);

    if (nextElement) {
      setSelectedElement(nextElementId, nextElement.props);
      console.log(`✅ [Tab] Navigated to element ${nextIndex + 1}/${selectedElementIds.length}:`, nextElement.tag);
    }
  }, [multiSelectMode, selectedElementIds, selectedElement, getElementsMap, setSelectedElement]);

  // ⭐ Phase 4: Group Selection (Cmd+G)
  const handleGroupSelection = useCallback(async () => {
    if (!multiSelectMode || selectedElementIds.length < 2 || !currentPageId) {
      console.warn('[Group] Need at least 2 elements selected');
      return;
    }

    try {
      console.log('[Group] Grouping', selectedElementIds.length, 'elements');

      const elementsMap = getElementsMap();

      // Create group from selection
      const { groupElement, updatedChildren } = createGroupFromSelection(
        selectedElementIds,
        elementsMap,
        currentPageId
      );

      // Add group to store (this saves to DB)
      await addElement(groupElement);

      // Update children with new parent_id - Save to DB directly
      await Promise.all(
        updatedChildren.map(async (child) => {
          // Update memory state
          await updateElement(child.id, { parent_id: child.parent_id, order_num: child.order_num });

          // Save to DB directly (Supabase)
          const { error } = await supabase
            .from('elements')
            .update({
              parent_id: child.parent_id,
              order_num: child.order_num,
              updated_at: new Date().toISOString()
            })
            .eq('id', child.id);

          if (error) {
            console.error(`❌ [Group] Failed to save child ${child.id} to DB:`, error);
          } else {
            console.log(`✅ [Group] Saved child ${child.id} to DB: parent_id=${child.parent_id}`);
          }
        })
      );

      // ⭐ Phase 7: Track in history AFTER group creation
      trackGroupCreation(groupElement, updatedChildren);

      // Select the new group
      setSelectedElement(groupElement.id, groupElement.props);

      console.log(`✅ [Group] Created group ${groupElement.id} with ${updatedChildren.length} children`);
    } catch (error) {
      console.error('❌ [Group] Failed to create group:', error);
    }
  }, [multiSelectMode, selectedElementIds, currentPageId, getElementsMap, addElement, updateElement, setSelectedElement]);

  // ⭐ Phase 4: Ungroup Selection (Cmd+Shift+G)
  const handleUngroupSelection = useCallback(async () => {
    if (!selectedElement || selectedElement.type !== 'Group') {
      console.warn('[Ungroup] Selected element is not a Group');
      return;
    }

    try {
      console.log('[Ungroup] Ungrouping element', selectedElement.id);

      const elementsMap = getElementsMap();

      // Store group element before deletion for history
      const groupElementForHistory = elementsMap.get(selectedElement.id);

      // Ungroup element
      const { updatedChildren, groupIdToDelete} = ungroupElement(
        selectedElement.id,
        elementsMap
      );

      // ⭐ Phase 7: Track in history BEFORE making changes
      if (groupElementForHistory) {
        trackUngroup(groupIdToDelete, updatedChildren, groupElementForHistory);
      }

      // Update children with new parent_id - Save to DB directly
      await Promise.all(
        updatedChildren.map(async (child) => {
          // Update memory state
          await updateElement(child.id, { parent_id: child.parent_id, order_num: child.order_num });

          // Save to DB directly (Supabase)
          const { error } = await supabase
            .from('elements')
            .update({
              parent_id: child.parent_id,
              order_num: child.order_num,
              updated_at: new Date().toISOString()
            })
            .eq('id', child.id);

          if (error) {
            console.error(`❌ [Ungroup] Failed to save child ${child.id} to DB:`, error);
          } else {
            console.log(`✅ [Ungroup] Saved child ${child.id} to DB: parent_id=${child.parent_id}`);
          }
        })
      );

      // Delete group element
      await removeElement(groupIdToDelete);

      // Select first child
      if (updatedChildren.length > 0) {
        setSelectedElement(updatedChildren[0].id, updatedChildren[0].props);
      } else {
        setSelectedElement(null);
      }

      console.log(`✅ [Ungroup] Ungrouped ${updatedChildren.length} elements`);
    } catch (error) {
      console.error('❌ [Ungroup] Failed to ungroup:', error);
    }
  }, [selectedElement, getElementsMap, updateElement, removeElement, setSelectedElement]);

  // ⭐ Phase 5.1: Element Alignment
  const handleAlign = useCallback(async (type: AlignmentType) => {
    if (!multiSelectMode || selectedElementIds.length < 2) {
      console.warn('[Alignment] Need at least 2 elements selected');
      return;
    }

    try {
      console.log(`[Alignment] Aligning ${selectedElementIds.length} elements to ${type}`);

      const elementsMap = getElementsMap();

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
  }, [multiSelectMode, selectedElementIds, getElementsMap, updateElementProps]);

  // ⭐ Phase 5.2: Element Distribution
  const handleDistribute = useCallback(async (type: DistributionType) => {
    if (!multiSelectMode || selectedElementIds.length < 3) {
      console.warn('[Distribution] Need at least 3 elements selected');
      return;
    }

    try {
      console.log(`[Distribution] Distributing ${selectedElementIds.length} elements ${type}ly`);

      const elementsMap = getElementsMap();

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
  }, [multiSelectMode, selectedElementIds, getElementsMap, updateElementProps]);

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
        modifier: 'altShift' as const,
        handler: () => handleDistribute('vertical'),
        description: 'Distribute Vertically',
      },
      // ⭐ Sprint 3: Keyboard Shortcuts Help
      {
        key: '?',
        modifier: 'cmd' as const,
        handler: () => setShowKeyboardHelp((prev) => !prev),
        description: 'Toggle Keyboard Shortcuts Help',
      },
    ],
    [handleCopyProperties, handlePasteProperties, handleCopyAll, handlePasteAll, handleDuplicate, handleSelectAll, handleEscapeClearSelection, handleGroupSelection, handleUngroupSelection, handleAlign, handleDistribute]
  );

  useKeyboardShortcutsRegistry(shortcuts, [handleCopyProperties, handlePasteProperties, handleCopyAll, handlePasteAll, handleDuplicate, handleSelectAll, handleEscapeClearSelection, handleGroupSelection, handleUngroupSelection, handleAlign, handleDistribute]);

  // ⭐ Phase 3: Tab navigation (requires special handling)
  // Note: Tab navigation requires special handling (Shift+Tab, preventDefault) that useKeyboardShortcutsRegistry doesn't support
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Tab' && multiSelectMode && selectedElementIds.length > 0) {
        handleTabNavigation(event);
      }
    };

    // eslint-disable-next-line local/prefer-keyboard-shortcuts-registry
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

  return (
    <div className="properties-panel">
      <PanelHeader
        title={multiSelectMode ? `${selectedElementIds.length}개 요소 선택됨` : selectedElement.type}
        actions={
          <>
            <Button
              variant="ghost"
              className="iconButton"
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
              className="iconButton"
              onPress={handlePasteProperties}
              aria-label="Paste properties"
            >
              <ClipboardPaste
                color={iconProps.color}
                size={iconProps.size}
                strokeWidth={iconProps.stroke}
              />
            </Button>
          </>
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

          {/* ⭐ Phase 9: Smart Selection for AI-powered suggestions */}
          {selectedElement && (() => {
            // Get actual Element from store for SmartSelection
            const actualElement = currentPageElements.find((el) => el.id === selectedElement.id);
            if (!actualElement) return null;
            
            return (
              <SmartSelection
                referenceElement={actualElement}
                allElements={currentPageElements}
                onSelect={(elementIds) => {
                  setSelectedElements(elementIds);
                  // Track in selection memory
                  if (currentPageId) {
                    selectionMemory.addSelection(elementIds, elements, currentPageId);
                  }
                }}
              />
            );
          })()}

          {/* ⭐ Phase 9: Selection Memory for quick restore */}
          <SelectionMemory
            currentPageId={currentPageId}
            onRestore={(elementIds) => {
              setSelectedElements(elementIds);
            }}
          />
        </>
      )}

      {/* ⭐ 최적화: PropertyEditorWrapper로 Editor 렌더링 분리 */}
      <PropertyEditorWrapper selectedElement={selectedElement} />

      {/* ⭐ Sprint 3: Keyboard Shortcuts Help Panel */}
      <KeyboardShortcutsHelp
        isOpen={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
      />
    </div>
  );
}
