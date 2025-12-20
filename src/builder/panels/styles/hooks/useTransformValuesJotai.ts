/**
 * useTransformValuesJotai - Transform 섹션 전용 Jotai 스타일 값 훅
 *
 * 🚀 Phase 3: Fine-grained Reactivity
 * - Jotai atom 기반으로 Transform 섹션 값 구독
 * - 4개 속성만 구독하여 불필요한 리렌더링 최소화
 * - props 전달 없이 atom에서 직접 값 읽기
 *
 * @since 2025-12-20 Phase 3 - Advanced State Management
 */

import { useAtomValue } from 'jotai';
import { transformValuesAtom } from '../atoms/styleAtoms';

export interface TransformStyleValues {
  width: string;
  height: string;
  top: string;
  left: string;
}

/**
 * Transform 섹션 전용 Jotai 스타일 값 훅
 *
 * 기존 useTransformValues와 동일한 인터페이스 반환
 * 하지만 selectedElement props 불필요 - atom에서 직접 읽음
 *
 * @example
 * function TransformSectionContent() {
 *   const styleValues = useTransformValuesJotai();
 *   if (!styleValues) return null;
 *   return <PropertyUnitInput value={styleValues.width} />;
 * }
 */
export function useTransformValuesJotai(): TransformStyleValues | null {
  return useAtomValue(transformValuesAtom);
}

export default useTransformValuesJotai;
