/**
 * ApiEndpointList - API Endpoint 목록 컴포넌트
 *
 * API Endpoint CRUD 및 목록 표시
 */

import { useState } from "react";
import { Globe, Plus, Trash2, Edit2, Play } from "lucide-react";
import { useDataStore, useApiEndpoints } from "../../../stores/data";
import { ApiEndpointEditor } from "../editors/ApiEndpointEditor";
import { SectionHeader } from "../../common/SectionHeader";
import type { ApiEndpoint } from "../../../../types/builder/data.types";

interface ApiEndpointListProps {
  projectId: string;
}

export function ApiEndpointList({ projectId }: ApiEndpointListProps) {
  const apiEndpoints = useApiEndpoints();
  const createApiEndpoint = useDataStore((state) => state.createApiEndpoint);
  const deleteApiEndpoint = useDataStore((state) => state.deleteApiEndpoint);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingEndpoint, setEditingEndpoint] = useState<ApiEndpoint | null>(null);
  const [initialTab, setInitialTab] = useState<"basic" | "headers" | "body" | "response" | "test" | undefined>(undefined);

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
    // API 실행 대신 Editor의 Test 탭으로 이동 (컬럼 자동 감지 기능 포함)
    const endpoint = apiEndpoints.find(ep => ep.id === id);
    if (endpoint) {
      setEditingEndpoint(endpoint);
      setInitialTab("test");
    }
  };

  return (
    <div className="section">
      <SectionHeader
        title="API Endpoints"
        actions={
          <span className="dataset-list-count">{apiEndpoints.length}개</span>
        }
      />
      <div className="section-content">
        {apiEndpoints.length === 0 ? (
          <div className="dataset-empty">
            <Globe size={32} className="dataset-empty-icon" />
            <p className="dataset-empty-text">
              API Endpoint가 없습니다.
              <br />
              새 API를 추가하세요.
            </p>
          </div>
        ) : (
          <div className="dataset-list">
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
                    title="테스트"
                  >
                    <Play size={14} />
                  </button>
                  <button
                    type="button"
                    className="iconButton"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingEndpoint(endpoint);
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
          </div>
        )}

        <button
          type="button"
          className="dataset-add-btn"
          onClick={handleCreate}
        >
          <Plus size={16} />
          <span>API Endpoint 추가</span>
        </button>
      </div>

      {/* API Endpoint Editor */}
      {editingEndpoint && (
        <div className="dataset-editor-overlay">
          <ApiEndpointEditor
            endpoint={editingEndpoint}
            onClose={() => {
              setEditingEndpoint(null);
              setInitialTab(undefined);
            }}
            initialTab={initialTab}
          />
        </div>
      )}
    </div>
  );
}
