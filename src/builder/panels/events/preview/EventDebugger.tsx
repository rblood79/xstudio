/**
 * EventDebugger - 이벤트 핸들러 디버거
 *
 * 인라인 테스트 실행, 모의 이벤트 발생, 단계별 실행 결과 표시
 * Phase 5: Events Panel 재설계
 */

import { useState, useCallback, useMemo } from 'react';
import { Button, Label } from 'react-aria-components';
import {
  Play,
  SkipForward,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';
import { iconEditProps, iconSmall } from '../../../../utils/ui/uiConstants';
import type { BlockEventHandler } from '../../../events/types/eventBlockTypes';

/**
 * 실행 상태
 */
type ExecutionStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';

/**
 * 단계별 실행 결과
 */
interface StepResult {
  /** 단계 ID */
  id: string;
  /** 단계 타입 */
  type: 'trigger' | 'condition' | 'action';
  /** 단계 이름 */
  name: string;
  /** 실행 상태 */
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  /** 입력 값 */
  input?: unknown;
  /** 출력 값 */
  output?: unknown;
  /** 에러 메시지 */
  error?: string;
  /** 실행 시간 (ms) */
  duration?: number;
  /** 시작 시간 */
  startTime?: number;
}

/**
 * 실행 로그 항목
 */
interface ExecutionLog {
  /** 로그 ID */
  id: string;
  /** 타임스탬프 */
  timestamp: number;
  /** 핸들러 ID */
  handlerId: string;
  /** 상태 */
  status: 'success' | 'error' | 'warning';
  /** 메시지 */
  message: string;
  /** 실행 시간 */
  duration: number;
  /** 단계별 결과 */
  steps: StepResult[];
}

interface EventDebuggerProps {
  /** 디버깅할 핸들러 */
  handler: BlockEventHandler;
  /** 모의 상태 데이터 */
  mockState?: Record<string, unknown>;
  /** 모의 DataTable 데이터 */
  mockDataTable?: Record<string, unknown[]>;
  /** 디버그 모드 */
  debugMode?: boolean;
}

/**
 * 조건 평가 (시뮬레이션)
 */
function evaluateCondition(
  condition: BlockEventHandler['conditions'],
  context: { event: unknown; state: unknown }
): { result: boolean; evaluations: Array<{ condition: string; result: boolean }> } {
  if (!condition || condition.conditions.length === 0) {
    return { result: true, evaluations: [] };
  }

  const evaluations: Array<{ condition: string; result: boolean }> = [];
  const results: boolean[] = [];

  for (const cond of condition.conditions) {
    // 간단한 평가 시뮬레이션
    const leftValue = getValueFromOperand(cond.left, context);
    const rightValue = getValueFromOperand(cond.right, context);

    let result = false;
    switch (cond.operator) {
      case 'equals':
        result = leftValue === rightValue;
        break;
      case 'not_equals':
        result = leftValue !== rightValue;
        break;
      case 'greater_than':
        result = Number(leftValue) > Number(rightValue);
        break;
      case 'less_than':
        result = Number(leftValue) < Number(rightValue);
        break;
      case 'is_empty':
        result = !leftValue || (Array.isArray(leftValue) && leftValue.length === 0);
        break;
      case 'is_not_empty':
        result = Boolean(leftValue) && (!Array.isArray(leftValue) || leftValue.length > 0);
        break;
      default:
        result = leftValue === rightValue;
    }

    evaluations.push({
      condition: `${cond.left.value} ${cond.operator} ${cond.right.value}`,
      result,
    });
    results.push(result);
  }

  const finalResult = condition.operator === 'AND'
    ? results.every(Boolean)
    : results.some(Boolean);

  return { result: finalResult, evaluations };
}

/**
 * 피연산자에서 값 추출
 */
function getValueFromOperand(
  operand: { type: string; value: string },
  context: { event: unknown; state: unknown }
): unknown {
  switch (operand.type) {
    case 'event':
      return getNestedValue(context.event, operand.value);
    case 'state':
      return getNestedValue(context.state, operand.value);
    case 'static':
      // 타입 추론
      if (operand.value === 'true') return true;
      if (operand.value === 'false') return false;
      if (!isNaN(Number(operand.value))) return Number(operand.value);
      return operand.value;
    default:
      return operand.value;
  }
}

/**
 * 중첩 객체에서 값 추출
 */
function getNestedValue(obj: unknown, path: string): unknown {
  if (!obj || typeof obj !== 'object') return undefined;
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * 이벤트 디버거 컴포넌트
 *
 * @example
 * <EventDebugger
 *   handler={selectedHandler}
 *   mockState={{ isLoggedIn: true, user: { name: 'Test' } }}
 *   debugMode={true}
 * />
 */
export function EventDebugger({
  handler,
  mockState = {},
}: EventDebuggerProps) {
  const [status, setStatus] = useState<ExecutionStatus>('idle');
  const [steps, setSteps] = useState<StepResult[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [mockEventData, setMockEventData] = useState<string>('{\n  "target": {\n    "value": "test"\n  }\n}');
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());

  // 로그 추가 (runTest에서 사용하므로 먼저 선언)
  const addLog = useCallback((log: Omit<ExecutionLog, 'id' | 'timestamp'>) => {
    setLogs((prev) => [
      {
        ...log,
        id: `log-${Date.now()}`,
        timestamp: Date.now(),
      },
      ...prev.slice(0, 9), // 최근 10개만 유지
    ]);
  }, []);

  // 단계 목록 생성
  const allSteps = useMemo((): StepResult[] => {
    const result: StepResult[] = [];

    // Trigger 단계
    result.push({
      id: `${handler.id}-trigger`,
      type: 'trigger',
      name: `Trigger: ${handler.trigger.event}`,
      status: 'pending',
    });

    // Condition 단계 (있는 경우)
    if (handler.conditions && handler.conditions.conditions.length > 0) {
      result.push({
        id: `${handler.id}-condition`,
        type: 'condition',
        name: `Condition: ${handler.conditions.conditions.length} rule(s)`,
        status: 'pending',
      });
    }

    // Action 단계들
    for (const action of handler.thenActions) {
      result.push({
        id: action.id,
        type: 'action',
        name: `Action: ${action.type}`,
        status: action.enabled === false ? 'skipped' : 'pending',
      });
    }

    return result;
  }, [handler]);

  // 테스트 실행
  const runTest = useCallback(async () => {
    setStatus('running');
    setCurrentStepIndex(0);

    const startTime = Date.now();
    const newSteps = [...allSteps];

    try {
      // 모의 이벤트 파싱
      let mockEvent: unknown = {};
      try {
        mockEvent = JSON.parse(mockEventData);
      } catch {
        mockEvent = { target: { value: '' } };
      }

      const context = { event: mockEvent, state: mockState };

      // 1. Trigger 단계
      newSteps[0] = {
        ...newSteps[0],
        status: 'running',
        startTime: Date.now(),
        input: mockEvent,
      };
      setSteps([...newSteps]);

      await delay(300); // 시각적 피드백

      newSteps[0] = {
        ...newSteps[0],
        status: 'success',
        output: 'Event triggered',
        duration: Date.now() - newSteps[0].startTime!,
      };
      setSteps([...newSteps]);
      setCurrentStepIndex(1);

      // 2. Condition 단계 (있는 경우)
      let conditionStepIndex = -1;
      if (handler.conditions && handler.conditions.conditions.length > 0) {
        conditionStepIndex = 1;
        newSteps[conditionStepIndex] = {
          ...newSteps[conditionStepIndex],
          status: 'running',
          startTime: Date.now(),
          input: context,
        };
        setSteps([...newSteps]);

        await delay(300);

        const { result, evaluations } = evaluateCondition(handler.conditions, context);

        newSteps[conditionStepIndex] = {
          ...newSteps[conditionStepIndex],
          status: result ? 'success' : 'failed',
          output: { result, evaluations },
          duration: Date.now() - newSteps[conditionStepIndex].startTime!,
        };
        setSteps([...newSteps]);

        if (!result) {
          // 조건 실패 - 나머지 액션 스킵
          for (let i = conditionStepIndex + 1; i < newSteps.length; i++) {
            newSteps[i] = { ...newSteps[i], status: 'skipped' };
          }
          setSteps([...newSteps]);
          setStatus('completed');

          // 로그 추가
          addLog({
            handlerId: handler.id,
            status: 'warning',
            message: 'Condition not met - actions skipped',
            duration: Date.now() - startTime,
            steps: newSteps,
          });
          return;
        }
      }

      // 3. Action 단계들
      const actionStartIndex = conditionStepIndex >= 0 ? conditionStepIndex + 1 : 1;
      for (let i = actionStartIndex; i < newSteps.length; i++) {
        const step = newSteps[i];
        if (step.status === 'skipped') continue;

        setCurrentStepIndex(i);

        newSteps[i] = {
          ...newSteps[i],
          status: 'running',
          startTime: Date.now(),
        };
        setSteps([...newSteps]);

        await delay(200 + Math.random() * 300); // 시뮬레이션

        // 랜덤하게 성공/실패 (데모용)
        const success = Math.random() > 0.1;

        newSteps[i] = {
          ...newSteps[i],
          status: success ? 'success' : 'failed',
          output: success ? 'Action completed' : undefined,
          error: success ? undefined : 'Simulated error',
          duration: Date.now() - newSteps[i].startTime!,
        };
        setSteps([...newSteps]);

        if (!success) {
          // 에러 발생 - 중단
          setStatus('error');
          addLog({
            handlerId: handler.id,
            status: 'error',
            message: `Action failed: ${step.name}`,
            duration: Date.now() - startTime,
            steps: newSteps,
          });
          return;
        }
      }

      setStatus('completed');
      addLog({
        handlerId: handler.id,
        status: 'success',
        message: 'All actions completed successfully',
        duration: Date.now() - startTime,
        steps: newSteps,
      });
    } catch (error) {
      setStatus('error');
      addLog({
        handlerId: handler.id,
        status: 'error',
        message: `Execution error: ${error}`,
        duration: Date.now() - startTime,
        steps: newSteps,
      });
    }
  }, [handler, allSteps, mockEventData, mockState, addLog]);

  // 리셋
  const reset = useCallback(() => {
    setStatus('idle');
    setSteps([]);
    setCurrentStepIndex(-1);
  }, []);

  // 단계 확장 토글
  const toggleStepExpand = useCallback((stepId: string) => {
    setExpandedSteps((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  }, []);

  return (
    <div className="event-debugger">
      {/* Controls */}
      <div className="debugger-controls">
        <Button
          className="debugger-btn primary"
          onPress={runTest}
          isDisabled={status === 'running'}
        >
          <Play size={iconEditProps.size} />
          <span>Run Test</span>
        </Button>

        <Button
          className="debugger-btn"
          onPress={reset}
          isDisabled={status === 'running'}
        >
          <RefreshCw size={iconEditProps.size} />
          <span>Reset</span>
        </Button>
      </div>

      {/* Mock Event Input */}
      <div className="debugger-mock-event">
        <Label className="field-label">Mock Event Data (JSON)</Label>
        <textarea
          className="mock-event-input"
          value={mockEventData}
          onChange={(e) => setMockEventData(e.target.value)}
          rows={4}
          placeholder='{"target": {"value": "test"}}'
        />
      </div>

      {/* Execution Steps */}
      <div className="debugger-steps">
        <div className="debugger-section-title">Execution Steps</div>
        {(steps.length > 0 ? steps : allSteps).map((step, index) => (
          <div
            key={step.id}
            className={`debugger-step ${step.status} ${index === currentStepIndex ? 'current' : ''}`}
          >
            <Button
              className="step-header"
              onPress={() => toggleStepExpand(step.id)}
            >
              {expandedSteps.has(step.id) ? (
                <ChevronDown size={iconSmall.size} />
              ) : (
                <ChevronRight size={iconSmall.size} />
              )}
              <StepStatusIcon status={step.status} />
              <span className="step-name">{step.name}</span>
              {step.duration !== undefined && (
                <span className="step-duration">{step.duration}ms</span>
              )}
            </Button>

            {expandedSteps.has(step.id) && (
              <div className="step-details">
                {step.input !== undefined && (
                  <div className="step-io">
                    <span className="io-label">Input:</span>
                    <pre className="io-value">{JSON.stringify(step.input, null, 2)}</pre>
                  </div>
                )}
                {step.output !== undefined && (
                  <div className="step-io">
                    <span className="io-label">Output:</span>
                    <pre className="io-value">{JSON.stringify(step.output, null, 2)}</pre>
                  </div>
                )}
                {step.error && (
                  <div className="step-error">
                    <AlertTriangle size={iconSmall.size} />
                    <span>{step.error}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Execution Log */}
      {logs.length > 0 && (
        <div className="debugger-logs">
          <div className="debugger-section-title">Execution History</div>
          {logs.map((log) => (
            <div key={log.id} className={`debugger-log ${log.status}`}>
              <span className="log-time">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>
              <span className="log-message">{log.message}</span>
              <span className="log-duration">{log.duration}ms</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 단계 상태 아이콘
 */
function StepStatusIcon({ status }: { status: StepResult['status'] }) {
  switch (status) {
    case 'success':
      return <CheckCircle size={iconEditProps.size} className="step-icon success" />;
    case 'failed':
      return <XCircle size={iconEditProps.size} className="step-icon failed" />;
    case 'running':
      return <Clock size={iconEditProps.size} className="step-icon running" />;
    case 'skipped':
      return <SkipForward size={iconEditProps.size} className="step-icon skipped" />;
    default:
      return <div className="step-icon pending" />;
  }
}

/**
 * 지연 함수
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
