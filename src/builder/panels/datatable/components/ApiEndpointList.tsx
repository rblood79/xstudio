/**
 * ApiEndpointList - API Endpoint 목록 컴포넌트
 *
 * API Endpoint CRUD 및 목록 표시
 * 편집 UI는 DataTableEditorPanel에서 처리
 */

import { useState } from "react";
import { Globe, Plus, Trash2, Edit2, Play } from "lucide-react";
import { useDataStore, useApiEndpoints } from "../../../stores/data";
import { useDataTableEditorStore } from "../stores/dataTableEditorStore";
import { SectionHeader } from "../../common/SectionHeader";

interface ApiEndpointListProps {
  projectId: string;
}

export function ApiEndpointList({ projectId }: ApiEndpointListProps) {
  const apiEndpoints = useApiEndpoints();
  const createApiEndpoint = useDataStore((state) => state.createApiEndpoint);
  const deleteApiEndpoint = useDataStore((state) => state.deleteApiEndpoint);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Editor Store 액션
  const editorMode = useDataTableEditorStore((state) => state.mode);
  const openApiEditor = useDataTableEditorStore((state) => state.openApiEditor);

  // 현재 편집 중인 API ID (하이라이트용)
  const editingApiId = editorMode?.type === "api-edit" ? editorMode.endpointId : null;

  const handleCreate = async () => {
    const url = prompt("API URL을 입력하세요 (예: https://pokeapi.co/api/v2/pokemon):");
    if (!url) return;

    // URL 파싱하여 baseUrl과 path 분리
    let baseUrl = "";
    let path = "";
    try {
      const parsedUrl = new URL(url);
      baseUrl = `${parsedUrl.protocol}//${parsedUrl.host}`;
      path = parsedUrl.pathname || "/";
    } catch {
      // 유효하지 않은 URL인 경우 전체를 path로 사용
      baseUrl = "https://api.example.com";
      path = url.startsWith("/") ? url : `/${url}`;
    }

    try {
      await createApiEndpoint({
        name: url,
        project_id: projectId,
        method: "GET",
        baseUrl,
        path,
      });
    } catch (error) {
      console.error("API Endpoint 생성 실패:", error);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("정말 삭제하시겠습니까?")) return;

    try {
      await deleteApiEndpoint(id);
      if (selectedId === id) {
        setSelectedId(null);
      }
    } catch (error) {
      console.error("API Endpoint 삭제 실패:", error);
    }
  };

  const handleExecute = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Editor의 Run 탭으로 이동 (컬럼 자동 감지 기능 포함)
    openApiEditor(id, "run");
  };

  const handleEdit = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    openApiEditor(id);
  };

  return (
    <div className="section">
      <SectionHeader
        title="API List"
        actions={
          <span className="datatable-list-count">{apiEndpoints.length}개</span>
        }
      />
      <div className="section-content">
        {apiEndpoints.length === 0 ? (
          <div className="datatable-empty">
            <Globe size={32} className="datatable-empty-icon" />
            <p className="datatable-empty-text">
              API Endpoint가 없습니다.
              <br />
              새 API를 추가하세요.
            </p>
          </div>
        ) : (
          <div className="list-group" role="list">
            {apiEndpoints.map((endpoint) => (
              <div
                key={endpoint.id}
                role="listitem"
                className={`list-item ${selectedId === endpoint.id ? "selected" : ""} ${editingApiId === endpoint.id ? "editing" : ""}`}
                onClick={() => setSelectedId(endpoint.id)}
              >
                <div className="list-item-icon">
                  <Globe size={16} />
                </div>
                <div className="list-item-content">
                  <div className="list-item-name">{endpoint.name}</div>
                  <div className="list-item-meta">
                    {endpoint.baseUrl}
                    {endpoint.path}
                  </div>
                </div>
                <span className={`list-item-badge method ${endpoint.method}`}>
                  {endpoint.method}
                </span>
                <div className="list-item-actions">
                  <button
                    type="button"
                    className="iconButton"
                    onClick={(e) => handleExecute(endpoint.id, e)}
                    title="테스트"
                  >
                    <Play size={14} />
                  </button>
                  <button
                    type="button"
                    className="iconButton"
                    onClick={(e) => handleEdit(endpoint.id, e)}
                    title="편집"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    type="button"
                    className="iconButton"
                    onClick={(e) => handleDelete(endpoint.id, e)}
                    title="삭제"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          className="datatable-add-btn"
          onClick={handleCreate}
        >
          <Plus size={16} />
          <span>API 추가</span>
        </button>
      </div>
    </div>
  );
}
