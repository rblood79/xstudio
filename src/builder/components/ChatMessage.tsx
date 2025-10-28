/**
 * ChatMessage Component
 *
 * Displays a single chat message with avatar and timestamp
 */

import type { ChatMessage as ChatMessageType } from '../../types/chat';
import './styles/ChatMessage.css';

export interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { role, content, status, timestamp } = message;

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAvatarLabel = () => {
    if (role === 'user') return 'U';
    if (role === 'assistant') return 'AI';
    return '?';
  };

  return (
    <div className="chat-message" data-role={role} data-status={status}>
      <div className="avatar">{getAvatarLabel()}</div>

      <div className="content">
        <div className="bubble">{content}</div>
        <div className="timestamp">{formatTimestamp(timestamp)}</div>
      </div>
    </div>
  );
}
