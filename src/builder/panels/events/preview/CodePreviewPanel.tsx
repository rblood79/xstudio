/**
 * CodePreviewPanel - 이벤트 핸들러 코드 프리뷰
 *
 * 블록 기반 이벤트 설정을 JavaScript 코드로 변환하여 표시
 * Lazy 생성으로 성능 최적화
 *
 * Phase 5: Events Panel 재설계
 */

import { useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { Button } from 'react-aria-components';
import { Copy, Check, Code, ChevronDown, ChevronRight } from 'lucide-react';
import type { BlockEventHandler } from '../../../events/types/eventBlockTypes';
import { iconProps } from '../../../../utils/ui/uiConstants';

interface CodePreviewPanelProps {
  /** 이벤트 핸들러 목록 */
  handlers: BlockEventHandler[];
  /** 접힘 상태 */
  isCollapsed?: boolean;
  /** 접힘 토글 핸들러 */
  onToggleCollapse?: () => void;
}

/**
 * 핸들러를 JavaScript 코드로 변환
 */
function generateHandlerCode(handler: BlockEventHandler): string {
  const lines: string[] = [];
  const indent = '  ';

  // 이벤트 리스너 시작
  lines.push(`// ${handler.trigger.event} handler`);
  lines.push(`element.addEventListener('${handler.trigger.event.replace(/^on/, '').toLowerCase()}', async (event) => {`);

  // 조건 체크 (IF 블록)
  if (handler.conditions && handler.conditions.conditions.length > 0) {
    const conditionCode = generateConditionCode(handler.conditions, indent);
    lines.push(`${indent}// Condition check`);
    lines.push(`${indent}if (!(${conditionCode})) {`);
    lines.push(`${indent}${indent}return;`);
    lines.push(`${indent}}`);
    lines.push('');
  }

  // THEN 액션들
  if (handler.thenActions.length > 0) {
    lines.push(`${indent}// Actions`);
    lines.push(`${indent}try {`);

    for (const action of handler.thenActions) {
      if (action.enabled === false) {
        lines.push(`${indent}${indent}// [DISABLED] ${action.type}`);
        continue;
      }

      const actionCode = generateActionCode(action, indent + indent);
      if (action.delay) {
        lines.push(`${indent}${indent}await delay(${action.delay});`);
      }
      if (action.condition) {
        lines.push(`${indent}${indent}if (${action.condition}) {`);
        lines.push(`${indent}${indent}${indent}${actionCode}`);
        lines.push(`${indent}${indent}}`);
      } else {
        lines.push(`${indent}${indent}${actionCode}`);
      }
    }

    lines.push(`${indent}} catch (error) {`);
    lines.push(`${indent}${indent}console.error('Action failed:', error);`);

    // ELSE 액션들
    if (handler.elseActions && handler.elseActions.length > 0) {
      lines.push(`${indent}${indent}// Fallback actions`);
      for (const action of handler.elseActions) {
        if (action.enabled === false) continue;
        const actionCode = generateActionCode(action, indent + indent);
        lines.push(`${indent}${indent}${actionCode}`);
      }
    }

    lines.push(`${indent}}`);
  }

  lines.push('});');

  return lines.join('\n');
}

/**
 * 조건 그룹을 코드로 변환
 */
function generateConditionCode(
  group: BlockEventHandler['conditions'],
  indent: string
): string {
  if (!group || group.conditions.length === 0) return 'true';

  const operator = group.operator === 'AND' ? ' && ' : ' || ';
  const conditions = group.conditions.map((cond) => {
    const left = formatOperand(cond.left);
    const right = formatOperand(cond.right);

    switch (cond.operator) {
      case 'equals':
        return `${left} === ${right}`;
      case 'not_equals':
        return `${left} !== ${right}`;
      case 'greater_than':
        return `${left} > ${right}`;
      case 'less_than':
        return `${left} < ${right}`;
      case 'greater_than_or_equals':
        return `${left} >= ${right}`;
      case 'less_than_or_equals':
        return `${left} <= ${right}`;
      case 'contains':
        return `${left}.includes(${right})`;
      case 'not_contains':
        return `!${left}.includes(${right})`;
      case 'starts_with':
        return `${left}.startsWith(${right})`;
      case 'ends_with':
        return `${left}.endsWith(${right})`;
      case 'is_empty':
        return `!${left} || ${left}.length === 0`;
      case 'is_not_empty':
        return `${left} && ${left}.length > 0`;
      case 'matches':
        return `new RegExp(${right}).test(${left})`;
      default:
        return `${left} === ${right}`;
    }
  });

  return conditions.join(operator);
}

/**
 * 피연산자 포맷
 */
function formatOperand(operand: { type: string; value: string }): string {
  switch (operand.type) {
    case 'element':
      return `getElement('${operand.value}')?.value`;
    case 'state':
      return `state.${operand.value}`;
    case 'event':
      return `event.${operand.value}`;
    case 'static':
      // 숫자인지 확인
      if (!isNaN(Number(operand.value))) {
        return operand.value;
      }
      // 불리언인지 확인
      if (operand.value === 'true' || operand.value === 'false') {
        return operand.value;
      }
      return `'${operand.value}'`;
    default:
      return `'${operand.value}'`;
  }
}

/**
 * 액션을 코드로 변환
 */
function generateActionCode(
  action: BlockEventHandler['thenActions'][0],
  indent: string
): string {
  const config = action.config as Record<string, unknown>;

  switch (action.type) {
    case 'navigate':
      return `await navigate('${config.path || '/'}');`;

    case 'scrollTo':
      return `await scrollTo('${config.elementId}', { position: '${config.position || 'top'}', smooth: ${config.smooth ?? true} });`;

    case 'setState':
    case 'updateState':
      return `setState('${config.storePath}', ${JSON.stringify(config.value)});`;

    case 'apiCall':
      return `await apiCall('${config.endpoint}', { method: '${config.method || 'GET'}' });`;

    case 'showModal':
      return `showModal('${config.modalId}');`;

    case 'hideModal':
      return `hideModal('${config.modalId || ''}');`;

    case 'showToast':
      return `showToast('${config.message}', { variant: '${config.variant || 'info'}' });`;

    case 'toggleVisibility':
      return `toggleVisibility('${config.elementId}');`;

    case 'validateForm':
      return `await validateForm('${config.formId}');`;

    case 'resetForm':
      return `resetForm('${config.formId}');`;

    case 'submitForm':
      return `await submitForm('${config.formId}');`;

    case 'copyToClipboard':
      return `await copyToClipboard('${config.text}');`;

    case 'customFunction':
      return `// Custom function\n${indent}${config.code || '// No code provided'}`;

    case 'loadDataTable':
      return `await loadDataTable('${config.dataTableName}', { forceRefresh: ${config.forceRefresh ?? false} });`;

    case 'syncComponent':
      return `await syncComponent('${config.sourceId}', '${config.targetId}', { mode: '${config.syncMode || 'replace'}' });`;

    case 'saveToDataTable':
      return `await saveToDataTable('${config.dataTableName}', ${config.source}, { mode: '${config.saveMode || 'replace'}' });`;

    default:
      return `// ${action.type}: ${JSON.stringify(config)}`;
  }
}

/**
 * 코드 프리뷰 패널 컴포넌트
 *
 * @example
 * <CodePreviewPanel
 *   handlers={eventHandlers}
 *   isCollapsed={showCodePreview}
 *   onToggleCollapse={() => setShowCodePreview(!showCodePreview)}
 * />
 */
export function CodePreviewPanel({
  handlers,
  isCollapsed = true,
  onToggleCollapse,
}: CodePreviewPanelProps) {
  const [copied, setCopied] = useState(false);

  // Lazy 코드 생성 (성능 최적화)
  const generatedCode = useMemo(() => {
    if (isCollapsed) return ''; // 접힌 상태에서는 생성하지 않음

    if (handlers.length === 0) {
      return '// No event handlers configured';
    }

    const helperFunctions = `// Helper functions
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const getElement = (id) => document.querySelector(id.startsWith('#') ? id : \`[data-element-id="\${id}"]\`);

`;

    const handlerCodes = handlers.map(generateHandlerCode).join('\n\n');

    return helperFunctions + handlerCodes;
  }, [handlers, isCollapsed]);

  // 클립보드 복사
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  }, [generatedCode]);

  return (
    <div className="code-preview-panel">
      {/* Header */}
      <div className="code-preview-header">
        <Button
          className="code-preview-toggle"
          onPress={onToggleCollapse}
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? (
            <ChevronRight size={14} color={iconProps.color} />
          ) : (
            <ChevronDown size={14} color={iconProps.color} />
          )}
          <Code size={14} color={iconProps.color} />
          <span>Code Preview</span>
        </Button>

        {!isCollapsed && (
          <Button
            className="iconButton"
            onPress={handleCopy}
            aria-label={copied ? 'Copied!' : 'Copy code'}
          >
            {copied ? (
              <Check size={14} color="var(--color-green-500)" />
            ) : (
              <Copy size={14} color={iconProps.color} />
            )}
          </Button>
        )}
      </div>

      {/* Code Content */}
      {!isCollapsed && (
        <div className="code-preview-content">
          <pre className="code-preview-code">
            <code>{generatedCode}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
