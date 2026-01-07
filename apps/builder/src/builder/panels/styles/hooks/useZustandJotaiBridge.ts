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

import { useEffect } from 'react';
import { useSetAtom } from 'jotai';
import { useStore } from '../../../stores';
import { selectedElementAtom } from '../atoms/styleAtoms';
// Local interface for style panel's selected element (different from inspector's SelectedElement)
interface StylePanelSelectedElement {
  id: string;
  type: string;
  style: Record<string, unknown>;
  computedStyle?: Record<string, unknown>;
  computedLayout?: { width?: number; height?: number }; // 🚀 WebGL computed layout
  className: string;
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

  // Zustand store 구독 - 선택된 요소 변경 시 Jotai atom 업데이트
  useEffect(() => {
    // 초기값 설정
    const state = useStore.getState();
    const initialElement = buildSelectedElement(state);
    setSelectedElement(initialElement as unknown as Parameters<typeof setSelectedElement>[0]);

    // Zustand 구독
    const unsubscribe = useStore.subscribe((state, prevState) => {
      // selectedElementId 또는 selectedElementProps 변경 시에만 업데이트
      if (
        state.selectedElementId !== prevState.selectedElementId ||
        state.selectedElementProps !== prevState.selectedElementProps
      ) {
        const element = buildSelectedElement(state);
        setSelectedElement(element as unknown as Parameters<typeof setSelectedElement>[0]);
      }
    });

    return unsubscribe;
  }, [setSelectedElement]);
}

/**
 * Zustand state에서 SelectedElement 객체 생성
 */
function buildSelectedElement(
  state: ReturnType<typeof useStore.getState>
): StylePanelSelectedElement | null {
  const { selectedElementId, elementsMap, selectedElementProps } = state;

  if (!selectedElementId) return null;

  const element = elementsMap.get(selectedElementId);
  if (!element) return null;

  return {
    id: element.id,
    type: element.tag,
    style: (selectedElementProps?.style ?? (element.props as Record<string, unknown>)?.style ?? {}) as Record<string, unknown>,
    computedStyle: selectedElementProps?.computedStyle as Record<string, unknown> | undefined,
    computedLayout: selectedElementProps?.computedLayout as { width?: number; height?: number } | undefined,
    className: (selectedElementProps?.className as string) ?? ((element.props as Record<string, unknown>)?.className as string) ?? '',
  };
}

export default useZustandJotaiBridge;
