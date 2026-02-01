/**
 * G.4 Design Kit Validator
 *
 * Kit JSON 파싱 및 Zod 스키마 검증.
 *
 * @see docs/WASM_DOC_IMPACT_ANALYSIS.md §G.4
 */

import type { DesignKit } from '../../types/builder/designKit.types';
import { DesignKitSchema } from '../../types/builder/designKit.types';

export interface ValidationResult {
  success: boolean;
  data?: DesignKit;
  error?: string;
}

/**
 * JSON 문자열을 파싱하고 DesignKit 스키마로 검증한다.
 */
export function validateKitJSON(jsonString: string): ValidationResult {
  // Step 1: JSON parse
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (e) {
    return {
      success: false,
      error: `JSON 파싱 실패: ${e instanceof Error ? e.message : String(e)}`,
    };
  }

  return validateKitObject(parsed);
}

/**
 * 파싱된 객체를 DesignKit 스키마로 검증한다.
 */
export function validateKitObject(obj: unknown): ValidationResult {
  const result = DesignKitSchema.safeParse(obj);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    return {
      success: false,
      error: `스키마 검증 실패: ${issues}`,
    };
  }

  return {
    success: true,
    data: result.data as DesignKit,
  };
}
