import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import { getEditor } from "../editors/registry";
import { useInspectorState } from "../hooks/useInspectorState";
import type { SelectedElement, ComponentEditorProps } from "../types";

export interface PropertiesSectionProps {
  element: SelectedElement;
}

export function PropertiesSection({ element }: PropertiesSectionProps) {
  const [Editor, setEditor] =
    useState<ComponentType<ComponentEditorProps> | null>(null);
  const [loading, setLoading] = useState(true);
  const updateProperties = useInspectorState((state) => state.updateProperties);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    console.log('[PropertiesSection] Loading editor for type:', element.type, element);
    getEditor(element.type)
      .then((editor) => {
        console.log('[PropertiesSection] Editor loaded:', element.type, !!editor);
        setEditor(() => editor);

        setLoading(false);
      })
      .catch((error) => {
        console.error('[PropertiesSection] Failed to load editor:', element.type, error);
        setEditor(null);

        setLoading(false);
      });
  }, [element.type]);

  const handleUpdate = (updatedProps: Record<string, unknown>) => {
    // 한 번에 모든 속성 업데이트 (순차 업데이트로 인한 동기화 문제 방지)
    updateProperties(updatedProps);
  };

  if (loading) {
    return (
      <div className="properties-section loading">
        <p className="loading-message">에디터를 불러오는 중...</p>
      </div>
    );
  }

  if (!Editor) {
    return (
      <div className="properties-section empty">
        <p className="empty-message">사용 가능한 속성 에디터가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="properties-section">
      <div className="section-header">
        <div className="section-title">{element.type}</div>
      </div>
      <div className="section-content">
        <Editor
          elementId={element.id}
          currentProps={element.properties}
          onUpdate={handleUpdate}
        />
      </div>
    </div>
  );
}
