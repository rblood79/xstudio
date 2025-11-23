/**
 * LayoutPresetPicker
 *
 * Layout 프리셋 선택 UI 컴포넌트.
 * 미리 정의된 Layout 템플릿을 시각적으로 표시하고 선택.
 */

import React, { useCallback } from "react";
import {
  layoutTemplates,
  layoutTemplatesByCategory,
  type LayoutTemplate,
} from "../../templates/layoutTemplates";
import { X, Layout, LayoutDashboard, Megaphone, BookOpen } from "lucide-react";
import { iconProps } from "../../../utils/ui/uiConstants";

interface LayoutPresetPickerProps {
  /** 선택된 프리셋 콜백 */
  onSelect: (template: LayoutTemplate) => void;
  /** 닫기 콜백 */
  onClose: () => void;
}

// 카테고리별 아이콘
const categoryIcons = {
  basic: Layout,
  dashboard: LayoutDashboard,
  marketing: Megaphone,
  documentation: BookOpen,
};

// 카테고리 라벨
const categoryLabels = {
  basic: "Basic",
  dashboard: "Dashboard",
  marketing: "Marketing",
  documentation: "Documentation",
};

/**
 * 프리셋 미리보기 SVG 생성
 */
function PresetPreview({ template }: { template: LayoutTemplate }) {
  // 템플릿 ID에 따라 다른 레이아웃 구조 시각화
  const renderPreview = () => {
    switch (template.id) {
      case "single-column":
        return (
          <svg viewBox="0 0 80 60" className="preset-preview-svg">
            <rect x="2" y="2" width="76" height="8" rx="1" className="header" />
            <rect x="2" y="14" width="76" height="36" rx="1" className="content" />
            <rect x="2" y="54" width="76" height="4" rx="1" className="footer" />
          </svg>
        );

      case "two-column":
        return (
          <svg viewBox="0 0 80 60" className="preset-preview-svg">
            <rect x="2" y="2" width="76" height="8" rx="1" className="header" />
            <rect x="2" y="14" width="18" height="36" rx="1" className="sidebar" />
            <rect x="22" y="14" width="56" height="36" rx="1" className="content" />
            <rect x="2" y="54" width="76" height="4" rx="1" className="footer" />
          </svg>
        );

      case "three-column":
        return (
          <svg viewBox="0 0 80 60" className="preset-preview-svg">
            <rect x="2" y="2" width="76" height="8" rx="1" className="header" />
            <rect x="2" y="14" width="16" height="36" rx="1" className="sidebar" />
            <rect x="20" y="14" width="40" height="36" rx="1" className="content" />
            <rect x="62" y="14" width="16" height="36" rx="1" className="aside" />
            <rect x="2" y="54" width="76" height="4" rx="1" className="footer" />
          </svg>
        );

      case "dashboard":
        return (
          <svg viewBox="0 0 80 60" className="preset-preview-svg">
            <rect x="2" y="2" width="76" height="8" rx="1" className="header" />
            <rect x="2" y="12" width="18" height="46" rx="1" className="sidebar" />
            <rect x="22" y="12" width="56" height="46" rx="1" className="content" />
          </svg>
        );

      case "dashboard-with-panel":
        return (
          <svg viewBox="0 0 80 60" className="preset-preview-svg">
            <rect x="2" y="2" width="76" height="8" rx="1" className="header" />
            <rect x="2" y="12" width="16" height="46" rx="1" className="sidebar" />
            <rect x="20" y="12" width="38" height="46" rx="1" className="content" />
            <rect x="60" y="12" width="18" height="46" rx="1" className="aside" />
          </svg>
        );

      case "landing-page":
        return (
          <svg viewBox="0 0 80 60" className="preset-preview-svg">
            <rect x="2" y="2" width="76" height="6" rx="1" className="header" />
            <rect x="2" y="10" width="76" height="14" rx="1" className="hero" />
            <rect x="2" y="26" width="76" height="20" rx="1" className="content" />
            <rect x="2" y="48" width="76" height="6" rx="1" className="cta" />
            <rect x="2" y="56" width="76" height="2" rx="1" className="footer" />
          </svg>
        );

      case "documentation":
        return (
          <svg viewBox="0 0 80 60" className="preset-preview-svg">
            <rect x="2" y="2" width="76" height="8" rx="1" className="header" />
            <rect x="2" y="14" width="20" height="44" rx="1" className="sidebar" />
            <rect x="24" y="14" width="40" height="44" rx="1" className="content" />
            <rect x="66" y="14" width="12" height="44" rx="1" className="toc" />
          </svg>
        );

      default:
        return (
          <svg viewBox="0 0 80 60" className="preset-preview-svg">
            <rect x="2" y="2" width="76" height="56" rx="1" className="content" />
          </svg>
        );
    }
  };

  return <div className="preset-preview">{renderPreview()}</div>;
}

export function LayoutPresetPicker({ onSelect, onClose }: LayoutPresetPickerProps) {
  const handleSelect = useCallback(
    (template: LayoutTemplate) => {
      onSelect(template);
    },
    [onSelect]
  );

  return (
    <div className="layout-preset-picker">
      {/* 헤더 */}
      <div className="preset-picker-header">
        <h4 className="preset-picker-title">Choose Layout Template</h4>
        <button
          className="iconButton preset-picker-close"
          onClick={onClose}
          aria-label="Close preset picker"
        >
          <X
            color={iconProps.color}
            strokeWidth={iconProps.stroke}
            size={iconProps.size}
          />
        </button>
      </div>

      {/* 카테고리별 프리셋 그리드 */}
      <div className="preset-picker-content">
        {Object.entries(layoutTemplatesByCategory).map(([category, templates]) => {
          if (templates.length === 0) return null;

          const Icon = categoryIcons[category as keyof typeof categoryIcons];
          const label = categoryLabels[category as keyof typeof categoryLabels];

          return (
            <div key={category} className="preset-category">
              <div className="preset-category-header">
                <Icon
                  size={14}
                  strokeWidth={iconProps.stroke}
                  color={iconProps.color}
                />
                <span className="preset-category-label">{label}</span>
              </div>
              <div className="preset-grid">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    className="preset-item"
                    onClick={() => handleSelect(template)}
                    title={template.description}
                  >
                    <PresetPreview template={template} />
                    <span className="preset-item-name">{template.name}</span>
                    <span className="preset-item-slots">
                      {template.slots.length} slots
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}

        {/* Blank Layout 옵션 */}
        <div className="preset-category">
          <div className="preset-category-header">
            <Layout
              size={14}
              strokeWidth={iconProps.stroke}
              color={iconProps.color}
            />
            <span className="preset-category-label">Custom</span>
          </div>
          <div className="preset-grid">
            <button
              className="preset-item preset-item-blank"
              onClick={() =>
                handleSelect({
                  id: "blank",
                  name: "Blank Layout",
                  description: "Start with an empty layout",
                  category: "basic",
                  elements: [],
                  slots: [],
                })
              }
              title="Start with an empty layout and build from scratch"
            >
              <div className="preset-preview preset-preview-blank">
                <svg viewBox="0 0 80 60" className="preset-preview-svg">
                  <rect
                    x="2"
                    y="2"
                    width="76"
                    height="56"
                    rx="2"
                    className="blank"
                    strokeDasharray="4 2"
                  />
                  <text x="40" y="34" textAnchor="middle" className="blank-text">
                    +
                  </text>
                </svg>
              </div>
              <span className="preset-item-name">Blank Layout</span>
              <span className="preset-item-slots">Custom slots</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LayoutPresetPicker;
