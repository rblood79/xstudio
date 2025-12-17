// 🚀 Phase 1: Immer 제거 - 함수형 업데이트로 전환
// import { produce } from "immer"; // REMOVED
import type { StateCreator } from "zustand";
import { ComponentElementProps, Element } from "../../../types/core/store.types";
import { historyManager } from "../history";
import { getElementById, findElementById, createCompleteProps } from "./elementHelpers";
import type { ElementsState } from "../elements";
import { getDB } from "../../../lib/db";

// ============================================
// Types for Batch Operations
// ============================================

export interface BatchElementUpdate {
  elementId: string;
  updates: Partial<Element>;
}

export interface BatchPropsUpdate {
  elementId: string;
  props: ComponentElementProps;
}

type SetState = Parameters<StateCreator<ElementsState>>[0];
type GetState = Parameters<StateCreator<ElementsState>>[1];

function cloneForHistory<T>(value: T): T {
  try {
    if (typeof structuredClone === "function") {
      return structuredClone(value);
    }
  } catch {
    // structuredClone 실패 시 JSON fallback
  }
  try {
    const json = JSON.stringify(value);
    if (json === undefined) return value;
    return JSON.parse(json) as T;
  } catch {
    return value;
  }
}

function hasShallowPatchChanges(
  prev: Record<string, unknown>,
  patch: Record<string, unknown>
): boolean {
  for (const key of Object.keys(patch)) {
    if (prev[key] !== patch[key]) return true;
  }
  return false;
}

/**
 * UpdateElementProps 액션 생성 팩토리
 *
 * 요소의 props만 업데이트하는 로직을 처리합니다.
 *
 * 처리 순서:
 * 1. 메모리 상태 업데이트 (즉시 UI 반영)
 * 2. 히스토리 추가 (Undo/Redo 지원)
 * 3. iframe 업데이트는 PropertyPanel에서 직접 처리 (무한 루프 방지)
 * 4. SaveService는 외부(Preview, PropertyPanel 등)에서 호출
 *
 * @param set - Zustand setState 함수
 * @param get - Zustand getState 함수
 * @returns updateElementProps 액션 함수
 */
export const createUpdateElementPropsAction =
  (set: SetState, get: GetState) =>
  async (elementId: string, props: ComponentElementProps) => {
    const currentState = get();
    // produce 외부에서는 elementsMap 사용 가능
    const element = getElementById(currentState.elementsMap, elementId);
    if (!element) return;

    const patch = (props ?? {}) as Record<string, unknown>;
    if (Object.keys(patch).length === 0) return;
    if (!hasShallowPatchChanges(element.props as Record<string, unknown>, patch)) return;

    const shouldRecordHistory = Boolean(currentState.currentPageId);
    const prevPropsClone = shouldRecordHistory ? cloneForHistory(element.props) : null;
    const newPropsClone = shouldRecordHistory ? cloneForHistory(props) : null;
    const prevElementClone = shouldRecordHistory ? cloneForHistory(element) : null;

    // 🚀 Phase 1: Immer → 함수형 업데이트
    // 1. 히스토리 추가 (상태 변경 전에 기록)
    if (currentState.currentPageId && prevPropsClone && newPropsClone && prevElementClone) {
      historyManager.addEntry({
        type: "update",
        elementId: elementId,
        data: {
          props: newPropsClone,
          prevProps: prevPropsClone,
          prevElement: prevElementClone,
        },
      });
    }

    // 2. 메모리 상태 업데이트 (불변 업데이트)
    const updatedElements = currentState.elements.map((el) =>
      el.id === elementId ? { ...el, props: { ...el.props, ...props } } : el
    );

    // 선택된 요소가 업데이트된 경우 selectedElementProps도 업데이트
    const updatedElement = updatedElements.find((el) => el.id === elementId);
    const selectedElementProps =
      currentState.selectedElementId === elementId && updatedElement
        ? createCompleteProps(updatedElement, props)
        : currentState.selectedElementProps;

    set({
      elements: updatedElements,
      selectedElementProps,
    });

    // 🔧 CRITICAL: elementsMap 재구축 (재선택 시 이전 값 반환 방지)
    // Immer produce() 외부에서 호출 (Map은 Immer가 직접 지원하지 않음)
    get()._rebuildIndexes();

    // 2. iframe 업데이트는 PropertyPanel에서 직접 처리하도록 변경 (무한 루프 방지)

    // 3. IndexedDB에 저장 (로컬 우선 저장)
    try {
      const db = await getDB();
      await db.elements.update(elementId, { props });
    } catch (error) {
      console.warn("⚠️ [IndexedDB] 요소 저장 중 오류 (메모리는 정상):", error);
      // IndexedDB 저장 실패해도 메모리 상태는 유지 (오프라인 작업 지속)
    }
  };

/**
 * UpdateElement 액션 생성 팩토리
 *
 * 요소의 전체 속성(props, dataBinding 등)을 업데이트하는 로직을 처리합니다.
 *
 * 처리 순서:
 * 1. 메모리 상태 업데이트
 * 2. 히스토리 추가 (props 변경 시)
 * 3. SaveService는 외부에서 관리 (useSyncWithBuilder)
 *
 * @param set - Zustand setState 함수
 * @param get - Zustand getState 함수
 * @returns updateElement 액션 함수
 */
export const createUpdateElementAction =
  (set: SetState, get: GetState) =>
  async (elementId: string, updates: Partial<import("../../../types/core/store.types").Element>) => {
    if (Object.keys(updates).length === 0) return;

    const currentState = get();
    // produce 외부에서는 elementsMap 사용 가능
    const element = getElementById(currentState.elementsMap, elementId);
    if (!element) return;

    const shouldRecordHistory = Boolean(currentState.currentPageId) && Boolean(updates.props);
    const prevPropsClone =
      shouldRecordHistory ? cloneForHistory(element.props) : null;
    const newPropsClone =
      shouldRecordHistory ? cloneForHistory(updates.props) : null;
    const prevElementClone =
      shouldRecordHistory ? cloneForHistory(element) : null;

    // 🚀 Phase 1: Immer → 함수형 업데이트
    // 1. 히스토리 추가 (상태 변경 전에 기록)
    if (currentState.currentPageId && updates.props && prevPropsClone && newPropsClone && prevElementClone) {
      historyManager.addEntry({
        type: "update",
        elementId: elementId,
        data: {
          props: newPropsClone,
          prevProps: prevPropsClone,
          prevElement: prevElementClone,
        },
      });
    }

    // 2. 메모리 상태 업데이트 (불변 업데이트)
    const updatedElements = currentState.elements.map((el) =>
      el.id === elementId ? { ...el, ...updates } : el
    );

    // 선택된 요소가 업데이트된 경우 props도 업데이트
    const updatedElement = updatedElements.find((el) => el.id === elementId);
    const selectedElementProps =
      currentState.selectedElementId === elementId && updates.props && updatedElement
        ? createCompleteProps(updatedElement, updates.props)
        : currentState.selectedElementProps;

    set({
      elements: updatedElements,
      selectedElementProps,
    });

    // 🔧 CRITICAL: elementsMap 재구축 (재선택 시 이전 값 반환 방지)
    // Immer produce() 외부에서 호출 (Map은 Immer가 직접 지원하지 않음)
    get()._rebuildIndexes();

    // 2. IndexedDB에 저장 (로컬 우선 저장)
    try {
      const db = await getDB();
      await db.elements.update(elementId, updates);
    } catch (error) {
      console.warn("⚠️ [IndexedDB] 요소 저장 중 오류 (메모리는 정상):", error);
      // IndexedDB 저장 실패해도 메모리 상태는 유지 (오프라인 작업 지속)
    }
  };

// ============================================
// 🚀 Batch Operations (100+ 요소 최적화)
// ============================================

/**
 * BatchUpdateElementProps 액션 생성 팩토리
 *
 * 여러 요소의 props를 한 번에 업데이트합니다.
 * 100개 이상의 요소를 동시에 업데이트할 때 성능 최적화됨.
 *
 * 최적화 포인트:
 * - 단일 Zustand 상태 업데이트 (N번 → 1번)
 * - 단일 히스토리 엔트리 (batch 타입)
 * - 단일 인덱스 재구축 (N번 → 1번)
 * - IndexedDB 병렬 저장 (Promise.all)
 *
 * @param set - Zustand setState 함수
 * @param get - Zustand getState 함수
 * @returns batchUpdateElementProps 액션 함수
 */
export const createBatchUpdateElementPropsAction =
  (set: SetState, get: GetState) =>
  async (updates: BatchPropsUpdate[]) => {
    if (updates.length === 0) return;

    const state = get();
    const validUpdates = updates.filter(
      (u) => getElementById(state.elementsMap, u.elementId) !== undefined
    );

    if (validUpdates.length === 0) return;

    // 🚀 Phase 1: Immer → 함수형 업데이트
    // 1. 히스토리용 이전 상태 저장 (불변 업데이트를 위해 먼저 수집)
    const prevStates: Array<{
      elementId: string;
      prevProps: ComponentElementProps;
      prevElement: Element;
    }> = [];

    // 업데이트 맵 생성 (O(1) 조회용)
    const updateMap = new Map<string, ComponentElementProps>();
    for (const { elementId, props } of validUpdates) {
      const element = getElementById(state.elementsMap, elementId);
      if (element) {
        prevStates.push({
          elementId,
          prevProps: cloneForHistory(element.props),
          prevElement: cloneForHistory(element),
        });
        updateMap.set(elementId, props);
      }
    }

    // 2. 단일 메모리 상태 업데이트 (불변)
    const updatedElements = state.elements.map((el) => {
      const props = updateMap.get(el.id);
      return props ? { ...el, props: { ...el.props, ...props } } : el;
    });

    // 선택된 요소 props 업데이트
    const selectedId = state.selectedElementId;
    const selectedProps = selectedId && updateMap.has(selectedId)
      ? (() => {
          const el = updatedElements.find((e) => e.id === selectedId);
          return el ? createCompleteProps(el, updateMap.get(selectedId)!) : state.selectedElementProps;
        })()
      : state.selectedElementProps;

    set({
      elements: updatedElements,
      selectedElementProps: selectedProps,
    });

    // 2. 단일 히스토리 엔트리 추가 (batch 타입)
    const currentPageId = get().currentPageId;
    if (currentPageId && prevStates.length > 0) {
      historyManager.addEntry({
        type: "batch",
        elementId: prevStates[0].elementId, // 대표 요소
        data: {
          batchUpdates: validUpdates.map((u, i) => ({
            elementId: u.elementId,
            props: cloneForHistory(u.props),
            prevProps: prevStates[i]?.prevProps,
            prevElement: prevStates[i]?.prevElement,
          })),
        },
      });
    }

    // 3. 단일 인덱스 재구축
    get()._rebuildIndexes();

    // 4. IndexedDB 병렬 저장
    try {
      const db = await getDB();
      await Promise.all(
        validUpdates.map(({ elementId, props }) =>
          db.elements.update(elementId, { props })
        )
      );
    } catch (error) {
      console.warn("⚠️ [IndexedDB] 배치 저장 중 오류 (메모리는 정상):", error);
    }
  };

/**
 * BatchUpdateElements 액션 생성 팩토리
 *
 * 여러 요소의 전체 속성을 한 번에 업데이트합니다.
 * props, dataBinding 등 모든 필드 지원.
 *
 * @param set - Zustand setState 함수
 * @param get - Zustand getState 함수
 * @returns batchUpdateElements 액션 함수
 */
export const createBatchUpdateElementsAction =
  (set: SetState, get: GetState) =>
  async (updates: BatchElementUpdate[]) => {
    if (updates.length === 0) return;

    const state = get();
    const validUpdates = updates.filter(
      (u) => getElementById(state.elementsMap, u.elementId) !== undefined
    );

    if (validUpdates.length === 0) return;

    // 🚀 Phase 1: Immer → 함수형 업데이트
    // 1. 히스토리용 이전 상태 저장 (props 변경 시에만)
    const prevStates: Array<{
      elementId: string;
      prevProps: ComponentElementProps;
      prevElement: Element;
    }> = [];

    // 업데이트 맵 생성 (O(1) 조회용)
    const updateMap = new Map<string, Partial<Element>>();
    for (const { elementId, updates: elementUpdates } of validUpdates) {
      const element = getElementById(state.elementsMap, elementId);
      if (element) {
        if (elementUpdates.props) {
          prevStates.push({
            elementId,
            prevProps: cloneForHistory(element.props),
            prevElement: cloneForHistory(element),
          });
        }
        updateMap.set(elementId, elementUpdates);
      }
    }

    // 2. 단일 메모리 상태 업데이트 (불변)
    const updatedElements = state.elements.map((el) => {
      const updates = updateMap.get(el.id);
      return updates ? { ...el, ...updates } : el;
    });

    // 선택된 요소 props 업데이트
    const selectedId = state.selectedElementId;
    const selectedUpdate = selectedId ? updateMap.get(selectedId) : undefined;
    const selectedProps = selectedId && selectedUpdate?.props
      ? (() => {
          const el = updatedElements.find((e) => e.id === selectedId);
          return el ? createCompleteProps(el, selectedUpdate.props!) : state.selectedElementProps;
        })()
      : state.selectedElementProps;

    set({
      elements: updatedElements,
      selectedElementProps: selectedProps,
    });

    // 2. 단일 히스토리 엔트리 추가 (batch 타입)
    const currentPageId = get().currentPageId;
    if (currentPageId && prevStates.length > 0) {
      historyManager.addEntry({
        type: "batch",
        elementId: prevStates[0].elementId,
        data: {
          batchUpdates: prevStates.map((ps, i) => ({
            elementId: ps.elementId,
            props: validUpdates[i]?.updates.props
              ? cloneForHistory(validUpdates[i].updates.props)
              : undefined,
            prevProps: ps.prevProps,
            prevElement: ps.prevElement,
          })),
        },
      });
    }

    // 3. 단일 인덱스 재구축
    get()._rebuildIndexes();

    // 4. IndexedDB 병렬 저장
    try {
      const db = await getDB();
      await Promise.all(
        validUpdates.map(({ elementId, updates: elementUpdates }) =>
          db.elements.update(elementId, elementUpdates)
        )
      );
    } catch (error) {
      console.warn("⚠️ [IndexedDB] 배치 저장 중 오류 (메모리는 정상):", error);
    }
  };
