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
 *
 * 🚀 Phase 3b: StylesPanel Jotai 최적화
 * - useSelectedElementData() 제거, Jotai atom으로 대체
 * - 요소 교차 선택 시 불필요한 리렌더 방지
 */

import { useState, useMemo, useCallback, memo } from "react";
import { ToggleButton } from "react-aria-components";
import type { PanelProps } from "../core/types";
import { useDebouncedSelectedElementData } from "../../stores";
import { ActionIconButton } from "../../components/ui";
import { Copy, ClipboardPaste, PencilRuler, Palette } from "lucide-react";
import { iconProps } from "../../../utils/ui/uiConstants";
import { EmptyState } from "../../components";
import {
  TransformSection,
  LayoutSection,
  AppearanceSection,
  TypographySection,
  ModifiedStylesSection,
  ComponentStateSection,
} from "./sections";
import { useSectionCollapse } from "./hooks/useSectionCollapse";
import { useStyleActions } from "./hooks/useStyleActions";
import { useKeyboardShortcutsRegistry } from "@/builder/hooks";
import { useZustandJotaiBridge } from "./hooks/useZustandJotaiBridge";
import { useAtomValue } from "jotai";
import {
  hasSelectedElementAtom,
  selectedElementAtom,
  selectedStyleAtom,
  modifiedCountAtom,
  isCopyDisabledAtom,
} from "./atoms/styleAtoms";
import "./StylesPanel.css";

/**
 * 🚀 Phase 3: Zustand-Jotai 브릿지 전용 컴포넌트
 * - 자체 리렌더 없음 (useSetAtom은 리렌더 트리거 안함)
 * - 스타일 패널과 독립적으로 동기화 수행
 */
function JotaiBridge() {
  useZustandJotaiBridge();
  return null;
}

/**
 * StylesPanel - Gateway 컴포넌트
 * 🛡️ isActive 체크 후 Content 렌더링
 */
export function StylesPanel({ isActive }: PanelProps) {
  // 🛡️ Gateway: 비활성 시 즉시 반환 (훅 실행 방지)
  if (!isActive) {
    return null;
  }

  return (
    <>
      <JotaiBridge />
      <StylesPanelContent />
    </>
  );
}

/**
 * 🚀 Phase 3b: ModifiedSections 래퍼
 * - filter가 "modified"일 때만 Zustand 구독
 * - "all" 모드에서는 마운트되지 않음
 */
const ModifiedSectionsWrapper = memo(function ModifiedSectionsWrapper() {
  // 🚀 Phase 3: 디바운스된 선택 데이터 사용
  const selectedElement = useDebouncedSelectedElementData();
  if (!selectedElement) return null;
  return <ModifiedStylesSection selectedElement={selectedElement} />;
});

/**
 * 🚀 Phase 3b: All Sections 래퍼
 * - memo로 감싸서 부모 리렌더 영향 차단
 * - Jotai atom 기반 섹션들만 포함
 */
const AllSections = memo(function AllSections() {
  const selectedElement = useAtomValue(selectedElementAtom);
  const hasSpec = selectedElement?.type != null && selectedElement.type !== "";

  return (
    <>
      <ComponentStateSection hasSpec={hasSpec} />
      <TransformSection />
      <LayoutSection />
      <AppearanceSection />
      <TypographySection />
    </>
  );
});

/**
 * StylesPanelContent - 실제 콘텐츠 컴포넌트
 * 훅은 여기서만 실행됨 (isActive=true일 때만)
 * 🚀 Phase 3b: Jotai atom 기반으로 최적화
 */
function StylesPanelContent() {
  // 🚀 Phase 3b: Jotai atoms로 구독 (교차 선택 시 리렌더 최소화)
  const hasSelectedElement = useAtomValue(hasSelectedElementAtom);
  const selectedStyle = useAtomValue(selectedStyleAtom);
  const modifiedCount = useAtomValue(modifiedCountAtom);
  const isCopyDisabled = useAtomValue(isCopyDisabledAtom);

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

  // Copy/Paste handlers
  const handleCopyStyles = useCallback(async () => {
    if (!selectedStyle) return;
    await copyStyles(selectedStyle as Record<string, unknown>);
    // TODO: Show toast notification
  }, [selectedStyle, copyStyles]);

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
    ],
  );

  useKeyboardShortcutsRegistry(shortcuts, [
    handleCopyStyles,
    handlePasteStyles,
    toggleFocusMode,
    collapsedSections,
    expandAll,
    collapseAll,
  ]);

  // 🚀 Phase 3b: Jotai atom 기반 empty state 체크
  if (!hasSelectedElement) {
    return <EmptyState message="요소를 선택하세요" />;
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <div className="panel-actions">
          <ToggleButton
            className="iconButton"
            isSelected={filter === "all"}
            onChange={() => setFilter("all")}
            aria-label="Style"
          >
            <Palette
              color={iconProps.color}
              size={iconProps.size}
              strokeWidth={iconProps.strokeWidth}
            />
          </ToggleButton>
          <ToggleButton
            className="iconButton panel-title"
            isSelected={filter === "modified"}
            onChange={() => setFilter("modified")}
            aria-label="Modify"
          >
            <PencilRuler
              color={iconProps.color}
              size={iconProps.size}
              strokeWidth={iconProps.strokeWidth}
            />
            {modifiedCount > 0 && `modify ${modifiedCount}`}
          </ToggleButton>
        </div>
        <div className="panel-actions">
          <ActionIconButton
            onPress={handleCopyStyles}
            aria-label="Copy styles"
            isDisabled={isCopyDisabled}
            tooltip="스타일 복사"
          >
            <Copy
              color={iconProps.color}
              size={iconProps.size}
              strokeWidth={iconProps.strokeWidth}
            />
          </ActionIconButton>
          <ActionIconButton
            onPress={handlePasteStyles}
            aria-label="Paste styles"
            tooltip="스타일 붙여넣기"
          >
            <ClipboardPaste
              color={iconProps.color}
              size={iconProps.size}
              strokeWidth={iconProps.strokeWidth}
            />
          </ActionIconButton>
        </div>

        {/* Focus Mode indicator */}
        {focusMode && <div className="focus-mode-indicator">Focus Mode</div>}
      </div>

      {/* Sections */}
      {/* 🚀 Phase 3b: memo 래퍼로 리렌더 차단 */}
      <div className="panel-contents">
        {filter === "all" ? <AllSections /> : <ModifiedSectionsWrapper />}
      </div>
    </div>
  );
}
