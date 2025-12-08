/**
 * Variable Parser - {{variable}} 문법 파서
 *
 * 템플릿 문자열에서 변수 바인딩을 추출하고 평가
 * Phase 4: Events Panel 재설계
 */

/**
 * 변수 바인딩 정보
 */
export interface VariableBinding {
  /** 원본 표현식 (예: "{{user.name}}") */
  raw: string;
  /** 변수 경로 (예: "user.name") */
  path: string;
  /** 시작 인덱스 */
  start: number;
  /** 끝 인덱스 */
  end: number;
  /** 변수 타입 힌트 */
  type?: VariableType;
}

/**
 * 변수 타입
 */
export type VariableType =
  | 'state'      // 글로벌 상태 (state.xxx)
  | 'event'      // 이벤트 페이로드 (event.xxx)
  | 'datatable'  // DataTable 데이터 (datatable.xxx)
  | 'response'   // API 응답 (response.xxx)
  | 'element'    // 요소 참조 (element.xxx)
  | 'variable'   // 변수 (variable.xxx)
  | 'unknown';

/**
 * 파싱 결과
 */
export interface ParseResult {
  /** 추출된 변수 바인딩 목록 */
  bindings: VariableBinding[];
  /** 파싱 에러 */
  errors: ParseError[];
  /** 정적 텍스트 부분 */
  staticParts: string[];
  /** 유효한 템플릿인지 여부 */
  isValid: boolean;
}

/**
 * 파싱 에러
 */
export interface ParseError {
  /** 에러 메시지 */
  message: string;
  /** 에러 위치 */
  position: number;
  /** 에러 타입 */
  type: 'syntax' | 'unclosed' | 'empty' | 'invalid_path';
}

// 변수 바인딩 정규식: {{...}}
const BINDING_REGEX = /\{\{([^{}]+)\}\}/g;
// 닫히지 않은 바인딩 감지
const UNCLOSED_OPEN = /\{\{(?![^{}]*\}\})/g;
const UNCLOSED_CLOSE = /(?<!\{\{[^{}]*)\}\}/g;

/**
 * 변수 경로에서 타입 추론
 */
function inferVariableType(path: string): VariableType {
  const prefix = path.split('.')[0]?.toLowerCase();

  switch (prefix) {
    case 'state':
      return 'state';
    case 'event':
      return 'event';
    case 'datatable':
    case 'data':
      return 'datatable';
    case 'response':
    case 'result':
      return 'response';
    case 'element':
    case 'el':
      return 'element';
    case 'variable':
    case 'var':
      return 'variable';
    default:
      return 'unknown';
  }
}

/**
 * 경로 유효성 검사
 */
function isValidPath(path: string): boolean {
  // 빈 경로
  if (!path.trim()) return false;

  // 유효한 JavaScript 속성 경로인지 확인
  // 허용: a.b.c, a[0], a['key'], a["key"], a.b[0].c
  const validPathRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*(\.[a-zA-Z_$][a-zA-Z0-9_$]*|\[\d+\]|\[['"][^'"]+['"]\])*$/;
  return validPathRegex.test(path.trim());
}

/**
 * 템플릿 문자열에서 변수 바인딩 추출
 *
 * @example
 * parseVariables("Hello, {{user.name}}!")
 * // Returns: {
 * //   bindings: [{ raw: "{{user.name}}", path: "user.name", start: 7, end: 21 }],
 * //   errors: [],
 * //   staticParts: ["Hello, ", "!"],
 * //   isValid: true
 * // }
 */
export function parseVariables(template: string): ParseResult {
  const bindings: VariableBinding[] = [];
  const errors: ParseError[] = [];
  const staticParts: string[] = [];

  // 닫히지 않은 바인딩 감지
  let match: RegExpExecArray | null;

  const unclosedOpenRegex = new RegExp(UNCLOSED_OPEN.source, 'g');
  while ((match = unclosedOpenRegex.exec(template)) !== null) {
    errors.push({
      message: 'Unclosed variable binding: missing }}',
      position: match.index,
      type: 'unclosed',
    });
  }

  const unclosedCloseRegex = new RegExp(UNCLOSED_CLOSE.source, 'g');
  while ((match = unclosedCloseRegex.exec(template)) !== null) {
    errors.push({
      message: 'Unexpected }}: missing {{',
      position: match.index,
      type: 'unclosed',
    });
  }

  // 변수 바인딩 추출
  let lastIndex = 0;
  const bindingRegex = new RegExp(BINDING_REGEX.source, 'g');

  while ((match = bindingRegex.exec(template)) !== null) {
    const [raw, path] = match;
    const start = match.index;
    const end = start + raw.length;

    // 정적 텍스트 추가
    if (start > lastIndex) {
      staticParts.push(template.slice(lastIndex, start));
    }
    lastIndex = end;

    // 경로 유효성 검사
    const trimmedPath = path.trim();
    if (!trimmedPath) {
      errors.push({
        message: 'Empty variable binding',
        position: start,
        type: 'empty',
      });
      continue;
    }

    if (!isValidPath(trimmedPath)) {
      errors.push({
        message: `Invalid variable path: ${trimmedPath}`,
        position: start,
        type: 'invalid_path',
      });
    }

    bindings.push({
      raw,
      path: trimmedPath,
      start,
      end,
      type: inferVariableType(trimmedPath),
    });
  }

  // 마지막 정적 텍스트
  if (lastIndex < template.length) {
    staticParts.push(template.slice(lastIndex));
  }

  return {
    bindings,
    errors,
    staticParts,
    isValid: errors.length === 0,
  };
}

/**
 * 변수 경로에서 값 추출
 *
 * @example
 * getValueByPath({ user: { name: "John" } }, "user.name")
 * // Returns: "John"
 */
export function getValueByPath(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;

  const parts = path.split(/\.|\[['"]?|['"]?\]/).filter(Boolean);
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * 템플릿 문자열에서 변수를 값으로 치환
 *
 * @example
 * interpolate("Hello, {{user.name}}!", { user: { name: "John" } })
 * // Returns: "Hello, John!"
 */
export function interpolate(
  template: string,
  context: Record<string, unknown>
): string {
  const { bindings } = parseVariables(template);

  let result = template;
  // 뒤에서부터 치환 (인덱스 변화 방지)
  for (let i = bindings.length - 1; i >= 0; i--) {
    const binding = bindings[i];
    const value = getValueByPath(context, binding.path);
    const stringValue = value !== undefined ? String(value) : '';
    result = result.slice(0, binding.start) + stringValue + result.slice(binding.end);
  }

  return result;
}

/**
 * 변수 경로에서 루트 변수 이름 추출
 *
 * @example
 * getRootVariable("user.profile.name") // "user"
 * getRootVariable("state.items[0].id") // "state"
 */
export function getRootVariable(path: string): string {
  return path.split(/[.\[]/)[0];
}

/**
 * 변수 경로를 부분 경로 배열로 분해
 *
 * @example
 * splitPath("user.profile.name") // ["user", "profile", "name"]
 * splitPath("items[0].id") // ["items", "0", "id"]
 */
export function splitPath(path: string): string[] {
  return path.split(/\.|\[['"]?|['"]?\]/).filter(Boolean);
}

/**
 * 자동완성을 위한 경로 접두사 추출
 *
 * @example
 * getPathPrefix("user.pro") // "user"
 * getPathPrefix("state.items[0].na") // "state.items[0]"
 */
export function getPathPrefix(path: string): string {
  const lastDotIndex = path.lastIndexOf('.');
  const lastBracketIndex = path.lastIndexOf('[');
  const lastIndex = Math.max(lastDotIndex, lastBracketIndex);

  if (lastIndex === -1) return '';
  return path.slice(0, lastIndex);
}

/**
 * 자동완성을 위한 현재 입력 중인 부분 추출
 *
 * @example
 * getCurrentInput("user.pro") // "pro"
 * getCurrentInput("state.items[0].na") // "na"
 */
export function getCurrentInput(path: string): string {
  const lastDotIndex = path.lastIndexOf('.');
  const lastBracketIndex = path.lastIndexOf('[');
  const lastIndex = Math.max(lastDotIndex, lastBracketIndex);

  if (lastIndex === -1) return path;
  return path.slice(lastIndex + 1).replace(/['"\]]/g, '');
}
