/**
 * Dataset Editor
 *
 * Dataset 컴포넌트의 속성 편집기
 * 데이터 소스 설정 및 새로고침 옵션을 관리
 *
 * @see docs/PLANNED_FEATURES.md - Dataset Component Architecture
 */

import { memo, useCallback, useMemo } from "react";
import {
  Database,
  FileText,
  RefreshCw,
  Clock,
  Eye,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import {
  PropertyInput,
  PropertySwitch,
  PropertyCustomId,
  PropertySection,
  PropertyDataBinding,
  type DataBindingValue,
} from "../../common";
import { PropertyEditorProps } from "../types/editorTypes";
import { useStore } from "../../../stores";
import { useDatasetStore } from "../../../stores/dataset";

export const DatasetEditor = memo(function DatasetEditor({
  elementId,
  currentProps,
  onUpdate,
}: PropertyEditorProps) {
  // Get customId from element in store
  const customId = useMemo(() => {
    const element = useStore.getState().elementsMap.get(elementId);
    return element?.customId || "";
  }, [elementId]);

  // Dataset Store에서 현재 Dataset 상태 가져오기
  const datasetId = String(currentProps.id || "");
  const datasetState = useDatasetStore((state) =>
    datasetId ? state.datasetStates.get(datasetId) : undefined
  );
  const loadDataset = useDatasetStore((state) => state.loadDataset);
  const refreshDataset = useDatasetStore((state) => state.refreshDataset);

  // Update prop helper
  const updateProp = useCallback(
    (key: string, value: unknown) => {
      const updatedProps = { ...currentProps, [key]: value };
      onUpdate(updatedProps);
    },
    [currentProps, onUpdate]
  );

  // Update customId helper
  const updateCustomId = useCallback(
    (newCustomId: string) => {
      const updateElement = useStore.getState().updateElement;
      if (updateElement && elementId) {
        updateElement(elementId, { customId: newCustomId });
      }
    },
    [elementId]
  );

  // DataBinding change handler
  const handleDataBindingChange = useCallback(
    (binding: DataBindingValue | null) => {
      updateProp("dataBinding", binding || undefined);
    },
    [updateProp]
  );

  // Refresh handler
  const handleRefresh = useCallback(() => {
    if (datasetId) {
      refreshDataset(datasetId);
    }
  }, [datasetId, refreshDataset]);

  // Load handler
  const handleLoad = useCallback(() => {
    if (datasetId) {
      loadDataset(datasetId);
    }
  }, [datasetId, loadDataset]);

  // Status icon renderer
  const renderStatusIcon = () => {
    if (!datasetState) return null;

    switch (datasetState.status) {
      case "loading":
        return <Loader2 size={14} className="spin" />;
      case "success":
        return <CheckCircle2 size={14} className="text-success" />;
      case "error":
        return <AlertCircle size={14} className="text-error" />;
      default:
        return null;
    }
  };

  return (
    <>
      {/* Basic Section */}
      <PropertySection title="Basic">
        <PropertyCustomId
          label="ID"
          value={customId}
          elementId={elementId}
          onChange={updateCustomId}
          placeholder="dataset_1"
        />
      </PropertySection>

      {/* Dataset Settings Section */}
      <PropertySection title="Dataset Settings" icon={Database}>
        <PropertyInput
          label="Dataset ID"
          value={String(currentProps.id || "")}
          onChange={(value) => updateProp("id", value || "")}
          placeholder="users-dataset"
          icon={Database}
          description="Unique identifier for this dataset"
        />

        <PropertyInput
          label="Name"
          value={String(currentProps.name || "")}
          onChange={(value) => updateProp("name", value || "")}
          placeholder="Users Data"
          icon={FileText}
          description="Display name for this dataset"
        />

        <PropertyInput
          label="Description"
          value={String(currentProps.description || "")}
          onChange={(value) => updateProp("description", value || undefined)}
          placeholder="User information from API"
          icon={FileText}
          description="Optional description"
        />
      </PropertySection>

      {/* Data Source Section */}
      <PropertySection title="Data Source" icon={Database}>
        <PropertyDataBinding
          label="Data Binding"
          value={currentProps.dataBinding as DataBindingValue | undefined}
          onChange={handleDataBindingChange}
        />
      </PropertySection>

      {/* Auto Refresh Section */}
      <PropertySection title="Auto Refresh" icon={RefreshCw}>
        <PropertySwitch
          label="Auto Load"
          isSelected={currentProps.autoLoad !== false}
          onChange={(checked) => updateProp("autoLoad", checked)}
          icon={Eye}
          description="Load data automatically on mount"
        />

        <PropertyInput
          label="Refresh Interval (ms)"
          value={String(currentProps.refreshInterval || "")}
          onChange={(value) => {
            const num = parseInt(value, 10);
            updateProp("refreshInterval", isNaN(num) ? undefined : num);
          }}
          placeholder="0 (disabled)"
          icon={Clock}
          description="Auto-refresh interval (0 = disabled)"
        />
      </PropertySection>

      {/* Dataset Status Section */}
      <PropertySection title="Dataset Status" icon={Eye}>
        <div className="dataset-status-preview">
          <div className="dataset-status-row">
            <span className="dataset-status-label">Status:</span>
            <span className="dataset-status-value">
              {renderStatusIcon()}
              {datasetState?.status || "Not registered"}
            </span>
          </div>

          {datasetState?.data && (
            <div className="dataset-status-row">
              <span className="dataset-status-label">Items:</span>
              <span className="dataset-status-value">
                {datasetState.data.length}
              </span>
            </div>
          )}

          {datasetState?.error && (
            <div className="dataset-status-row error">
              <span className="dataset-status-label">Error:</span>
              <span className="dataset-status-value text-error">
                {datasetState.error}
              </span>
            </div>
          )}

          {datasetState?.lastLoadedAt && (
            <div className="dataset-status-row">
              <span className="dataset-status-label">Last loaded:</span>
              <span className="dataset-status-value">
                {new Date(datasetState.lastLoadedAt).toLocaleTimeString()}
              </span>
            </div>
          )}

          {datasetState?.consumers && datasetState.consumers.length > 0 && (
            <div className="dataset-status-row">
              <span className="dataset-status-label">Consumers:</span>
              <span className="dataset-status-value">
                {datasetState.consumers.length} component(s)
              </span>
            </div>
          )}
        </div>

        <div className="dataset-actions">
          <button
            className="control-button secondary"
            onClick={handleLoad}
            disabled={!datasetId || datasetState?.status === "loading"}
          >
            <Database size={14} />
            Load Data
          </button>

          <button
            className="control-button secondary"
            onClick={handleRefresh}
            disabled={!datasetId || datasetState?.status === "loading"}
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </PropertySection>

      {/* Usage Info Section */}
      <PropertySection title="Usage Info">
        <div className="dataset-editor-info">
          <p className="dataset-editor-info-text">
            Dataset provides centralized data management. Other components can
            reference this dataset using its ID.
          </p>
          <ul className="dataset-editor-info-list">
            <li>
              Set a unique Dataset ID (e.g., "users-dataset", "products-api")
            </li>
            <li>Configure data source using Data Binding</li>
            <li>
              Reference in ListBox, Select, ComboBox with{" "}
              <code>datasetId</code> prop
            </li>
            <li>Multiple components can share the same dataset</li>
          </ul>
        </div>
      </PropertySection>
    </>
  );
});

export default DatasetEditor;
