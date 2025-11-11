/**
 * Event Executor - EventAction 실행 엔진
 *
 * 조건부 실행, 지연, debounce/throttle을 지원하는 액션 실행 시스템
 */

import type { EventAction, EventHandler } from "../types/eventTypes";
import { ConditionEvaluator, type EvaluationContext } from "./conditionEvaluator";
import { ExecutionLogger } from "./executionLogger";

export interface ActionExecutionResult {
  actionId: string;
  actionType: string;
  success: boolean;
  skipped?: boolean;
  skipReason?: string;
  error?: string;
  data?: unknown;
  executionTime: number;
  timestamp: number;
}

export interface HandlerExecutionResult {
  handlerId: string;
  eventType: string;
  success: boolean;
  skipped?: boolean;
  skipReason?: string;
  actionResults: ActionExecutionResult[];
  totalExecutionTime: number;
  timestamp: number;
}

/**
 * Event Executor
 */
export class EventExecutor {
  private debounceTimers = new Map<string, NodeJS.Timeout>();
  private throttleTimers = new Map<string, number>();
  private logger: ExecutionLogger;

  constructor(logger?: ExecutionLogger) {
    this.logger = logger || new ExecutionLogger();
  }

  /**
   * EventHandler 실행
   */
  async executeHandler(
    handler: EventHandler,
    context: EvaluationContext
  ): Promise<HandlerExecutionResult> {
    const startTime = performance.now();
    const timestamp = Date.now();

    this.logger.logHandlerStart(handler, context);

    // Handler 비활성화 체크
    if (handler.enabled === false) {
      const result: HandlerExecutionResult = {
        handlerId: handler.id,
        eventType: handler.event,
        success: true,
        skipped: true,
        skipReason: "Handler is disabled",
        actionResults: [],
        totalExecutionTime: performance.now() - startTime,
        timestamp,
      };
      this.logger.logHandlerComplete(result);
      return result;
    }

    // Handler 조건 체크
    if (handler.condition) {
      const conditionResult = ConditionEvaluator.evaluate(
        handler.condition,
        context
      );

      if (!conditionResult.success) {
        const result: HandlerExecutionResult = {
          handlerId: handler.id,
          eventType: handler.event,
          success: false,
          skipReason: `Condition evaluation failed: ${conditionResult.error}`,
          actionResults: [],
          totalExecutionTime: performance.now() - startTime,
          timestamp,
        };
        this.logger.logHandlerComplete(result);
        return result;
      }

      if (!conditionResult.result) {
        const result: HandlerExecutionResult = {
          handlerId: handler.id,
          eventType: handler.event,
          success: true,
          skipped: true,
          skipReason: "Handler condition not met",
          actionResults: [],
          totalExecutionTime: performance.now() - startTime,
          timestamp,
        };
        this.logger.logHandlerComplete(result);
        return result;
      }
    }

    // Debounce/Throttle 적용
    if (handler.debounce || handler.throttle) {
      const shouldExecute = this.checkTimingControl(handler);
      if (!shouldExecute) {
        const result: HandlerExecutionResult = {
          handlerId: handler.id,
          eventType: handler.event,
          success: true,
          skipped: true,
          skipReason: handler.debounce
            ? "Debounced"
            : "Throttled",
          actionResults: [],
          totalExecutionTime: performance.now() - startTime,
          timestamp,
        };
        this.logger.logHandlerComplete(result);
        return result;
      }
    }

    // preventDefault/stopPropagation
    if (context.event && context.event instanceof Event) {
      if (handler.preventDefault) {
        context.event.preventDefault();
      }
      if (handler.stopPropagation) {
        context.event.stopPropagation();
      }
    }

    // Actions 실행
    const actionResults: ActionExecutionResult[] = [];
    for (const action of handler.actions) {
      const actionResult = await this.executeAction(action, context);
      actionResults.push(actionResult);

      // 액션 실패 시 중단 여부 결정 (계속 진행)
      if (!actionResult.success) {
        this.logger.logActionError(action, actionResult.error || "Unknown error");
      }
    }

    const result: HandlerExecutionResult = {
      handlerId: handler.id,
      eventType: handler.event,
      success: actionResults.every((r) => r.success || r.skipped),
      actionResults,
      totalExecutionTime: performance.now() - startTime,
      timestamp,
    };

    this.logger.logHandlerComplete(result);
    return result;
  }

  /**
   * EventAction 실행
   */
  async executeAction(
    action: EventAction,
    context: EvaluationContext
  ): Promise<ActionExecutionResult> {
    const startTime = performance.now();
    const timestamp = Date.now();

    this.logger.logActionStart(action, context);

    // Action 비활성화 체크
    if (action.enabled === false) {
      const result: ActionExecutionResult = {
        actionId: action.id || "unknown",
        actionType: action.type,
        success: true,
        skipped: true,
        skipReason: "Action is disabled",
        executionTime: performance.now() - startTime,
        timestamp,
      };
      this.logger.logActionComplete(result);
      return result;
    }

    // Action 조건 체크
    if (action.condition) {
      const conditionResult = ConditionEvaluator.evaluate(
        action.condition,
        context
      );

      if (!conditionResult.success || !conditionResult.result) {
        const result: ActionExecutionResult = {
          actionId: action.id || "unknown",
          actionType: action.type,
          success: true,
          skipped: true,
          skipReason: conditionResult.success
            ? "Action condition not met"
            : `Condition evaluation failed: ${conditionResult.error}`,
          executionTime: performance.now() - startTime,
          timestamp,
        };
        this.logger.logActionComplete(result);
        return result;
      }
    }

    // Delay 적용
    if (action.delay && action.delay > 0) {
      await this.delay(action.delay);
    }

    // Action 실행 (실제 구현은 eventEngine에서)
    try {
      // 여기서는 성공으로 반환 (실제 실행은 eventEngine.ts에서)
      const result: ActionExecutionResult = {
        actionId: action.id || "unknown",
        actionType: action.type,
        success: true,
        data: { config: action.config },
        executionTime: performance.now() - startTime,
        timestamp,
      };
      this.logger.logActionComplete(result);
      return result;
    } catch (error) {
      const result: ActionExecutionResult = {
        actionId: action.id || "unknown",
        actionType: action.type,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        executionTime: performance.now() - startTime,
        timestamp,
      };
      this.logger.logActionComplete(result);
      return result;
    }
  }

  /**
   * Debounce/Throttle 타이밍 제어
   */
  private checkTimingControl(handler: EventHandler): boolean {
    const handlerId = handler.id;

    // Debounce
    if (handler.debounce) {
      // 이전 타이머 취소
      const existingTimer = this.debounceTimers.get(handlerId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // 새 타이머 설정
      const timer = setTimeout(() => {
        this.debounceTimers.delete(handlerId);
      }, handler.debounce);

      this.debounceTimers.set(handlerId, timer);

      // Debounce 중이므로 실행하지 않음
      return false;
    }

    // Throttle
    if (handler.throttle) {
      const lastExecution = this.throttleTimers.get(handlerId);
      const now = Date.now();

      if (lastExecution && now - lastExecution < handler.throttle) {
        // Throttle 기간 내이므로 실행하지 않음
        return false;
      }

      // 실행 시간 기록
      this.throttleTimers.set(handlerId, now);
    }

    return true;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * 모든 타이머 정리
   */
  cleanup(): void {
    this.debounceTimers.forEach((timer) => clearTimeout(timer));
    this.debounceTimers.clear();
    this.throttleTimers.clear();
  }

  /**
   * Logger 가져오기
   */
  getLogger(): ExecutionLogger {
    return this.logger;
  }
}
