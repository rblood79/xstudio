/**
 * ChatInterface
 *
 * Main integration layer that connects:
 * - Chat UI components
 * - AI Service (Groq)
 * - Conversation store
 * - Builder element store
 */

import { useEffect, useCallback } from "react";
import { ChatContainer } from "../components/ChatContainer";
import { useConversationStore } from "../stores/conversation";
import { useStore } from "../stores";
import { createGroqService } from "../../services/ai/GroqService";
import { intentParser } from "../../services/ai/IntentParser";
import type { ComponentIntent, BuilderContext } from "../../types/chat";
import type { Element } from "../../types/store";

let groqService: ReturnType<typeof createGroqService> | null = null;

// Initialize Groq service (lazy initialization)
function getGroqService() {
  if (!groqService) {
    try {
      groqService = createGroqService();
    } catch (error) {
      console.error("Failed to initialize Groq service:", error);
      return null;
    }
  }
  return groqService;
}

export function ChatInterface() {
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
        props: el.props,
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
      console.log("Executing intent:", intent);

      try {
        switch (intent.action) {
          case "create": {
            if (!intent.componentType) {
              console.warn("Missing componentType for create action");
              return;
            }

            const newElement: Element = {
              id: crypto.randomUUID(),
              tag: intent.componentType,
              props: intent.props || {},
              parent_id: null,
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
              (newElement as any).dataBinding = {
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
            console.log("Created element:", newElement);
            break;
          }

          case "modify":
          case "style": {
            if (!intent.targetElementId) {
              console.warn("Missing targetElementId for modify/style action");
              return;
            }

            const targetId =
              intent.targetElementId === "current"
                ? selectedElementId
                : intent.targetElementId;

            if (!targetId) {
              console.warn("No element selected for modify/style action");
              return;
            }

            const updates: Record<string, any> = {};

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
            console.log("Updated element:", targetId, updates);
            break;
          }

          case "delete": {
            if (!intent.targetElementId) {
              console.warn("Missing targetElementId for delete action");
              return;
            }

            const targetId =
              intent.targetElementId === "current"
                ? selectedElementId
                : intent.targetElementId;

            if (!targetId) {
              console.warn("No element selected for delete action");
              return;
            }

            await removeElement(targetId);
            console.log("Deleted element:", targetId);
            break;
          }

          case "query":
            // Query actions don't modify elements, just provide information
            console.log("Query action:", intent.description);
            break;

          default:
            console.warn("Unknown action:", intent.action);
        }
      } catch (error) {
        console.error("Failed to execute intent:", error);
        throw error;
      }
    },
    [
      currentContext,
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
        console.warn("No context available");
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
              console.log("Parsed intent:", intent);

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
            console.error("Streaming failed:", streamError);
            setStreamingStatus(false);

            // Fallback to rule-based parser
            throw streamError;
          }
        } else {
          throw new Error("Groq service not available");
        }
      } catch (error) {
        console.warn("AI service failed, using rule-based parser:", error);

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
    <ChatContainer
      messages={messages}
      onSendMessage={handleSendMessage}
      onClearConversation={clearConversation}
      isStreaming={isStreaming}
    />
  );
}
