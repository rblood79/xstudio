/**
 * AI Service Type Definitions
 *
 * Defines types for AI integration and natural language processing
 */

import type { ComponentIntent, BuilderContext } from './chat';

export interface AIProvider {
  chat(message: string, context: BuilderContext): Promise<string>;
  chatStream(message: string, context: BuilderContext): AsyncGenerator<string>;
  parseIntent(response: string): ComponentIntent | null;
}

export interface GroqConfig {
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  content: string;
  intent?: ComponentIntent;
  suggestions?: string[];
}

export interface IntentParserResult {
  success: boolean;
  intent?: ComponentIntent;
  error?: string;
}
