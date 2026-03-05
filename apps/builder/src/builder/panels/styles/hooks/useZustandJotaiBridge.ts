/**
 * Zustand-Jotai Bridge Hook
 *
 * 🚀 Phase 3: Fine-grained Reactivity
 * - Zustand store의 selectedElement를 Jotai atom과 동기화
 * - 단방향 동기화: Zustand → Jotai (source of truth는 Zustand)
 * - 점진적 마이그레이션을 위한 브릿지 패턴
 *
 * @since 2025-12-20 Phase 3 - Advanced State Management
 */

import { useLayoutEffect } from "react";
import { useSetAtom } from "jotai";
import { useStore } from "../../../stores";
import { selectedElementAtom } from "../atoms/styleAtoms";
import { previewComponentStateAtom } from "../atoms/componentStateAtom";
import type { FillItem } from "../../../../types/builder/fill.types";
import { ensureFills } from "../utils/fillMigration";
// Local interface for style panel's selected element (different from inspector's SelectedElement)
interface StylePanelSelectedElement {
  id: string;
  type: string;
  style: Record<string, unknown>;
  computedStyle?: Record<string, unknown>;
  computedLayout?: { width?: number; height?: number }; // 🚀 WebGL computed layout
  className: string;
  fills?: FillItem[];
  properties?: { size?: string; variant?: string; [key: string]: unknown };
}

/**
 * Zustand store의 선택된 요소를 Jotai atom과 동기화하는 훅
 *
 * 사용법:
 * - StylePanel 최상위에서 한 번만 호출
 * - 이후 하위 컴포넌트는 Jotai atoms 직접 구독
 *
 * @example
 * function StylePanel() {
 *   useZustandJotaiBridge();
 *   return <TransformSection />;
 * }
 */
export function useZustandJotaiBridge(): void {
  const setSelectedElement = useSetAtom(selectedElementAtom);
  // 요소 선택 변경 시 컴포넌트 상태 미리보기를 초기화하는 setter
  const setPreviewComponentState = useSetAtom(previewComponentStateAtom);

  // Zustand store 구독 - 선택된 요소 변경 시 Jotai atom 업데이트
  // useLayoutEffect: paint 전에 초기값을 설정하여 첫 프레임 깜빡임 방지
  useLayoutEffect(() => {
    // 초기값 설정
    const state = useStore.getState();
    const initialElement = buildSelectedElement(state);
    setSelectedElement(
      initialElement as unknown as Parameters<typeof setSelectedElement>[0],
    );

    // Zustand 구독
    const unsubscribe = useStore.subscribe((state, prevState) => {
      // selectedElementId, selectedElementProps, 또는 elementsMap 변경 시 업데이트
      // elementsMap: 부모 체인의 스타일 변경 시 상속값 재계산 필요
      if (
        state.selectedElementId !== prevState.selectedElementId ||
        state.selectedElementProps !== prevState.selectedElementProps ||
        state.elementsMap !== prevState.elementsMap
      ) {
        const element = buildSelectedElement(state);
        setSelectedElement(
          element as unknown as Parameters<typeof setSelectedElement>[0],
        );

        // 선택된 요소가 바뀌면 컴포넌트 상태 미리보기를 default(null)로 리셋
        // → 이전 요소의 hover/pressed 상태가 다음 요소에 남아있지 않도록 방지
        if (state.selectedElementId !== prevState.selectedElementId) {
          setPreviewComponentState(null);
        }
      }
    });

    return unsubscribe;
  }, [setSelectedElement, setPreviewComponentState]);
}

/** CSS 상속 가능 속성 — 스타일 패널에서 부모 체인 탐색 대상 */
const STYLE_PANEL_INHERITABLE = new Set([
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "lineHeight",
  "letterSpacing",
  "color",
  "textAlign",
  "textTransform",
]);

/**
 * 부모 체인을 탐색하여 CSS 상속 속성의 resolved 값을 반환
 */
function resolveInheritedStyle(
  element: { parent_id?: string | null },
  elementsMap: Map<
    string,
    { parent_id?: string | null; props: Record<string, unknown> }
  >,
): Record<string, unknown> {
  const inherited: Record<string, unknown> = {};
  const remaining = new Set(STYLE_PANEL_INHERITABLE);

  let currentId = element.parent_id;
  while (currentId && remaining.size > 0) {
    const parent = elementsMap.get(currentId);
    if (!parent) break;

    const parentStyle = (parent.props?.style ?? {}) as Record<string, unknown>;
    for (const prop of [...remaining]) {
      const val = parentStyle[prop];
      if (val !== undefined && val !== null && val !== "") {
        inherited[prop] = val;
        remaining.delete(prop);
      }
    }

    currentId = parent.parent_id;
  }

  return inherited;
}

/**
 * Zustand state에서 SelectedElement 객체 생성
 */
function buildSelectedElement(
  state: ReturnType<typeof useStore.getState>,
): StylePanelSelectedElement | null {
  const { selectedElementId, elementsMap, selectedElementProps } = state;

  if (!selectedElementId) return null;

  const element = elementsMap.get(selectedElementId);
  if (!element) return null;

  // selectedElementProps가 비어있을 때(hydration 대기 중) element.props에서 직접 읽기
  const hasValidProps =
    selectedElementProps && Object.keys(selectedElementProps).length > 0;
  const effectiveProps = hasValidProps
    ? selectedElementProps
    : (element.props as Record<string, unknown>);

  // fills: element.fills 직접 읽기, 없으면 backgroundColor에서 마이그레이션
  const style = (effectiveProps?.style ?? {}) as Record<string, unknown>;
  const fills = ensureFills(
    element.fills,
    style.backgroundColor as string | undefined,
  );

  // CSS 상속 속성 해결: 부모 체인 탐색 → computedStyle에 병합
  const inheritedStyle = resolveInheritedStyle(element, elementsMap);
  const explicitComputed = effectiveProps?.computedStyle as
    | Record<string, unknown>
    | undefined;

  // properties: size/variant 등 컴포넌트 고유 속성 → computeSyntheticStyle에서 사용
  const size = effectiveProps?.size as string | undefined;
  const variant = effectiveProps?.variant as string | undefined;

  return {
    id: element.id,
    type: element.tag,
    style,
    computedStyle: { ...inheritedStyle, ...(explicitComputed ?? {}) },
    computedLayout: effectiveProps?.computedLayout as
      | { width?: number; height?: number }
      | undefined,
    className: (effectiveProps?.className as string) ?? "",
    fills,
    properties:
      size !== undefined || variant !== undefined
        ? { size, variant }
        : undefined,
  };
}

export default useZustandJotaiBridge;
