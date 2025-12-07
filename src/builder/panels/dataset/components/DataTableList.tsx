/**
 * DataTableList - DataTable 목록 컴포넌트
 *
 * DataTable CRUD 및 목록 표시
 *
 * @see docs/features/DATATABLE_PRESET_SYSTEM.md
 */

import { Table2, Plus, Trash2, Edit2, Link } from "lucide-react";
import { Button } from "react-aria-components";
import { useDataStore, useDataTables, useApiEndpoints } from "../../../stores/data";
import { SectionHeader } from "../../common/SectionHeader";

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
  const apiEndpoints = useApiEndpoints();
  const deleteDataTable = useDataStore((state) => state.deleteDataTable);

  // Silence unused variable warning
  void projectId;

  // DataTable 이름으로 연결된 API Endpoint 찾기
  const getLinkedApi = (tableName: string) => {
    return apiEndpoints.find((api) => api.targetDataTable === tableName);
  };

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

  return (
    <div className="section">
      <SectionHeader
        title="Table List"
        actions={
          <span className="dataset-list-count">{dataTables.length}개</span>
        }
      />
      <div className="section-content">
        {dataTables.length === 0 ? (
          <div className="dataset-empty">
            <Table2 size={32} className="dataset-empty-icon" />
            <p className="dataset-empty-text">
              데이터 테이블이 없습니다.
              <br />
              새 테이블을 추가하세요.
            </p>
          </div>
        ) : (
          <div className="list-group" role="list">
            {dataTables.map((table) => {
              const linkedApi = getLinkedApi(table.name);
              return (
              <div
                key={table.id}
                role="listitem"
                className={`list-item ${editingId === table.id ? "selected" : ""}`}
                onClick={() => onEditingChange(table.id)}
              >
                <div className="list-item-icon">
                  <Table2 size={16} />
                </div>
                <div className="list-item-content">
                  <div className="list-item-name">{table.name}</div>
                  <div className="list-item-meta">
                    {table.schema.length}개 필드 ·{" "}
                    {table.mockData?.length || 0}개 행
                    {linkedApi && (
                      <>
                        {" "}· <Link size={10} className="linked-api-icon" /> {linkedApi.name}
                      </>
                    )}
                  </div>
                </div>
                <span
                  className={`list-item-badge ${linkedApi ? "api" : "local"}`}
                >
                  {linkedApi ? "API" : "Local"}
                </span>
                <div className="list-item-actions">
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
            );
            })}
          </div>
        )}

        <Button className="dataset-add-btn" onPress={onCreateClick}>
          <Plus size={16} />
          <span>Table 추가</span>
        </Button>
      </div>
    </div>
  );
}
