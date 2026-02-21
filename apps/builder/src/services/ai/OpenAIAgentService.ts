/**
 * OpenAI Agent Service
 *
 * GPT-4o / GPT-4o-mini Tool Calling + Agent Loop
 * OpenAI Chat Completions API를 직접 호출 (REST)
 */

import type { AgentEvent, AIAgentProvider, ToolCall, ToolExecutor } from '../../types/integrations/ai.types';
import type { ChatMessage, BuilderContext } from '../../types/integrations/chat.types';
import { createToolRegistry } from './tools';
import { universalToolDefinitions } from './tools/universalDefinitions';
import { buildSystemPrompt } from './systemPrompt';

const MAX_TURNS = 10;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

interface OpenAIToolDef {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export class OpenAIAgentService implements AIAgentProvider {
  private apiKey: string;
  private modelId: string;
  private toolExecutors: Map<string, ToolExecutor>;
  private abortController: AbortController | null = null;

  constructor(apiKey: string, modelId: string) {
    this.apiKey = apiKey;
    this.modelId = modelId;
    this.toolExecutors = createToolRegistry();
  }

  async *runAgentLoop(
    messages: ChatMessage[],
    context: BuilderContext,
  ): AsyncGenerator<AgentEvent> {
    this.abortController = new AbortController();

    const conversationMessages: OpenAIMessage[] = [
      { role: 'system', content: buildSystemPrompt(context) },
      ...this.convertMessages(messages),
    ];

    const tools = this.convertToolDefs();
    let turn = 0;

    while (turn < MAX_TURNS) {
      if (this.abortController.signal.aborted) {
        yield { type: 'aborted' };
        return;
      }

      turn++;

      try {
        const response = await this.callAPIWithRetry(conversationMessages, tools);
        const data = await response.json();

        if (data.error) {
          yield { type: 'tool-error', toolName: 'openai_api', toolCallId: '', error: data.error.message ?? 'OpenAI API error' };
          return;
        }

        const choice = data.choices?.[0];
        if (!choice) {
          yield { type: 'tool-error', toolName: 'openai_api', toolCallId: '', error: 'No response from OpenAI' };
          return;
        }

        const assistantMessage = choice.message;
        const assistantContent = assistantMessage.content ?? '';
        const toolCallsRaw = assistantMessage.tool_calls ?? [];

        // 텍스트 응답
        if (assistantContent) {
          yield { type: 'text-delta', content: assistantContent };
        }

        // tool calls 없으면 최종 응답
        if (toolCallsRaw.length === 0) {
          yield { type: 'final', content: assistantContent };
          return;
        }

        // assistant 메시지를 대화에 추가
        conversationMessages.push({
          role: 'assistant',
          content: assistantContent || null,
          tool_calls: toolCallsRaw.map((tc: { id: string; type: string; function: { name: string; arguments: string } }) => ({
            id: tc.id,
            type: 'function' as const,
            function: { name: tc.function.name, arguments: tc.function.arguments },
          })),
        });

        // 각 tool 실행
        for (const tc of toolCallsRaw) {
          if (this.abortController.signal.aborted) {
            yield { type: 'aborted' };
            return;
          }

          const toolName = tc.function.name;
          const toolCallId = tc.id;

          yield { type: 'tool-use-start', toolName, toolCallId };

          const executor = this.toolExecutors.get(toolName);
          if (!executor) {
            const errorMsg = `알 수 없는 도구: ${toolName}`;
            yield { type: 'tool-error', toolName, toolCallId, error: errorMsg };
            conversationMessages.push({
              role: 'tool',
              tool_call_id: toolCallId,
              content: JSON.stringify({ error: errorMsg }),
            });
            continue;
          }

          try {
            const args = JSON.parse(tc.function.arguments);
            const result = await executor.execute(args);
            yield { type: 'tool-result', toolName, toolCallId, result };
            conversationMessages.push({
              role: 'tool',
              tool_call_id: toolCallId,
              content: JSON.stringify(result),
            });
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            yield { type: 'tool-error', toolName, toolCallId, error: errorMsg };
            conversationMessages.push({
              role: 'tool',
              tool_call_id: toolCallId,
              content: JSON.stringify({ error: errorMsg }),
            });
          }
        }

      } catch (error) {
        if (this.abortController.signal.aborted) {
          yield { type: 'aborted' };
          return;
        }
        const errorMsg = error instanceof Error ? error.message : 'OpenAI API 오류';
        yield { type: 'tool-error', toolName: 'openai_api', toolCallId: '', error: errorMsg };
        return;
      }
    }

    yield { type: 'max-turns-reached' };
  }

  stop(): void {
    this.abortController?.abort();
  }

  private async callAPIWithRetry(
    messages: OpenAIMessage[],
    tools: OpenAIToolDef[],
  ): Promise<Response> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(OPENAI_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.modelId,
            messages,
            tools,
            tool_choice: 'auto',
            temperature: 0.7,
            max_tokens: 4096,
          }),
          signal: this.abortController?.signal,
        });

        if (response.status === 429) {
          if (attempt >= MAX_RETRIES) throw new Error('Rate limit exceeded');
          const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
          console.warn(`[OpenAIAgent] 429 Rate limit, ${delay}ms 후 재시도 (${attempt + 1}/${MAX_RETRIES})`);
          await this.sleep(delay);
          continue;
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message ?? `HTTP ${response.status}`);
        }

        return response;
      } catch (error) {
        lastError = error;
        if (this.abortController?.signal.aborted) throw error;
        if (attempt >= MAX_RETRIES) throw error;

        const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  private convertMessages(messages: ChatMessage[]): OpenAIMessage[] {
    return messages
      .filter((msg) => msg.role !== 'system')
      .map((msg): OpenAIMessage => {
        if (msg.role === 'tool' && msg.metadata?.toolCallId) {
          return {
            role: 'tool',
            tool_call_id: msg.metadata.toolCallId,
            content: msg.content,
          };
        }

        if (msg.role === 'assistant' && msg.metadata?.toolCalls?.length) {
          return {
            role: 'assistant',
            content: msg.content || null,
            tool_calls: msg.metadata.toolCalls.map((tc) => ({
              id: tc.id,
              type: 'function' as const,
              function: {
                name: tc.name,
                arguments: JSON.stringify(tc.arguments),
              },
            })),
          };
        }

        return {
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        };
      });
  }

  private convertToolDefs(): OpenAIToolDef[] {
    return universalToolDefinitions.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as Record<string, unknown>,
      },
    }));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
