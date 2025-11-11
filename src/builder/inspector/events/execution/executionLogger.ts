/**
 * Execution Logger - 이벤트 실행 로그 시스템
 *
 * EventHandler와 EventAction 실행을 추적하고 기록합니다.
 */

import type { EventHandler, EventAction } from "../types/eventTypes";
import type { EvaluationContext } from "./conditionEvaluator";
import type {
  HandlerExecutionResult,
  ActionExecutionResult,
} from "./eventExecutor";

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  type: "handler" | "action" | "condition" | "error";
  message: string;
  data?: unknown;
}

/**
 * Execution Logger
 */
export class ExecutionLogger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private enabled = true;

  /**
   * Handler 실행 시작 로그
   */
  logHandlerStart(handler: EventHandler, context: EvaluationContext): void {
    if (!this.enabled) return;

    this.addLog({
      level: "info",
      type: "handler",
      message: `Handler started: ${handler.event}`,
      data: {
        handlerId: handler.id,
        eventType: handler.event,
        condition: handler.condition,
        debounce: handler.debounce,
        throttle: handler.throttle,
        actionsCount: handler.actions.length,
        context: this.sanitizeContext(context),
      },
    });
  }

  /**
   * Handler 실행 완료 로그
   */
  logHandlerComplete(result: HandlerExecutionResult): void {
    if (!this.enabled) return;

    this.addLog({
      level: result.success ? "info" : "error",
      type: "handler",
      message: result.skipped
        ? `Handler skipped: ${result.skipReason}`
        : result.success
        ? `Handler completed: ${result.eventType}`
        : `Handler failed: ${result.eventType}`,
      data: result,
    });
  }

  /**
   * Action 실행 시작 로그
   */
  logActionStart(action: EventAction, context: EvaluationContext): void {
    if (!this.enabled) return;

    this.addLog({
      level: "debug",
      type: "action",
      message: `Action started: ${action.type}`,
      data: {
        actionId: action.id,
        actionType: action.type,
        condition: action.condition,
        delay: action.delay,
        config: action.config,
        context: this.sanitizeContext(context),
      },
    });
  }

  /**
   * Action 실행 완료 로그
   */
  logActionComplete(result: ActionExecutionResult): void {
    if (!this.enabled) return;

    this.addLog({
      level: result.success ? "debug" : "error",
      type: "action",
      message: result.skipped
        ? `Action skipped: ${result.skipReason}`
        : result.success
        ? `Action completed: ${result.actionType}`
        : `Action failed: ${result.actionType}`,
      data: result,
    });
  }

  /**
   * Action 에러 로그
   */
  logActionError(action: EventAction, error: string): void {
    if (!this.enabled) return;

    this.addLog({
      level: "error",
      type: "error",
      message: `Action error: ${action.type} - ${error}`,
      data: {
        actionId: action.id,
        actionType: action.type,
        error,
      },
    });
  }

  /**
   * 조건 평가 로그
   */
  logConditionEvaluation(
    condition: string,
    result: boolean,
    context: EvaluationContext
  ): void {
    if (!this.enabled) return;

    this.addLog({
      level: "debug",
      type: "condition",
      message: `Condition ${result ? "passed" : "failed"}: ${condition}`,
      data: {
        condition,
        result,
        context: this.sanitizeContext(context),
      },
    });
  }

  /**
   * 일반 에러 로그
   */
  logError(message: string, data?: unknown): void {
    if (!this.enabled) return;

    this.addLog({
      level: "error",
      type: "error",
      message,
      data,
    });
  }

  /**
   * 로그 추가
   */
  private addLog(entry: Omit<LogEntry, "id" | "timestamp">): void {
    const log: LogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...entry,
    };

    this.logs.push(log);

    // 최대 로그 수 제한
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // 콘솔 출력
    this.outputToConsole(log);
  }

  /**
   * 콘솔 출력
   */
  private outputToConsole(log: LogEntry): void {
    const prefix = `[EventEngine:${log.type}]`;
    const message = `${prefix} ${log.message}`;

    switch (log.level) {
      case "debug":
        console.debug(message, log.data);
        break;
      case "info":
        console.info(message, log.data);
        break;
      case "warn":
        console.warn(message, log.data);
        break;
      case "error":
        console.error(message, log.data);
        break;
    }
  }

  /**
   * Context 정리 (순환 참조 제거)
   */
  private sanitizeContext(context: EvaluationContext): Record<string, unknown> {
    return {
      event: context.event ? this.summarizeObject(context.event) : undefined,
      state: context.state ? this.summarizeObject(context.state) : undefined,
      element: context.element
        ? this.summarizeObject(context.element)
        : undefined,
    };
  }

  /**
   * 객체 요약 (깊은 복사 방지)
   */
  private summarizeObject(obj: unknown): unknown {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== "object") return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => this.summarizeObject(item));
    }

    const summary: Record<string, unknown> = {};
    const safeObj = obj as Record<string, unknown>;

    for (const key in safeObj) {
      if (Object.prototype.hasOwnProperty.call(safeObj, key)) {
        const value = safeObj[key];

        // 함수 제외
        if (typeof value === "function") continue;

        // HTMLElement 요약
        if (value instanceof HTMLElement) {
          summary[key] = `<${value.tagName.toLowerCase()}>`;
          continue;
        }

        // 기본 타입만
        if (
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean"
        ) {
          summary[key] = value;
        }
      }
    }

    return summary;
  }

  /**
   * 모든 로그 가져오기
   */
  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  /**
   * 레벨별 로그 필터
   */
  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.logs.filter((log) => log.level === level);
  }

  /**
   * 타입별 로그 필터
   */
  getLogsByType(type: LogEntry["type"]): LogEntry[] {
    return this.logs.filter((log) => log.type === type);
  }

  /**
   * 최근 N개 로그
   */
  getRecentLogs(count: number): LogEntry[] {
    return this.logs.slice(-count);
  }

  /**
   * 로그 초기화
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Logger 활성화/비활성화
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 최대 로그 수 설정
   */
  setMaxLogs(max: number): void {
    this.maxLogs = max;
  }

  /**
   * 로그 내보내기 (JSON)
   */
  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * 통계 정보
   */
  getStats(): {
    total: number;
    byLevel: Record<LogLevel, number>;
    byType: Record<string, number>;
  } {
    const byLevel = {
      debug: 0,
      info: 0,
      warn: 0,
      error: 0,
    };

    const byType: Record<string, number> = {};

    this.logs.forEach((log) => {
      byLevel[log.level]++;
      byType[log.type] = (byType[log.type] || 0) + 1;
    });

    return {
      total: this.logs.length,
      byLevel,
      byType,
    };
  }
}
