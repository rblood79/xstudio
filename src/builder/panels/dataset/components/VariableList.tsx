/**
 * VariableList - Variable 목록 컴포넌트
 *
 * 전역/페이지 변수 CRUD 및 목록 표시
 */

import { useState } from "react";
import { Variable, Plus, Trash2, Edit2 } from "lucide-react";
import { useDataStore, useVariables } from "../../../stores/data";
import { VariableEditor } from "../editors/VariableEditor";
import { SectionHeader } from "../../common/SectionHeader";
import type { Variable as VariableType } from "../../../../types/builder/data.types";

interface VariableListProps {
  projectId: string;
}

export function VariableList({ projectId }: VariableListProps) {
  const variables = useVariables();
  const createVariable = useDataStore((state) => state.createVariable);
  const deleteVariable = useDataStore((state) => state.deleteVariable);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 현재 편집 중인 Variable
  const editingVariable = editingId
    ? variables.find((v) => v.id === editingId)
    : null;

  // Group by scope
  const globalVariables = variables.filter((v) => v.scope === "global");
  const pageVariables = variables.filter((v) => v.scope === "page");

  const handleCreate = async () => {
    const name = prompt("Variable 이름을 입력하세요:");
    if (!name) return;

    try {
      await createVariable({
        name,
        project_id: projectId,
        type: "string",
        defaultValue: "",
        persist: false,
        scope: "global",
      });
    } catch (error) {
      console.error("Variable 생성 실패:", error);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      await deleteVariable(id);
      if (editingId === id) {
        setEditingId(null);
      }
    } catch (error) {
      console.error("Variable 삭제 실패:", error);
    }
  };

  const handleEdit = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
  };

  const handleCloseEditor = () => {
    setEditingId(null);
  };

  const renderVariableItem = (variable: VariableType) => (
    <div
      key={variable.id}
      className={`dataset-item ${editingId === variable.id ? "selected" : ""}`}
      onClick={() => setEditingId(variable.id)}
    >
      <div className="dataset-item-icon">
        <Variable size={16} />
      </div>
      <div className="dataset-item-info">
        <div className="dataset-item-name">{variable.name}</div>
        <div className="dataset-item-meta">
          {variable.type}
          {variable.persist && " · localStorage"}
        </div>
      </div>
      <span className={`dataset-badge ${variable.scope}`}>
        {variable.scope}
      </span>
      <div className="dataset-item-actions">
        <button
          type="button"
          className="iconButton"
          onClick={(e) => handleEdit(variable.id, e)}
          title="편집"
        >
          <Edit2 size={14} />
        </button>
        <button
          type="button"
          className="iconButton"
          onClick={(e) => handleDelete(variable.id, e)}
          title="삭제"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );

  return (
    <div className="section">
      <SectionHeader
        title="Variables"
        actions={
          <span className="dataset-list-count">{variables.length}개</span>
        }
      />
      <div className="section-content">
        {variables.length === 0 ? (
          <div className="dataset-empty">
            <Variable size={32} className="dataset-empty-icon" />
            <p className="dataset-empty-text">
              변수가 없습니다.
              <br />
              새 변수를 추가하세요.
            </p>
          </div>
        ) : (
          <>
            {/* Global Variables */}
            {globalVariables.length > 0 && (
              <div className="dataset-subgroup">
                <div className="dataset-subgroup-header">
                  <span className="dataset-subgroup-title">Global</span>
                  <span className="dataset-list-count">{globalVariables.length}개</span>
                </div>
                <div className="dataset-list">
                  {globalVariables.map(renderVariableItem)}
                </div>
              </div>
            )}

            {/* Page Variables */}
            {pageVariables.length > 0 && (
              <div className="dataset-subgroup">
                <div className="dataset-subgroup-header">
                  <span className="dataset-subgroup-title">Page</span>
                  <span className="dataset-list-count">{pageVariables.length}개</span>
                </div>
                <div className="dataset-list">
                  {pageVariables.map(renderVariableItem)}
                </div>
              </div>
            )}
          </>
        )}

        <button
          type="button"
          className="dataset-add-btn"
          onClick={handleCreate}
        >
          <Plus size={16} />
          <span>Variable 추가</span>
        </button>
      </div>

      {/* Variable Editor Modal */}
      {editingVariable && (
        <div className="dataset-editor-overlay">
          <VariableEditor
            variable={editingVariable}
            onClose={handleCloseEditor}
          />
        </div>
      )}
    </div>
  );
}
