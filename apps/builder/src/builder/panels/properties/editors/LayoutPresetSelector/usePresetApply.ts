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
import { selectCanonicalDocument } from "../../../../stores/elements";
import { useLayoutsStore } from "../../../../stores/layouts";
import { belongsToLegacyLayout } from "../../../../../adapters/canonical";
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
  /** 현재 적용된 프리셋 키 (감지된 경우) */
  currentPresetKey: string | null;
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
  // ADR-040: elementsMap O(1) 조회 (전체 elements 배열 구독 제거)
  const elementsMap = useStore((state) => state.elementsMap);
  const childrenMap = useStore((state) => state.childrenMap);
  const addComplexElement = useStore((state) => state.addComplexElement);
  const removeElement = useStore((state) => state.removeElement);
  const updateElementProps = useStore((state) => state.updateElementProps);

  // 현재 Layout의 기존 Slot 목록 (canonical reusable frame descendants + type === "Slot")
  // ADR-903 P3-E E-6 후속: layout slot 검색에 canonical document 필요
  // (write-through 후 element.layout_id null → frame descendants 매칭).
  // doc 을 useStore selector 로 구독하지 않고 useMemo 안에서 lazy 생성 —
  // selectCanonicalDocument 가 매 호출마다 새 객체를 반환하면 useSyncExternalStore
  // cache miss 로 무한 루프 (Maximum update depth) 발생.
  const existingSlots = useMemo((): ExistingSlotInfo[] => {
    const state = useStore.getState();
    const layouts = useLayoutsStore.getState().layouts;
    const canonicalDoc = selectCanonicalDocument(state, state.pages, layouts);

    const slots: ExistingSlotInfo[] = [];
    elementsMap.forEach((el) => {
      if (
        el.type === "Slot" &&
        belongsToLegacyLayout(el, layoutId, canonicalDoc)
      ) {
        const slotChildren = childrenMap.get(el.id) ?? [];
        const slotName =
          ((el.props as { name?: string })?.name as string) || "unnamed";
        const hasChildren =
          slotChildren.length > 0 ||
          // slot_name 매칭도 확인
          (() => {
            let found = false;
            elementsMap.forEach((other) => {
              if (
                (other.props as { slot_name?: string })?.slot_name === slotName
              ) {
                found = true;
              }
            });
            return found;
          })();
        slots.push({ slotName, elementId: el.id, hasChildren });
      }
    });
    return slots;
  }, [elementsMap, childrenMap, layoutId]);

  // ⭐ 현재 적용된 프리셋 감지 (body element의 appliedPreset prop에서 읽기)
  const currentPresetKey = useMemo((): string | null => {
    // ADR-040: elementsMap O(1) 조회
    const body = elementsMap.get(bodyElementId);
    if (!body) {
      if (import.meta.env.DEV) {
        console.log(
          "[ADR-911 diag][usePresetApply] body 없음 — bodyElementId:",
          bodyElementId,
        );
      }
      return null;
    }

    const appliedPreset = (body.props as { appliedPreset?: string })
      ?.appliedPreset;

    // appliedPreset이 있고, 해당 프리셋이 존재하며, 현재 slots과 일치하는지 검증
    if (appliedPreset && LAYOUT_PRESETS[appliedPreset]) {
      const preset = LAYOUT_PRESETS[appliedPreset];
      const presetSlotNames = new Set(preset.slots.map((s) => s.name));
      const existingSlotNames = new Set(existingSlots.map((s) => s.slotName));

      // slot 구성이 여전히 일치하면 유효
      if (
        existingSlotNames.size === presetSlotNames.size &&
        [...existingSlotNames].every((name) => presetSlotNames.has(name))
      ) {
        if (import.meta.env.DEV) {
          console.log("[ADR-911 diag][usePresetApply] currentPresetKey =", {
            bodyElementId,
            layoutId,
            appliedPreset,
            existingSlotNames: [...existingSlotNames],
            presetSlotNames: [...presetSlotNames],
            match: true,
          });
        }
        return appliedPreset;
      }

      if (import.meta.env.DEV) {
        console.log("[ADR-911 diag][usePresetApply] slot mismatch:", {
          bodyElementId,
          layoutId,
          appliedPreset,
          existingSlotNames: [...existingSlotNames],
          presetSlotNames: [...presetSlotNames],
        });
      }
    } else if (import.meta.env.DEV) {
      console.log(
        "[ADR-911 diag][usePresetApply] appliedPreset 없음/unknown — bodyElementId:",
        bodyElementId,
        "appliedPreset:",
        appliedPreset,
      );
    }

    return null;
  }, [elementsMap, bodyElementId, existingSlots, layoutId]);

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
        `[Preset] Applying "${preset.name}" to layout ${layoutId.slice(0, 8)}...`,
      );

      setIsApplying(true);

      try {
        // ============================================
        // Step 1: 기존 Slot 처리
        // ============================================
        if (mode === "replace" && existingSlots.length > 0) {
          console.log(
            `[Preset] Removing ${existingSlots.length} existing slots...`,
          );

          // 삭제 실행
          await Promise.all(
            existingSlots.map((slot) => removeElement(slot.elementId)),
          );

          console.log(
            `[Preset] Removed ${existingSlots.length} existing slots`,
          );
        }

        // ============================================
        // Step 2: 새 Slot 생성 준비
        // ============================================
        const existingSlotNames = new Set(existingSlots.map((s) => s.slotName));
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
            type: "Slot",
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
          }),
        );

        // ============================================
        // Step 4: Body에 containerStyle 및 appliedPreset 저장
        // ============================================
        // ADR-040: elementsMap O(1) 조회 (handler 내부 → getState 최신값)
        const body = useStore.getState().elementsMap.get(bodyElementId);
        if (body) {
          const currentStyle =
            ((body.props as { style?: Record<string, unknown> })
              ?.style as Record<string, unknown>) || {};

          // containerStyle이 있으면 병합, 없으면 기존 스타일 유지
          const mergedStyle = preset.containerStyle
            ? { ...currentStyle, ...preset.containerStyle }
            : currentStyle;

          // ⭐ appliedPreset 키 저장 (동일 프리셋 감지용)
          await updateElementProps(bodyElementId, {
            style: mergedStyle,
            appliedPreset: presetKey,
          });
          console.log(`[Preset] Saved appliedPreset="${presetKey}" to body`);
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
            `[Preset] Created ${slotElements.length} slots with single history entry`,
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
      addComplexElement,
      removeElement,
      updateElementProps,
    ],
  );

  return {
    existingSlots,
    currentPresetKey,
    applyPreset,
    isApplying,
  };
}

export default usePresetApply;
