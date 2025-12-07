/**
 * VariableBindingEditor - 변수 바인딩 에디터
 *
 * {{variable}} 문법을 지원하는 입력 필드
 * 자동완성 및 유효성 검사 제공
 *
 * Phase 4: Events Panel 재설계
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  TextField,
  Input,
  Label,
  Popover,
  ListBox,
  ListBoxItem,
} from 'react-aria-components';
import { Variable, AlertCircle, CheckCircle, ChevronRight } from 'lucide-react';
import {
  parseVariables,
  getPathPrefix,
  getCurrentInput,
  type VariableBinding,
  type ParseError,
  type VariableType,
} from '../../../events/utils/variableParser';
import { iconProps } from '../../../../utils/ui/uiConstants';

/**
 * 자동완성 제안 항목
 */
interface SuggestionItem {
  /** 경로 (예: "user.name") */
  path: string;
  /** 표시 레이블 */
  label: string;
  /** 설명 */
  description?: string;
  /** 타입 힌트 */
  type: VariableType | 'property';
  /** 하위 속성 존재 여부 */
  hasChildren?: boolean;
}

/**
 * 스키마 정의 (자동완성용)
 */
export interface VariableSchema {
  /** 상태 스키마 */
  state?: Record<string, SchemaNode>;
  /** 이벤트 페이로드 스키마 */
  event?: Record<string, SchemaNode>;
  /** DataTable 스키마 */
  dataset?: Record<string, SchemaNode>;
  /** API 응답 스키마 */
  response?: Record<string, SchemaNode>;
  /** 요소 참조 스키마 */
  element?: Record<string, SchemaNode>;
  /** 변수 스키마 */
  variable?: Record<string, SchemaNode>;
}

/**
 * 스키마 노드
 */
export interface SchemaNode {
  /** 타입 */
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  /** 설명 */
  description?: string;
  /** 자식 속성 (object인 경우) */
  properties?: Record<string, SchemaNode>;
  /** 배열 아이템 타입 (array인 경우) */
  items?: SchemaNode;
}

interface VariableBindingEditorProps {
  /** 현재 값 */
  value: string;
  /** 값 변경 핸들러 */
  onChange: (value: string) => void;
  /** 라벨 */
  label?: string;
  /** placeholder */
  placeholder?: string;
  /** 자동완성 스키마 */
  schema?: VariableSchema;
  /** 단일 변수 모드 (전체가 {{...}}인 경우만 허용) */
  singleVariable?: boolean;
  /** 비활성화 여부 */
  isDisabled?: boolean;
  /** 에러 표시 */
  showErrors?: boolean;
}

// 기본 스키마 (공통 변수들)
const DEFAULT_SCHEMA: VariableSchema = {
  state: {
    isLoading: { type: 'boolean', description: '로딩 상태' },
    error: { type: 'string', description: '에러 메시지' },
    data: { type: 'any', description: '데이터' },
  },
  event: {
    target: {
      type: 'object',
      description: '이벤트 대상 요소',
      properties: {
        value: { type: 'string', description: '입력 값' },
        checked: { type: 'boolean', description: '체크 상태' },
        id: { type: 'string', description: '요소 ID' },
      },
    },
    key: { type: 'string', description: '키보드 키' },
    type: { type: 'string', description: '이벤트 타입' },
  },
  response: {
    data: { type: 'any', description: 'API 응답 데이터' },
    status: { type: 'number', description: 'HTTP 상태 코드' },
    headers: { type: 'object', description: '응답 헤더' },
  },
};

/**
 * 스키마에서 자동완성 제안 생성
 */
function getSuggestionsFromSchema(
  schema: VariableSchema,
  prefix: string,
  currentInput: string
): SuggestionItem[] {
  const suggestions: SuggestionItem[] = [];

  // 루트 레벨
  if (!prefix) {
    const rootTypes: Array<{ key: keyof VariableSchema; type: VariableType; label: string }> = [
      { key: 'state', type: 'state', label: 'State' },
      { key: 'event', type: 'event', label: 'Event' },
      { key: 'dataset', type: 'dataset', label: 'Dataset' },
      { key: 'response', type: 'response', label: 'Response' },
      { key: 'element', type: 'element', label: 'Element' },
      { key: 'variable', type: 'variable', label: 'Variable' },
    ];

    for (const { key, type, label } of rootTypes) {
      if (schema[key] && key.toLowerCase().startsWith(currentInput.toLowerCase())) {
        suggestions.push({
          path: key,
          label,
          type,
          hasChildren: true,
        });
      }
    }
    return suggestions;
  }

  // 중첩 레벨
  const parts = prefix.split('.');
  const rootKey = parts[0] as keyof VariableSchema;
  let currentSchema: Record<string, SchemaNode> | undefined = schema[rootKey];

  // 경로를 따라 내려가기
  for (let i = 1; i < parts.length && currentSchema; i++) {
    const part = parts[i];
    const node = currentSchema[part];
    if (node?.type === 'object' && node.properties) {
      currentSchema = node.properties;
    } else if (node?.type === 'array' && node.items?.properties) {
      currentSchema = node.items.properties;
    } else {
      currentSchema = undefined;
    }
  }

  if (!currentSchema) return suggestions;

  // 현재 레벨의 속성들 추가
  for (const [key, node] of Object.entries(currentSchema)) {
    if (key.toLowerCase().startsWith(currentInput.toLowerCase())) {
      suggestions.push({
        path: `${prefix}.${key}`,
        label: key,
        description: node.description,
        type: 'property',
        hasChildren: node.type === 'object' || node.type === 'array',
      });
    }
  }

  return suggestions;
}

/**
 * 변수 바인딩 에디터 컴포넌트
 *
 * @example
 * <VariableBindingEditor
 *   value={config.targetId}
 *   onChange={(value) => updateConfig({ targetId: value })}
 *   label="Target"
 *   placeholder="{{element.id}} or static value"
 *   schema={projectSchema}
 * />
 */
export function VariableBindingEditor({
  value,
  onChange,
  label,
  placeholder = '{{variable}} or static value',
  schema = DEFAULT_SCHEMA,
  singleVariable = false,
  isDisabled = false,
  showErrors = true,
}: VariableBindingEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // 파싱 결과
  const parseResult = useMemo(() => parseVariables(value), [value]);

  // 현재 커서 위치의 변수 바인딩 찾기
  const currentBinding = useMemo(() => {
    return parseResult.bindings.find(
      (b) => cursorPosition >= b.start && cursorPosition <= b.end
    );
  }, [parseResult.bindings, cursorPosition]);

  // 자동완성 제안
  const suggestions = useMemo(() => {
    if (!currentBinding) return [];

    const path = currentBinding.path;
    const prefix = getPathPrefix(path);
    const currentInput = getCurrentInput(path);

    return getSuggestionsFromSchema(schema, prefix, currentInput);
  }, [currentBinding, schema]);

  // 커서 위치 추적
  const handleSelectionChange = useCallback(() => {
    if (inputRef.current) {
      setCursorPosition(inputRef.current.selectionStart || 0);
    }
  }, []);

  // 입력 변경
  const handleInputChange = (newValue: string) => {
    onChange(newValue);

    // {{ 입력 시 자동완성 열기
    if (newValue.endsWith('{{')) {
      setIsOpen(true);
    }
  };

  // 자동완성 선택
  const handleSuggestionSelect = (suggestion: SuggestionItem) => {
    if (!currentBinding || !inputRef.current) return;

    // 현재 바인딩의 경로를 새 경로로 교체
    const newPath = suggestion.hasChildren ? `${suggestion.path}.` : suggestion.path;
    const newValue =
      value.slice(0, currentBinding.start) +
      `{{${newPath}}}` +
      value.slice(currentBinding.end);

    onChange(newValue);

    // 커서 위치 조정
    const newCursorPos = currentBinding.start + newPath.length + 2; // +2 for {{
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
        inputRef.current.focus();
      }
    }, 0);

    // 하위 속성이 있으면 자동완성 유지
    if (!suggestion.hasChildren) {
      setIsOpen(false);
    }
  };

  // 키보드 입력 시 자동완성 토글
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (e.key === '{' && e.target === inputRef.current) {
        // 두 번째 { 입력 시 열기
        const input = inputRef.current;
        if (input && input.value[input.selectionStart! - 1] === '{') {
          setIsOpen(true);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const hasErrors = parseResult.errors.length > 0;
  const hasBindings = parseResult.bindings.length > 0;

  return (
    <div className="variable-binding-editor">
      <TextField
        value={value}
        onChange={handleInputChange}
        isDisabled={isDisabled}
      >
        {label && <Label className="field-label">{label}</Label>}

        <div className="variable-input-wrapper">
          <Variable
            size={14}
            className={`variable-icon ${hasBindings ? 'has-bindings' : ''}`}
          />
          <Input
            ref={inputRef}
            className={`variable-input ${hasErrors ? 'has-errors' : ''}`}
            placeholder={placeholder}
            onSelect={handleSelectionChange}
            onClick={handleSelectionChange}
            onKeyUp={handleSelectionChange}
          />

          {/* 상태 아이콘 */}
          {showErrors && hasErrors && (
            <AlertCircle
              size={14}
              className="variable-status-icon error"
              aria-label="Binding errors detected"
            />
          )}
          {!hasErrors && hasBindings && (
            <CheckCircle
              size={14}
              className="variable-status-icon valid"
              aria-label="Valid bindings"
            />
          )}
        </div>
      </TextField>

      {/* 자동완성 팝오버 */}
      {isOpen && suggestions.length > 0 && (
        <Popover
          isOpen={isOpen}
          onOpenChange={setIsOpen}
          className="variable-suggestions-popover"
        >
          <ListBox
            className="variable-suggestions-list"
            aria-label="Variable suggestions"
            onAction={(key) => {
              const suggestion = suggestions.find((s) => s.path === key);
              if (suggestion) handleSuggestionSelect(suggestion);
            }}
          >
            {suggestions.map((suggestion) => (
              <ListBoxItem
                key={suggestion.path}
                id={suggestion.path}
                className="variable-suggestion-item"
                textValue={suggestion.label}
              >
                <span className="suggestion-label">{suggestion.label}</span>
                {suggestion.description && (
                  <span className="suggestion-description">
                    {suggestion.description}
                  </span>
                )}
                {suggestion.hasChildren && (
                  <ChevronRight size={12} className="suggestion-arrow" />
                )}
              </ListBoxItem>
            ))}
          </ListBox>
        </Popover>
      )}

      {/* 에러 메시지 */}
      {showErrors && hasErrors && (
        <div className="variable-errors">
          {parseResult.errors.map((error, index) => (
            <div key={index} className="variable-error">
              <AlertCircle size={12} />
              <span>{error.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* 바인딩 미리보기 */}
      {hasBindings && !hasErrors && (
        <div className="variable-bindings-preview">
          {parseResult.bindings.map((binding, index) => (
            <span
              key={index}
              className={`binding-tag binding-${binding.type}`}
              title={binding.path}
            >
              {binding.type}: {binding.path}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
