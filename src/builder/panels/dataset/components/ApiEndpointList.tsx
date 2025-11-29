/**
 * ApiEndpointList - API Endpoint 목록 컴포넌트
 *
 * API Endpoint CRUD 및 목록 표시
 */

import { useState } from "react";
import { Globe, Plus, Trash2, Edit2, Play } from "lucide-react";
import { useDataStore, useApiEndpoints } from "../../../stores/data";
import type { ApiEndpoint, HttpMethod } from "../../../../types/builder/data.types";

interface ApiEndpointListProps {
  projectId: string;
}

export function ApiEndpointList({ projectId }: ApiEndpointListProps) {
  const apiEndpoints = useApiEndpoints();
  const createApiEndpoint = useDataStore((state) => state.createApiEndpoint);
  const deleteApiEndpoint = useDataStore((state) => state.deleteApiEndpoint);
  const executeApiEndpoint = useDataStore((state) => state.executeApiEndpoint);
  const loadingApis = useDataStore((state) => state.loadingApis);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleCreate = async () => {
    const name = prompt("API Endpoint 이름을 입력하세요:");
    if (!name) return;

    try {
      await createApiEndpoint({
        name,
        project_id: projectId,
        method: "GET",
        baseUrl: "https://api.example.com",
        path: "/data",
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

  const handleExecute = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const result = await executeApiEndpoint(id);
      console.log("API 실행 결과:", result);
      alert("API 호출 성공! 콘솔을 확인하세요.");
    } catch (error) {
      console.error("API 실행 실패:", error);
      alert(`API 호출 실패: ${(error as Error).message}`);
    }
  };

  if (apiEndpoints.length === 0) {
    return (
      <div className="dataset-list">
        <div className="dataset-empty">
          <Globe size={32} className="dataset-empty-icon" />
          <p className="dataset-empty-text">
            API Endpoint가 없습니다.
            <br />
            새 API를 추가하세요.
          </p>
        </div>
        <button
          type="button"
          className="dataset-add-btn"
          onClick={handleCreate}
        >
          <Plus size={16} />
          <span>API Endpoint 추가</span>
        </button>
      </div>
    );
  }

  return (
    <div className="dataset-list">
      <div className="dataset-list-header">
        <span className="dataset-list-title">API Endpoints</span>
        <span className="dataset-list-count">{apiEndpoints.length}개</span>
      </div>

      {apiEndpoints.map((endpoint) => (
        <div
          key={endpoint.id}
          className={`dataset-item ${selectedId === endpoint.id ? "selected" : ""}`}
          onClick={() => setSelectedId(endpoint.id)}
        >
          <div className="dataset-item-icon">
            <Globe size={16} />
          </div>
          <div className="dataset-item-info">
            <div className="dataset-item-name">{endpoint.name}</div>
            <div className="dataset-item-meta">
              {endpoint.baseUrl}
              {endpoint.path}
            </div>
          </div>
          <span className={`method-badge ${endpoint.method}`}>
            {endpoint.method}
          </span>
          <div className="dataset-item-actions">
            <button
              type="button"
              className="iconButton"
              onClick={(e) => handleExecute(endpoint.id, e)}
              disabled={loadingApis.has(endpoint.id)}
              title="실행"
            >
              <Play size={14} />
            </button>
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
              onClick={(e) => handleDelete(endpoint.id, e)}
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
        <span>API Endpoint 추가</span>
      </button>
    </div>
  );
}
