/**
 * AIPanel - AI 어시스턴트 패널
 *
 * PanelProps 인터페이스를 구현하여 패널 시스템과 통합
 * Groq 서비스를 사용한 AI 기반 빌더 인터랙션 제공
 *
 * 통합된 컴포넌트:
 * - ChatContainer: 메인 채팅 컨테이너
 * - ChatMessage: 개별 메시지 표시
 * - ChatInput: 메시지 입력 필드
 */

import { useEffect, useCallback, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { PanelProps } from "../core/types";
import { PanelHeader } from "../common";
import { Button } from "../../components";
import { MessageCircle, Trash2 } from "lucide-react";
import { iconProps } from "../../../utils/ui/uiConstants";
import { useConversationStore } from "../../stores/conversation";
import { useStore } from "../../stores";
import { createGroqService } from "../../../services/ai/GroqService";
import { intentParser } from "../../../services/ai/IntentParser";
import type {
  ComponentIntent,
  BuilderContext,
  ChatMessage as ChatMessageType,
} from "../../../types/integrations/chat.types";
import type { Element } from "../../../types/core/store.types";
import "../../components/styles/ChatContainer.css";
import "../../components/styles/ChatMessage.css";
import "../../components/styles/ChatInput.css";

let groqService: ReturnType<typeof createGroqService> | null = null;

// Initialize Groq service (lazy initialization)
function getGroqService() {
  if (!groqService) {
    try {
      groqService = createGroqService();
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error("[AIPanel] Failed to initialize Groq service:", error);
      }
      return null;
    }
  }
  return groqService;
}

/**
 * ChatMessage - 개별 메시지 표시
 */
interface ChatMessageProps {
  message: ChatMessageType;
}

function ChatMessage({ message }: ChatMessageProps) {
  const { role, content, status, timestamp } = message;

  const formatTimestamp = (ts: number) => {
    const date = new Date(ts);
    return date.toLocaleTimeString("ko-KR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getAvatarLabel = () => {
    if (role === "user") return "U";
    if (role === "assistant") return "AI";
    return "?";
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

/**
 * ChatInput - 메시지 입력 필드
 */
interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

function ChatInput({
  onSend,
  disabled = false,
  placeholder = "메시지를 입력하세요... (Shift+Enter로 줄바꿈)",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = value.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setValue("");

      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (without Shift)
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);

    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  };

  return (
    <div className="chat-input">
      <textarea
        ref={textareaRef}
        className="textarea"
        value={value}
        onChange={handleInput}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
      />

      <Button
        onPress={handleSend}
        isDisabled={disabled || !value.trim()}
        type="button"
        variant="primary"
        size="sm"
      >
        전송
      </Button>
    </div>
  );
}

/**
 * ChatContainer - 메인 채팅 컨테이너
 */
interface ChatContainerProps {
  messages: ChatMessageType[];
  onSendMessage: (message: string) => void;
  isStreaming?: boolean;
  suggestions?: string[];
}

function ChatContainer({
  messages,
  onSendMessage,
  isStreaming = false,
  suggestions = [
    "빨간색 버튼을 만들어줘",
    "국가 목록을 보여주는 Select를 추가해줘",
    "테이블을 추가하고 사용자 목록을 보여줘",
    "이 버튼을 왼쪽 정렬로 바꿔줘",
  ],
}: ChatContainerProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSuggestionClick = (suggestion: string) => {
    onSendMessage(suggestion);
  };

  return (
    <div className="chatPanel">
      <div className="chat-content messages">
        {messages.length === 0 ? (
          <div className="chat-content-empty">
            <MessageCircle className="chat-content-empty-icon" />
            <div className="chat-content-empty-title">대화를 시작하세요</div>
            <div className="chat-content-empty-description">
              아래 예시를 클릭하거나 직접 메시지를 입력해보세요
            </div>

            <div className="chat-content-suggestions">
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className="chat-content-suggestion"
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

/**
 * AIPanelContent - AI 패널 메인 로직
 */
function AIPanelContent() {
  const {
    messages,
    isStreaming,
    currentContext,
    addUserMessage,
    addAssistantMessage,
    updateLastMessage,
    setStreamingStatus,
    updateContext,
    clearConversation,
  } = useConversationStore();

  const elements = useStore((state) => state.elements);
  const selectedElementId = useStore((state) => state.selectedElementId);
  const currentPageId = useStore((state) => state.currentPageId);
  const addElement = useStore((state) => state.addElement);
  const updateElementProps = useStore((state) => state.updateElementProps);
  const removeElement = useStore((state) => state.removeElement);

  /**
   * Update context whenever builder state changes
   */
  useEffect(() => {
    const context: BuilderContext = {
      currentPageId: currentPageId || "default",
      selectedElementId: selectedElementId || undefined,
      elements: elements.map((el) => ({
        id: el.id,
        tag: el.tag,
        props: el.props as Record<string, unknown>,
        parent_id: el.parent_id ?? null,
      })),
      recentChanges: [],
    };

    updateContext(context);
  }, [elements, selectedElementId, currentPageId, updateContext]);

  /**
   * Execute component intent (create/modify/delete elements)
   */
  const executeIntent = useCallback(
    async (intent: ComponentIntent) => {
      if (import.meta.env.DEV) {
        console.log("[AIPanel] Executing intent:", intent);
      }

      try {
        switch (intent.action) {
          case "create": {
            if (!intent.componentType) {
              if (import.meta.env.DEV) {
                console.warn(
                  "[AIPanel] Missing componentType for create action"
                );
              }
              return;
            }

            // Determine parent_id: use selected element or Body
            let parentId = null;
            if (selectedElementId) {
              // Use selected element as parent
              parentId = selectedElementId;
            } else {
              // Find Body element and use it as parent
              const bodyElement = elements.find((el) => el.tag === "Body");
              if (bodyElement) {
                parentId = bodyElement.id;
              }
            }

            const newElement: Element = {
              id: crypto.randomUUID(),
              tag: intent.componentType,
              props: intent.props || {},
              parent_id: parentId,
              page_id: currentPageId || "default",
              order_num: elements.length,
              dataBinding: undefined,
            } as Element;

            // Add styles as inline styles
            if (intent.styles && Object.keys(intent.styles).length > 0) {
              newElement.props = {
                ...newElement.props,
                style: intent.styles,
              };
            }

            // Add dataBinding if provided
            if (intent.dataBinding) {
              newElement.dataBinding = {
                type: "collection",
                source: "api",
                config: {
                  baseUrl: intent.dataBinding.baseUrl,
                  endpoint: intent.dataBinding.endpoint,
                  params: intent.dataBinding.params || {},
                  dataMapping: {
                    idField: "id",
                    labelField: "name",
                  },
                },
              };
            }

            await addElement(newElement);
            if (import.meta.env.DEV) {
              console.log("[AIPanel] Created element:", newElement);
            }
            break;
          }

          case "modify":
          case "style": {
            if (!intent.targetElementId) {
              if (import.meta.env.DEV) {
                console.warn(
                  "[AIPanel] Missing targetElementId for modify/style action"
                );
              }
              return;
            }

            const targetId =
              intent.targetElementId === "current"
                ? selectedElementId
                : intent.targetElementId;

            if (!targetId) {
              if (import.meta.env.DEV) {
                console.warn(
                  "[AIPanel] No element selected for modify/style action"
                );
              }
              return;
            }

            const updates: Record<string, unknown> = {};

            // Merge props
            if (intent.props) {
              Object.assign(updates, intent.props);
            }

            // Merge styles into style prop
            if (intent.styles) {
              updates.style = {
                ...(elements.find((el) => el.id === targetId)?.props.style ||
                  {}),
                ...intent.styles,
              };
            }

            await updateElementProps(targetId, updates);
            if (import.meta.env.DEV) {
              console.log("[AIPanel] Updated element:", targetId, updates);
            }
            break;
          }

          case "delete": {
            if (!intent.targetElementId) {
              if (import.meta.env.DEV) {
                console.warn(
                  "[AIPanel] Missing targetElementId for delete action"
                );
              }
              return;
            }

            const targetId =
              intent.targetElementId === "current"
                ? selectedElementId
                : intent.targetElementId;

            if (!targetId) {
              if (import.meta.env.DEV) {
                console.warn(
                  "[AIPanel] No element selected for delete action"
                );
              }
              return;
            }

            await removeElement(targetId);
            if (import.meta.env.DEV) {
              console.log("[AIPanel] Deleted element:", targetId);
            }
            break;
          }

          case "query":
            // Query actions don't modify elements, just provide information
            if (import.meta.env.DEV) {
              console.log("[AIPanel] Query action:", intent.description);
            }
            break;

          default:
            if (import.meta.env.DEV) {
              console.warn("[AIPanel] Unknown action:", intent.action);
            }
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.error("[AIPanel] Failed to execute intent:", error);
        }
        throw error;
      }
    },
    [
      currentPageId,
      elements,
      selectedElementId,
      addElement,
      updateElementProps,
      removeElement,
    ]
  );

  /**
   * Handle sending a message
   */
  const handleSendMessage = useCallback(
    async (message: string) => {
      if (!currentContext) {
        if (import.meta.env.DEV) {
          console.warn("[AIPanel] No context available");
        }
        return;
      }

      // Add user message
      addUserMessage(message);

      try {
        const service = getGroqService();

        if (service) {
          // Try AI service first (streaming)
          setStreamingStatus(true);

          // Add empty assistant message for streaming
          addAssistantMessage("");

          let fullResponse = "";

          try {
            for await (const chunk of service.chatStream(
              message,
              currentContext
            )) {
              fullResponse += chunk;
              updateLastMessage(fullResponse);
            }

            setStreamingStatus(false);

            // Parse intent from full response
            const intent = service.parseIntent(fullResponse);

            if (intent) {
              if (import.meta.env.DEV) {
                console.log("[AIPanel] Parsed intent:", intent);
              }

              // Execute the intent
              await executeIntent(intent);

              // Update message with intent metadata
              const messages = useConversationStore.getState().messages;
              const lastMessage = messages[messages.length - 1];
              if (lastMessage) {
                lastMessage.metadata = { componentIntent: intent };
              }
            }
          } catch (streamError) {
            if (import.meta.env.DEV) {
              console.error("[AIPanel] Streaming failed:", streamError);
            }
            setStreamingStatus(false);

            // Fallback to rule-based parser
            throw streamError;
          }
        } else {
          throw new Error("Groq service not available");
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn(
            "[AIPanel] AI service failed, using rule-based parser:",
            error
          );
        }

        // Fallback to rule-based parser
        const intent = intentParser.parse(message, currentContext);

        if (intent) {
          const responseMessage = intent.description || "요청을 처리했습니다.";

          addAssistantMessage(responseMessage, intent);

          // Execute the intent
          await executeIntent(intent);
        } else {
          addAssistantMessage(
            "죄송합니다. 요청을 이해하지 못했습니다. 다시 시도해주세요."
          );
        }
      }
    },
    [
      currentContext,
      addUserMessage,
      addAssistantMessage,
      updateLastMessage,
      setStreamingStatus,
      executeIntent,
    ]
  );

  return (
    <div className="inspector ai-panel">
      <PanelHeader
        title="AI Assistant"
        actions={
          messages.length > 0 && (
            <button
              className="iconButton"
              onClick={clearConversation}
              type="button"
              aria-label="Clear conversation"
              title="대화 초기화"
            >
              <Trash2
                color={iconProps.color}
                strokeWidth={iconProps.stroke}
                size={iconProps.size}
              />
            </button>
          )
        }
      />
      <ChatContainer
        messages={messages}
        onSendMessage={handleSendMessage}
        isStreaming={isStreaming}
      />
    </div>
  );
}

export function AIPanel({ isActive }: PanelProps) {
  // 활성 상태가 아니면 렌더링하지 않음 (성능 최적화)
  if (!isActive) {
    return null;
  }

  return <AIPanelContent />;
}
