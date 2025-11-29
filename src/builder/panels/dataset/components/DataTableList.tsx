/**
 * DataTableList - DataTable 목록 컴포넌트
 *
 * DataTable CRUD 및 목록 표시
 */

import { useState } from "react";
import { Table2, Plus, Trash2, Edit2 } from "lucide-react";
import { useDataStore, useDataTables } from "../../../stores/data";
import type { DataTable } from "../../../../types/builder/data.types";

interface DataTableListProps {
  projectId: string;
}

export function DataTableList({ projectId }: DataTableListProps) {
  const dataTables = useDataTables();
  const createDataTable = useDataStore((state) => state.createDataTable);
  const deleteDataTable = useDataStore((state) => state.deleteDataTable);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleCreate = async () => {
    const name = prompt("DataTable 이름을 입력하세요:");
    if (!name) return;

    try {
      await createDataTable({
        name,
        project_id: projectId,
        schema: [],
        mockData: [],
        useMockData: true,
      });
    } catch (error) {
      console.error("DataTable 생성 실패:", error);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      await deleteDataTable(id);
      if (selectedId === id) {
        setSelectedId(null);
      }
    } catch (error) {
      console.error("DataTable 삭제 실패:", error);
    }
  };

  if (dataTables.length === 0) {
    return (
      <div className="dataset-list">
        <div className="dataset-empty">
          <Table2 size={32} className="dataset-empty-icon" />
          <p className="dataset-empty-text">
            데이터 테이블이 없습니다.
            <br />
            새 테이블을 추가하세요.
          </p>
        </div>
        <button
          type="button"
          className="dataset-add-btn"
          onClick={handleCreate}
        >
          <Plus size={16} />
          <span>DataTable 추가</span>
        </button>
      </div>
    );
  }

  return (
    <div className="dataset-list">
      <div className="dataset-list-header">
        <span className="dataset-list-title">DataTables</span>
        <span className="dataset-list-count">{dataTables.length}개</span>
      </div>

      {dataTables.map((table) => (
        <div
          key={table.id}
          className={`dataset-item ${selectedId === table.id ? "selected" : ""}`}
          onClick={() => setSelectedId(table.id)}
        >
          <div className="dataset-item-icon">
            <Table2 size={16} />
          </div>
          <div className="dataset-item-info">
            <div className="dataset-item-name">{table.name}</div>
            <div className="dataset-item-meta">
              {table.schema.length}개 필드 ·{" "}
              {table.mockData?.length || 0}개 행
            </div>
          </div>
          <span
            className={`dataset-badge ${table.useMockData ? "mock" : "live"}`}
          >
            {table.useMockData ? "Mock" : "Live"}
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
              onClick={(e) => handleDelete(table.id, e)}
              title="삭제"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        className="dataset-add-btn"
        onClick={handleCreate}
      >
        <Plus size={16} />
        <span>DataTable 추가</span>
      </button>
    </div>
  );
}
