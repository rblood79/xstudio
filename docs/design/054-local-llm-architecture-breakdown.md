# ADR-054 구현 상세: 로컬 LLM 아키텍처

> ADR 본문: [054-local-llm-architecture.md](../adr/054-local-llm-architecture.md)

## Phase 구조

```
═══ 환경 셋업 ═══
Phase 0: Ollama + Qwen3 로컬 설치 및 검증

═══ LLM 인프라 ═══
Phase 1: LLM Provider 추상화 레이어 + Groq 완전 제거
Phase 2: Ollama Provider 구현 (현재 개발 환경)
Phase 3: node-llama-cpp Provider 구현 (Electron 전환 후)
Phase 4: 모델 관리 UI + 자동 설정

═══ AI 기능 (인프라 위) ═══
Phase 5: 컴포넌트 지능 — 카탈로그 + 선택적 문서 주입 (목표 1)
Phase 6: 디자인 지능 — Plan→Execute→Verify 에이전트 + 도구 확장 (목표 2)
```

---

## Phase 0: Ollama + Qwen3 로컬 설치 및 검증

### 0-1. Ollama 설치

**macOS (Homebrew)**:

```bash
brew install ollama
```

**macOS (직접 설치)**:

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

**확인**:

```bash
ollama --version
# ollama version is 0.x.x
```

### 0-2. Ollama 서버 시작

```bash
# 포그라운드 실행 (로그 확인용)
ollama serve

# 또는 백그라운드 서비스 (macOS — 설치 시 자동 등록됨)
brew services start ollama
```

기본 엔드포인트: `http://localhost:11434`

```bash
# 서버 상태 확인
curl http://localhost:11434/api/tags
# {"models":[]}  ← 빈 배열이면 정상 (아직 모델 없음)
```

### 0-3. Qwen3 모델 다운로드

**기본 모델 (Qwen3 7B — 범용, tool calling 지원)**:

```bash
ollama pull qwen3:7b
# pulling manifest... done
# pulling layers... ~4.5GB (Q4_K_M 양자화)
```

**코딩 특화 모델 (Qwen3-Coder 7B — 선택)**:

```bash
ollama pull qwen3-coder:7b
```

**다운로드 확인**:

```bash
ollama list
# NAME              ID            SIZE     MODIFIED
# qwen3:7b          xxxxxxxxxxxx  4.5 GB   Just Now
```

### 0-4. Tool Calling 검증

Ollama + Qwen3 7B의 tool calling이 정상 동작하는지 확인.

```bash
curl http://localhost:11434/api/chat -d '{
  "model": "qwen3:7b",
  "messages": [
    {
      "role": "user",
      "content": "빨간 버튼을 만들어줘"
    }
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "create_element",
        "description": "캔버스에 새 요소를 생성합니다",
        "parameters": {
          "type": "object",
          "properties": {
            "tag": { "type": "string", "description": "요소 타입" },
            "props": { "type": "object", "description": "요소 속성" },
            "styles": { "type": "object", "description": "CSS 스타일" }
          },
          "required": ["tag"]
        }
      }
    }
  ],
  "stream": false
}'
```

**기대 응답** (tool_calls 포함):

```json
{
  "message": {
    "role": "assistant",
    "content": "",
    "tool_calls": [
      {
        "function": {
          "name": "create_element",
          "arguments": {
            "tag": "Button",
            "props": { "children": "버튼" },
            "styles": { "backgroundColor": "red" }
          }
        }
      }
    ]
  }
}
```

> **실패 시**: `"tool_calls"` 없이 텍스트만 반환되면 모델이 tool calling을 지원하지 않는 버전.
> `ollama pull qwen3:7b` 재실행하여 최신 버전 확인.

### 0-5. Thinking Mode 검증

Qwen3의 thinking/non-thinking 모드 전환 확인:

```bash
# Thinking mode (복잡한 요청 — 내부 추론 후 응답)
curl http://localhost:11434/api/chat -d '{
  "model": "qwen3:7b",
  "messages": [
    {
      "role": "user",
      "content": "사용자 관리 대시보드를 설계해줘. 상단에 통계 카드 4개, 하단에 테이블이 필요해. /think"
    }
  ],
  "stream": false
}'

# Non-thinking mode (단순 요청 — 빠른 응답)
curl http://localhost:11434/api/chat -d '{
  "model": "qwen3:7b",
  "messages": [
    {
      "role": "user",
      "content": "이 버튼의 색을 파란색으로 바꿔줘 /no_think"
    }
  ],
  "stream": false
}'
```

### 0-6. 스트리밍 검증

```bash
# stream: true (기본) — NDJSON 스트리밍 응답
curl http://localhost:11434/api/chat -d '{
  "model": "qwen3:7b",
  "messages": [{"role": "user", "content": "안녕"}],
  "stream": true
}'
# {"message":{"role":"assistant","content":"안"},"done":false}
# {"message":{"role":"assistant","content":"녕"},"done":false}
# {"message":{"role":"assistant","content":"하세요"},"done":false}
# ...
# {"message":{"role":"assistant","content":""},"done":true,"total_duration":...}
```

### 0-7. 시스템 요구사항 체크리스트

| 항목   | 최소                  | 권장                      | 확인 방법                            |
| ------ | --------------------- | ------------------------- | ------------------------------------ |
| RAM    | 8GB                   | 16GB+                     | `sysctl hw.memsize` (macOS)          |
| 디스크 | 10GB 여유             | 20GB+                     | `df -h`                              |
| GPU    | Apple Silicon (Metal) | M2+                       | `system_profiler SPDisplaysDataType` |
| Ollama | 0.6+                  | 최신                      | `ollama --version`                   |
| 모델   | qwen3:7b              | qwen3:7b + qwen3-coder:7b | `ollama list`                        |

### 0-8. 환경 변수 설정 (XStudio 개발용)

```bash
# .env.local (apps/builder/)
# Phase 2 구현 전까지는 수동 테스트용

# Ollama 설정
VITE_LLM_PROVIDER=ollama
VITE_OLLAMA_BASE_URL=http://localhost:11434
VITE_OLLAMA_MODEL=qwen3:7b

# 온라인 모델 (선택 — 사용할 서비스만 설정)
VITE_ANTHROPIC_API_KEY=sk-ant-xxxxx
VITE_OPENAI_API_KEY=sk-xxxxx
```

### 0-9. 온라인 모델 API 키 발급

온라인 모델 사용 시 각 서비스에서 API 키를 발급받아야 한다.

**Anthropic (Claude)**:

1. https://console.anthropic.com/ 접속
2. Settings → API Keys → Create Key
3. `.env.local`에 `VITE_ANTHROPIC_API_KEY=sk-ant-xxxxx` 설정

**OpenAI (GPT)**:

1. https://platform.openai.com/api-keys 접속
2. Create new secret key
3. `.env.local`에 `VITE_OPENAI_API_KEY=sk-xxxxx` 설정

> **보안 주의**: 현재 웹앱 상태에서는 `VITE_` 환경 변수가 클라이언트 번들에 포함된다.
> 개발 환경에서만 사용하고, 프로덕션에서는 Phase 4의 보안 저장소를 사용할 것.
> Electron 전환 후에는 `safeStorage` API로 암호화 저장.

### 0-10. 트러블슈팅

**Ollama 서버가 안 뜸**:

```bash
# 포트 충돌 확인
lsof -i :11434
# 다른 포트로 시작
OLLAMA_HOST=0.0.0.0:11435 ollama serve
```

**모델 다운로드 실패**:

```bash
# 네트워크 프록시 환경
HTTPS_PROXY=http://proxy:8080 ollama pull qwen3:7b
```

**GPU 미사용 (CPU만 사용)**:

```bash
# Metal 지원 확인 (macOS)
ollama run qwen3:7b "test" --verbose 2>&1 | grep -i metal
# "metal" 출력 없으면 GPU 미감지 → Ollama 재설치
```

**응답이 너무 느림 (< 10 tok/s)**:

```bash
# 모델 양자화 확인 — Q4_K_M이 기본, Q8은 더 느림
ollama show qwen3:7b --modelfile | grep -i quant

# 더 작은 모델로 테스트
ollama pull qwen3:4b
```

**Tool calling 미동작 (텍스트만 반환)**:

```bash
# Ollama 버전 확인 — tool calling은 0.4+ 필요
ollama --version

# 모델이 tool calling 지원하는지 확인
ollama show qwen3:7b --modelfile
# tools 관련 설정이 있어야 함
```

---

## Phase 1: LLM Provider 추상화 레이어

### 목표

`groq-sdk` 및 관련 코드를 완전 제거하고, Ollama/node-llama-cpp를 위한 Provider 인터페이스를 도입한다.

### 핵심 인터페이스

```typescript
// services/ai/providers/types.ts

export interface LLMProvider {
  readonly name: string;
  readonly type: "local" | "cloud";

  /** Provider 연결 상태 확인 */
  isAvailable(): Promise<boolean>;

  /** 사용 가능한 모델 목록 조회 */
  listModels(): Promise<ModelInfo[]>;

  /** Chat completion + Tool Calling (스트리밍) */
  chat(params: ChatParams): AsyncGenerator<AgentEvent>;

  /** 연결 종료/정리 */
  dispose(): void;
}

export interface ModelInfo {
  id: string; // "qwen3:7b", "claude-sonnet-4-6", "gpt-4o" 등
  name: string; // 표시명
  provider: string; // "ollama", "llamacpp", "anthropic", "openai"
  type: "local" | "cloud";
  size?: number; // 바이트 (로컬 모델)
  parameterSize?: string; // "7B", "14B" 등
  quantization?: string; // "Q4_K_M" 등 (로컬 모델)
  contextWindow?: number; // 토큰 수
  capabilities: {
    toolCalling: boolean;
    vision: boolean;
    thinking: boolean; // extended thinking / Qwen3 /think
  };
}

export interface ChatParams {
  model: string; // 사용할 모델 ID (예: "qwen3:7b")
  messages: LLMMessage[];
  tools?: LLMTool[];
  toolChoice?: "auto" | "none" | "required";
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

export interface LLMMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  toolCalls?: LLMToolCall[];
  toolCallId?: string;
}

export interface LLMTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface LLMToolCall {
  id: string;
  function: {
    name: string;
    arguments: string;
  };
}
```

### 파일 변경표

| 파일                                      | 변경 | 설명                                                      |
| ----------------------------------------- | ---- | --------------------------------------------------------- |
| `services/ai/providers/types.ts`          | 신규 | LLMProvider 인터페이스 (local + cloud)                    |
| `services/ai/providers/index.ts`          | 신규 | Provider 레지스트리 + 팩토리                              |
| `services/ai/providers/anthropic.ts`      | 신규 | Claude API Provider (cloud)                               |
| `services/ai/providers/openai.ts`         | 신규 | OpenAI-compatible Provider (cloud)                        |
| `services/ai/AgentService.ts`             | 신규 | Provider-agnostic Agent Loop                              |
| `services/ai/GroqAgentService.ts`         | 삭제 | groq-sdk 의존 코드 완전 제거                              |
| `services/ai/GroqService.ts`              | 삭제 | deprecated 서비스 완전 제거                               |
| `builder/panels/ai/hooks/useAgentLoop.ts` | 수정 | AgentService 참조로 전환                                  |
| `types/integrations/ai.types.ts`          | 수정 | AgentEvent → LLM-agnostic으로 정리, Groq 타입 제거        |
| `package.json`                            | 수정 | `groq-sdk` 삭제, optional: `@anthropic-ai/sdk` + `openai` |

### Agent Loop 분리 패턴

```typescript
// services/ai/AgentService.ts

export class AgentService {
  private provider: LLMProvider;
  private toolExecutors: Map<string, ToolExecutor>;

  constructor(provider: LLMProvider, tools: Map<string, ToolExecutor>) {
    this.provider = provider;
    this.toolExecutors = tools;
  }

  async *runAgentLoop(
    messages: ChatMessage[],
    context: BuilderContext,
    signal?: AbortSignal,
  ): AsyncGenerator<AgentEvent> {
    const systemPrompt = buildSystemPrompt(context);
    const llmMessages = this.toLLMMessages(systemPrompt, messages);
    const llmTools = this.toLLMTools();

    const MAX_TURNS = 10;

    for (let turn = 0; turn < MAX_TURNS; turn++) {
      if (signal?.aborted) {
        yield { type: "aborted" };
        return;
      }

      const events = this.provider.chat({
        messages: llmMessages,
        tools: llmTools,
        toolChoice: "auto",
        temperature: 0.3,
        maxTokens: 4096,
        signal,
      });

      let assistantContent = "";
      const toolCalls: LLMToolCall[] = [];

      for await (const event of events) {
        if (event.type === "text-delta") {
          assistantContent += event.content;
          yield event;
        } else if (event.type === "tool-call") {
          toolCalls.push(event.toolCall);
          yield {
            type: "tool-use-start",
            toolName: event.toolCall.function.name,
            toolCallId: event.toolCall.id,
          };
        }
      }

      if (toolCalls.length === 0) {
        yield { type: "final", content: assistantContent };
        return;
      }

      // Tool 실행 + 결과 메시지 추가 (기존 패턴과 동일)
      llmMessages.push({
        role: "assistant",
        content: assistantContent || null,
        toolCalls,
      });

      for (const tc of toolCalls) {
        const result = await this.executeTool(tc);
        yield result.event;
        llmMessages.push({
          role: "tool",
          toolCallId: tc.id,
          content: JSON.stringify(result.data),
        });
      }
    }

    yield { type: "max-turns-reached" };
  }
}
```

---

## Phase 2: Ollama Provider 구현

### 전제 조건

- 사용자 로컬에 Ollama 설치 + `ollama pull qwen3:7b` 완료
- Ollama 서버 실행 중 (`localhost:11434`)

### Ollama Provider

```typescript
// services/ai/providers/ollama.ts

export class OllamaProvider implements LLMProvider {
  readonly name = "ollama";
  private baseUrl: string;

  constructor(options?: { baseUrl?: string }) {
    this.baseUrl = options?.baseUrl ?? "http://localhost:11434";
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    const res = await fetch(`${this.baseUrl}/api/tags`);
    if (!res.ok) return [];
    const data = await res.json();

    return (data.models ?? []).map((m: OllamaModel) => ({
      id: m.name,
      name: m.name,
      size: m.size,
      parameterSize: m.details?.parameter_size,
      quantization: m.details?.quantization_level,
      capabilities: {
        toolCalling: isToolCallingModel(m.name),
        vision: m.details?.families?.includes("clip") ?? false,
        thinking: m.name.startsWith("qwen3"),
      },
    }));
  }

  async *chat(params: ChatParams): AsyncGenerator<AgentEvent> {
    const body = {
      model: params.model,
      messages: params.messages.map(toLlamaMessage),
      tools: params.tools,
      stream: true,
      options: {
        temperature: params.temperature ?? 0.3,
        num_predict: params.maxTokens ?? 4096,
      },
    };

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: params.signal,
    });

    if (!res.ok) throw new Error(`Ollama error: ${res.status}`);

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        const chunk = JSON.parse(line);

        if (chunk.message?.content) {
          yield { type: "text-delta", content: chunk.message.content };
        }

        if (chunk.message?.tool_calls) {
          for (const tc of chunk.message.tool_calls) {
            yield {
              type: "tool-call",
              toolCall: {
                id: tc.id ?? crypto.randomUUID(),
                function: {
                  name: tc.function.name,
                  arguments: JSON.stringify(tc.function.arguments),
                },
              },
            };
          }
        }
      }
    }
  }

  dispose(): void {
    /* no-op for HTTP client */
  }
}
```

### Cloud Providers (온라인 모델)

로컬 모델 외에 Anthropic Claude, OpenAI GPT 등 클라우드 모델도 선택할 수 있다.

#### SDK 의존성 전략

| 접근                                     | 장점                                         | 단점                               |
| ---------------------------------------- | -------------------------------------------- | ---------------------------------- |
| SDK 설치 (`@anthropic-ai/sdk`, `openai`) | 타입 안전, SSE 파싱 내장, tool_use 변환 자동 | 번들 크기 증가, 의존성 관리        |
| 직접 fetch (REST API)                    | 의존성 0, 번들 경량, 유연                    | SSE 파싱 직접 구현, 타입 수동 정의 |

**결정: SDK 사용**.

- Anthropic Messages API의 SSE 스트리밍 + tool_use content block 파싱이 복잡 → SDK가 이를 추상화
- OpenAI Chat Completions API의 delta.tool_calls 조립도 SDK가 처리
- `@anthropic-ai/sdk`, `openai` 모두 tree-shakeable → 실제 번들 영향 최소
- Electron 환경에서는 번들 크기 제약이 웹 대비 낮음

```bash
# 의존성 추가 (optional peer — 사용 시만 설치)
pnpm add @anthropic-ai/sdk   # Anthropic Claude
pnpm add openai               # OpenAI + OpenAI-compatible
```

> **참고**: 두 SDK 모두 optional dependency로 등록. 로컬 모델만 사용하는 환경에서는 설치 불필요.
> Provider 초기화 시 dynamic import로 로드하여, SDK 미설치 시 graceful fallback.

```typescript
// services/ai/providers/anthropic.ts

export class AnthropicProvider implements LLMProvider {
  readonly name = "anthropic";
  readonly type = "cloud" as const;
  private client: Anthropic | null = null;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async getClient(): Promise<Anthropic> {
    if (!this.client) {
      // dynamic import — SDK 미설치 시 에러를 isAvailable()에서 catch
      const { default: Anthropic } = await import("@anthropic-ai/sdk");
      this.client = new Anthropic({ apiKey: this.apiKey });
    }
    return this.client;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      await this.getClient();
      return true;
    } catch {
      return false; // SDK 미설치
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    return [
      {
        id: "claude-sonnet-4-6",
        name: "Claude Sonnet 4.6",
        provider: "anthropic",
        type: "cloud",
        contextWindow: 200_000,
        capabilities: { toolCalling: true, vision: true, thinking: true },
      },
      {
        id: "claude-haiku-4-5",
        name: "Claude Haiku 4.5",
        provider: "anthropic",
        type: "cloud",
        contextWindow: 200_000,
        capabilities: { toolCalling: true, vision: true, thinking: false },
      },
    ];
  }

  async *chat(params: ChatParams): AsyncGenerator<AgentEvent> {
    const client = await this.getClient();

    // SDK의 stream 메서드 사용 — SSE 파싱 + tool_use 변환 자동 처리
    const stream = client.messages.stream({
      model: params.model,
      max_tokens: params.maxTokens ?? 4096,
      messages: toAnthropicMessages(params.messages),
      tools: toAnthropicTools(params.tools),
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta") {
        if (event.delta.type === "text_delta") {
          yield { type: "text-delta", content: event.delta.text };
        }
        if (event.delta.type === "input_json_delta") {
          // tool_use input 스트리밍 — 조립은 SDK가 처리
        }
      }
      if (event.type === "content_block_stop") {
        // tool_use 완료 시 AgentEvent로 변환
        const block = stream.currentMessage?.content[event.index];
        if (block?.type === "tool_use") {
          yield {
            type: "tool-call",
            toolCall: {
              id: block.id,
              function: {
                name: block.name,
                arguments: JSON.stringify(block.input),
              },
            },
          };
        }
      }
    }

    const finalMessage = await stream.finalMessage();
    const textContent = finalMessage.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    if (textContent && finalMessage.stop_reason === "end_turn") {
      yield { type: "final", content: textContent };
    }
  }

  dispose(): void {
    this.client = null;
  }
}
```

```typescript
// services/ai/providers/openai.ts
import type OpenAI from "openai";

// OpenAI-compatible Provider — GPT, Together, Fireworks, local vLLM 등 호환
export class OpenAICompatibleProvider implements LLMProvider {
  readonly name: string;
  readonly type = "cloud" as const;
  private client: OpenAI | null = null;
  private apiKey: string;
  private baseUrl: string;
  private _models: ModelInfo[];

  constructor(config: {
    name: string;
    apiKey: string;
    baseUrl: string;
    models: ModelInfo[];
  }) {
    this.name = config.name;
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this._models = config.models;
  }

  private async getClient(): Promise<OpenAI> {
    if (!this.client) {
      const { default: OpenAI } = await import("openai");
      this.client = new OpenAI({
        apiKey: this.apiKey,
        baseURL: this.baseUrl,
        dangerouslyAllowBrowser: true, // Electron 전환 시 제거
      });
    }
    return this.client;
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey) return false;
    try {
      await this.getClient();
      return true;
    } catch {
      return false;
    }
  }

  async listModels(): Promise<ModelInfo[]> {
    return this._models;
  }

  async *chat(params: ChatParams): AsyncGenerator<AgentEvent> {
    const client = await this.getClient();

    // SDK의 stream 메서드 — delta.tool_calls 조립 자동 처리
    const stream = await client.chat.completions.create({
      model: params.model,
      messages: toOpenAIMessages(params.messages),
      tools: params.tools as OpenAI.ChatCompletionTool[],
      tool_choice: params.toolChoice ?? "auto",
      stream: true,
      max_tokens: params.maxTokens ?? 4096,
      temperature: params.temperature ?? 0.3,
    });

    let assistantContent = "";
    const toolCalls: Map<number, LLMToolCall> = new Map();

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;

      if (delta?.content) {
        assistantContent += delta.content;
        yield { type: "text-delta", content: delta.content };
      }

      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (!toolCalls.has(tc.index)) {
            toolCalls.set(tc.index, {
              id: tc.id ?? "",
              function: { name: "", arguments: "" },
            });
          }
          const existing = toolCalls.get(tc.index)!;
          if (tc.id) existing.id = tc.id;
          if (tc.function?.name) existing.function.name = tc.function.name;
          if (tc.function?.arguments)
            existing.function.arguments += tc.function.arguments;
        }
      }

      if (chunk.choices[0]?.finish_reason === "tool_calls") {
        for (const tc of toolCalls.values()) {
          yield { type: "tool-call", toolCall: tc };
        }
      }
      if (chunk.choices[0]?.finish_reason === "stop") {
        yield { type: "final", content: assistantContent };
      }
    }
  }

  dispose(): void {
    this.client = null;
  }
}

// 프리셋 팩토리
export function createOpenAIProvider(apiKey: string) {
  return new OpenAICompatibleProvider({
    name: "openai",
    apiKey,
    baseUrl: "https://api.openai.com/v1",
    models: [
      {
        id: "gpt-4o",
        name: "GPT-4o",
        provider: "openai",
        type: "cloud",
        contextWindow: 128_000,
        capabilities: { toolCalling: true, vision: true, thinking: false },
      },
      {
        id: "gpt-4o-mini",
        name: "GPT-4o mini",
        provider: "openai",
        type: "cloud",
        contextWindow: 128_000,
        capabilities: { toolCalling: true, vision: true, thinking: false },
      },
      {
        id: "o3-mini",
        name: "o3-mini",
        provider: "openai",
        type: "cloud",
        contextWindow: 200_000,
        capabilities: { toolCalling: true, vision: false, thinking: true },
      },
    ],
  });
}
```

> **OpenAI-compatible 패턴**: `baseUrl`만 바꾸면 Together AI, Fireworks, local vLLM 등도 동일 Provider로 연결 가능.

### 설정 UI — 모델 선택 (Pencil / Google Stitch 참조)

Pencil은 언어 + 모델 선택을 제공하고, Google Stitch도 모델 선택이 가능하다.
XStudio는 **로컬 모델 + 온라인 모델**을 통합 UI에서 선택할 수 있도록 한다.

```typescript
// builder/panels/ai/components/LLMSettings.tsx

interface LLMSettingsProps {
  // AIPanel 헤더 또는 설정 패널에서 렌더링
}

// UI 구성:
// ┌──────────────────────────────────────────────────────────┐
// │ AI 모델 설정                                              │
// │                                                           │
// │ ─── 로컬 모델 (Local) ──────────────────────────────────  │
// │ Ollama: http://localhost:11434              [● 연결됨]     │
// │ ┌────────────────────────────────────────────────────┐    │
// │ │ ● qwen3:7b         4.5GB   tool✓ think✓  128K     │    │
// │ │ ○ qwen3-coder:7b   4.5GB   tool✓ think✓  128K     │    │
// │ │ ○ llama3.2:8b      4.9GB   tool✓         128K     │    │
// │ └────────────────────────────────────────────────────┘    │
// │ [+ 모델 추가]  ← "ollama pull <name>" 안내                │
// │                                                           │
// │ ─── 온라인 모델 (Cloud) ────────────────────────────────  │
// │ ┌────────────────────────────────────────────────────┐    │
// │ │ ○ Claude Sonnet 4.6   Anthropic  tool✓ think✓ 200K│    │
// │ │ ○ Claude Haiku 4.5    Anthropic  tool✓        200K│    │
// │ │ ○ GPT-4o              OpenAI     tool✓ vision 128K│    │
// │ │ ○ GPT-4o mini         OpenAI     tool✓ vision 128K│    │
// │ │ ○ o3-mini             OpenAI     tool✓ think✓ 200K│    │
// │ └────────────────────────────────────────────────────┘    │
// │ API Keys: [Anthropic ✓ 설정됨]  [OpenAI ✗ 미설정]         │
// │           [+ API Key 추가]                                │
// │                                                           │
// │ 선택됨: qwen3:7b (로컬, Q4_K_M, 4.5GB)                   │
// └──────────────────────────────────────────────────────────┘

// 로컬: provider.listModels()로 동적 조회
// 온라인: 등록된 cloud provider에서 모델 목록 병합
// API 키 미설정 provider의 모델은 비활성 표시 + "API Key 필요" 안내
// tool calling 미지원 모델은 ⚠️ 경고 + 선택은 허용
```

```typescript
// builder/stores/aiSettings.ts

interface AISettings {
  // 선택된 모델 (provider + model 조합)
  selectedProvider: string; // "ollama", "llamacpp", "anthropic", "openai"
  selectedModel: string; // "qwen3:7b", "claude-sonnet-4-6", "gpt-4o"

  // Provider별 설정
  ollama: {
    baseUrl: string; // default: "http://localhost:11434"
  };
  apiKeys: {
    anthropic?: string; // Anthropic API key
    openai?: string; // OpenAI API key
  };
  // 커스텀 OpenAI-compatible 엔드포인트 (Together, Fireworks, vLLM 등)
  customEndpoints: Array<{
    name: string;
    baseUrl: string;
    apiKey: string;
    models: ModelInfo[];
  }>;

  // 모델별 파라미터
  modelParams: {
    temperature: number; // default: 0.3
    maxTokens: number; // default: 4096
    thinkingMode: "auto" | "always" | "never"; // Qwen3/Claude 전용
  };
}
```

### 파일 변경표

| 파일                                           | 변경 | 설명                                      |
| ---------------------------------------------- | ---- | ----------------------------------------- |
| `services/ai/providers/ollama.ts`              | 신규 | Ollama REST API Provider                  |
| `services/ai/providers/index.ts`               | 수정 | Ollama Provider 등록                      |
| `builder/panels/ai/components/LLMSettings.tsx` | 신규 | Provider 설정 UI                          |
| `builder/stores/aiSettings.ts`                 | 신규 | Provider 설정 상태 (Zustand)              |
| `package.json`                                 | 수정 | `groq-sdk` 삭제 확인 (Phase 1에서 제거됨) |

---

## Phase 3: node-llama-cpp Provider 구현 (Electron 전환 후)

### 아키텍처

```
┌─────────────────────────────────────────────┐
│           Main Process                       │
│  ├── LLM Utility Process Manager             │
│  │   └── utilityProcess.fork('llm-worker')   │
│  └── IPC Bridge (MessagePort)                │
├──────────────── IPC ─────────────────────────┤
│         Utility Process (llm-worker)         │
│  ├── node-llama-cpp                          │
│  │   ├── LlamaModel (GGUF)                  │
│  │   ├── LlamaChatSession                    │
│  │   └── Tool Calling (JSON Schema)          │
│  └── GPU 가속 (Metal / CUDA / Vulkan)        │
├──────────────── IPC ─────────────────────────┤
│          Renderer Process                    │
│  ├── AgentService (LLMProvider 인터페이스)    │
│  └── AI Panel UI                             │
└─────────────────────────────────────────────┘
```

### Utility Process Worker

```typescript
// electron/workers/llm-worker.ts

import { getLlama, LlamaChatSession } from "node-llama-cpp";

let session: LlamaChatSession | null = null;

process.parentPort?.on("message", async ({ data }) => {
  switch (data.type) {
    case "init": {
      const llama = await getLlama();
      const model = await llama.loadModel({ modelPath: data.modelPath });
      const context = await model.createContext();
      session = new LlamaChatSession({
        contextSequence: context.getSequence(),
      });
      process.parentPort?.postMessage({ type: "ready" });
      break;
    }

    case "chat": {
      if (!session) throw new Error("Model not initialized");

      const response = await session.prompt(data.prompt, {
        functions: data.tools, // node-llama-cpp 내장 tool calling
        onTextChunk: (text) => {
          process.parentPort?.postMessage({
            type: "text-delta",
            content: text,
          });
        },
        signal: data.signal,
      });

      process.parentPort?.postMessage({ type: "final", content: response });
      break;
    }

    case "dispose": {
      session = null;
      process.parentPort?.postMessage({ type: "disposed" });
      break;
    }
  }
});
```

### LlamaCpp Provider (Renderer → Main → Utility)

```typescript
// services/ai/providers/llamacpp.ts (Electron Renderer)

export class LlamaCppProvider implements LLMProvider {
  readonly name = "llamacpp";

  async isAvailable(): Promise<boolean> {
    return window.electronAPI?.llm.isReady() ?? false;
  }

  async listModels(): Promise<ModelInfo[]> {
    // Electron Main Process가 모델 디렉토리를 스캔하여 GGUF 파일 목록 반환
    return window.electronAPI?.llm.listModels() ?? [];
  }

  async *chat(params: ChatParams): AsyncGenerator<AgentEvent> {
    // IPC를 통해 Utility Process에 요청
    const channel = await window.electronAPI.llm.chat({
      model: params.model,
      messages: params.messages,
      tools: params.tools,
      temperature: params.temperature,
      maxTokens: params.maxTokens,
    });

    // MessagePort 스트리밍 수신
    for await (const event of channel) {
      yield event;
    }
  }

  dispose(): void {
    window.electronAPI?.llm.dispose();
  }
}
```

### 파일 변경표

| 파일                                | 변경 | 설명                          |
| ----------------------------------- | ---- | ----------------------------- |
| `electron/workers/llm-worker.ts`    | 신규 | Utility Process LLM 워커      |
| `electron/llm-manager.ts`           | 신규 | Utility Process 생명주기 관리 |
| `services/ai/providers/llamacpp.ts` | 신규 | IPC 기반 LlamaCpp Provider    |
| `electron/preload.ts`               | 수정 | `window.electronAPI.llm` 노출 |
| `package.json`                      | 수정 | `node-llama-cpp` 의존성 추가  |

---

## Phase 4: 모델 관리 + 선택 UI

### 모델 선택 워크플로

```
사용자가 AI Panel 열기
  ↓
모든 등록된 provider에서 listModels() 병렬 호출
  ↓
┌─ 로컬 모델 ─────────────────────────────────┐
│ [●] qwen3:7b         Ollama  tool✓ think✓   │
│ [ ] qwen3-coder:7b   Ollama  tool✓ think✓   │
│ [ ] llama3.2:8b      Ollama  tool✓          │
├─ 온라인 모델 ────────────────────────────────┤
│ [ ] Claude Sonnet 4.6  Anthropic  tool✓ 200K│
│ [ ] GPT-4o             OpenAI     tool✓ 128K│
│ [ ] (OpenAI 미설정 — API Key 필요)      🔒  │
└──────────────────────────────────────────────┘
  ↓
선택 → aiSettings.selectedProvider + selectedModel 저장
  ↓
다음 chat 요청부터 해당 provider + 모델 사용
```

### 로컬 모델 관리

**Ollama (Phase 2)**:

- `provider.listModels()` → `/api/tags` 조회 → 설치된 모델 동적 목록
- 모델 추가: "모델 추가하기" → 터미널에서 `ollama pull <name>` 실행 안내
- 권장 프리셋: qwen3:7b (기본), qwen3-coder:7b (코딩), llama3.2:8b (영어 특화)

**Electron + node-llama-cpp (Phase 3)**:

- `provider.listModels()` → 모델 디렉토리 GGUF 파일 스캔
- 앱 번들에 기본 GGUF 모델 포함 또는 첫 실행 시 다운로드
- 모델 추가: 파일 브라우저로 GGUF 선택 또는 URL 다운로드
- GPU 가속 상태 + 메모리 사용량 표시

### 온라인 모델 관리 + API 키 보안

#### API 키 입력 UI

```
설정 UI → 온라인 모델 섹션:

┌─ API Keys ──────────────────────────────────────┐
│                                                  │
│ Anthropic (Claude)                               │
│ ┌──────────────────────────────┐                 │
│ │ sk-ant-••••••••••••••xxxx    │ [표시] [삭제]   │
│ └──────────────────────────────┘                 │
│ 상태: ✓ 유효 (잔액 확인됨)                        │
│                                                  │
│ OpenAI                                           │
│ ┌──────────────────────────────┐                 │
│ │ API Key를 입력하세요          │ [저장]          │
│ └──────────────────────────────┘                 │
│ 상태: 미설정                                      │
│                                                  │
│ [+ 커스텀 엔드포인트 추가]                         │
│   (Together AI, Fireworks, vLLM 등)              │
└──────────────────────────────────────────────────┘
```

#### API 키 저장 전략 (환경별)

| 환경               | 저장소                        | 보안 수준 | 비고                         |
| ------------------ | ----------------------------- | :-------: | ---------------------------- |
| 개발 (Vite 웹앱)   | `.env.local` (`VITE_*`)       |   낮음    | 번들에 포함됨 — 개발 전용    |
| 개발 (런타임 입력) | 메모리 (Zustand)              |   중간    | 새로고침 시 소실, XSS에 안전 |
| Electron           | `safeStorage` API             |   높음    | OS 키체인으로 암호화 저장    |
| 프로덕션 (웹)      | Supabase Edge Function 프록시 |   높음    | 키가 서버에만 존재           |

```typescript
// services/ai/keyStorage.ts

export interface KeyStorage {
  get(provider: string): Promise<string | null>;
  set(provider: string, key: string): Promise<void>;
  delete(provider: string): Promise<void>;
}

// 개발 환경: 메모리 + env fallback
class MemoryKeyStorage implements KeyStorage {
  private keys = new Map<string, string>();

  async get(provider: string): Promise<string | null> {
    // 1. 런타임 입력값 우선
    if (this.keys.has(provider)) return this.keys.get(provider)!;
    // 2. env fallback (개발 전용)
    const envKey = import.meta.env[`VITE_${provider.toUpperCase()}_API_KEY`];
    return envKey ?? null;
  }

  async set(provider: string, key: string): Promise<void> {
    this.keys.set(provider, key);
  }

  async delete(provider: string): Promise<void> {
    this.keys.delete(provider);
  }
}

// Electron 환경: safeStorage (OS 키체인 암호화)
class ElectronKeyStorage implements KeyStorage {
  async get(provider: string): Promise<string | null> {
    return window.electronAPI?.keyStorage.get(provider) ?? null;
  }

  async set(provider: string, key: string): Promise<void> {
    await window.electronAPI?.keyStorage.set(provider, key);
  }

  async delete(provider: string): Promise<void> {
    await window.electronAPI?.keyStorage.delete(provider);
  }
}

export function createKeyStorage(): KeyStorage {
  if (window.electronAPI?.keyStorage) return new ElectronKeyStorage();
  return new MemoryKeyStorage();
}
```

```typescript
// electron/preload.ts (Electron 환경)

contextBridge.exposeInMainWorld("electronAPI", {
  keyStorage: {
    get: (provider: string) => ipcRenderer.invoke("key-storage:get", provider),
    set: (provider: string, key: string) =>
      ipcRenderer.invoke("key-storage:set", provider, key),
    delete: (provider: string) =>
      ipcRenderer.invoke("key-storage:delete", provider),
  },
  // ...
});

// electron/main.ts
import { safeStorage } from "electron";
import Store from "electron-store";

const store = new Store({ encryptionKey: "xstudio-ai" });

ipcMain.handle("key-storage:get", (_, provider: string) => {
  const encrypted = store.get(`apiKeys.${provider}`) as Buffer | undefined;
  if (!encrypted) return null;
  return safeStorage.decryptString(Buffer.from(encrypted));
});

ipcMain.handle("key-storage:set", (_, provider: string, key: string) => {
  const encrypted = safeStorage.encryptString(key);
  store.set(`apiKeys.${provider}`, encrypted.toJSON());
});

ipcMain.handle("key-storage:delete", (_, provider: string) => {
  store.delete(`apiKeys.${provider}`);
});
```

#### API 키 검증 흐름

```
사용자가 API 키 입력 → [저장]
  ↓
keyStorage.set(provider, key)
  ↓
provider.isAvailable() 호출 (SDK 초기화 + 간단한 API 호출로 검증)
  ↓
성공: "✓ 유효" 표시, 해당 provider 모델 활성화
실패: "✗ 유효하지 않은 키" 에러, 모델 비활성 유지
```

- API Key 미설정 provider는 모델 목록에 🔒 비활성 표시 + "API Key 설정" 링크
- 커스텀 엔드포인트 추가 가능 (OpenAI-compatible: Together, Fireworks, vLLM 등)

### 호환성 매트릭스

**로컬 모델 (Ollama / node-llama-cpp)**:

| 모델           | Tool Calling | Thinking | 한국어 | 비용 | 권장 용도                      |
| -------------- | :----------: | :------: | :----: | :--: | ------------------------------ |
| qwen3:7b       |      ✓       |    ✓     |   ◎    | 무료 | 기본 — 디자인 대화 + 도구 호출 |
| qwen3-coder:7b |      ✓       |    ✓     |   ○    | 무료 | 복잡한 도구 로직, 코드 생성    |
| qwen3:14b      |      ✓       |    ✓     |   ◎    | 무료 | 고품질 추론 (RAM 16GB+ 권장)   |
| llama3.2:8b    |      ✓       |    ✗     |   △    | 무료 | 영어 환경, 빠른 응답           |
| mistral:7b     |      ✓       |    ✗     |   △    | 무료 | 영어 환경, 코드 보조           |

**온라인 모델 (Cloud API)**:

| 모델              | Provider  | Tool Calling | Thinking | 한국어 | Context | 비용     |
| ----------------- | --------- | :----------: | :------: | :----: | ------: | -------- |
| Claude Sonnet 4.6 | Anthropic |      ✓       |    ✓     |   ◎    |    200K | API 과금 |
| Claude Haiku 4.5  | Anthropic |      ✓       |    ✗     |   ◎    |    200K | API 과금 |
| GPT-4o            | OpenAI    |      ✓       |    ✗     |   ◎    |    128K | API 과금 |
| GPT-4o mini       | OpenAI    |      ✓       |    ✗     |   ○    |    128K | API 과금 |
| o3-mini           | OpenAI    |      ✓       |    ✓     |   ○    |    200K | API 과금 |

> Tool calling 미지원 모델 선택 시 Agent Loop가 비활성화되고 순수 텍스트 대화 모드로 전환된다.
> 온라인 모델은 더 높은 추론 품질을 제공하지만, 프라이버시/오프라인/비용 트레이드오프가 있음.
> 사용자가 용도에 따라 자유롭게 전환할 수 있도록 한다.

---

## Provider 레지스트리

```typescript
// services/ai/providers/index.ts

export function buildProviderRegistry(settings: AISettings): LLMProvider[] {
  const providers: LLMProvider[] = [];

  // 로컬
  providers.push(new LlamaCppProvider());
  providers.push(new OllamaProvider(settings.ollama));

  // 온라인
  if (settings.apiKeys.anthropic) {
    providers.push(new AnthropicProvider(settings.apiKeys.anthropic));
  }
  if (settings.apiKeys.openai) {
    providers.push(createOpenAIProvider(settings.apiKeys.openai));
  }
  for (const ep of settings.customEndpoints) {
    providers.push(new OpenAICompatibleProvider(ep));
  }

  return providers;
}

export async function getAllModels(
  providers: LLMProvider[],
): Promise<ModelInfo[]> {
  // 모든 provider에서 병렬로 모델 목록 수집
  const results = await Promise.allSettled(
    providers.filter((p) => p.isAvailable()).map((p) => p.listModels()),
  );
  return results
    .filter(
      (r): r is PromiseFulfilledResult<ModelInfo[]> => r.status === "fulfilled",
    )
    .flatMap((r) => r.value);
}

export function resolveProvider(
  providers: LLMProvider[],
  selectedProvider: string,
): LLMProvider | undefined {
  return providers.find((p) => p.name === selectedProvider);

  for (const p of providers) {
    if (await p.isAvailable()) return p;
  }

  throw new Error("No LLM provider available");
}
```

---

## Qwen3 7B 모델 사양

| 항목           | Qwen3 7B (Q4_K_M)          | Qwen3-Coder 7B (Q4_K_M)     |
| -------------- | -------------------------- | --------------------------- |
| Tool Calling   | 네이티브 지원              | 네이티브 지원               |
| Context Window | 128K                       | 128K                        |
| 추론 속도      | ~35 tok/s (M3)             | ~35 tok/s (M3)              |
| 한국어         | 우수 (다국어 학습)         | 양호                        |
| 코딩/디자인    | 범용                       | 코드 생성 특화              |
| VRAM           | ~4.5GB                     | ~4.5GB                      |
| Thinking Mode  | /think, /no_think 전환     | /think, /no_think 전환      |
| 용도           | 디자인 대화, 레이아웃 계획 | 복잡한 도구 호출, 코드 로직 |

## Qwen3 Thinking Mode 활용

Qwen3는 `/think` 모드를 지원하여 복잡한 디자인 요청 시 내부 추론 후 응답:

```
사용자: "대시보드 레이아웃 만들어줘"
→ Qwen3 /think: 컴포넌트 구조 계획 → 레이아웃 결정 → 도구 호출 순서 결정
→ Tool calls: create_element(Section, flex) → create_composite(Card) × 4 → ...
```

단순 요청은 `/no_think` 모드로 빠르게 처리.

---

## Phase 5: 컴포넌트 지능 — 카탈로그 + 선택적 문서 주입 (목표 1)

### 목표

React Aria Components / React Spectrum S2 문서를 기반으로, 자연어 명령만으로 컴포넌트의 모든 props, variants, 상태, 접근성 패턴을 정확하게 활용할 수 있게 한다.

### 문제: 컨텍스트 윈도우 제약

| 리소스                        | 토큰 수 | Qwen3 128K 대비 |
| ----------------------------- | ------- | --------------- |
| React Aria 52개 컴포넌트 문서 | ~216K   | 169% (초과)     |
| React Spectrum S2 71개 문서   | ~95K    | 74%             |
| 합계                          | ~311K   | 243% (초과)     |
| 단일 컴포넌트 평균            | ~3K     | 2.3%            |

**결론**: 전체 문서를 시스템 프롬프트에 넣을 수 없음. 선택적 주입 전략 필수.

### 전략: 2-Tier Context Injection

```
Tier 1 — 항상 포함 (시스템 프롬프트 내장, ~8K tok):
  ├── Component Catalog Summary (65+ 컴포넌트, 카테고리, 핵심 props)
  ├── Layout & Style Guide (flex/grid 패턴, spacing, variant/size 유효값)
  └── Data Binding Guide (Mock 엔드포인트 목록, DataTable 프리셋)

Tier 2 — 요청 시 동적 로드 (도구 호출로 주입, ~3-10K tok/건):
  └── get_component_docs(name) → 해당 컴포넌트의 React Aria/S2 상세 문서
```

### Tier 1: XStudio Component Catalog

React Aria/Spectrum 문서에서 XStudio에 맞게 파생한 축약 카탈로그. 빌드 타임에 생성 가능.

```typescript
// services/ai/catalog/componentCatalog.ts
// 빌드 스크립트로 React Aria/Spectrum 문서 + XStudio Spec에서 자동 생성

export const COMPONENT_CATALOG = `
## 사용 가능한 컴포넌트 (7개 카테고리, 65+개)

### Content (2개)
- **Text**: 텍스트 블록. props: children(string)
- **Heading**: 제목. props: children(string), level(1-6)

### Layout (7개)
- **Section**: flex 컨테이너. props: children. styles: display(flex|grid), flexDirection, gap, padding
- **Div**: 범용 컨테이너
- **Card**: 카드. **create_composite 필수** (CardHeader→Heading + CardContent→Description).
  variant: default|primary|secondary|surface. size: xs|sm|md|lg|xl
- **Tabs**: 탭. **create_composite 필수** (TabList→Tab×N + TabPanels→Panel×N)
- **Panel**: 범용 컨테이너. variant: default|tab
- **Breadcrumbs**: 경로 탐색. children: BreadcrumbItem[]
- **Separator**: 구분선

### Forms (12개)
- **TextField**: 텍스트 입력. props: label, placeholder, isRequired, isDisabled, isReadOnly, type(text|email|password|search|tel|url), description, errorMessage, validationState(valid|invalid). size: xs-xl
- **NumberField**: 숫자. props: label, minValue, maxValue, step, formatOptions
- **SearchField**: 검색. props: label, placeholder, onSubmit
- **Select**: 드롭다운. **create_composite 권장**. props: label, items, selectedKey, isRequired. size: xs-xl
- **ComboBox**: 자동완성. props: label, items, inputValue, allowsCustomValue
- **Checkbox**: 체크박스. props: children, isSelected, isIndeterminate, isDisabled
- **CheckboxGroup**: 그룹. props: label, children(Checkbox[])
- **RadioGroup**: 라디오 그룹. props: label, children(Radio[])
- **Switch**: 토글. props: children, isSelected
- **Slider**: 슬라이더. props: label, minValue, maxValue, step, value
- **DatePicker**: 날짜 선택. **create_composite**. props: label, granularity(day|hour|minute|second), isRequired
- **DateRangePicker**: 날짜 범위. **create_composite**

### Actions (4개)
- **Button**: 버튼. props: children, onPress. variant: default|primary|secondary|surface. size: xs-xl
- **ToggleButton**: 토글 버튼. props: isSelected, children
- **ToggleButtonGroup**: 그룹. props: selectionMode(single|multiple)
- **Menu**: 메뉴. props: children(MenuItem[])

### Collections (4개)
- **Table**: 데이터 테이블. **create_composite + dataBinding**. props: selectionMode(single|multiple)
- **ListBox**: 리스트. props: items, selectionMode. dataBinding 지원
- **GridList**: 그리드 리스트. dataBinding 지원
- **TagGroup**: 태그 그룹. props: label, children(Tag[])

### Date & Time (4개)
- **Calendar**: 달력. **create_composite**
- **DateField**: 날짜 필드. props: label, granularity
- **TimeField**: 시간 필드. props: label, granularity
- **DateRangePicker**: 범위. **create_composite**

### Feedback (4개)
- **ProgressBar**: 진행률. props: label, value, maxValue
- **Meter**: 측정값. props: label, value, maxValue
- **Badge**: 배지. props: children, variant(19종 색상). size: xs-xl
- **Tooltip**: 툴팁. props: children, placement

### Overlays (3개)
- **Dialog**: 대화상자. props: children, isDismissable
- **Modal**: 모달 래퍼
- **Popover**: 팝오버. props: placement, offset
`;
```

### Tier 2: get_component_docs 도구

사용자 요청에서 언급된 컴포넌트의 상세 문서를 동적으로 로드.

```typescript
// services/ai/tools/getComponentDocs.ts

export const getComponentDocsTool: LLMTool = {
  type: "function",
  function: {
    name: "get_component_docs",
    description:
      "특정 컴포넌트의 상세 API 문서를 조회합니다. props, 이벤트, 접근성 패턴, 코드 예시를 포함합니다. 복잡한 props 설정이 필요할 때 호출하세요.",
    parameters: {
      type: "object",
      properties: {
        componentName: {
          type: "string",
          description: "컴포넌트 이름 (예: DateRangePicker, Table, Select)",
        },
      },
      required: ["componentName"],
    },
  },
};

// 구현: .claude/skills/react-aria/references/components/{name}.md 로드
// XStudio Spec props와 병합하여 반환
export async function executeGetComponentDocs(args: {
  componentName: string;
}): Promise<string> {
  // 1. React Aria 문서 로드
  const ariaDoc = await loadReactAriaDoc(args.componentName);
  // 2. XStudio Spec에서 실제 지원 props 추출
  const specProps = getSpecProps(args.componentName);
  // 3. 병합: React Aria 문서 + XStudio 실제 지원 범위
  return mergeDocWithSpec(ariaDoc, specProps);
}
```

### 카탈로그 빌드 파이프라인

```
React Aria 문서 (52개 .md)
  + React Spectrum S2 문서 (71개 .md)
  + XStudio Spec 정의 (packages/specs/src/)
  + XStudio Factory 정의 (componentDefinitions/)
  ↓ 빌드 스크립트
XStudio Component Catalog (Tier 1 요약 + Tier 2 상세)
```

### 파일 변경표

| 파일                                      | 변경 | 설명                                         |
| ----------------------------------------- | ---- | -------------------------------------------- |
| `services/ai/catalog/componentCatalog.ts` | 신규 | Tier 1 컴포넌트 카탈로그 (시스템 프롬프트용) |
| `services/ai/catalog/layoutGuide.ts`      | 신규 | Tier 1 레이아웃 가이드                       |
| `services/ai/catalog/dataBindingGuide.ts` | 신규 | Tier 1 데이터 바인딩 가이드                  |
| `services/ai/catalog/buildCatalog.ts`     | 신규 | 빌드 스크립트 — Spec+문서→카탈로그 생성      |
| `services/ai/tools/getComponentDocs.ts`   | 신규 | Tier 2 동적 문서 로드 도구                   |
| `services/ai/systemPrompt.ts`             | 수정 | Tier 1 카탈로그 통합 (51줄→~200줄)           |
| `services/ai/tools/definitions.ts`        | 수정 | get_component_docs 도구 등록                 |

---

## Phase 6: 디자인 지능 — Plan→Execute→Verify 에이전트 + 도구 확장 (목표 2)

### 목표

Pencil/Google Stitch처럼 자연어로 페이지 전체를 디자인할 수 있는 멀티스텝 에이전트 워크플로를 구현한다.

### 에이전트 워크플로: Plan → Execute → Verify

```
사용자: "사용자 관리 대시보드를 만들어줘"

┌─── Plan (thinking mode) ──────────────────────────────┐
│ 1. 전체 구조 결정:                                     │
│    - 최상위 Section (flex, column, gap: 24)            │
│    - 상단: 통계 카드 4개 (Section, flex, row)           │
│    - 하단: 좌측 필터 + 우측 테이블 (Section, flex, row) │
│                                                        │
│ 2. 컴포넌트 선택:                                      │
│    - Card × 4 (variant: surface, Heading+Description)  │
│    - TextField (검색)                                   │
│    - Select (필터)                                      │
│    - Table (dataBinding: /users)                        │
│                                                        │
│ 3. 실행 순서 결정:                                      │
│    - create_composite(Section, root container)          │
│    - create_composite(Section, stats row)               │
│    - create_composite(Card) × 4                         │
│    - create_composite(Section, content row)             │
│    - create_element(TextField, search)                  │
│    - create_element(Select, filter)                     │
│    - create_composite(Table, dataBinding: /users)       │
└────────────────────────────────────────────────────────┘
    ↓
┌─── Execute (tool calls) ──────────────────────────────┐
│ batch_design([                                         │
│   { action: "create", tag: "Section", styles: {...} }, │
│   { action: "create_composite", tag: "Card", ... },    │
│   { action: "create_composite", tag: "Card", ... },    │
│   ...                                                  │
│ ])                                                     │
│                                                        │
│ → 시각 피드백: generating effect (블러+파티클)          │
│ → 완료 피드백: flash effect per element                 │
└────────────────────────────────────────────────────────┘
    ↓
┌─── Verify (자기 검증) ────────────────────────────────┐
│ get_editor_state() → 생성된 구조 확인                  │
│ - 레이아웃 올바른가? (flex/grid 설정 확인)             │
│ - 컴포넌트가 모두 생성되었는가?                        │
│ - 데이터 바인딩이 설정되었는가?                        │
│                                                        │
│ 문제 발견 시 → 자동 수정 (update_element)              │
└────────────────────────────────────────────────────────┘
    ↓
사용자에게 결과 보고:
"대시보드를 생성했습니다:
 - 상단: 총 사용자 / 활성 / 신규 / 비활성 통계 카드 4개
 - 하단: 검색+필터 사이드바 + 사용자 데이터 테이블 (/users 연동)
 수정이 필요하면 말씀해주세요."
```

### 신규 도구: create_composite

팩토리 정의를 직접 호출하여 children 구조를 자동 생성.

```typescript
// services/ai/tools/createComposite.ts

export const createCompositeTool: LLMTool = {
  type: "function",
  function: {
    name: "create_composite",
    description:
      "복합 컴포넌트를 children 구조와 함께 일괄 생성합니다. Card, Tabs, Table, Calendar, DatePicker 등 children이 필요한 컴포넌트에 사용하세요.",
    parameters: {
      type: "object",
      properties: {
        tag: {
          type: "string",
          enum: [
            "Card",
            "Tabs",
            "Table",
            "Calendar",
            "DatePicker",
            "DateRangePicker",
            "Select",
            "ComboBox",
          ],
          description: "복합 컴포넌트 타입",
        },
        parentId: { type: "string", description: "부모 요소 ID" },
        props: {
          type: "object",
          description: "루트 컴포넌트 props (variant, size 등)",
        },
        styles: { type: "object", description: "CSS 스타일" },
        childrenConfig: {
          type: "object",
          description:
            "자식 요소 커스터마이징 (예: Card의 heading 텍스트, Tab 개수/라벨)",
          properties: {
            heading: { type: "string", description: "Card 제목" },
            description: { type: "string", description: "Card 설명" },
            tabLabels: {
              type: "array",
              items: { type: "string" },
              description: "Tab 라벨 목록",
            },
            columns: {
              type: "array",
              items: { type: "object" },
              description: "Table 컬럼 정의",
            },
          },
        },
        dataBinding: {
          type: "object",
          description: "데이터 바인딩 (Collections 컴포넌트용)",
          properties: {
            endpoint: { type: "string", description: "Mock API 엔드포인트" },
          },
        },
      },
      required: ["tag"],
    },
  },
};
```

### 신규 도구: apply_layout

레이아웃 템플릿을 적용하여 구조적 배치를 한 번에 생성.

```typescript
// services/ai/tools/applyLayout.ts

export const applyLayoutTool: LLMTool = {
  type: "function",
  function: {
    name: "apply_layout",
    description: "레이아웃 템플릿을 적용하여 페이지 구조를 생성합니다.",
    parameters: {
      type: "object",
      properties: {
        template: {
          type: "string",
          enum: [
            "dashboard-grid", // 상단 통계 + 하단 테이블/차트
            "sidebar-content", // 좌측 사이드바 + 우측 콘텐츠
            "form-layout", // 필드 그룹 수직 나열
            "card-grid", // 카드 그리드 (2-4 컬럼)
            "split-view", // 좌우 분할
            "header-body-footer", // 3단 구조
          ],
          description: "레이아웃 템플릿 이름",
        },
        parentId: { type: "string", description: "부모 요소 ID" },
        options: {
          type: "object",
          description: "템플릿 옵션 (컬럼 수, gap, padding 등)",
        },
      },
      required: ["template"],
    },
  },
};
```

### 시스템 프롬프트 확장: 디자인 에이전트 가이드

```typescript
// Tier 1 시스템 프롬프트에 추가

const DESIGN_AGENT_GUIDE = `
## 디자인 워크플로

복합 디자인 요청(페이지, 대시보드, 폼 등)을 받으면 다음 순서로 처리하세요:

### Step 1: Plan (구조 설계)
- 전체 레이아웃 구조 결정 (apply_layout 또는 수동 Section/flex/grid)
- 필요한 컴포넌트 목록 작성
- 데이터 바인딩 대상 결정

### Step 2: Execute (도구 호출)
- 최상위 컨테이너부터 생성 (top-down)
- create_composite로 복합 컴포넌트 생성 (개별 create_element 대신)
- batch_design으로 여러 요소 일괄 생성
- 데이터 바인딩 설정

### Step 3: Verify (검증)
- get_editor_state()로 생성된 구조 확인
- 레이아웃 오류 발견 시 update_element로 수정
- 누락된 컴포넌트 추가

### 레이아웃 필수 규칙
- 여러 요소를 나열하려면 **부모 Section에 flex 레이아웃 설정**
- 수직: { display: 'flex', flexDirection: 'column', gap: 16 }
- 수평: { display: 'flex', flexDirection: 'row', gap: 16 }
- 그리드: { display: 'grid', gridTemplateColumns: 'repeat(N, 1fr)', gap: 16 }
- 요소 없이 나열하면 **모두 겹침** — 반드시 컨테이너로 감싸기
`;
```

### batch_design 확장

```typescript
// 기존 batch_design의 action enum 확장
action: {
  type: 'string',
  enum: [
    'create', 'update', 'delete',
    'create_composite',  // 팩토리 기반 복합 생성
    'apply_layout',      // 레이아웃 템플릿 적용
  ],
}

// $bindAs 지원: 생성된 요소 ID를 후속 operation에서 참조
// 예: { action: 'create', tag: 'Section', $bindAs: 'container' }
//     { action: 'create', tag: 'Button', parentId: '$container' }
```

### 파일 변경표

| 파일                                   | 변경 | 설명                                         |
| -------------------------------------- | ---- | -------------------------------------------- |
| `services/ai/tools/createComposite.ts` | 신규 | 복합 컴포넌트 생성 도구                      |
| `services/ai/tools/applyLayout.ts`     | 신규 | 레이아웃 템플릿 도구                         |
| `services/ai/tools/batchDesign.ts`     | 수정 | create_composite, apply_layout, $bindAs 지원 |
| `services/ai/tools/definitions.ts`     | 수정 | 신규 도구 3개 등록                           |
| `services/ai/systemPrompt.ts`          | 수정 | 디자인 에이전트 가이드 추가                  |
| `services/ai/layoutTemplates.ts`       | 신규 | 레이아웃 템플릿 정의 (6종)                   |
| `services/ai/AgentService.ts`          | 수정 | Plan→Execute→Verify 루프 지원                |

---

## Phase 의존성 그래프

```
Phase 1 (Provider 추상화) ← 선행 필수
  ↓
Phase 2 (Ollama)     Phase 5 (컴포넌트 지능) ← 병렬 가능
  ↓                    ↓
Phase 4 (모델 관리)  Phase 6 (디자인 지능) ← Phase 5 이후
  ↓
Phase 3 (node-llama-cpp) ← Electron 전환 후
```

**즉시 시작 가능**: Phase 1 → Phase 2 + Phase 5 병렬 → Phase 6
**Electron 이후**: Phase 3 → Phase 4
