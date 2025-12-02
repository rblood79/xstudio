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
 */

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
import "./DatasetEditorPanel.css";

export function DatasetEditorPanel({ isActive }: PanelProps) {
  const mode = useDatasetEditorStore((state) => state.mode);
  const close = useDatasetEditorStore((state) => state.close);

  // 데이터 조회
  const dataTables = useDataTables();
  const apiEndpoints = useApiEndpoints();
  const variables = useVariables();
  const transformers = useTransformers();

  if (!isActive) return null;

  // 에디터가 열리지 않은 상태
  if (!mode) {
    return (
      <div className="dataset-editor-panel">
        <PanelHeader title="Editor" />
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
        return "New Table";
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

  // 모드에 따른 에디터 컨텐츠 렌더링
  const renderEditorContent = () => {
    switch (mode.type) {
      case "table-create":
        return (
          <DataTableCreator projectId={mode.projectId} onClose={close} />
        );

      case "table-edit": {
        const dataTable = dataTables.find((t) => t.id === mode.tableId);
        if (!dataTable) {
          return <EmptyState message="테이블을 찾을 수 없습니다" />;
        }
        return <DataTableEditor dataTable={dataTable} onClose={close} />;
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
            initialTab={mode.initialTab}
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
        return <VariableEditor variable={variable} onClose={close} />;
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
        title={getHeaderTitle()}
        actions={
          <button
            type="button"
            className="iconButton"
            onClick={close}
            title="닫기"
          >
            ×
          </button>
        }
      />
      <div className="panel-contents">
        {renderEditorContent()}
      </div>
    </div>
  );
}
