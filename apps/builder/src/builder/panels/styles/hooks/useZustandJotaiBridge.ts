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

import { useLayoutEffect } from 'react';
import { useSetAtom } from 'jotai';
import { useStore } from '../../../stores';
import { selectedElementAtom } from '../atoms/styleAtoms';
import type { FillItem } from '../../../../types/builder/fill.types';
import { ensureFills } from '../utils/fillMigration';
// Local interface for style panel's selected element (different from inspector's SelectedElement)
interface StylePanelSelectedElement {
  id: string;
  type: string;
  style: Record<string, unknown>;
  computedStyle?: Record<string, unknown>;
  computedLayout?: { width?: number; height?: number }; // 🚀 WebGL computed layout
  className: string;
  fills?: FillItem[];
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
  // useLayoutEffect: paint 전에 초기값을 설정하여 첫 프레임 깜빡임 방지
  useLayoutEffect(() => {
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

  // selectedElementProps가 비어있을 때(hydration 대기 중) element.props에서 직접 읽기
  const hasValidProps = selectedElementProps
    && Object.keys(selectedElementProps).length > 0;
  const effectiveProps = hasValidProps
    ? selectedElementProps
    : (element.props as Record<string, unknown>);

  // fills: element.fills 직접 읽기, 없으면 backgroundColor에서 마이그레이션
  const style = (effectiveProps?.style ?? {}) as Record<string, unknown>;
  const fills = ensureFills(
    element.fills,
    style.backgroundColor as string | undefined,
  );

  return {
    id: element.id,
    type: element.tag,
    style,
    computedStyle: effectiveProps?.computedStyle as Record<string, unknown> | undefined,
    computedLayout: effectiveProps?.computedLayout as { width?: number; height?: number } | undefined,
    className: (effectiveProps?.className as string) ?? '',
    fills,
  };
}

export default useZustandJotaiBridge;
