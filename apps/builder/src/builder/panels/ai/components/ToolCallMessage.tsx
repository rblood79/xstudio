/**
 * ToolCallMessage - 도구 호출 상태 표시
 */

import type { ToolCallInfo } from '../../../../types/integrations/chat.types';
import { Wrench, Check, X, Loader2 } from 'lucide-react';

interface ToolCallMessageProps {
  toolCall: ToolCallInfo;
}

const TOOL_LABELS: Record<string, string> = {
  create_element: '요소 생성',
  update_element: '요소 수정',
  delete_element: '요소 삭제',
  get_editor_state: '에디터 상태 조회',
  get_selection: '선택 요소 조회',
  search_elements: '요소 검색',
  batch_design: '일괄 변경',
};

export function ToolCallMessage({ toolCall }: ToolCallMessageProps) {
  const label = TOOL_LABELS[toolCall.name] || toolCall.name;

  const StatusIcon = () => {
    switch (toolCall.status) {
      case 'pending':
      case 'running':
        return <Loader2 size={14} className="tool-call-spinner" />;
      case 'success':
        return <Check size={14} />;
      case 'error':
        return <X size={14} />;
    }
  };

  return (
    <div className="tool-call-message" data-status={toolCall.status}>
      <div className="tool-call-header">
        <Wrench size={14} />
        <span className="tool-call-label">{label}</span>
        <StatusIcon />
      </div>
      {toolCall.error && (
        <div className="tool-call-error">{toolCall.error}</div>
      )}
    </div>
  );
}
