/**
 * Condition Evaluator - 안전한 JavaScript 조건식 실행
 *
 * EventHandler와 EventAction의 condition 필드를 평가합니다.
 */

export interface EvaluationContext {
  event?: Event | Record<string, unknown>;
  state?: Record<string, unknown>;
  element?: HTMLElement | Record<string, unknown>;
}

export interface EvaluationResult {
  success: boolean;
  result: boolean;
  error?: string;
  executionTime: number;
}

/**
 * 안전한 조건식 평가기
 */
export class ConditionEvaluator {
  private static readonly TIMEOUT_MS = 1000;
  private static readonly FORBIDDEN_PATTERNS = [
    /eval\s*\(/,
    /Function\s*\(/,
    /setTimeout\s*\(/,
    /setInterval\s*\(/,
    /import\s*\(/,
    /require\s*\(/,
    /window\./,
    /document\./,
    /localStorage/,
    /sessionStorage/,
    /fetch\s*\(/,
    /XMLHttpRequest/,
    /\.innerHTML/,
    /\.outerHTML/,
    /\.insertAdjacentHTML/,
    /\.__proto__/,
    /\.constructor/,
    /\.prototype/,
  ];

  /**
   * 조건식 유효성 검증
   */
  static validate(condition: string): { valid: boolean; error?: string } {
    if (!condition || condition.trim() === "") {
      return { valid: false, error: "Condition cannot be empty" };
    }

    // 위험한 패턴 검사
    for (const pattern of this.FORBIDDEN_PATTERNS) {
      if (pattern.test(condition)) {
        return {
          valid: false,
          error: `Forbidden pattern detected: ${pattern.source}`,
        };
      }
    }

    // 기본 구문 검사
    try {
      new Function("event", "state", "element", `return (${condition});`);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Invalid syntax",
      };
    }
  }

  /**
   * 조건식 평가
   */
  static evaluate(
    condition: string,
    context: EvaluationContext
  ): EvaluationResult {
    const startTime = performance.now();

    // 빈 조건식은 true로 간주
    if (!condition || condition.trim() === "") {
      return {
        success: true,
        result: true,
        executionTime: performance.now() - startTime,
      };
    }

    // 유효성 검증
    const validation = this.validate(condition);
    if (!validation.valid) {
      return {
        success: false,
        result: false,
        error: validation.error,
        executionTime: performance.now() - startTime,
      };
    }

    try {
      // 안전한 컨텍스트 생성
      const safeContext = this.createSafeContext(context);

      // 타임아웃 설정
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error("Condition evaluation timeout")),
          this.TIMEOUT_MS
        )
      );

      // 조건식 실행
      const evaluationPromise = Promise.resolve(
        this.executeCondition(condition, safeContext)
      );

      // 타임아웃과 경쟁
      const result = Promise.race([evaluationPromise, timeoutPromise]);

      // 결과를 boolean으로 변환
      const booleanResult = Boolean(result);

      return {
        success: true,
        result: booleanResult,
        executionTime: performance.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        result: false,
        error: error instanceof Error ? error.message : "Evaluation failed",
        executionTime: performance.now() - startTime,
      };
    }
  }

  /**
   * 안전한 컨텍스트 생성
   */
  private static createSafeContext(
    context: EvaluationContext
  ): Record<string, unknown> {
    return {
      event: this.sanitizeObject(context.event),
      state: this.sanitizeObject(context.state),
      element: this.sanitizeObject(context.element),
    };
  }

  /**
   * 객체 정리 (위험한 속성 제거)
   */
  private static sanitizeObject(
    obj: unknown
  ): Record<string, unknown> | undefined {
    if (!obj || typeof obj !== "object") {
      return undefined;
    }

    // 안전한 속성만 복사
    const sanitized: Record<string, unknown> = {};
    const safeObj = obj as Record<string, unknown>;

    for (const key in safeObj) {
      if (Object.prototype.hasOwnProperty.call(safeObj, key)) {
        const value = safeObj[key];

        // 위험한 속성 제외
        if (
          key.startsWith("__") ||
          key === "constructor" ||
          key === "prototype"
        ) {
          continue;
        }

        // 함수 제외
        if (typeof value === "function") {
          continue;
        }

        // 기본 타입만 허용
        if (
          typeof value === "string" ||
          typeof value === "number" ||
          typeof value === "boolean" ||
          value === null ||
          value === undefined
        ) {
          sanitized[key] = value;
        } else if (Array.isArray(value)) {
          sanitized[key] = value.map((item) =>
            typeof item === "object" ? this.sanitizeObject(item) : item
          );
        } else if (typeof value === "object") {
          sanitized[key] = this.sanitizeObject(value);
        }
      }
    }

    return sanitized;
  }

  /**
   * 조건식 실행
   */
  private static executeCondition(
    condition: string,
    context: Record<string, unknown>
  ): boolean {
    const func = new Function(
      "event",
      "state",
      "element",
      `"use strict"; return (${condition});`
    );

    return func(context.event, context.state, context.element);
  }

  /**
   * 배치 평가 (여러 조건식)
   */
  static evaluateBatch(
    conditions: string[],
    context: EvaluationContext
  ): EvaluationResult[] {
    return conditions.map((condition) => this.evaluate(condition, context));
  }

  /**
   * 논리 연산자 적용 (AND, OR)
   */
  static evaluateWithLogic(
    conditions: string[],
    logic: "AND" | "OR",
    context: EvaluationContext
  ): EvaluationResult {
    const startTime = performance.now();

    if (conditions.length === 0) {
      return {
        success: true,
        result: true,
        executionTime: performance.now() - startTime,
      };
    }

    const results = this.evaluateBatch(conditions, context);

    // 하나라도 실패하면 전체 실패
    const allSuccess = results.every((r) => r.success);
    if (!allSuccess) {
      const firstError = results.find((r) => !r.success);
      return {
        success: false,
        result: false,
        error: firstError?.error || "One or more conditions failed",
        executionTime: performance.now() - startTime,
      };
    }

    // 논리 연산 적용
    const finalResult =
      logic === "AND"
        ? results.every((r) => r.result)
        : results.some((r) => r.result);

    return {
      success: true,
      result: finalResult,
      executionTime: performance.now() - startTime,
    };
  }
}
