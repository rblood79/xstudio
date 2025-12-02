/**
 * DataTableList - DataTable 목록 컴포넌트
 *
 * DataTable CRUD 및 목록 표시
 *
 * @see docs/features/DATATABLE_PRESET_SYSTEM.md
 */

import { Table2, Plus, Trash2, Edit2 } from "lucide-react";
import { Button } from "react-aria-components";
import { useDataStore, useDataTables } from "../../../stores/data";

interface DataTableListProps {
  projectId: string;
  editingId: string | null;
  onEditingChange: (id: string | null) => void;
  onCreateClick: () => void;
}

export function DataTableList({
  projectId,
  editingId,
  onEditingChange,
  onCreateClick,
}: DataTableListProps) {
  const dataTables = useDataTables();
  const deleteDataTable = useDataStore((state) => state.deleteDataTable);

  // Silence unused variable warning
  void projectId;

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      await deleteDataTable(id);
      if (editingId === id) {
        onEditingChange(null);
      }
    } catch (error) {
      console.error("DataTable 삭제 실패:", error);
    }
  };

  const handleEdit = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onEditingChange(id);
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
        <Button className="dataset-add-btn" onPress={onCreateClick}>
          <Plus size={16} />
          <span>DataTable 추가</span>
        </Button>
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
          className={`dataset-item ${editingId === table.id ? "selected" : ""}`}
          onClick={() => onEditingChange(table.id)}
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
              onClick={(e) => handleEdit(table.id, e)}
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

      <Button className="dataset-add-btn" onPress={onCreateClick}>
        <Plus size={16} />
        <span>DataTable 추가</span>
      </Button>
    </div>
  );
}
