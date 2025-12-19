/**
 * DataTablePanel - 프로젝트 레벨 데이터 관리 패널
 *
 * 4개 탭 구성:
 * - DataTables: 스키마 + Mock 데이터 관리
 * - API Endpoints: 외부 API 연결 설정
 * - Variables: 전역/페이지 상태 관리
 * - Transformers: 데이터 변환 시스템
 *
 * 편집 UI는 DataTableEditorPanel에서 처리
 *
 * 🚀 Phase 6: React Query로 서버 상태 관리
 * - 자동 캐싱 (5분 staleTime)
 * - 중복 요청 방지
 * - enabled 옵션으로 조건부 fetching
 *
 * @see docs/features/DATA_PANEL_SYSTEM.md
 * @since 2025-12-10 Phase 6 React Query
 */

import { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  Table2,
  Globe,
  Variable,
  Workflow,
  RefreshCw,
  Database,
} from "lucide-react";
import { iconProps, iconEditProps } from "../../../utils/ui/uiConstants";
import type { PanelProps } from "../core/types";
import { useDataStore } from "../../stores/data";
import { useDataTableEditorStore } from "./stores/dataTableEditorStore";
import { useDataPanelQuery } from "../../hooks/useDataQueries";
import { PanelHeader } from "../common/PanelHeader";
import { EmptyState } from "../common/EmptyState";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { DataTableList } from "./components/DataTableList";
import { ApiEndpointList } from "./components/ApiEndpointList";
import { VariableList } from "./components/VariableList";
import { TransformerList } from "./components/TransformerList";
import "./DataTablePanel.css";

type DataTableTab = "tables" | "endpoints" | "variables" | "transformers";

interface TabConfig {
  id: DataTableTab;
  label: string;
  icon: typeof Table2;
}

const TABS: TabConfig[] = [
  { id: "tables", label: "Tables", icon: Table2 },
  { id: "endpoints", label: "APIs", icon: Globe },
  { id: "variables", label: "Variables", icon: Variable },
  { id: "transformers", label: "Transformers", icon: Workflow },
];

export function DataTablePanel({ isActive }: PanelProps) {
  const [activeTab, setActiveTab] = useState<DataTableTab>("tables");

  // Get projectId from URL params
  const { projectId: currentProjectId } = useParams<{ projectId: string }>();

  // 초기 로딩 트래킹 - 프로젝트별로 한 번만 로드
  const initialLoadedRef = useRef<string | null>(null);

  // 🚀 Phase 6: React Query로 데이터 fetching
  // - enabled: isActive && !!currentProjectId → 패널 비활성 시 fetching 안함
  // - staleTime: 5분 캐싱 → 중복 요청 방지
  // - 자동 dedupe → 같은 요청 동시 발생 시 1회만 실행
  const {
    isLoading,
    refetch,
  } = useDataPanelQuery(currentProjectId, {
    enabled: isActive,
  });

  // Zustand Store는 여전히 사용 (mutations 및 Canvas 동기화)
  const fetchDataTables = useDataStore((state) => state.fetchDataTables);
  const fetchApiEndpoints = useDataStore((state) => state.fetchApiEndpoints);
  const fetchVariables = useDataStore((state) => state.fetchVariables);
  const fetchTransformers = useDataStore((state) => state.fetchTransformers);

  // 🆕 패널 활성화 시 IndexedDB에서 Zustand Store로 데이터 동기화
  // React Query 캐시와 별개로, Zustand Store도 초기화해야 DataTableList에서 보임
  useEffect(() => {
    if (isActive && currentProjectId && initialLoadedRef.current !== currentProjectId) {
      initialLoadedRef.current = currentProjectId;

      // Zustand Store에 데이터 로드 (IndexedDB → Memory)
      Promise.all([
        fetchDataTables(currentProjectId),
        fetchApiEndpoints(currentProjectId),
        fetchVariables(currentProjectId),
        fetchTransformers(currentProjectId),
      ]).then(() => {
      }).catch((error) => {
        console.error(`❌ [DataTablePanel] 초기화 실패:`, error);
      });
    }
  }, [isActive, currentProjectId, fetchDataTables, fetchApiEndpoints, fetchVariables, fetchTransformers]);

  // Editor Store 액션
  const editorMode = useDataTableEditorStore((state) => state.mode);
  const openTableCreator = useDataTableEditorStore((state) => state.openTableCreator);
  const openTableEditor = useDataTableEditorStore((state) => state.openTableEditor);
  const closeEditor = useDataTableEditorStore((state) => state.close);

  // 현재 편집 중인 테이블 ID (하이라이트용)
  const editingTableId = editorMode?.type === "table-edit" ? editorMode.tableId : null;

  // Performance: Don't render if not active
  if (!isActive) {
    return null;
  }

  // No project selected
  if (!currentProjectId) {
    return (
      <div className="datatable-panel">
        <PanelHeader icon={<Database size={iconProps.size} />} title="DataTable" />
        <EmptyState message="프로젝트를 선택하세요" />
      </div>
    );
  }

  const handleRefresh = () => {
    if (currentProjectId) {
      // 🚀 Phase 6: React Query refetch + Zustand store 동기화
      refetch();
      // Zustand Store도 업데이트 (Canvas 동기화용)
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
    <div className="datatable-panel">
      <PanelHeader
        icon={<Database size={iconProps.size} />}
        title="DataTable"
        actions={
          <button
            className="iconButton"
            type="button"
            onClick={handleRefresh}
            title="새로고침"
          >
            <RefreshCw size={iconProps.size} />
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
            <tab.icon size={iconEditProps.size} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Panel Contents */}
      <div className="panel-contents">
        {/* 로딩 중에도 리스트 유지 (에디터가 닫히는 것 방지) */}
        {isLoading && (
          <div className="datatable-loading-overlay">
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
