import React from "react";
import {
  Menu,
  Eye,
  Undo,
  Redo,
  Play,
  Monitor,
  Laptop,
  Tablet,
  Smartphone,
  Activity,
  GitBranch,
  Settings,
} from "lucide-react";
import {
  Key,
} from "react-aria-components";
import { ToggleButtonGroup, ToggleButton } from "@xstudio/shared/components";
import { iconProps } from "../../utils/ui/uiConstants";
import { usePanelLayout } from "../layout";
import { ZoomControls } from "../workspace/ZoomControls";
import { ShortcutTooltip } from "../components/overlay";
export interface Breakpoint {
  id: string;
  label: string;
  max_width: string | number;
  max_height: string | number;
}

// 새로운 히스토리 시스템 타입
export interface HistoryInfo {
  current: number;
  total: number;
}

export interface BuilderHeaderProps {
  projectId?: string;
  projectName?: string;
  breakpoint: Set<Key>;
  breakpoints: Breakpoint[];
  onBreakpointChange: (value: Key) => void;
  historyInfo: HistoryInfo;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onPreview: () => void;
  onPlay: () => void;
  onPublish: () => void;
  showWorkflowOverlay: boolean;
  onWorkflowOverlayToggle: () => void;
}

export const BuilderHeader: React.FC<BuilderHeaderProps> = ({
  projectId,
  projectName,
  breakpoint,
  breakpoints,
  onBreakpointChange,
  historyInfo,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onPreview,
  onPlay,
  onPublish,
  showWorkflowOverlay,
  onWorkflowOverlayToggle,
}) => {
  const { layout, toggleBottomPanel, openPanelAsModal } = usePanelLayout();
  const isMonitorOpen =
    layout.showBottom && layout.activeBottomPanels.includes("monitor");

  return (
    <nav className="header">
      <div className="header_contents header_left">
        <button aria-label="menu">
          <Menu strokeWidth={iconProps.strokeWidth} size={iconProps.size} />
        </button>
        <div className="logo-container">
          <img src="/appIcon.svg" alt="logo" />
        </div>
        <div className="project-info">
          {projectName && <span className="project-name">{projectName}</span>}
          {/*projectId && <code className="project-id">ID: {projectId}</code>*/}
          {!projectId && !projectName && "No project loaded"}
        </div>
      </div>

      <div className="header_contents screen">
        <code className="code sizeInfo">
          {
            breakpoints.find((bp) => bp.id === Array.from(breakpoint)[0])
              ?.max_width
          }
          x
          {
            breakpoints.find((bp) => bp.id === Array.from(breakpoint)[0])
              ?.max_height
          }
        </code>

        <ToggleButtonGroup
          selectionMode="single"
          selectedKeys={breakpoint}
          onSelectionChange={(keys) => {
            const selected = Array.from(keys)[0];
            if (selected) onBreakpointChange(selected);
          }}
          indicator={true}
        >
          {breakpoints.map((bp) => (
            <ToggleButton id={bp.id} key={bp.id} aria-label={bp.label}>
              {bp.id === "desktop" && (
                <Monitor
                  color={iconProps.color}
                  strokeWidth={iconProps.strokeWidth}
                  size={iconProps.size}
                />
              )}
              {bp.id === "laptop" && (
                <Laptop
                  color={iconProps.color}
                  strokeWidth={iconProps.strokeWidth}
                  size={iconProps.size}
                />
              )}
              {bp.id === "tablet" && (
                <Tablet
                  color={iconProps.color}
                  strokeWidth={iconProps.strokeWidth}
                  size={iconProps.size}
                />
              )}
              {bp.id === "mobile" && (
                <Smartphone
                  color={iconProps.color}
                  strokeWidth={iconProps.strokeWidth}
                  size={iconProps.size}
                />
              )}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {/* Zoom Controls */}
        <ZoomControls />
      </div>

      <div className="header_contents header_right">
        <span className="history-info">
          {historyInfo ? `${historyInfo.current}/${historyInfo.total}` : "0/0"}
        </span>
        <ShortcutTooltip shortcutId="undo" placement="bottom">
          <button
            aria-label="Undo"
            onClick={onUndo}
            disabled={!canUndo}
            className={!canUndo ? "disabled" : ""}
          >
            <Undo
              color={!canUndo ? "#999" : iconProps.color}
              strokeWidth={iconProps.strokeWidth}
              size={iconProps.size}
            />
          </button>
        </ShortcutTooltip>
        <ShortcutTooltip shortcutId="redo" placement="bottom">
          <button
            aria-label="Redo"
            onClick={onRedo}
            disabled={!canRedo}
            className={!canRedo ? "disabled" : ""}
          >
            <Redo
              color={!canRedo ? "#999" : iconProps.color}
              strokeWidth={iconProps.strokeWidth}
              size={iconProps.size}
            />
          </button>
        </ShortcutTooltip>
        <ToggleButtonGroup
          selectionMode="multiple"
          selectedKeys={
            new Set([
              ...(isMonitorOpen ? ["monitor"] : []),
              ...(showWorkflowOverlay ? ["workflow"] : []),
            ])
          }
          indicator={true}
          onSelectionChange={(keys) => {
            const selectedKeys = new Set(keys);
            const wasMonitorOpen = isMonitorOpen;
            const isMonitorNowSelected = selectedKeys.has("monitor");
            const wasWorkflow = showWorkflowOverlay;
            const isWorkflowNowSelected = selectedKeys.has("workflow");

            // Monitor 토글
            if (wasMonitorOpen !== isMonitorNowSelected) {
              toggleBottomPanel("monitor");
            }
            // Workflow 오버레이 토글
            if (wasWorkflow !== isWorkflowNowSelected) {
              onWorkflowOverlayToggle();
            }
          }}
          aria-label="View options"
        >
          <ToggleButton id="monitor" aria-label="Toggle Monitor Panel">
            <Activity
              color={isMonitorOpen ? "var(--color-white)" : iconProps.color}
              strokeWidth={iconProps.strokeWidth}
              size={iconProps.size}
            />
          </ToggleButton>
          <ToggleButton
            id="workflow"
            aria-label={
              showWorkflowOverlay ? "Hide Workflow Overlay" : "Show Workflow Overlay"
            }
          >
            <GitBranch
              color={showWorkflowOverlay ? "var(--color-white)" : iconProps.color}
              strokeWidth={iconProps.strokeWidth}
              size={iconProps.size}
            />
          </ToggleButton>
          <ToggleButton id="preview" aria-label="Preview" onPress={onPreview}>
            <Eye
              color={iconProps.color}
              strokeWidth={iconProps.strokeWidth}
              size={iconProps.size}
            />
          </ToggleButton>
          <ToggleButton
            id="settings"
            aria-label="Settings"
            onPress={() => openPanelAsModal("settings")}
          >
            <Settings
              color={iconProps.color}
              strokeWidth={iconProps.strokeWidth}
              size={iconProps.size}
            />
          </ToggleButton>
        </ToggleButtonGroup>
        <button aria-label="Play" onClick={onPlay}>
          <Play
            color={iconProps.color}
            strokeWidth={iconProps.strokeWidth}
            size={iconProps.size}
          />
        </button>
        <button aria-label="Publish" className="publish" onClick={onPublish}>
          Publish
        </button>
      </div>
    </nav>
  );
};
