/**
 * Anthropic Agent Service
 *
 * Claude (Sonnet/Haiku) Tool Calling + Agent Loop
 * Anthropic Messages API를 직접 호출 (REST)
 */

import type { AgentEvent, AIAgentProvider, ToolCall, ToolExecutor } from '../../types/integrations/ai.types';
import type { ChatMessage, BuilderContext } from '../../types/integrations/chat.types';
import { createToolRegistry } from './tools';
import { universalToolDefinitions } from './tools/universalDefinitions';
import { buildSystemPrompt } from './systemPrompt';

const MAX_TURNS = 10;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

interface AnthropicToolDef {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
}

type AnthropicContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> }
  | { type: 'tool_result'; tool_use_id: string; content: string };

export class AnthropicAgentService implements AIAgentProvider {
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

    const systemPrompt = buildSystemPrompt(context);
    const conversationMessages = this.convertMessages(messages);
    const tools = this.convertToolDefs();

    let turn = 0;

    while (turn < MAX_TURNS) {
      if (this.abortController.signal.aborted) {
        yield { type: 'aborted' };
        return;
      }

      turn++;

      try {
        const response = await this.callAPIWithRetry(systemPrompt, conversationMessages, tools);
        const data = await response.json();

        if (data.error) {
          yield { type: 'tool-error', toolName: 'anthropic_api', toolCallId: '', error: data.error.message ?? 'Anthropic API error' };
          return;
        }

        // 응답 content blocks 처리
        const contentBlocks: AnthropicContentBlock[] = data.content ?? [];
        let assistantText = '';
        const toolUseBlocks: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];

        for (const block of contentBlocks) {
          if (block.type === 'text') {
            assistantText += block.text;
            yield { type: 'text-delta', content: block.text };
          } else if (block.type === 'tool_use') {
            toolUseBlocks.push({ id: block.id, name: block.name, input: block.input });
          }
        }

        // tool_use 없으면 최종 응답
        if (toolUseBlocks.length === 0 || data.stop_reason === 'end_turn') {
          if (toolUseBlocks.length === 0) {
            yield { type: 'final', content: assistantText };
            return;
          }
        }

        // assistant 메시지를 대화에 추가
        conversationMessages.push({
          role: 'assistant',
          content: contentBlocks,
        });

        // 각 tool 실행
        const toolResults: AnthropicContentBlock[] = [];

        for (const toolUse of toolUseBlocks) {
          if (this.abortController.signal.aborted) {
            yield { type: 'aborted' };
            return;
          }

          yield { type: 'tool-use-start', toolName: toolUse.name, toolCallId: toolUse.id };

          const executor = this.toolExecutors.get(toolUse.name);
          if (!executor) {
            const errorMsg = `알 수 없는 도구: ${toolUse.name}`;
            yield { type: 'tool-error', toolName: toolUse.name, toolCallId: toolUse.id, error: errorMsg };
            toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify({ error: errorMsg }) });
            continue;
          }

          try {
            const result = await executor.execute(toolUse.input);
            yield { type: 'tool-result', toolName: toolUse.name, toolCallId: toolUse.id, result };
            toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(result) });
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            yield { type: 'tool-error', toolName: toolUse.name, toolCallId: toolUse.id, error: errorMsg };
            toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify({ error: errorMsg }) });
          }
        }

        // tool results를 user 메시지로 추가 (Anthropic 형식)
        conversationMessages.push({
          role: 'user',
          content: toolResults,
        });

        // stop_reason이 end_turn이면 다시 한번 호출하지 않고 종료
        if (data.stop_reason === 'end_turn' && toolUseBlocks.length > 0) {
          yield { type: 'final', content: assistantText };
          return;
        }

      } catch (error) {
        if (this.abortController.signal.aborted) {
          yield { type: 'aborted' };
          return;
        }
        const errorMsg = error instanceof Error ? error.message : 'Anthropic API 오류';
        yield { type: 'tool-error', toolName: 'anthropic_api', toolCallId: '', error: errorMsg };
        return;
      }
    }

    yield { type: 'max-turns-reached' };
  }

  stop(): void {
    this.abortController?.abort();
  }

  private async callAPIWithRetry(
    system: string,
    messages: AnthropicMessage[],
    tools: AnthropicToolDef[],
  ): Promise<Response> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(ANTHROPIC_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({
            model: this.modelId,
            max_tokens: 4096,
            system,
            messages,
            tools,
            temperature: 0.7,
          }),
          signal: this.abortController?.signal,
        });

        if (response.status === 429) {
          if (attempt >= MAX_RETRIES) throw new Error('Rate limit exceeded');
          const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
          console.warn(`[AnthropicAgent] 429 Rate limit, ${delay}ms 후 재시도 (${attempt + 1}/${MAX_RETRIES})`);
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

  private convertMessages(messages: ChatMessage[]): AnthropicMessage[] {
    const result: AnthropicMessage[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') continue;

      if (msg.role === 'user') {
        result.push({ role: 'user', content: msg.content });
      } else if (msg.role === 'assistant') {
        const content: AnthropicContentBlock[] = [];
        if (msg.content) {
          content.push({ type: 'text', text: msg.content });
        }
        if (msg.metadata?.toolCalls) {
          for (const tc of msg.metadata.toolCalls) {
            content.push({
              type: 'tool_use',
              id: tc.id,
              name: tc.name,
              input: tc.arguments as Record<string, unknown>,
            });
          }
        }
        result.push({ role: 'assistant', content: content.length === 1 && content[0].type === 'text' ? content[0].text : content });
      } else if (msg.role === 'tool' && msg.metadata?.toolCallId) {
        result.push({
          role: 'user',
          content: [{ type: 'tool_result', tool_use_id: msg.metadata.toolCallId, content: msg.content }],
        });
      }
    }

    return result;
  }

  private convertToolDefs(): AnthropicToolDef[] {
    return universalToolDefinitions.map((tool) => ({
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object' as const,
        properties: tool.parameters.properties as Record<string, unknown>,
        required: tool.parameters.required,
      },
    }));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
