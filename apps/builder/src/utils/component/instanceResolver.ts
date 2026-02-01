/**
 * G.1 Instance Resolver
 *
 * Master-Instance 관계에서 Instance의 최종 props를 해석하는 순수 함수.
 * 상태 비종속 — 모든 필요 데이터를 인자로 전달받는다.
 *
 * 우선순위: descendant override > instance override > master props > default
 *
 * @see docs/WASM_DOC_IMPACT_ANALYSIS.md §G.1
 */

import type { Element } from '../../types/builder/unified.types';
import type { ResolvedInstanceProps } from '../../types/builder/component.types';

/**
 * Instance 요소의 props를 master와 병합하여 최종 props 반환
 *
 * @param instance componentRole === 'instance' 요소
 * @param master instance.masterId로 조회한 master 요소
 * @returns 병합된 props와 각 prop의 출처
 */
export function resolveInstanceProps(
  instance: Element,
  master: Element,
): ResolvedInstanceProps {
  const masterProps = master.props || {};
  const overrides = instance.overrides || {};
  const sources: Record<string, 'master' | 'override' | 'descendant' | 'default'> = {};

  const merged: Record<string, unknown> = {};

  // 1. master props를 기본값으로
  for (const [key, value] of Object.entries(masterProps)) {
    merged[key] = value;
    sources[key] = 'master';
  }

  // 2. instance overrides로 덮어쓰기
  for (const [key, value] of Object.entries(overrides)) {
    merged[key] = value;
    sources[key] = 'override';
  }

  // 3. style 심층 병합 (master style + override style)
  if (masterProps.style || overrides.style) {
    merged.style = {
      ...(masterProps.style as Record<string, unknown> || {}),
      ...(overrides.style as Record<string, unknown> || {}),
    };
  }

  return { props: merged, sources };
}

/**
 * Instance 요소를 master 기반으로 해석하여 렌더링 가능한 Element 반환
 *
 * master가 없으면 원본 instance를 그대로 반환.
 */
export function resolveInstanceElement(
  instance: Element,
  master: Element | undefined,
): Element {
  if (!master) return instance;

  const { props } = resolveInstanceProps(instance, master);

  return {
    ...instance,
    tag: master.tag,
    props,
  };
}

/**
 * Descendant overrides 적용
 *
 * Instance의 descendants 맵에서 childId에 해당하는 오버라이드를 child element에 적용.
 * 오버라이드가 없으면 원본 반환.
 */
export function resolveDescendantOverrides(
  childElement: Element,
  instanceDescendants: Record<string, Record<string, unknown>> | undefined,
): Element {
  if (!instanceDescendants) return childElement;

  const overrides = instanceDescendants[childElement.id];
  if (!overrides) return childElement;

  const mergedProps: Record<string, unknown> = {
    ...childElement.props,
    ...overrides,
  };

  // style 심층 병합
  if (overrides.style) {
    mergedProps.style = {
      ...(childElement.props.style as Record<string, unknown> || {}),
      ...(overrides.style as Record<string, unknown>),
    };
  }

  return {
    ...childElement,
    props: mergedProps,
  };
}
