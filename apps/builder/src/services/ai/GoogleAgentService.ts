/**
 * Google Gemini Agent Service
 *
 * Gemini 2.0 Flash / 2.5 Flash Tool Calling + Agent Loop
 * Google Generative AI API를 직접 호출 (REST)
 */

import type { AgentEvent, AIAgentProvider, ToolExecutor } from '../../types/integrations/ai.types';
import type { ChatMessage, BuilderContext } from '../../types/integrations/chat.types';
import { createToolRegistry } from './tools';
import { universalToolDefinitions } from './tools/universalDefinitions';
import { buildSystemPrompt } from './systemPrompt';

const MAX_TURNS = 10;
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY_MS = 1000;

function getGeminiApiUrl(modelId: string, apiKey: string): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${apiKey}`;
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

type GeminiPart =
  | { text: string }
  | { functionCall: { name: string; args: Record<string, unknown> } }
  | { functionResponse: { name: string; response: { content: unknown } } };

interface GeminiFunctionDeclaration {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export class GoogleAgentService implements AIAgentProvider {
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
    const contents = this.convertMessages(messages);
    const tools = this.convertToolDefs();

    let turn = 0;

    while (turn < MAX_TURNS) {
      if (this.abortController.signal.aborted) {
        yield { type: 'aborted' };
        return;
      }

      turn++;

      try {
        const response = await this.callAPIWithRetry(systemPrompt, contents, tools);
        const data = await response.json();

        if (data.error) {
          yield { type: 'tool-error', toolName: 'google_api', toolCallId: '', error: data.error.message ?? 'Gemini API error' };
          return;
        }

        const candidate = data.candidates?.[0];
        if (!candidate?.content?.parts) {
          yield { type: 'tool-error', toolName: 'google_api', toolCallId: '', error: 'No response from Gemini' };
          return;
        }

        const parts: GeminiPart[] = candidate.content.parts;
        let assistantText = '';
        const functionCalls: Array<{ name: string; args: Record<string, unknown> }> = [];

        for (const part of parts) {
          if ('text' in part) {
            assistantText += part.text;
            yield { type: 'text-delta', content: part.text };
          } else if ('functionCall' in part) {
            functionCalls.push(part.functionCall);
          }
        }

        // function calls 없으면 최종 응답
        if (functionCalls.length === 0) {
          yield { type: 'final', content: assistantText };
          return;
        }

        // model 응답을 대화에 추가
        contents.push({
          role: 'model',
          parts,
        });

        // 각 function 실행
        const functionResponses: GeminiPart[] = [];

        for (const fc of functionCalls) {
          if (this.abortController.signal.aborted) {
            yield { type: 'aborted' };
            return;
          }

          const toolCallId = `gemini_${fc.name}_${turn}`;
          yield { type: 'tool-use-start', toolName: fc.name, toolCallId };

          const executor = this.toolExecutors.get(fc.name);
          if (!executor) {
            const errorMsg = `알 수 없는 도구: ${fc.name}`;
            yield { type: 'tool-error', toolName: fc.name, toolCallId, error: errorMsg };
            functionResponses.push({
              functionResponse: { name: fc.name, response: { content: { error: errorMsg } } },
            });
            continue;
          }

          try {
            const result = await executor.execute(fc.args);
            yield { type: 'tool-result', toolName: fc.name, toolCallId, result };
            functionResponses.push({
              functionResponse: { name: fc.name, response: { content: result } },
            });
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            yield { type: 'tool-error', toolName: fc.name, toolCallId, error: errorMsg };
            functionResponses.push({
              functionResponse: { name: fc.name, response: { content: { error: errorMsg } } },
            });
          }
        }

        // function results를 user 메시지로 추가
        contents.push({
          role: 'user',
          parts: functionResponses,
        });

      } catch (error) {
        if (this.abortController.signal.aborted) {
          yield { type: 'aborted' };
          return;
        }
        const errorMsg = error instanceof Error ? error.message : 'Gemini API 오류';
        yield { type: 'tool-error', toolName: 'google_api', toolCallId: '', error: errorMsg };
        return;
      }
    }

    yield { type: 'max-turns-reached' };
  }

  stop(): void {
    this.abortController?.abort();
  }

  private async callAPIWithRetry(
    systemPrompt: string,
    contents: GeminiContent[],
    tools: GeminiFunctionDeclaration[],
  ): Promise<Response> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(getGeminiApiUrl(this.modelId, this.apiKey), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents,
            tools: [{ function_declarations: tools }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 4096,
            },
          }),
          signal: this.abortController?.signal,
        });

        if (response.status === 429) {
          if (attempt >= MAX_RETRIES) throw new Error('Rate limit exceeded');
          const delay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
          console.warn(`[GoogleAgent] 429 Rate limit, ${delay}ms 후 재시도 (${attempt + 1}/${MAX_RETRIES})`);
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

  private convertMessages(messages: ChatMessage[]): GeminiContent[] {
    const result: GeminiContent[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') continue;

      if (msg.role === 'user') {
        result.push({ role: 'user', parts: [{ text: msg.content }] });
      } else if (msg.role === 'assistant') {
        const parts: GeminiPart[] = [];
        if (msg.content) parts.push({ text: msg.content });
        if (msg.metadata?.toolCalls) {
          for (const tc of msg.metadata.toolCalls) {
            parts.push({
              functionCall: { name: tc.name, args: tc.arguments as Record<string, unknown> },
            });
          }
        }
        result.push({ role: 'model', parts });
      } else if (msg.role === 'tool' && msg.metadata?.toolName) {
        result.push({
          role: 'user',
          parts: [{
            functionResponse: {
              name: msg.metadata.toolName,
              response: { content: JSON.parse(msg.content) },
            },
          }],
        });
      }
    }

    return result;
  }

  private convertToolDefs(): GeminiFunctionDeclaration[] {
    return universalToolDefinitions.map((tool) => ({
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters as Record<string, unknown>,
    }));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
