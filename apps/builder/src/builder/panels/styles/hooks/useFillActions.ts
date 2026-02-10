/**
 * Fill Actions Hook
 *
 * Color Picker Phase 1: Fill 배열 CRUD 액션
 * - fills 배열을 복사 → 변경 → store.updateSelectedFills() 호출
 * - 프리뷰 액션은 store.updateSelectedFillsPreview() 사용
 *
 * @since 2026-02-10 Color Picker Phase 1
 */

import { useCallback } from 'react';
import { useStore } from '../../../stores';
import type { FillItem, ColorFillItem } from '../../../../types/builder/fill.types';
import { FillType, createDefaultColorFill } from '../../../../types/builder/fill.types';

export interface FillActions {
  addFill: (type?: FillType) => void;
  removeFill: (fillId: string) => void;
  reorderFill: (fromIndex: number, toIndex: number) => void;
  toggleFill: (fillId: string) => void;
  updateFill: (fillId: string, updates: Partial<FillItem>) => void;
  updateFillPreview: (fillId: string, updates: Partial<FillItem>) => void;
}

/**
 * fills 배열의 현재 값을 가져오는 헬퍼
 * elementsMap에서 선택된 요소의 fills를 직접 읽음
 */
function getCurrentFills(): FillItem[] {
  const state = useStore.getState();
  const { selectedElementId, elementsMap } = state;
  if (!selectedElementId) return [];
  const element = elementsMap.get(selectedElementId);
  return element?.fills ?? [];
}

export function useFillActions(): FillActions {
  const addFill = useCallback((type: FillType = FillType.Color) => {
    const fills = getCurrentFills();
    const newFill = createDefaultColorFill('#000000FF');
    // Phase 1: Color 타입만 지원
    if (type !== FillType.Color) return;
    const newFills = [...fills, newFill];
    useStore.getState().updateSelectedFills(newFills);
  }, []);

  const removeFill = useCallback((fillId: string) => {
    const fills = getCurrentFills();
    const newFills = fills.filter((f) => f.id !== fillId);
    useStore.getState().updateSelectedFills(newFills);
  }, []);

  const reorderFill = useCallback((fromIndex: number, toIndex: number) => {
    const fills = getCurrentFills();
    if (fromIndex < 0 || fromIndex >= fills.length) return;
    if (toIndex < 0 || toIndex >= fills.length) return;
    if (fromIndex === toIndex) return;

    const newFills = [...fills];
    const [moved] = newFills.splice(fromIndex, 1);
    newFills.splice(toIndex, 0, moved);
    useStore.getState().updateSelectedFills(newFills);
  }, []);

  const toggleFill = useCallback((fillId: string) => {
    const fills = getCurrentFills();
    const newFills = fills.map((f) =>
      f.id === fillId ? { ...f, enabled: !f.enabled } : f
    );
    useStore.getState().updateSelectedFills(newFills);
  }, []);

  const updateFill = useCallback((fillId: string, updates: Partial<FillItem>) => {
    const fills = getCurrentFills();
    const newFills = fills.map((f) => {
      if (f.id !== fillId) return f;
      // ColorFillItem 업데이트 (Phase 1)
      if (f.type === FillType.Color) {
        return { ...f, ...updates } as ColorFillItem;
      }
      return { ...f, ...updates } as FillItem;
    });
    useStore.getState().updateSelectedFills(newFills);
  }, []);

  const updateFillPreview = useCallback((fillId: string, updates: Partial<FillItem>) => {
    const fills = getCurrentFills();
    const newFills = fills.map((f) => {
      if (f.id !== fillId) return f;
      if (f.type === FillType.Color) {
        return { ...f, ...updates } as ColorFillItem;
      }
      return { ...f, ...updates } as FillItem;
    });
    useStore.getState().updateSelectedFillsPreview(newFills);
  }, []);

  return { addFill, removeFill, reorderFill, toggleFill, updateFill, updateFillPreview };
}
