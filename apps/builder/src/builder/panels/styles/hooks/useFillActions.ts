/**
 * Fill Actions Hook
 *
 * Gradient Phase 2: Fill 배열 CRUD 액션 + 타입 변경
 * - fills 배열을 복사 → 변경 → store.updateSelectedFills() 호출
 * - 프리뷰 액션은 store.updateSelectedFillsPreview() 사용
 * - changeFillType: Color ↔ Gradient 타입 전환
 *
 * @since 2026-02-10 Color Picker Phase 1
 * @updated 2026-02-10 Gradient Phase 2
 */

import { useCallback } from 'react';
import { useStore } from '../../../stores';
import type { FillItem, ColorFillItem, GradientStop } from '../../../../types/builder/fill.types';
import { FillType, createDefaultColorFill, createDefaultFill } from '../../../../types/builder/fill.types';

export interface FillActions {
  addFill: (type?: FillType, initialColor?: string) => void;
  removeFill: (fillId: string) => void;
  reorderFill: (fromIndex: number, toIndex: number) => void;
  toggleFill: (fillId: string) => void;
  updateFill: (fillId: string, updates: Partial<FillItem>) => void;
  updateFillPreview: (fillId: string, updates: Partial<FillItem>) => void;
  changeFillType: (fillId: string, newType: FillType) => void;
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
  const addFill = useCallback((type: FillType = FillType.Color, initialColor?: string) => {
    const fills = getCurrentFills();
    const newFill = initialColor && type === FillType.Color
      ? createDefaultColorFill(initialColor)
      : createDefaultFill(type);
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
      return { ...f, ...updates } as FillItem;
    });
    useStore.getState().updateSelectedFills(newFills);
  }, []);

  const updateFillPreview = useCallback((fillId: string, updates: Partial<FillItem>) => {
    const fills = getCurrentFills();
    const newFills = fills.map((f) => {
      if (f.id !== fillId) return f;
      return { ...f, ...updates } as FillItem;
    });
    useStore.getState().updateSelectedFillsPreview(newFills);
  }, []);

  const changeFillType = useCallback((fillId: string, newType: FillType) => {
    const fills = getCurrentFills();
    const newFills = fills.map((f) => {
      if (f.id !== fillId) return f;

      const isCurrentColor = f.type === FillType.Color;
      const isCurrentGradient =
        f.type === FillType.LinearGradient ||
        f.type === FillType.RadialGradient ||
        f.type === FillType.AngularGradient;
      const isNewGradient =
        newType === FillType.LinearGradient ||
        newType === FillType.RadialGradient ||
        newType === FillType.AngularGradient;

      // Color → Gradient
      if (isCurrentColor && isNewGradient) {
        const colorFill = f as ColorFillItem;
        const base = createDefaultFill(newType);
        return {
          ...base,
          id: f.id,
          enabled: f.enabled,
          opacity: f.opacity,
          stops: [
            { color: colorFill.color, position: 0 },
            { color: '#FFFFFFFF', position: 1 },
          ],
        } as FillItem;
      }

      // Gradient → Color
      if (isCurrentGradient && newType === FillType.Color) {
        const gradFill = f as { stops?: GradientStop[] };
        const color = gradFill.stops?.[0]?.color ?? '#000000FF';
        return {
          ...createDefaultColorFill(color),
          id: f.id,
          enabled: f.enabled,
          opacity: f.opacity,
        };
      }

      // Gradient → Gradient (타입만 변경, stops 유지)
      if (isCurrentGradient && isNewGradient) {
        const base = createDefaultFill(newType);
        const currentStops = (f as { stops?: GradientStop[] }).stops;
        return {
          ...base,
          id: f.id,
          enabled: f.enabled,
          opacity: f.opacity,
          ...(currentStops ? { stops: currentStops } : {}),
        } as FillItem;
      }

      // Any → Image / Image → Any (기본값으로 전환)
      const base = createDefaultFill(newType);
      return {
        ...base,
        id: f.id,
        enabled: f.enabled,
        opacity: f.opacity,
      } as FillItem;
    });
    useStore.getState().updateSelectedFills(newFills);
  }, []);

  return { addFill, removeFill, reorderFill, toggleFill, updateFill, updateFillPreview, changeFillType };
}
