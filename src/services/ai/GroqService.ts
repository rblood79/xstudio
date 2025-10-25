/**
 * Groq AI Service
 *
 * Integrates with Groq API for fast LLM inference
 * Supports both standard and streaming responses
 */

import Groq from 'groq-sdk';
import type { AIProvider, GroqConfig } from '../../types/ai';
import type { BuilderContext, ComponentIntent } from '../../types/chat';

const SYSTEM_PROMPT = `당신은 웹 디자인 어시스턴트입니다. 사용자의 자연어 요청을 분석하여 웹 컴포넌트 생성/수정 명령으로 변환합니다.

**사용 가능한 컴포넌트:**
- Button, TextField, NumberField, SearchField
- Select, ComboBox, ListBox, GridList
- Table, Tree, TagGroup
- Card, Panel, Tabs, Modal, Dialog
- Checkbox, CheckboxGroup, Radio, RadioGroup, Switch, Slider
- DatePicker, DateRangePicker, TimeField, Calendar
- ColorPicker, ColorWheel, ColorField
- ProgressBar, Meter, Tooltip

**사용 가능한 Mock Data 엔드포인트:**
- /countries, /cities, /timezones
- /products, /categories
- /status, /priorities, /tags
- /languages, /currencies
- /users, /departments, /projects
- /component-tree (계층 구조)

**응답 형식 (JSON):**
{
  "action": "create" | "modify" | "delete" | "style" | "query",
  "componentType": "Button" | "Table" | ...,
  "targetElementId": "선택된 요소 ID (modify/delete/style 시)",
  "props": {
    "children": "버튼 텍스트",
    "variant": "primary",
    ...
  },
  "styles": {
    "backgroundColor": "red",
    "padding": "16px",
    ...
  },
  "dataBinding": {
    "baseUrl": "MOCK_DATA",
    "endpoint": "/countries",
    "params": {}
  },
  "description": "수행할 작업에 대한 설명"
}

**예시:**
사용자: "빨간색 버튼을 만들어줘"
응답:
{
  "action": "create",
  "componentType": "Button",
  "props": { "children": "버튼" },
  "styles": { "backgroundColor": "red" },
  "description": "빨간색 배경의 버튼을 생성합니다."
}

사용자: "국가 목록을 보여주는 Select를 추가해줘"
응답:
{
  "action": "create",
  "componentType": "Select",
  "dataBinding": {
    "baseUrl": "MOCK_DATA",
    "endpoint": "/countries"
  },
  "description": "국가 목록을 표시하는 Select 컴포넌트를 생성합니다."
}

사용자: "이 버튼을 왼쪽 정렬로 바꿔줘"
응답:
{
  "action": "style",
  "targetElementId": "current",
  "styles": { "textAlign": "left", "justifyContent": "flex-start" },
  "description": "버튼을 왼쪽 정렬로 변경합니다."
}

**중요:** 반드시 유효한 JSON만 응답하세요. 추가 설명이나 마크다운은 포함하지 마세요.`;

export class GroqService implements AIProvider {
  private client: Groq;
  private config: Required<GroqConfig>;

  constructor(config: GroqConfig) {
    this.config = {
      apiKey: config.apiKey,
      model: config.model || 'llama-3.3-70b-versatile',
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens || 2048,
    };

    this.client = new Groq({
      apiKey: this.config.apiKey,
      dangerouslyAllowBrowser: true, // Vite 환경에서 사용
    });
  }

  /**
   * Standard chat completion
   */
  async chat(message: string, context: BuilderContext): Promise<string> {
    try {
      const contextPrompt = this.buildContextPrompt(context);

      const completion = await this.client.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'system', content: contextPrompt },
          { role: 'user', content: message },
        ],
        model: this.config.model,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      });

      return completion.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Groq API error:', error);
      throw new Error(`Groq API 요청 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * Streaming chat completion
   */
  async *chatStream(message: string, context: BuilderContext): AsyncGenerator<string> {
    try {
      const contextPrompt = this.buildContextPrompt(context);

      const stream = await this.client.chat.completions.create({
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'system', content: contextPrompt },
          { role: 'user', content: message },
        ],
        model: this.config.model,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          yield content;
        }
      }
    } catch (error) {
      console.error('Groq streaming error:', error);
      throw new Error(`Groq 스트리밍 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * Parse AI response into ComponentIntent
   */
  parseIntent(response: string): ComponentIntent | null {
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || response.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        console.warn('No JSON found in response:', response);
        return null;
      }

      const jsonString = jsonMatch[1] || jsonMatch[0];
      const intent = JSON.parse(jsonString) as ComponentIntent;

      // Validate required fields
      if (!intent.action) {
        console.warn('Invalid intent: missing action field', intent);
        return null;
      }

      return intent;
    } catch (error) {
      console.error('Failed to parse intent:', error, response);
      return null;
    }
  }

  /**
   * Build context prompt from current builder state
   */
  private buildContextPrompt(context: BuilderContext): string {
    const { currentPageId, selectedElementId, elements } = context;

    const selectedElement = selectedElementId
      ? elements.find((el) => el.id === selectedElementId)
      : null;

    return `
**현재 빌더 상태:**
- 페이지 ID: ${currentPageId}
- 선택된 요소: ${selectedElement ? `${selectedElement.tag} (ID: ${selectedElementId})` : '없음'}
- 페이지의 총 요소 수: ${elements.length}개

${selectedElement ? `
**선택된 요소 정보:**
- 태그: ${selectedElement.tag}
- Props: ${JSON.stringify(selectedElement.props, null, 2)}
- 부모 ID: ${selectedElement.parent_id || 'root'}
` : ''}

${elements.length > 0 ? `
**페이지 구조 (최근 5개 요소):**
${elements.slice(-5).map((el) => `- ${el.tag} (${el.id}): ${JSON.stringify(el.props).slice(0, 50)}...`).join('\n')}
` : ''}
`.trim();
  }
}

/**
 * Create Groq service instance from environment variables
 */
export function createGroqService(): GroqService {
  const apiKey = import.meta.env.VITE_GROQ_API_KEY;

  if (!apiKey || apiKey === 'your_groq_api_key_here') {
    throw new Error(
      'Groq API 키가 설정되지 않았습니다. .env 파일의 VITE_GROQ_API_KEY를 설정하세요.'
    );
  }

  return new GroqService({
    apiKey,
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
    maxTokens: 2048,
  });
}
