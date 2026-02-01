/**
 * G.2 Design Variable Resolver
 *
 * $-- 접두사 변수 참조를 실제 값으로 해석하는 순수 함수.
 * 상태 비종속 — 모든 필요 데이터를 인자로 전달받는다.
 *
 * @see docs/WASM_DOC_IMPACT_ANALYSIS.md §G.2
 */

import type { DesignVariable } from '../../types/theme';
import type {
  ResolvedVariable,
  VariableResolveContext,
} from '../../types/builder/designVariable.types';
import { isVariableRef } from '../../types/builder/unified.types';

/**
 * $--variableName 참조를 해석하여 실제 값 반환
 *
 * 해석 우선순위:
 * 1. activeThemeId에 매칭되는 theme-specific 값
 * 2. themeId === null인 기본값
 * 3. fallback 값
 *
 * @param ref '$--primary' 형태의 변수 참조
 * @param variables 프로젝트의 전체 designVariables
 * @param context activeThemeId, fallback 등
 * @returns ResolvedVariable 또는 null
 */
export function resolveVariableRef(
  ref: string,
  variables: DesignVariable[],
  context: VariableResolveContext,
): ResolvedVariable | null {
  if (!isVariableRef(ref)) return null;

  // '$--' 접두사 제거
  const varName = ref.slice(3);

  const variable = variables.find(v => v.name === varName);
  if (!variable) {
    return context.fallback !== undefined
      ? { value: context.fallback, ref, source: 'fallback', themeId: null }
      : null;
  }

  // 1. 활성 테마 매칭
  if (context.activeThemeId) {
    const themeValue = variable.values.find(v => v.themeId === context.activeThemeId);
    if (themeValue) {
      return { value: themeValue.value, ref, source: 'theme-specific', themeId: context.activeThemeId };
    }
  }

  // 2. 기본값 (themeId === null)
  const defaultValue = variable.values.find(v => v.themeId === null);
  if (defaultValue) {
    return { value: defaultValue.value, ref, source: 'default', themeId: null };
  }

  // 3. fallback
  return context.fallback !== undefined
    ? { value: context.fallback, ref, source: 'fallback', themeId: null }
    : null;
}

/**
 * Element props에서 $-- 참조를 모두 해석하여 새 props 반환
 *
 * style 객체 내부도 재귀 탐색한다.
 * 변경이 없으면 원본 참조를 그대로 반환 (useMemo 최적화).
 */
export function resolveElementVariables(
  props: Record<string, unknown>,
  variables: DesignVariable[],
  context: VariableResolveContext,
): Record<string, unknown> {
  if (variables.length === 0) return props;

  let hasChanges = false;
  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(props)) {
    // $-- 문자열 직접 해석
    if (typeof value === 'string' && isVariableRef(value)) {
      const result = resolveVariableRef(value, variables, context);
      if (result) {
        resolved[key] = result.value;
        hasChanges = true;
        continue;
      }
    }

    // style 객체 내부 재귀 해석
    if (key === 'style' && typeof value === 'object' && value !== null) {
      const resolvedStyle = resolveStyleVariables(
        value as Record<string, unknown>,
        variables,
        context,
      );
      if (resolvedStyle !== value) {
        resolved[key] = resolvedStyle;
        hasChanges = true;
        continue;
      }
    }

    resolved[key] = value;
  }

  return hasChanges ? resolved : props;
}

/**
 * style 객체 내의 변수 참조 해석
 */
function resolveStyleVariables(
  style: Record<string, unknown>,
  variables: DesignVariable[],
  context: VariableResolveContext,
): Record<string, unknown> {
  let hasChanges = false;
  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(style)) {
    if (typeof value === 'string' && isVariableRef(value)) {
      const result = resolveVariableRef(value, variables, context);
      if (result) {
        resolved[key] = result.value;
        hasChanges = true;
        continue;
      }
    }
    resolved[key] = value;
  }

  return hasChanges ? resolved : style;
}
