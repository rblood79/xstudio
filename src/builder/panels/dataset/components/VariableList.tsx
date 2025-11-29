/**
 * VariableList - Variable 목록 컴포넌트
 *
 * 전역/페이지 변수 CRUD 및 목록 표시
 */

import { useState } from "react";
import { Variable, Plus, Trash2, Edit2 } from "lucide-react";
import { useDataStore, useVariables } from "../../../stores/data";
import type { Variable as VariableType } from "../../../../types/builder/data.types";

interface VariableListProps {
  projectId: string;
}

export function VariableList({ projectId }: VariableListProps) {
  const variables = useVariables();
  const createVariable = useDataStore((state) => state.createVariable);
  const deleteVariable = useDataStore((state) => state.deleteVariable);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
      if (selectedId === id) {
        setSelectedId(null);
      }
    } catch (error) {
      console.error("Variable 삭제 실패:", error);
    }
  };

  const renderVariableItem = (variable: VariableType) => (
    <div
      key={variable.id}
      className={`dataset-item ${selectedId === variable.id ? "selected" : ""}`}
      onClick={() => setSelectedId(variable.id)}
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
          onClick={(e) => {
            e.stopPropagation();
            // TODO: Open editor modal
          }}
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

  if (variables.length === 0) {
    return (
      <div className="dataset-list">
        <div className="dataset-empty">
          <Variable size={32} className="dataset-empty-icon" />
          <p className="dataset-empty-text">
            변수가 없습니다.
            <br />
            새 변수를 추가하세요.
          </p>
        </div>
        <button
          type="button"
          className="dataset-add-btn"
          onClick={handleCreate}
        >
          <Plus size={16} />
          <span>Variable 추가</span>
        </button>
      </div>
    );
  }

  return (
    <div className="dataset-list">
      {/* Global Variables */}
      {globalVariables.length > 0 && (
        <>
          <div className="dataset-list-header">
            <span className="dataset-list-title">Global Variables</span>
            <span className="dataset-list-count">{globalVariables.length}개</span>
          </div>
          {globalVariables.map(renderVariableItem)}
        </>
      )}

      {/* Page Variables */}
      {pageVariables.length > 0 && (
        <>
          <div className="dataset-list-header" style={{ marginTop: "var(--spacing-md)" }}>
            <span className="dataset-list-title">Page Variables</span>
            <span className="dataset-list-count">{pageVariables.length}개</span>
          </div>
          {pageVariables.map(renderVariableItem)}
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
  );
}
