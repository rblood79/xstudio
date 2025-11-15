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
import { EmptyState, LoadingSpinner, PanelHeader } from "../common";
import { Button } from "../../components";
import { Copy, ClipboardPaste } from "lucide-react";
import { iconProps } from "../../../utils/ui/uiConstants";
import { useKeyboardShortcutsRegistry } from "../../hooks/useKeyboardShortcutsRegistry";
import "../../panels/common/index.css";

export function PropertiesPanel({ isActive }: PanelProps) {
  const selectedElement = useInspectorState((state) => state.selectedElement);
  const updateProperties = useInspectorState((state) => state.updateProperties);

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

  // Copy/Paste handlers
  const handleCopyProperties = useCallback(async () => {
    if (!selectedElement?.properties) return;
    try {
      const propertiesJSON = JSON.stringify(selectedElement.properties, null, 2);
      await navigator.clipboard.writeText(propertiesJSON);
      // TODO: Show toast notification
    } catch (error) {
      console.error('Failed to copy properties:', error);
    }
  }, [selectedElement]);

  const handlePasteProperties = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      const properties = JSON.parse(text);

      // Validate that it's an object
      if (typeof properties !== 'object' || properties === null) {
        throw new Error('Invalid properties format');
      }

      updateProperties(properties as Record<string, unknown>);
      // TODO: Show toast notification
    } catch (error) {
      console.error('Failed to paste properties:', error);
    }
  }, [updateProperties]);

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
    ],
    [handleCopyProperties, handlePasteProperties]
  );

  useKeyboardShortcutsRegistry(shortcuts, [handleCopyProperties, handlePasteProperties]);

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
        title={selectedElement.type}
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
      <Editor
        elementId={selectedElement.id}
        currentProps={selectedElement.properties}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
