/**
 * DatasetPanel - 프로젝트 레벨 데이터 관리 패널
 *
 * 4개 탭 구성:
 * - DataTables: 스키마 + Mock 데이터 관리
 * - API Endpoints: 외부 API 연결 설정
 * - Variables: 전역/페이지 상태 관리
 * - Transformers: 데이터 변환 시스템
 *
 * 편집 UI는 DatasetEditorPanel에서 처리
 *
 * @see docs/features/DATA_PANEL_SYSTEM.md
 */

import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Table2,
  Globe,
  Variable,
  Workflow,
  RefreshCw,
  Database,
} from "lucide-react";
import type { PanelProps } from "../core/types";
import { useDataStore } from "../../stores/data";
import { useDatasetEditorStore } from "./stores/datasetEditorStore";
import { PanelHeader } from "../common/PanelHeader";
import { EmptyState } from "../common/EmptyState";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { DataTableList } from "./components/DataTableList";
import { ApiEndpointList } from "./components/ApiEndpointList";
import { VariableList } from "./components/VariableList";
import { TransformerList } from "./components/TransformerList";
import "./DatasetPanel.css";

type DatasetTab = "tables" | "endpoints" | "variables" | "transformers";

interface TabConfig {
  id: DatasetTab;
  label: string;
  icon: typeof Table2;
}

const TABS: TabConfig[] = [
  { id: "tables", label: "Tables", icon: Table2 },
  { id: "endpoints", label: "APIs", icon: Globe },
  { id: "variables", label: "Variables", icon: Variable },
  { id: "transformers", label: "Transformers", icon: Workflow },
];

export function DatasetPanel({ isActive }: PanelProps) {
  const [activeTab, setActiveTab] = useState<DatasetTab>("tables");

  // Get projectId from URL params
  const { projectId: currentProjectId } = useParams<{ projectId: string }>();
  const isLoading = useDataStore((state) => state.isLoading);
  const fetchDataTables = useDataStore((state) => state.fetchDataTables);
  const fetchApiEndpoints = useDataStore((state) => state.fetchApiEndpoints);
  const fetchVariables = useDataStore((state) => state.fetchVariables);
  const fetchTransformers = useDataStore((state) => state.fetchTransformers);

  // Editor Store 액션
  const editorMode = useDatasetEditorStore((state) => state.mode);
  const openTableCreator = useDatasetEditorStore((state) => state.openTableCreator);
  const openTableEditor = useDatasetEditorStore((state) => state.openTableEditor);
  const closeEditor = useDatasetEditorStore((state) => state.close);

  // 현재 편집 중인 테이블 ID (하이라이트용)
  const editingTableId = editorMode?.type === "table-edit" ? editorMode.tableId : null;

  // Fetch data when panel becomes active or project changes
  useEffect(() => {
    if (isActive && currentProjectId) {
      fetchDataTables(currentProjectId);
      fetchApiEndpoints(currentProjectId);
      fetchVariables(currentProjectId);
      fetchTransformers(currentProjectId);
    }
  }, [
    isActive,
    currentProjectId,
    fetchDataTables,
    fetchApiEndpoints,
    fetchVariables,
    fetchTransformers,
  ]);

  // Performance: Don't render if not active
  if (!isActive) {
    return null;
  }

  // No project selected
  if (!currentProjectId) {
    return (
      <div className="dataset-panel">
        <PanelHeader icon={<Database size={16} />} title="Dataset" />
        <EmptyState message="프로젝트를 선택하세요" />
      </div>
    );
  }

  const handleRefresh = () => {
    if (currentProjectId) {
      fetchDataTables(currentProjectId);
      fetchApiEndpoints(currentProjectId);
      fetchVariables(currentProjectId);
      fetchTransformers(currentProjectId);
    }
  };

  const handleCreateClick = () => {
    openTableCreator(currentProjectId);
  };

  const handleEditingChange = (id: string | null) => {
    if (id) {
      openTableEditor(id);
    }
  };

  return (
    <div className="dataset-panel">
      <PanelHeader
        icon={<Database size={16} />}
        title="Dataset"
        actions={
          <button
            className="iconButton"
            type="button"
            onClick={handleRefresh}
            title="새로고침"
          >
            <RefreshCw size={16} />
          </button>
        }
      />

      {/* Tab Bar */}
      <div className="panel-tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`panel-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => {
              if (activeTab !== tab.id) {
                // 탭이 변경되면 에디터 닫기
                if (editorMode) {
                  closeEditor();
                }
                setActiveTab(tab.id);
              }
            }}
            type="button"
          >
            <tab.icon size={14} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Panel Contents */}
      <div className="panel-contents">
        {/* 로딩 중에도 리스트 유지 (에디터가 닫히는 것 방지) */}
        {isLoading && (
          <div className="dataset-loading-overlay">
            <LoadingSpinner />
          </div>
        )}
        {activeTab === "tables" && (
          <DataTableList
            projectId={currentProjectId}
            editingId={editingTableId}
            onEditingChange={handleEditingChange}
            onCreateClick={handleCreateClick}
          />
        )}
        {activeTab === "endpoints" && (
          <ApiEndpointList projectId={currentProjectId} />
        )}
        {activeTab === "variables" && (
          <VariableList projectId={currentProjectId} />
        )}
        {activeTab === "transformers" && (
          <TransformerList projectId={currentProjectId} />
        )}
      </div>
    </div>
  );
}
