import "../../components/styles";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, History, Redo, Trash2, Undo } from "lucide-react";
import type { PanelProps } from "../core/types";
import { PanelHeader, EmptyState, ShortcutTooltip } from "../../components";
import { Button } from "../../../shared/components";
import { iconProps, iconSmall } from "../../../utils/ui/uiConstants";
import { historyManager, type HistoryEntry } from "../../stores/history";
import { useStore } from "../../stores";
import "./HistoryPanel.css";

type HistoryListItem = {
  id: string;
  index: number;
  label: string;
  timestamp?: number;
  isStart?: boolean;
};

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getElementLabel(entry: HistoryEntry): string | null {
  const element = entry.data.element || entry.data.prevElement;
  if (element?.customId) return element.customId;
  if (element?.tag) return element.tag;
  if (entry.elementId && entry.elementId !== "batch_diff") return entry.elementId;
  return null;
}

function getEntryLabel(entry: HistoryEntry): string {
  const elementLabel = getElementLabel(entry);
  const baseLabel = elementLabel ? ` ${elementLabel}` : "";

  switch (entry.type) {
    case "add":
      return `추가${baseLabel}`;
    case "remove":
      return `삭제${baseLabel}`;
    case "update":
      return `수정${baseLabel}`;
    case "move":
      return `이동${baseLabel}`;
    case "batch": {
      const count = entry.elementIds?.length ?? entry.data.diffs?.length ?? 0;
      return `일괄 수정 (${count})`;
    }
    case "group": {
      const count = entry.data.groupData?.childIds?.length ?? entry.elementIds?.length ?? 0;
      return `그룹 (${count})`;
    }
    case "ungroup": {
      const count = entry.data.groupData?.childIds?.length ?? entry.elementIds?.length ?? 0;
      return `그룹 해제 (${count})`;
    }
    default:
      return "변경";
  }
}

/**
 * HistoryPanel - 히스토리 패널
 *
 * Photoshop History 패널처럼 변경 내역을 리스트로 보여줍니다.
 */
export function HistoryPanel({ isActive }: PanelProps) {
  if (!isActive) {
    return null;
  }

  return <HistoryPanelContent />;
}

function HistoryPanelContent() {
  const undo = useStore((state) => state.undo);
  const redo = useStore((state) => state.redo);
  const historyOperationInProgress = useStore(
    (state) => state.historyOperationInProgress
  );

  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [historyInfo, setHistoryInfo] = useState(
    historyManager.getCurrentPageHistory()
  );

  useEffect(() => {
    const updateHistory = () => {
      const info = historyManager.getCurrentPageHistory();
      setEntries(historyManager.getCurrentPageEntries());
      setHistoryInfo(info);
    };

    updateHistory();
    const unsubscribe = historyManager.subscribe(updateHistory);
    return unsubscribe;
  }, []);

  const handleUndo = useCallback(async () => {
    if (!historyInfo.canUndo) return;
    await undo();
  }, [historyInfo.canUndo, undo]);

  const handleRedo = useCallback(async () => {
    if (!historyInfo.canRedo) return;
    await redo();
  }, [historyInfo.canRedo, redo]);

  const handleClear = useCallback(() => {
    const currentPageId = useStore.getState().currentPageId;
    if (!currentPageId) return;
    if (confirm("현재 페이지 히스토리를 모두 삭제할까요?")) {
      historyManager.clearPageHistory(currentPageId);
    }
  }, []);

  const handleJumpToIndex = useCallback(
    async (targetIndex: number) => {
      if (historyOperationInProgress) return;

      const info = historyManager.getCurrentPageHistory();
      const currentIndex = info.currentIndex;

      if (targetIndex === currentIndex) return;

      const steps = Math.abs(targetIndex - currentIndex);

      if (targetIndex < currentIndex) {
        for (let i = 0; i < steps; i += 1) {
          await undo();
        }
      } else {
        for (let i = 0; i < steps; i += 1) {
          await redo();
        }
      }
    },
    [historyOperationInProgress, redo, undo]
  );

  const displayEntries = useMemo<HistoryListItem[]>(() => {
    const mapped: HistoryListItem[] = entries.map((entry, index) => ({
      id: entry.id,
      index,
      label: getEntryLabel(entry),
      timestamp: entry.timestamp,
    }));

    const ordered = mapped.reverse();

    if (entries.length > 0) {
      ordered.push({
        id: "history-start",
        index: -1,
        label: "시작 상태",
        timestamp: undefined,
        isStart: true,
      });
    }

    return ordered;
  }, [entries]);

  if (displayEntries.length === 0) {
    return (
      <div className="history-panel">
        <PanelHeader
          icon={<History size={iconProps.size} />}
          title="히스토리"
        />
        <EmptyState
          icon={<History size={48} />}
          message="히스토리가 없습니다"
          description="요소를 추가하거나 수정하면 기록이 표시됩니다"
        />
      </div>
    );
  }

  return (
    <div className="history-panel">
      <PanelHeader
        icon={<History size={iconProps.size} />}
        title="히스토리"
        actions={
          <div className="history-actions">
            <span className="history-count">
              {Math.max(historyInfo.currentIndex + 1, 0)}/{historyInfo.totalEntries}
            </span>
            <ShortcutTooltip shortcutId="undo" placement="bottom">
              <button
                className="iconButton"
                type="button"
                onClick={handleUndo}
                disabled={!historyInfo.canUndo || historyOperationInProgress}
                aria-label="Undo"
              >
                <Undo size={iconProps.size} />
              </button>
            </ShortcutTooltip>
            <ShortcutTooltip shortcutId="redo" placement="bottom">
              <button
                className="iconButton"
                type="button"
                onClick={handleRedo}
                disabled={!historyInfo.canRedo || historyOperationInProgress}
                aria-label="Redo"
              >
                <Redo size={iconProps.size} />
              </button>
            </ShortcutTooltip>
            <button
              className="iconButton"
              type="button"
              onClick={handleClear}
              disabled={historyOperationInProgress}
              aria-label="Clear history"
            >
              <Trash2 size={iconProps.size} />
            </button>
          </div>
        }
      />

      <div className="panel-contents history-contents">
        <div className="history-list">
          {displayEntries.map((item) => {
            const isActive = item.index === historyInfo.currentIndex;
            const isStart = item.isStart;
            const timestamp = !isStart ? item.timestamp : undefined;

            return (
              <div
                key={item.id}
                className="history-item"
                data-active={isActive}
                data-start={isStart}
              >
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => handleJumpToIndex(item.index)}
                  isDisabled={historyOperationInProgress}
                  className="history-item-btn"
                >
                  <span className="history-item-main">
                    <span className="history-label">{item.label}</span>
                    {!isStart && timestamp !== undefined && (
                      <span className="history-meta">
                        <Clock size={iconSmall.size} />
                        {formatTimestamp(timestamp)}
                      </span>
                    )}
                  </span>
                  {!isStart && (
                    <span className="history-index">{item.index + 1}</span>
                  )}
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
