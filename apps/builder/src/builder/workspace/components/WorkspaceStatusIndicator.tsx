interface WorkspaceStatusIndicatorProps {
  isCanvasReady: boolean;
  isContextLost: boolean;
}

export function WorkspaceStatusIndicator({
  isCanvasReady,
  isContextLost,
}: WorkspaceStatusIndicatorProps) {
  if (!isContextLost && isCanvasReady) {
    return null;
  }

  return (
    <div className="workspace-status-indicator">
      {isContextLost ? "⚠️ GPU 리소스 복구 중..." : "🔄 캔버스 초기화 중..."}
    </div>
  );
}
