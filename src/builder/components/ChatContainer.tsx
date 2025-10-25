/**
 * ChatContainer Component
 *
 * Main chat interface container with messages list and input
 */

import React, { useEffect, useRef } from 'react';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { MessageCircle } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '../../types/chat';
import './styles/ChatContainer.css';

export interface ChatContainerProps {
  messages: ChatMessageType[];
  onSendMessage: (message: string) => void;
  onClearConversation: () => void;
  isStreaming?: boolean;
  suggestions?: string[];
}

export function ChatContainer({
  messages,
  onSendMessage,
  onClearConversation,
  isStreaming = false,
  suggestions = [
    '빨간색 버튼을 만들어줘',
    '국가 목록을 보여주는 Select를 추가해줘',
    '테이블을 추가하고 사용자 목록을 보여줘',
    '이 버튼을 왼쪽 정렬로 바꿔줘',
  ],
}: ChatContainerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSuggestionClick = (suggestion: string) => {
    onSendMessage(suggestion);
  };

  return (
    <div className="chat-container">
      <div className="chat-container__header">
        <div>
          <h2 className="chat-container__title">AI 디자인 어시스턴트</h2>
          <p className="chat-container__subtitle">자연어로 웹 사이트를 디자인하세요</p>
        </div>

        {messages.length > 0 && (
          <button
            className="chat-container__clear-button"
            onClick={onClearConversation}
            type="button"
          >
            대화 초기화
          </button>
        )}
      </div>

      <div className="chat-container__messages">
        {messages.length === 0 ? (
          <div className="chat-container__empty">
            <MessageCircle className="chat-container__empty-icon" />
            <div className="chat-container__empty-title">대화를 시작하세요</div>
            <div className="chat-container__empty-description">
              아래 예시를 클릭하거나 직접 메시지를 입력해보세요
            </div>

            <div className="chat-container__suggestions">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className="chat-container__suggestion"
                  onClick={() => handleSuggestionClick(suggestion)}
                  type="button"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <ChatInput onSend={onSendMessage} disabled={isStreaming} />
    </div>
  );
}
