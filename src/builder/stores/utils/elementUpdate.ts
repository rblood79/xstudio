import { produce } from "immer";
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

    // 1. 메모리 상태 업데이트 (우선)
    set(
      produce((draftState: ElementsState) => {
        // produce 내부에서는 배열 순회 사용 (elementsMap은 아직 재구축 전)
        const element = findElementById(draftState.elements, elementId);
        if (!element) return;

        // 히스토리 추가
        if (draftState.currentPageId && prevPropsClone && newPropsClone && prevElementClone) {
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

        // 요소 업데이트
        element.props = { ...element.props, ...props };

        // 선택된 요소가 업데이트된 경우 selectedElementProps도 업데이트
        if (draftState.selectedElementId === elementId) {
          draftState.selectedElementProps = createCompleteProps(element, props);
        }
      })
    );

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

    // 1. 메모리 상태 업데이트
    set(
      produce((draftState: ElementsState) => {
        // produce 내부에서는 배열 순회 사용 (elementsMap은 아직 재구축 전)
        const element = findElementById(draftState.elements, elementId);
        if (!element) return;

        // 히스토리 추가 (updateElementProps와 동일한 로직)
        if (draftState.currentPageId && updates.props && prevPropsClone && newPropsClone && prevElementClone) {
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

        // 요소 업데이트 (props, dataBinding 등)
        Object.assign(element, updates);

        // 선택된 요소가 업데이트된 경우 props도 업데이트
        if (draftState.selectedElementId === elementId && updates.props) {
          draftState.selectedElementProps = createCompleteProps(
            element,
            updates.props
          );
        }
      })
    );

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

    // 히스토리용 이전 상태 저장
    const prevStates: Array<{
      elementId: string;
      prevProps: ComponentElementProps;
      prevElement: Element;
    }> = [];

    // 1. 단일 메모리 상태 업데이트
    set(
      produce((state: ElementsState) => {
        for (const { elementId, props } of validUpdates) {
          const element = findElementById(state.elements, elementId);
          if (!element) continue;

          // 히스토리용 이전 상태 저장 (Immer proxy 해제)
          prevStates.push({
            elementId,
            prevProps: cloneForHistory(element.props),
            prevElement: cloneForHistory(element),
          });

          // 요소 업데이트
          element.props = { ...element.props, ...props };

          // 선택된 요소 props 업데이트
          if (state.selectedElementId === elementId) {
            state.selectedElementProps = createCompleteProps(element, props);
          }
        }
      })
    );

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

    // 히스토리용 이전 상태 저장
    const prevStates: Array<{
      elementId: string;
      prevProps: ComponentElementProps;
      prevElement: Element;
    }> = [];

    // 1. 단일 메모리 상태 업데이트
    set(
      produce((state: ElementsState) => {
        for (const { elementId, updates: elementUpdates } of validUpdates) {
          const element = findElementById(state.elements, elementId);
          if (!element) continue;

          // 히스토리용 이전 상태 저장 (props 변경 시에만)
          if (elementUpdates.props) {
            prevStates.push({
              elementId,
              prevProps: cloneForHistory(element.props),
              prevElement: cloneForHistory(element),
            });
          }

          // 요소 업데이트
          Object.assign(element, elementUpdates);

          // 선택된 요소 props 업데이트
          if (state.selectedElementId === elementId && elementUpdates.props) {
            state.selectedElementProps = createCompleteProps(
              element,
              elementUpdates.props
            );
          }
        }
      })
    );

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
