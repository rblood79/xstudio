/**
 * StylesPanel - 스타일 편집 패널
 *
 * PanelProps 인터페이스를 구현하여 패널 시스템과 통합
 * Phase 1-3 리팩토링 완료: Hooks, Sections, Constants, Types 분리
 * Phase 9b 완료: @modified 필터 추가
 * Phase 8a 완료: Accordion (섹션 접기/펴기 + localStorage 저장)
 * Phase 5 완료: Copy/Paste styles (Cmd+Shift+C/V)
 *
 * 🛡️ Gateway 패턴 적용 (2025-12-11)
 * - isActive 체크를 최상단에서 수행
 * - Content 컴포넌트 분리로 비활성 시 훅 실행 방지
 *
 * 🚀 Phase 22: 섹션별 훅 분리로 성능 최적화
 * - 각 Section이 자체 훅으로 스타일 값 관리
 * - 단일 속성 변경 시 해당 섹션만 재계산 (최대 86% 성능 개선)
 */

import "../../panels/common/index.css";
import { useState, useMemo, useCallback } from "react";
import type { PanelProps } from "../core/types";
import { useSelectedElementData } from "../../stores";
import {
  ToggleButtonGroup,
  ToggleButton,
  Button,
} from "../../../shared/components";
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
import { useKeyboardShortcutsRegistry } from "../../hooks/useKeyboardShortcutsRegistry";
import "./StylesPanel.css";

/**
 * StylesPanel - Gateway 컴포넌트
 * 🛡️ isActive 체크 후 Content 렌더링
 */
export function StylesPanel({ isActive }: PanelProps) {
  // 🛡️ Gateway: 비활성 시 즉시 반환 (훅 실행 방지)
  if (!isActive) {
    return null;
  }

  return <StylesPanelContent />;
}

/**
 * StylesPanelContent - 실제 콘텐츠 컴포넌트
 * 훅은 여기서만 실행됨 (isActive=true일 때만)
 */
function StylesPanelContent() {
  const selectedElement = useSelectedElementData();
  const [filter, setFilter] = useState<"all" | "modified">("all");
  const {
    expandAll,
    collapseAll,
    collapsedSections,
    focusMode,
    toggleFocusMode,
  } = useSectionCollapse();
  const { copyStyles, pasteStyles } = useStyleActions();

  // 🚀 Phase 22: 각 Section이 자체 훅으로 스타일 값을 관리 (성능 최적화)

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

  // 선택된 요소가 없으면 빈 상태 표시
  if (!selectedElement) {
    return <EmptyState message="요소를 선택하세요" />;
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <ToggleButtonGroup
          indicator
          aria-label="Style filter"
          selectionMode="single"
          selectedKeys={[filter]}
          onSelectionChange={(keys) => {
            const selectedFilter = Array.from(keys)[0] as "all" | "modified";
            setFilter(selectedFilter);
          }}
        >
          <ToggleButton id="all">Style</ToggleButton>
          <ToggleButton id="modified">
            modify {modifiedCount > 0 && `(${modifiedCount})`}
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Copy/Paste buttons */}
        <div className="panel-actions">
          <Button
            variant="ghost"
            className="iconButton"
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
              strokeWidth={iconProps.strokeWidth}
            />
          </Button>
          <Button
            variant="ghost"
            className="iconButton"
            onPress={handlePasteStyles}
            aria-label="Paste styles"
          >
            <ClipboardPaste
              color={iconProps.color}
              size={iconProps.size}
              strokeWidth={iconProps.strokeWidth}
            />
          </Button>
        </div>

        {/* Focus Mode indicator */}
        {focusMode && <div className="focus-mode-indicator">Focus Mode</div>}
      </div>

      {/* Sections */}
      {/* 🚀 Phase 22: 각 Section이 자체 훅으로 스타일 값 관리 */}
      <div className="panel-contents">
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
