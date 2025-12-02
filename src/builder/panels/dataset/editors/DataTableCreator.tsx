/**
 * DataTableCreator - DataTable 생성 패널 컴포넌트
 *
 * Preset 선택 또는 빈 테이블로 DataTable 생성
 * DataTablePresetSelector의 패널 버전
 *
 * @see docs/features/DATATABLE_PRESET_SYSTEM.md
 */

import { useState, useMemo, useCallback } from "react";
import { Button } from "react-aria-components";
import {
  X,
  User,
  Key,
  Lock,
  Mail,
  Building2,
  Layers,
  Folder,
  Package,
  Tag,
  ShoppingCart,
  Cpu,
  Wrench,
  FileText,
  Users,
  Database,
  Settings,
  Factory,
} from "lucide-react";
import { useDataStore } from "../../../stores/data";
import { PanelHeader } from "../../common/PanelHeader";
import type { DataTablePreset, PresetCategory } from "../presets/types";
import { PRESET_CATEGORIES } from "../presets/types";
import { getPresetsByCategory } from "../presets/dataTablePresets";
import "./DataTableCreator.css";

// ============================================
// Icon Mapping
// ============================================

const iconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  User,
  Key,
  Lock,
  Mail,
  Building2,
  Layers,
  Folder,
  Package,
  Tag,
  ShoppingCart,
  Cpu,
  Wrench,
  FileText,
  Users,
  Database,
  Settings,
  Factory,
};

const categoryIconMap: Record<string, React.ComponentType<{ size?: number }>> = {
  "users-auth": Users,
  "organization": Building2,
  "ecommerce": ShoppingCart,
  "manufacturing": Factory,
  "system": Settings,
};

// ============================================
// Types
// ============================================

interface DataTableCreatorProps {
  projectId: string;
  onClose: () => void;
}

// ============================================
// Component
// ============================================

export function DataTableCreator({
  projectId,
  onClose,
}: DataTableCreatorProps) {
  const createDataTable = useDataStore((state) => state.createDataTable);

  // 선택 상태
  const [mode, setMode] = useState<"empty" | "preset">("preset");
  const [selectedCategory, setSelectedCategory] = useState<PresetCategory>("users-auth");
  const [selectedPreset, setSelectedPreset] = useState<DataTablePreset | null>(null);
  const [sampleCount, setSampleCount] = useState(10);
  const [tableName, setTableName] = useState("");

  // 카테고리별 Preset 목록
  const presetsInCategory = useMemo(
    () => getPresetsByCategory(selectedCategory),
    [selectedCategory]
  );

  // 카테고리 변경 핸들러
  const handleCategoryChange = useCallback((category: PresetCategory) => {
    setSelectedCategory(category);
    setSelectedPreset(null);
  }, []);

  // Preset 선택 핸들러
  const handlePresetSelect = useCallback((preset: DataTablePreset) => {
    setSelectedPreset(preset);
    setSampleCount(preset.defaultSampleCount);
  }, []);

  // 생성 핸들러
  const handleCreate = useCallback(async () => {
    try {
      if (mode === "empty") {
        const name = tableName.trim() || "New Table";
        await createDataTable({
          name,
          project_id: projectId,
          schema: [],
          mockData: [],
          useMockData: true,
        });
      } else if (selectedPreset) {
        const sampleData = selectedPreset.generateSampleData(sampleCount);
        await createDataTable({
          name: selectedPreset.name,
          project_id: projectId,
          schema: selectedPreset.schema,
          mockData: sampleData,
          useMockData: true,
        });
      }
      onClose();
    } catch (error) {
      console.error("DataTable 생성 실패:", error);
    }
  }, [mode, tableName, selectedPreset, sampleCount, projectId, createDataTable, onClose]);

  // 아이콘 렌더링 헬퍼
  const renderIcon = (iconName: string, size = 20) => {
    const IconComponent = iconMap[iconName];
    return IconComponent ? <IconComponent size={size} /> : <Database size={size} />;
  };

  const renderCategoryIcon = (category: PresetCategory, size = 16) => {
    const IconComponent = categoryIconMap[category];
    return IconComponent ? <IconComponent size={size} /> : <Database size={size} />;
  };

  return (
    <div className="datatable-creator">
      {/* Header */}
      <PanelHeader
        title="DataTable 추가"
        actions={
          <button type="button" className="iconButton" onClick={onClose} title="닫기">
            <X size={16} />
          </button>
        }
      />

      {/* Mode Selection */}
      <div className="creator-mode-selection">
        <label className="creator-mode-option">
          <input
            type="radio"
            name="mode"
            checked={mode === "empty"}
            onChange={() => setMode("empty")}
          />
          <span className="creator-mode-label">빈 테이블로 시작</span>
        </label>
        <label className="creator-mode-option">
          <input
            type="radio"
            name="mode"
            checked={mode === "preset"}
            onChange={() => setMode("preset")}
          />
          <span className="creator-mode-label">Preset에서 선택</span>
        </label>
      </div>

      {/* Content */}
      <div className="creator-content">
        {mode === "empty" ? (
          /* Empty Table Form */
          <div className="creator-empty-form">
            <label className="creator-form-label">
              테이블 이름
              <input
                type="text"
                className="creator-form-input"
                value={tableName}
                onChange={(e) => setTableName(e.target.value)}
                placeholder="New Table"
              />
            </label>
            <p className="creator-form-hint">
              빈 테이블을 생성한 후 Schema 탭에서 필드를 추가할 수 있습니다.
            </p>
          </div>
        ) : (
          /* Preset Selection */
          <>
            {/* Category Tabs */}
            <div className="creator-category-tabs">
              {PRESET_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`creator-category-tab ${
                    selectedCategory === cat.id ? "active" : ""
                  }`}
                  onClick={() => handleCategoryChange(cat.id)}
                  title={cat.description}
                >
                  {renderCategoryIcon(cat.id)}
                  <span>{cat.name}</span>
                </button>
              ))}
            </div>

            {/* Preset Grid */}
            <div className="creator-preset-grid">
              {presetsInCategory.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`creator-preset-card ${
                    selectedPreset?.id === preset.id ? "selected" : ""
                  }`}
                  onClick={() => handlePresetSelect(preset)}
                >
                  <div className="creator-preset-icon">
                    {renderIcon(preset.icon, 24)}
                  </div>
                  <div className="creator-preset-name">{preset.name}</div>
                  <div className="creator-preset-desc">{preset.description}</div>
                  <div className="creator-preset-meta">
                    {preset.schema.length} fields
                  </div>
                </button>
              ))}
            </div>

            {/* Schema Preview */}
            {selectedPreset && (
              <div className="creator-preview">
                <div className="creator-preview-header">
                  <span className="creator-preview-title">
                    {renderIcon(selectedPreset.icon, 16)}
                    {selectedPreset.name} Schema
                  </span>
                  <div className="creator-sample-count">
                    <label>샘플 데이터:</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={sampleCount}
                      onChange={(e) =>
                        setSampleCount(
                          Math.max(0, Math.min(100, parseInt(e.target.value) || 0))
                        )
                      }
                    />
                    <span>개</span>
                  </div>
                </div>
                <div className="creator-preview-schema">
                  {selectedPreset.schema.map((field) => (
                    <div key={field.key} className="creator-schema-field">
                      <span className="schema-field-name">
                        {field.key}
                        {field.required && (
                          <span className="schema-field-required">*</span>
                        )}
                      </span>
                      <span className="schema-field-type">{field.type}</span>
                      <span className="schema-field-label">{field.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="creator-footer">
        <Button className="react-aria-Button secondary" onPress={onClose}>
          취소
        </Button>
        <Button
          className="react-aria-Button primary"
          onPress={handleCreate}
          isDisabled={mode === "preset" && !selectedPreset}
        >
          {mode === "empty" ? "빈 테이블 생성" : "생성"}
        </Button>
      </div>
    </div>
  );
}

export default DataTableCreator;
