import React from "react";
import {
  Menu,
  Eye,
  Undo,
  Redo,
  Play,
  Monitor,
  Tablet,
  Smartphone,
  Asterisk,
} from "lucide-react";
import {
  RadioGroup,
  Radio,
  Key,
  Label,
  Switch,
  Button,
} from "react-aria-components";
import { iconProps } from "../../utils/uiConstants";
import { useStore } from "../stores";
import { saveService } from "../../services/save";

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
}) => {
  // SaveMode 상태와 액션을 별도 selector로 가져오기 (최신 상태 보장)
  const isRealtimeMode = useStore((state) => state.isRealtimeMode);
  const pendingChanges = useStore((state) => state.pendingChanges);
  const setRealtimeMode = useStore((state) => state.setRealtimeMode);
  const pendingCount = pendingChanges.size;

  const [isSaving, setIsSaving] = React.useState(false);

  const handleSave = (): void => {
    setIsSaving(true);
    saveService
      .saveAllPendingChanges()
      .then(() => {
        console.log("✅ 저장 완료");
      })
      .catch((error) => {
        console.error("❌ 저장 실패:", error);
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const handleRealtimeModeChange = (enabled: boolean): void => {
    setRealtimeMode(enabled);

    if (enabled && pendingChanges.size > 0) {
      // 수동 → 실시간 전환 시 보류 중인 변경사항 자동 저장
      handleSave();
    }
  };

  return (
    <nav className="header">
      <div className="header_contents header_left">
        <button aria-label="Menu">
          <Menu
            color={"#fff"}
            strokeWidth={iconProps.stroke}
            size={iconProps.size}
          />
        </button>
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

        <RadioGroup
          orientation="horizontal"
          value={Array.from(breakpoint)[0]?.toString()}
          onChange={(value) => onBreakpointChange(value)}
        >
          {breakpoints.map((bp) => (
            <Radio value={bp.id} key={bp.id} className="aria-Radio">
              {bp.id === "screen" && (
                <Asterisk
                  color={iconProps.color}
                  strokeWidth={iconProps.stroke}
                  size={iconProps.size}
                />
              )}
              {bp.id === "desktop" && (
                <Monitor
                  color={iconProps.color}
                  strokeWidth={iconProps.stroke}
                  size={iconProps.size}
                />
              )}
              {bp.id === "tablet" && (
                <Tablet
                  color={iconProps.color}
                  strokeWidth={iconProps.stroke}
                  size={iconProps.size}
                />
              )}
              {bp.id === "mobile" && (
                <Smartphone
                  color={iconProps.color}
                  strokeWidth={iconProps.stroke}
                  size={iconProps.size}
                />
              )}
              <Label>{bp.label}</Label>
            </Radio>
          ))}
        </RadioGroup>
        <Switch
          id="realtime-mode"
          isSelected={isRealtimeMode}
          onChange={handleRealtimeModeChange}
        >
          <div className="indicator" />
          {isRealtimeMode ? "Auto" : "Manual"}
        </Switch>
        <Button
          id="save-button"
          onPress={handleSave}
          isDisabled={isRealtimeMode || pendingCount === 0 || isSaving}
        >
          {isSaving
            ? "Saving..."
            : `Save${pendingCount > 0 ? ` (${pendingCount})` : ""}`}
        </Button>
      </div>

      <div className="header_contents header_right">
        <span>
          {historyInfo ? `${historyInfo.current}/${historyInfo.total}` : "0/0"}
        </span>
        <button
          aria-label="Undo"
          onClick={onUndo}
          disabled={!canUndo}
          className={!canUndo ? "disabled" : ""}
        >
          <Undo
            color={!canUndo ? "#999" : iconProps.color}
            strokeWidth={iconProps.stroke}
            size={iconProps.size}
          />
        </button>
        <button
          aria-label="Redo"
          onClick={onRedo}
          disabled={!canRedo}
          className={!canRedo ? "disabled" : ""}
        >
          <Redo
            color={!canRedo ? "#999" : iconProps.color}
            strokeWidth={iconProps.stroke}
            size={iconProps.size}
          />
        </button>
        <button aria-label="Preview" onClick={onPreview}>
          <Eye
            color={iconProps.color}
            strokeWidth={iconProps.stroke}
            size={iconProps.size}
          />
        </button>
        <button aria-label="Play" onClick={onPlay}>
          <Play
            color={iconProps.color}
            strokeWidth={iconProps.stroke}
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
