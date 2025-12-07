/**
 * Binding Validator - 변수 바인딩 검증
 *
 * 변수 경로가 스키마에 존재하는지 확인하고
 * 인라인 경고 메시지 제공
 *
 * Phase 4: Events Panel 재설계
 */

import type { VariableSchema, SchemaNode } from '../../panels/events/editors/VariableBindingEditor';
import {
  parseVariables,
  splitPath,
  type VariableBinding,
  type VariableType,
} from './variableParser';

/**
 * 검증 결과
 */
export interface ValidationResult {
  /** 전체 유효성 */
  isValid: boolean;
  /** 개별 바인딩 검증 결과 */
  bindings: BindingValidation[];
  /** 경고 메시지 목록 */
  warnings: ValidationWarning[];
  /** 에러 메시지 목록 */
  errors: ValidationError[];
}

/**
 * 개별 바인딩 검증 결과
 */
export interface BindingValidation {
  /** 바인딩 정보 */
  binding: VariableBinding;
  /** 유효성 */
  isValid: boolean;
  /** 해결된 타입 (스키마에서 찾은 경우) */
  resolvedType?: string;
  /** 경고 */
  warning?: string;
  /** 에러 */
  error?: string;
}

/**
 * 경고 메시지
 */
export interface ValidationWarning {
  /** 경고 메시지 */
  message: string;
  /** 관련 바인딩 경로 */
  path: string;
  /** 경고 타입 */
  type: 'unknown_root' | 'unknown_property' | 'type_mismatch' | 'deprecated';
  /** 제안 (자동 수정용) */
  suggestion?: string;
}

/**
 * 에러 메시지
 */
export interface ValidationError {
  /** 에러 메시지 */
  message: string;
  /** 관련 바인딩 경로 */
  path: string;
  /** 에러 타입 */
  type: 'syntax' | 'invalid_path' | 'missing_required';
}

/**
 * 스키마에서 경로 해결
 */
function resolvePath(
  schema: VariableSchema,
  path: string
): { node: SchemaNode | undefined; type: VariableType | undefined } {
  const parts = splitPath(path);
  if (parts.length === 0) return { node: undefined, type: undefined };

  // 루트 타입 결정
  const root = parts[0].toLowerCase();
  let type: VariableType | undefined;
  let currentSchema: Record<string, SchemaNode> | undefined;

  switch (root) {
    case 'state':
      type = 'state';
      currentSchema = schema.state;
      break;
    case 'event':
      type = 'event';
      currentSchema = schema.event;
      break;
    case 'dataset':
    case 'data':
      type = 'dataset';
      currentSchema = schema.dataset;
      break;
    case 'response':
    case 'result':
      type = 'response';
      currentSchema = schema.response;
      break;
    case 'element':
    case 'el':
      type = 'element';
      currentSchema = schema.element;
      break;
    case 'variable':
    case 'var':
      type = 'variable';
      currentSchema = schema.variable;
      break;
    default:
      return { node: undefined, type: undefined };
  }

  if (!currentSchema) return { node: undefined, type };

  // 경로 따라가기
  let node: SchemaNode | undefined;
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];

    // 배열 인덱스인 경우
    if (/^\d+$/.test(part)) {
      if (node?.type === 'array' && node.items) {
        node = node.items;
        if (node.type === 'object' && node.properties) {
          currentSchema = node.properties;
        }
      }
      continue;
    }

    // 첫 번째 속성 접근
    if (i === 1) {
      node = currentSchema[part];
    } else if (currentSchema) {
      node = currentSchema[part];
    }

    if (!node) return { node: undefined, type };

    // 객체인 경우 다음 레벨로
    if (node.type === 'object' && node.properties) {
      currentSchema = node.properties;
    } else if (node.type === 'array' && node.items?.properties) {
      // 배열의 아이템이 객체인 경우
      currentSchema = node.items.properties;
    } else {
      currentSchema = undefined;
    }
  }

  return { node, type };
}

/**
 * 변수 바인딩 검증
 *
 * @example
 * const result = validateBindings(
 *   "Hello, {{user.name}}!",
 *   schema
 * );
 *
 * if (!result.isValid) {
 *   console.log(result.warnings);
 * }
 */
export function validateBindings(
  template: string,
  schema: VariableSchema
): ValidationResult {
  const parseResult = parseVariables(template);
  const bindings: BindingValidation[] = [];
  const warnings: ValidationWarning[] = [];
  const errors: ValidationError[] = [];

  // 파싱 에러 처리
  for (const parseError of parseResult.errors) {
    errors.push({
      message: parseError.message,
      path: '',
      type: parseError.type === 'syntax' ? 'syntax' : 'invalid_path',
    });
  }

  // 각 바인딩 검증
  for (const binding of parseResult.bindings) {
    const { node, type } = resolvePath(schema, binding.path);

    const validation: BindingValidation = {
      binding,
      isValid: true,
    };

    // 루트 타입 확인
    if (!type) {
      validation.isValid = false;
      validation.warning = `Unknown variable root: ${splitPath(binding.path)[0]}`;
      warnings.push({
        message: validation.warning,
        path: binding.path,
        type: 'unknown_root',
        suggestion: 'Use state, event, dataset, response, element, or variable as root',
      });
    }
    // 속성 존재 확인
    else if (!node && splitPath(binding.path).length > 1) {
      validation.warning = `Property not found in schema: ${binding.path}`;
      warnings.push({
        message: validation.warning,
        path: binding.path,
        type: 'unknown_property',
      });
    }
    // 타입 정보 추가
    else if (node) {
      validation.resolvedType = node.type;
    }

    bindings.push(validation);
  }

  return {
    isValid: errors.length === 0 && bindings.every((b) => b.isValid),
    bindings,
    warnings,
    errors,
  };
}

/**
 * 실시간 유효성 검사 (입력 중)
 *
 * 성능을 위해 간단한 검사만 수행
 */
export function quickValidate(template: string): {
  hasBindings: boolean;
  hasErrors: boolean;
  errorCount: number;
} {
  const parseResult = parseVariables(template);

  return {
    hasBindings: parseResult.bindings.length > 0,
    hasErrors: parseResult.errors.length > 0,
    errorCount: parseResult.errors.length,
  };
}

/**
 * 자동 수정 제안 생성
 */
export function getSuggestions(
  path: string,
  schema: VariableSchema
): string[] {
  const parts = splitPath(path);
  if (parts.length === 0) return [];

  const suggestions: string[] = [];

  // 루트 레벨 제안
  if (parts.length === 1) {
    const roots = ['state', 'event', 'dataset', 'response', 'element', 'variable'];
    const input = parts[0].toLowerCase();

    for (const root of roots) {
      if (root.startsWith(input) || levenshteinDistance(input, root) <= 2) {
        suggestions.push(root);
      }
    }
  }
  // 속성 레벨 제안
  else {
    const { node, type } = resolvePath(schema, parts.slice(0, -1).join('.'));
    const input = parts[parts.length - 1].toLowerCase();

    if (node?.type === 'object' && node.properties) {
      for (const prop of Object.keys(node.properties)) {
        if (prop.toLowerCase().startsWith(input) || levenshteinDistance(input, prop.toLowerCase()) <= 2) {
          suggestions.push(parts.slice(0, -1).concat(prop).join('.'));
        }
      }
    }
  }

  return suggestions;
}

/**
 * Levenshtein 거리 계산 (유사 문자열 찾기용)
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}
