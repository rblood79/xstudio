/**
 * G.1 Instance Store Actions
 *
 * Master-Instance 시스템의 스토어 액션.
 * createInstance, detachInstance 등 인스턴스 생명주기 관리.
 *
 * Master propagation은 별도 액션이 불필요:
 * useResolvedElement hook이 elementsMap 변경을 자동 감지하여 리렌더.
 *
 * @see docs/WASM_DOC_IMPACT_ANALYSIS.md §G.1
 */

import { v4 as uuidv4 } from 'uuid';
import type { Element } from '../../../types/core/store.types';
import type { ElementsState } from '../elements';
import { resolveInstanceProps } from '../../../utils/component/instanceResolver';

/**
 * Instance 요소 생성
 *
 * master를 참조하는 새 instance element를 생성한다.
 * props는 비워두고, useResolvedElement가 렌더링 시 master props를 병합.
 */
export function createInstance(
  get: () => ElementsState,
  set: (partial: Partial<ElementsState>) => void,
  masterId: string,
  parentId: string,
  pageId: string,
): Element | null {
  const state = get();
  const master = state.elementsMap.get(masterId);
  if (!master || master.componentRole !== 'master') {
    console.warn('[Instance] master not found or not a master:', masterId);
    return null;
  }

  // 다음 order_num 계산
  const siblings = state.childrenMap.get(parentId) || [];
  const maxOrder = siblings.reduce((max, el) => Math.max(max, el.order_num ?? 0), 0);

  const instanceElement: Element = {
    id: uuidv4(),
    tag: master.tag,
    props: {},
    parent_id: parentId,
    page_id: pageId,
    order_num: maxOrder + 1,
    componentRole: 'instance',
    masterId: masterId,
    overrides: {},
    componentName: master.componentName,
  };

  // elements 배열에 추가
  set({ elements: [...state.elements, instanceElement] });
  get()._rebuildIndexes();

  return instanceElement;
}

/**
 * Instance를 독립 요소로 분리 (Detach)
 *
 * master props + overrides를 병합하여 독립적인 props를 가진 일반 요소로 변환.
 * componentRole, masterId, overrides, descendants 필드를 모두 제거.
 *
 * @returns detach 이전 상태 (undo 복원용)
 */
export function detachInstance(
  get: () => ElementsState,
  set: (partial: Partial<ElementsState>) => void,
  instanceId: string,
): { previousState: Element } | null {
  const state = get();
  const instance = state.elementsMap.get(instanceId);
  if (!instance || instance.componentRole !== 'instance') {
    console.warn('[Instance] element is not an instance:', instanceId);
    return null;
  }

  const master = instance.masterId ? state.elementsMap.get(instance.masterId) : undefined;

  // 병합된 props로 독립 요소 변환
  let mergedProps: Record<string, unknown>;
  if (master) {
    const { props } = resolveInstanceProps(instance, master);
    mergedProps = props;
  } else {
    mergedProps = { ...instance.props, ...instance.overrides };
  }

  const detachedElement: Element = {
    ...instance,
    props: mergedProps,
    componentRole: undefined,
    masterId: undefined,
    overrides: undefined,
    descendants: undefined,
  };

  // 이전 상태 저장 (undo용)
  const previousState = { ...instance };

  // elements 배열 업데이트
  const elements = state.elements.map(el =>
    el.id === instanceId ? detachedElement : el
  );
  set({ elements });
  get()._rebuildIndexes();

  return { previousState };
}
