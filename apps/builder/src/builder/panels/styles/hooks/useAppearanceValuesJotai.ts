/**
 * useAppearanceValuesJotai - Appearance 섹션 전용 Jotai 스타일 값 훅
 *
 * 🚀 Phase 3: Fine-grained Reactivity
 * - Jotai atom 기반으로 Appearance 섹션 값 구독
 * - 5개 속성만 구독하여 불필요한 리렌더링 최소화
 *
 * @since 2025-12-20 Phase 3 - Advanced State Management
 */

import { useAtomValue } from 'jotai';
import { appearanceValuesAtom } from '../atoms/styleAtoms';

export interface AppearanceStyleValues {
  backgroundColor: string;
  borderColor: string;
  borderWidth: string;
  borderRadius: string;
  borderStyle: string;
}

/**
 * Appearance 섹션 전용 Jotai 스타일 값 훅
 */
export function useAppearanceValuesJotai(): AppearanceStyleValues | null {
  return useAtomValue(appearanceValuesAtom);
}

export default useAppearanceValuesJotai;
