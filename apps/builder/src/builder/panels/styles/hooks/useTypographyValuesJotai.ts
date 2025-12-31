/**
 * useTypographyValuesJotai - Typography 섹션 전용 Jotai 스타일 값 훅
 *
 * 🚀 Phase 3: Fine-grained Reactivity
 * - Jotai atom 기반으로 Typography 섹션 값 구독
 * - 11개 속성만 구독하여 불필요한 리렌더링 최소화
 *
 * @since 2025-12-20 Phase 3 - Advanced State Management
 */

import { useAtomValue } from 'jotai';
import { typographyValuesAtom } from '../atoms/styleAtoms';

export interface TypographyStyleValues {
  fontFamily: string;
  fontSize: string;
  fontWeight: string;
  fontStyle: string;
  lineHeight: string;
  letterSpacing: string;
  color: string;
  textAlign: string;
  textDecoration: string;
  textTransform: string;
  verticalAlign: string;
}

/**
 * Typography 섹션 전용 Jotai 스타일 값 훅
 */
export function useTypographyValuesJotai(): TypographyStyleValues | null {
  return useAtomValue(typographyValuesAtom);
}

export default useTypographyValuesJotai;
