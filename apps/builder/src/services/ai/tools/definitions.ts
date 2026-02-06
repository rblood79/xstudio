/**
 * AI Tool Definitions
 *
 * Groq Tool Calling용 JSON Schema 정의
 * unified.types.ts의 getDefaultProps() 키 목록과 동기화
 */

import type Groq from 'groq-sdk';

type ChatCompletionTool = Groq.Chat.Completions.ChatCompletionTool;

/**
 * AI가 생성할 수 있는 컴포넌트 태그 목록
 * getDefaultProps() (unified.types.ts:1023)의 키와 동기화
 */
const COMPONENT_TAGS = [
  'Button', 'TextField', 'Checkbox', 'Radio',
  'ToggleButton', 'ToggleButtonGroup',
  'CheckboxGroup', 'RadioGroup',
  'Select', 'ComboBox', 'Slider',
  'Tabs', 'Panel', 'Tree',
  'Calendar', 'DatePicker', 'DateRangePicker',
  'Switch', 'Table', 'Card',
  'TagGroup', 'ListBox', 'GridList',
  'Text', 'Div', 'Section', 'Nav',
] as const;

export const toolDefinitions: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'create_element',
      description: '캔버스에 새 요소를 생성합니다. 버튼, 입력 필드, 테이블 등 다양한 UI 컴포넌트를 만들 수 있습니다.',
      parameters: {
        type: 'object',
        properties: {
          tag: {
            type: 'string',
            description: '생성할 컴포넌트 타입',
            enum: COMPONENT_TAGS,
          },
          parentId: {
            type: 'string',
            description: '부모 요소 ID. 없으면 선택된 요소 또는 body에 추가.',
          },
          props: {
            type: 'object',
            description: '컴포넌트 속성 (children, variant, placeholder, label 등)',
          },
          styles: {
            type: 'object',
            description: 'CSS 인라인 스타일 (backgroundColor, padding, fontSize, width, height 등). camelCase 사용.',
          },
          dataBinding: {
            type: 'object',
            description: '데이터 바인딩 설정 (Mock API 연동)',
            properties: {
              endpoint: {
                type: 'string',
                description: 'Mock API 엔드포인트 (/countries, /users, /products 등)',
              },
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
          props: {
            type: 'object',
            description: '변경할 컴포넌트 속성',
          },
          styles: {
            type: 'object',
            description: '변경할 CSS 인라인 스타일. camelCase 사용.',
          },
        },
        required: ['elementId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_element',
      description: '요소를 삭제합니다. body 요소는 삭제할 수 없습니다.',
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
      description: '현재 에디터 상태를 조회합니다. 페이지 구조, 요소 트리, 선택 상태 등을 반환합니다.',
      parameters: {
        type: 'object',
        properties: {
          includeStyles: {
            type: 'boolean',
            description: '스타일 정보 포함 여부. false면 토큰 절약.',
          },
          maxDepth: {
            type: 'number',
            description: '트리 탐색 최대 깊이. 기본 5.',
          },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_selection',
      description: '현재 선택된 요소의 상세 정보를 조회합니다. 태그, 속성, 스타일, 부모/자식 관계를 반환합니다.',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
];
