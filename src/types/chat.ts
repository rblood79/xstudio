/**
 * Chat and Conversation Type Definitions
 *
 * Defines types for the chat-based design interface
 */

export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageStatus = 'pending' | 'streaming' | 'complete' | 'error';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  timestamp: number;
  metadata?: {
    componentIntent?: ComponentIntent;
    error?: string;
  };
}

export type IntentAction = 'create' | 'modify' | 'delete' | 'style' | 'query';

export interface ComponentIntent {
  action: IntentAction;
  componentType?: string;
  targetElementId?: string;
  props?: Record<string, any>;
  styles?: Record<string, any>;
  dataBinding?: {
    baseUrl: string;
    endpoint: string;
    params?: Record<string, unknown>;
  };
  description?: string;
}

export interface BuilderContext {
  currentPageId: string;
  selectedElementId?: string;
  elements: Array<{
    id: string;
    tag: string;
    props: Record<string, any>;
    parent_id: string | null;
  }>;
  recentChanges: string[];
}

export interface ConversationState {
  messages: ChatMessage[];
  isStreaming: boolean;
  currentContext: BuilderContext | null;

  // Actions
  addUserMessage: (content: string) => void;
  addAssistantMessage: (content: string, intent?: ComponentIntent) => void;
  updateLastMessage: (content: string) => void;
  setStreamingStatus: (isStreaming: boolean) => void;
  updateContext: (context: BuilderContext) => void;
  clearConversation: () => void;
}
