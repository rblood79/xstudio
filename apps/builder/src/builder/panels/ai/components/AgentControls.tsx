/**
 * AgentControls - 에이전트 실행 중 제어 UI
 */

import { Square } from 'lucide-react';

interface AgentControlsProps {
  currentTurn: number;
  onStop: () => void;
}

export function AgentControls({ currentTurn, onStop }: AgentControlsProps) {
  return (
    <div className="agent-controls">
      <span className="agent-status">
        도구 실행 중 ({currentTurn}/10)
      </span>
      <button
        className="agent-stop-btn"
        onClick={onStop}
        type="button"
        aria-label="에이전트 중단"
        title="중단"
      >
        <Square size={12} />
        <span>중단</span>
      </button>
    </div>
  );
}
