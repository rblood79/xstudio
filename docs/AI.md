# xstudio AI 기능 업그레이드 설계

> 작성일: 2026-01-31
> 참고: `docs/PENCIL_APP_ANALYSIS.md` §20 (Pencil AI 통합 분석)
> 참고: `docs/WASM.md` (렌더링 전환 계획)
> 대상: `apps/builder/src/services/ai/`, `apps/builder/src/builder/panels/ai/`
> LLM 공급자: Groq SDK (무료 tier, llama-3.3-70b-versatile)

---

## 1. 현재 상태 분석

### 1.1 AI 파일 구조

> **Phase A1~A4 구현 완료** (2026-02-06)

```
apps/builder/src/
├── types/integrations/
│   ├── ai.types.ts              # ✅ AgentEvent, ToolCall, ToolExecutor, AIAgentProvider 타입
│   └── chat.types.ts            # ✅ tool role, ToolCallInfo, ConversationState 확장
├── types/theme/
│   └── generation.types.ts      # 테마 생성 타입
├── services/ai/
│   ├── GroqAgentService.ts      # ✅ Tool Calling + Agent Loop 핵심 서비스
│   ├── GroqService.ts           # ⚠️ deprecated — IntentParser fallback 전용
│   ├── IntentParser.ts          # 유지 (최후 fallback)
│   ├── systemPrompt.ts          # ✅ 동적 시스템 프롬프트 빌더
│   ├── styleAdapter.ts          # ✅ CSS-like → 내부 스키마 변환 레이어
│   └── tools/                   # ✅ 도구 구현 디렉토리
│       ├── index.ts             # 도구 레지스트리 (7개 도구)
│       ├── definitions.ts       # 도구 JSON Schema 정의
│       ├── createElement.ts     # create_element (G.3 flash 연동)
│       ├── updateElement.ts     # update_element (G.3 flash 연동)
│       ├── deleteElement.ts     # delete_element (body 보호)
│       ├── getEditorState.ts    # get_editor_state (트리 구조 변환)
│       ├── getSelection.ts      # get_selection (선택 요소 상세)
│       ├── searchElements.ts    # search_elements (tag/prop/style 필터)
│       └── batchDesign.ts       # batch_design (일괄 create/update/delete)
├── services/theme/
│   └── ThemeGenerationService.ts # AI 테마 생성
├── builder/panels/ai/
│   ├── AIPanel.tsx              # ✅ useAgentLoop 기반, Tool 피드백 UI
│   ├── AIPanel.css
│   ├── components/              # ✅ 패널 하위 컴포넌트
│   │   ├── ToolCallMessage.tsx  # 도구 호출 상태 표시 (아이콘+라벨+스피너)
│   │   ├── ToolResultMessage.tsx # 도구 실행 결과 표시
│   │   └── AgentControls.tsx    # 중단 버튼 + 현재 turn 표시
│   └── hooks/
│       └── useAgentLoop.ts      # ✅ Agent Loop React hook (G.3 연동)
├── builder/panels/themes/components/
│   └── AIThemeGenerator.tsx     # 테마 생성 UI
└── builder/stores/
    ├── conversation.ts          # ✅ agent 상태, tool events 확장
    └── aiVisualFeedback.ts      # ✅ G.3 시각 피드백 (generating/flash)
```

### 1.2 기존 아키텍처의 문제점 및 해결 상태

| 문제 | 상세 | 해결 |
|------|------|------|
| **JSON 텍스트 파싱 방식** | AI가 JSON 텍스트를 출력 → `parseIntent()`로 파싱 → 형식 깨짐 빈번 | ✅ Tool Calling으로 대체 (GroqAgentService) |
| **대화 히스토리 미전달** | 매 메시지가 독립적 — AI에 이전 대화 컨텍스트 없음 | ✅ 전체 대화 히스토리 전달 (runAgentLoop) |
| **컨텍스트 부족** | 최근 5개 요소의 간략 정보만 전달 | ✅ get_editor_state/get_selection 도구로 풍부한 컨텍스트 |
| **Tool Calling 미사용** | groq-sdk가 tool calling을 지원하지만 활용하지 않음 | ✅ 7개 도구 정의 + tool_choice: 'auto' |
| **단일 메시지 구조** | tool 실행 과정, 중간 결과 표시 불가 | ✅ ToolCallMessage/ToolResultMessage 컴포넌트 |
| **에이전트 제어 없음** | 중단 버튼, 재시도 등 제어 기능 없음 | ✅ AgentControls + AbortController |
| **시각 피드백 없음** | AI 작업 중 캔버스 레벨 피드백 없음 | ✅ G.3 완전 구현 (generating + flash) |
| **배치 작업 미지원** | 복수 요소 일괄 생성/수정 불가 | ✅ batch_design 도구 (최대 20개 작업) |
| **Rate Limit 미대응** | Groq 무료 tier 30 req/min 제한 시 에러 | ✅ 429 지수 백오프 (3회 재시도) |

### 1.3 기존 메시지 흐름

```
사용자 입력
    ↓
[AIPanel] ChatInput
    ↓
addUserMessage() → Conversation Store
    ↓
[GroqService] chatStream() — 시스템 프롬프트에 JSON 형식 강제
    ↓
AI가 JSON 텍스트 출력 (형식 깨짐 가능)
    ↓
parseIntent() — JSON 파싱 시도
    ↓ 실패 시
[IntentParser] Rule-based fallback
    ↓
executeIntent() — 단일 요소 생성/수정/삭제
```

---

## 2. Pencil AI 기능 분석

> 출처: `docs/PENCIL_APP_ANALYSIS.md` §20, §24.11

### 2.1 Pencil AI 아키텍처

```
┌─────────────────────────────────────────────┐
│              Main Process                    │
│  ├── Claude AI 에이전트 (claude.js)          │
│  │   └── @anthropic-ai/claude-agent-sdk     │
│  │       ├── Tool Calling (도구 직접 호출)    │
│  │       ├── Multi-turn Agent Loop           │
│  │       └── Streaming (delta)               │
│  └── MCP 어댑터 (desktop-mcp-adapter.js)     │
│      ├── Claude Code CLI                     │
│      ├── Codex CLI                           │
│      ├── Gemini CLI                          │
│      └── OpenCode CLI                        │
├──────────────── IPC ─────────────────────────┤
│            Renderer Process                  │
│  ├── AI Chat Panel (ARt)                     │
│  │   ├── 모델 선택 (Opus/Sonnet/Haiku)       │
│  │   ├── 프롬프트 입력 + 제출                 │
│  │   ├── Tool Use 실시간 표시                 │
│  │   └── 프레임 → 코드 생성                   │
│  └── renderGeneratingEffects()               │
│      └── AI 생성 중 시각 피드백 (블러+파티클)   │
└─────────────────────────────────────────────┘
```

### 2.2 Pencil AI 핵심 기능

| 기능 | 설명 |
|------|------|
| **Agent Tool Use** | AI가 에디터 조작 도구를 직접 호출 (텍스트 파싱 아님) |
| **batch-design** | 대규모 디자인 변경 (insert/update/copy/delete 배치 처리) |
| **풍부한 컨텍스트** | get-editor-state, get-selection, get-screenshot, get-variables, search-design-nodes, get-style-guide 등 18종 IPC Handle |
| **Frame → Code 생성** | 디자인 프레임 선택 후 코드 자동 생성 |
| **디자인 프롬프트** | 자연어로 전체 디자인 생성 |
| **Tool 이벤트 스트리밍** | chat-tool-use-start → chat-tool-use → chat-tool-result |
| **AI 생성 이펙트** | 생성 중 블러+파티클 시각 피드백 (CanvasKit) |
| **에이전트 제어** | agent-stop IPC로 중단 가능, streaming delta 실시간 표시 |
| **AI 생성 이미지** | 생성된 이미지를 에셋으로 저장 |

### 2.3 Pencil AI 관련 IPC 이벤트

**렌더러 → 호스트 (Notify):**

| 메서드 | 용도 |
|--------|------|
| `submit-prompt` | AI 프롬프트 제출 |
| `send-prompt` | 에이전트 프롬프트 전달 |
| `enter-claude-api-key` | API 키 설정 |
| `clear-claude-api-key` | API 키 삭제 |
| `add-to-chat` | 채팅 컨텍스트 추가 |

**렌더러 → 호스트 (Request):**

| 메서드 | 용도 |
|--------|------|
| `agent-stop` | AI 에이전트 중지 |
| `save-generated-image` | AI 생성 이미지 저장 |

**호스트 → 렌더러 (Handle — AI가 에디터 조작에 사용):**

| 메서드 | 용도 |
|--------|------|
| `get-editor-state` | 에디터 상태 반환 |
| `get-selection` | 선택 노드 반환 |
| `get-screenshot` | 뷰포트 캡처 |
| `get-variables` | 디자인 변수 반환 |
| `set-variables` | 디자인 변수 설정 |
| `get-style-guide` | 스타일 가이드 반환 |
| `search-design-nodes` | 노드 검색 |
| `search-all-unique-properties` | 속성 검색 |
| `replace-all-matching-properties` | 속성 일괄 교체 |
| `batch-design` | 배치 디자인 작업 (insert/update/copy/delete) |
| `copy-nodes-by-id` | ID로 노드 복사 |
| `find-empty-space-on-canvas` | 빈 공간 탐색 |

**호스트 → 렌더러 (이벤트 수신):**

| 이벤트 | 용도 |
|--------|------|
| `chat-tool-use-start` | 도구 호출 시작 |
| `chat-tool-use` | 도구 호출 진행 |
| `chat-tool-result` | 도구 실행 결과 |
| `chat-session` | 세션 관리 |
| `chat-assistant-delta` | 스트리밍 텍스트 |
| `chat-assistant-final` | 최종 응답 |
| `chat-error` | 에러 |
| `chat-agent-message` | 에이전트 메시지 |
| `chat-question-answered` | 질문 응답 완료 |
| `claude-status` | AI 연결 상태 |

### 2.4 Pencil AI 모델 지원

| 환경 | 사용 가능 모델 | 기본 모델 |
|------|--------------|----------|
| Electron (데스크톱) | Sonnet, Haiku, Opus | Opus |
| Cursor (IDE 통합) | Sonnet, Haiku, Composer | Composer |

---

## 3. Groq SDK 역량 분석

### 3.1 현재 버전

- **패키지**: `groq-sdk` v0.37.0
- **환경변수**: `VITE_GROQ_API_KEY`
- **사용 모델**: `llama-3.3-70b-versatile`
- **브라우저 사용**: `dangerouslyAllowBrowser: true`

### 3.2 Pencil Claude Agent SDK 대체 가능성

| Claude Agent SDK 기능 | groq-sdk 대응 | 가능 여부 |
|----------------------|--------------|----------|
| Tool Calling | `tools` + `tool_choice` 파라미터 지원 | **가능** |
| Streaming | `stream: true` 지원 | **가능** |
| Tool Use Events | `delta.tool_calls` 스트리밍 지원 | **가능** |
| Multi-turn | messages 배열에 tool_result 포함 | **가능** |
| Agent Loop | 자체 구현 필요 (SDK에 내장 안 됨) | **직접 구현** |
| MCP Protocol | 미지원 | **별도 구현 필요** (후순위) |
| 이미지 입력 (스크린샷) | llama 모델 미지원 | **불가** (텍스트 컨텍스트 우선) |

### 3.3 groq-sdk Tool Calling 지원 확인

groq-sdk v0.37.0의 `ChatCompletionCreateParams`에서 확인된 타입:

```typescript
// groq-sdk/src/resources/chat/completions.ts
interface ChatCompletionCreateParams {
  tools?: Array<ChatCompletionTool> | null;
  tool_choice?: ChatCompletionToolChoiceOption | null;
  // ...
}

interface ChatCompletionTool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;  // JSON Schema
  };
}

type ChatCompletionToolChoiceOption = 'none' | 'auto' | 'required' | ChatCompletionNamedToolChoice;
```

### 3.4 무료 사용 시 제한

| 항목 | 제한 |
|------|------|
| Rate Limit | 30 req/min (무료 tier) |
| Token Limit | 30,000 tokens/min |
| 모델 | llama-3.3-70b-versatile (tool calling 지원) |
| 컨텍스트 윈도우 | 128K tokens |
| 속도 | Groq LPU 기반 — 매우 빠름 (장점) |

### 3.5 위험 완화 전략

- Tool 정의를 단순하고 명확하게 유지 (llama 모델이 잘 따르도록)
- JSON mode (`response_format: { type: "json_object" }`) 활용 가능
- IntentParser를 완전 제거하지 않고 최후 fallback으로 유지
- 복잡한 작업은 여러 개의 단순한 tool로 분할
- Rate limit 대응: 요청 큐 + 지수 백오프 구현

---

## 4. 목표 아키텍처

### 4.1 전환 전후 비교

**현재 (JSON 텍스트 파싱):**
```
User → "빨간 버튼 만들어"
  → Groq chatStream() — 시스템 프롬프트에 JSON 강제
  → AI가 JSON 텍스트 출력 (파싱 실패 가능)
  → parseIntent() → executeIntent()
```

**목표 (Tool Calling + Agent Loop):**
```
User → "빨간 버튼 만들어"
  → Groq chat.completions.create({ tools, messages })
  → AI가 tool_calls 반환: [{ name: "create_element", arguments: {...} }]
  → 도구 실행 → 결과를 messages에 추가
  → AI가 추가 도구 호출 or 최종 텍스트 응답
```

### 4.2 목표 메시지 흐름

```
사용자 입력
    ↓
[AIPanel] ChatInput
    ↓
addUserMessage() → Conversation Store
    ↓
[AIAgentService] runAgentLoop()
    ↓
┌─── Agent Loop ─────────────────────────────────┐
│                                                 │
│  Groq chat.completions.create({                 │
│    tools: [create_element, update_element, ...], │
│    messages: [...대화 히스토리, 시스템 프롬프트]    │
│  })                                              │
│      ↓                                          │
│  response.choices[0].message                    │
│      ↓                                          │
│  tool_calls 있음?                                │
│  ├── Yes → 각 tool_call 실행                     │
│  │         → 결과를 tool message로 추가           │
│  │         → UI에 tool-use 피드백 표시            │
│  │         → continue (다음 턴)                   │
│  └── No  → 최종 텍스트 응답                       │
│           → 사용자에게 표시                        │
│           → break                                │
│                                                  │
│  AbortController로 언제든 중단 가능               │
└──────────────────────────────────────────────────┘
```

### 4.3 AI 도구 정의

Pencil의 IPC Handle을 참고하여 Groq tool calling에 등록할 도구:

| 도구 | 역할 | Pencil 대응 | 상태 |
|------|------|------------|------|
| `create_element` | 요소 생성 (타입, props, styles, 부모 지정) | batch-design → handleInsert | ✅ 구현 |
| `update_element` | 요소 속성/스타일 수정 | batch-design → handleUpdate | ✅ 구현 |
| `delete_element` | 요소 삭제 | batch-design → handleDelete | ✅ 구현 |
| `get_editor_state` | 현재 페이지 구조, 요소 트리 조회 | get-editor-state | ✅ 구현 |
| `get_selection` | 선택된 요소 상세 정보 | get-selection | ✅ 구현 |
| `search_elements` | 조건으로 요소 검색 (태그, 속성 등) | search-design-nodes | ✅ 구현 |
| `batch_design` | 복수 요소 일괄 변경 | batch-design | ✅ 구현 |
| `get_style_guide` | 현재 테마, 디자인 토큰 조회 | get-style-guide | Phase 5+ |
| `get_variables` | 디자인 변수 목록 조회 | get-variables | Phase 5+ |
| `set_variables` | 디자인 변수 설정 | set-variables | Phase 5+ |
| `create_component` | 요소를 Master 컴포넌트로 등록 (G.1) | — | Phase 5+ |
| `create_instance` | Master의 인스턴스 배치 (G.1) | — | Phase 5+ |
| `override_instance` | 인스턴스 속성 오버라이드 (G.1) | — | Phase 5+ |

> **Phase 5+ (G.1/G.2 반영):** `create_component`, `create_instance`, `override_instance` 도구가 추가되어
> 컴포넌트-인스턴스 시스템을 AI가 직접 조작할 수 있다.
> `get_variables`, `set_variables`는 테마별 분기(`themeId`)와 그룹 필터(`group`)를 지원하도록 확장되었다.

### 4.4 도구 JSON Schema 예시

```typescript
const tools: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'create_element',
      description: '캔버스에 새 요소를 생성합니다.',
      parameters: {
        type: 'object',
        properties: {
          tag: {
            type: 'string',
            description: '요소 타입',
            enum: ['Button', 'TextField', 'Select', 'Table', 'Card',
                   'Checkbox', 'Radio', 'Switch', 'Tabs', 'Modal',
                   'DatePicker', 'ProgressBar', 'Tooltip', 'div', 'span'],
          },
          parentId: {
            type: 'string',
            description: '부모 요소 ID. 없으면 body에 추가.',
          },
          props: {
            type: 'object',
            description: '요소 속성 (children, variant, placeholder 등)',
          },
          styles: {
            type: 'object',
            description: 'CSS 스타일 (backgroundColor, padding, fontSize 등)',
          },
          dataBinding: {
            type: 'object',
            description: '데이터 바인딩 설정',
            properties: {
              endpoint: { type: 'string', description: 'Mock API 엔드포인트 (/countries, /users 등)' },
            },
          },
        },
        required: ['tag'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'update_element',
      description: '기존 요소의 속성이나 스타일을 수정합니다.',
      parameters: {
        type: 'object',
        properties: {
          elementId: {
            type: 'string',
            description: '수정할 요소 ID. "selected"이면 현재 선택된 요소.',
          },
          props: { type: 'object', description: '변경할 속성' },
          styles: { type: 'object', description: '변경할 스타일' },
        },
        required: ['elementId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_element',
      description: '요소를 삭제합니다.',
      parameters: {
        type: 'object',
        properties: {
          elementId: {
            type: 'string',
            description: '삭제할 요소 ID. "selected"이면 현재 선택된 요소.',
          },
        },
        required: ['elementId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_editor_state',
      description: '현재 에디터 상태를 조회합니다. 페이지 구조, 요소 트리, 선택 상태 등.',
      parameters: {
        type: 'object',
        properties: {
          includeStyles: { type: 'boolean', description: '스타일 정보 포함 여부' },
          maxDepth: { type: 'number', description: '트리 탐색 최대 깊이' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_selection',
      description: '현재 선택된 요소의 상세 정보를 조회합니다.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_elements',
      description: '조건에 맞는 요소를 검색합니다.',
      parameters: {
        type: 'object',
        properties: {
          tag: { type: 'string', description: '요소 타입으로 검색' },
          prop: { type: 'string', description: '속성명으로 검색' },
          value: { type: 'string', description: '속성값으로 검색' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'batch_design',
      description: '복수 요소를 일괄 생성/수정/삭제합니다.',
      parameters: {
        type: 'object',
        properties: {
          operations: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                action: { type: 'string', enum: ['create', 'update', 'delete'] },
                tag: { type: 'string' },
                elementId: { type: 'string' },
                parentId: { type: 'string' },
                props: { type: 'object' },
                styles: { type: 'object' },
              },
              required: ['action'],
            },
          },
        },
        required: ['operations'],
      },
    },
  },
];
```

#### Phase 5+ 도구 스키마 (G.1/G.2/G.4 반영)

컴포넌트-인스턴스 시스템(G.1)과 변수 참조(G.2) 지원을 위한 추가 도구:

```typescript
// G.1: 컴포넌트-인스턴스 도구
{
  type: 'function',
  function: {
    name: 'create_component',
    description: '현재 요소를 재사용 가능한 Master 컴포넌트로 등록합니다.',
    parameters: {
      type: 'object',
      properties: {
        elementId: { type: 'string', description: 'Master로 등록할 요소 ID' },
        componentName: { type: 'string', description: '컴포넌트 이름' },
      },
      required: ['elementId', 'componentName'],
    },
  },
},
{
  type: 'function',
  function: {
    name: 'create_instance',
    description: 'Master 컴포넌트의 인스턴스를 생성하여 캔버스에 배치합니다.',
    parameters: {
      type: 'object',
      properties: {
        masterId: { type: 'string', description: 'Master 컴포넌트 ID' },
        parentId: { type: 'string', description: '부모 요소 ID' },
      },
      required: ['masterId'],
    },
  },
},
{
  type: 'function',
  function: {
    name: 'override_instance',
    description: '인스턴스의 속성을 오버라이드합니다. Master 원본에는 영향 없음.',
    parameters: {
      type: 'object',
      properties: {
        instanceId: { type: 'string', description: '인스턴스 요소 ID' },
        overrides: { type: 'object', description: '오버라이드할 속성' },
      },
      required: ['instanceId', 'overrides'],
    },
  },
},

// G.2: 변수 참조 확장
// 기존 get_variables, set_variables 도구에 테마별 분기 지원 추가:
{
  type: 'function',
  function: {
    name: 'get_variables',
    description: '디자인 변수 목록을 조회합니다. 테마별 값 포함.',
    parameters: {
      type: 'object',
      properties: {
        themeId: { type: 'string', description: '특정 테마의 값만 조회 (선택)' },
        group: { type: 'string', description: '변수 그룹으로 필터 (선택)' },
      },
    },
  },
},
{
  type: 'function',
  function: {
    name: 'set_variables',
    description: '디자인 변수를 설정하거나 수정합니다.',
    parameters: {
      type: 'object',
      properties: {
        variables: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: '변수 이름 ($-- 접두사 없이)' },
              type: { type: 'string', enum: ['color', 'string', 'number'] },
              defaultValue: { description: '기본값' },
              themeOverrides: { type: 'object', description: '테마별 오버라이드 {테마명: 값}' },
            },
            required: ['name', 'type', 'defaultValue'],
          },
        },
      },
      required: ['variables'],
    },
  },
},
```

**batch_design 확장 (G.1 반영):**
기존 `batch_design` 도구의 `action` enum에 컴포넌트 작업 추가:

```typescript
action: {
  type: 'string',
  enum: [
    'create', 'update', 'delete',
    // Phase 5+ G.1 추가:
    'create_component', 'create_instance', 'override_instance', 'detach_instance',
  ],
}
```

---

## 5. 목표 파일 구조

```
apps/builder/src/
├── types/integrations/
│   ├── ai.types.ts              # ★ 재작성: AITool, AgentLoop, ToolCall 타입
│   └── chat.types.ts            # ★ 확장: ToolCallMessage, ToolResultMessage 추가
├── services/ai/
│   ├── GroqAgentService.ts      # ★ 신규: Tool Calling + Agent Loop 핵심 서비스
│   ├── tools/                   # ★ 신규: 도구 구현 디렉토리
│   │   ├── index.ts             # 도구 등록 레지스트리
│   │   ├── definitions.ts       # 도구 JSON Schema 정의
│   │   ├── createElement.ts     # create_element 구현
│   │   ├── updateElement.ts     # update_element 구현
│   │   ├── deleteElement.ts     # delete_element 구현
│   │   ├── getEditorState.ts    # get_editor_state 구현
│   │   ├── getSelection.ts      # get_selection 구현
│   │   ├── searchElements.ts    # search_elements 구현
│   │   └── batchDesign.ts       # batch_design 구현
│   ├── styleAdapter.ts          # ★ 신규: CSS-like → 내부 스키마 변환 레이어
│   ├── systemPrompt.ts          # ★ 신규: 시스템 프롬프트 관리
│   ├── GroqService.ts           # ⚠️ deprecated — IntentParser fallback 전용으로 유지
│   └── IntentParser.ts          # 유지 (최후 fallback)
├── builder/panels/ai/
│   ├── AIPanel.tsx              # ★ 재작성: Tool 실행 피드백, 중단 버튼
│   ├── AIPanel.css              # 스타일 업데이트
│   ├── components/              # ★ 신규: 패널 하위 컴포넌트
│   │   ├── ToolCallMessage.tsx  # Tool 호출 메시지 표시
│   │   ├── ToolResultMessage.tsx # Tool 결과 표시
│   │   └── AgentControls.tsx    # 중단/재시도 버튼
│   └── hooks/
│       └── useAgentLoop.ts      # ★ 신규: Agent loop React hook
└── builder/stores/
    └── conversation.ts          # ★ 확장: tool events, agent 상태
```

---

## 6. 핵심 구현 설계

### 6.1 Agent Loop (GroqAgentService)

```typescript
// services/ai/GroqAgentService.ts

class GroqAgentService {
  private client: Groq;
  private tools: ChatCompletionTool[];
  private toolExecutors: Map<string, ToolExecutor>;
  private abortController: AbortController | null = null;

  async *runAgentLoop(
    messages: ChatMessage[],
    context: BuilderContext,
  ): AsyncGenerator<AgentEvent> {
    this.abortController = new AbortController();
    const conversationMessages = this.buildMessages(messages, context);

    const MAX_TURNS = 10;  // 무한 루프 방지
    let turn = 0;

    while (turn < MAX_TURNS) {
      if (this.abortController.signal.aborted) {
        yield { type: 'aborted' };
        return;
      }

      turn++;

      // Groq API 호출 (streaming)
      const stream = await this.client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: conversationMessages,
        tools: this.tools,
        tool_choice: 'auto',
        stream: true,
      });

      let assistantMessage = '';
      const toolCalls: ToolCall[] = [];

      // 스트리밍 처리
      for await (const chunk of stream) {
        if (this.abortController.signal.aborted) break;

        const delta = chunk.choices[0]?.delta;

        // 텍스트 스트리밍
        if (delta?.content) {
          assistantMessage += delta.content;
          yield { type: 'text-delta', content: delta.content };
        }

        // Tool call 스트리밍
        if (delta?.tool_calls) {
          for (const tc of delta.tool_calls) {
            // tool call 조립
            if (tc.index !== undefined) {
              if (!toolCalls[tc.index]) {
                toolCalls[tc.index] = { id: tc.id, name: '', arguments: '' };
              }
              if (tc.function?.name) toolCalls[tc.index].name = tc.function.name;
              if (tc.function?.arguments) toolCalls[tc.index].arguments += tc.function.arguments;
            }
          }
        }
      }

      // Tool calls 없으면 → 최종 응답, 루프 종료
      if (toolCalls.length === 0) {
        yield { type: 'final', content: assistantMessage };
        return;
      }

      // Assistant message를 대화에 추가
      conversationMessages.push({
        role: 'assistant',
        content: assistantMessage || null,
        tool_calls: toolCalls.map(tc => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: tc.arguments },
        })),
      });

      // 각 Tool 실행
      for (const tc of toolCalls) {
        yield { type: 'tool-use-start', toolName: tc.name, toolCallId: tc.id };

        try {
          const args = JSON.parse(tc.arguments);
          const executor = this.toolExecutors.get(tc.name);

          if (!executor) throw new Error(`Unknown tool: ${tc.name}`);

          const result = await executor.execute(args);

          yield { type: 'tool-result', toolName: tc.name, toolCallId: tc.id, result };

          // Tool result를 대화에 추가
          conversationMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          yield { type: 'tool-error', toolName: tc.name, toolCallId: tc.id, error: errorMsg };

          conversationMessages.push({
            role: 'tool',
            tool_call_id: tc.id,
            content: JSON.stringify({ error: errorMsg }),
          });
        }
      }

      // 다음 턴으로 (AI가 추가 도구 호출 또는 최종 응답)
    }

    yield { type: 'max-turns-reached' };
  }

  stop(): void {
    this.abortController?.abort();
  }
}
```

### 6.2 Agent Event 타입

```typescript
// types/integrations/ai.types.ts

type AgentEvent =
  | { type: 'text-delta'; content: string }
  | { type: 'tool-use-start'; toolName: string; toolCallId: string }
  | { type: 'tool-result'; toolName: string; toolCallId: string; result: unknown }
  | { type: 'tool-error'; toolName: string; toolCallId: string; error: string }
  | { type: 'final'; content: string }
  | { type: 'aborted' }
  | { type: 'max-turns-reached' };
```

### 6.3 메시지 타입 확장

```typescript
// types/integrations/chat.types.ts

export type MessageRole = 'user' | 'assistant' | 'system' | 'tool';

export type MessageStatus = 'pending' | 'streaming' | 'complete' | 'error';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  status: MessageStatus;
  timestamp: number;
  metadata?: {
    toolCalls?: ToolCallInfo[];      // assistant 메시지에 포함된 tool calls
    toolCallId?: string;             // tool 결과 메시지의 대응 ID
    toolName?: string;               // tool 이름
    toolResult?: unknown;            // tool 실행 결과
    error?: string;
  };
}

export interface ToolCallInfo {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
  status: 'pending' | 'running' | 'success' | 'error';
  result?: unknown;
  error?: string;
}
```

### 6.4 Conversation Store 확장

```typescript
// builder/stores/conversation.ts

interface ConversationState {
  messages: ChatMessage[];
  isStreaming: boolean;
  isAgentRunning: boolean;         // 에이전트 루프 실행 중
  currentTurn: number;             // 현재 에이전트 턴
  activeToolCalls: ToolCallInfo[]; // 실행 중인 도구 호출
  currentContext: BuilderContext | null;

  // 기존 액션
  addUserMessage: (content: string) => void;
  addAssistantMessage: (content: string, toolCalls?: ToolCallInfo[]) => void;
  updateLastMessage: (content: string) => void;
  setStreamingStatus: (isStreaming: boolean) => void;
  updateContext: (context: BuilderContext) => void;
  clearConversation: () => void;

  // 신규 액션
  setAgentRunning: (running: boolean) => void;
  addToolMessage: (toolCallId: string, toolName: string, result: unknown) => void;
  updateToolCallStatus: (toolCallId: string, status: ToolCallInfo['status'], result?: unknown) => void;
  incrementTurn: () => void;
}
```

### 6.5 시스템 프롬프트

```typescript
// services/ai/systemPrompt.ts

export function buildSystemPrompt(context: BuilderContext): string {
  return `당신은 XStudio 웹 빌더의 AI 디자인 어시스턴트입니다.
사용자의 자연어 요청을 분석하여 제공된 도구를 사용해 디자인 요소를 생성, 수정, 삭제합니다.

## 사용 가능한 컴포넌트
Button, TextField, NumberField, SearchField, Select, ComboBox, ListBox, GridList,
Table, Tree, TagGroup, Card, Panel, Tabs, Modal, Dialog,
Checkbox, CheckboxGroup, Radio, RadioGroup, Switch, Slider,
DatePicker, DateRangePicker, TimeField, Calendar,
ColorPicker, ColorWheel, ColorField, ProgressBar, Meter, Tooltip

## 사용 가능한 Mock Data 엔드포인트
/countries, /cities, /timezones, /products, /categories,
/status, /priorities, /tags, /languages, /currencies,
/users, /departments, /projects, /component-tree

## 규칙
1. 요소를 생성/수정하기 전에 get_editor_state나 get_selection으로 현재 상태를 파악하세요.
2. 복수 요소를 변경할 때는 batch_design 도구를 사용하세요.
3. "현재 선택된 요소"를 수정할 때는 elementId에 "selected"를 사용하세요.
4. 스타일은 CSS 속성명을 camelCase로 사용하세요 (backgroundColor, fontSize 등).
5. 항상 한국어로 응답하세요.
6. 작업 완료 후 사용자에게 무엇을 했는지 간략히 설명하세요.`;
}
```

#### Phase 5+ 확장 (G.1/G.2/G.4 반영)

시스템 프롬프트에 컴포넌트 라이브러리, 디자인 변수, 현재 테마 정보를 추가:

```typescript
export function buildSystemPrompt(context: EnhancedBuilderContext): string {
  let prompt = `... (기존 프롬프트) ...`;

  // G.1: 컴포넌트 라이브러리 컨텍스트
  if (context.masterComponents?.length) {
    prompt += `\n\n## 재사용 가능한 컴포넌트 (Master)
${context.masterComponents.map(m => `- ${m.name} (${m.tag}, ${m.instanceCount} instances)`).join('\n')}

create_instance 도구를 사용하여 위 컴포넌트의 인스턴스를 배치할 수 있습니다.
override_instance로 인스턴스별 속성을 변경할 수 있습니다.`;
  }

  // G.2: 디자인 변수 컨텍스트
  if (context.designVariables?.length) {
    prompt += `\n\n## 디자인 변수
${context.designVariables.map(v => `- $--${v.name} (${v.type}): ${v.defaultValue}`).join('\n')}

스타일 값에 "$--변수명" 형식으로 변수를 참조할 수 있습니다.
예: { backgroundColor: "$--primary", borderRadius: "$--radius-md" }`;
  }

  // G.4: 현재 테마 정보
  if (context.activeTheme) {
    prompt += `\n\n## 현재 활성 테마: ${context.activeTheme.name}`;
  }

  return prompt;
}
```

**EnhancedBuilderContext 확장 필드:**
| 필드 | 타입 | 출처 |
|------|------|------|
| `masterComponents` | `MasterComponentSummary[]` | elements store → componentIndex |
| `designVariables` | `DesignVariable[]` | themeStore → designVariables |
| `activeTheme` | `DesignTheme \| null` | themeStore → activeTheme |
| `appliedKitIds` | `string[]` | designKitStore → appliedKitIds |

### 6.6 스타일 변환 레이어

> 렌더링 전환(CanvasKit)과의 독립성을 보장하는 핵심 레이어.
> AI 도구는 CSS-like 형식을 출력하고, 이 레이어가 내부 스키마로 변환한다.

```typescript
// services/ai/styleAdapter.ts

/**
 * AI 도구가 출력하는 CSS-like 스타일을 내부 요소 스키마로 변환.
 *
 * 현재: CSS 속성을 그대로 props.style에 저장
 * CanvasKit 전환 후: fills/effects/stroke 구조화된 형식으로 변환
 *
 * 이 레이어가 존재함으로써 AI 전환과 렌더링 전환이 독립적으로 진행 가능.
 */
export function adaptStyles(
  cssStyles: Record<string, unknown>,
): Record<string, unknown> {
  // Phase 현재: 그대로 전달 (PixiJS 렌더러가 CSS 스타일 처리)
  return { style: cssStyles };

  // Phase 5 이후: 구조화된 형식으로 변환
  // return {
  //   fills: extractFills(cssStyles),
  //   effects: extractEffects(cssStyles),
  //   stroke: extractStroke(cssStyles),
  //   blendMode: cssStyles.mixBlendMode,
  // };
}

export function adaptPropsForElement(
  tag: string,
  props: Record<string, unknown>,
  styles: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...props,
    ...adaptStyles(styles),
  };
}
```

#### Phase 5+ 확장 (G.2 변수 참조 지원)

AI 도구가 `$--` 접두사 변수 참조를 직접 사용할 수 있도록 어댑터 확장:

```typescript
// Phase 5+: $-- 변수 참조를 AI가 스타일 값으로 사용
// AI 출력 예시: { backgroundColor: "$--primary", borderRadius: "$--radius-md" }

export function adaptStyles(
  cssStyles: Record<string, unknown>,
): Record<string, unknown> {
  // $-- 변수 참조가 포함된 스타일 키 추출
  const variableBindings: string[] = [];

  for (const [key, value] of Object.entries(cssStyles)) {
    if (typeof value === 'string' && value.startsWith('$--')) {
      variableBindings.push(value);
    }
  }

  return {
    style: cssStyles,            // $-- 참조는 그대로 유지
    variableBindings,            // useResolvedElement에서 resolve
  };
}
```

**변환 흐름:**
```
AI 도구 출력 → adaptStyles() → Element.props.style ($-- 유지)
                              → Element.variableBindings 자동 추출
                              → useResolvedElement → resolveElementVariables()
                              → 최종 렌더링 값
```

---

## 7. 렌더링 전환(WASM/CanvasKit)과의 영향 분석

> 참고: `docs/WASM.md` Phase 5-6

### 7.1 아키텍처 계층 관계

```
┌─────────────────────────────────────────────────┐
│  AI Layer (Groq Tool Calling + Agent Loop)       │ ← AI 전환 범위
│  ┌───────────────────────────────────────────┐   │
│  │  Tool Definitions                         │   │
│  │  (create_element, update_element, ...)     │   │
│  └──────────────┬────────────────────────────┘   │
└─────────────────┼────────────────────────────────┘
                  │  Element CRUD (Zustand Store)
                  │  ← ★ 접점: Element Data Model ★
┌─────────────────┼────────────────────────────────┐
│  Rendering Layer│                                 │ ← WASM 전환 범위
│  ┌──────────────▼────────────────────────────┐   │
│  │  CanvasKit renderSkia() / PixiJS render() │   │
│  └───────────────────────────────────────────┘   │
└─────────────────────────────────────────────────┘
```

AI는 **데이터 레이어**(요소 CRUD)를 조작하고, 렌더링은 **표현 레이어**(화면 출력)를 담당한다.
두 레이어의 다리는 **Element Data Model(Zustand store)** 이다.

### 7.2 영향 없음 (독립적)

| AI 전환 항목 | 이유 |
|-------------|------|
| Groq tool calling 아키텍처 | API 호출 패턴은 렌더링과 독립 |
| Agent loop 구현 | AI 내부 루프 |
| Conversation store 개선 | 채팅 상태 관리 |
| 대화 히스토리 전달 | 텍스트 데이터 |
| IntentParser fallback | 데이터 레이어 |
| AIPanel UI 개선 | React UI 영역 |
| 에이전트 제어 (AbortController) | 제어 로직 |

### 7.3 중간 영향 — Element 스키마 확장

Phase 5-6에서 렌더링 전환 시 요소의 스타일 모델이 확장된다:

| 현재 스키마 | CanvasKit 전환 후 | AI 도구 영향 |
|-----------|-----------------|------------|
| `styles.backgroundColor: "red"` | `fills: [{ type: "color", rgba: [1,0,0,1] }]` | 스타일 어댑터 업데이트 |
| CSS 문자열 값 | 6종 Fill Shader | 시스템 프롬프트 업데이트 |
| `styles.boxShadow` (문자열) | `effects: [{ type: "drop-shadow", ... }]` | 이펙트 도구 파라미터 변경 |
| 블렌드 모드 없음 | `blendMode: "multiply"` (18종) | 신규 속성 |
| Stroke 단순 | 구조화된 stroke 객체 | Stroke 도구 확장 |

**해결:** §6.6의 `styleAdapter.ts` 변환 레이어가 이 문제를 흡수한다.
AI 도구는 항상 CSS-like 형식을 출력하고, 렌더링 전환 시 변환 레이어만 업데이트하면 된다.

### 7.4 ~~낮은 영향~~ → ✅ 구현 완료 — AI 생성 시각 피드백

> **G.3 AI 시각 피드백 시스템이 CanvasKit 렌더 루프에 완전 통합됨** (2026-02-02)

Pencil의 렌더 루프에는 `renderGeneratingEffects()`가 존재한다 (§21.2):

```
render()
├── displayContentCanvas()          ← 디자인 노드 렌더링
├── renderGeneratingEffects()       ← AI 생성 이펙트 (블러+파티클)
├── renderFlashes()                 ← 시각 피드백 애니메이션
└── surface.flush()
```

~~이 기능은 **CanvasKit 렌더러 위에서 구현해야** 한다.~~
~~AI 전환 1단계에서는 React UI 수준 피드백만 구현하고, Phase 5-6 완료 후 캔버스 레벨 피드백을 추가한다.~~

#### Phase 5+ 변경사항 (G.3 AI 시각 피드백 반영)

G.3 AI 시각 피드백 시스템이 구현되어, CanvasKit 렌더 루프에 통합:

**구현 완료:**
- `aiVisualFeedback.ts` — 독립 Zustand 스토어 (generatingNodes, flashAnimations)
- `aiEffects.ts` — `renderGeneratingEffects()` (블러 + 회전 파티클), `renderFlashes()` (스트로크 + 스캔라인)
  - `buildNodeBoundsMap()`: 계층적 Skia 트리에서 부모 오프셋을 누적하여 절대 좌표 복원 (2026-02-02 수정)
- `SkiaOverlay.tsx` — Pencil 방식 2-pass(content/overlay 분리)에서 **overlay pass**로 AI 이펙트 렌더링

**렌더 루프 (Phase 5+):**
```
content pass (변경 시)
├── renderNode()                    ← 디자인 노드 → contentSurface 렌더링
└── contentSnapshot 캐시

present/overlay pass (매 프레임)
├── snapshot blit (camera-only: 아핀 변환)
├── renderGeneratingEffects()       ← AI 생성 중 (블러 + 파티클)
└── renderFlashes()                 ← AI 완료 후 (스트로크 + 스캔라인)
```

**AIPanel 연동:**
- 스트리밍 시작 전: `startGenerating([selectedElementId])`
- 완료: `completeGenerating(affectedIds)` → flash 전환
- 에러/취소: `cancelGenerating()`
- 개별 create/modify: `addFlashForNode(id, { scanLine: true })`

**이펙트 상세:**
| 이펙트 | 트리거 | 시각 표현 | 지속 |
|--------|--------|----------|------|
| Generating | AI 스트리밍 중 | 블러 오버레이 + 6개 파란 파티클 회전 (currentTime/2000) | 무기한 (AI 응답까지) |
| Flash | AI 작업 완료 | 스트로크 RRect + 스캔라인 (이즈-아웃 페이드) | 500ms (longHold: 2000ms) |

### 7.5 낮은 영향 — AI 컨텍스트 (스크린샷)

Pencil의 AI는 `get-screenshot`으로 뷰포트 캡처를 컨텍스트로 사용한다.

| 현재 | CanvasKit 전환 후 |
|------|-----------------|
| PixiJS `app.renderer.extract.canvas()` | CanvasKit `surface.makeImageSnapshot()` |

단, Groq의 llama 모델은 **이미지 입력을 지원하지 않으므로** 당장 불필요하다.
텍스트 기반 컨텍스트(요소 트리, 스타일 정보)가 우선이다.

### 7.6 영향 매트릭스

| 영향도 | AI 전환 항목 | 렌더링 영향 | 대응 전략 |
|--------|------------|-----------|----------|
| **없음** | Tool calling, Agent loop, Store, UI | 독립적 | 선행 착수 가능 |
| **중간** | AI 도구 스타일 출력 | 스키마 확장 시 변경 | `styleAdapter.ts` 변환 레이어 |
| **낮음** | AI 컨텍스트 (스크린샷) | Export API 변경 | 텍스트 컨텍스트 우선 |
| ~~낮음~~ **완료** | AI 생성 시각 피드백 | CanvasKit 기반 | ✅ G.3 구현 완료 |

### 7.7 결론

**렌더링 전환은 AI 전환에 블로킹 요소가 아니다.**
`styleAdapter.ts` 변환 레이어를 통해 두 작업이 완전히 분리된다.
AI 전환을 먼저 진행해도 무방하다.

---

## 8. 실행 로드맵

```
═══════════════════════════════════════════════════════════════
  AI 전환 (렌더링과 독립)
═══════════════════════════════════════════════════════════════

Phase A1: 기반 구조 구축 ✅ (2026-02-06 완료)
  └── types/integrations/ai.types.ts 재작성 (AgentEvent, ToolCall 타입)
  └── types/integrations/chat.types.ts 확장 (tool 메시지 타입)
  └── services/ai/tools/definitions.ts (도구 JSON Schema — 7개)
  └── services/ai/systemPrompt.ts (동적 시스템 프롬프트)
  └── services/ai/styleAdapter.ts (스타일 변환 레이어)

Phase A2: Agent 서비스 구현 ✅ (2026-02-06 완료)
  └── services/ai/GroqAgentService.ts (Tool Calling + Agent Loop + 429 지수 백오프)
  └── services/ai/tools/*.ts (7개 도구: CRUD 5개 + search + batch)
  └── builder/stores/conversation.ts 확장 (agent 상태, tool events)

Phase A3: UI 개선 ✅ (2026-02-06 완료)
  └── builder/panels/ai/AIPanel.tsx 재작성 (useAgentLoop hook 기반)
  └── builder/panels/ai/hooks/useAgentLoop.ts (G.3 피드백 연동)
  └── builder/panels/ai/components/ToolCallMessage.tsx
  └── builder/panels/ai/components/ToolResultMessage.tsx
  └── builder/panels/ai/components/AgentControls.tsx

Phase A4: 고급 기능 ✅ (2026-02-06 완료)
  └── batch_design 도구 구현 (최대 20개 작업, 실패 시 중단)
  └── search_elements 도구 구현 (tag/propName/propValue/styleProp 필터)
  └── Rate limit 대응 (429 지수 백오프, 3회 재시도)

Phase A5: 캔버스 통합 (Phase 5-6 이후)
  └── ✅ AI 생성 시각 피드백 (CanvasKit renderGeneratingEffects — G.3 완료)
  └── styleAdapter.ts → CanvasKit 스키마 변환 업데이트 (미착수)
  └── 스크린샷 기반 컨텍스트 (멀티모달 LLM 전환 시, 미착수)
  └── get_style_guide, get_variables, set_variables 도구 (미착수)

═══════════════════════════════════════════════════════════════
  렌더링 전환 (AI와 독립) — docs/WASM.md 참조
═══════════════════════════════════════════════════════════════

Phase 0: 벤치마크 → Phase 5: CanvasKit → Phase 6: 고급 렌더링

두 경로는 styleAdapter.ts 변환 레이어를 통해 독립적으로 진행 가능
═══════════════════════════════════════════════════════════════
```

---

## 9. 재구성 대상 파일 요약

| 파일 | 변경 내용 | Phase | 상태 |
|------|----------|-------|------|
| `types/integrations/ai.types.ts` | 확장: AgentEvent, ToolCall, ToolExecutor, AIAgentProvider 타입 | A1 | ✅ |
| `types/integrations/chat.types.ts` | 확장: tool role, ToolCallInfo, ConversationState agent 필드 | A1 | ✅ |
| `services/ai/tools/definitions.ts` | 신규: 7개 도구 JSON Schema 정의 | A1 | ✅ |
| `services/ai/systemPrompt.ts` | 신규: `buildSystemPrompt(context)` 동적 프롬프트 | A1 | ✅ |
| `services/ai/styleAdapter.ts` | 신규: CSS-like → 내부 스키마 변환 (adaptStyles, adaptPropsForElement) | A1 | ✅ |
| `services/ai/GroqAgentService.ts` | 신규: Tool Calling + Agent Loop + 429 지수 백오프 | A2 | ✅ |
| `services/ai/tools/createElement.ts` | 신규: create_element 도구 (G.3 flash 연동) | A2 | ✅ |
| `services/ai/tools/updateElement.ts` | 신규: update_element 도구 (G.3 flash 연동) | A2 | ✅ |
| `services/ai/tools/deleteElement.ts` | 신규: delete_element 도구 (body 보호) | A2 | ✅ |
| `services/ai/tools/getEditorState.ts` | 신규: get_editor_state 도구 (트리 구조, childrenMap) | A2 | ✅ |
| `services/ai/tools/getSelection.ts` | 신규: get_selection 도구 (elementsMap) | A2 | ✅ |
| `services/ai/tools/index.ts` | 신규: 도구 레지스트리 (7개 도구) | A2 | ✅ |
| `services/ai/tools/searchElements.ts` | 신규: search_elements 도구 (tag/prop/style 필터) | A4 | ✅ |
| `services/ai/tools/batchDesign.ts` | 신규: batch_design 도구 (일괄 create/update/delete) | A4 | ✅ |
| `services/ai/GroqService.ts` | deprecated: IntentParser fallback 전용으로 유지 | A2 | ✅ |
| `services/ai/IntentParser.ts` | 유지 (최후 fallback) | - | ✅ |
| `builder/stores/conversation.ts` | 확장: agent 상태, tool events, appendToLastMessage | A2 | ✅ |
| `builder/panels/ai/AIPanel.tsx` | 재작성: useAgentLoop hook 기반, Tool 피드백 UI | A3 | ✅ |
| `builder/panels/ai/hooks/useAgentLoop.ts` | 신규: Agent Loop React hook (G.3 연동) | A3 | ✅ |
| `builder/panels/ai/components/ToolCallMessage.tsx` | 신규: 도구 호출 상태 표시 | A3 | ✅ |
| `builder/panels/ai/components/ToolResultMessage.tsx` | 신규: 도구 실행 결과 표시 | A3 | ✅ |
| `builder/panels/ai/components/AgentControls.tsx` | 신규: 중단 버튼 + turn 카운터 | A3 | ✅ |

---

## 10. 참고 자료

- Pencil AI 분석: `docs/PENCIL_APP_ANALYSIS.md` §20, §24.11
- 렌더링 전환 계획: `docs/WASM.md` Phase 5-6
- Groq SDK 문서: https://console.groq.com/docs
- Groq Tool Use: https://console.groq.com/docs/tool-use
