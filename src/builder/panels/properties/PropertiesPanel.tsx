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
import { EmptyState, LoadingSpinner, PanelHeader, MultiSelectStatusIndicator, BatchPropertyEditor } from "../common";
import { Button } from "../../components";
import { Copy, ClipboardPaste } from "lucide-react";
import { iconProps } from "../../../utils/ui/uiConstants";
import { useKeyboardShortcutsRegistry } from "../../hooks/useKeyboardShortcutsRegistry";
import { useCopyPaste } from "../../hooks/useCopyPaste";
import { useStore } from "../../stores";
import { copyMultipleElements, pasteMultipleElements, serializeCopiedElements, deserializeCopiedElements } from "../../utils/multiElementCopy";
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
    if (selectedElementIds.length === 0) return;

    try {
      // Copy elements with relationship preservation
      const copiedData = copyMultipleElements(selectedElementIds, elementsMap);

      // Serialize and copy to clipboard
      const jsonData = serializeCopiedElements(copiedData);
      await navigator.clipboard.writeText(jsonData);

      console.log(`✅ Copied ${selectedElementIds.length} elements to clipboard`);
      // TODO: Show toast notification
    } catch (error) {
      console.error('Failed to copy elements:', error);
      // TODO: Show error toast
    }
  }, [selectedElementIds, elementsMap]);

  const handlePasteAll = useCallback(async () => {
    if (!currentPageId) return;

    try {
      // Read from clipboard
      const clipboardText = await navigator.clipboard.readText();

      // Deserialize
      const copiedData = deserializeCopiedElements(clipboardText);
      if (!copiedData) {
        console.warn('Invalid clipboard data');
        return;
      }

      // Paste with offset
      const newElements = pasteMultipleElements(copiedData, currentPageId, { x: 10, y: 10 });

      // Add all new elements to store
      await Promise.all(newElements.map((element) => addElement(element)));

      console.log(`✅ Pasted ${newElements.length} elements`);
      // TODO: Show toast notification
    } catch (error) {
      console.error('Failed to paste elements:', error);
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
  }, [selectedElementIds, updateElementProps]);

  // ⭐ Get selected elements from store
  const selectedElements = useMemo(() => {
    return selectedElementIds
      .map((id: string) => elementsMap.get(id))
      .filter((el): el is NonNullable<typeof el> => el !== undefined);
  }, [selectedElementIds, elementsMap]);

  // ⭐ Duplicate handler (Cmd+D)
  const handleDuplicate = useCallback(async () => {
    if (!multiSelectMode || selectedElementIds.length === 0 || !currentPageId) return;

    try {
      // Copy current selection
      const copiedData = copyMultipleElements(selectedElementIds, elementsMap);

      // Paste with offset
      const newElements = pasteMultipleElements(copiedData, currentPageId, { x: 20, y: 20 });

      // Add all new elements to store
      await Promise.all(newElements.map((element) => addElement(element)));

      console.log(`✅ Duplicated ${newElements.length} elements`);
      // TODO: Show toast notification
    } catch (error) {
      console.error('Failed to duplicate elements:', error);
      // TODO: Show error toast
    }
  }, [multiSelectMode, selectedElementIds, currentPageId, elementsMap, addElement]);

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
    ],
    [handleCopyProperties, handlePasteProperties, handleCopyAll, handlePasteAll, handleDuplicate]
  );

  useKeyboardShortcutsRegistry(shortcuts, [handleCopyProperties, handlePasteProperties, handleCopyAll, handlePasteAll, handleDuplicate]);

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
            onCopyAll={handleCopyAll}
            onPasteAll={handlePasteAll}
            onDeleteAll={handleDeleteAll}
            onClearSelection={handleClearSelection}
          />

          {/* ⭐ Batch property editor for common properties */}
          <BatchPropertyEditor
            selectedElements={selectedElements}
            onBatchUpdate={handleBatchUpdate}
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
