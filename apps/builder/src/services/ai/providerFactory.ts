/**
 * AI Provider Factory
 *
 * 설정에 따라 적절한 AIAgentProvider 인스턴스를 생성
 * Pencil의 MCP 어댑터 패턴을 웹앱용으로 적응
 */

import type { AIAgentProvider } from '../../types/integrations/ai.types';
import type { AIProviderType } from '../../builder/stores/aiSettings';
import { GroqAgentService } from './GroqAgentService';
import { AnthropicAgentService } from './AnthropicAgentService';
import { OpenAIAgentService } from './OpenAIAgentService';
import { GoogleAgentService } from './GoogleAgentService';

/**
 * 프로바이더별 AgentService 생성
 */
export function createAgentProvider(
  provider: AIProviderType,
  apiKey: string,
  modelId: string,
): AIAgentProvider | null {
  if (!apiKey || apiKey.length === 0) {
    return null;
  }

  switch (provider) {
    case 'anthropic':
      return new AnthropicAgentService(apiKey, modelId);
    case 'openai':
      return new OpenAIAgentService(apiKey, modelId);
    case 'groq':
      return new GroqAgentService(apiKey, modelId);
    case 'google':
      return new GoogleAgentService(apiKey, modelId);
    default:
      return null;
  }
}
