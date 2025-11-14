import { produce } from "immer";
import type { StateCreator } from "zustand";
import { ComponentElementProps } from "../../../types/core/store.types";
import { historyManager } from "../history";
import { findElementById, createCompleteProps } from "./elementHelpers";
import type { ElementsState } from "../elements";

type SetState = Parameters<StateCreator<ElementsState>>[0];
type GetState = Parameters<StateCreator<ElementsState>>[1];

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
    const state = get();
    const element = findElementById(state.elements, elementId);
    if (!element) return;

    console.log("🔧 updateElementProps 호출:", {
      elementId,
      elementTag: element.tag,
      변경props: props,
      호출위치: new Error().stack?.split("\n")[2]?.trim(),
    });

    // 1. 메모리 상태 업데이트 (우선)
    set(
      produce((state: ElementsState) => {
        const element = findElementById(state.elements, elementId);
        if (!element) return;

        // 히스토리 추가
        if (state.currentPageId) {
          // Immer proxy 문제 방지: 깊은 복사로 순수 객체 생성
          const prevPropsClone = JSON.parse(JSON.stringify(element.props));
          const newPropsClone = JSON.parse(JSON.stringify(props));
          const prevElementClone = JSON.parse(JSON.stringify(element));

          console.log("📝 Props 변경 히스토리 추가:", {
            elementId,
            elementTag: element.tag,
            prevProps: prevPropsClone,
            newProps: newPropsClone,
          });
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
        if (state.selectedElementId === elementId) {
          state.selectedElementProps = createCompleteProps(element, props);
        }
      })
    );

    // 🔧 CRITICAL: elementsMap 재구축 (재선택 시 이전 값 반환 방지)
    // Immer produce() 외부에서 호출 (Map은 Immer가 직접 지원하지 않음)
    get()._rebuildIndexes();

    // 2. iframe 업데이트는 PropertyPanel에서 직접 처리하도록 변경 (무한 루프 방지)

    // 3. SaveService는 외부(Preview, PropertyPanel 등)에서 호출하도록 변경
    // 이유: store slice 내부에서 동적 import 사용 시 store 인스턴스 불일치 발생
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
    const state = get();
    const element = findElementById(state.elements, elementId);
    if (!element) return;

    console.log("🔄 updateElement 호출:", {
      elementId,
      elementTag: element.tag,
      updates,
      hasDataBinding: !!updates.dataBinding,
    });

    // 1. 메모리 상태 업데이트
    set(
      produce((state: ElementsState) => {
        const element = findElementById(state.elements, elementId);
        if (!element) return;

        // 히스토리 추가 (updateElementProps와 동일한 로직)
        if (state.currentPageId && updates.props) {
          // Immer proxy 문제 방지: 깊은 복사로 순수 객체 생성
          const prevPropsClone = JSON.parse(JSON.stringify(element.props));
          const newPropsClone = JSON.parse(JSON.stringify(updates.props));
          const prevElementClone = JSON.parse(JSON.stringify(element));

          console.log("📝 Element 변경 히스토리 추가:", {
            elementId,
            elementTag: element.tag,
            prevProps: prevPropsClone,
            newProps: newPropsClone,
          });
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
        if (state.selectedElementId === elementId && updates.props) {
          state.selectedElementProps = createCompleteProps(
            element,
            updates.props
          );
        }
      })
    );

    // 🔧 CRITICAL: elementsMap 재구축 (재선택 시 이전 값 반환 방지)
    // Immer produce() 외부에서 호출 (Map은 Immer가 직접 지원하지 않음)
    get()._rebuildIndexes();

    // 2. SaveService를 통한 저장 (실시간/수동 모드 확인)
    // useSyncWithBuilder에서 이미 saveService를 호출하므로 여기서는 중복 저장 방지
    // 주석 처리: saveService가 useSyncWithBuilder에서 관리
  };
