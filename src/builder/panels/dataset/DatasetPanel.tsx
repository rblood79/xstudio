/**
 * DatasetPanel - 프로젝트 레벨 데이터 관리 패널
 *
 * 4개 탭 구성:
 * - DataTables: 스키마 + Mock 데이터 관리
 * - API Endpoints: 외부 API 연결 설정
 * - Variables: 전역/페이지 상태 관리
 * - Transformers: 데이터 변환 시스템
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
} from "lucide-react";
import type { PanelProps } from "../core/types";
import { useDataStore, useDataTables } from "../../stores/data";
import { PanelHeader } from "../common/PanelHeader";
import { EmptyState } from "../common/EmptyState";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { DataTableList } from "./components/DataTableList";
import { ApiEndpointList } from "./components/ApiEndpointList";
import { VariableList } from "./components/VariableList";
import { TransformerList } from "./components/TransformerList";
import { DataTableEditor, DataTableCreator } from "./editors";
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
  const [editingTableId, setEditingTableId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Get projectId from URL params
  const { projectId: currentProjectId } = useParams<{ projectId: string }>();
  const isLoading = useDataStore((state) => state.isLoading);
  const fetchDataTables = useDataStore((state) => state.fetchDataTables);
  const fetchApiEndpoints = useDataStore((state) => state.fetchApiEndpoints);
  const fetchVariables = useDataStore((state) => state.fetchVariables);
  const fetchTransformers = useDataStore((state) => state.fetchTransformers);
  const dataTables = useDataTables();

  // 현재 편집 중인 DataTable
  const editingTable = editingTableId
    ? dataTables.find((t) => t.id === editingTableId)
    : null;

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
        <PanelHeader title="Dataset" />
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

  const handleCloseEditor = () => {
    setEditingTableId(null);
  };

  const handleCloseCreator = () => {
    setIsCreating(false);
  };

  const handleCreateClick = () => {
    setEditingTableId(null); // 편집 모드 종료
    setIsCreating(true);
  };

  const handleEditingChange = (id: string | null) => {
    setIsCreating(false); // 생성 모드 종료
    setEditingTableId(id);
  };

  // datatable-panel 표시 여부
  const showDatatablePanel = isCreating || editingTable;

  return (
    <div className="dataset-panel-wrapper">
      <div className="dataset-panel">
        <PanelHeader
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
        <div className="dataset-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`dataset-tab ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              <tab.icon size={14} />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="dataset-content">
          {/* 로딩 중에도 리스트 유지 (에디터가 닫히는 것 방지) */}
          {isLoading && <div className="dataset-loading-overlay"><LoadingSpinner /></div>}
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

      {/* DataTable Panel (Creator or Editor) */}
      {showDatatablePanel && (
        <div className="datatable-panel">
          {isCreating ? (
            <DataTableCreator
              projectId={currentProjectId}
              onClose={handleCloseCreator}
            />
          ) : editingTable ? (
            <DataTableEditor
              dataTable={editingTable}
              onClose={handleCloseEditor}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
