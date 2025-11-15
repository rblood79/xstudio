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
import { useState, useMemo, useCallback } from "react";
import type { PanelProps } from "../core/types";
import { useInspectorState } from "../../inspector/hooks/useInspectorState";
import { ToggleButtonGroup, ToggleButton, Button } from "../../components";
import { Copy, ClipboardPaste } from "lucide-react";
import { iconProps } from "../../../utils/ui/uiConstants";
import { EmptyState, PanelHeader } from "../common";
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
import { useKeyboardShortcutsRegistry } from "../../hooks/useKeyboardShortcutsRegistry";

export function StylesPanel({ isActive }: PanelProps) {
  const selectedElement = useInspectorState((state) => state.selectedElement);
  const [filter, setFilter] = useState<"all" | "modified">("all");
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
  const handleCopyStyles = useCallback(async () => {
    if (!selectedElement?.style) return;
    await copyStyles(selectedElement.style as Record<string, unknown>);
    // TODO: Show toast notification
  }, [selectedElement, copyStyles]);

  const handlePasteStyles = useCallback(async () => {
    await pasteStyles();
    // TODO: Show toast notification
  }, [pasteStyles]);

  // 🔥 최적화: 키보드 단축키를 useKeyboardShortcutsRegistry로 통합
  const shortcuts = useMemo(
    () => [
      {
        key: "c",
        modifier: "cmdShift" as const,
        handler: handleCopyStyles,
        description: "Copy Styles",
      },
      {
        key: "v",
        modifier: "cmdShift" as const,
        handler: handlePasteStyles,
        description: "Paste Styles",
      },
      {
        key: "s",
        modifier: "altShift" as const,
        handler: toggleFocusMode,
        description: "Toggle Focus Mode",
      },
      {
        key: "s",
        modifier: "alt" as const,
        handler: () => {
          // Check if all sections are collapsed
          const allCollapsed = collapsedSections.size === 4;
          if (allCollapsed) {
            expandAll();
          } else {
            collapseAll();
          }
        },
        description: "Expand/Collapse All Sections",
      },
    ],
    [
      handleCopyStyles,
      handlePasteStyles,
      toggleFocusMode,
      collapsedSections,
      expandAll,
      collapseAll,
    ]
  );

  useKeyboardShortcutsRegistry(shortcuts, [
    handleCopyStyles,
    handlePasteStyles,
    toggleFocusMode,
    collapsedSections,
    expandAll,
    collapseAll,
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
      <PanelHeader
        title="Styles"
        actions={
          <>
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
          </>
        }
      />

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
