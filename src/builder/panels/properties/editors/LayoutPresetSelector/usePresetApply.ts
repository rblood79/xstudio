/**
 * usePresetApply - 프리셋 적용 훅
 *
 * Phase 6: Layout 프리셋 적용 핵심 로직
 *
 * 핵심 기능:
 * 1. 기존 Slot 감지
 * 2. 모드별 처리 (replace/merge/cancel)
 * 3. Slot 일괄 생성 (addComplexElement 패턴)
 * 4. History 단일 엔트리 기록
 */

import { useCallback, useMemo, useState } from "react";
import { useStore } from "../../../../stores";
import { LAYOUT_PRESETS } from "./presetDefinitions";
import type {
  PresetApplyMode,
  ExistingSlotInfo,
  SlotDefinition,
} from "./types";
import type { Element } from "../../../../../types/builder/unified.types";

interface UsePresetApplyOptions {
  /** Layout ID */
  layoutId: string;
  /** Body Element ID */
  bodyElementId: string;
}

interface UsePresetApplyReturn {
  /** 현재 Layout의 기존 Slot 목록 */
  existingSlots: ExistingSlotInfo[];
  /** 프리셋 적용 함수 */
  applyPreset: (presetKey: string, mode: PresetApplyMode) => Promise<void>;
  /** 적용 중 여부 */
  isApplying: boolean;
}

/**
 * 프리셋 적용 훅
 */
export function usePresetApply({
  layoutId,
  bodyElementId,
}: UsePresetApplyOptions): UsePresetApplyReturn {
  const [isApplying, setIsApplying] = useState(false);

  // Store actions
  const elements = useStore((state) => state.elements);
  const addComplexElement = useStore((state) => state.addComplexElement);
  const removeElement = useStore((state) => state.removeElement);
  const updateElementProps = useStore((state) => state.updateElementProps);

  // 현재 Layout의 기존 Slot 목록
  const existingSlots = useMemo((): ExistingSlotInfo[] => {
    return elements
      .filter((el) => el.layout_id === layoutId && el.tag === "Slot")
      .map((slot) => {
        // Slot의 자식 요소 확인
        const hasChildren = elements.some(
          (el) =>
            el.parent_id === slot.id ||
            (el.props as { slot_name?: string })?.slot_name ===
              (slot.props as { name?: string })?.name
        );
        return {
          slotName:
            ((slot.props as { name?: string })?.name as string) || "unnamed",
          elementId: slot.id,
          hasChildren,
        };
      });
  }, [elements, layoutId]);

  // 프리셋 적용 함수
  const applyPreset = useCallback(
    async (presetKey: string, mode: PresetApplyMode): Promise<void> => {
      if (mode === "cancel") return;

      const preset = LAYOUT_PRESETS[presetKey];
      if (!preset) {
        console.error(`[usePresetApply] Unknown preset: ${presetKey}`);
        return;
      }

      console.log(
        `[Preset] Applying "${preset.name}" to layout ${layoutId.slice(0, 8)}...`
      );

      setIsApplying(true);

      try {
        // ============================================
        // Step 1: 기존 Slot 처리
        // ============================================
        if (mode === "replace" && existingSlots.length > 0) {
          console.log(
            `[Preset] Removing ${existingSlots.length} existing slots...`
          );

          // 삭제 실행
          await Promise.all(
            existingSlots.map((slot) => removeElement(slot.elementId))
          );

          console.log(`[Preset] Removed ${existingSlots.length} existing slots`);
        }

        // ============================================
        // Step 2: 새 Slot 생성 준비
        // ============================================
        const existingSlotNames = new Set(
          existingSlots.map((s) => s.slotName)
        );
        const slotsToCreate: SlotDefinition[] =
          mode === "merge"
            ? preset.slots.filter((s) => !existingSlotNames.has(s.name))
            : preset.slots;

        if (slotsToCreate.length === 0) {
          console.log("[Preset] No new slots to create (all already exist)");
          setIsApplying(false);
          return;
        }

        console.log(`[Preset] Creating ${slotsToCreate.length} new slots...`);

        // ============================================
        // Step 3: Slot Element 배열 생성
        // ============================================
        let orderNum = 1;
        const slotElements: Element[] = slotsToCreate.map(
          (slotDef): Element => ({
            id: crypto.randomUUID(),
            tag: "Slot",
            props: {
              name: slotDef.name,
              required: slotDef.required,
              description: slotDef.description,
              style: slotDef.defaultStyle,
            },
            parent_id: bodyElementId,
            layout_id: layoutId,
            page_id: null,
            order_num: orderNum++,
          })
        );

        // ============================================
        // Step 4: Body에 containerStyle 적용 (있으면)
        // ============================================
        if (preset.containerStyle) {
          const body = elements.find((el) => el.id === bodyElementId);
          if (body) {
            const currentStyle =
              ((body.props as { style?: Record<string, unknown> })?.style as Record<
                string,
                unknown
              >) || {};
            const mergedStyle = { ...currentStyle, ...preset.containerStyle };
            await updateElementProps(bodyElementId, { style: mergedStyle });
            console.log("[Preset] Applied container style to body");
          }
        }

        // ============================================
        // Step 5: Slot 일괄 생성 (단일 History 엔트리)
        // ============================================
        if (slotElements.length > 0) {
          // 첫 번째 Slot을 "parent"로, 나머지를 "children"으로 처리
          // addComplexElement가 단일 History 엔트리 생성
          const [firstSlot, ...restSlots] = slotElements;
          await addComplexElement(firstSlot, restSlots);

          console.log(
            `[Preset] Created ${slotElements.length} slots with single history entry`
          );
        }

        console.log(`[Preset] "${preset.name}" applied successfully`);
      } catch (error) {
        console.error("[Preset] Failed to apply preset:", error);
        throw error;
      } finally {
        setIsApplying(false);
      }
    },
    [
      layoutId,
      bodyElementId,
      existingSlots,
      elements,
      addComplexElement,
      removeElement,
      updateElementProps,
    ]
  );

  return {
    existingSlots,
    applyPreset,
    isApplying,
  };
}

export default usePresetApply;
