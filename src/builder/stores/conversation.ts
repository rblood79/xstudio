/**
 * Conversation Store
 *
 * Manages chat messages and conversation state for the AI design assistant
 */

import { create } from 'zustand';
import type { ConversationState, ChatMessage, ComponentIntent, BuilderContext } from '../../types/chat';

export const useConversationStore = create<ConversationState>((set) => ({
  messages: [],
  isStreaming: false,
  currentContext: null,

  /**
   * Add a user message to the conversation
   */
  addUserMessage: (content: string) => {
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      status: 'complete',
      timestamp: Date.now(),
    };

    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  /**
   * Add an assistant message to the conversation
   */
  addAssistantMessage: (content: string, intent?: ComponentIntent) => {
    const message: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content,
      status: 'complete',
      timestamp: Date.now(),
      metadata: intent ? { componentIntent: intent } : undefined,
    };

    set((state) => ({
      messages: [...state.messages, message],
      isStreaming: false,
    }));
  },

  /**
   * Update the last message content (for streaming)
   */
  updateLastMessage: (content: string) => {
    set((state) => {
      const messages = [...state.messages];
      const lastMessage = messages[messages.length - 1];

      if (lastMessage && lastMessage.role === 'assistant') {
        lastMessage.content = content;
        lastMessage.status = 'streaming';
      }

      return { messages };
    });
  },

  /**
   * Set streaming status
   */
  setStreamingStatus: (isStreaming: boolean) => {
    set({ isStreaming });

    // If streaming stopped, update last message status to complete
    if (!isStreaming) {
      set((state) => {
        const messages = [...state.messages];
        const lastMessage = messages[messages.length - 1];

        if (lastMessage && lastMessage.role === 'assistant') {
          lastMessage.status = 'complete';
        }

        return { messages };
      });
    }
  },

  /**
   * Update current builder context
   */
  updateContext: (context: BuilderContext) => {
    set({ currentContext: context });
  },

  /**
   * Clear all messages
   */
  clearConversation: () => {
    set({
      messages: [],
      isStreaming: false,
    });
  },
}));
