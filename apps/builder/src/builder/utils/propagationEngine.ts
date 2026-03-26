/**
 * ADR-048: Propagation Engine
 *
 * S2 Context 에뮬레이션 — Spec의 선언적 규칙 기반 부모→자식 props 전파.
 *
 * 두 함수는 다른 경로, 다른 역할:
 * - buildPropagationUpdates (Inspector primary): childrenMap으로 중첩 경로 해석, Store에 값 기록
 * - resolvePropagatedProps (Skia/Layout fallback): 직접 자식 1단계만, Store에 값 없을 때 보완
 */
import type { PropagationRule } from "@xstudio/specs";
import { getPropagationRules } from "./propagationRegistry";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PropagationUpdate {
  elementId: string;
  props: Record<string, unknown>;
}

interface ElementLike {
  id: string;
  tag: string;
  props: Record<string, unknown>;
}

// ─── Internal Helpers ───────────────────────────────────────────────────────

/**
 * childPath를 childrenMap으로 단계별 순회하여 대상 자식 Element를 해석한다.
 *
 * - 단일 문자열: 직접 자식에서 태그 매칭
 * - 배열: 단계별 순회. 중간 단계 미발견 시 빈 배열 반환 (fail-safe)
 */
function resolveChildPath(
  parentId: string,
  childPath: string | string[],
  childrenMap: Map<string, ElementLike[]>,
): ElementLike[] {
  if (typeof childPath === "string") {
    const children = childrenMap.get(parentId);
    if (!children || children.length === 0) return [];
    const target = childPath.toLowerCase();
    return children.filter((c) => c.tag.toLowerCase() === target);
  }

  // 중첩 경로: 첫 단계는 parentId에서 시작, 이후 단계는 이전 결과의 id로 순회
  let currentIds: string[] = [parentId];

  for (let i = 0; i < childPath.length; i++) {
    const stepTag = childPath[i].toLowerCase();
    const isLast = i === childPath.length - 1;
    const nextElements: ElementLike[] = [];

    for (const pid of currentIds) {
      const children = childrenMap.get(pid);
      if (!children || children.length === 0) continue;
      for (const child of children) {
        if (child.tag.toLowerCase() === stepTag) {
          nextElements.push(child);
        }
      }
    }

    if (nextElements.length === 0) return [];
    if (isLast) return nextElements;
    currentIds = nextElements.map((e) => e.id);
  }

  return [];
}

/**
 * 자식에 해당 prop 값이 이미 존재하는지 확인.
 * override가 아닌 경우 자식 명시값 우선 원칙 적용.
 */
function childHasValue(
  childProps: Record<string, unknown>,
  propKey: string,
  asStyle: boolean | undefined,
): boolean {
  if (asStyle) {
    const style = childProps.style as Record<string, unknown> | undefined;
    return style != null && style[propKey] != null;
  }
  return childProps[propKey] != null;
}

// ─── Primary: Inspector 경로 ────────────────────────────────────────────────

/**
 * Inspector용 (primary): 부모 props 변경 시 자식 PropagationUpdate[] 생성.
 *
 * childPath를 childrenMap으로 단계별 순회하여 대상 자식을 실제 Element ID로 해석.
 * 중첩 경로 ["Calendar", "CalendarHeader"]도 해석 가능.
 * transform/asStyle/override 규칙을 적용한 업데이트 배열 반환.
 */
export function buildPropagationUpdates(
  parentElement: ElementLike,
  changedProps: Record<string, unknown>,
  rules: PropagationRule[],
  childrenMap: Map<string, ElementLike[]>,
  elementsMap: Map<string, ElementLike>,
): PropagationUpdate[] {
  const updatesById = new Map<string, Record<string, unknown>>();
  // transform용 merged props — 1회만 생성 (transform 규칙이 있을 때)
  let mergedProps: Record<string, unknown> | null = null;

  for (const rule of rules) {
    if (!(rule.parentProp in changedProps)) continue;

    const targets = resolveChildPath(
      parentElement.id,
      rule.childPath,
      childrenMap,
    );
    if (targets.length === 0) continue;

    for (const target of targets) {
      const element = elementsMap.get(target.id);
      if (!element) continue;

      const childProp = rule.childProp ?? rule.parentProp;

      let value = changedProps[rule.parentProp];
      if (rule.transform) {
        try {
          if (!mergedProps)
            mergedProps = { ...parentElement.props, ...changedProps };
          value = rule.transform(value, mergedProps);
        } catch {
          console.warn(
            `[Propagation] transform failed: ${rule.parentProp} → ${String(rule.childPath)}`,
          );
          continue; // fail-safe: 해당 규칙만 스킵
        }
        // transform 결과가 undefined면 스킵 (변환 실패와 동일 취급)
        if (value === undefined) continue;
      }
      // 원본 값이 undefined인 경우는 전파 (자식 prop 삭제 = 기존 sync 동작 유지)

      // 업데이트 축적 (동일 elementId에 대한 여러 규칙은 merge)
      let existing = updatesById.get(target.id);
      if (!existing) {
        existing = {};
        updatesById.set(target.id, existing);
      }

      if (rule.asStyle) {
        if (!existing.style) existing.style = {};
        (existing.style as Record<string, unknown>)[childProp] = value;
      } else {
        existing[childProp] = value;
      }
    }
  }

  return Array.from(updatesById, ([elementId, props]) => ({
    elementId,
    props,
  }));
}

// ─── Fallback: Skia/Layout 경로 ────────────────────────────────────────────

/**
 * Skia/Layout용 (fallback): Store 쓰기 없이 가상 props 패치 반환.
 *
 * 부모-자식 태그 쌍으로 직접 자식 1단계 규칙만 매칭.
 * Store에 값이 없을 때의 방어적 fallback.
 * Inspector가 정상 동작하면 대부분 null 반환 (Store에 이미 값 존재).
 */
export function resolvePropagatedProps(
  parentTag: string,
  parentProps: Record<string, unknown>,
  childTag: string,
  childProps: Record<string, unknown>,
): Record<string, unknown> | null {
  const rules = getPropagationRules(parentTag);
  if (!rules) return null;

  const childTagLower = childTag.toLowerCase();
  let patch: Record<string, unknown> | null = null;

  for (const rule of rules) {
    // 직접 자식 1단계 규칙만 매칭 (배열 경로는 무시)
    if (typeof rule.childPath !== "string") continue;
    if (rule.childPath.toLowerCase() !== childTagLower) continue;

    const parentValue = parentProps[rule.parentProp];
    if (parentValue === undefined) continue;

    const childProp = rule.childProp ?? rule.parentProp;

    // 자식 명시값 우선 원칙
    if (!rule.override && childHasValue(childProps, childProp, rule.asStyle)) {
      continue;
    }

    // 값 변환
    let value = parentValue;
    if (rule.transform) {
      try {
        value = rule.transform(value, parentProps);
      } catch {
        console.warn(
          `[Propagation] transform failed: ${rule.parentProp} → ${rule.childPath}`,
        );
        continue;
      }
    }

    if (value === undefined) continue;

    if (!patch) patch = {};
    if (rule.asStyle) {
      if (!patch.style) patch.style = {};
      (patch.style as Record<string, unknown>)[childProp] = value;
    } else {
      patch[childProp] = value;
    }
  }

  return patch;
}

// ─── Factory: 복합 컴포넌트 생성 시 초기 전파 ──────────────────────────────

/**
 * Factory용: 복합 컴포넌트 생성 시 부모 props를 자식에 미리 전파.
 *
 * Store 추가 전에 호출하여, 자식이 처음부터 올바른 props를 가지도록 보장.
 * 히스토리 추가 항목 없이 props만 패치.
 *
 * @returns 전파가 적용된 새 children 배열 (변경 없으면 원본 반환)
 */
export function applyFactoryPropagation<
  T extends {
    id: string;
    tag: string;
    parent_id?: string | null;
    props: Record<string, unknown>;
  },
>(parent: T, children: T[]): T[] {
  const rules = getPropagationRules(parent.tag);
  if (!rules || children.length === 0) return children;

  // 임시 childrenMap/elementsMap 빌드 (Store 추가 전이므로)
  const tempChildrenMap = new Map<string, ElementLike[]>();
  const tempElementsMap = new Map<string, ElementLike>();
  tempElementsMap.set(parent.id, parent);

  for (const child of children) {
    tempElementsMap.set(child.id, child);
    const pid = child.parent_id || parent.id;
    let siblings = tempChildrenMap.get(pid);
    if (!siblings) {
      siblings = [];
      tempChildrenMap.set(pid, siblings);
    }
    siblings.push(child);
  }

  // 부모의 전체 props를 changedProps로 전달 (Factory 생성 = 모든 props가 "새로운" 값)
  const updates = buildPropagationUpdates(
    parent,
    parent.props as Record<string, unknown>,
    rules,
    tempChildrenMap,
    tempElementsMap,
  );

  if (updates.length === 0) return children;

  // buildPropagationUpdates가 이미 동일 elementId를 merge하므로 직접 Map 변환
  const patchById = new Map(updates.map((u) => [u.elementId, u.props]));

  return children.map((child) => {
    const patch = patchById.get(child.id);
    if (!patch) return child;
    return { ...child, props: { ...child.props, ...patch } } as T;
  });
}
