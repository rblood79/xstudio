/**
 * G.1 Instance Store Actions
 *
 * Master-Instance 시스템의 스토어 액션.
 * registerAsMaster, unregisterMaster, createInstance, detachInstance 등
 * 컴포넌트 등록 및 인스턴스 생명주기 관리.
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
 * 선택된 요소를 Master 컴포넌트로 등록
 *
 * 일반 요소에 componentRole: 'master'와 componentName을 설정한다.
 * 이미 master인 요소는 이름만 업데이트한다.
 *
 * @returns 등록된 master element
 */
export function registerAsMaster(
  get: () => ElementsState,
  set: (partial: Partial<ElementsState>) => void,
  elementId: string,
  componentName: string,
): Element | null {
  const state = get();
  const element = state.elementsMap.get(elementId);
  if (!element) {
    console.warn('[registerAsMaster] element not found:', elementId);
    return null;
  }

  // instance는 master로 전환 불가 — 먼저 detach 필요
  if (element.componentRole === 'instance') {
    console.warn('[registerAsMaster] cannot register an instance as master. Detach first.');
    return null;
  }

  const updatedElement: Element = {
    ...element,
    componentRole: 'master',
    componentName: componentName || element.tag || 'Component',
  };

  const elements = state.elements.map(el =>
    el.id === elementId ? updatedElement : el
  );
  set({ elements });
  get()._rebuildIndexes();

  return updatedElement;
}

/**
 * Master 컴포넌트 등록 해제
 *
 * master에서 일반 요소로 전환한다.
 * 연결된 모든 instance는 자동으로 detach(독립 요소로 변환)된다.
 *
 * @returns 해제 전 상태 (undo용)
 */
export function unregisterMaster(
  get: () => ElementsState,
  set: (partial: Partial<ElementsState>) => void,
  masterId: string,
): { previousMaster: Element; detachedInstances: Element[] } | null {
  const state = get();
  const master = state.elementsMap.get(masterId);
  if (!master || master.componentRole !== 'master') {
    console.warn('[unregisterMaster] element is not a master:', masterId);
    return null;
  }

  const previousMaster = { ...master };
  const detachedInstances: Element[] = [];

  // 연결된 instance들을 모두 독립 요소로 변환
  const instanceIds = state.componentIndex.masterToInstances.get(masterId);
  let elements = [...state.elements];

  if (instanceIds && instanceIds.size > 0) {
    for (const instanceId of instanceIds) {
      const instance = state.elementsMap.get(instanceId);
      if (!instance) continue;

      detachedInstances.push({ ...instance });

      const mergedProps = (() => {
        const { props } = resolveInstanceProps(instance, master);
        return props;
      })();

      elements = elements.map(el =>
        el.id === instanceId
          ? {
              ...el,
              props: mergedProps,
              componentRole: undefined,
              masterId: undefined,
              overrides: undefined,
              descendants: undefined,
            }
          : el
      );
    }
  }

  // master 자체를 일반 요소로 전환
  elements = elements.map(el =>
    el.id === masterId
      ? { ...el, componentRole: undefined, componentName: undefined }
      : el
  );

  set({ elements });
  get()._rebuildIndexes();

  return { previousMaster, detachedInstances };
}

/**
 * Instance 요소 생성
 *
 * master를 참조하는 새 instance element를 생성한다.
 * master의 자식 서브트리도 함께 복제하여 instance 하위에 배치.
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

  // master의 자식 서브트리 복제
  const clonedChildren = cloneChildrenSubtree(
    state,
    masterId,
    instanceElement.id,
    pageId,
  );

  // elements 배열에 instance + 복제된 자식 모두 추가
  set({ elements: [...state.elements, instanceElement, ...clonedChildren] });
  get()._rebuildIndexes();

  return instanceElement;
}

/**
 * Master의 자식 서브트리를 재귀적으로 복제
 *
 * 각 자식에 새 ID를 부여하고 parent_id를 새 부모로 연결.
 * 원본 childId → 복제 childId 매핑은 instance.descendants 오버라이드에 활용.
 */
function cloneChildrenSubtree(
  state: ElementsState,
  sourceParentId: string,
  targetParentId: string,
  pageId: string,
): Element[] {
  const children = state.childrenMap.get(sourceParentId);
  if (!children || children.length === 0) return [];

  const result: Element[] = [];

  for (const child of children) {
    const clonedId = uuidv4();
    const clonedChild: Element = {
      ...child,
      id: clonedId,
      parent_id: targetParentId,
      page_id: pageId,
      // 복제된 자식은 일반 요소 (master/instance 아님)
      componentRole: undefined,
      masterId: undefined,
      overrides: undefined,
      descendants: undefined,
      componentName: undefined,
    };

    result.push(clonedChild);

    // 재귀적으로 하위 자식도 복제
    const grandChildren = cloneChildrenSubtree(state, child.id, clonedId, pageId);
    result.push(...grandChildren);
  }

  return result;
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
