/**
 * ToolResultMessage - 도구 실행 결과 표시
 */

import type { ChatMessage } from '../../../../types/integrations/chat.types';

interface ToolResultMessageProps {
  message: ChatMessage;
}

const TOOL_RESULT_LABELS: Record<string, string> = {
  create_element: '생성됨',
  update_element: '수정됨',
  delete_element: '삭제됨',
  get_editor_state: '상태 조회 완료',
  get_selection: '선택 조회 완료',
  search_elements: '검색 완료',
  batch_design: '일괄 변경 완료',
};

export function ToolResultMessage({ message }: ToolResultMessageProps) {
  const toolName = message.metadata?.toolName || '';
  const result = message.metadata?.toolResult as Record<string, unknown> | undefined;
  const label = TOOL_RESULT_LABELS[toolName] || '도구 실행 완료';

  if (!result) return null;

  const success = result.success as boolean;
  const data = result.data as Record<string, unknown> | undefined;

  return (
    <div className="tool-result-message" data-success={success}>
      <span className="tool-result-label">{label}</span>
      {success && data?.tag ? (
        <span className="tool-result-detail">
          {String(data.tag)}
          {data.elementId ? ` (${String(data.elementId).slice(0, 8)}...)` : ''}
        </span>
      ) : null}
      {!success && result.error ? (
        <span className="tool-result-error">{String(result.error)}</span>
      ) : null}
    </div>
  );
}
