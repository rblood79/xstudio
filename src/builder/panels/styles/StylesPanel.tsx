/**
 * StylesPanel - 스타일 편집 패널
 *
 * PanelProps 인터페이스를 구현하여 패널 시스템과 통합
 * Phase 1-3 리팩토링 완료: Hooks, Sections, Constants, Types 분리
 * Phase 9b 완료: @modified 필터 추가
 * Phase 8a 완료: Accordion (섹션 접기/펴기 + localStorage 저장)
 * Phase 5 완료: Copy/Paste styles (Cmd+Shift+C/V)
 */

import "../../panels/common/index.css";
import { useState, useMemo, useEffect } from "react";
import type { PanelProps } from "../core/types";
import { useInspectorState } from "../../inspector/hooks/useInspectorState";
import { ToggleButtonGroup, ToggleButton, Button } from "../../components";
import { Copy, ClipboardPaste } from "lucide-react";
import { iconProps } from "../../../utils/ui/uiConstants";
import { EmptyState } from "../common";
import {
  TransformSection,
  LayoutSection,
  AppearanceSection,
  TypographySection,
  ModifiedStylesSection,
} from "./sections";
import { getModifiedProperties } from "./hooks/useStyleSource";
import { useSectionCollapse } from "./hooks/useSectionCollapse";
import { useStyleActions } from "./hooks/useStyleActions";

export function StylesPanel({ isActive }: PanelProps) {
  const selectedElement = useInspectorState((state) => state.selectedElement);
  const [filter, setFilter] = useState<"all" | "modified">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const {
    expandAll,
    collapseAll,
    collapsedSections,
    focusMode,
    toggleFocusMode,
  } = useSectionCollapse();
  const { copyStyles, pasteStyles } = useStyleActions();

  // Calculate modified properties count
  const modifiedCount = useMemo(() => {
    if (!selectedElement) return 0;
    return getModifiedProperties(selectedElement).length;
  }, [selectedElement]);

  // Copy/Paste handlers
  const handleCopyStyles = async () => {
    if (!selectedElement?.style) return;
    await copyStyles(selectedElement.style as Record<string, unknown>);
    // TODO: Show toast notification
  };

  const handlePasteStyles = async () => {
    await pasteStyles();
    // TODO: Show toast notification
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Shift + C: Copy Styles
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "c") {
        e.preventDefault();
        handleCopyStyles();
        return;
      }

      // Cmd/Ctrl + Shift + V: Paste Styles
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "v") {
        e.preventDefault();
        handlePasteStyles();
        return;
      }

      // Alt/Option + Shift + S: Focus Mode 토글
      if ((e.altKey || e.metaKey) && e.shiftKey && e.key === "s") {
        e.preventDefault();
        toggleFocusMode();
        return;
      }

      // Alt/Option + S: 전체 펼침/접기 토글
      if ((e.altKey || e.metaKey) && e.key === "s" && !e.shiftKey) {
        e.preventDefault();
        // Check if all sections are collapsed
        const allCollapsed = collapsedSections.size === 4;
        if (allCollapsed) {
          expandAll();
        } else {
          collapseAll();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    collapsedSections,
    expandAll,
    collapseAll,
    toggleFocusMode,
    selectedElement,
  ]);

  // 활성 상태가 아니면 렌더링하지 않음 (성능 최적화)
  if (!isActive) {
    return null;
  }

  // 선택된 요소가 없으면 빈 상태 표시
  if (!selectedElement) {
    return <EmptyState message="요소를 선택하세요" />;
  }

  return (
    <div className="styles-panel">
      {/* Filter toggle */}
      <div className="panel-header">
        <ToggleButtonGroup
          aria-label="Style filter"
          selectionMode="single"
          selectedKeys={[filter]}
          onSelectionChange={(keys) => {
            const selectedFilter = Array.from(keys)[0] as "all" | "modified";
            setFilter(selectedFilter);
          }}
        >
          <ToggleButton id="all">All</ToggleButton>
          <ToggleButton id="modified">
            Modified {modifiedCount > 0 && `(${modifiedCount})`}
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Copy/Paste buttons */}
        <div className="panel-actions">
          <Button
            variant="ghost"
            size="sm"
            onPress={handleCopyStyles}
            aria-label="Copy styles"
            isDisabled={
              !selectedElement?.style ||
              Object.keys(selectedElement.style).length === 0
            }
          >
            <Copy
              color={iconProps.color}
              size={iconProps.size}
              strokeWidth={iconProps.stroke}
            />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onPress={handlePasteStyles}
            aria-label="Paste styles"
          >
            <ClipboardPaste
              color={iconProps.color}
              size={iconProps.size}
              strokeWidth={iconProps.stroke}
            />
          </Button>
        </div>

        {/* Focus Mode indicator */}
        {focusMode && <div className="focus-mode-indicator">Focus Mode</div>}
      </div>

      {/* Sections */}
      <div className="style-section">
        {filter === "all" ? (
          <>
            <TransformSection selectedElement={selectedElement} />
            <LayoutSection selectedElement={selectedElement} />
            <AppearanceSection selectedElement={selectedElement} />
            <TypographySection selectedElement={selectedElement} />
          </>
        ) : (
          <ModifiedStylesSection selectedElement={selectedElement} />
        )}
      </div>
    </div>
  );
}
