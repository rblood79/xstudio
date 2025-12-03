/**
 * DatasetEditorPanel - 데이터셋 에디터 패널
 *
 * DatasetPanel과 함께 사용되는 에디터 패널
 * - DataTable 생성/편집
 * - API Endpoint 편집
 * - Variable 편집
 * - Transformer 편집
 *
 * Store 기반으로 모드에 따라 에디터 컴포넌트를 렌더링
 * 탭은 패널 레벨에서 관리 (DatasetPanel과 동일한 구조)
 */

import { useState, useEffect } from "react";
import {
  Database,
  Table2,
  Settings,
  Code,
  FileJson,
  FileEdit,
  Play,
  Shield,
  X,
} from "lucide-react";
import type { PanelProps } from "../core/types";
import { useDatasetEditorStore } from "./stores/datasetEditorStore";
import {
  useDataTables,
  useApiEndpoints,
  useVariables,
  useTransformers,
} from "../../stores/data";
import {
  DataTableCreator,
  DataTableEditor,
  ApiEndpointEditor,
  VariableEditor,
} from "./editors";
import { EmptyState } from "../common/EmptyState";
import { PanelHeader } from "../common/PanelHeader";
import type {
  TableEditorTab,
  ApiEditorTab,
  VariableEditorTab,
} from "./types/editorTypes";
import "./DatasetEditorPanel.css";

// 탭 설정 타입
interface TabConfig<T extends string> {
  id: T;
  label: string;
  icon: typeof Database;
}

// 각 에디터 타입별 탭 설정
const TABLE_TABS: TabConfig<TableEditorTab>[] = [
  { id: "schema", label: "Schema", icon: Database },
  { id: "data", label: "Table", icon: Table2 },
  { id: "settings", label: "Settings", icon: Settings },
];

const API_TABS: TabConfig<ApiEditorTab>[] = [
  { id: "basic", label: "Basic", icon: Settings },
  { id: "headers", label: "Headers", icon: Code },
  { id: "body", label: "Body", icon: FileJson },
  { id: "response", label: "Response", icon: FileJson },
  { id: "test", label: "Test", icon: Play },
];

const VARIABLE_TABS: TabConfig<VariableEditorTab>[] = [
  { id: "basic", label: "Basic", icon: Settings },
  { id: "validation", label: "Validation", icon: Shield },
  { id: "transform", label: "Transform", icon: Code },
];

// Creator 모드 타입
type CreatorMode = "empty" | "preset";

export function DatasetEditorPanel({ isActive }: PanelProps) {
  const mode = useDatasetEditorStore((state) => state.mode);
  const close = useDatasetEditorStore((state) => state.close);

  // 탭 상태 관리
  const [tableTab, setTableTab] = useState<TableEditorTab>("schema");
  const [apiTab, setApiTab] = useState<ApiEditorTab>("basic");
  const [variableTab, setVariableTab] = useState<VariableEditorTab>("basic");

  // DataTableCreator 모드 상태 (empty/preset)
  const [creatorMode, setCreatorMode] = useState<CreatorMode>("preset");

  // 데이터 조회
  const dataTables = useDataTables();
  const apiEndpoints = useApiEndpoints();
  const variables = useVariables();
  const transformers = useTransformers();

  // API 에디터 초기 탭 설정
  useEffect(() => {
    if (mode?.type === "api-edit" && mode.initialTab) {
      setApiTab(mode.initialTab);
    }
  }, [mode]);

  // 모드 변경 시 탭/creatorMode 초기화
  useEffect(() => {
    if (mode?.type === "table-create") {
      setCreatorMode("preset"); // Creator 모드 초기화
    } else if (mode?.type === "table-edit") {
      setTableTab("schema");
    } else if (mode?.type === "api-edit" || mode?.type === "api-create") {
      if (mode?.type !== "api-edit" || !mode.initialTab) {
        setApiTab("basic");
      }
    } else if (
      mode?.type === "variable-edit" ||
      mode?.type === "variable-create"
    ) {
      setVariableTab("basic");
    }
  }, [mode?.type]);

  if (!isActive) return null;

  // 에디터가 열리지 않은 상태
  if (!mode) {
    return (
      <div className="dataset-editor-panel">
        <PanelHeader icon={<FileEdit size={16} />} title="Editor" />
        <div className="panel-contents">
          <EmptyState message="편집할 항목을 선택하세요" />
        </div>
      </div>
    );
  }

  // 모드에 따른 헤더 제목 결정
  const getHeaderTitle = (): string => {
    switch (mode.type) {
      case "table-create":
        return "Data Table Creator";
      case "table-edit": {
        const dataTable = dataTables.find((t) => t.id === mode.tableId);
        return dataTable?.name || "Table Editor";
      }
      case "api-create":
        return "New API";
      case "api-edit": {
        const endpoint = apiEndpoints.find((e) => e.id === mode.endpointId);
        return endpoint?.name || "API Editor";
      }
      case "variable-create":
        return "New Variable";
      case "variable-edit": {
        const variable = variables.find((v) => v.id === mode.variableId);
        return variable?.name || "Variable Editor";
      }
      case "transformer-create":
        return "New Transformer";
      case "transformer-edit": {
        const transformer = transformers.find(
          (t) => t.id === mode.transformerId
        );
        return transformer?.name || "Transformer Editor";
      }
      default:
        return "Editor";
    }
  };

  // 현재 모드에 따른 탭 렌더링
  // Note: table-create는 DataTableCreator가 자체 UI를 가지므로 탭 없음
  const renderTabs = () => {
    switch (mode.type) {
      case "table-edit":
        return (
          <div className="panel-tabs">
            {TABLE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`panel-tab ${tableTab === tab.id ? "active" : ""}`}
                onClick={() => setTableTab(tab.id)}
              >
                <tab.icon size={14} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        );

      case "api-edit":
        return (
          <div className="panel-tabs">
            {API_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`panel-tab ${apiTab === tab.id ? "active" : ""}`}
                onClick={() => setApiTab(tab.id)}
              >
                <tab.icon size={14} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        );

      case "variable-edit":
        return (
          <div className="panel-tabs">
            {VARIABLE_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`panel-tab ${
                  variableTab === tab.id ? "active" : ""
                }`}
                onClick={() => setVariableTab(tab.id)}
              >
                <tab.icon size={14} />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        );

      case "table-create":
        return (
          <div className="creator-mode-selection">
            <label className="creator-mode-option">
              <input
                type="radio"
                name="creatorMode"
                checked={creatorMode === "empty"}
                onChange={() => setCreatorMode("empty")}
              />
              <span className="creator-mode-label">빈 테이블로 시작</span>
            </label>
            <label className="creator-mode-option">
              <input
                type="radio"
                name="creatorMode"
                checked={creatorMode === "preset"}
                onChange={() => setCreatorMode("preset")}
              />
              <span className="creator-mode-label">Preset에서 선택</span>
            </label>
          </div>
        );

      // 다른 create 모드들은 TODO 상태이므로 탭 없음
      case "api-create":
      case "variable-create":
      case "transformer-create":
      case "transformer-edit":
      default:
        return null;
    }
  };

  // 모드에 따른 에디터 컨텐츠 렌더링
  const renderEditorContent = () => {
    switch (mode.type) {
      case "table-create":
        return (
          <DataTableCreator
            projectId={mode.projectId}
            onClose={close}
            mode={creatorMode}
          />
        );

      case "table-edit": {
        const dataTable = dataTables.find((t) => t.id === mode.tableId);
        if (!dataTable) {
          return <EmptyState message="테이블을 찾을 수 없습니다" />;
        }
        return (
          <DataTableEditor
            dataTable={dataTable}
            onClose={close}
            activeTab={tableTab}
          />
        );
      }

      case "api-create":
        // TODO: ApiEndpointCreator 구현 필요
        return <EmptyState message="API 생성 기능 준비 중" />;

      case "api-edit": {
        const endpoint = apiEndpoints.find((e) => e.id === mode.endpointId);
        if (!endpoint) {
          return <EmptyState message="API를 찾을 수 없습니다" />;
        }
        return (
          <ApiEndpointEditor
            endpoint={endpoint}
            onClose={close}
            activeTab={apiTab}
          />
        );
      }

      case "variable-create":
        // TODO: VariableCreator 구현 필요
        return <EmptyState message="변수 생성 기능 준비 중" />;

      case "variable-edit": {
        const variable = variables.find((v) => v.id === mode.variableId);
        if (!variable) {
          return <EmptyState message="변수를 찾을 수 없습니다" />;
        }
        return (
          <VariableEditor
            variable={variable}
            onClose={close}
            activeTab={variableTab}
          />
        );
      }

      case "transformer-create":
        // TODO: TransformerCreator 구현 필요
        return <EmptyState message="Transformer 생성 기능 준비 중" />;

      case "transformer-edit": {
        const transformer = transformers.find(
          (t) => t.id === mode.transformerId
        );
        if (!transformer) {
          return <EmptyState message="Transformer를 찾을 수 없습니다" />;
        }
        // TODO: TransformerEditor 구현 필요
        return <EmptyState message="Transformer 편집 기능 준비 중" />;
      }

      default:
        return <EmptyState message="편집할 항목을 선택하세요" />;
    }
  };

  return (
    <div className="dataset-editor-panel">
      <PanelHeader
        icon={<FileEdit size={16} />}
        title={getHeaderTitle()}
        actions={
          <button
            type="button"
            className="iconButton"
            onClick={close}
            title="닫기"
          >
            <X size={16} />
          </button>
        }
      />
      {renderTabs()}
      <div className="panel-contents">{renderEditorContent()}</div>
    </div>
  );
}
