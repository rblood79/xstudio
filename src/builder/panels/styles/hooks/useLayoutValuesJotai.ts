/**
 * useLayoutValuesJotai - Layout 섹션 전용 Jotai 스타일 값 훅
 *
 * 🚀 Phase 3: Fine-grained Reactivity
 * - Jotai atom 기반으로 Layout 섹션 값 구독
 * - 16개 속성만 구독하여 불필요한 리렌더링 최소화
 *
 * @since 2025-12-20 Phase 3 - Advanced State Management
 */

import { useAtomValue } from 'jotai';
import { layoutValuesAtom } from '../atoms/styleAtoms';

export interface LayoutStyleValues {
  display: string;
  flexDirection: string;
  alignItems: string;
  justifyContent: string;
  gap: string;
  flexWrap: string;
  padding: string;
  paddingTop: string;
  paddingRight: string;
  paddingBottom: string;
  paddingLeft: string;
  margin: string;
  marginTop: string;
  marginRight: string;
  marginBottom: string;
  marginLeft: string;
}

/**
 * Layout 섹션 전용 Jotai 스타일 값 훅
 */
export function useLayoutValuesJotai(): LayoutStyleValues | null {
  return useAtomValue(layoutValuesAtom);
}

export default useLayoutValuesJotai;
